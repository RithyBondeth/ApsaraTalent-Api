import {
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { RESUME } from '@app/contracts/constants/domain/resume.constant';
import { IPdfGeneratorService } from '@app/contracts/interfaces/service';

@Injectable()
export class PdfGeneratorService
  implements IPdfGeneratorService, OnModuleDestroy
{
  private readonly logger = new Logger(PdfGeneratorService.name);

  // A single Chromium instance is shared across all requests. Launching a
  // browser per PDF cost ~1–3s and 100–300MB each, and a burst of downloads
  // could exhaust memory. We reuse one browser and only open/close lightweight
  // pages per request.
  private browser: puppeteer.Browser | null = null;
  private launching: Promise<puppeteer.Browser> | null = null;

  // Bound how many pages render at once so a traffic spike can't open hundreds
  // of tabs on the shared browser. Excess requests wait in `waiters`.
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => undefined);
      this.browser = null;
    }
  }

  /** Lazily launch (or relaunch if crashed) the shared browser. */
  private async getBrowser(): Promise<puppeteer.Browser> {
    if (this.browser?.connected) return this.browser;
    // Collapse concurrent launches into a single in-flight promise.
    if (!this.launching) {
      this.launching = puppeteer
        .launch({ headless: true, args: ['--disable-dev-shm-usage'] })
        .then((b) => {
          this.browser = b;
          this.launching = null;
          return b;
        })
        .catch((err) => {
          this.launching = null;
          throw err;
        });
    }
    return this.launching;
  }

  private async acquire(): Promise<void> {
    if (this.active < RESUME.PDF_MAX_CONCURRENCY) {
      this.active++;
      return;
    }
    if (this.waiters.length >= RESUME.PDF_MAX_QUEUE) {
      throw new ServiceUnavailableException(
        'Resume generation is busy. Please try again shortly.',
      );
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.active++;
  }

  private release(): void {
    this.active--;
    const next = this.waiters.shift();
    if (next) next();
  }

  async generate(html: string): Promise<Buffer> {
    await this.acquire();
    let page: puppeteer.Page | undefined;
    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = request.url();
        if (url === 'about:blank' || url.startsWith('data:')) {
          void request.continue();
          return;
        }
        void request.abort('blockedbyclient');
      });
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: RESUME.GENERATION_TIMEOUT,
      });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
        displayHeaderFooter: false,
      });

      return Buffer.from(pdf);
    } catch (error) {
      this.logger.error(`PDF generation failed: ${(error as Error).message}`);
      throw error;
    } finally {
      if (page) await page.close().catch(() => undefined);
      this.release();
    }
  }
}
