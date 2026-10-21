"""add follow-up activity history

Revision ID: 4f9c2e7a1d30
Revises: 3d40a431b1a0
Create Date: 2026-10-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "4f9c2e7a1d30"
down_revision: Union[str, Sequence[str], None] = "3d40a431b1a0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "follow_up_activities",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("lead_id", sa.Integer(), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_follow_up_activities_lead_id", "follow_up_activities", ["lead_id"])
    op.create_index("ix_follow_up_activities_owner_id", "follow_up_activities", ["owner_id"])
    # Preserve the current scheduled follow-up as the initial history event.
    op.execute("""
        INSERT INTO follow_up_activities
            (lead_id, owner_id, action, scheduled_at, note, status, created_at)
        SELECT id, owner_id, 'scheduled', follow_up_at, follow_up_note,
               follow_up_status, CURRENT_TIMESTAMP
        FROM leads
        WHERE follow_up_at IS NOT NULL AND owner_id IS NOT NULL
    """)


def downgrade() -> None:
    op.drop_index("ix_follow_up_activities_owner_id", table_name="follow_up_activities")
    op.drop_index("ix_follow_up_activities_lead_id", table_name="follow_up_activities")
    op.drop_table("follow_up_activities")
