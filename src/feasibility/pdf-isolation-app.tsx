/**
 * Phase 6.0 PDF Root-Cause Isolation Harness
 *
 * Three test modes to isolate failure:
 * - Mode A: Engine only (no CJK fonts)
 * - Mode B: CJK Regular only (one 16MB font)
 * - Mode C: CJK Regular + Bold (two fonts, 33MB total)
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { testPdfGeneration, createPdfBlob, type TestMode, type PdfTestResult } from '../exporters/pdf-isolation-test';

function PdfIsolationApp() {
  const [status, setStatus] = useState<string>('Ready - Select a test mode');
  const [stage, setStage] = useState<string>('');
  const [result, setResult] = useState<PdfTestResult | null>(null);
  const [error, setError] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  const handleTest = async (mode: TestMode) => {
    setIsRunning(true);
    setStatus(`Running ${mode} test...`);
    setStage('Initializing');
    setError('');
    setResult(null);

    const startTime = Date.now();

    try {
      const pdfResult = await testPdfGeneration(mode, (progressStage) => {
        setStage(progressStage);
      });

      setResult(pdfResult);

      if (pdfResult.success && pdfResult.pdfBytes) {
        setStatus(`✅ Test passed (${pdfResult.metadata.elapsedMs}ms)`);
        setStage('Complete');

        // Create blob and download
        const blob = createPdfBlob(pdfResult.pdfBytes);
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `exportai-test-${mode}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        (window as any).lastPdfUrl = url;
      } else {
        setStatus(`❌ Test failed`);
        setStage(pdfResult.stage || 'Unknown stage');
        setError(pdfResult.error || 'Unknown error');
      }
    } catch (err) {
      setStatus('❌ Exception thrown');
      setStage('Exception');
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
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
      maxWidth: '900px',
      margin: '40px auto',
      padding: '20px'
    }}>
      <h1>Phase 6.0 PDF Root-Cause Isolation</h1>

      <div style={{
        padding: '20px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>⚠️ Previous Smoke Test: FAILED</h2>
        <p><strong>Failure symptoms:</strong></p>
        <ul>
          <li>Chrome hung/froze during PDF generation</li>
          <li>Massive Base64 console output</li>
          <li>PDF never completed</li>
        </ul>
        <p><strong>Root cause hypothesis:</strong> 33 MB CJK fonts → Base64 conversion → Memory pressure</p>
      </div>

      <div style={{
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>Isolated Test Modes</h2>

        <div style={{ marginBottom: '15px' }}>
          <h3>Mode A: Engine Only</h3>
          <p>Tests pdfmake with built-in Roboto font only (no CJK). Validates: MV3 CSP, engine functionality, Uint8Array generation.</p>
          <button
            onClick={() => handleTest('engine-only')}
            disabled={isRunning}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
            }}
          >
            Test Engine Only
          </button>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3>Mode B: CJK Regular Only</h3>
          <p>Loads ONE CJK font (Regular, 16 MB). Tests: Single font Base64 conversion, minimal Chinese text rendering.</p>
          <button
            onClick={() => handleTest('cjk-regular')}
            disabled={isRunning}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
            }}
          >
            Test CJK Regular
          </button>
          <span style={{ marginLeft: '10px', color: '#666' }}>
            ⚠️ Only run if Mode A passes
          </span>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3>Mode C: CJK Regular + Bold</h3>
          <p>Loads TWO CJK fonts (33 MB total). Tests: Multiple font handling, memory pressure with full configuration.</p>
          <button
            onClick={() => handleTest('cjk-both')}
            disabled={isRunning}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
            }}
          >
            Test CJK Both
          </button>
          <span style={{ marginLeft: '10px', color: '#666' }}>
            ⚠️ Only run if Mode B passes
          </span>
        </div>

        <div style={{ marginTop: '20px' }}>
          <button
            onClick={handleOpenPreview}
            disabled={!result?.success}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: !result?.success ? 'not-allowed' : 'pointer',
            }}
          >
            Open Preview
          </button>
        </div>
      </div>

      <div style={{
        padding: '15px',
        backgroundColor: status.includes('✅') ? '#d4edda' :
                        status.includes('❌') ? '#f8d7da' : '#d1ecf1',
        border: '1px solid ' + (status.includes('✅') ? '#c3e6cb' :
                                status.includes('❌') ? '#f5c6cb' : '#bee5eb'),
        borderRadius: '4px',
        marginBottom: '20px'
      }}>
        <div><strong>Status:</strong> {status}</div>
        {stage && <div style={{ marginTop: '5px' }}><strong>Stage:</strong> {stage}</div>}
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
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Mode:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result.metadata.mode}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Elapsed Time:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result.metadata.elapsedMs} ms</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Byte Length:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result.metadata.byteLength}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Valid Signature:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{String(result.metadata.hasValidSignature)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Font Method:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result.metadata.fontLoadMethod}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#e7f3ff',
        border: '1px solid #007bff',
        borderRadius: '4px'
      }}>
        <h3>Important Notes</h3>
        <ul>
          <li><strong>Test sequentially:</strong> Run Mode A first. Only proceed to Mode B if Mode A passes.</li>
          <li><strong>Watch DevTools Console:</strong> Check for CSP violations during each test.</li>
          <li><strong>Monitor memory:</strong> Open Chrome Task Manager to observe memory usage.</li>
          <li><strong>Stage display:</strong> Progress stages help identify where failure occurs.</li>
          <li><strong>No console spam:</strong> Error messages are displayed safely (no font payload logging).</li>
        </ul>
      </div>
    </div>
  );
}

// Mount React app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<PdfIsolationApp />);
