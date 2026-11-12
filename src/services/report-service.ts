import "server-only";

import PDFDocument from "pdfkit";

import { labelAction, labelClassification, labelStatus } from "@/lib/labels";
import type { Detection, MitigationPolicy, SecurityOverview, TarpitEntry } from "@/types/security";

export interface ReportInput {
  generatedAt: Date;
  overview: SecurityOverview;
  policy: MitigationPolicy | null;
  detections: Detection[];
  tarpit: TarpitEntry[];
  periodLabel: string;
}

const PAGE_MARGIN = 40;
const COLORS = {
  navy: "#1F3A5F",
  muted: "#6B7F96",
  border: "#DCE6F0",
  header: "#F4F8FC",
};

/** Rupiah-free, locale-stable numeric formatting for the report body. */
function num(value: number): string {
  return value.toLocaleString("id-ID");
}

function timestamp(date: Date): string {
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function heading(doc: PDFKit.PDFDocument, text: string) {
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.navy).text(text);
  doc
    .moveDown(0.25)
    .strokeColor(COLORS.border)
    .lineWidth(0.7)
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .stroke();
  doc.moveDown(0.4);
}

function keyValues(doc: PDFKit.PDFDocument, rows: Array<[string, string]>) {
  const labelWidth = 150;
  doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted);
  for (const [label, value] of rows) {
    const y = doc.y;
    doc.text(label, PAGE_MARGIN, y, { width: labelWidth, continued: false });
    doc.fillColor(COLORS.navy).text(value, PAGE_MARGIN + labelWidth, y, {
      width: doc.page.width - PAGE_MARGIN * 2 - labelWidth,
    });
    doc.fillColor(COLORS.muted);
    doc.moveDown(0.15);
  }
}

interface Column {
  title: string;
  width: number;
  align?: "left" | "right";
}

/** Draw a simple table. Rows beyond the page are continued on a new page. */
function table(doc: PDFKit.PDFDocument, columns: Column[], rows: string[][]) {
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const scale = (doc.page.width - PAGE_MARGIN * 2) / tableWidth;
  const widths = columns.map((column) => column.width * scale);

  const drawHeader = () => {
    const y = doc.y;
    doc.rect(PAGE_MARGIN, y, doc.page.width - PAGE_MARGIN * 2, 16).fill(COLORS.header);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(COLORS.navy);
    let x = PAGE_MARGIN + 4;
    columns.forEach((column, index) => {
      doc.text(column.title, x, y + 5, { width: widths[index]! - 8, align: column.align ?? "left" });
      x += widths[index]!;
    });
    doc.y = y + 18;
    doc.fillColor(COLORS.navy).font("Helvetica").fontSize(7.5);
  };

  drawHeader();

  for (const row of rows) {
    const rowHeight = 14;
    if (doc.y + rowHeight > doc.page.height - PAGE_MARGIN - 30) {
      doc.addPage();
      drawHeader();
    }
    const y = doc.y;
    let x = PAGE_MARGIN + 4;
    row.forEach((cell, index) => {
      doc.fillColor(COLORS.navy).text(truncate(cell, 46), x, y + 3.5, {
        width: widths[index]! - 8,
        align: columns[index]!.align ?? "left",
        lineBreak: false,
      });
      x += widths[index]!;
    });
    doc
      .strokeColor(COLORS.border)
      .lineWidth(0.4)
      .moveTo(PAGE_MARGIN, y + rowHeight)
      .lineTo(doc.page.width - PAGE_MARGIN, y + rowHeight)
      .stroke();
    doc.y = y + rowHeight;
  }

  if (rows.length === 0) {
    doc.font("Helvetica-Oblique").fillColor(COLORS.muted).text("Tidak ada data pada periode ini.");
  }
}

/**
 * Build the incident report as a real PDF (no browser, no print dialog).
 * Collects the document chunks in memory so the route can return a Buffer.
 */
