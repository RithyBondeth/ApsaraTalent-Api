import { RESUME } from '@app/contracts/constants/domain/resume.constant';
import { ServiceUnavailableException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { PdfGeneratorService } from './pdf-generator.service';

jest.mock('puppeteer', () => ({ launch: jest.fn() }));

describe('PdfGeneratorService', () => {
  const request = {
    url: jest.fn(),
    continue: jest.fn(),
    abort: jest.fn(),
  };
  const page = {
    setJavaScriptEnabled: jest.fn(),
    setRequestInterception: jest.fn(),
    on: jest.fn(),
    setContent: jest.fn(),
    pdf: jest.fn(),
    close: jest.fn(),
  };
  const browser = {
    connected: true,
    newPage: jest.fn(),
    close: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    browser.newPage.mockResolvedValue(page);
    page.pdf.mockResolvedValue(Uint8Array.from([1, 2, 3]));
    page.close.mockResolvedValue(undefined);
    browser.close.mockResolvedValue(undefined);
    (puppeteer.launch as jest.Mock).mockResolvedValue(browser);
  });

  it('renders a PDF with scripts disabled and closes its page', async () => {
    const service = new PdfGeneratorService();
    const result = await service.generate('<html>Resume</html>');
    expect(result).toEqual(Buffer.from([1, 2, 3]));
    expect(page.setJavaScriptEnabled).toHaveBeenCalledWith(false);
    expect(page.setRequestInterception).toHaveBeenCalledWith(true);
    expect(page.setContent).toHaveBeenCalledWith(
      '<html>Resume</html>',
      expect.objectContaining({ waitUntil: 'load' }),
    );
    expect(page.close).toHaveBeenCalled();
  });

  it('blocks remote requests while allowing embedded data resources', async () => {
    const service = new PdfGeneratorService();
    await service.generate('<html />');
    const handler = page.on.mock.calls.find(
      ([event]) => event === 'request',
    )[1];

    request.url.mockReturnValueOnce('https://evil.example/image.png');
    handler(request);
    expect(request.abort).toHaveBeenCalledWith('blockedbyclient');

    request.url.mockReturnValueOnce('data:image/png;base64,abc');
    handler(request);
    expect(request.continue).toHaveBeenCalled();

    request.url.mockReturnValueOnce('about:blank');
    handler(request);
    expect(request.continue).toHaveBeenCalledTimes(2);
  });

  it('reuses one connected browser across multiple PDFs', async () => {
    const service = new PdfGeneratorService();
    await service.generate('one');
    await service.generate('two');
    expect(puppeteer.launch).toHaveBeenCalledTimes(1);
    expect(browser.newPage).toHaveBeenCalledTimes(2);
  });

  it('closes pages and releases capacity after rendering failures', async () => {
    const service = new PdfGeneratorService();
    page.pdf.mockRejectedValueOnce(new Error('renderer failed'));
    await expect(service.generate('bad')).rejects.toThrow('renderer failed');
    expect(page.close).toHaveBeenCalled();
    expect((service as any).active).toBe(0);
  });

  it('rejects immediately when both render capacity and queue are full', async () => {
    const service = new PdfGeneratorService();
    (service as any).active = RESUME.PDF_MAX_CONCURRENCY;
    for (let i = 0; i < RESUME.PDF_MAX_QUEUE; i += 1) {
      (service as any).waiters.push(jest.fn());
    }
    await expect(service.generate('queued')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(puppeteer.launch).not.toHaveBeenCalled();
  });

  it('closes the shared browser during application shutdown', async () => {
    const service = new PdfGeneratorService();
    await service.generate('resume');
    await service.onModuleDestroy();
    expect(browser.close).toHaveBeenCalled();
    expect((service as any).browser).toBeNull();
  });

  it('collapses concurrent browser launches into one shared promise', async () => {
    const service = new PdfGeneratorService();
    let resolveLaunch: (value: typeof browser) => void;
    (puppeteer.launch as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLaunch = resolve;
      }),
    );

    const first = (service as any).getBrowser();
    const second = (service as any).getBrowser();
    expect(puppeteer.launch).toHaveBeenCalledTimes(1);
    resolveLaunch!(browser);

    await expect(first).resolves.toBe(browser);
    await expect(second).resolves.toBe(browser);
  });

  it('clears a failed launch so a later request can retry', async () => {
    const service = new PdfGeneratorService();
    (puppeteer.launch as jest.Mock)
      .mockRejectedValueOnce(new Error('Chromium unavailable'))
      .mockResolvedValueOnce(browser);

    await expect(service.generate('first')).rejects.toThrow(
      'Chromium unavailable',
    );
    expect((service as any).active).toBe(0);
    await expect(service.generate('second')).resolves.toEqual(
      Buffer.from([1, 2, 3]),
    );
    expect(puppeteer.launch).toHaveBeenCalledTimes(2);
  });

  it('wakes exactly one queued renderer when capacity is released', async () => {
    const service = new PdfGeneratorService();
    (service as any).active = RESUME.PDF_MAX_CONCURRENCY;
    const queued = (service as any).acquire();
    expect((service as any).waiters).toHaveLength(1);

    (service as any).release();
    await queued;

    expect((service as any).active).toBe(RESUME.PDF_MAX_CONCURRENCY);
    expect((service as any).waiters).toHaveLength(0);
  });

  it('contains browser and page cleanup failures during shutdown', async () => {
    const service = new PdfGeneratorService();
    await service.generate('resume');
    browser.close.mockRejectedValueOnce(new Error('already closed'));
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();

    const next = new PdfGeneratorService();
    page.close.mockRejectedValueOnce(new Error('page crashed'));
    await expect(next.generate('resume')).resolves.toEqual(
      Buffer.from([1, 2, 3]),
    );
    expect((next as any).active).toBe(0);
  });
});
