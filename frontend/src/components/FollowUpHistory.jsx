import { useEffect, useState } from "react";
import { getFollowUpHistory } from "../api";

function formatDate(value) {
  if (!value) return "No date recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function FollowUpHistory({ leadId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getFollowUpHistory(leadId)
      .then((result) => { if (active) setItems(result); })
      .catch((err) => { if (active) setError(err.message || "Could not load follow-up history."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [leadId]);

  return (
    <section className="followup-history">
      <div className="panel-heading">
        <div><h3>Follow-up history</h3><p>Schedule changes and completed actions.</p></div>
      </div>
      {loading ? <p>Loading history…</p> : error ? <p className="auth-error" role="alert">{error}</p> : items.length === 0 ? (
        <p>No follow-up activity recorded yet.</p>
      ) : (
        <ol className="history-list">
          {items.map((item) => (
            <li key={item.id}>
              <div><strong>{item.action.charAt(0).toUpperCase() + item.action.slice(1)}</strong><span>{formatDate(item.created_at)}</span></div>
              <small>Scheduled for: {formatDate(item.scheduled_at)} · Status: {item.status}</small>
              {item.note && <p>{item.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
