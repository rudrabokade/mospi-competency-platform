from __future__ import annotations

"""
Recommendation Engine using TF-IDF + cosine similarity (no PyTorch/GPU required).
"""

import logging
from datetime import datetime, timezone

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CompetencyScore, Course, Recommendation, User

logger = logging.getLogger(__name__)

# Module-level vectorizer fitted lazily on course corpus
_vectorizer: TfidfVectorizer | None = None
_course_matrix = None  # scipy sparse matrix
_course_ids: list[int] = []


def _fit_vectorizer(texts: list[str], ids: list[int]) -> None:
    global _vectorizer, _course_matrix, _course_ids
    _vectorizer = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)
    _course_matrix = _vectorizer.fit_transform(texts)
    _course_ids = ids
    logger.info("TF-IDF vectorizer fitted on %d courses.", len(ids))


def embed_text(text: str) -> list[float]:
    """Return a dense TF-IDF vector for a single text string."""
    if _vectorizer is None:
        raise RuntimeError("Vectorizer not fitted yet — call ensure_course_embeddings first.")
    vec = _vectorizer.transform([text])
    return vec.toarray()[0].tolist()


async def ensure_course_embeddings(db: AsyncSession) -> None:
    """Fit the TF-IDF vectorizer on all courses (idempotent)."""
    global _vectorizer
    result = await db.execute(select(Course))
    courses = result.scalars().all()
    if not courses:
        return
    texts = [f"{c.title}. {c.description or ''}" for c in courses]
    ids = [c.id for c in courses]
    _fit_vectorizer(texts, ids)


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
    from app.services.competency_engine import ROLE_BASELINES, _normalize_designation

    baseline = ROLE_BASELINES.get(
        _normalize_designation(user.designation), ROLE_BASELINES["default"]
    )

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
    query_text = ". ".join(
        f"Need to improve {name}: {desc}" for _, name, desc in gap_skills[:5]
    )

    # Ensure vectorizer is fitted
    await ensure_course_embeddings(db)

    if _vectorizer is None or _course_matrix is None:
        return 0

    # Fetch all courses in same order as _course_ids
    courses_result = await db.execute(select(Course))
    all_courses = {c.id: c for c in courses_result.scalars().all()}

    # Compute cosine similarities
    query_vec = _vectorizer.transform([query_text])
    sims = cosine_similarity(query_vec, _course_matrix)[0]

    scored = sorted(
        zip(sims.tolist(), _course_ids), key=lambda x: x[0], reverse=True
    )

    # Delete existing recommendations
    await db.execute(delete(Recommendation).where(Recommendation.user_id == user.id))

    now = datetime.now(timezone.utc)
    inserted = 0
    for sim, course_id in scored[:top_n]:
        course = all_courses.get(course_id)
        if course is None:
            continue
        db.add(
            Recommendation(
                user_id=user.id,
                course_id=course.id,
                score=round(float(sim) * 100, 2),
                generated_at=now,
                status="suggested",
            )
        )
        inserted += 1

    await db.flush()
    return inserted
