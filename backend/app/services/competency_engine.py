from __future__ import annotations

"""
Competency Engine — Bayesian Knowledge Tracing (BKT) based gap computation.

BKT parameters per skill:
  P(L0) = prior knowledge probability (seed score / 100)
  P(T)  = learning / transition probability
  P(G)  = guess probability
  P(S)  = slip probability

After each quiz question:
  P(L | correct) = P(L)*(1-P(S)) / [P(L)*(1-P(S)) + (1-P(L))*P(G)]
  P(L | wrong)   = P(L)*P(S) / [P(L)*P(S) + (1-P(L))*(1-P(G))]
  P(L_new)       = P(L|evidence) + (1-P(L|evidence))*P(T)
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import CompetencyScore, Quiz, Skill, User

# ──────────────────────────────────────────────
# Role → Expected skill baseline (seed scores)
# ──────────────────────────────────────────────
ROLE_BASELINES: dict[str, dict[str, float]] = {
    "statistical_officer": {
        "survey_design": 70, "sampling": 70, "national_accounts": 60,
        "price_statistics": 55, "labour_statistics": 55, "agri_statistics": 55,
        "industrial_statistics": 55, "sdg_indicators": 60, "metadata": 55, "data_quality": 65,
        "python": 40, "r_language": 40, "sql": 45, "stata": 40, "spss": 35, "sas": 30,
        "gis": 35, "data_visualization": 50, "ai_ml": 25, "cloud": 20, "apis": 25,
        "cybersecurity": 50, "data_privacy": 55, "digital_signatures": 45, "gov_cloud": 40, "dpi": 40,
        "leadership": 50, "communication": 55, "project_management": 45, "ethics": 60, "change_management": 40,
    },
    "data_analyst": {
        "survey_design": 50, "sampling": 55, "national_accounts": 50,
        "price_statistics": 45, "labour_statistics": 45, "agri_statistics": 40,
        "industrial_statistics": 45, "sdg_indicators": 50, "metadata": 50, "data_quality": 60,
        "python": 70, "r_language": 65, "sql": 75, "stata": 50, "spss": 45, "sas": 35,
        "gis": 50, "data_visualization": 75, "ai_ml": 55, "cloud": 45, "apis": 55,
        "cybersecurity": 45, "data_privacy": 50, "digital_signatures": 40, "gov_cloud": 35, "dpi": 35,
        "leadership": 40, "communication": 50, "project_management": 40, "ethics": 55, "change_management": 35,
    },
    "senior_officer": {
        "survey_design": 80, "sampling": 80, "national_accounts": 75,
        "price_statistics": 70, "labour_statistics": 70, "agri_statistics": 65,
        "industrial_statistics": 65, "sdg_indicators": 70, "metadata": 65, "data_quality": 75,
        "python": 35, "r_language": 35, "sql": 40, "stata": 40, "spss": 35, "sas": 30,
        "gis": 30, "data_visualization": 55, "ai_ml": 25, "cloud": 30, "apis": 25,
        "cybersecurity": 60, "data_privacy": 65, "digital_signatures": 55, "gov_cloud": 50, "dpi": 50,
        "leadership": 75, "communication": 75, "project_management": 70, "ethics": 75, "change_management": 65,
    },
    "default": {
        "survey_design": 40, "sampling": 40, "national_accounts": 35,
        "price_statistics": 30, "labour_statistics": 30, "agri_statistics": 30,
        "industrial_statistics": 30, "sdg_indicators": 35, "metadata": 30, "data_quality": 40,
        "python": 30, "r_language": 25, "sql": 35, "stata": 25, "spss": 25, "sas": 20,
        "gis": 25, "data_visualization": 35, "ai_ml": 20, "cloud": 20, "apis": 25,
        "cybersecurity": 35, "data_privacy": 40, "digital_signatures": 30, "gov_cloud": 25, "dpi": 25,
        "leadership": 35, "communication": 40, "project_management": 35, "ethics": 45, "change_management": 30,
    },
}

# Expected scores by domain for a "competent" officer (role-based target)
DOMAIN_TARGETS: dict[str, float] = {
    "statistical": 70.0,
    "technical": 60.0,
    "digital_governance": 65.0,
    "behavioural": 65.0,
}

# BKT hyperparameters (MVP defaults)
BKT_P_T = 0.10   # learning rate per interaction
BKT_P_G = 0.25   # guess probability
BKT_P_S = 0.10   # slip probability


def _normalize_designation(designation: str | None) -> str:
    if not designation:
        return "default"
    d = designation.lower()
    if "senior" in d or "director" in d or "jt." in d or "joint" in d:
        return "senior_officer"
    if "analyst" in d:
        return "data_analyst"
    if "statistical" in d or "statistician" in d:
        return "statistical_officer"
    return "default"


async def seed_competency_scores(user: User, db: AsyncSession) -> None:
    """Create initial CompetencyScore rows for a user based on their role/designation."""
    baseline = ROLE_BASELINES.get(_normalize_designation(user.designation), ROLE_BASELINES["default"])

    # Boost slightly per year of experience (capped)
    exp_boost = min(user.experience_years * 0.5, 10.0)

    skills_result = await db.execute(select(Skill))
    skills = skills_result.scalars().all()

    for skill in skills:
        base = baseline.get(skill.name.lower().replace(" ", "_"), 35.0)
        score = min(100.0, base + exp_boost)
        db.add(
            CompetencyScore(
                user_id=user.id,
                skill_id=skill.id,
                score=score,
                source="seed",
            )
        )

    await db.flush()


async def compute_gaps(
    user: User,
    scores: list[CompetencyScore],
    db: AsyncSession,
) -> list[dict]:
    """Compute gap = target_score - current_score per skill."""
    baseline = ROLE_BASELINES.get(_normalize_designation(user.designation), ROLE_BASELINES["default"])

    gaps = []
    for score in scores:
        skill = score.skill  # assumes selectinload was applied
        target = baseline.get(skill.name.lower().replace(" ", "_"), 50.0)
        gap = max(0.0, target - score.score)
        gaps.append(
            {
                "skill_id": str(score.skill_id),
                "skill_name": skill.name,
                "domain": skill.domain,
                "current_score": round(score.score, 1),
                "target_score": round(target, 1),
                "gap": round(gap, 1),
                "priority": "high" if gap > 25 else ("medium" if gap > 10 else "low"),
            }
        )

    gaps.sort(key=lambda x: x["gap"], reverse=True)
    return gaps


async def update_scores_from_quiz(
    user_id: uuid.UUID,
    quiz: Quiz,
    overall_score: float,
    db: AsyncSession,
) -> None:
    """
    Apply BKT update to competency scores based on quiz performance.
    For MVP, we apply the update to all skills associated with the quiz's material.
    """
    # Fetch existing scores
    scores_result = await db.execute(
        select(CompetencyScore).where(CompetencyScore.user_id == user_id)
    )
    score_map = {str(s.skill_id): s for s in scores_result.scalars().all()}

    # Get skills from all questions in the quiz (difficulty-weighted)
    questions = quiz.questions
    if not questions:
        return

    # Derive correct/incorrect from overall quiz score
    # For a more granular system, map each question to a skill node
    performance = overall_score / 100.0  # 0-1

    # Update all skill scores using BKT with quiz performance as evidence
    for score_row in score_map.values():
        p_l = score_row.score / 100.0

        if performance >= 0.5:  # treat as "correct" evidence
            p_l_given_evidence = (p_l * (1 - BKT_P_S)) / (
                p_l * (1 - BKT_P_S) + (1 - p_l) * BKT_P_G
            )
        else:  # "incorrect" evidence
            p_l_given_evidence = (p_l * BKT_P_S) / (
                p_l * BKT_P_S + (1 - p_l) * (1 - BKT_P_G)
            )

        # Transition: learner may have learned something
        p_l_new = p_l_given_evidence + (1 - p_l_given_evidence) * BKT_P_T
        new_score = min(100.0, p_l_new * 100)

        # Blend: only apply meaningful change (avoid wild swings)
        blended = score_row.score * 0.7 + new_score * 0.3
        score_row.score = round(blended, 2)
        score_row.source = "quiz"

    await db.flush()
