import { describe, expect, it } from 'vitest';

import { normalizeLocale } from '@/locales/resources';

import { parseBrowserLanguage } from './locale';

describe('normalizeLocale', () => {
  it('should normalize simplified Chinese script locales to zh-CN', () => {
    expect(normalizeLocale('zh-Hans')).toBe('zh-CN');
    expect(normalizeLocale('zh-Hans-CN')).toBe('zh-CN');
  });

  it('should normalize traditional Chinese script locales to zh-TW', () => {
    expect(normalizeLocale('zh-Hant')).toBe('zh-TW');
    expect(normalizeLocale('zh-Hant-TW')).toBe('zh-TW');
  });
});

describe('parseBrowserLanguage', () => {
  // Helper function to create Headers with accept-language
  const createHeaders = (acceptLanguage?: string) => {
    const headers = new Headers();
    if (acceptLanguage) {
      headers.set('accept-language', acceptLanguage);
    }
    return headers;
  };

  // UGS-MODIFY: DEFAULT_LANG is zh-CN; pass 'en-US' explicitly to test parsing logic
  describe('when defaultLang is en-US (explicit)', () => {
    it('should return en-US for empty accept-language header', () => {
      const headers = createHeaders();
      expect(parseBrowserLanguage(headers, 'en-US')).toBe('en-US');
    });

    it('should return en-US for English language preference', () => {
      const headers = createHeaders('en-US,en;q=0.9');
      expect(parseBrowserLanguage(headers, 'en-US')).toBe('en-US');
    });

    it('should handle Arabic language special case', () => {
      const headers = createHeaders('ar-SA,ar;q=0.9');
      expect(parseBrowserLanguage(headers, 'en-US')).toBe('ar');
    });

    it('should convert ar-EG to ar', () => {
      const headers = createHeaders('ar-EG,ar;q=0.9');
      expect(parseBrowserLanguage(headers, 'en-US')).toBe('ar');
    });

    it('should handle multiple language preferences', () => {
      const headers = createHeaders('zh-CN,zh;q=0.9,en;q=0.8');
      expect(parseBrowserLanguage(headers, 'en-US')).toBe('zh-CN');
    });

    it('should normalize simplified Chinese script language preferences', () => {
      const headers = createHeaders('zh-Hans-CN,zh-Hans;q=0.9,en;q=0.8');
      expect(parseBrowserLanguage(headers, 'en-US')).toBe('zh-CN');
    });

    it('should normalize traditional Chinese script language preferences', () => {
      const headers = createHeaders('zh-Hant-TW,zh-Hant;q=0.9,en;q=0.8');
      expect(parseBrowserLanguage(headers, 'en-US')).toBe('zh-TW');
    });
  });

  describe('when DEFAULT_LANG is not en-US', () => {
    it('should return the non-en-US DEFAULT_LANG regardless of accept-language', () => {
      const headers = createHeaders('en-US,en;q=0.9');
      expect(parseBrowserLanguage(headers, 'zh-CN')).toBe('zh-CN');
    });
  });

  describe('error handling', () => {
    // UGS-MODIFY: DEFAULT_LANG is zh-CN, so fallback is zh-CN
    it('should handle invalid accept-language header format', () => {
      const headers = createHeaders('invalid-format');
      expect(parseBrowserLanguage(headers)).toBe('zh-CN');
    });

    it('should handle empty Headers object', () => {
      const headers = new Headers();
      expect(parseBrowserLanguage(headers)).toBe('zh-CN');
    });
  });
});
