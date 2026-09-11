"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2026-09-11

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID, ARRAY
from pgvector.sqlalchemy import Vector

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="learner"),
        sa.Column("designation", sa.String(255)),
        sa.Column("department", sa.String(255)),
        sa.Column("experience_years", sa.Integer, server_default="0"),
        sa.Column("qualifications", ARRAY(sa.String)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "skills",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("domain", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
    )

    op.create_table(
        "competency_scores",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("skill_id", UUID(as_uuid=True), sa.ForeignKey("skills.id"), nullable=False),
        sa.Column("score", sa.Float, server_default="0"),
        sa.Column("source", sa.String(50), server_default="seed"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "courses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("external_id", sa.String(255)),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("skill_tags", ARRAY(sa.String)),
        sa.Column("embedding", Vector(384)),
        sa.Column("source_url", sa.Text),
        sa.Column("provider", sa.String(100), server_default="iGOT"),
        sa.Column("duration_hours", sa.Float),
    )
    op.create_index("ix_courses_external_id", "courses", ["external_id"])

    op.create_table(
        "recommendations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("course_id", UUID(as_uuid=True), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("score", sa.Float, server_default="0"),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("status", sa.String(50), server_default="suggested"),
    )

    op.create_table(
        "materials",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("uploaded_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("file_url", sa.Text, nullable=False),
        sa.Column("original_filename", sa.String(500)),
        sa.Column("file_type", sa.String(50)),
        sa.Column("processed", sa.Boolean, server_default="false"),
        sa.Column("processing_error", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "quizzes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("material_id", UUID(as_uuid=True), sa.ForeignKey("materials.id"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "quiz_questions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("quiz_id", UUID(as_uuid=True), sa.ForeignKey("quizzes.id"), nullable=False),
        sa.Column("question_text", sa.Text, nullable=False),
        sa.Column("options", JSONB),
        sa.Column("correct_option_id", sa.String(50), nullable=False),
        sa.Column("explanation", sa.Text),
        sa.Column("difficulty", sa.String(50), server_default="medium"),
    )

    op.create_table(
        "quiz_attempts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("quiz_id", UUID(as_uuid=True), sa.ForeignKey("quizzes.id"), nullable=False),
        sa.Column("score", sa.Float, server_default="0"),
        sa.Column("answers", JSONB),
        sa.Column("attempted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("quiz_attempts")
    op.drop_table("quiz_questions")
    op.drop_table("quizzes")
    op.drop_table("materials")
    op.drop_table("recommendations")
    op.drop_table("courses")
    op.drop_table("competency_scores")
    op.drop_table("skills")
    op.drop_table("users")
