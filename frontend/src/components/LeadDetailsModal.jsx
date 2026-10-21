import { Bot, Sparkles, X } from "lucide-react";
import { STATUS_LABELS, backendStatus } from "../utils/lead";
import AIResult from "./AIResult";
import FollowUpHistory from "./FollowUpHistory";

export default function LeadDetailsModal({
  selectedLead, setSelectedLead, setAiResult, followUpAt, setFollowUpAt,
  followUpNote, setFollowUpNote, changeStatus, saveFollowUp, aiBusy, runAI,
  aiResult, removeLead,
}) {
  return (
    <>
      {selectedLead && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setSelectedLead(null);
            setAiResult(null);
          }}
        >
          <section
            className="modal lead-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div className="detail-person">
                <span className={`lead-avatar large ${selectedLead.color}`}>
                  {selectedLead.initials}
                </span>
                <div>
                  <span className="section-kicker">LEAD DETAILS</span>
                  <h2 id="lead-detail-title">{selectedLead.name}</h2>
                  <p>{selectedLead.email}</p>
                </div>
              </div>
              <button
                className="icon-button"
                onClick={() => {
                  setSelectedLead(null);
                  setAiResult(null);
                }}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>
            <div className="detail-stats">
              <div>
                <span>Score</span>
                <strong>{selectedLead.score}/100</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selectedLead.status}</strong>
              </div>
              <div>
                <span>Priority</span>
                <strong>{selectedLead.priority}</strong>
              </div>
            </div>
            <div className="detail-company">
              <span>Company / location</span>
              <strong>{selectedLead.company || "Not specified"}</strong>
            </div>
            {selectedLead.budget != null && (
              <div className="detail-company">
                <span>Budget</span>
                <strong>
                  {Number(selectedLead.budget).toLocaleString()}{" "}
                  {selectedLead.budget_currency || ""}
                </strong>
              </div>
            )}
            {selectedLead.notes && (
              <div className="detail-company">
                <span>Notes</span>
                <strong>{selectedLead.notes}</strong>
              </div>
            )}
            <label className="detail-field">
              Update status
              <select
                value={backendStatus(selectedLead.status)}
                onChange={(e) => changeStatus(selectedLead, e.target.value)}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <form className="lead-form followup-form" onSubmit={saveFollowUp}>
              <span className="section-kicker">FOLLOW-UP</span>
              <label>
                Follow-up date and time
                <input
                  type="datetime-local"
                  value={followUpAt}
                  onChange={(e) => setFollowUpAt(e.target.value)}
                />
              </label>
              <label>
                Follow-up note
                <textarea
                  rows="2"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="What should happen next?"
                />
              </label>
              <button className="secondary-button" type="submit">
                Save follow-up
              </button>
            </form>
            <FollowUpHistory leadId={selectedLead.id} />
            <div className="detail-ai-note">
              <Bot size={19} />
              <div>
                <strong>AI actions</strong>
                <p>Generate a draft or insights from this lead's details.</p>
              </div>
            </div>
            <div className="ai-action-row">
              <button
                className="primary-button"
                disabled={aiBusy}
                onClick={() => runAI("follow-up")}
              >
                {aiBusy ? (
                  "Generating…"
                ) : (
                  <>
                    <Sparkles size={16} /> Draft follow-up
                  </>
                )}
              </button>
              <button
                className="secondary-button"
                disabled={aiBusy}
                onClick={() => runAI("insights")}
              >
                {aiBusy ? "Working…" : "Get insights"}
              </button>
            </div>
            {aiResult && (
              
              <AIResult result={aiResult} />     
            )}
            <button className="delete-button" onClick={() => removeLead(selectedLead)}>
              Delete lead
            </button>
          </section>
        </div>
      )}
    </>
  );
}
