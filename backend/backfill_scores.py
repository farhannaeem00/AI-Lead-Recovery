
from sqlalchemy import select

from backend.database import SessionLocal
from backend.models import Lead
from backend.scoring import score_lead


def backfill_scores():
    with SessionLocal() as db:
        leads = db.scalars(select(Lead).order_by(Lead.id)).all()

        for lead in leads:
            result = score_lead(lead)

            lead.score = result["score"]
            lead.priority = result["priority"]

            print(
                f"Updated lead #{lead.id}: "
                f"{lead.full_name} | "
                f"Score: {lead.score} | "
                f"Priority: {lead.priority}"
            )

        db.commit()
        print(f"\nSuccessfully updated {len(leads)} leads.")


if __name__ == "__main__":
    backfill_scores()
