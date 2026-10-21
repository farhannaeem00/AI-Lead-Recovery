const COLORS = ["purple", "blue", "pink", "green"];
const STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
};
const PRIORITY_LABELS = { hot: "Hot", warm: "Warm", cold: "Cold" };

function initials(name = "?") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function displayDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function normalizeLead(lead, index = 0) {
  return {
    ...lead,
    name: lead.full_name,
    status: STATUS_LABELS[lead.status] || lead.status,
    priority: PRIORITY_LABELS[String(lead.priority || "cold").toLowerCase()] || lead.priority,
    score: Number(lead.score || 0),
    company: lead.location || "Not specified",
    initials: initials(lead.full_name),
    color: COLORS[index % COLORS.length],
  };
}
function backendStatus(status) {
  return String(status || "new").toLowerCase();
}
function backendPriority(priority) {
  return String(priority || "cold").toLowerCase();
}


export { COLORS, STATUS_LABELS, PRIORITY_LABELS, initials, displayDate, normalizeLead, backendStatus, backendPriority };
