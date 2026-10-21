import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Bot,
  BrainCircuit,
  ChevronDown,
  CircleHelp,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react";
import "./App.css";
import { initials, normalizeLead, backendStatus, backendPriority } from "./utils/lead";
import AuthScreen from "./components/AuthScreen";
import FollowUpsPage from "./pages/FollowUpsPage";
import AIResult from "./components/AIResult";
import AddLeadModal from "./components/AddLeadModal";
import LeadDetailsModal from "./components/LeadDetailsModal";
import {
  clearToken,
  createLead,
  deleteLead,
  generateAIFollowUp,
  generateAIInsights,
  getCurrentUser,
  getLeads,
  getToken,
  updateFollowUp,
  updateLead,
} from "./api";


const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Leads", icon: Users },
  { label: "Follow-ups", icon: Clock3 },
  { label: "AI Assistant", icon: BrainCircuit },
];
function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(Boolean(getToken()));
  const [activeNav, setActiveNav] = useState("Overview");
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [authAction, setAuthAction] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [newLead, setNewLead] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    timeline: "",
    notes: "",
    budget: "",
    budget_currency: "PKR",
  });
  const [followUpAt, setFollowUpAt] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");

  const loadLeads = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const result = await getLeads({ limit: 100, q: search.trim() || undefined });
      setLeads(result.map(normalizeLead));
    } catch (err) {
      setError(err.message || "Could not load leads.");
    } finally {
      setBusy(false);
    }
  }, [search]);

  useEffect(() => {
    if (!getToken()) {
      setAuthChecking(false);
      return;
    }
    getCurrentUser()
      .then((currentUser) => setUser(currentUser))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setAuthChecking(false));
  }, []);
  useEffect(() => {
    if (user) loadLeads();
  }, [user, loadLeads]);

  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) =>
        `${lead.name} ${lead.email} ${lead.company}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [leads, search],
  );
  const hotCount = leads.filter((lead) => backendPriority(lead.priority) === "hot").length;
  const avgScore = leads.length
    ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length)
    : 0;
  const followUpCount = leads.filter(
    (lead) => lead.follow_up_status === "pending" && lead.follow_up_at,
  ).length;

  function showFeature(label) {
    setActiveNav(label);
    setMobileMenu(false);
    setNotice("");
    setError("");
  }
  function signOut() {
    clearToken();
    setUser(null);
    setLeads([]);
    setSelectedLead(null);
    setNotice("You have signed out.");
  }
  async function addLead(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      ...newLead,
      full_name: newLead.full_name.trim(),
      email: newLead.email.trim(),
      budget: newLead.budget === "" ? null : newLead.budget,
      budget_currency: newLead.budget === "" ? null : newLead.budget_currency,
    };
    try {
      await createLead(payload);
      setNewLead({
        full_name: "",
        email: "",
        phone: "",
        location: "",
        timeline: "",
        notes: "",
        budget: "",
        budget_currency: "PKR",
      });
      setShowAdd(false);
      setNotice("Lead created successfully.");
      await loadLeads();
    } catch (err) {
      setError(err.message || "Could not create lead.");
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(lead, status) {
    try {
      const updated = await updateLead(lead.id, { status: backendStatus(status) });
      setLeads((old) => old.map((item) => (item.id === lead.id ? normalizeLead(updated) : item)));
      setSelectedLead(normalizeLead(updated));
      setNotice("Lead status updated.");
    } catch (err) {
      setError(err.message);
    }
  }
  async function saveFollowUp(event) {
    event.preventDefault();
    if (!selectedLead) return;
    try {
      const updated = await updateFollowUp(selectedLead.id, {
        follow_up_at: followUpAt ? new Date(followUpAt).toISOString() : null,
        follow_up_status: "pending",
        follow_up_note: followUpNote || null,
      });
      const normalized = normalizeLead(updated);
      setLeads((old) => old.map((item) => (item.id === updated.id ? normalized : item)));
      setSelectedLead(normalized);
      setNotice("Follow-up saved.");
    } catch (err) {
      setError(err.message);
    }
  }
  async function runAI(kind, lead = selectedLead) {
    if (!lead) {
      setNotice("Open a lead first to run an AI action.");
      return;
    }
    setAiBusy(true);
    setAiResult(null);
    setError("");
    try {
      const result =
        kind === "follow-up"
          ? await generateAIFollowUp(lead.id)
          : await generateAIInsights(lead.id);
      setAiResult({ kind, ...result });
    } catch (err) {
      setError(err.message || "AI request failed.");
    } finally {
      setAiBusy(false);
    }
  }
  async function removeLead(lead) {
    if (!window.confirm(`Delete lead ${lead.name}? This cannot be undone.`)) return;
    try {
      await deleteLead(lead.id);
      setLeads((old) => old.filter((item) => item.id !== lead.id));
      setSelectedLead(null);
      setNotice("Lead deleted.");
    } catch (err) {
      setError(err.message);
    }
  }

  if (authChecking)
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <p>Checking your session…</p>
        </section>
      </main>
    );
  if (!user)
    return (
      <AuthScreen
        onAuthenticated={(authenticatedUser) => {
          setUser(authenticatedUser);
          setNotice("Signed in successfully.");
        }}
      />
    );

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            showFeature("Overview");
          }}
        >
          <span className="brand-mark">
            <BrainCircuit size={23} />
          </span>
          <span>
            <strong>LeadFlow</strong>
            <small>AI WORKSPACE</small>
          </span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              onClick={() => showFeature(label)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === "AI Assistant" && <span className="nav-new">AI</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <span className="upgrade-icon">
              <Sparkles size={18} />
            </span>
            <strong>Work smarter with AI</strong>
            <p>Turn lead data into your next best action.</p>
            <button onClick={() => showFeature("AI Assistant")}>
              Explore AI <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setNotice(`Signed in as ${user.email}`)}>
            <Settings size={18} />
            <span>Account settings</span>
          </button>
          <button
            className="nav-item"
            onClick={() => setNotice("Choose a lead and use its AI actions for help.")}
          >
            <CircleHelp size={18} />
            <span>Help & support</span>
          </button>
          <div className="profile">
            <div className="profile-avatar">{initials(user.email)}</div>
            <div className="profile-info">
              <strong>{user.email}</strong>
              <span>CRM Workspace</span>
            </div>
            <button className="icon-button" aria-label="Sign out" onClick={signOut}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button mobile-menu-button"
            aria-label="Open navigation"
            onClick={() => setMobileMenu(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{activeNav}</strong>
          </div>
          <div className="topbar-actions">
            <span className="environment-tag">
              <span /> LIVE DATA
            </span>
            <button
              className="icon-button notification-button"
              aria-label="Refresh leads"
              onClick={loadLeads}
            >
              <Bell size={19} />
            </button>
            <div className="top-avatar">{initials(user.email)}</div>
          </div>
        </header>
        <div className="page-content">
          {(notice || error) && (
            <div className={`notice ${error ? "notice-error" : ""}`} role="status">
              <span>{error || notice}</span>
              <button
                aria-label="Dismiss message"
                onClick={() => {
                  setNotice("");
                  setError("");
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" /> YOUR SALES COMMAND CENTER
              </div>
              <h1>
                {activeNav === "Overview"
                  ? "Good to see you."
                  : activeNav === "Leads"
                    ? "Your leads."
                    : "Meet your AI assistant."}
              </h1>
              <p className="page-subtitle">
                {activeNav === "AI Assistant"
                  ? "Turn lead information into thoughtful next steps."
                  : "A clearer view of your pipeline. A smarter way to follow up."}
              </p>
            </div>
            <button className="primary-button" onClick={() => setShowAdd(true)}>
              <Plus size={18} /> Add lead
            </button>
          </section>
          {activeNav === "Follow-ups" ? (
            <FollowUpsPage
              onChanged={loadLeads}
              onOpenLead={(leadId) => {
                const lead = leads.find((item) => item.id === leadId);
                if (lead) {
                  setSelectedLead(lead);
                  setAiResult(null);
                  setFollowUpAt(lead.follow_up_at ? new Date(lead.follow_up_at).toISOString().slice(0, 16) : "");
                  setFollowUpNote(lead.follow_up_note || "");
                }
              }}
            />
          ) : activeNav === "AI Assistant" ? (
            <section className="ai-welcome panel">
              <div className="ai-orb">
                <BrainCircuit size={34} />
              </div>
              <span className="section-kicker">AI-POWERED WORKFLOW</span>
              <h2>Your next best action starts here.</h2>
              <p>
                Choose a lead to generate a personalized follow-up draft or lead insights using your
                configured AI provider.
              </p>
              <button className="primary-button" onClick={() => showFeature("Leads")}>
                Explore leads <ArrowUpRight size={17} />
              </button>
              <div className="ai-feature-grid">
                <div>
                  <Sparkles size={20} />
                  <strong>Follow-up drafts</strong>
                  <span>Personalized messages for review</span>
                </div>
                <div>
                  <Target size={20} />
                  <strong>Lead insights</strong>
                  <span>Practical next steps for sales</span>
                </div>
                <div>
                  <ShieldCheck size={20} />
                  <strong>Owner protected</strong>
                  <span>Backend enforces lead ownership</span>
                </div>
              </div>
              {aiResult && (
                
              <AIResult result={aiResult} variant="assistant" />

                
              )}
            </section>
          ) : (
            <>
              <section className="stats-grid">
                <article className="stat-card">
                  <div className="stat-top">
                    <span>Total leads</span>
                    <span className="stat-icon purple-icon">
                      <Users size={19} />
                    </span>
                  </div>
                  <div className="stat-value">{leads.length}</div>
                  <div className="stat-foot">
                    <span className="stat-neutral">Your records</span>
                    <span>In your workspace</span>
                  </div>
                </article>
                <article className="stat-card">
                  <div className="stat-top">
                    <span>Hot leads</span>
                    <span className="stat-icon orange-icon">
                      <Zap size={19} />
                    </span>
                  </div>
                  <div className="stat-value">{hotCount}</div>
                  <div className="stat-foot">
                    <span className="stat-neutral">High priority</span>
                    <span>Needs attention</span>
                  </div>
                </article>
                <article className="stat-card">
                  <div className="stat-top">
                    <span>Average lead score</span>
                    <span className="stat-icon green-icon">
                      <Activity size={19} />
                    </span>
                  </div>
                  <div className="stat-value">
                    {avgScore}
                    <span className="value-suffix">/100</span>
                  </div>
                  <div className="stat-foot">
                    <span className="stat-neutral">Scoring overview</span>
                    <span>Live data</span>
                  </div>
                </article>
                <article className="stat-card">
                  <div className="stat-top">
                    <span>Follow-up queue</span>
                    <span className="stat-icon blue-icon">
                      <Clock3 size={19} />
                    </span>
                  </div>
                  <div className="stat-value">{followUpCount}</div>
                  <div className="stat-foot">
                    <span className="stat-neutral">Pending follow-ups</span>
                    <span>Needs review</span>
                  </div>
                </article>
              </section>
              <section className="content-grid">
                <article className="panel leads-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>{activeNav === "Leads" ? "All leads" : "Recent leads"}</h2>
                      <p>Keep track of your potential customers.</p>
                    </div>
                    <button className="text-button" onClick={() => showFeature("Leads")}>
                      View all <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <div className="table-toolbar">
                    <div className="search-box">
                      <Search size={17} />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search leads..."
                      />
                      {search && (
                        <button
                          className="search-clear"
                          aria-label="Clear search"
                          onClick={() => setSearch("")}
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                    <span className="results-count">{filteredLeads.length} records</span>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>LEAD</th>
                          <th>STATUS</th>
                          <th>PRIORITY</th>
                          <th>SCORE</th>
                          <th aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeads.map((lead) => (
                          <tr key={lead.id}>
                            <td>
                              <button
                                className="lead-identity"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setAiResult(null);
                                  setFollowUpAt(
                                    lead.follow_up_at
                                      ? new Date(lead.follow_up_at).toISOString().slice(0, 16)
                                      : "",
                                  );
                                  setFollowUpNote(lead.follow_up_note || "");
                                }}
                              >
                                <span className={`lead-avatar ${lead.color}`}>{lead.initials}</span>
                                <span className="lead-name-wrap">
                                  <strong>{lead.name}</strong>
                                  <small>{lead.email}</small>
                                </span>
                              </button>
                            </td>
                            <td>
                              <span
                                className={`status-pill status-${lead.status.toLowerCase().replace(/-/g, "")}`}
                              >
                                {lead.status}
                              </span>
                            </td>
                            <td>
                              <span className={`priority priority-${lead.priority.toLowerCase()}`}>
                                <span /> {lead.priority}
                              </span>
                            </td>
                            <td>
                              <div className="score-cell">
                                <div className="score-track">
                                  <span
                                    style={{ width: `${Math.max(0, Math.min(100, lead.score))}%` }}
                                  />
                                </div>
                                <strong>{lead.score}</strong>
                              </div>
                            </td>
                            <td>
                              <button
                                className="icon-button row-action"
                                aria-label={`View ${lead.name}`}
                                onClick={() => setSelectedLead(lead)}
                              >
                                <ChevronDown size={17} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {!filteredLeads.length && (
                          <tr>
                            <td colSpan="5" className="empty-state">
                              {busy
                                ? "Loading leads…"
                                : "No leads found. Add a lead to get started."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="table-footer">
                    <span>
                      Showing {filteredLeads.length} of {leads.length} leads
                    </span>
                    <button onClick={() => setSearch("")}>Clear filters</button>
                  </div>
                </article>
                <aside className="right-column">
                  <article className="panel pipeline-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Lead priorities</h2>
                        <p>Where to focus your energy.</p>
                      </div>
                    </div>
                    {["Hot", "Warm", "Cold"].map((priority) => {
                      const count = leads.filter((lead) => lead.priority === priority).length;
                      const percent = leads.length ? (count / leads.length) * 100 : 0;
                      return (
                        <div className="pipeline-row" key={priority}>
                          <div className="pipeline-label">
                            <span className={`priority priority-${priority.toLowerCase()}`}>
                              <span /> {priority}
                            </span>
                            <strong>{count}</strong>
                          </div>
                          <div className="pipeline-track">
                            <span
                              className={`pipeline-fill fill-${priority.toLowerCase()}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pipeline-note">
                      <Activity size={16} />
                      <span>Priorities based on your lead records.</span>
                    </div>
                  </article>
                  <article className="ai-promo">
                    <div className="ai-promo-top">
                      <span className="promo-icon">
                        <Sparkles size={20} />
                      </span>
                      <span className="promo-label">MEET YOUR AI</span>
                    </div>
                    <h3>
                      Less guesswork.
                      <br />
                      Better follow-ups.
                    </h3>
                    <p>Turn customer details into a useful next step.</p>
                    <button onClick={() => showFeature("AI Assistant")}>
                      Open AI assistant <ArrowUpRight size={16} />
                    </button>
                    <div className="promo-decoration">
                      <BrainCircuit size={94} />
                    </div>
                  </article>
                  <article className="activity-card">
                    <div className="activity-icon">
                      <Clock3 size={17} />
                    </div>
                    <div>
                      <strong>Stay in the loop</strong>
                      <p>Review lead details and plan your next follow-up.</p>
                    </div>
                    <ArrowDownRight size={17} />
                  </article>
                </aside>
              </section>
            </>
          )}
          <footer className="page-footer">
            <span>
              LeadFlow <span className="footer-dot">•</span> AI Lead Recovery
            </span>
            <span>
              <ShieldCheck size={14} /> Your workspace, your pipeline.
            </span>
          </footer>
        </div>
      </main>
      <AddLeadModal
        showAdd={showAdd}
        setShowAdd={setShowAdd}
        newLead={newLead}
        setNewLead={setNewLead}
        addLead={addLead}
        busy={busy}
      />
      <LeadDetailsModal
        selectedLead={selectedLead}
        setSelectedLead={setSelectedLead}
        setAiResult={setAiResult}
        followUpAt={followUpAt}
        setFollowUpAt={setFollowUpAt}
        followUpNote={followUpNote}
        setFollowUpNote={setFollowUpNote}
        changeStatus={changeStatus}
        saveFollowUp={saveFollowUp}
        aiBusy={aiBusy}
        runAI={runAI}
        aiResult={aiResult}
        removeLead={removeLead}
      />
    </div>
  );
}
export default App;