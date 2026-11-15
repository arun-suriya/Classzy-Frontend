import type { ReportFormat } from "../../services/api";

/** Parses the CSV the server stores for a report. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

function tableHtml(rows: string[][]): string {
  const [head, ...body] = rows;
  if (!head) return "<p>No data.</p>";
  return `<table border="1" cellspacing="0" cellpadding="5"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads a report. PDF opens the print dialog (choose "Save as PDF"); Excel is an .xls file Excel can open. */
export function downloadReport(name: string, csv: string, format: ReportFormat) {
  const file = name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "report";
  const stamp = new Date().toLocaleDateString("sv-SE");
  if (format === "CSV") { save(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), `${file}_${stamp}.csv`); return; }
  const rows = parseCsv(csv);
  if (format === "EXCEL") {
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${tableHtml(rows)}</body></html>`;
    save(new Blob(["﻿" + html], { type: "application/vnd.ms-excel" }), `${file}_${stamp}.xls`);
    return;
  }
  const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title><style>body{font-family:Arial,sans-serif;color:#17245e;margin:24px;font-size:11px}h1{font-size:18px;margin:0 0 4px}
.muted{color:#5a6b94;margin-bottom:12px}table{border-collapse:collapse;width:100%}th{background:#eef4fd;text-align:left}td,th{border:1px solid #cfdcf3;padding:5px 7px}</style></head>
<body><h1>${esc(name)}</h1><div class="muted">Centram Classzy · generated ${esc(new Date().toLocaleString("en-IN"))}</div>${tableHtml(rows)}</body></html>`;
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const w = frame.contentWindow;
  if (!w) { frame.remove(); return; }
  w.document.open(); w.document.write(doc); w.document.close();
  setTimeout(() => { w.focus(); w.print(); setTimeout(() => frame.remove(), 2000); }, 300);
}
