/**
 * Phase 6.0 PDF Root-Cause Isolation
 *
 * Three isolated test modes:
 * - Mode A: Engine only (pdfmake built-in fonts)
 * - Mode B: One CJK font (Regular only)
 * - Mode C: Two CJK fonts (Regular + Bold)
 */

import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';

// Configure default Roboto fonts
pdfMake.vfs = pdfFonts as any;

export type TestMode = 'engine-only' | 'cjk-regular' | 'cjk-both';

export interface PdfTestResult {
  success: boolean;
  pdfBytes: Uint8Array | null;
  error?: string;
  stage?: string;
  metadata: {
    byteLength: number;
    hasValidSignature: boolean;
    generatedAt: string;
    fontLoadMethod: string;
    mode: TestMode;
    elapsedMs: number;
  };
}

interface ProgressCallback {
  (stage: string): void;
}

/**
 * Mode A: Engine Only - No CJK fonts
 */
async function testEngineOnly(onProgress: ProgressCallback): Promise<PdfTestResult> {
  const startTime = Date.now();

  try {
    onProgress('Creating document (engine only)');

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: 'ExportAI PDF Engine Test', style: 'header' },
        { text: '\n' },
        { text: 'This tests pdfmake engine with built-in Roboto font only.' },
        { text: '\n' },
        { text: 'English text: Export AI conversations safely.' },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
        },
      },
    };

    onProgress('Generating PDF bytes');

    const pdfBytes = await generatePdfBytes(docDefinition);

    onProgress('PDF generated successfully');

    const elapsedMs = Date.now() - startTime;

    return {
      success: true,
      pdfBytes,
      metadata: {
        byteLength: pdfBytes.length,
        hasValidSignature: validatePdfSignature(pdfBytes),
        generatedAt: new Date().toISOString(),
        fontLoadMethod: 'roboto-vfs',
        mode: 'engine-only',
        elapsedMs,
      },
    };
  } catch (error) {
    return {
      success: false,
      pdfBytes: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      stage: 'engine-only',
      metadata: {
        byteLength: 0,
        hasValidSignature: false,
        generatedAt: new Date().toISOString(),
        fontLoadMethod: 'failed',
        mode: 'engine-only',
        elapsedMs: Date.now() - startTime,
      },
    };
  }
}

/**
 * Mode B: One CJK Font (Regular only)
 */
async function testCjkRegular(onProgress: ProgressCallback): Promise<PdfTestResult> {
  const startTime = Date.now();

  try {
    onProgress('Loading CJK Regular font');

    const fontUrl = new URL('../assets/fonts/NotoSansSC-Regular.otf', import.meta.url).href;

    onProgress('Fetching font file');
    const response = await fetch(fontUrl);
    const blob = await response.blob();

    onProgress('Converting font to base64 (this may take time)');
    const base64 = await blobToBase64(blob);

    onProgress('Registering font with pdfmake');

    const fonts: TFontDictionary = {
      NotoSansSC: {
        normal: base64,
        bold: base64, // Use same for bold
        italics: base64,
        bolditalics: base64,
      },
    };

    pdfMake.fonts = fonts;

    onProgress('Creating document');

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: 'ExportAI CJK Font Test', style: 'header' },
        { text: '\n' },
        { text: '你好，世界。' },
        { text: '\n' },
        { text: 'ExportAI 中文测试' },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
        },
      },
      defaultStyle: {
        font: 'NotoSansSC',
      },
    };

    onProgress('Generating PDF bytes');

    const pdfBytes = await generatePdfBytes(docDefinition);

    onProgress('PDF generated successfully');

    const elapsedMs = Date.now() - startTime;

    return {
      success: true,
      pdfBytes,
      metadata: {
        byteLength: pdfBytes.length,
        hasValidSignature: validatePdfSignature(pdfBytes),
        generatedAt: new Date().toISOString(),
        fontLoadMethod: 'cjk-regular-only',
        mode: 'cjk-regular',
        elapsedMs,
      },
    };
  } catch (error) {
    return {
      success: false,
      pdfBytes: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      stage: 'cjk-regular',
      metadata: {
        byteLength: 0,
        hasValidSignature: false,
        generatedAt: new Date().toISOString(),
        fontLoadMethod: 'failed',
        mode: 'cjk-regular',
        elapsedMs: Date.now() - startTime,
      },
    };
  }
}

