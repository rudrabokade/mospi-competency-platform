from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.db import engine, Base
from app.api.routers import auth, users, recommendations, materials, admin, igot

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting MoSPI AI Competency Platform API...")
    # Create tables if they don't exist (Alembic handles migrations in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database ready.")
    yield
    await engine.dispose()


app = FastAPI(
    title="MoSPI AI Competency Platform",
    description="AI-Enabled Adaptive Learning & Competency Gap Platform for MoSPI (SIH 26101)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(recommendations.router)
app.include_router(materials.router)
app.include_router(admin.router)
app.include_router(igot.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.app_name}


@app.get("/")
async def root():
    return {
        "message": "MoSPI AI Competency Platform API",
        "docs": "/docs",
        "redoc": "/redoc",
    }
