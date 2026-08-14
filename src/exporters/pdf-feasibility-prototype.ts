/**
 * Phase 6.0 PDF Engine & Font Feasibility Gate
 *
 * Minimal prototype to validate:
 * - pdfmake works in MV3 Chrome Extension
 * - No CSP violations
 * - Local CJK font registration (browser environment)
 * - Chinese/English/Unicode text output
 * - Searchable/selectable text
 * - Uint8Array generation
 * - Valid PDF Blob
 * - Zero network requests
 */

import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';

// Configure default fonts for testing
// pdfFonts exports the vfs object directly
pdfMake.vfs = pdfFonts as any;

// CJK font URLs (for browser environment only)
let notoSansRegular: string | undefined;
let notoSansBold: string | undefined;

// Dynamic import for browser environment
if (typeof window !== 'undefined') {
  try {
    // These imports will be resolved by Vite in browser environment
    notoSansRegular = new URL(
      '../assets/fonts/NotoSansSC-Regular.otf',
      import.meta.url
    ).href;
    notoSansBold = new URL(
      '../assets/fonts/NotoSansSC-Bold.otf',
      import.meta.url
    ).href;
  } catch (e) {
    console.warn('CJK fonts not available in this environment');
  }
}

export interface PdfFeasibilityResult {
  success: boolean;
  pdfBytes: Uint8Array | null;
  error?: string;
  metadata: {
    byteLength: number;
    hasValidSignature: boolean;
    generatedAt: string;
    fontLoadMethod: string;
  };
}

/**
 * Configure pdfmake with local CJK fonts (browser only)
 */
async function configureCJKFonts(): Promise<boolean> {
  if (!notoSansRegular || !notoSansBold) {
    return false;
  }

  try {
    // Fetch font files and convert to base64
    const [regularResponse, boldResponse] = await Promise.all([
      fetch(notoSansRegular),
      fetch(notoSansBold),
    ]);

    const [regularBlob, boldBlob] = await Promise.all([
      regularResponse.blob(),
      boldResponse.blob(),
    ]);

    // Convert to base64
    const regularBase64 = await blobToBase64(regularBlob);
    const boldBase64 = await blobToBase64(boldBlob);

    // Configure pdfmake fonts
    const fonts: TFontDictionary = {
      NotoSansSC: {
        normal: regularBase64,
        bold: boldBase64,
        italics: regularBase64,
        bolditalics: boldBase64,
      },
    };

    pdfMake.fonts = fonts;
    return true;
  } catch (error) {
    console.error('Failed to load CJK fonts:', error);
    return false;
  }
}

/**
 * Convert Blob to base64 data URL
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Minimal PDF generation for feasibility testing.
 * Does NOT implement full PDF exporter architecture.
 */
export async function generateFeasibilityPdf(): Promise<PdfFeasibilityResult> {
  try {
    // Try to configure CJK fonts (browser only)
    const cjkLoaded = await configureCJKFonts();
    const fontMethod = cjkLoaded ? 'local-cjk-bundled' : 'roboto-vfs';

    // Define minimal document for testing
    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: 'ExportAI PDF Feasibility Test', style: 'header' },
        { text: '\n' },
        { text: 'English:', style: 'subheader' },
        { text: 'Export AI conversations safely.' },
        { text: '\n' },
        { text: '中文：', style: 'subheader' },
        { text: '这是 ExportAI PDF 中文字体可行性测试。' },
        { text: '\n' },
        { text: '常见中文：', style: 'subheader' },
        { text: '你好，世界。' },
        { text: '导出人工智能对话内容。' },
        { text: '\n' },
        { text: '更多字符：', style: 'subheader' },
        { text: '龘 麤 齉 翾 𠀀' },
        { text: '\n' },
        { text: 'Mixed:', style: 'subheader' },
        { text: 'ExportAI 支持中文 English 123。' },
        { text: '\n' },
        { text: 'Unicode:', style: 'subheader' },
        { text: '© ™ → ← ✓' },
        { text: '\n' },
        { text: 'Emoji:', style: 'subheader' },
        { text: '🚀 😀' },
        { text: '\n' },
        { text: 'Bold Test:', style: 'subheader' },
        { text: 'This is bold text in English', bold: true },
        { text: '\n' },
        { text: '这是粗体中文文本', bold: true },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
        },
        subheader: {
          fontSize: 14,
          bold: true,
          margin: [0, 10, 0, 5] as [number, number, number, number],
        },
      },
      defaultStyle: cjkLoaded
        ? {
            font: 'NotoSansSC',
          }
        : undefined,
    };

    // Generate PDF and return as Promise<Uint8Array>
    const pdfBytes = await new Promise<Uint8Array>((resolve, reject) => {
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);

      // Use getBase64 instead of getBuffer for better cross-environment compatibility
      try {
        pdfDocGenerator.getBase64((base64String: string) => {
          try {
            // Convert base64 to Uint8Array
            const binaryString = atob(base64String);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            resolve(bytes);
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });

    // Validate PDF signature
    const hasValidSignature = validatePdfSignature(pdfBytes);

    return {
      success: true,
      pdfBytes,
      metadata: {
        byteLength: pdfBytes.length,
        hasValidSignature,
        generatedAt: new Date().toISOString(),
        fontLoadMethod: fontMethod,
      },
    };
  } catch (error) {
    return {
      success: false,
      pdfBytes: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        byteLength: 0,
        hasValidSignature: false,
        generatedAt: new Date().toISOString(),
        fontLoadMethod: 'failed',
      },
    };
  }
}

/**
 * Validate PDF signature (%PDF-)
 */
function validatePdfSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;

  const signature = String.fromCharCode(
    bytes[0],
    bytes[1],
    bytes[2],
    bytes[3],
    bytes[4]
  );

  return signature === '%PDF-';
}

/**
 * Create downloadable Blob for testing
 */
export function createPdfBlob(pdfBytes: Uint8Array): Blob {
  // Create new Uint8Array copy to ensure proper type
  const copy = new Uint8Array(pdfBytes);
  return new Blob([copy], { type: 'application/pdf' });
}
