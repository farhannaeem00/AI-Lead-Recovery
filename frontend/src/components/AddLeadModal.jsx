import { Plus, X } from "lucide-react";

export default function AddLeadModal({ showAdd, setShowAdd, newLead, setNewLead, addLead, busy }) {
  return (
    <>
      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-lead-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="section-kicker">WORKSPACE</span>
                <h2 id="add-lead-title">Add a new lead</h2>
                <p>Lead data is saved to your account.</p>
              </div>
              <button className="icon-button" onClick={() => setShowAdd(false)} aria-label="Close">
                <X size={19} />
              </button>
            </div>
            <form className="lead-form" onSubmit={addLead}>
              <label>
                Full name
                <input
                  required
                  minLength={2}
                  maxLength={150}
                  value={newLead.full_name}
                  onChange={(e) => setNewLead({ ...newLead, full_name: e.target.value })}
                  placeholder="e.g. Alex Morgan"
                />
              </label>
              <label>
                Email address
                <input
                  required
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  placeholder="alex@example.com"
                />
              </label>
              <label>
                Phone (optional)
                <input
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </label>
              <label>
                Location / company
                <input
                  value={newLead.location}
                  onChange={(e) => setNewLead({ ...newLead, location: e.target.value })}
                  placeholder="Company or city"
                />
              </label>
              <label>
                Timeline
                <input
                  value={newLead.timeline}
                  onChange={(e) => setNewLead({ ...newLead, timeline: e.target.value })}
                  placeholder="e.g. This month"
                />
              </label>
              <label>
                Budget (optional)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newLead.budget}
                  onChange={(e) => setNewLead({ ...newLead, budget: e.target.value })}
                  placeholder="e.g. 100000"
                />
              </label>
              {newLead.budget !== "" && (
                <label>
                  Budget currency
                  <select
                    required
                    value={newLead.budget_currency}
                    onChange={(e) => setNewLead({ ...newLead, budget_currency: e.target.value })}
                  >
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                    <option value="AED">AED</option>
                  </select>
                </label>
              )}
              <label>
                Notes (optional)
                <textarea
                  rows="3"
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  placeholder="Customer needs, context, or next steps"
                />
              </label>
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={busy}>
                  <Plus size={17} /> {busy ? "Saving…" : "Save lead"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