export function buildIncidentReportPdf(input: ReportInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, info: { Title: "Laporan Insiden ReconShield" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { overview, policy, detections, tarpit, periodLabel, generatedAt } = input;
    const reconnaissance = detections.filter((row) => row.classification === "Reconnaissance").length;

    // --- Letterhead -------------------------------------------------------
    doc.font("Helvetica-Bold").fontSize(16).fillColor(COLORS.navy).text("ReconShield");
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted)
      .text("Penerapan Algoritme Random Forest dan Dynamic Tarpit dalam Mitigasi Serangan Reconnaissance");
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(COLORS.navy).text("Laporan Insiden Keamanan Jaringan");
    doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted)
      .text(`Periode: ${periodLabel} · Dibuat: ${timestamp(generatedAt)}`);
    doc.moveDown(0.5);
    doc.strokeColor(COLORS.border).lineWidth(1).moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y).stroke();

    // --- Ringkasan --------------------------------------------------------
    heading(doc, "1. Ringkasan");
    keyValues(doc, [
      ["Total deteksi", num(overview.totals.detections)],
      ["Reconnaissance", `${num(overview.totals.reconnaissance)} (${overview.totals.detections > 0 ? ((overview.totals.reconnaissance / overview.totals.detections) * 100).toFixed(2) : "0.00"}%)`],
      ["IP tarpit aktif", num(overview.totals.tarpitActive)],
      ["Sumber data", overview.totals.scoped ? "sampel (database tidak tersedia)" : "database"],
      ["Deteksi pada periode", num(detections.length)],
      ["Reconnaissance pada periode", num(reconnaissance)],
    ]);

    // --- Kebijakan --------------------------------------------------------
    heading(doc, "2. Kebijakan Mitigasi yang Berlaku");
    if (policy) {
      keyValues(doc, [
        ["Mode", policy.mode === "Automatic" ? "Otomatis" : "Manual"],
        ["Ambang keyakinan", `${policy.confidenceThreshold}%`],
        ["Durasi tarpit", `${policy.durationMinutes} menit`],
        ["Durasi maksimum", `${policy.maxDurationMinutes} menit`],
        ["Maksimum entry aktif", num(policy.maxActiveEntries)],
        ["Address-list", policy.addressList],
      ]);
    } else {
      doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.muted).text("Kebijakan tidak tersedia.");
    }

    // --- Insiden ----------------------------------------------------------
    heading(doc, "3. Daftar Insiden");
    table(
      doc,
      [
        { title: "ID", width: 58 },
        { title: "Waktu", width: 82 },
        { title: "IP Sumber", width: 88 },
        { title: "Tujuan", width: 96 },
        { title: "Klasifikasi", width: 74 },
        { title: "Keyakinan", width: 52, align: "right" },
        { title: "Tindakan", width: 56 },
        { title: "Status", width: 52 },
      ],
      detections.map((row) => [
        row.id,
        new Date(row.timestamp).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short", hour12: false }),
        row.sourceIp,
        `${row.destinationIp}:${row.destinationPort}`,
        labelClassification(row.classification),
        `${row.confidence.toFixed(1)}%`,
        labelAction(row.action),
        labelStatus(row.status),
      ]),
    );

    // --- Tarpit -----------------------------------------------------------
    heading(doc, "4. Entri Dynamic Tarpit");
    table(
      doc,
      [
        { title: "IP", width: 100 },
        { title: "Terdeteksi", width: 90 },
        { title: "Durasi", width: 60 },
        { title: "Kedaluwarsa", width: 90 },
        { title: "Status", width: 70 },
        { title: "Address-List", width: 120 },
      ],
      tarpit.map((row) => [
        row.ip,
        new Date(row.detectedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short", hour12: false }),
        row.duration,
        row.expiresAt ? new Date(row.expiresAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short", hour12: false }) : "—",
        labelStatus(row.status),
        row.addressList,
      ]),
    );

    // --- Penutup ----------------------------------------------------------
    heading(doc, "5. Catatan");
    doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text(
      "Laporan ini dihasilkan otomatis dari database ReconShield. Angka ringkasan berasal dari agregat database; " +
        "daftar insiden dan tarpit dibatasi pada data yang dimuat saat laporan dibuat. Laporan tidak memuat klaim " +
        "tindakan router di luar status yang tercatat di database.",
      { align: "left" },
    );

    doc.end();
  });
}
