from __future__ import annotations

import csv
import io
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.security import get_current_admin, hash_password
from app.models import (
    CompetencyScore,
    Course,
    Material,
    Quiz,
    QuizAttempt,
    QuizQuestion,
    Recommendation,
    RewardPolicy,
    RewardTransaction,
    Skill,
    User,
)
from app.services.competency_engine import DOMAIN_TARGETS, seed_competency_scores
from app.services.recommendation_engine import generate_recommendations

router = APIRouter(prefix="/api/admin", tags=["admin"])


def policy_payload(policy: RewardPolicy) -> dict:
    return {
        "id": str(policy.id),
        "organization_name": policy.organization_name,
        "points_per_quiz": policy.points_per_quiz,
        "points_per_course": policy.points_per_course,
        "points_per_assessment": policy.points_per_assessment,
        "points_per_evidence": policy.points_per_evidence,
        "redemption_threshold": policy.redemption_threshold,
        "conversion_type": policy.conversion_type,
        "enabled": policy.enabled,
        "updated_at": policy.updated_at.isoformat() if policy.updated_at else None,
    }


@router.get("/dashboard-summary")
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    total_users = (await db.execute(select(func.count(User.id)).where(User.role == "learner"))).scalar() or 0
    total_materials = (await db.execute(select(func.count(Material.id)))).scalar() or 0
    total_quizzes = (await db.execute(select(func.count(Quiz.id)))).scalar() or 0

    # Average score per domain
    domain_scores_result = await db.execute(
        select(Skill.domain, func.avg(CompetencyScore.score))
        .join(CompetencyScore, Skill.id == CompetencyScore.skill_id)
        .group_by(Skill.domain)
    )
    domain_scores = [{"domain": row[0], "avg_score": round(row[1], 1)} for row in domain_scores_result]

    return {
        "total_learners": total_users,
        "total_materials": total_materials,
        "total_quizzes": total_quizzes,
        "avg_scores_by_domain": domain_scores,
    }


