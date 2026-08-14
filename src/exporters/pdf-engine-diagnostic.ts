/**
 * Phase 6.0 Engine-Only Hang Diagnostic
 *
 * Comprehensive instrumentation to identify exact hang point in Mode A
 */

import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

// Configure default Roboto fonts
pdfMake.vfs = pdfFonts as any;

export interface DiagnosticResult {
  success: boolean;
  pdfBytes: Uint8Array | null;
  error?: string;
  completedStages: string[];
  failedStage?: string;
  elapsedMs: number;
  apiMethod?: string;
}

interface StageCallback {
  (stage: string, timestamp: number): void;
}

// Test timeout (10 seconds)
const TEST_TIMEOUT_MS = 10000;

/**
 * Minimal Engine-Only Test with detailed stages
 */
export async function testEngineWithDiagnostics(
  onStage: StageCallback
): Promise<DiagnosticResult> {
  const startTime = Date.now();
  const completedStages: string[] = [];
  let timeoutId: number | undefined;

  const logStage = (stage: string) => {
    const elapsed = Date.now() - startTime;
    completedStages.push(`${stage} (${elapsed}ms)`);
    onStage(stage, elapsed);
  };

  try {
    logStage('Stage 1: pdfmake module loaded');

    logStage('Stage 2: vfs_fonts module loaded');

    logStage('Stage 3: VFS initialized');

    logStage('Stage 4: Creating minimal document definition');

    // Minimal test content
    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: 'Hello ExportAI' },
      ],
    };

    logStage('Stage 5: Calling createPdf()');

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);

    logStage('Stage 6: createPdf() returned');
    logStage('Stage 7: Attempting PDF byte generation');

    // Try multiple API methods with timeout
    const pdfBytes = await Promise.race([
      attemptGetBase64(pdfDocGenerator, logStage),
      createTimeout(TEST_TIMEOUT_MS),
    ]);

    if (!pdfBytes) {
      throw new Error('PDF generation timed out or returned null');
    }

    logStage('Stage 8: PDF bytes received');

    logStage('Stage 9: Converting to Uint8Array');

    logStage('Stage 10: Validating PDF signature');
    const isValid = validatePdfSignature(pdfBytes);

    logStage(`Stage 11: Complete (valid=${isValid})`);

    return {
      success: true,
      pdfBytes,
      completedStages,
      elapsedMs: Date.now() - startTime,
      apiMethod: 'getBase64',
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logStage(`FAILED: ${errorMessage}`);

    return {
      success: false,
      pdfBytes: null,
      error: errorMessage,
      completedStages,
      failedStage: completedStages[completedStages.length - 1] || 'unknown',
      elapsedMs: elapsed,
    };
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Attempt getBase64 with proper error handling
 */
function attemptGetBase64(pdfDocGenerator: any, logStage: (s: string) => void): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      logStage('Stage 7a: Calling getBase64()');

      pdfDocGenerator.getBase64((base64String: string) => {
        logStage('Stage 7b: getBase64() callback fired');

        try {
          logStage('Stage 7c: Decoding base64 string');
          const binaryString = atob(base64String);

          logStage('Stage 7d: Creating Uint8Array');
          const bytes = new Uint8Array(binaryString.length);

          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          logStage('Stage 7e: Uint8Array created');
          resolve(bytes);
        } catch (error) {
          logStage('Stage 7_ERROR: Callback processing failed');
          reject(error);
        }
      });

      logStage('Stage 7f: getBase64() call completed (waiting for callback)');
    } catch (error) {
      logStage('Stage 7_ERROR: getBase64() threw exception');
      reject(error);
    }
  });
}

/**
 * Alternative: Try getBuffer API
 */
function attemptGetBuffer(pdfDocGenerator: any, logStage: (s: string) => void): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      logStage('Stage 7a_ALT: Calling getBuffer()');

      if (typeof pdfDocGenerator.getBuffer !== 'function') {
        throw new Error('getBuffer is not a function');
      }

      pdfDocGenerator.getBuffer((buffer: any) => {
        logStage('Stage 7b_ALT: getBuffer() callback fired');

        try {
          const bytes = new Uint8Array(buffer);
          logStage('Stage 7c_ALT: Buffer converted to Uint8Array');
          resolve(bytes);
        } catch (error) {
          reject(error);
        }
      });

      logStage('Stage 7d_ALT: getBuffer() call completed (waiting for callback)');
    } catch (error) {
      logStage('Stage 7_ALT_ERROR: getBuffer() failed');
      reject(error);
    }
  });
}

