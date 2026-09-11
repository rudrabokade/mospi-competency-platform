from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.db import get_db
from app.core.security import get_current_admin, get_current_user
from app.models import Material, Quiz, QuizAttempt, QuizQuestion, User
from app.services.quiz_generator import generate_quiz_from_material

settings = get_settings()
router = APIRouter(prefix="/api", tags=["materials", "quizzes"])

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "video/mp4": "video",
}


@router.post("/materials/upload")
async def upload_material(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    content_type = file.content_type or ""
    file_type = ALLOWED_TYPES.get(content_type)
    if not file_type:
        # Try by extension
        ext = Path(file.filename or "").suffix.lower()
        ext_map = {".pdf": "pdf", ".pptx": "pptx", ".txt": "txt", ".mp4": "video"}
        file_type = ext_map.get(ext)
    if not file_type:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    upload_dir = Path(settings.local_upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_id = str(uuid.uuid4())
    filename = f"{file_id}_{file.filename}"
    file_path = upload_dir / filename
    content = await file.read()
    file_path.write_bytes(content)

    material = Material(
        uploaded_by=current_user.id,
        file_url=str(file_path),
        original_filename=file.filename,
        file_type=file_type,
        processed=False,
    )
    db.add(material)
    await db.flush()

    return {
        "id": str(material.id),
        "filename": file.filename,
        "file_type": file_type,
        "status": "uploaded",
    }


@router.get("/materials/{material_id}/status")
async def get_material_status(
    material_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Material).where(Material.id == material_id))
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return {
        "id": str(material.id),
        "processed": material.processed,
        "error": material.processing_error,
        "file_type": material.file_type,
    }


@router.post("/materials/{material_id}/generate-quiz")
async def generate_quiz(
    material_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(select(Material).where(Material.id == material_id))
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    quiz = await generate_quiz_from_material(material, db)
    return {
        "quiz_id": str(quiz.id),
        "title": quiz.title,
        "question_count": len(quiz.questions),
    }


@router.get("/quizzes/{quiz_id}")
async def get_quiz(
    quiz_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.questions))
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # For learners, hide correct_option_id
    questions = []
    for q in quiz.questions:
        questions.append(
            {
                "id": str(q.id),
                "question_text": q.question_text,
                "options": q.options,
                "difficulty": q.difficulty,
            }
        )

    return {
        "id": str(quiz.id),
        "title": quiz.title,
        "material_id": str(quiz.material_id),
        "created_at": quiz.created_at.isoformat(),
        "questions": questions,
    }


class QuizAttemptRequest(BaseModel):
    answers: dict[str, str]  # {question_id: chosen_option_id}


@router.post("/quizzes/{quiz_id}/attempt")
async def attempt_quiz(
    quiz_id: uuid.UUID,
    body: QuizAttemptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.questions))
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Score the attempt
    correct = 0
    feedback = []
    for q in quiz.questions:
        qid = str(q.id)
        chosen = body.answers.get(qid)
        is_correct = chosen == q.correct_option_id
        if is_correct:
            correct += 1
        feedback.append(
            {
                "question_id": qid,
                "chosen": chosen,
                "correct": q.correct_option_id,
                "is_correct": is_correct,
                "explanation": q.explanation,
            }
        )

    score = (correct / len(quiz.questions)) * 100 if quiz.questions else 0.0

    attempt = QuizAttempt(
        user_id=current_user.id,
        quiz_id=quiz_id,
        score=score,
        answers=body.answers,
    )
    db.add(attempt)
    await db.flush()

    # Update competency scores via Knowledge Tracing
    from app.services.competency_engine import update_scores_from_quiz
    await update_scores_from_quiz(current_user.id, quiz, score, db)

    return {
        "attempt_id": str(attempt.id),
        "score": score,
        "correct": correct,
        "total": len(quiz.questions),
        "feedback": feedback,
    }


@router.get("/quizzes")
async def list_quizzes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Quiz).options(selectinload(Quiz.material)).order_by(Quiz.created_at.desc())
    )
    quizzes = result.scalars().all()
    return [
        {
            "id": str(q.id),
            "title": q.title,
            "material_filename": q.material.original_filename if q.material else None,
            "created_at": q.created_at.isoformat(),
        }
        for q in quizzes
    ]
