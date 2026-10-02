/**
 * Export and Print Utilities for Target Enterprise Platform
 */

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const escapeCell = (cell: string | number | null | undefined): string => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');

  // Add UTF-8 BOM for Excel compatibility
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\.csv$/, '')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printPdfReport(title: string, subtitle: string, htmlTableContent: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the PDF report');
    return;
  }

  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} — Target Enterprise Report</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      padding: 0;
      margin: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand {
      font-size: 20px;
      font-weight: 800;
      color: #0369a1;
      letter-spacing: -0.5px;
    }
    .report-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 4px;
    }
    .subtitle {
      font-size: 13px;
      color: #64748b;
    }
    .meta {
      text-align: right;
      font-size: 12px;
      color: #64748b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 12px;
    }
    th {
      background-color: #f1f5f9;
      color: #334155;
      text-align: left;
      padding: 8px 10px;
      font-weight: 600;
      border-bottom: 1px solid #cbd5e1;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .footer {
      margin-top: 30px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">TARGET ENTERPRISE</div>
      <div class="report-title">${title}</div>
      <div class="subtitle">${subtitle}</div>
    </div>
    <div class="meta">
      <div><strong>Generated:</strong> ${dateStr}</div>
      <div><strong>Status:</strong> Official Project Record</div>
    </div>
  </div>

  ${htmlTableContent}

  <div class="footer">
    <div>Target Enterprise Platform · Construction Engineering & ERP</div>
    <div>Confidential Document</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();
}