/**
 * Mode C: Two CJK Fonts (Regular + Bold)
 */
async function testCjkBoth(onProgress: ProgressCallback): Promise<PdfTestResult> {
  const startTime = Date.now();

  try {
    onProgress('Loading CJK Regular and Bold fonts');

    const regularUrl = new URL('../assets/fonts/NotoSansSC-Regular.otf', import.meta.url).href;
    const boldUrl = new URL('../assets/fonts/NotoSansSC-Bold.otf', import.meta.url).href;

    onProgress('Fetching both font files');
    const [regularResponse, boldResponse] = await Promise.all([
      fetch(regularUrl),
      fetch(boldUrl),
    ]);

    const [regularBlob, boldBlob] = await Promise.all([
      regularResponse.blob(),
      boldResponse.blob(),
    ]);

    onProgress('Converting Regular to base64 (this may take time)');
    const regularBase64 = await blobToBase64(regularBlob);

    onProgress('Converting Bold to base64 (this may take time)');
    const boldBase64 = await blobToBase64(boldBlob);

    onProgress('Registering fonts with pdfmake');

    const fonts: TFontDictionary = {
      NotoSansSC: {
        normal: regularBase64,
        bold: boldBase64,
        italics: regularBase64,
        bolditalics: boldBase64,
      },
    };

    pdfMake.fonts = fonts;

    onProgress('Creating document');

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: 'ExportAI CJK Font Test', style: 'header' },
        { text: '\n' },
        { text: '你好，世界。' },
        { text: '\n' },
        { text: 'ExportAI 中文测试', bold: true },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
        },
      },
      defaultStyle: {
        font: 'NotoSansSC',
      },
    };

    onProgress('Generating PDF bytes');

    const pdfBytes = await generatePdfBytes(docDefinition);

    onProgress('PDF generated successfully');

    const elapsedMs = Date.now() - startTime;

    return {
      success: true,
      pdfBytes,
      metadata: {
        byteLength: pdfBytes.length,
        hasValidSignature: validatePdfSignature(pdfBytes),
        generatedAt: new Date().toISOString(),
        fontLoadMethod: 'cjk-regular-bold',
        mode: 'cjk-both',
        elapsedMs,
      },
    };
  } catch (error) {
    return {
      success: false,
      pdfBytes: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      stage: 'cjk-both',
      metadata: {
        byteLength: 0,
        hasValidSignature: false,
        generatedAt: new Date().toISOString(),
        fontLoadMethod: 'failed',
        mode: 'cjk-both',
        elapsedMs: Date.now() - startTime,
      },
    };
  }
}

/**
 * Main test entry point
 */
export async function testPdfGeneration(
  mode: TestMode,
  onProgress: ProgressCallback
): Promise<PdfTestResult> {
  switch (mode) {
    case 'engine-only':
      return testEngineOnly(onProgress);
    case 'cjk-regular':
      return testCjkRegular(onProgress);
    case 'cjk-both':
      return testCjkBoth(onProgress);
    default:
      throw new Error(`Unknown test mode: ${mode}`);
  }
}

/**
 * Generate PDF bytes from document definition
 */
function generatePdfBytes(docDefinition: TDocumentDefinitions): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);

      pdfDocGenerator.getBase64((base64String: string) => {
        try {
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
}

/**
 * Convert Blob to base64 data URL
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Validate PDF signature
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
 * Create downloadable Blob
 */
export function createPdfBlob(pdfBytes: Uint8Array): Blob {
  const copy = new Uint8Array(pdfBytes);
  return new Blob([copy], { type: 'application/pdf' });
}
