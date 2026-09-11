from __future__ import annotations

"""
Quiz Generator — RAG pipeline for MCQ generation from uploaded materials.

Pipeline:
  1. Extract text from PDF / PPTX / TXT
  2. Chunk text (~500 tokens)
  3. Prompt LLM to generate MCQs per chunk (JSON output)
  4. Validate and store questions
"""

import json
import logging
import re
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import Material, Quiz, QuizQuestion

settings = get_settings()
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Text extraction
# ─────────────────────────────────────────────────────────────


def extract_text_from_pdf(path: str) -> str:
    try:
        import pymupdf  # PyMuPDF
        doc = pymupdf.open(path)
        return "\n".join(page.get_text() for page in doc)
    except ImportError:
        pass
    try:
        from pypdf import PdfReader
        reader = PdfReader(path)
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except ImportError:
        raise RuntimeError("Install pymupdf or pypdf: pip install pymupdf")


def extract_text_from_pptx(path: str) -> str:
    from pptx import Presentation
    prs = Presentation(path)
    texts = []
    for slide in prs.slides:
        for shape in slide.shapes:
            if hasattr(shape, "text"):
                texts.append(shape.text)
    return "\n".join(texts)


def extract_text(material: Material) -> str:
    path = material.file_url
    ft = material.file_type
    if ft == "pdf":
        return extract_text_from_pdf(path)
    elif ft == "pptx":
        return extract_text_from_pptx(path)
    elif ft == "txt":
        return Path(path).read_text(encoding="utf-8", errors="replace")
    else:
        raise ValueError(f"Unsupported file type for text extraction: {ft}")


# ─────────────────────────────────────────────────────────────
# Chunking
# ─────────────────────────────────────────────────────────────

def chunk_text(text: str, max_chars: int = 2000) -> list[str]:
    """Split text into ~max_chars chunks on sentence/paragraph boundaries."""
    paragraphs = re.split(r"\n{2,}", text)
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(current) + len(para) < max_chars:
            current += "\n" + para
        else:
            if current:
                chunks.append(current.strip())
            current = para
    if current:
        chunks.append(current.strip())
    return [c for c in chunks if len(c) > 100]


# ─────────────────────────────────────────────────────────────
# LLM call (OpenAI-compatible or Ollama)
# ─────────────────────────────────────────────────────────────

MCQ_SYSTEM_PROMPT = """You are an expert instructional designer.
Given a passage of text, generate multiple-choice questions (MCQs) for a knowledge assessment.
Return ONLY a valid JSON object with a key "questions" containing an array of questions. Each question must have:
{
  "question_text": "...",
  "options": [{"id": "A", "text": "..."}, {"id": "B", "text": "..."}, {"id": "C", "text": "..."}, {"id": "D", "text": "..."}],
  "correct_option_id": "A",
  "explanation": "One to two sentences explaining the correct answer.",
  "difficulty": "easy" | "medium" | "hard"
}
Generate exactly 3 questions per chunk. Do NOT include any markdown fences or prose outside the JSON object."""

MCQ_USER_TEMPLATE = """Generate 3 MCQs from the following text:

{chunk}

Return ONLY a JSON object with a "questions" key containing the array."""


