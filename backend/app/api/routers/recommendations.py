from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import CompetencyScore, Recommendation, User
from app.services.recommendation_engine import generate_recommendations

router = APIRouter(prefix="/api", tags=["recommendations"])


@router.get("/users/{user_id}/recommendations")
async def get_recommendations(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.execute(
        select(Recommendation)
        .where(Recommendation.user_id == user_id)
        .options(selectinload(Recommendation.course))
        .order_by(Recommendation.score.desc())
        .limit(10)
    )
    recs = result.scalars().all()

    return [
        {
            "id": str(r.id),
            "course_id": str(r.course_id),
            "title": r.course.title,
            "description": r.course.description,
            "source_url": r.course.source_url,
            "provider": r.course.provider,
            "duration_hours": r.course.duration_hours,
            "score": r.score,
            "status": r.status,
            "generated_at": r.generated_at.isoformat(),
        }
        for r in recs
    ]


@router.post("/recommendations/refresh")
async def refresh_recommendations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger recompute of recommendations for the current user."""
    scores_result = await db.execute(
        select(CompetencyScore)
        .where(CompetencyScore.user_id == current_user.id)
        .options(selectinload(CompetencyScore.skill))
    )
    scores = scores_result.scalars().all()

    count = await generate_recommendations(current_user, scores, db)
    return {"message": f"Generated {count} recommendations"}


@router.patch("/recommendations/{rec_id}/status")
async def update_recommendation_status(
    rec_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow learner to mark a recommendation as enrolled/completed."""
    result = await db.execute(
        select(Recommendation).where(Recommendation.id == rec_id, Recommendation.user_id == current_user.id)
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    new_status = body.get("status")
    if new_status not in ("suggested", "enrolled", "completed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    rec.status = new_status
    return {"id": str(rec.id), "status": rec.status}
