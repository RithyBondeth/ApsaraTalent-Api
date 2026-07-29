export interface ICoverLetterTemplateData {
  employeeName: string;
  employeeJob?: string;
  companyName: string;
  companyIndustry?: string;
  date: string;
  paragraphsHtml: string;
}

/** Escape HTML special chars to prevent XSS in the rendered PDF */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIC  — Georgia serif, traditional business letter layout
// ─────────────────────────────────────────────────────────────────────────────
function classicTemplate(d: ICoverLetterTemplateData): string {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Cover Letter</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      @page { size: A4; margin: 2.8cm 3cm 2.5cm 3cm; }
      body {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 11pt;
        line-height: 1.72;
        color: #1a1a1a;
      }
      .sender-name { font-size: 20pt; font-weight: bold; letter-spacing: -0.3px; }
      .sender-title { font-size: 10.5pt; color: #555; margin-top: 4px; }
      .divider { display: block; width: 100%; height: 1.5px; background: #4f46e5; border: none; margin: 14px 0 12px; }
      .meta { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
      .company-name { font-size: 10.5pt; font-weight: 600; }
      .company-industry { font-size: 9.5pt; color: #777; margin-top: 2px; }
      .letter-date { font-size: 10pt; color: #777; white-space: nowrap; }
      .body p { margin-bottom: 12px; text-align: justify; hyphens: auto; }
      .body p:last-child { margin-bottom: 0; }
    </style>
  </head>
  <body>
    <div class="sender-name">${esc(d.employeeName)}</div>
    ${d.employeeJob ? `<div class="sender-title">${esc(d.employeeJob)}</div>` : ''}
    <hr class="divider" />
    <div class="meta">
      <div>
        <div class="company-name">${esc(d.companyName)}</div>
        ${d.companyIndustry ? `<div class="company-industry">${esc(d.companyIndustry)}</div>` : ''}
      </div>
      <div class="letter-date">${d.date}</div>
    </div>
    <div class="body">
      ${d.paragraphsHtml}
    </div>
  </body>
  </html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODERN  — Dark header block, contemporary sans-serif
// ─────────────────────────────────────────────────────────────────────────────
function modernTemplate(d: ICoverLetterTemplateData): string {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Cover Letter</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      @page { size: A4; margin: 0; }
      body {
        font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
        font-size: 10.5pt;
        line-height: 1.72;
        color: #1a1a1a;
      }
      .header {
        background: #1e1b4b;
        color: #ffffff;
        padding: 2.2cm 3cm 1.6cm;
      }
      .sender-name { font-size: 22pt; font-weight: 700; letter-spacing: -0.4px; line-height: 1.1; }
      .sender-title { font-size: 10.5pt; color: rgba(255,255,255,0.65); margin-top: 5px; }
      .header-meta {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid rgba(255,255,255,0.18);
        font-size: 9.5pt;
        color: rgba(255,255,255,0.6);
      }
      .content { padding: 1.8cm 3cm 2.5cm; }
      .body p { margin-bottom: 12px; text-align: justify; hyphens: auto; }
      .body p:last-child { margin-bottom: 0; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="sender-name">${esc(d.employeeName)}</div>
      ${d.employeeJob ? `<div class="sender-title">${esc(d.employeeJob)}</div>` : ''}
      <div class="header-meta">
        <span>${esc(d.companyName)}${d.companyIndustry ? ` · ${esc(d.companyIndustry)}` : ''}</span>
        <span>${d.date}</span>
      </div>
    </div>
    <div class="content">
      <div class="body">
        ${d.paragraphsHtml}
      </div>
    </div>
  </body>
  </html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MINIMAL  — Ultra-clean, maximum whitespace, thin hairline separator
// ─────────────────────────────────────────────────────────────────────────────
function minimalTemplate(d: ICoverLetterTemplateData): string {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Cover Letter</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      @page { size: A4; margin: 3.2cm 3.5cm 3cm 3.5cm; }
      body {
        font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.82;
        color: #1a1a1a;
      }
      .sender-name { font-size: 17pt; font-weight: 500; letter-spacing: -0.2px; }
      .sender-title { font-size: 10pt; color: #9ca3af; margin-top: 3px; }
      .thin-rule { display: block; height: 1px; background: #e5e7eb; border: none; margin: 18px 0 14px; }
      .meta { display: flex; justify-content: space-between; font-size: 9.5pt; color: #9ca3af; margin-bottom: 32px; }
      .body p { margin-bottom: 15px; }
      .body p:last-child { margin-bottom: 0; }
    </style>
  </head>
  <body>
    <div class="sender-name">${esc(d.employeeName)}</div>
    ${d.employeeJob ? `<div class="sender-title">${esc(d.employeeJob)}</div>` : ''}
    <hr class="thin-rule" />
    <div class="meta">
      <span>${esc(d.companyName)}${d.companyIndustry ? ` / ${esc(d.companyIndustry)}` : ''}</span>
      <span>${d.date}</span>
    </div>
    <div class="body">
      ${d.paragraphsHtml}
    </div>
  </body>
  </html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BOLD  — Left accent bar, oversized name, strong sans-serif typography
// ─────────────────────────────────────────────────────────────────────────────
function boldTemplate(d: ICoverLetterTemplateData): string {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Cover Letter</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      @page { size: A4; margin: 0; }
      body {
        font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
        font-size: 10.5pt;
        line-height: 1.72;
        color: #1a1a1a;
      }
      .page { display: flex; min-height: 297mm; }
      .accent-bar { width: 8px; background: #4f46e5; flex-shrink: 0; }
      .main { flex: 1; padding: 2.5cm 3cm 2.5cm 2.5cm; }
      .sender-name { font-size: 26pt; font-weight: 800; letter-spacing: -0.8px; line-height: 1.05; color: #111; }
      .sender-title { font-size: 11pt; color: #4f46e5; font-weight: 600; margin-top: 6px; }
      .meta-bar {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin: 20px 0 28px;
        padding-top: 16px;
        border-top: 2px solid #f3f4f6;
        font-size: 10pt;
      }
      .company-name { font-weight: 600; color: #111; }
      .company-industry { font-size: 9.5pt; color: #9ca3af; margin-top: 2px; }
      .letter-date { color: #6b7280; }
      .body p { margin-bottom: 12px; text-align: justify; hyphens: auto; }
      .body p:last-child { margin-bottom: 0; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="accent-bar"></div>
      <div class="main">
        <div class="sender-name">${esc(d.employeeName)}</div>
        ${d.employeeJob ? `<div class="sender-title">${esc(d.employeeJob)}</div>` : ''}
        <div class="meta-bar">
          <div>
            <div class="company-name">${esc(d.companyName)}</div>
            ${d.companyIndustry ? `<div class="company-industry">${esc(d.companyIndustry)}</div>` : ''}
          </div>
          <div class="letter-date">${d.date}</div>
        </div>
        <div class="body">
          ${d.paragraphsHtml}
        </div>
      </div>
    </div>
  </body>
  </html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public dispatcher
// ─────────────────────────────────────────────────────────────────────────────
export function buildCoverLetterHtml(
  style: string | undefined,
  data: ICoverLetterTemplateData,
): string {
  switch (style) {
    case 'modern':
      return modernTemplate(data);
    case 'minimal':
      return minimalTemplate(data);
    case 'bold':
      return boldTemplate(data);
    case 'classic':
    default:
      return classicTemplate(data);
  }
}
