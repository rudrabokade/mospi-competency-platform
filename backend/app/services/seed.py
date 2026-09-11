from __future__ import annotations

"""Seed script: populates skill taxonomy, mock officers, and course catalog."""

import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.security import hash_password
from app.models import CompetencyScore, Course, Skill, User

settings = get_settings()

SKILLS = [
    # Statistical domain
    ("statistical", "Survey Design", "Design of statistical surveys, questionnaires, and field operations"),
    ("statistical", "Sampling", "Probability and non-probability sampling methods"),
    ("statistical", "National Accounts", "GDP computation, sectoral accounts, SNA methodology"),
    ("statistical", "Price Statistics", "CPI, WPI, and price index methodology"),
    ("statistical", "Labour Statistics", "Employment, unemployment, PLFS surveys"),
    ("statistical", "Agri Statistics", "Agricultural census, crop surveys, food statistics"),
    ("statistical", "Industrial Statistics", "ASI, IIP, and manufacturing sector data"),
    ("statistical", "SDG Indicators", "SDG measurement frameworks and India's indicator set"),
    ("statistical", "Metadata", "Data documentation, metadata standards, SDMX"),
    ("statistical", "Data Quality", "Data validation, quality assurance frameworks"),
    # Technical domain
    ("technical", "Python", "Python programming for data analysis and automation"),
    ("technical", "R Language", "R statistical computing and visualization"),
    ("technical", "SQL", "Relational database querying and management"),
    ("technical", "Stata", "Stata statistical software for econometrics"),
    ("technical", "SPSS", "SPSS for social science statistical analysis"),
    ("technical", "SAS", "SAS for enterprise statistical analytics"),
    ("technical", "GIS", "Geographic information systems and spatial analysis"),
    ("technical", "Data Visualization", "Charts, dashboards, and visual storytelling"),
    ("technical", "AI ML", "Machine learning and AI model development"),
    ("technical", "Cloud", "Cloud computing services and infrastructure"),
    ("technical", "APIs", "REST APIs, web services, and data integration"),
    # Digital governance domain
    ("digital_governance", "Cybersecurity", "Cybersecurity principles and government guidelines"),
    ("digital_governance", "Data Privacy", "Data protection laws and privacy principles"),
    ("digital_governance", "Digital Signatures", "PKI, e-signatures, and digital certificates"),
    ("digital_governance", "Gov Cloud", "MeitY empaneled cloud services and gov IT policy"),
    ("digital_governance", "DPI", "Digital Public Infrastructure — India Stack, UPI, Aadhaar"),
    # Behavioural domain
    ("behavioural", "Leadership", "Leadership styles and team management"),
    ("behavioural", "Communication", "Written, verbal and presentation skills"),
    ("behavioural", "Project Management", "Planning, execution, and monitoring of projects"),
    ("behavioural", "Ethics", "Government ethics, integrity, and public service values"),
    ("behavioural", "Change Management", "Managing organizational change and transformation"),
]

OFFICERS = [
    {
        "name": "Priya Sharma",
        "email": "priya.sharma@mospi.gov.in",
        "password": "Password@123",
        "role": "learner",
        "designation": "Statistical Officer",
        "department": "Price Statistics Division",
        "experience_years": 5,
        "qualifications": ["M.Sc. Statistics", "B.Sc. Mathematics"],
    },
    {
        "name": "Rajesh Kumar",
        "email": "rajesh.kumar@mospi.gov.in",
        "password": "Password@123",
        "role": "learner",
        "designation": "Data Analyst",
        "department": "National Accounts Division",
        "experience_years": 3,
        "qualifications": ["M.Sc. Data Science", "B.Tech Computer Science"],
    },
    {
        "name": "Ananya Iyer",
        "email": "ananya.iyer@mospi.gov.in",
        "password": "Password@123",
        "role": "learner",
        "designation": "Senior Statistical Officer",
        "department": "Labour and Employment Division",
        "experience_years": 12,
        "qualifications": ["Ph.D. Economics", "M.Sc. Statistics"],
    },
    {
        "name": "Vikram Patel",
        "email": "vikram.patel@mospi.gov.in",
        "password": "Password@123",
        "role": "learner",
        "designation": "Statistical Officer",
        "department": "Agricultural Statistics Division",
        "experience_years": 7,
        "qualifications": ["M.Sc. Agricultural Statistics"],
    },
    {
        "name": "Sneha Nair",
        "email": "sneha.nair@mospi.gov.in",
        "password": "Password@123",
        "role": "learner",
        "designation": "Data Analyst",
        "department": "Survey Coordination Division",
        "experience_years": 2,
        "qualifications": ["M.Sc. Statistics"],
    },
    {
        "name": "Amit Verma",
        "email": "amit.verma@mospi.gov.in",
        "password": "Password@123",
        "role": "learner",
        "designation": "Statistical Officer",
        "department": "IT and Data Management Division",
        "experience_years": 6,
        "qualifications": ["B.Tech Computer Science", "MBA"],
    },
    {
        "name": "Deepa Rao",
        "email": "deepa.rao@mospi.gov.in",
        "password": "Password@123",
        "role": "learner",
        "designation": "Senior Statistical Officer",
        "department": "Social Statistics Division",
        "experience_years": 15,
        "qualifications": ["Ph.D. Sociology", "M.Sc. Statistics"],
    },
    # Admin
    {
        "name": "Admin DIID",
        "email": "admin@mospi.gov.in",
        "password": "Admin@123",
        "role": "admin",
        "designation": "DIID Administrator",
        "department": "Data Informatics and Innovation Division",
        "experience_years": 10,
        "qualifications": ["M.Tech Information Systems"],
    },
]

