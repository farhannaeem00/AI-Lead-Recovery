import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, RefreshCw, XCircle } from "lucide-react";
import { getFollowUps, updateFollowUp } from "../api";

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

export default function FollowUpsPage({ onOpenLead, onChanged }) {
  const [items, setItems] = useState([]);
  const [dates, setDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getFollowUps();
      setItems(result);
      setDates(Object.fromEntries(result.map((item) => [item.lead_id, toLocalInput(item.follow_up_at)])));
    } catch (err) {
      setError(err.message || "Unable to load follow-ups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(item, status) {
    setSavingId(item.lead_id);
    setError("");
    setNotice("");
    try {
      await updateFollowUp(item.lead_id, { follow_up_status: status });
      setNotice(status === "completed" ? "Follow-up marked as completed." : "Follow-up cancelled.");
      await load();
      await onChanged?.();
    } catch (err) {
      setError(err.message || "Unable to update follow-up.");
    } finally {
      setSavingId(null);
    }
  }

  async function reschedule(item) {
    const value = dates[item.lead_id];
    if (!value) {
      setError("Choose a new date and time before rescheduling.");
      return;
    }
    setSavingId(item.lead_id);
    setError("");
    setNotice("");
    try {
      await updateFollowUp(item.lead_id, {
        follow_up_at: new Date(value).toISOString(),
        follow_up_status: "pending",
      });
      setNotice("Follow-up rescheduled.");
      await load();
      await onChanged?.();
    } catch (err) {
      setError(err.message || "Unable to reschedule follow-up.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="panel followups-page">
      <div className="panel-heading">
        <div>
          <h2>Follow-up queue</h2>
          <p>Review, complete, cancel, or reschedule your next actions.</p>
        </div>
        <button className="secondary-button" type="button" onClick={load} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {loading ? <p>Loading follow-ups…</p> : items.length === 0 ? (
        <div className="empty-state">No pending follow-ups. Schedule one from a lead's details.</div>
      ) : (
        <div className="followup-list">
          {items.map((item) => {
            const overdue = new Date(item.follow_up_at).getTime() < Date.now();
            return (
              <article className="followup-item" key={item.lead_id}>
                <div className="followup-item-main">
                  <div className="followup-item-title">
                    <Clock3 size={18} />
                    <button type="button" className="text-button" onClick={() => onOpenLead?.(item.lead_id)}>
                      {item.full_name}
                    </button>
                    <span className={`priority priority-${String(item.priority || "cold").toLowerCase()}`}>
                      <span /> {item.priority || "cold"}
                    </span>
                    {overdue && <span className="followup-overdue">Overdue</span>}
                  </div>
                  <p>{item.email || item.phone || "No contact details"}</p>
                  {item.follow_up_note && <p>{item.follow_up_note}</p>}
                  <small>Scheduled: {formatDate(item.follow_up_at)}</small>
                </div>
                <div className="followup-controls">
                  <label>
                    Reschedule
                    <input
                      type="datetime-local"
                      value={dates[item.lead_id] || ""}
                      onChange={(event) => setDates((old) => ({ ...old, [item.lead_id]: event.target.value }))}
                    />
                  </label>
                  <div className="form-actions">
                    <button className="secondary-button" type="button" disabled={savingId === item.lead_id} onClick={() => reschedule(item)}>
                      <RefreshCw size={15} /> Reschedule
                    </button>
                    <button className="secondary-button" type="button" disabled={savingId === item.lead_id} onClick={() => changeStatus(item, "completed")}>
                      <CheckCircle2 size={15} /> Complete
                    </button>
                    <button className="secondary-button" type="button" disabled={savingId === item.lead_id} onClick={() => changeStatus(item, "cancelled")}>
                      <XCircle size={15} /> Cancel
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
