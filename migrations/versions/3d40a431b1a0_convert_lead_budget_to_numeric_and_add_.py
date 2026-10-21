"""convert lead budget to numeric and add currency

Revision ID: 3d40a431b1a0
Revises: 9b45c7e4b83c
Create Date: 2026-10-17 11:18:17.609907

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3d40a431b1a0'
down_revision: Union[str, Sequence[str], None] = '9b45c7e4b83c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    # Preserve every original budget value as text.
    op.alter_column(
        "leads",
        "budget",
        new_column_name="budget_legacy",
        existing_type=sa.String(length=100),
        existing_nullable=True,
    )

    # New numeric amount and ISO-style currency code.
    op.add_column(
        "leads",
        sa.Column("budget", sa.Numeric(14, 2), nullable=True),
    )
    op.add_column(
        "leads",
        sa.Column("budget_currency", sa.String(length=3), nullable=True),
    )

    # Convert only plain numeric strings.
    # Unrecognized values remain intact in budget_legacy.
    op.execute(
        """
        UPDATE leads
        SET budget = budget_legacy::numeric
        WHERE budget_legacy IS NOT NULL
          AND btrim(budget_legacy) ~ '^[0-9]+([.][0-9]{1,2})?$'
        """
    )


def downgrade() -> None:
    # Preserve newer numeric amounts as text when rolling back.
    op.execute(
        """
        UPDATE leads
        SET budget_legacy = COALESCE(
            budget_legacy,
            budget::text
        )
        WHERE budget IS NOT NULL
        """
    )

    op.drop_column("leads", "budget_currency")
    op.drop_column("leads", "budget")

    op.alter_column(
        "leads",
        "budget_legacy",
        new_column_name="budget",
        existing_type=sa.String(length=100),
        existing_nullable=True,
    )