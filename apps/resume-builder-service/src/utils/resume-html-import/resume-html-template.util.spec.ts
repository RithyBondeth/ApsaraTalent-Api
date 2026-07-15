import { BuildResumeDTO } from '@app/contracts/dtos/resume';
import { buildResumeHtml } from './resume-html-template.util';

function resume(overrides: Partial<BuildResumeDTO> = {}): BuildResumeDTO {
  return {
    personalInfo: {
      fullName: 'Sokha <script>alert(1)</script>',
      email: 'sokha@example.com',
      profilePicture: 'https://private.example/avatar.jpg',
    },
    summary: 'Builds reliable products',
    experience: [
      {
        company: 'Apsara & Co',
        position: 'Engineer',
        startDate: 'January 2024',
        endDate: 'Present',
        description: 'Owned <strong>delivery</strong>',
        achievements: ['Reduced latency by 30%'],
      },
    ],
    skills: ['TypeScript'],
    careerScopes: ['Backend Development'],
    template: 'modern',
    ...overrides,
  };
}

describe('buildResumeHtml', () => {
  it('escapes candidate text and never embeds a remote profile image', () => {
    const html = buildResumeHtml(resume());

    expect(html).toContain('Sokha &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Owned &lt;strong&gt;delivery&lt;/strong&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('https://private.example/avatar.jpg');
  });

  it('honors the selected section order and visibility', () => {
    const html = buildResumeHtml(
      resume({ sectionOrder: ['skills', 'careerScopes'] }),
    );

    expect(html.indexOf('<h2>Skills</h2>')).toBeLessThan(
      html.indexOf('<h2>Career Interests</h2>'),
    );
    expect(html).not.toContain('<h2>Work Experience</h2>');
    expect(html).not.toContain('<h2>Professional Summary</h2>');
  });

  it('allows a validated inline image without adding external resources', () => {
    const html = buildResumeHtml(
      resume({
        personalInfo: {
          fullName: 'Sokha Chan',
          email: 'sokha@example.com',
          profilePicture: 'data:image/png;base64,aGVsbG8=',
        },
      }),
    );

    expect(html).toContain('src="data:image/png;base64,aGVsbG8="');
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('renders a constrained AI design without trusting model-authored styles', () => {
    const html = buildResumeHtml(
      resume({
        design: {
          layout: 'right-sidebar',
          columnRatio: 'narrow',
          headerLayout: 'split',
          avatarPlacement: 'start',
          sidebarSections: ['skills', 'education'],
          palette: 'violet',
          typography: 'geometric',
          density: 'spacious',
          headerStyle: 'soft',
          sectionStyle: 'pill',
          cornerStyle: 'rounded',
          experienceStyle: 'timeline',
          skillsStyle: 'grid',
          educationStyle: 'cards',
          summaryStyle: 'highlight',
          decoration: 'geometric',
        },
      }),
    );

    expect(html).toContain(
      'class="resume layout-right-sidebar decoration-geometric"',
    );
    expect(html).toContain('data-design-layout="right-sidebar"');
    expect(html).toContain('header-split avatar-start');
    expect(html).toContain('<main class="primary">');
    expect(html).toContain('<aside class="secondary">');
    expect(html).toContain('experience-timeline');
    expect(html).toContain('skills-grid');
    expect(html).toContain('data-design-palette="violet"');
    expect(html).toContain('data-design-density="spacious"');
    expect(html).toContain('data-design-sections="pill"');
    expect(html).toContain("font-family: 'Trebuchet MS', Arial, sans-serif");
    expect(html).toContain('border-radius: 999px');
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain('<style><script>');
  });
});

describe('custom accent color', () => {
  const design: NonNullable<BuildResumeDTO['design']> = {
    layout: 'left-sidebar',
    columnRatio: 'balanced',
    headerLayout: 'split',
    avatarPlacement: 'start',
    sidebarSections: ['skills'],
    palette: 'cobalt',
    typography: 'sans',
    density: 'balanced',
    headerStyle: 'solid',
    sectionStyle: 'line',
    cornerStyle: 'soft',
    experienceStyle: 'plain',
    skillsStyle: 'chips',
    educationStyle: 'plain',
    summaryStyle: 'plain',
    decoration: 'none',
  };

  it('renders the user-picked accent and its derived family', () => {
    const html = buildResumeHtml(
      resume({ design: { ...design, customAccent: '#0ea5e9' } }),
    );

    // Accent itself plus a derived darker solid header (35% black shade)
    expect(html).toContain('#0EA5E9');
    expect(html).toContain('#096B97');
    // Palette's own accent family no longer leaks through
    expect(html).not.toContain('#2563EB');
  });

  it('falls back to the palette when the accent is not strict hex', () => {
    const html = buildResumeHtml(
      resume({
        design: {
          ...design,
          customAccent: 'red;}</style><script>alert(1)</script>' as never,
        },
      }),
    );

    expect(html).toContain('#2563EB');
    // The raw payload must never reach the stylesheet
    expect(html).not.toContain('red;}');
    expect(html).not.toContain('</style><script>');
  });
});

describe('multi-page pagination', () => {
  it('keeps entries and headings intact but lets sections flow across pages', () => {
    const html = buildResumeHtml(resume());

    // Individual entries never split across a page break...
    expect(html).toContain('.experience { margin-bottom');
    expect(html).toMatch(/\.experience \{[^}]*break-inside: avoid/);
    expect(html).toMatch(/\.education \{[^}]*break-inside: avoid/);
    // ...headings stay glued to the content that follows them...
    expect(html).toMatch(/h2 \{[^}]*break-after: avoid/);
    // ...but the section container itself is free to break when long.
    expect(html).not.toMatch(/[^-]section \{[^}]*break-inside: avoid/);
  });

  it('paints the sidebar as a body background band that survives page breaks', () => {
    const html = buildResumeHtml(
      resume({
        design: {
          layout: 'left-sidebar',
          columnRatio: 'balanced',
          headerLayout: 'split',
          avatarPlacement: 'start',
          sidebarSections: ['skills'],
          palette: 'cobalt',
          typography: 'sans',
          density: 'balanced',
          headerStyle: 'solid',
          sectionStyle: 'line',
          cornerStyle: 'soft',
          experienceStyle: 'plain',
          skillsStyle: 'chips',
          educationStyle: 'plain',
          summaryStyle: 'plain',
          decoration: 'none',
        },
      }),
    );

    // The colored band lives on the tall .resume-body (continues across pages),
    // not on the sidebar grid cell (which would be sliced at the boundary).
    expect(html).toMatch(
      /\.layout-left-sidebar \.resume-body \{[^}]*linear-gradient\(to right/,
    );
    expect(html).toMatch(/\.resume \{[^}]*flex-direction: column/);
    expect(html).toMatch(/\.resume-body \{[^}]*flex: 1 1 auto/);
  });
});
