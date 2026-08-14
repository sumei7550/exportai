/**
 * Phase 6.0.1 jsPDF Feasibility Gate Harness
 *
 * Four sequential tests to validate jsPDF in Chrome MV3 Extension
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  runTest,
  createPdfBlob,
  type TestType,
  type TestResult,
} from '../exporters/jspdf-feasibility-test';

function JsPdfFeasibilityApp() {
  const [status, setStatus] = useState<string>('Ready - Run Test A first');
  const [currentStage, setCurrentStage] = useState<string>('');
  const [stages, setStages] = useState<string[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [completedTests, setCompletedTests] = useState<Set<TestType>>(new Set());

  const handleTest = async (testType: TestType) => {
    setIsRunning(true);
    setStatus(`Running ${testType} test...`);
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

      const testResult = await runTest(testType, stageCallback);

      setResult(testResult);

      if (testResult.success && testResult.pdfBytes) {
        setStatus(`✅ Test PASSED (${testResult.elapsedMs}ms)`);
        setCurrentStage('Complete');

        // Mark test as completed
        setCompletedTests((prev) => new Set(prev).add(testType));

        // Auto-download
        const blob = createPdfBlob(testResult.pdfBytes);
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `exportai-jspdf-${testType}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        (window as any).lastPdfUrl = url;
      } else {
        setStatus(`❌ Test FAILED`);
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

  const isTestEnabled = (testType: TestType): boolean => {
    if (isRunning) return false;

    switch (testType) {
      case 'engine-only':
        return true; // Always enabled
      case 'cjk-font':
        return completedTests.has('engine-only');
      case 'simple-table':
        return completedTests.has('cjk-font');
      case 'multipage-table':
        return completedTests.has('simple-table');
      default:
        return false;
    }
  };

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '1000px',
      margin: '40px auto',
      padding: '20px'
    }}>
      <h1>Phase 6.0.1 jsPDF Feasibility Gate</h1>

      <div style={{
        padding: '20px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>⚠️ pdfmake@0.3.11: FAILED</h2>
        <p><strong>Issue:</strong> All three output APIs (getBase64, getBuffer, getBlob) timed out in Chrome MV3</p>
        <p><strong>Current Goal:</strong> Verify jsPDF works as alternative PDF engine</p>
        <p><strong>Critical:</strong> Run tests sequentially (A → B → C → D)</p>
      </div>

      <div style={{
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>Sequential Tests</h2>
        <p><strong>MUST run in order:</strong> Only proceed to next test if previous test PASSES.</p>

        <div style={{ marginBottom: '15px' }}>
          <h3>Test A: Engine Only {completedTests.has('engine-only') && '✅'}</h3>
          <p>Minimal English text: "Hello ExportAI" (no CJK, no table)</p>
          <button
            onClick={() => handleTest('engine-only')}
            disabled={!isTestEnabled('engine-only')}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: isTestEnabled('engine-only') ? '#007bff' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isTestEnabled('engine-only') ? 'pointer' : 'not-allowed',
            }}
          >
            Test A: Engine Only
          </button>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3>Test B: CJK Single Font {completedTests.has('cjk-font') && '✅'}</h3>
          <p>Chinese text with custom font: "你好，世界"</p>
          <button
            onClick={() => handleTest('cjk-font')}
            disabled={!isTestEnabled('cjk-font')}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: isTestEnabled('cjk-font') ? '#28a745' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isTestEnabled('cjk-font') ? 'pointer' : 'not-allowed',
            }}
          >
            Test B: CJK Font
          </button>
          {!completedTests.has('engine-only') && (
            <span style={{ marginLeft: '10px', color: '#666' }}>
              ⚠️ Test A must pass first
            </span>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3>Test C: Simple Table {completedTests.has('simple-table') && '✅'}</h3>
          <p>jspdf-autotable plugin with 3x3 table</p>
          <button
            onClick={() => handleTest('simple-table')}
            disabled={!isTestEnabled('simple-table')}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: isTestEnabled('simple-table') ? '#17a2b8' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isTestEnabled('simple-table') ? 'pointer' : 'not-allowed',
            }}
          >
            Test C: Simple Table
          </button>
          {!completedTests.has('cjk-font') && (
            <span style={{ marginLeft: '10px', color: '#666' }}>
              ⚠️ Test B must pass first
            </span>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3>Test D: Multi-page Table {completedTests.has('multipage-table') && '✅'}</h3>
          <p>200-row table to test pagination</p>
          <button
            onClick={() => handleTest('multipage-table')}
            disabled={!isTestEnabled('multipage-table')}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: isTestEnabled('multipage-table') ? '#6c757d' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isTestEnabled('multipage-table') ? 'pointer' : 'not-allowed',
            }}
          >
            Test D: Multi-page Table
          </button>
          {!completedTests.has('simple-table') && (
            <span style={{ marginLeft: '10px', color: '#666' }}>
              ⚠️ Test C must pass first
            </span>
          )}
        </div>

        <div style={{ marginTop: '20px' }}>
          <button
            onClick={handleOpenPreview}
            disabled={!result?.success}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: result?.success ? '#6c757d' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: result?.success ? 'pointer' : 'not-allowed',
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
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3>Test Result</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Success:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{String(result.success)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Elapsed Time:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result.elapsedMs} ms</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Byte Length:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result.metadata.byteLength}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Valid Signature:</strong></td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{String(result.metadata.hasValidSignature)}</td>
              </tr>
              {result.metadata.outputType && (
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Output Type:</strong></td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result.metadata.outputType}</td>
                </tr>
              )}
              {result.metadata.tableRows && (
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Table Rows:</strong></td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result.metadata.tableRows}</td>
                </tr>
              )}
              {result.metadata.pageCount && (
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>Page Count:</strong></td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result.metadata.pageCount}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {completedTests.has('cjk-font') && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px'
        }}>
          <h3>Manual Validation Checklist (Test B)</h3>
          <p>Open the downloaded PDF and verify:</p>
          <ul>
            <li>[ ] English text "Hello ExportAI" visually correct</li>
            <li>[ ] Chinese text "你好，世界" renders correctly (not □□□)</li>
            <li>[ ] English text is selectable</li>
            <li>[ ] Chinese text is selectable</li>
            <li>[ ] Search "ExportAI" finds result</li>
            <li>[ ] Search "你好" finds result</li>
          </ul>
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
          <li>Open DevTools Console (F12) <strong>before</strong> starting tests</li>
          <li>Open Network tab to monitor zero-network requirement</li>
          <li><strong>Run Test A first</strong> - Engine Only validation</li>
          <li>Wait for completion, click "Open Preview" to verify PDF</li>
          <li>Check Console for CSP violations or errors</li>
          <li>Only proceed to Test B if Test A passes</li>
          <li>Continue sequentially through all tests</li>
        </ol>
      </div>
    </div>
  );
}

// Mount React app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<JsPdfFeasibilityApp />);
