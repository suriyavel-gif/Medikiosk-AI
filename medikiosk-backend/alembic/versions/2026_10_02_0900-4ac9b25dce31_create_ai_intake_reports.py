"""create ai intake reports

Revision ID: 4ac9b25dce31
Revises: dafa3b84b108
Create Date: 2026-10-02 09:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4ac9b25dce31"
down_revision: Union[str, None] = "dafa3b84b108"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_intake_reports",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("report_data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_ai_intake_reports_patient_created_at",
        "ai_intake_reports",
        ["patient_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_ai_intake_reports_patient_created_at", table_name="ai_intake_reports")
    op.drop_table("ai_intake_reports")
