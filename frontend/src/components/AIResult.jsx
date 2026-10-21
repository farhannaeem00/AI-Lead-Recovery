import ReactMarkdown from "react-markdown";

function cleanAIText(text = "") {
  return String(text).replace(/\\\\([#*_\\-`~])/g, "$1").trim();
}

export default function AIResult({ result, variant = "detail" }) {
  if (!result) return null;
  const title = variant === "assistant"
    ? (result.kind === "follow-up" ? `Follow-up draft: ${result.lead_name}` : `Insights: ${result.lead_name}`)
    : (result.kind === "follow-up" ? "AI follow-up draft" : `AI insights · ${result.score}/100 · ${result.priority}`);

  return (
    <div className="ai-result">
      <strong>{title}</strong>
      <div className="ai-markdown">
        <ReactMarkdown>{cleanAIText(result.draft || result.insights || "")}</ReactMarkdown>
      </div>
    </div>
  );
}