def _call_llm(chunk: str) -> list[dict]:
    prompt = MCQ_USER_TEMPLATE.format(chunk=chunk)

    if settings.llm_provider == "ollama":
        import requests
        resp = requests.post(
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": settings.ollama_model,
                "messages": [
                    {"role": "system", "content": MCQ_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "stream": False,
                "format": "json",
            },
            timeout=120,
        )
        resp.raise_for_status()
        content = resp.json()["message"]["content"]
    else:
        # OpenAI-compatible
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": MCQ_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content

    return _parse_llm_response(content)


def _parse_llm_response(content: str) -> list[dict]:
    """Defensively parse LLM JSON output."""
    content = content.strip()
    # Strip markdown fences if present
    content = re.sub(r"^```json?\s*", "", content)
    content = re.sub(r"\s*```$", "", content)

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        # Try to extract array from within JSON object
        match = re.search(r"\[.*\]", content, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
        else:
            logger.warning("Could not parse LLM output: %s", content[:200])
            return []

    if isinstance(parsed, dict):
        # Model returned {"questions": [...]}
        for key in ("questions", "mcqs", "items", "data"):
            if key in parsed and isinstance(parsed[key], list):
                parsed = parsed[key]
                break
        else:
            return []

    if not isinstance(parsed, list):
        return []

    validated = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        if not all(k in item for k in ("question_text", "options", "correct_option_id")):
            continue
        if not isinstance(item["options"], list) or len(item["options"]) < 2:
            continue
        item.setdefault("explanation", "")
        item.setdefault("difficulty", "medium")
        validated.append(item)

    return validated


# ─────────────────────────────────────────────────────────────
# Fallback MCQ generator (no LLM required)
# ─────────────────────────────────────────────────────────────

def _generate_fallback_mcqs(chunks: list[str]) -> list[dict]:
    """Generate simple comprehension questions without an LLM (demo/test mode)."""
    mcqs = []
    for i, chunk in enumerate(chunks[:5]):
        sentences = [s.strip() for s in chunk.split(".") if len(s.strip()) > 30][:3]
        for j, sentence in enumerate(sentences):
            words = sentence.split()
            if len(words) < 6:
                continue
            # Blank the last meaningful word
            blank_idx = max(3, len(words) - 2)
            answer = words[blank_idx]
            question = " ".join(words[:blank_idx]) + " ________ " + " ".join(words[blank_idx + 1:])
            mcqs.append({
                "question_text": f"Fill in the blank: {question}?",
                "options": [
                    {"id": "A", "text": answer},
                    {"id": "B", "text": words[1] if len(words) > 1 else "None"},
                    {"id": "C", "text": words[2] if len(words) > 2 else "Other"},
                    {"id": "D", "text": "Not mentioned"},
                ],
                "correct_option_id": "A",
                "explanation": f"The correct answer is '{answer}' based on the passage.",
                "difficulty": "easy",
            })
    return mcqs[:10]


# ─────────────────────────────────────────────────────────────
# Main entry point
# ─────────────────────────────────────────────────────────────

async def generate_quiz_from_material(material: Material, db: AsyncSession) -> Quiz:
    """Extract text, generate MCQs via LLM, store quiz."""
    try:
        text = extract_text(material)
    except Exception as e:
        material.processing_error = str(e)
        await db.flush()
        raise

    chunks = chunk_text(text)
    if not chunks:
        material.processing_error = "No extractable text found in document."
        await db.flush()
        raise ValueError(material.processing_error)

    # Generate MCQs — try LLM, fall back to rule-based on failure
    all_questions: list[dict] = []
    if settings.openai_api_key or settings.llm_provider == "ollama":
        for chunk in chunks[:6]:  # max 6 chunks → up to 18 questions
            try:
                qs = _call_llm(chunk)
                all_questions.extend(qs)
            except Exception as e:
                logger.warning("LLM call failed for chunk: %s", e)

    if not all_questions:
        logger.info("Falling back to rule-based MCQ generation")
        all_questions = _generate_fallback_mcqs(chunks)

    if not all_questions:
        raise ValueError("Could not generate any questions from the material.")

    # Create Quiz record
    title = f"Quiz: {material.original_filename or 'Uploaded Material'}"
    quiz = Quiz(material_id=material.id, title=title)
    db.add(quiz)
    await db.flush()

    # Store questions
    for q in all_questions[:20]:  # cap at 20
        db.add(
            QuizQuestion(
                quiz_id=quiz.id,
                question_text=q["question_text"],
                options=q["options"],
                correct_option_id=q["correct_option_id"],
                explanation=q.get("explanation", ""),
                difficulty=q.get("difficulty", "medium"),
            )
        )

    material.processed = True
    await db.flush()

    # Reload with questions
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz.id).options(selectinload(Quiz.questions))
    )
    return result.scalar_one()
