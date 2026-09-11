from __future__ import annotations

"""
Recommendation Engine using sentence-transformers + pgvector cosine similarity.
"""

import logging
from datetime import datetime, timezone

import numpy as np
from sentence_transformers import SentenceTransformer
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models import CompetencyScore, Course, Recommendation, User

settings = get_settings()
logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None


def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("Loading sentence-transformer model: %s", settings.embedding_model)
        _model = SentenceTransformer(settings.embedding_model)
    return _model


def embed_text(text: str) -> list[float]:
    model = get_embedding_model()
    vec = model.encode(text, normalize_embeddings=True)
    return vec.tolist()


async def ensure_course_embeddings(db: AsyncSession) -> None:
    """Compute and store embeddings for courses that don't have them yet."""
    result = await db.execute(select(Course).where(Course.embedding.is_(None)))
    courses = result.scalars().all()
    if not courses:
        return

    logger.info("Embedding %d courses...", len(courses))
    model = get_embedding_model()
    texts = [f"{c.title}. {c.description or ''}" for c in courses]
    embeddings = model.encode(texts, normalize_embeddings=True, batch_size=32)

    for course, emb in zip(courses, embeddings):
        course.embedding = emb.tolist()

    await db.flush()
    logger.info("Course embeddings stored.")


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
    query_text = ". ".join(
        f"Need to improve {name}: {desc}" for _, name, desc in gap_skills[:5]
    )

    # Ensure course embeddings exist
    await ensure_course_embeddings(db)

    # Fetch all courses
    courses_result = await db.execute(select(Course).where(Course.embedding.isnot(None)))
    courses = courses_result.scalars().all()
    if not courses:
        return 0

    # Embed the query
    model = get_embedding_model()
    query_vec = model.encode(query_text, normalize_embeddings=True)

    # Cosine similarity (embeddings are already normalized)
    scored = []
    for course in courses:
        if not course.embedding:
            continue
        course_vec = np.array(course.embedding)
        sim = float(np.dot(query_vec, course_vec))
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
