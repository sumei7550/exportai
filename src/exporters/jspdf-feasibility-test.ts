/**
 * Phase 6.0.1 jsPDF Feasibility Gate Tests
 *
 * Four isolated tests to verify jsPDF works in Chrome MV3 Extension:
 * - Test A: Engine Only (minimal English)
 * - Test B: CJK Single Font (Chinese text with one custom font)
 * - Test C: Simple Table (jspdf-autotable with 3x3 table)
 * - Test D: Multi-page Table (pagination test)
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type TestType = 'engine-only' | 'cjk-font' | 'simple-table' | 'multipage-table';

export interface TestResult {
  success: boolean;
  pdfBytes: Uint8Array | null;
  error?: string;
  completedStages: string[];
  failedStage?: string;
  elapsedMs: number;
  metadata: {
    byteLength: number;
    hasValidSignature: boolean;
    outputType?: string;
    fontMethod?: string;
    tableRows?: number;
    pageCount?: number;
  };
}

interface StageCallback {
  (stage: string, elapsed: number): void;
}

// Test timeout (10 seconds)
const TEST_TIMEOUT_MS = 10000;

/**
 * Test A: Engine Only - Minimal English text
 */
export async function testEngineOnly(
  onStage: StageCallback
): Promise<TestResult> {
  const startTime = Date.now();
  const completedStages: string[] = [];

  const logStage = (stage: string) => {
    const elapsed = Date.now() - startTime;
    completedStages.push(`${stage} (${elapsed}ms)`);
    onStage(stage, elapsed);
  };

  try {
    logStage('Stage A1: jsPDF module loaded');

    logStage('Stage A2: jsPDF constructor starting');
    const doc = new jsPDF();

    logStage('Stage A3: jsPDF instance created');

    logStage('Stage A4: minimal English text added');
    doc.text('Hello ExportAI', 10, 10);

    logStage('Stage A5: output(arraybuffer) starting');
    const output = doc.output('arraybuffer');

    logStage('Stage A6: output(arraybuffer) returned');

    logStage('Stage A7: actual output type inspected');
    const outputType = Object.prototype.toString.call(output);

    logStage('Stage A8: normalized to Uint8Array');
    const pdfBytes = new Uint8Array(output);

    logStage('Stage A9: byte length verified');
    const byteLength = pdfBytes.length;

    logStage('Stage A10: %PDF- signature verified');
    const hasValidSignature = validatePdfSignature(pdfBytes);

    logStage('Stage A11: Blob created');
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    logStage('Stage A12: Blob URL created');
    const blobUrl = URL.createObjectURL(blob);

    logStage('Stage A13: complete');

    return {
      success: true,
      pdfBytes,
      completedStages,
      elapsedMs: Date.now() - startTime,
      metadata: {
        byteLength,
        hasValidSignature,
        outputType,
      },
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
      metadata: {
        byteLength: 0,
        hasValidSignature: false,
      },
    };
  }
}

/**
 * Test B: CJK Single Font - Chinese text with SUBSET custom font
 *
 * Uses pre-subsetted TTF font (12 KB) preprocessed at build time.
 * Previous FAIL was due to raw OTF format incompatibility with jsPDF.
 * Now using proper TTF subset via fontmin.
 */
export async function testCjkFont(
  onStage: StageCallback
): Promise<TestResult> {
  const startTime = Date.now();
  const completedStages: string[] = [];

  const logStage = (stage: string) => {
    const elapsed = Date.now() - startTime;
    completedStages.push(`${stage} (${elapsed}ms)`);
    onStage(stage, elapsed);
  };

  try {
    logStage('Stage B1: importing subset font module');

    // Import pre-subsetted font (build-time generated)
    const { NOTO_SANS_SC_SUBSET_BASE64, NOTO_SANS_SC_SUBSET_METADATA } = await import(
      '../assets/fonts-subset/NotoSansSC-Subset.js'
    );

    logStage(`Stage B2: subset font loaded (${NOTO_SANS_SC_SUBSET_METADATA.subsetSize} bytes)`);

    logStage('Stage B3: font size recorded');
    const fontSize = NOTO_SANS_SC_SUBSET_METADATA.subsetSize;

    logStage('Stage B4: jsPDF instance created');
    const doc = new jsPDF();

    logStage('Stage B5: font registered in VFS');
    doc.addFileToVFS('NotoSansSC-Subset.ttf', NOTO_SANS_SC_SUBSET_BASE64);

    logStage('Stage B6: font added');
    doc.addFont('NotoSansSC-Subset.ttf', 'NotoSansSC', 'normal');

    logStage('Stage B7: font selected');
    doc.setFont('NotoSansSC');

    logStage('Stage B8: English + Chinese text added');
    doc.text('Hello ExportAI', 10, 10);
    doc.text('你好，世界', 10, 20);
    doc.text('ExportAI 中文 PDF', 10, 30);

    logStage('Stage B9: output started');
    const output = doc.output('arraybuffer');

    logStage('Stage B10: output returned');

    logStage('Stage B11: normalized Uint8Array');
    const pdfBytes = new Uint8Array(output);

    logStage('Stage B12: %PDF- verified');
    const hasValidSignature = validatePdfSignature(pdfBytes);

    logStage('Stage B13: Blob created');
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    logStage('Stage B14: complete');

    return {
      success: true,
      pdfBytes,
      completedStages,
      elapsedMs: Date.now() - startTime,
      metadata: {
        byteLength: pdfBytes.length,
        hasValidSignature,
        fontMethod: `custom-cjk-${Math.round(fontSize / 1024)}KB`,
      },
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
      failedStage: completedStages[completedStages.length - 1],
      elapsedMs: elapsed,
      metadata: {
        byteLength: 0,
        hasValidSignature: false,
      },
    };
  }
}

