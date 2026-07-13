import { InterviewPrepPdfQuestionDTO } from '@app/contracts/dtos/resume';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Technical: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  Behavioral: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
  Situational: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  'Culture Fit': { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
};
const DEFAULT_COLOR = { bg: '#f9fafb', text: '#374151', border: '#e5e7eb' };

function categoryChip(category: string): string {
  const c = CATEGORY_COLORS[category] ?? DEFAULT_COLOR;
  return `<span class="chip" style="background:${c.bg};color:${c.text};border:1px solid ${c.border};">${esc(category)}</span>`;
}

function questionBlock(q: InterviewPrepPdfQuestionDTO, index: number): string {
  return `
  <div class="q-block">
    <div class="q-header">
      <span class="q-num">${index + 1}</span>
      ${categoryChip(q.category)}
    </div>
    <p class="q-en">${esc(q.question)}</p>
    ${q.questionKm ? `<p class="q-km">${esc(q.questionKm)}</p>` : ''}
    <div class="tip-box">
      <div class="tip-label">💡 Answer Tip / គន្លឹះចម្លើយ</div>
      <p class="tip-en">${esc(q.tip)}</p>
      ${q.tipKm ? `<p class="tip-km">${esc(q.tipKm)}</p>` : ''}
    </div>
  </div>`;
}

export function buildInterviewPrepHtml(
  interviewTitle: string,
  companyName: string,
  companyIndustry: string | undefined,
  questions: InterviewPrepPdfQuestionDTO[],
): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const questionsHtml = questions.map((q, i) => questionBlock(q, i)).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Interview Prep — ${esc(companyName)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 0; }
    body {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.6;
      color: #111827;
      background: #fff;
    }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #fff;
      padding: 2cm 2.4cm 1.4cm;
    }
    .header-label {
      font-size: 8pt;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.65);
      margin-bottom: 8px;
    }
    .header-title {
      font-size: 20pt;
      font-weight: 800;
      letter-spacing: -0.4px;
      line-height: 1.1;
    }
    .header-meta {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.2);
      font-size: 9pt;
      color: rgba(255,255,255,0.7);
    }
    .header-company { font-weight: 600; color: #fff; }

    /* ── Body ── */
    .body { padding: 1.4cm 2.4cm 2cm; }

    /* ── Question block ── */
    .q-block {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 14px;
      break-inside: avoid;
    }
    .q-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .q-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #f3f4f6;
      font-size: 8.5pt;
      font-weight: 700;
      color: #6b7280;
      flex-shrink: 0;
    }
    .chip {
      font-size: 8pt;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .q-en {
      font-size: 10.5pt;
      font-weight: 600;
      color: #111827;
      margin-bottom: 3px;
    }
    .q-km {
      font-size: 9.5pt;
      color: #6b7280;
      margin-bottom: 10px;
    }

    /* ── Tip box ── */
    .tip-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 7px;
      padding: 10px 12px;
      margin-top: 8px;
    }
    .tip-label {
      font-size: 8pt;
      font-weight: 700;
      color: #b45309;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 5px;
    }
    .tip-en {
      font-size: 9.5pt;
      color: #374151;
      margin-bottom: 3px;
    }
    .tip-km {
      font-size: 9pt;
      color: #6b7280;
    }

    /* ── Footer ── */
    .footer {
      text-align: center;
      font-size: 8pt;
      color: #9ca3af;
      padding: 0 2.4cm 1cm;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-label">AI Interview Prep · Apsara Talent</div>
    <div class="header-title">${esc(interviewTitle)}</div>
    <div class="header-meta">
      <span class="header-company">${esc(companyName)}${companyIndustry ? ` · ${esc(companyIndustry)}` : ''}</span>
      <span>${date}</span>
    </div>
  </div>

  <div class="body">
    ${questionsHtml}
  </div>

  <div class="footer">
    Generated by Apsara Talent AI · For personal interview preparation only
  </div>
</body>
</html>`;
}
