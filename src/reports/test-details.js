export function generateTestDetailsHTML(testName, testData) {
  const { runs, summary, meta } = testData;
  const metaName = meta && meta.name ? meta.name : testName;
  const metaDescription = meta && typeof meta.description === 'string' ? meta.description : '';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metaName} - Panoptical Test Details</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #0f172a;
            min-height: 100vh;
            color: #e2e8f0;
        }
        
        .container {
            max-width: 1100px;
            margin: 0 auto;
            padding: 15px;
            margin-top: 20px;
        }
        
        .header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
            color: white;
        }
        
        .back-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background 0.3s ease;
        }
        
        .back-btn:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .header h1 {
            font-size: 2rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .test-summary {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            border: 1px solid #334155;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .summary-item {
            text-align: center;
            padding: 15px;
            border-radius: 8px;
            background: #334155;
            border: 1px solid #475569;
        }
        
        .summary-value {
            font-size: 1.8rem;
            font-weight: bold;
            margin-bottom: 4px;
            color: #e2e8f0;
        }
        
        .summary-label {
            color: #94a3b8;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .summary-pass { color: #10b981; }
        .summary-fail { color: #ef4444; }
        .summary-neutral { color: #3b82f6; }
        
        .test-details {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            border: 1px solid #334155;
        }
        
        .detail-row {
            display: flex;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #475569;
        }
        
        .detail-row:last-child {
            border-bottom: none;
        }
        
        .detail-label {
            font-size: 0.9rem;
            color: #94a3b8;
            font-weight: 500;
            min-width: 140px;
            margin-right: 15px;
        }
        
        .detail-value {
            font-size: 1rem;
            color: #e2e8f0;
            font-weight: 600;
            word-break: break-word;
        }
        
        .charts-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .chart-container {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            height: 320px;
            border: 1px solid #334155;
            display: flex;
            flex-direction: column;
        }
        
        .chart-container canvas {
            flex: 1;
            max-height: 280px;
        }
        
        .chart-title {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 0;
            color: #e2e8f0;
            text-align: center;
            position: relative;
            z-index: 10;
        }
        
        .chart-note {
            font-size: 0.8rem;
            color: #94a3b8;
            text-align: center;
            margin-bottom: 10px;
            font-style: italic;
        }
        
        .runs-section {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            border: 1px solid #334155;
        }
        
        .section-title {
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 15px;
            color: #e2e8f0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .section-subtitle {
            font-size: 0.9rem;
            color: #94a3b8;
            font-weight: 400;
            margin-top: 5px;
            margin-left: 30px;
        }
        
        .runs-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        .runs-table th,
        .runs-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #475569;
        }
        
        .runs-table th {
            background: #334155;
            font-weight: 600;
            color: #e2e8f0;
        }
        
        .runs-table tr:hover {
            background: #475569;
        }
        
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
        }
        
        .status-pass { background: #065f46; color: #d1fae5; }
        .status-fail { background: #991b1b; color: #fee2e2; }
        
        .error-details {
            background: #991b1b;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 12px;
            margin-top: 8px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.8rem;
            color: #fee2e2;
            white-space: pre-wrap;
            max-height: 180px;
            overflow-y: auto;
        }
        
        .duration-cell {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-weight: 500;
        }
        
        .timestamp-cell {
            color: #94a3b8;
            font-size: 0.8rem;
        }
        
        @media (max-width: 768px) {
            .charts-section {
                grid-template-columns: 1fr;
            }
            
            .summary-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .detail-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 5px;
            }
            
            .detail-label {
                min-width: auto;
                margin-right: 0;
            }
            
            .header h1 {
                font-size: 1.8rem;
            }
            
            .runs-table {
                font-size: 0.875rem;
            }
            
            .runs-table th,
            .runs-table td {
                padding: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <button class="back-btn" onclick="history.back()">
                <i class="fas fa-arrow-left"></i> Back
            </button>
            <img src="/panoptical-logo.png" alt="Panoptical Logo" style="height: 35px;">
            <h1>${metaName}</h1>
        </div>
        
        <div class="test-details">
            <div class="detail-row">
                <span class="detail-label">Test Name:</span>
                <span class="detail-value">${metaName}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Test Description:</span>
                <span class="detail-value">${metaDescription && metaDescription.length > 0 ? metaDescription : '—'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">File:</span>
                <span class="detail-value">${meta && meta.file ? meta.file.replace(/\\/g, '/') : 'tests/' + testName.replace(/\.(yaml|yml)$/i, '') + '.yaml'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Last Run:</span>
                <span class="detail-value">${runs.length > 0 ? new Date(Math.max(...runs.map(r => r.ts))).toLocaleDateString() + ' ' + new Date(Math.max(...runs.map(r => r.ts))).toLocaleTimeString() : 'Never'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Average Duration:</span>
                <span class="detail-value">${runs.length > 0 ? (() => {
                    const avgMs = Math.round(runs.reduce((sum, r) => sum + r.duration, 0) / runs.length);
                    if (avgMs < 1000) return avgMs + 'ms';
                    const seconds = Math.floor(avgMs / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const hours = Math.floor(minutes / 60);
                    if (hours > 0) {
                        const remainingMinutes = minutes % 60;
                        const remainingSeconds = seconds % 60;
                        return hours + 'h ' + remainingMinutes + 'm ' + remainingSeconds + 's';
                    } else if (minutes > 0) {
                        const remainingSeconds = seconds % 60;
                        return minutes + 'm ' + remainingSeconds + 's';
                    } else {
                        return seconds + 's';
                    }
                })() : 'N/A'}</span>
            </div>
        </div>
        
        <div class="test-summary">
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-value summary-neutral">${summary.total}</div>
                    <div class="summary-label">Total Runs</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value summary-pass">${summary.passed}</div>
                    <div class="summary-label">Passed</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value summary-fail">${summary.failed}</div>
                    <div class="summary-label">Failed</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value summary-neutral">${summary.passRate}%</div>
                    <div class="summary-label">Pass Rate</div>
                </div>
            </div>
        </div>
        
        <div class="charts-section">
            <div class="chart-container">
                <div class="chart-title">Success Rate Over Time</div>
                <div class="chart-note">Showing last 20 runs for optimal visualization</div>
                <canvas id="successChart"></canvas>
            </div>
            <div class="chart-container">
                <div class="chart-title">Duration Trends</div>
                <div class="chart-note">Showing last 20 runs for optimal visualization</div>
                <canvas id="durationChart"></canvas>
            </div>
        </div>
        
        <div class="runs-section">
            <div class="section-title">
                <i class="fas fa-history"></i>
                Test Run History
                <div class="section-subtitle">Showing all ${runs.length} test runs. System automatically keeps last 50 runs per test.</div>
            </div>
            <table class="runs-table">
                <thead>
                    <tr>
                        <th>Run #</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Timestamp</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${generateRunsTableRows(runs)}
                </tbody>
            </table>
        </div>
    </div>
    
    <script>
        // Format duration from milliseconds to human-readable format
        function formatDuration(ms) {
            if (ms < 1000) {
                return ms + 'ms';
            }
            
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            
            if (hours > 0) {
                const remainingMinutes = minutes % 60;
                const remainingSeconds = seconds % 60;
                return hours + 'h ' + remainingMinutes + 'm ' + remainingSeconds + 's';
            } else if (minutes > 0) {
                const remainingSeconds = seconds % 60;
                return minutes + 'm ' + remainingSeconds + 's';
            } else {
                return seconds + 's';
            }
        }
        
        // Initialize charts
        document.addEventListener('DOMContentLoaded', function() {
            renderSuccessChart();
            renderDurationChart();
        });
        
        function renderSuccessChart() {
            const ctx = document.getElementById('successChart').getContext('2d');
            const chartRuns = ${JSON.stringify(testData.chartRuns || [])};
            
            // Sort runs by timestamp (oldest first) for the chart to show progression
            const sortedRuns = [...chartRuns].sort((a, b) => a.ts - b.ts);
            
            const labels = sortedRuns.map((_, index) => \`Run \${index + 1}\`);
            const data = sortedRuns.map(run => run.status === 'pass' ? 1 : 0);
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Success Rate',
                        data: data,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        pointBackgroundColor: data.map(d => d === 1 ? '#10b981' : '#ef4444'),
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            ticks: {
                                font: {
                                    size: 10,
                                    color: '#94a3b8'
                                }
                            },
                            grid: {
                                color: '#334155'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            max: 1,
                            ticks: {
                                stepSize: 1,
                                font: {
                                    size: 10,
                                    color: '#94a3b8'
                                },
                                callback: function(value) {
                                    return value === 1 ? 'Pass' : 'Fail';
                                }
                            },
                            grid: {
                                color: '#334155'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
        
        function renderDurationChart() {
            const ctx = document.getElementById('durationChart').getContext('2d');
            const chartRuns = ${JSON.stringify(testData.chartRuns || [])};
            
            // Sort runs by timestamp (newest first) for the chart
            const sortedRuns = [...chartRuns].sort((a, b) => b.ts - a.ts);
            
            const labels = sortedRuns.map((_, index) => \`Run \${index + 1}\`);
            const data = sortedRuns.map(run => run.duration);
            const colors = sortedRuns.map(run => run.status === 'pass' ? '#10b981' : '#ef4444');
            
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Duration',
                        data: data,
                        backgroundColor: colors.map(color => 
                            color === '#10b981' ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'
                        ),
                        borderColor: colors,
                        borderWidth: 1,
                        borderRadius: 3,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            ticks: {
                                font: {
                                    size: 10,
                                    color: '#94a3b8'
                                }
                            },
                            grid: {
                                color: '#334155'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Duration',
                                font: {
                                    size: 11,
                                    color: '#e2e8f0'
                                }
                            },
                            ticks: {
                                font: {
                                    size: 10,
                                    color: '#94a3b8'
                                },
                                callback: function(value) {
                                    return formatDuration(value);
                                }
                            },
                            grid: {
                                color: '#334155'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed.y;
                                    return 'Duration: ' + formatDuration(value);
                                }
                            }
                        }
                    }
                }
            });
        }
        
        function toggleErrorDetails(runId) {
            const errorDetails = document.getElementById(\`error-\${runId}\`);
            if (errorDetails.style.display === 'none') {
                errorDetails.style.display = 'block';
            } else {
                errorDetails.style.display = 'none';
            }
        }
    </script>
</body>
</html>
  `;
}

function generateRunsTableRows(runs) {
  if (runs.length === 0) {
    return '<tr><td colspan="5" style="text-align: center; color: #94a3b8;">No test runs found</td></tr>';
  }
  
  // Sort runs by timestamp (newest first) and reverse the array to show latest first
  const sortedRuns = [...runs].sort((a, b) => b.ts - a.ts);
  
  return sortedRuns.map((run, index) => {
    const runNumber = index + 1; // Start from 1 for the most recent run
    const statusClass = run.status === 'pass' ? 'status-pass' : 'status-fail';
    const statusText = run.status === 'pass' ? 'Pass' : 'Fail';
    const timestamp = new Date(run.ts).toLocaleString();
    
    let errorRow = '';
    if (run.error) {
      errorRow = `
        <tr>
          <td colspan="5">
            <div class="error-details" id="error-${runNumber}">
              <strong>Error:</strong> ${run.error}
            </div>
          </td>
        </tr>
      `;
    }
    
    return `
      <tr>
        <td><strong>${runNumber}</strong></td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td class="duration-cell">${run.duration < 1000 ? run.duration + 'ms' : Math.floor(run.duration / 1000) + 's'}</td>
        <td class="timestamp-cell">${timestamp}</td>
        <td>
          ${run.error ? `<button onclick="toggleErrorDetails('${runNumber}')" style="background: #475569; border: 1px solid #64748b; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.875rem; color: #e2e8f0;">Show Error</button>` : '-'}
        </td>
      </tr>
      ${errorRow}
    `;
  }).join('');
}
