from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import CompetencyScore, RewardPolicy, RewardTransaction, Skill, User
from app.services.competency_engine import compute_gaps, seed_competency_scores

router = APIRouter(prefix="/api/users", tags=["users"])


async def get_active_reward_policy(db: AsyncSession) -> RewardPolicy:
    policy = (await db.execute(select(RewardPolicy).order_by(RewardPolicy.updated_at.desc()))).scalars().first()
    if policy:
        return policy
    policy = RewardPolicy()
    db.add(policy)
    await db.flush()
    return policy


@router.get("/{user_id}/profile")
async def get_profile(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Users can only see their own profile unless admin
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch competency scores with skill details
    scores_result = await db.execute(
        select(CompetencyScore)
        .where(CompetencyScore.user_id == user_id)
        .options(selectinload(CompetencyScore.skill))
    )
    scores = scores_result.scalars().all()

    score_data = [
        {
            "skill_id": str(s.skill_id),
            "skill_name": s.skill.name,
            "domain": s.skill.domain,
            "score": s.score,
            "source": s.source,
        }
        for s in scores
    ]

    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "designation": user.designation,
        "department": user.department,
        "experience_years": user.experience_years,
        "qualifications": user.qualifications or [],
        "competency_scores": score_data,
    }


@router.get("/{user_id}/competency-gaps")
async def get_competency_gaps(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Ensure seed scores exist
    scores_result = await db.execute(
        select(CompetencyScore)
        .where(CompetencyScore.user_id == user_id)
        .options(selectinload(CompetencyScore.skill))
    )
    scores = scores_result.scalars().all()
    if not scores:
        await seed_competency_scores(user, db)
        scores_result = await db.execute(
            select(CompetencyScore)
            .where(CompetencyScore.user_id == user_id)
            .options(selectinload(CompetencyScore.skill))
        )
        scores = scores_result.scalars().all()

    gaps = await compute_gaps(user, scores, db)
    return {"user_id": str(user_id), "gaps": gaps}


class CompetencyScoreUpdate(BaseModel):
    skill_id: uuid.UUID
    score: float
    source: str = "system"


@router.post("/{user_id}/competency-scores")
async def update_competency_scores(
    user_id: uuid.UUID,
    updates: list[CompetencyScoreUpdate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Internal/system endpoint to update competency scores."""
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    for upd in updates:
        result = await db.execute(
            select(CompetencyScore).where(
                CompetencyScore.user_id == user_id,
                CompetencyScore.skill_id == upd.skill_id,
            )
        )
        score_row = result.scalar_one_or_none()
        if score_row:
            score_row.score = min(100.0, max(0.0, upd.score))
            score_row.source = upd.source
        else:
            db.add(
                CompetencyScore(
                    user_id=user_id,
                    skill_id=upd.skill_id,
                    score=min(100.0, max(0.0, upd.score)),
                    source=upd.source,
                )
            )

    return {"updated": len(updates)}


@router.get("/{user_id}/rewards")
async def get_rewards(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    policy = await get_active_reward_policy(db)
    balance = (await db.execute(
        select(func.coalesce(func.sum(RewardTransaction.points), 0))
        .where(RewardTransaction.user_id == user_id)
    )).scalar_one()
    transactions = (await db.execute(
        select(RewardTransaction)
        .where(RewardTransaction.user_id == user_id)
        .order_by(RewardTransaction.created_at.desc())
        .limit(50)
    )).scalars().all()
    return {
        "points": int(balance),
        "policy": {
            "threshold": policy.redemption_threshold,
            "conversion_type": policy.conversion_type,
            "enabled": policy.enabled,
        },
        "transactions": [
            {
                "id": str(transaction.id),
                "action": transaction.action,
                "points": transaction.points,
                "note": transaction.note,
                "created_at": transaction.created_at.isoformat(),
            }
            for transaction in transactions
        ],
    }


@router.post("/{user_id}/rewards/earn")
async def earn_reward_points(
    user_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    policy = await get_active_reward_policy(db)
    if not policy.enabled:
        raise HTTPException(status_code=409, detail="Rewards are currently disabled")
    point_values = {
        "quiz": policy.points_per_quiz,
        "course": policy.points_per_course,
        "assessment": policy.points_per_assessment,
        "evidence": policy.points_per_evidence,
    }
    action = body.get("action")
    if action not in point_values:
        raise HTTPException(status_code=400, detail="Unsupported reward action")
    transaction = RewardTransaction(
        user_id=user_id,
        action=action,
        points=point_values[action],
        note=str(body.get("note", ""))[:500] or None,
    )
    db.add(transaction)
    await db.flush()
    return {"id": str(transaction.id), "action": action, "points": transaction.points}
