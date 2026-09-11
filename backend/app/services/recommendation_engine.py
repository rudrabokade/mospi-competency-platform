from __future__ import annotations

"""Dependency-free course recommendation engine based on keyword overlap."""

import logging
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import CompetencyScore, Course, Recommendation, User

logger = logging.getLogger(__name__)

async def ensure_course_embeddings(db: AsyncSession) -> None:
    """Retained as a compatibility no-op for callers of the old engine."""
    return None


def _keywords(text: str) -> set[str]:
    return {word for word in text.lower().replace("-", " ").split() if len(word) > 2}


async def generate_recommendations(
    user: User,
    scores: list[CompetencyScore],
    db: AsyncSession,
    top_n: int = 8,
) -> int:
    """
    Generate top-N course recommendations for the user based on their skill gaps.
    Deletes previous recommendations for the user and inserts fresh ones.
    """
    # Build gap text query from top skills with the highest gap
    from app.services.competency_engine import ROLE_BASELINES, _normalize_designation

    baseline = ROLE_BASELINES.get(_normalize_designation(user.designation), ROLE_BASELINES["default"])

    gap_skills = []
    for score in scores:
        if score.skill:
            target = baseline.get(score.skill.name.lower().replace(" ", "_"), 50.0)
            gap = max(0.0, target - score.score)
            if gap > 5:
                gap_skills.append((gap, score.skill.name, score.skill.description or ""))

    if not gap_skills:
        return 0

    gap_skills.sort(reverse=True)
    # Build a combined query text from top-5 gap skills
    query_words = _keywords(" ".join(f"{name} {desc}" for _, name, desc in gap_skills[:5]))

    courses_result = await db.execute(select(Course))
    courses = courses_result.scalars().all()
    if not courses:
        return 0

    scored = []
    for course in courses:
        course_words = _keywords(f"{course.title} {course.description or ''}")
        overlap = len(query_words & course_words)
        sim = overlap / max(len(query_words), 1)
        scored.append((sim, course))

    scored.sort(key=lambda x: x[0], reverse=True)

    # Delete existing recommendations
    await db.execute(delete(Recommendation).where(Recommendation.user_id == user.id))

    # Get IDs of completed courses to exclude them
    # (omitted for MVP simplicity; can be added from quiz_attempts)

    now = datetime.now(timezone.utc)
    inserted = 0
    for sim, course in scored[:top_n]:
        db.add(
            Recommendation(
                user_id=user.id,
                course_id=course.id,
                score=round(sim * 100, 2),
                generated_at=now,
                status="suggested",
            )
        )
        inserted += 1

    await db.flush()
    return inserted