/**
 * Alternative: Try getBlob API
 */
function attemptGetBlob(pdfDocGenerator: any, logStage: (s: string) => void): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      logStage('Stage 7a_BLOB: Calling getBlob()');

      if (typeof pdfDocGenerator.getBlob !== 'function') {
        throw new Error('getBlob is not a function');
      }

      pdfDocGenerator.getBlob((blob: Blob) => {
        logStage('Stage 7b_BLOB: getBlob() callback fired');

        const reader = new FileReader();
        reader.onloadend = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          logStage('Stage 7c_BLOB: Blob converted to Uint8Array');
          resolve(bytes);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      logStage('Stage 7d_BLOB: getBlob() call completed (waiting for callback)');
    } catch (error) {
      logStage('Stage 7_BLOB_ERROR: getBlob() failed');
      reject(error);
    }
  });
}

/**
 * Create timeout promise
 */
function createTimeout(ms: number): Promise<null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, ms);
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

/**
 * Experimental: Try alternative API methods
 */
export async function experimentAlternativeAPIs(
  onStage: StageCallback
): Promise<DiagnosticResult> {
  const startTime = Date.now();
  const completedStages: string[] = [];

  const logStage = (stage: string) => {
    const elapsed = Date.now() - startTime;
    completedStages.push(`${stage} (${elapsed}ms)`);
    onStage(stage, elapsed);
  };

  try {
    logStage('EXP: Creating minimal document');

    const docDefinition: TDocumentDefinitions = {
      content: [{ text: 'Hello ExportAI' }],
    };

    logStage('EXP: Calling createPdf()');
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);

    logStage('EXP: Trying getBuffer API');

    const pdfBytes = await Promise.race([
      attemptGetBuffer(pdfDocGenerator, logStage),
      createTimeout(TEST_TIMEOUT_MS),
    ]);

    if (!pdfBytes) {
      throw new Error('getBuffer timed out');
    }

    logStage('EXP: getBuffer succeeded');

    return {
      success: true,
      pdfBytes,
      completedStages,
      elapsedMs: Date.now() - startTime,
      apiMethod: 'getBuffer',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStage(`EXP_FAILED: ${errorMessage}`);

    return {
      success: false,
      pdfBytes: null,
      error: errorMessage,
      completedStages,
      failedStage: completedStages[completedStages.length - 1],
      elapsedMs: Date.now() - startTime,
      apiMethod: 'getBuffer',
    };
  }
}

/**
 * Experimental: Try getBlob
 */
export async function experimentGetBlob(
  onStage: StageCallback
): Promise<DiagnosticResult> {
  const startTime = Date.now();
  const completedStages: string[] = [];

  const logStage = (stage: string) => {
    const elapsed = Date.now() - startTime;
    completedStages.push(`${stage} (${elapsed}ms)`);
    onStage(stage, elapsed);
  };

  try {
    logStage('BLOB: Creating minimal document');

    const docDefinition: TDocumentDefinitions = {
      content: [{ text: 'Hello ExportAI' }],
    };

    logStage('BLOB: Calling createPdf()');
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);

    logStage('BLOB: Trying getBlob API');

    const pdfBytes = await Promise.race([
      attemptGetBlob(pdfDocGenerator, logStage),
      createTimeout(TEST_TIMEOUT_MS),
    ]);

    if (!pdfBytes) {
      throw new Error('getBlob timed out');
    }

    logStage('BLOB: getBlob succeeded');

    return {
      success: true,
      pdfBytes,
      completedStages,
      elapsedMs: Date.now() - startTime,
      apiMethod: 'getBlob',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStage(`BLOB_FAILED: ${errorMessage}`);

    return {
      success: false,
      pdfBytes: null,
      error: errorMessage,
      completedStages,
      failedStage: completedStages[completedStages.length - 1],
      elapsedMs: Date.now() - startTime,
      apiMethod: 'getBlob',
    };
  }
}
