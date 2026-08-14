/**
 * Phase 6.0 Engine-Only Hang Diagnostic Harness
 *
 * Detailed instrumentation to identify exact hang point
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  testEngineWithDiagnostics,
  experimentAlternativeAPIs,
  experimentGetBlob,
  createPdfBlob,
  type DiagnosticResult,
} from '../exporters/pdf-engine-diagnostic';

type TestType = 'getBase64' | 'getBuffer' | 'getBlob';

function EngineDiagnosticApp() {
  const [status, setStatus] = useState<string>('Ready');
  const [currentStage, setCurrentStage] = useState<string>('');
  const [stages, setStages] = useState<string[]>([]);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  const handleTest = async (testType: TestType) => {
    setIsRunning(true);
    setStatus(`Running ${testType} diagnostic...`);
    setCurrentStage('Starting...');
    setStages([]);
    setError('');
    setResult(null);

    // Global error handlers
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled rejection:', event.reason);
      setError(`Unhandled rejection: ${event.reason}`);
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      setError(`Global error: ${event.message}`);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    try {
      const stageCallback = (stage: string, elapsed: number) => {
        setCurrentStage(`${stage} (${elapsed}ms)`);
        setStages((prev) => [...prev, `${stage} (${elapsed}ms)`]);
      };

      let testResult: DiagnosticResult;

      switch (testType) {
        case 'getBase64':
          testResult = await testEngineWithDiagnostics(stageCallback);
          break;
        case 'getBuffer':
          testResult = await experimentAlternativeAPIs(stageCallback);
          break;
        case 'getBlob':
          testResult = await experimentGetBlob(stageCallback);
          break;
      }

      setResult(testResult);

      if (testResult.success && testResult.pdfBytes) {
        setStatus(`✅ Success (${testResult.apiMethod}, ${testResult.elapsedMs}ms)`);
        setCurrentStage('Complete');

        // Auto-download
        const blob = createPdfBlob(testResult.pdfBytes);
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `engine-test-${testResult.apiMethod}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        (window as any).lastPdfUrl = url;
      } else {
        setStatus(`❌ Failed: ${testResult.error}`);
        setCurrentStage(testResult.failedStage || 'Unknown');
        setError(testResult.error || 'Unknown error');
      }
    } catch (err) {
      setStatus('❌ Exception');
      setError(err instanceof Error ? err.message : String(err));
      console.error('Test exception:', err);
    } finally {
      setIsRunning(false);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
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
      maxWidth: '1000px',
      margin: '40px auto',
      padding: '20px'
    }}>
      <h1>Phase 6.0 Engine-Only Hang Diagnostic</h1>

      <div style={{
        padding: '20px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>⚠️ Previous Mode A Result: HANG</h2>
        <p><strong>Issue:</strong> Page stuck at "Generating PDF bytes"</p>
        <p><strong>Hypothesis:</strong> getBase64() callback never fires in Chrome MV3 Extension</p>
        <p><strong>Goal:</strong> Identify exact hang point with detailed stages</p>
      </div>

      <div style={{
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>Diagnostic Tests</h2>
        <p>Each test tries a different PDF generation API with 10-second timeout.</p>

        <div style={{ marginBottom: '15px' }}>
          <h3>Test A: getBase64() [ORIGINAL API]</h3>
          <p>Tests the current implementation: createPdf() → getBase64(callback)</p>
          <button
            onClick={() => handleTest('getBase64')}
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
            Test getBase64
          </button>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3>Test B: getBuffer() [ALTERNATIVE]</h3>
          <p>Tests Node-style API: createPdf() → getBuffer(callback)</p>
          <button
            onClick={() => handleTest('getBuffer')}
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
            Test getBuffer
          </button>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3>Test C: getBlob() [ALTERNATIVE]</h3>
          <p>Tests browser API: createPdf() → getBlob(callback)</p>
          <button
            onClick={() => handleTest('getBlob')}
            disabled={isRunning}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
            }}
          >
            Test getBlob
          </button>
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
        {currentStage && (
          <div style={{ marginTop: '5px' }}>
            <strong>Current Stage:</strong> {currentStage}
          </div>
        )}
        {error && (
          <div style={{ marginTop: '10px', color: '#721c24' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {stages.length > 0 && (
        <div style={{
          padding: '15px',
          backgroundColor: '#ffffff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3>Completed Stages ({stages.length})</h3>
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            {stages.map((stage, idx) => (
              <div key={idx} style={{ padding: '2px 0', borderBottom: '1px solid #eee' }}>
                {idx + 1}. {stage}
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div style={{
          padding: '15px',
          backgroundColor: '#ffffff',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <h3>Test Result</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Success:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{String(result.success)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>API Method:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result.apiMethod || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Elapsed Time:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result.elapsedMs} ms</td>
              </tr>
              {result.pdfBytes && (
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>PDF Bytes:</strong></td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result.pdfBytes.length} bytes</td>
                </tr>
              )}
              {result.failedStage && (
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Failed Stage:</strong></td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd', color: '#dc3545' }}>{result.failedStage}</td>
                </tr>
              )}
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
        <h3>Instructions</h3>
        <ol>
          <li>Open DevTools Console (F12) <strong>before</strong> clicking test</li>
          <li>Click "Test getBase64" first</li>
          <li>Watch stage progression closely</li>
          <li>If timeout after 10 seconds → callback never fired</li>
          <li>Check Console for CSP violations or errors</li>
          <li>If getBase64 times out, try getBuffer or getBlob</li>
        </ol>
      </div>
    </div>
  );
}

// Mount React app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<EngineDiagnosticApp />);
