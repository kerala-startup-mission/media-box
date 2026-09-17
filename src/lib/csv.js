const COLUMNS = [
  ["ID", (task) => task.id],
  ["Title", (task) => task.title],
  ["Category", (task) => task.category],
  ["Priority", (task) => task.priority],
  ["Status", (task) => task.status],
  ["Date", (task) => task.createdAt],
  ["Assigned Team", (task) => task.team],
  ["Assignee", (task) => task.assignee]
];

function escapeCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function exportTasksCsv(tasks, filename = "media-box-workflow.csv") {
  const rows = [
    COLUMNS.map(([header]) => escapeCell(header)).join(","),
    ...tasks.map((task) => COLUMNS.map(([, read]) => escapeCell(read(task))).join(","))
  ];

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
