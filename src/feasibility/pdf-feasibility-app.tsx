/**
 * Phase 6.0 PDF Feasibility Smoke Test Harness
 *
 * This is a minimal test page for Real Chrome Extension validation.
 * NOT part of production ExportAI functionality.
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { generateFeasibilityPdf, createPdfBlob } from '../exporters/pdf-feasibility-prototype';

function PdfFeasibilityApp() {
  const [status, setStatus] = useState<string>('Ready');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleGenerate = async () => {
    setStatus('Generating PDF...');
    setError('');
    setResult(null);

    try {
      const pdfResult = await generateFeasibilityPdf();

      setResult(pdfResult);

      if (pdfResult.success && pdfResult.pdfBytes) {
        setStatus('PDF Generated Successfully');

        // Create blob and object URL for download/preview
        const blob = createPdfBlob(pdfResult.pdfBytes);
        const url = URL.createObjectURL(blob);

        // Auto-download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'exportai-feasibility-test.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Keep URL for preview
        (window as any).lastPdfUrl = url;

        setStatus(`PDF Generated and Downloaded (${pdfResult.metadata.byteLength} bytes)`);
      } else {
        setStatus('PDF Generation Failed');
        setError(pdfResult.error || 'Unknown error');
      }
    } catch (err) {
      setStatus('Error');
      setError(err instanceof Error ? err.message : String(err));
      console.error('PDF Generation Error:', err);
    }
  };

  const handleOpenPreview = () => {
    const url = (window as any).lastPdfUrl;
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('Generate a PDF first');
    }
  };

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '800px',
      margin: '40px auto',
      padding: '20px'
    }}>
      <h1>ExportAI Phase 6.0 PDF Feasibility Test</h1>

      <div style={{
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>Test Content</h2>
        <p>This test will generate a PDF containing:</p>
        <ul>
          <li><strong>English text</strong>: "Export AI conversations safely"</li>
          <li><strong>Common Chinese</strong>: "你好，世界", "导出人工智能对话内容"</li>
          <li><strong>Test Chinese</strong>: "这是 ExportAI PDF 中文字体可行性测试"</li>
          <li><strong>Rare characters</strong>: 龘 麤 齉 翾 𠀀</li>
          <li><strong>Mixed text</strong>: ExportAI 支持中文 English 123</li>
          <li><strong>Unicode symbols</strong>: © ™ → ← ✓</li>
          <li><strong>Emoji</strong>: 🚀 😀</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleGenerate}
          disabled={status === 'Generating PDF...'}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: status === 'Generating PDF...' ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          Generate Feasibility PDF
        </button>

        <button
          onClick={handleOpenPreview}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Open Preview
        </button>
      </div>

      <div style={{
        padding: '15px',
        backgroundColor: status.includes('Success') ? '#d4edda' :
                        status.includes('Failed') || error ? '#f8d7da' : '#d1ecf1',
        border: '1px solid ' + (status.includes('Success') ? '#c3e6cb' :
                                status.includes('Failed') || error ? '#f5c6cb' : '#bee5eb'),
        borderRadius: '4px',
        marginBottom: '20px'
      }}>
        <strong>Status:</strong> {status}
        {error && (
          <div style={{ marginTop: '10px', color: '#721c24' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {result && (
        <div style={{
          padding: '15px',
          backgroundColor: '#ffffff',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <h3>Result Details</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Success:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{String(result.success)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Byte Length:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result.metadata.byteLength}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Valid PDF Signature:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{String(result.metadata.hasValidSignature)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Font Method:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result.metadata.fontLoadMethod}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Generated At:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result.metadata.generatedAt}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '4px'
      }}>
        <h3>Manual Validation Checklist</h3>
        <ol>
          <li>✓ PDF downloads automatically</li>
          <li>⏳ Open PDF in Chrome PDF Viewer (click "Open Preview")</li>
          <li>⏳ Verify Chinese characters render (not boxes/tofu)</li>
          <li>⏳ Select and copy English text</li>
          <li>⏳ Select and copy Chinese text</li>
          <li>⏳ Search for "ExportAI" - should find it</li>
          <li>⏳ Search for "中文字体可行性测试" - should find it</li>
          <li>⏳ Check DevTools Network tab - should be zero external requests</li>
          <li>⏳ Note rare character rendering (龘 麤 齉 翾 𠀀)</li>
          <li>⏳ Note emoji rendering (🚀 😀)</li>
        </ol>
      </div>
    </div>
  );
}

// Mount React app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<PdfFeasibilityApp />);