# Score variation per officer (simulate different proficiency levels)
SCORE_VARIATIONS = [
    {"statistical": 0, "technical": -20, "digital_governance": -10, "behavioural": 0},
    {"statistical": -15, "technical": +15, "digital_governance": 0, "behavioural": -10},
    {"statistical": +10, "technical": -25, "digital_governance": +5, "behavioural": +10},
    {"statistical": +5, "technical": -10, "digital_governance": -15, "behavioural": +5},
    {"statistical": -20, "technical": +10, "digital_governance": -20, "behavioural": -15},
    {"statistical": -10, "technical": +20, "digital_governance": +10, "behavioural": -5},
    {"statistical": +15, "technical": -30, "digital_governance": +0, "behavioural": +15},
    {"statistical": 0, "technical": 0, "digital_governance": 0, "behavioural": 0},
]


async def seed(db: AsyncSession) -> None:
    from app.services.competency_engine import ROLE_BASELINES, _normalize_designation

    print("Seeding skill taxonomy...")
    skill_map: dict[str, Skill] = {}
    for domain, name, description in SKILLS:
        key = name.lower().replace(" ", "_")
        existing = (await db.execute(select(Skill).where(Skill.name == name))).scalar_one_or_none()
        if not existing:
            skill = Skill(domain=domain, name=name, description=description)
            db.add(skill)
            await db.flush()
            skill_map[key] = skill
        else:
            skill_map[key] = existing

    print("Seeding officers and competency scores...")
    for i, officer_data in enumerate(OFFICERS):
        existing_user = (await db.execute(select(User).where(User.email == officer_data["email"]))).scalar_one_or_none()
        if existing_user:
            print(f"  Skipping existing user: {officer_data['email']}")
            continue

        user = User(
            name=officer_data["name"],
            email=officer_data["email"],
            hashed_password=hash_password(officer_data["password"]),
            role=officer_data["role"],
            designation=officer_data["designation"],
            department=officer_data["department"],
            experience_years=officer_data["experience_years"],
            qualifications=officer_data["qualifications"],
        )
        db.add(user)
        await db.flush()
        print(f"  Created user: {user.email}")

        if user.role == "learner":
            baseline = ROLE_BASELINES.get(_normalize_designation(user.designation), ROLE_BASELINES["default"])
            variation = SCORE_VARIATIONS[i % len(SCORE_VARIATIONS)]
            exp_boost = min(user.experience_years * 0.5, 10.0)

            for skill in skill_map.values():
                key = skill.name.lower().replace(" ", "_")
                base = baseline.get(key, 35.0)
                domain_var = variation.get(skill.domain, 0)
                score = min(100.0, max(0.0, base + exp_boost + domain_var))
                db.add(CompetencyScore(user_id=user.id, skill_id=skill.id, score=score, source="seed"))

            await db.flush()

    print("Seeding course catalog from iGOT mock...")
    from app.api.routers.igot import MOCK_COURSES
    for course_data in MOCK_COURSES:
        existing = (await db.execute(select(Course).where(Course.external_id == course_data["external_id"]))).scalar_one_or_none()
        if existing:
            continue
        # Resolve skill tag names to UUIDs (store as string list)
        skill_tag_ids = []
        for tag in course_data.get("skill_tags", []):
            normalized_tag = tag.lower().replace(" ", "_")
            matched = skill_map.get(normalized_tag)
            if matched:
                skill_tag_ids.append(str(matched.id))

        course = Course(
            external_id=course_data["external_id"],
            title=course_data["title"],
            description=course_data["description"],
            skill_tags=skill_tag_ids,
            source_url=course_data.get("source_url"),
            provider=course_data.get("provider", "iGOT"),
            duration_hours=course_data.get("duration_hours"),
        )
        db.add(course)

    await db.flush()
    print("Seed complete.")


async def main():
    connect_args = {"check_same_thread": False} if "sqlite" in settings.database_url else {}
    engine = create_async_engine(settings.database_url, echo=False, connect_args=connect_args)
    from app.core.db import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    async with SessionLocal() as session:
        async with session.begin():
            await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
