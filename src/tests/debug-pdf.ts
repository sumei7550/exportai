/**
 * Debug script to test PDF generation and see actual errors
 */

import {
  generateFeasibilityPdf,
  createPdfBlob,
} from '../exporters/pdf-feasibility-prototype';

async function testPdfGeneration() {
  console.log('Starting PDF feasibility test...');

  try {
    const result = await generateFeasibilityPdf();

    console.log('\n=== PDF Generation Result ===');
    console.log('Success:', result.success);
    console.log('Error:', result.error);
    console.log('Metadata:', result.metadata);

    if (result.pdfBytes) {
      console.log('PDF Bytes Length:', result.pdfBytes.length);
      console.log('First 10 bytes:', Array.from(result.pdfBytes.slice(0, 10)));

      // Try to create blob
      const blob = createPdfBlob(result.pdfBytes);
      console.log('Blob created:', blob.size, 'bytes');
    } else {
      console.log('PDF Bytes: null');
    }
  } catch (error) {
    console.error('Caught error:', error);
  }
}

testPdfGeneration().catch(console.error);
