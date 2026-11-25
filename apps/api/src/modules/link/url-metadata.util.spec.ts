import { BadRequestException } from '@nestjs/common';
import {
  assertSafePublicUrl,
  isBlockedIpAddress,
  parseHtmlMetadata,
} from './url-metadata.util';

describe('url-metadata.util (SSRF & OpenGraph extraction)', () => {
  describe('isBlockedIpAddress', () => {
    it('blocks loopback, RFC1918 private, and cloud metadata IPs', () => {
      expect(isBlockedIpAddress('127.0.0.1')).toBe(true);
      expect(isBlockedIpAddress('10.0.0.5')).toBe(true);
      expect(isBlockedIpAddress('172.16.0.1')).toBe(true);
      expect(isBlockedIpAddress('192.168.1.1')).toBe(true);
      expect(isBlockedIpAddress('169.254.169.254')).toBe(true);
      expect(isBlockedIpAddress('0.0.0.0')).toBe(true);
      expect(isBlockedIpAddress('::1')).toBe(true);
      expect(isBlockedIpAddress('fe80::1')).toBe(true);
      expect(isBlockedIpAddress('::ffff:127.0.0.1')).toBe(true);
    });

    it('allows legitimate public IPv4 and IPv6 addresses', () => {
      expect(isBlockedIpAddress('8.8.8.8')).toBe(false);
      expect(isBlockedIpAddress('1.1.1.1')).toBe(false);
      expect(isBlockedIpAddress('2606:4700:4700::1111')).toBe(false);
    });
  });

  describe('assertSafePublicUrl', () => {
    it('rejects localhost and metadata endpoints', async () => {
      await expect(assertSafePublicUrl('http://localhost:3001/api')).rejects.toThrow(
        BadRequestException,
      );
      await expect(assertSafePublicUrl('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(
        BadRequestException,
      );
      await expect(assertSafePublicUrl('http://127.0.0.1:5432')).rejects.toThrow(
        BadRequestException,
      );
      await expect(assertSafePublicUrl('http://10.0.0.1/admin')).rejects.toThrow(
        BadRequestException,
      );
      await expect(assertSafePublicUrl('file:///etc/passwd')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('parseHtmlMetadata', () => {
    it('extracts OpenGraph title, description, and resolves relative og:image URLs', () => {
      const html = `
        <html>
          <head>
            <title>Fallback Title</title>
            <meta property="og:title" content="OneLink &amp; Engineering Architecture" />
            <meta name="description" content="Distributed creator platform." />
            <meta property="og:image" content="/assets/preview.png" />
          </head>
        </html>
      `;

      const parsed = parseHtmlMetadata(html, 'https://example.com/posts/arch');
      expect(parsed.title).toBe('OneLink & Engineering Architecture');
      expect(parsed.description).toBe('Distributed creator platform.');
      expect(parsed.imageUrl).toBe('https://example.com/assets/preview.png');
    });

    it('falls back to standard <title> when og:title is absent', () => {
      const html = '<html><head><title>Minimal Page Title</title></head></html>';
      const parsed = parseHtmlMetadata(html, 'https://example.org');
      expect(parsed.title).toBe('Minimal Page Title');
      expect(parsed.imageUrl).toBeNull();
    });
  });
});
