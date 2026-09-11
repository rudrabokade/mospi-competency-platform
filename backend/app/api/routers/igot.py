from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api/igot", tags=["igot"])

# iGOT Karmayogi integration stub
# To integrate the real API: replace the mock data below with HTTP calls to
#   settings.igot_api_base_url using settings.igot_api_key
# This adapter is intentionally isolated — all iGOT I/O goes through this module.

MOCK_COURSES = [
    {
        "external_id": "IGOT-STAT-001",
        "title": "Fundamentals of Survey Design and Sampling",
        "description": "Covers probability sampling, questionnaire design, and field survey management for national statistical surveys.",
        "skill_tags": ["survey_design", "sampling"],
        "provider": "iGOT Karmayogi",
        "source_url": "https://igotkarmayogi.gov.in/course/IGOT-STAT-001",
        "duration_hours": 8.0,
    },
    {
        "external_id": "IGOT-STAT-002",
        "title": "National Accounts Statistics: Concepts and Methodology",
        "description": "GDP computation, sectoral accounts, and national income framework aligned to SNA 2008.",
        "skill_tags": ["national_accounts", "sdg_indicators"],
        "provider": "iGOT Karmayogi",
        "source_url": "https://igotkarmayogi.gov.in/course/IGOT-STAT-002",
        "duration_hours": 12.0,
    },
    {
        "external_id": "IGOT-TECH-001",
        "title": "Python for Data Analysis",
        "description": "Pandas, NumPy, Matplotlib for data wrangling, exploration and visualization in a government statistical context.",
        "skill_tags": ["python", "data_visualization"],
        "provider": "iGOT Karmayogi",
        "source_url": "https://igotkarmayogi.gov.in/course/IGOT-TECH-001",
        "duration_hours": 16.0,
    },
    {
        "external_id": "IGOT-TECH-002",
        "title": "SQL for Statistical Databases",
        "description": "Querying, aggregating, and reporting from relational databases using SQL; NSSO and PLFS datasets.",
        "skill_tags": ["sql", "data_visualization"],
        "provider": "iGOT Karmayogi",
        "source_url": "https://igotkarmayogi.gov.in/course/IGOT-TECH-002",
        "duration_hours": 10.0,
    },
    {
        "external_id": "IGOT-TECH-003",
        "title": "Introduction to Machine Learning for Government Data",
        "description": "Supervised and unsupervised ML algorithms applied to census, economic survey, and social sector data.",
        "skill_tags": ["ai_ml", "python"],
        "provider": "iGOT Karmayogi",
        "source_url": "https://igotkarmayogi.gov.in/course/IGOT-TECH-003",
        "duration_hours": 20.0,
    },
    {
        "external_id": "IGOT-DG-001",
        "title": "Cybersecurity Essentials for Government Officers",
        "description": "Data privacy, digital hygiene, phishing awareness, CERT-In guidelines, and secure handling of sensitive statistical data.",
        "skill_tags": ["cybersecurity", "data_privacy"],
        "provider": "iGOT Karmayogi",
        "source_url": "https://igotkarmayogi.gov.in/course/IGOT-DG-001",
        "duration_hours": 6.0,
    },
    {
        "external_id": "IGOT-DG-002",
        "title": "Digital Public Infrastructure and Gov Cloud",
        "description": "Overview of India Stack, Aadhaar API, DigiLocker, UMANG; MeitY empaneled cloud services for data residency.",
        "skill_tags": ["dpi", "gov_cloud"],
        "provider": "iGOT Karmayogi",
        "source_url": "https://igotkarmayogi.gov.in/course/IGOT-DG-002",
        "duration_hours": 8.0,
    },
    {
        "external_id": "IGOT-BEH-001",
        "title": "Leadership and Team Management for Statistical Officers",
        "description": "Situational leadership, managing field teams, inter-departmental coordination, and ethical decision-making.",
        "skill_tags": ["leadership", "communication"],
        "provider": "iGOT Karmayogi",
        "source_url": "https://igotkarmayogi.gov.in/course/IGOT-BEH-001",
        "duration_hours": 10.0,
    },
    {
        "external_id": "IGOT-BEH-002",
        "title": "Project Management for Government Programs",
        "description": "Planning, risk management, monitoring and evaluation for large-scale government statistical programs.",
        "skill_tags": ["project_management", "change_management"],
        "provider": "iGOT Karmayogi",
        "source_url": "https://igotkarmayogi.gov.in/course/IGOT-BEH-002",
        "duration_hours": 12.0,
    },
    {
        "external_id": "IGOT-STAT-003",
        "title": "SDG Indicators: Measurement and Reporting",
        "description": "Methodology for tracking India's 102+ SDG indicators, data quality standards, and metadata frameworks.",
        "skill_tags": ["sdg_indicators", "metadata"],
        "provider": "iGOT Karmayogi",
        "source_url": "https://igotkarmayogi.gov.in/course/IGOT-STAT-003",
        "duration_hours": 8.0,
    },
    {
        "external_id": "IGOT-TECH-004",
        "title": "GIS and Spatial Data for Census Operations",
        "description": "Using GIS tools for village boundary delineation, enumeration block mapping, and spatial analytics.",
        "skill_tags": ["gis", "data_visualization"],
        "provider": "iGOT Karmayogi",
        "source_url": "https://igotkarmayogi.gov.in/course/IGOT-TECH-004",
        "duration_hours": 14.0,
    },
    {
        "external_id": "IGOT-TECH-005",
        "title": "R for Statistical Computing",
        "description": "Data manipulation with tidyverse, statistical modelling, and publication-quality charts using ggplot2.",
        "skill_tags": ["r_language", "data_visualization"],
        "provider": "iGOT Karmayogi",
        "source_url": "https://igotkarmayogi.gov.in/course/IGOT-TECH-005",
        "duration_hours": 18.0,
    },
]


@router.get("/courses/sync")
async def sync_courses():
    """
    Returns mocked iGOT course catalog.
    REAL INTEGRATION POINT: Replace with HTTP GET to {IGOT_API_BASE_URL}/courses
    using Bearer {IGOT_API_KEY}.
    """
    return {"courses": MOCK_COURSES, "source": "mock"}


@router.post("/enrollments/sync")
async def sync_enrollments(body: dict):
    """
    Push completion status to iGOT.
    REAL INTEGRATION POINT: POST to {IGOT_API_BASE_URL}/enrollments
    """
    return {"message": "Enrollment sync stubbed", "received": body}