@router.get("/org-gap-heatmap")
async def org_gap_heatmap(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Return average competency scores per department × skill domain for the heatmap."""
    result = await db.execute(
        select(
            User.department,
            Skill.domain,
            func.avg(CompetencyScore.score).label("avg_score"),
        )
        .join(CompetencyScore, User.id == CompetencyScore.user_id)
        .join(Skill, Skill.id == CompetencyScore.skill_id)
        .where(User.role == "learner")
        .group_by(User.department, Skill.domain)
    )
    rows = result.fetchall()

    heatmap: dict[str, dict[str, float]] = {}
    for department, domain, avg_score in rows:
        dept = department or "Unknown"
        if dept not in heatmap:
            heatmap[dept] = {}
        heatmap[dept][domain] = round(avg_score, 1)

    return {"heatmap": heatmap}


@router.get("/skills-breakdown")
async def skills_breakdown(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Return detailed competency breakdown across all skills to identify Ministry-wide skill deficits."""
    skills = (await db.execute(select(Skill).order_by(Skill.domain, Skill.name))).scalars().all()
    total_officers = (await db.execute(select(func.count(User.id)).where(User.role == "learner"))).scalar() or 1

    res = await db.execute(
        select(
            CompetencyScore.skill_id,
            func.avg(CompetencyScore.score).label("avg_score"),
            func.count(CompetencyScore.user_id).filter(CompetencyScore.score < 60.0).label("deficit_count"),
        )
        .group_by(CompetencyScore.skill_id)
    )
    skill_stats = {row[0]: (row[1], row[2]) for row in res.fetchall()}

    breakdown = []
    for skill in skills:
        avg, def_count = skill_stats.get(skill.id, (0.0, 0))
        avg_score = round(avg, 1) if avg else 0.0
        target = DOMAIN_TARGETS.get(skill.domain, 70.0)
        gap = round(max(0.0, target - avg_score), 1)
        breakdown.append({
            "id": str(skill.id),
            "name": skill.name,
            "domain": skill.domain,
            "description": skill.description,
            "avg_score": avg_score,
            "target_score": target,
            "gap": gap,
            "deficit_count": def_count,
            "deficit_percentage": round((def_count / total_officers) * 100, 1),
            "priority": "high" if gap >= 20 else ("medium" if gap >= 10 else "low"),
        })
    breakdown.sort(key=lambda s: s["gap"], reverse=True)
    return breakdown


@router.get("/recent-activity")
async def recent_activity(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Aggregate recent ministry events for the live activity feed."""
    activities = []

    # Recent quiz attempts
    attempts_res = await db.execute(
        select(QuizAttempt)
        .options(selectinload(QuizAttempt.user), selectinload(QuizAttempt.quiz))
        .order_by(QuizAttempt.attempted_at.desc())
        .limit(10)
    )
    for a in attempts_res.scalars().all():
        activities.append({
            "id": f"attempt-{a.id}",
            "type": "quiz_attempt",
            "title": f"{a.user.name if a.user else 'Officer'} completed '{a.quiz.title if a.quiz else 'Quiz'}'",
            "detail": f"Score: {round(a.score, 1)}% ({'Passed' if a.score >= 70 else 'Needs Review'})",
            "score": a.score,
            "timestamp": a.attempted_at.isoformat() if a.attempted_at else None,
            "officer_name": a.user.name if a.user else "Unknown Officer",
            "department": a.user.department if a.user else None,
        })

    # Recent materials uploaded
    materials_res = await db.execute(
        select(Material)
        .options(selectinload(Material.uploaded_by_user))
        .order_by(Material.created_at.desc())
        .limit(6)
    )
    for m in materials_res.scalars().all():
        activities.append({
            "id": f"material-{m.id}",
            "type": "material_upload",
            "title": f"Training material uploaded: {m.original_filename or 'Document'}",
            "detail": f"Format: {m.file_type.upper()} · Status: {'Processed' if m.processed else 'Ready'}",
            "timestamp": m.created_at.isoformat() if m.created_at else None,
            "officer_name": m.uploaded_by_user.name if m.uploaded_by_user else "Admin",
            "department": m.uploaded_by_user.department if m.uploaded_by_user else "DIID",
        })

    # Recent reward transactions
    tx_res = await db.execute(
        select(RewardTransaction)
        .options(selectinload(RewardTransaction.user))
        .order_by(RewardTransaction.created_at.desc())
        .limit(8)
    )
    for t in tx_res.scalars().all():
        activities.append({
            "id": f"reward-{t.id}",
            "type": "reward_awarded",
            "title": f"Points awarded to {t.user.name if t.user else 'Officer'}",
            "detail": f"+{t.points} pts for {t.action.capitalize()} {f'({t.note})' if t.note else ''}",
            "timestamp": t.created_at.isoformat() if t.created_at else None,
            "officer_name": t.user.name if t.user else "Unknown Officer",
            "department": t.user.department if t.user else None,
        })

    activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    return activities[:20]


@router.get("/officers")
async def list_officers(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """List all learner officers with overall avg competency score."""
    result = await db.execute(
        select(
            User.id,
            User.name,
            User.email,
            User.designation,
            User.department,
            User.experience_years,
            func.avg(CompetencyScore.score).label("avg_score"),
        )
        .outerjoin(CompetencyScore, User.id == CompetencyScore.user_id)
        .where(User.role == "learner")
        .group_by(User.id)
        .order_by(User.name)
    )
    officers = result.fetchall()
    return [
        {
            "id": str(o.id),
            "name": o.name,
            "email": o.email,
            "designation": o.designation,
            "department": o.department,
            "experience_years": o.experience_years,
            "avg_score": round(o.avg_score, 1) if o.avg_score else 0,
        }
        for o in officers
    ]


class CreateOfficerRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = "Password@123"
    designation: str = "Statistical Officer"
    department: str = "Price Statistics Division"
    experience_years: int = 1
    qualifications: list[str] = []


@router.post("/officers")
async def create_officer(
    req: CreateOfficerRequest,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Onboard a new officer and seed initial competency baselines."""
    existing = (await db.execute(select(User).where(User.email == req.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="An officer with this email already exists")

    officer = User(
        name=req.name.strip(),
        email=req.email.strip().lower(),
        hashed_password=hash_password(req.password),
        role="learner",
        designation=req.designation.strip(),
        department=req.department.strip(),
        experience_years=max(0, req.experience_years),
        qualifications=req.qualifications,
    )
    db.add(officer)
    await db.flush()
    await seed_competency_scores(officer, db)
    return {
        "id": str(officer.id),
        "name": officer.name,
        "email": officer.email,
        "designation": officer.designation,
        "department": officer.department,
        "experience_years": officer.experience_years,
    }


@router.get("/officers/{user_id}/detail")
async def get_officer_detail(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Retrieve detailed profile, competency scores, recommendations, attempts, and rewards for an officer."""
    officer = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")

    scores_res = await db.execute(
        select(CompetencyScore)
        .where(CompetencyScore.user_id == user_id)
        .options(selectinload(CompetencyScore.skill))
    )
    scores = scores_res.scalars().all()
    domain_averages: dict[str, list[float]] = {}
    skill_list = []
    for s in scores:
        if s.skill:
            domain_averages.setdefault(s.skill.domain, []).append(s.score)
            skill_list.append({
                "skill_id": str(s.skill_id),
                "name": s.skill.name,
                "domain": s.skill.domain,
                "score": s.score,
                "source": s.source,
            })

    domain_summary = {
        d: round(sum(scs) / len(scs), 1) if scs else 0.0
        for d, scs in domain_averages.items()
    }

    recs_res = await db.execute(
        select(Recommendation)
        .where(Recommendation.user_id == user_id)
        .options(selectinload(Recommendation.course))
        .order_by(Recommendation.score.desc())
    )
    recs = recs_res.scalars().all()

    attempts_res = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == user_id)
        .options(selectinload(QuizAttempt.quiz))
        .order_by(QuizAttempt.attempted_at.desc())
    )
    attempts = attempts_res.scalars().all()

    points_res = await db.execute(
        select(func.coalesce(func.sum(RewardTransaction.points), 0))
        .where(RewardTransaction.user_id == user_id)
    )
    total_points = points_res.scalar_one() or 0

    tx_res = await db.execute(
        select(RewardTransaction)
        .where(RewardTransaction.user_id == user_id)
        .order_by(RewardTransaction.created_at.desc())
        .limit(20)
    )
    transactions = tx_res.scalars().all()

    return {
        "id": str(officer.id),
        "name": officer.name,
        "email": officer.email,
        "designation": officer.designation,
        "department": officer.department,
        "experience_years": officer.experience_years,
        "qualifications": officer.qualifications or [],
        "created_at": officer.created_at.isoformat() if officer.created_at else None,
        "domain_averages": domain_summary,
        "competencies": skill_list,
        "recommendations": [
            {
                "id": str(r.id),
                "title": r.course.title if r.course else "Unknown Course",
                "status": r.status,
                "duration_hours": r.course.duration_hours if r.course else None,
                "provider": r.course.provider if r.course else "iGOT",
                "source_url": r.course.source_url if r.course else None,
            }
            for r in recs
        ],
        "attempts": [
            {
                "id": str(a.id),
                "quiz_title": a.quiz.title if a.quiz else "Quiz",
                "score": a.score,
                "attempted_at": a.attempted_at.isoformat() if a.attempted_at else None,
            }
            for a in attempts
        ],
        "reward_points": int(total_points),
        "reward_transactions": [
            {
                "id": str(t.id),
                "action": t.action,
                "points": t.points,
                "note": t.note,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in transactions
        ],
    }


class AwardOfficerRewardRequest(BaseModel):
    points: int = 50
    note: str = "Administrative Commendation"
    action: str = "commendation"


@router.post("/officers/{user_id}/reward")
async def award_officer_reward(
    user_id: uuid.UUID,
    req: AwardOfficerRewardRequest,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Manually grant bonus reward points / commendation to an officer."""
    officer = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    tx = RewardTransaction(
        user_id=user_id,
        action=req.action,
        points=max(1, req.points),
        note=req.note.strip()[:500] if req.note else "Official Commendation",
    )
    db.add(tx)
    await db.flush()
    return {"message": "Reward points awarded", "id": str(tx.id), "points": tx.points}


@router.get("/quizzes")
async def list_admin_quizzes(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """List all quizzes with attempts statistics and pass rates."""
    quizzes_res = await db.execute(
        select(Quiz)
        .options(selectinload(Quiz.material), selectinload(Quiz.questions), selectinload(Quiz.attempts))
        .order_by(Quiz.created_at.desc())
    )
    quizzes = quizzes_res.scalars().all()
    result = []
    for q in quizzes:
        attempts = q.attempts or []
        passed = sum(1 for a in attempts if a.score >= 70)
        avg_score = round(sum(a.score for a in attempts) / len(attempts), 1) if attempts else 0.0
        pass_rate = round((passed / len(attempts)) * 100, 1) if attempts else 0.0
        result.append({
            "id": str(q.id),
            "title": q.title,
            "material_id": str(q.material_id) if q.material_id else None,
            "material_filename": q.material.original_filename if q.material else None,
            "file_type": q.material.file_type if q.material else None,
            "question_count": len(q.questions or []),
            "attempts_count": len(attempts),
            "pass_rate": pass_rate,
            "avg_score": avg_score,
            "created_at": q.created_at.isoformat() if q.created_at else None,
        })
    return result


@router.get("/quizzes/{quiz_id}")
async def get_admin_quiz_detail(
    quiz_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Retrieve full quiz detail with questions, options, and explanations."""
    res = await db.execute(
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(selectinload(Quiz.questions), selectinload(Quiz.material))
    )
    quiz = res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return {
        "id": str(quiz.id),
        "title": quiz.title,
        "material_filename": quiz.material.original_filename if quiz.material else None,
        "created_at": quiz.created_at.isoformat() if quiz.created_at else None,
        "questions": [
            {
                "id": str(q.id),
                "question_text": q.question_text,
                "options": q.options,
                "correct_option_id": q.correct_option_id,
                "explanation": q.explanation,
                "difficulty": q.difficulty,
            }
            for q in quiz.questions
        ],
    }


@router.delete("/quizzes/{quiz_id}")
async def delete_quiz(
    quiz_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Delete a quiz."""
    res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    await db.delete(quiz)
    await db.flush()
    return {"message": "Quiz deleted successfully"}


@router.delete("/materials/{material_id}")
async def delete_material(
    material_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Delete an uploaded training material and its associated file."""
    res = await db.execute(select(Material).where(Material.id == material_id))
    material = res.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    try:
        p = Path(material.file_url)
        if p.exists():
            p.unlink(missing_ok=True)
    except Exception:
        pass
    await db.delete(material)
    await db.flush()
    return {"message": "Material deleted successfully"}


@router.post("/igot/sync")
async def sync_igot_catalog(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Synchronize official course catalog from iGOT Karmayogi adapter into the local courses database."""
    from app.api.routers.igot import MOCK_COURSES
    count = 0
    for item in MOCK_COURSES:
        existing = (
            await db.execute(select(Course).where(Course.external_id == item["external_id"]))
        ).scalar_one_or_none()
        if existing:
            existing.title = item["title"]
            existing.description = item["description"]
            existing.skill_tags = item["skill_tags"]
            existing.provider = item["provider"]
            existing.source_url = item["source_url"]
            existing.duration_hours = item["duration_hours"]
        else:
            course = Course(
                external_id=item["external_id"],
                title=item["title"],
                description=item["description"],
                skill_tags=item["skill_tags"],
                provider=item["provider"],
                source_url=item["source_url"],
                duration_hours=item["duration_hours"],
            )
            db.add(course)
            count += 1
    await db.flush()
    total_courses = (await db.execute(select(func.count(Course.id)))).scalar()
    return {
        "synced_count": len(MOCK_COURSES),
        "new_inserted": count,
        "total_courses": total_courses,
        "source": "iGOT Karmayogi API",
        "message": "iGOT catalog successfully synchronized.",
    }


@router.get("/igot/courses")
async def list_igot_courses(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """List all synchronized courses from iGOT."""
    courses = (await db.execute(select(Course).order_by(Course.title))).scalars().all()
    return [
        {
            "id": str(c.id),
            "external_id": c.external_id,
            "title": c.title,
            "description": c.description,
            "skill_tags": c.skill_tags or [],
            "provider": c.provider,
            "source_url": c.source_url,
            "duration_hours": c.duration_hours,
        }
        for c in courses
    ]


@router.post("/recommendations/recompute-all")
async def recompute_all_recommendations(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Recompute AI course recommendations for all officers based on latest competency scores."""
    officers = (await db.execute(select(User).where(User.role == "learner"))).scalars().all()
    total_recs = 0
    for officer in officers:
        scores_res = await db.execute(
            select(CompetencyScore)
            .where(CompetencyScore.user_id == officer.id)
            .options(selectinload(CompetencyScore.skill))
        )
        scores = scores_res.scalars().all()
        if scores:
            count = await generate_recommendations(officer, scores, db)
            total_recs += count
    return {
        "officers_processed": len(officers),
        "recommendations_generated": total_recs,
        "message": f"Generated {total_recs} personalized recommendations across {len(officers)} officers.",
    }


@router.get("/rewards/transactions")
async def list_reward_transactions(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Retrieve full organization-wide reward transactions ledger."""
    res = await db.execute(
        select(RewardTransaction)
        .options(selectinload(RewardTransaction.user))
        .order_by(RewardTransaction.created_at.desc())
        .limit(100)
    )
    txs = res.scalars().all()
    return [
        {
            "id": str(t.id),
            "officer_name": t.user.name if t.user else "Officer",
            "department": t.user.department if t.user else None,
            "action": t.action,
            "points": t.points,
            "note": t.note,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in txs
    ]


@router.get("/materials")
async def list_materials(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    result = await db.execute(
        select(Material).order_by(Material.created_at.desc())
    )
    materials = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "filename": m.original_filename,
            "file_type": m.file_type,
            "processed": m.processed,
            "error": m.processing_error,
            "created_at": m.created_at.isoformat(),
        }
        for m in materials
    ]


@router.get("/reward-policy")
async def get_reward_policy(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    policy = (await db.execute(select(RewardPolicy).order_by(RewardPolicy.updated_at.desc()))).scalars().first()
    if not policy:
        policy = RewardPolicy()
        db.add(policy)
        await db.flush()
    return policy_payload(policy)


@router.put("/reward-policy")
async def update_reward_policy(
    body: dict,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    policy = (await db.execute(select(RewardPolicy).order_by(RewardPolicy.updated_at.desc()))).scalars().first()
    if not policy:
        policy = RewardPolicy()
        db.add(policy)
    integer_fields = ("points_per_quiz", "points_per_course", "points_per_assessment", "points_per_evidence", "redemption_threshold")
    for field in integer_fields:
        if field in body:
            value = int(body[field])
            if value < 0:
                raise HTTPException(status_code=400, detail=f"{field} cannot be negative")
            setattr(policy, field, value)
    if body.get("conversion_type") in {"holiday", "certificate", "recognition", "promotion"}:
        policy.conversion_type = body["conversion_type"]
    if "organization_name" in body:
        policy.organization_name = str(body["organization_name"]).strip() or "MoSPI"
    if "enabled" in body:
        policy.enabled = bool(body["enabled"])
    await db.flush()
    return policy_payload(policy)


@router.get("/learning-analytics")
async def learning_analytics(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    attempts = (await db.execute(select(QuizAttempt))).scalars().all()
    completed = sum(1 for attempt in attempts if attempt.score >= 70)
    return {
        "quiz_attempts": len(attempts),
        "passed_attempts": completed,
        "pass_rate": round((completed / len(attempts)) * 100, 1) if attempts else 0,
        "average_quiz_score": round(sum(a.score for a in attempts) / len(attempts), 1) if attempts else 0,
        "active_recommendations": (await db.execute(select(func.count(Recommendation.id)))).scalar() or 0,
    }


@router.get("/officers/export")
async def export_officers(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    result = await db.execute(
        select(
            User.name,
            User.email,
            User.designation,
            User.department,
            User.experience_years,
            func.avg(CompetencyScore.score).label("avg_score"),
        )
        .outerjoin(CompetencyScore, User.id == CompetencyScore.user_id)
        .where(User.role == "learner")
        .group_by(User.id)
        .order_by(User.name)
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Designation", "Department", "Experience years", "Average score"])
    for officer in result.fetchall():
        writer.writerow([
            officer.name,
            officer.email,
            officer.designation or "",
            officer.department or "",
            officer.experience_years,
            round(officer.avg_score, 1) if officer.avg_score else 0,
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mospi-officers.csv"},
    )
