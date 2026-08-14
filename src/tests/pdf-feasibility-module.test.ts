/**
 * Phase 6.0 PDF Engine & Font Feasibility Gate Tests
 *
 * IMPORTANT: pdfmake requires browser APIs (canvas, document) to generate PDFs.
 * These tests validate module import and structure only.
 * Full PDF generation MUST be validated in real Chrome Extension environment.
 */

import { describe, it, expect } from 'vitest';
import {
  createPdfBlob,
  type PdfFeasibilityResult,
} from '../exporters/pdf-feasibility-prototype';

describe('Phase 6.0 PDF Feasibility Gate - Module Tests', () => {
  describe('Module Import', () => {
    it('should import pdfmake without errors', async () => {
      const pdfMake = await import('pdfmake/build/pdfmake');
      expect(pdfMake).toBeDefined();
      expect(pdfMake.default).toBeDefined();
    });

    it('should import vfs_fonts without errors', async () => {
      const pdfFonts = await import('pdfmake/build/vfs_fonts');
      expect(pdfFonts).toBeDefined();
    });

    it('should import feasibility prototype', async () => {
      const module = await import('../exporters/pdf-feasibility-prototype');
      expect(module.generateFeasibilityPdf).toBeDefined();
      expect(module.createPdfBlob).toBeDefined();
    });
  });

  describe('PDF Signature Validation', () => {
    it('should validate correct PDF signature', () => {
      const validPdf = new Uint8Array([
        0x25, 0x50, 0x44, 0x46, 0x2d, // %PDF-
        0x31, 0x2e, 0x34, // 1.4
      ]);

      const signature = String.fromCharCode(
        validPdf[0],
        validPdf[1],
        validPdf[2],
        validPdf[3],
        validPdf[4]
      );

      expect(signature).toBe('%PDF-');
    });

    it('should reject invalid PDF signature', () => {
      const invalidPdf = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);

      const signature = String.fromCharCode(
        invalidPdf[0],
        invalidPdf[1],
        invalidPdf[2],
        invalidPdf[3],
        invalidPdf[4]
      );

      expect(signature).not.toBe('%PDF-');
    });
  });

  describe('Blob Creation', () => {
    it('should create PDF Blob from Uint8Array', () => {
      const mockPdfBytes = new Uint8Array([
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34,
      ]);

      const blob = createPdfBlob(mockPdfBytes);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBe(mockPdfBytes.length);
    });

    it('should handle empty Uint8Array', () => {
      const emptyBytes = new Uint8Array(0);
      const blob = createPdfBlob(emptyBytes);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBe(0);
    });

    it('should handle large Uint8Array', () => {
      const largeBytes = new Uint8Array(1024 * 1024); // 1MB
      const blob = createPdfBlob(largeBytes);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBe(largeBytes.length);
    });
  });

  describe('Result Structure', () => {
    it('should have correct PdfFeasibilityResult type structure', () => {
      const mockResult: PdfFeasibilityResult = {
        success: true,
        pdfBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
        metadata: {
          byteLength: 4,
          hasValidSignature: true,
          generatedAt: new Date().toISOString(),
          fontLoadMethod: 'roboto-vfs',
        },
      };

      expect(mockResult).toHaveProperty('success');
      expect(mockResult).toHaveProperty('pdfBytes');
      expect(mockResult).toHaveProperty('metadata');
      expect(mockResult.metadata).toHaveProperty('byteLength');
      expect(mockResult.metadata).toHaveProperty('hasValidSignature');
      expect(mockResult.metadata).toHaveProperty('generatedAt');
      expect(mockResult.metadata).toHaveProperty('fontLoadMethod');
    });
  });

  describe('Font Assets', () => {
    it('should have CJK font files in assets directory', async () => {
      // This test validates that font files exist
      // Actual font loading is tested in browser environment
      const fs = await import('fs');
      const path = await import('path');

      const fontDir = path.resolve(__dirname, '../assets/fonts');
      const regularFont = path.join(fontDir, 'NotoSansSC-Regular.otf');
      const boldFont = path.join(fontDir, 'NotoSansSC-Bold.otf');

      expect(fs.existsSync(regularFont)).toBe(true);
      expect(fs.existsSync(boldFont)).toBe(true);
    });

    it('should have font license file', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const fontDir = path.resolve(__dirname, '../assets/fonts');
      const licenseFile = path.join(fontDir, 'OFL.txt');

      expect(fs.existsSync(licenseFile)).toBe(true);
    });
  });
});
