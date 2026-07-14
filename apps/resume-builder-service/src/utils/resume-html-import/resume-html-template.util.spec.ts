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
