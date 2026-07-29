import { buildCoverLetterHtml } from './cover-letter-templates.util';
import { buildInterviewPrepHtml } from './interview-prep-template.util';

describe('PDF HTML templates', () => {
  const coverData = {
    employeeName: '<Candidate & Co>',
    employeeJob: 'Developer "Lead"',
    companyName: '<Company>',
    companyIndustry: 'Tech & AI',
    date: 'July 23, 2026',
    paragraphsHtml: '<p>Trusted generated paragraph</p>',
  };

  it.each(['classic', 'modern', 'minimal', 'bold', undefined])(
    'renders the %s cover-letter layout with escaped identity fields',
    (style) => {
      const html = buildCoverLetterHtml(style, coverData);
      expect(html).toContain('&lt;Candidate &amp; Co&gt;');
      expect(html).toContain('Developer &quot;Lead&quot;');
      expect(html).toContain('&lt;Company&gt;');
      expect(html).toContain('<p>Trusted generated paragraph</p>');
      expect(html).not.toContain('<Candidate & Co>');
    },
  );

  it('omits optional cover-letter metadata cleanly', () => {
    const html = buildCoverLetterHtml('classic', {
      employeeName: 'A',
      companyName: 'B',
      date: 'Today',
      paragraphsHtml: '<p>Hello</p>',
    });
    expect(html).not.toContain('sender-title">');
    expect(html).not.toContain('company-industry">');
  });

  it('renders interview categories, bilingual content, and safe HTML', () => {
    const html = buildInterviewPrepHtml(
      '<Senior Developer>',
      'A & B',
      'Technology',
      [
        {
          category: 'Technical',
          question: 'Explain <script>',
          questionKm: 'សំណួរ',
          tip: 'Use "examples"',
          tipKm: 'គន្លឹះ',
        },
        {
          category: 'Custom <type>',
          question: 'Second',
          tip: 'Answer',
        },
      ] as any,
    );
    expect(html).toContain('&lt;Senior Developer&gt;');
    expect(html).toContain('A &amp; B');
    expect(html).toContain('Explain &lt;script&gt;');
    expect(html).toContain('Use &quot;examples&quot;');
    expect(html).toContain('Custom &lt;type&gt;');
    expect(html).toContain('សំណួរ');
    expect(html).toContain('class="q-num">1');
    expect(html).toContain('class="q-num">2');
  });
});
