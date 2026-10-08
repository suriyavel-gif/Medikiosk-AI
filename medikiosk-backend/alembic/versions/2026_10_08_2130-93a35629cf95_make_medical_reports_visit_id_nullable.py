"""Make medical_reports.visit_id nullable

Revision ID: 93a35629cf95
Revises: 4ac9b25dce31
Create Date: 2026-10-08 21:30:01.638439

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '93a35629cf95'
down_revision: Union[str, None] = '4ac9b25dce31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('medical_reports', 'visit_id',
                    existing_type=sa.String(length=36),
                    nullable=True)


def downgrade() -> None:
    op.alter_column('medical_reports', 'visit_id',
                    existing_type=sa.String(length=36),
                    nullable=False)
