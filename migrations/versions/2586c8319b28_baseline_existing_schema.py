
"""Create the initial leads table for fresh installations."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "2586c8319b28"
down_revision: Union[str, Sequence[str], None] = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "leads",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("budget", sa.String(length=100), nullable=True),
        sa.Column("location", sa.String(length=150), nullable=True),
        sa.Column("timeline", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column(
            "score",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "priority",
            sa.String(length=10),
            server_default="cold",
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "follow_up_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "follow_up_status",
            sa.String(length=20),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("follow_up_note", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_leads_id", "leads", ["id"])
    op.create_index("ix_leads_email", "leads", ["email"])


def downgrade() -> None:
    op.drop_index("ix_leads_email", table_name="leads")
    op.drop_index("ix_leads_id", table_name="leads")
    op.drop_table("leads")