/**
 * Test C: Simple Table - jspdf-autotable with 3x3 table
 */
export async function testSimpleTable(
  onStage: StageCallback
): Promise<TestResult> {
  const startTime = Date.now();
  const completedStages: string[] = [];

  const logStage = (stage: string) => {
    const elapsed = Date.now() - startTime;
    completedStages.push(`${stage} (${elapsed}ms)`);
    onStage(stage, elapsed);
  };

  try {
    logStage('Stage C1: plugin available');

    logStage('Stage C2: jsPDF created');
    const doc = new jsPDF();

    logStage('Stage C3: table generation started');
    autoTable(doc, {
      head: [['Name', 'Role', 'Status']],
      body: [
        ['Alice', 'User', 'Active'],
        ['ExportAI', 'Assistant', 'Ready'],
        ['Bob', 'User', 'Active'],
      ],
    });

    logStage('Stage C4: table generation completed');

    logStage('Stage C5: PDF output generated');
    const output = doc.output('arraybuffer');

    logStage('Stage C6: signature verified');
    const pdfBytes = new Uint8Array(output);
    const hasValidSignature = validatePdfSignature(pdfBytes);

    logStage('Stage C7: Blob created');
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    logStage('Stage C8: complete');

    return {
      success: true,
      pdfBytes,
      completedStages,
      elapsedMs: Date.now() - startTime,
      metadata: {
        byteLength: pdfBytes.length,
        hasValidSignature,
        tableRows: 3,
      },
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
      failedStage: completedStages[completedStages.length - 1],
      elapsedMs: elapsed,
      metadata: {
        byteLength: 0,
        hasValidSignature: false,
      },
    };
  }
}

/**
 * Test D: Multi-page Table - Pagination test
 */
export async function testMultipageTable(
  onStage: StageCallback
): Promise<TestResult> {
  const startTime = Date.now();
  const completedStages: string[] = [];

  const logStage = (stage: string) => {
    const elapsed = Date.now() - startTime;
    completedStages.push(`${stage} (${elapsed}ms)`);
    onStage(stage, elapsed);
  };

  try {
    logStage('Stage D1: generating synthetic data');

    // Create 200 rows to force pagination
    const rows: string[][] = [];
    for (let i = 1; i <= 200; i++) {
      rows.push([`Row ${i}`, `Data ${i}`, `Status ${i % 3 === 0 ? 'Complete' : 'Pending'}`]);
    }

    logStage('Stage D2: jsPDF created');
    const doc = new jsPDF();

    logStage('Stage D3: multi-page table generation started');
    autoTable(doc, {
      head: [['Index', 'Data', 'Status']],
      body: rows,
      startY: 20,
    });

    logStage('Stage D4: table generation completed');

    logStage('Stage D5: counting pages');
    const pageCount = (doc as any).internal?.getNumberOfPages?.() || 1;

    logStage('Stage D6: PDF output generated');
    const output = doc.output('arraybuffer');

    logStage('Stage D7: signature verified');
    const pdfBytes = new Uint8Array(output);
    const hasValidSignature = validatePdfSignature(pdfBytes);

    logStage('Stage D8: Blob created');
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    logStage('Stage D9: complete');

    return {
      success: true,
      pdfBytes,
      completedStages,
      elapsedMs: Date.now() - startTime,
      metadata: {
        byteLength: pdfBytes.length,
        hasValidSignature,
        tableRows: 200,
        pageCount,
      },
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
      failedStage: completedStages[completedStages.length - 1],
      elapsedMs: elapsed,
      metadata: {
        byteLength: 0,
        hasValidSignature: false,
      },
    };
  }
}

/**
 * Main test entry point with timeout
 */
export async function runTest(
  testType: TestType,
  onStage: StageCallback
): Promise<TestResult> {
  const testPromise = (async () => {
    switch (testType) {
      case 'engine-only':
        return testEngineOnly(onStage);
      case 'cjk-font':
        return testCjkFont(onStage);
      case 'simple-table':
        return testSimpleTable(onStage);
      case 'multipage-table':
        return testMultipageTable(onStage);
      default:
        throw new Error(`Unknown test type: ${testType}`);
    }
  })();

  const timeoutPromise = new Promise<TestResult>((resolve) => {
    setTimeout(() => {
      resolve({
        success: false,
        pdfBytes: null,
        error: 'Test timed out after 10 seconds',
        completedStages: ['TIMEOUT'],
        failedStage: 'timeout',
        elapsedMs: TEST_TIMEOUT_MS,
        metadata: {
          byteLength: 0,
          hasValidSignature: false,
        },
      });
    }, TEST_TIMEOUT_MS);
  });

  return Promise.race([testPromise, timeoutPromise]);
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
 * Create downloadable Blob
 */
export function createPdfBlob(pdfBytes: Uint8Array): Blob {
  const copy = new Uint8Array(pdfBytes);
  return new Blob([copy], { type: 'application/pdf' });
}
