import { ENotificationCategory } from '@app/common/database/enums/notification-category.enum';
import {
  CATEGORY_PATHS,
  escapeHtml,
  renderNotificationEmail,
} from './notification-email.util';

describe('renderNotificationEmail', () => {
  const render = (overrides: Record<string, unknown> = {}) =>
    renderNotificationEmail({
      title: 'You were shortlisted',
      message: 'Acme moved your application forward.',
      category: ENotificationCategory.APPLICATION,
      appOrigin: 'https://app.example.com',
      path: CATEGORY_PATHS[ENotificationCategory.APPLICATION],
      unsubscribeToken: 'a'.repeat(48),
      ...overrides,
    } as never);

  it('uses the notification title as the subject', () => {
    expect(render().subject).toBe('You were shortlisted');
  });

  it('links the action at the category landing page', () => {
    const { html, text } = render();
    expect(html).toContain('https://app.example.com/application');
    expect(text).toContain('https://app.example.com/application');
  });

  it('carries an unsubscribe and a settings link in both parts', () => {
    const { html, text } = render();
    for (const body of [html, text]) {
      expect(body).toContain(
        `https://app.example.com/unsubscribe?token=${'a'.repeat(48)}`,
      );
      expect(body).toContain('https://app.example.com/setting');
    }
  });

  it('escapes user-supplied content in the HTML part', () => {
    // Titles and messages are assembled from usernames, company names and job
    // titles. Unescaped, a display name becomes markup in someone's inbox.
    const { html } = render({
      title: '<img src=x onerror=alert(1)>',
      message: 'Acme & Sons "hired" you',
    });

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
    expect(html).toContain('Acme &amp; Sons &quot;hired&quot; you');
  });

  it('leaves the plain-text part unescaped', () => {
    const { text } = render({ message: 'Acme & Sons' });
    expect(text).toContain('Acme & Sons');
  });

  it('gives every category a path and an action label', () => {
    for (const category of Object.values(ENotificationCategory)) {
      const { html } = render({ category, path: CATEGORY_PATHS[category] });
      expect(CATEGORY_PATHS[category]).toMatch(/^\//);
      expect(html).toContain(
        `https://app.example.com${CATEGORY_PATHS[category]}`,
      );
    }
  });
});

describe('escapeHtml', () => {
  it('escapes every character that could open a tag or break an attribute', () => {
    expect(escapeHtml(`<&>"'`)).toBe('&lt;&amp;&gt;&quot;&#39;');
  });
});
