import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { RESUME } from '@app/contracts/constants/domain/resume.constant';
import { IPdfGeneratorService } from '@app/contracts/interfaces/service';

@Injectable()
export class PdfGeneratorService implements IPdfGeneratorService {
  async generate(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: RESUME.GENERATION_TIMEOUT,
      });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
        displayHeaderFooter: false,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
