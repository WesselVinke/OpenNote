"use client";

interface JsonViewerProps {
  data: unknown;
  filepath: string;
}

interface Lead {
  name?: string;
  email?: string;
  company?: string;
  score?: number;
  stage?: string;
  priority?: string;
  nextAction?: string;
  nextActionDate?: string;
  source?: string;
}

function PipelineTable({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No leads in pipeline yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Name</th>
            <th className="pb-2 pr-4 font-medium">Company</th>
            <th className="pb-2 pr-4 font-medium">Stage</th>
            <th className="pb-2 pr-4 font-medium">Score</th>
            <th className="pb-2 pr-4 font-medium">Priority</th>
            <th className="pb-2 pr-4 font-medium">Next Action</th>
            <th className="pb-2 pr-4 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2 pr-4 font-medium">{lead.name || "—"}</td>
              <td className="py-2 pr-4">{lead.company || "—"}</td>
              <td className="py-2 pr-4">
                <StageBadge stage={lead.stage} />
              </td>
              <td className="py-2 pr-4">{lead.score ?? "—"}</td>
              <td className="py-2 pr-4">
                <PriorityBadge priority={lead.priority} />
              </td>
              <td className="py-2 pr-4 text-muted-foreground">
                {lead.nextAction || "—"}
              </td>
              <td className="py-2 pr-4 text-muted-foreground">
                {lead.source || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StageBadge({ stage }: { stage?: string }) {
  if (!stage) return <span className="text-muted-foreground">—</span>;

  const colors: Record<string, string> = {
    new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    engaged: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    qualified: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    closed: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[stage] || "bg-muted text-muted-foreground"}`}
    >
      {stage}
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return <span className="text-muted-foreground">—</span>;

  const colors: Record<string, string> = {
    critical: "text-red-600 dark:text-red-400",
    high: "text-orange-600 dark:text-orange-400",
    medium: "text-yellow-600 dark:text-yellow-400",
    low: "text-muted-foreground",
  };

  return (
    <span className={`text-xs font-medium ${colors[priority] || ""}`}>
      {priority}
    </span>
  );
}

function GenericJsonView({ data }: { data: unknown }) {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <p className="text-muted-foreground text-sm">Empty array</p>;
    }
    // If array of objects, render as table
    if (typeof data[0] === "object" && data[0] !== null) {
      const keys = Object.keys(data[0]);
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                {keys.map((key) => (
                  <th key={key} className="pb-2 pr-4 font-medium">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row: any, i: number) => (
                <tr key={i} className="border-b border-border/50">
                  {keys.map((key) => (
                    <td key={key} className="py-2 pr-4">
                      {typeof row[key] === "object"
                        ? JSON.stringify(row[key])
                        : String(row[key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }

  // Fallback: formatted JSON
  return (
    <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export function JsonViewer({ data, filepath }: JsonViewerProps) {
  // Special handling for pipeline.json
  if (filepath.endsWith("pipeline.json")) {
    const pipelineData = data as { leads?: Lead[] };
    const leads = pipelineData?.leads || (Array.isArray(data) ? data : []);
    return <PipelineTable leads={leads} />;
  }

  return <GenericJsonView data={data} />;
}
