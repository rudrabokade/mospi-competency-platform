from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models import CompetencyScore, Material, Quiz, Skill, User

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard-summary")
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    total_users = (await db.execute(select(func.count(User.id)).where(User.role == "learner"))).scalar()
    total_materials = (await db.execute(select(func.count(Material.id)))).scalar()
    total_quizzes = (await db.execute(select(func.count(Quiz.id)))).scalar()

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

    # Structure: {department: {domain: avg_score}}
    heatmap: dict[str, dict[str, float]] = {}
    for department, domain, avg_score in rows:
        dept = department or "Unknown"
        if dept not in heatmap:
            heatmap[dept] = {}
        heatmap[dept][domain] = round(avg_score, 1)

    return {"heatmap": heatmap}


@router.get("/officers")
async def list_officers(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """List all learner officers with their overall avg competency score."""
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
