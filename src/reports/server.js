import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateTestDetailsHTML } from './test-details.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createReportServer(port = 3000) {
  const app = express();
  
  enforceTestRunLimits();
  
  app.use('/static', express.static(path.join(__dirname, 'static')));
  

  
  app.get('/panoptical-logo.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'panoptical-logo.png'));
  });
  
  app.get('/', (req, res) => {
    const html = generateDashboardHTML();
    res.send(html);
  });
  
  app.get('/api/test-data', (req, res) => {
    try {
      const runsData = fs.existsSync('.panoptical/runs.json') 
        ? JSON.parse(fs.readFileSync('.panoptical/runs.json', 'utf8'))
        : {};
      const flakesData = fs.existsSync('.panoptical/flakes.json')
        ? JSON.parse(fs.readFileSync('.panoptical/flakes.json', 'utf8'))
        : {};
      const limitedRunsData = limitTestRuns(runsData, 50);
      const chartData = getChartData(limitedRunsData, 20);
      
      // Add relative time data for charts
      const chartDataWithTime = {};
      for (const [testName, runs] of Object.entries(chartData)) {
        chartDataWithTime[testName] = runs.map((run, index) => ({
          ...run,
          chartIndex: index + 1, // Simple 1,2,3... numbering for charts
          relativeTime: getRelativeTime(run.ts)
        }));
      }
      
      res.json({
        runs: limitedRunsData,
        chartData: chartDataWithTime, // Enhanced data for charts
        flakes: flakesData,
        timestamp: Date.now()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/test/:testName', (req, res) => {
    try {
      const { testName } = req.params;
      const runsData = fs.existsSync('.panoptical/runs.json') 
        ? JSON.parse(fs.readFileSync('.panoptical/runs.json', 'utf8'))
        : {};
      
      const limitedRunsData = limitTestRuns(runsData, 50);
      const testRuns = limitedRunsData[testName] || [];
      
      const meta = readTestMeta(testName);
      res.json({
        testName,
        runs: testRuns,
        summary: generateTestSummary(testRuns),
        meta
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/test/:testName', (req, res) => {
    try {
      const { testName } = req.params;
      const runsData = fs.existsSync('.panoptical/runs.json') 
        ? JSON.parse(fs.readFileSync('.panoptical/runs.json', 'utf8'))
        : {};
      
      // Auto-limit test runs to 50 for storage/performance
      const limitedRunsData = limitTestRuns(runsData, 50);
      const testRuns = limitedRunsData[testName] || [];
      
      // Add relative time to all runs for the history table
      const runsWithTime = testRuns.map(run => ({
        ...run,
        relativeTime: getRelativeTime(run.ts)
      }));
      
      // For charts, use only the last 20 runs for better visualization
      const chartRuns = runsWithTime.slice(-20).map((run, index) => ({
        ...run,
        chartIndex: index + 1, // Simple 1,2,3... numbering for charts
      }));
      
      const meta = readTestMeta(testName);
      const testData = {
        testName,
        runs: runsWithTime,    // Full data with relative time for summary and details
        chartRuns: chartRuns,  // Limited data for charts with enhanced info
        summary: generateTestSummary(testRuns),
        meta
      };
      
      const html = generateTestDetailsHTML(testName, testData);
      res.send(html);
    } catch (error) {
      res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
    }
  });
  
  return app;
}

function generateTestSummary(runs) {
  if (runs.length === 0) return { total: 0, passed: 0, failed: 0, passRate: 0 };
  
  const total = runs.length;
  const passed = runs.filter(r => r.status === 'pass').length;
  const failed = total - passed;
  const passRate = Math.round((passed / total) * 100);
  
  return { total, passed, failed, passRate };
}

// Automatically limit test runs to keep only the most recent ones (enforced limit)
function limitTestRuns(runsData, maxRuns = 50) {
  const limitedData = {};
  let totalRunsRemoved = 0;
  
  for (const [testName, runs] of Object.entries(runsData)) {
    if (runs.length > maxRuns) {
      // Keep only the most recent runs (newest first, so slice from end)
      limitedData[testName] = runs.slice(-maxRuns);
      totalRunsRemoved += runs.length - maxRuns;
    } else {
      limitedData[testName] = runs;
    }
  }
  
  // Always enforce the limit - this is default behavior
  if (totalRunsRemoved > 0) {
    console.log(`Auto-enforced limit: Kept last ${maxRuns} runs per test, removed ${totalRunsRemoved} old runs`);
  }
  
  return limitedData;
}

// Get limited test runs for charts (enforced limit for better visualization)
function getChartData(runsData, maxChartRuns = 20) {
  const chartData = {};
  
  for (const [testName, runs] of Object.entries(runsData)) {
    // Charts automatically show only the last 20 runs for better readability
    chartData[testName] = runs.slice(-maxChartRuns);
  }
  
  return chartData;
}

// Convert timestamp to human-readable relative time
function getRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  
  // Fallback to date for runs older than 30 days
  const date = new Date(timestamp);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
}

// Automatically enforce test run limits and save the limited data back to files
function enforceTestRunLimits() {
  try {
    if (!fs.existsSync('.panoptical/runs.json')) {
      return; // No data to enforce limits on
    }
    
    const runsData = JSON.parse(fs.readFileSync('.panoptical/runs.json', 'utf8'));
    const flakesData = fs.existsSync('.panoptical/flakes.json') 
      ? JSON.parse(fs.readFileSync('.panoptical/flakes.json', 'utf8'))
      : {};
    
    let totalRunsRemoved = 0;
    let testsTruncated = 0;
    let dataChanged = false;
    
    // Enforce 50-run limit per test
    for (const [testName, runs] of Object.entries(runsData)) {
      if (runs.length > 50) {
        const runsToRemove = runs.length - 50;
        runsData[testName] = runs.slice(-50); // Keep newest 50 runs
        totalRunsRemoved += runsToRemove;
        testsTruncated++;
        dataChanged = true;
        
        // Also update flakes data if it exists
        if (flakesData[testName] && flakesData[testName].runs) {
          const remainingRunTimestamps = new Set(runsData[testName].map(r => r.ts));
          flakesData[testName].runs = flakesData[testName].runs.filter(r => 
            remainingRunTimestamps.has(r.ts)
          );
        }
      }
    }
    
    if (dataChanged) {
      // Save the limited data back to files
      fs.writeFileSync('.panoptical/runs.json', JSON.stringify(runsData, null, 2));
      fs.writeFileSync('.panoptical/flakes.json', JSON.stringify(flakesData, null, 2));
      
      console.log(`Auto-enforced limits: Limited ${testsTruncated} tests to 50 runs, removed ${totalRunsRemoved} old runs`);
    }
  } catch (error) {
    console.warn(`Auto-enforcement failed: ${error.message}`);
  }
}

// Read test metadata (name, description, file path) from YAML in tests/ directory (recursively searches subdirectories)
function readTestMeta(testName) {
  try {
    const base = testName.replace(/\.(yaml|yml)$/i, '');
    const testsDir = 'tests';
    
    if (!fs.existsSync(testsDir)) {
      return { file: null, name: testName, description: '' };
    }
    
    // Recursively search for the test file
    function findTestFile(dir) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Recursively search subdirectories
          const found = findTestFile(fullPath);
          if (found) return found;
        } else if (item === base + '.yaml' || item === base + '.yml') {
          // Found the test file
          return fullPath;
        }
      }
      return null;
    }
    
    const foundPath = findTestFile(testsDir);
    
    if (!foundPath) {
      return { file: null, name: testName, description: '' };
    }
    
    const content = fs.readFileSync(foundPath, 'utf8');
    const nameMatch = content.match(/^\s*test:\s*(.+)\s*$/m);
    const descMatch = content.match(/^\s*description:\s*(.+)\s*$/m);
    const name = nameMatch ? nameMatch[1].trim() : testName;
    const description = descMatch ? descMatch[1].trim() : '';
    return { file: foundPath, name, description };
  } catch (e) {
    return { file: null, name: testName, description: '' };
  }
}

function generateDashboardHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panoptical Test Reports Server</title>
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
            max-width: 1200px;
            margin: 0 auto;
            padding: 15px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 25px;
            color: white;
        }
        
        .header h1 {
            font-size: 2.2rem;
            margin-bottom: 8px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header p {
            font-size: 1rem;
            opacity: 0.9;
        }
        
        .header-actions {
            margin-top: 15px;
        }
        
        .restart-button {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }
        
        .restart-button:hover {
            background: linear-gradient(135deg, #2563eb, #1e40af);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }
        
        .restart-button:active {
            transform: translateY(0);
        }
        
        .restart-button i {
            font-size: 0.85rem;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .stat-card {
            background: #1e293b;
            border-radius: 12px;
            padding: 18px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            text-align: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            border: 1px solid #334155;
            cursor: pointer;
        }
        
        .stat-card:hover {
            transform: none;
            box-shadow: 0 15px 40px rgba(0,0,0,0.15);
        }
        
        .stat-card.success {
            border-left: 5px solid #10b981;
        }
        
        .stat-card.danger {
            border-left: 5px solid #ef4444;
        }
        
        .stat-card.warning {
            border-left: 5px solid #f59e0b;
        }
        
        .stat-card.info {
            border-left: 5px solid #3b82f6;
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .stat-label {
            font-size: 0.875rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stat-label i {
            margin-left: 6px;
            color: #94a3b8;
            cursor: help;
            font-size: 0.85rem;
        }
        
        .success .stat-number { color: #10b981; }
        .danger .stat-number { color: #ef4444; }
        .warning .stat-number { color: #f59e0b; }
        .info .stat-number { color: #3b82f6; }
        
        .charts-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 25px;
        }
        
        .stat-help {
            text-align: center;
            font-size: 0.85rem;
            color: #94a3b8;
            margin-top: -8px;
            margin-bottom: 18px;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }
        
        .modal-content {
            background-color: #1e293b;
            margin: 5% auto;
            padding: 20px;
            border: 1px solid #334155;
            border-radius: 12px;
            width: 80%;
            max-width: 600px;
            max-height: 70vh;
            overflow-y: auto;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #334155;
        }
        
        .modal-title {
            font-size: 1.3rem;
            font-weight: 600;
            color: #e2e8f0;
        }
        
        .close {
            color: #94a3b8;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            line-height: 1;
        }
        
        .close:hover {
            color: #e2e8f0;
        }
        
        .test-list {
            list-style: none;
            padding: 0;
        }
        
        .test-list-item {
            padding: 12px;
            margin: 8px 0;
            background: #334155;
            border: 1px solid #475569;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .test-list-item:hover {
            background: #475569;
            border-color: #3b82f6;
        }
        
        .test-list-item .test-name {
            font-weight: 600;
            color: #e2e8f0;
            margin-bottom: 4px;
        }
        
        .test-list-item .test-status {
            font-size: 0.875rem;
            color: #94a3b8;
        }
        
        .chart-container {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            height: 280px;
            border: 1px solid #334155;
            display: flex;
            flex-direction: column;
        }
        
        .chart-container canvas {
            flex: 1;
            max-height: 220px;
        }
        
        .chart-title {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 8px;
            color: #e2e8f0;
            text-align: center;
        }
        
        .chart-note {
            font-size: 0.8rem;
            color: #94a3b8;
            text-align: center;
            margin-bottom: 10px;
            font-style: italic;
        }
        
        .tests-section {
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
        
        .test-grid {
            display: grid;
            gap: 12px;
        }
        
        .test-card {
            background: #334155;
            border: 1px solid #475569;
            border-radius: 8px;
            padding: 15px;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .test-card:hover {
            border-color: #3b82f6;
            box-shadow: 0 5px 15px rgba(59, 130, 246, 0.2);
            background: #475569;
        }
        
        .search-container {
            margin-bottom: 20px;
        }
        
        .search-input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            background: #334155;
            border: 1px solid #475569;
            border-radius: 8px;
            padding: 0 15px;
            transition: all 0.3s ease;
        }
        
        .search-input-wrapper:focus-within {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .search-icon {
            color: #94a3b8;
            margin-right: 12px;
            font-size: 0.9rem;
        }
        
        .search-input {
            flex: 1;
            background: transparent;
            border: none;
            color: #e2e8f0;
            font-size: 1rem;
            padding: 12px 0;
            outline: none;
        }
        
        .search-input::placeholder {
            color: #94a3b8;
        }
        
        .search-stats {
            color: #94a3b8;
            font-size: 0.85rem;
            margin-left: 15px;
            white-space: nowrap;
        }
        
        .test-card.hidden {
            display: none;
        }
        
        .test-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .test-name {
            font-weight: 600;
            color: #e2e8f0;
        }
        
        .test-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
        }
        
        .status-pass { background: #065f46; color: #d1fae5; }
        .status-fail { background: #991b1b; color: #fee2e2; }
        .status-flaky { background: #92400e; color: #fef3c7; }
        
        .test-metrics {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 12px;
        }
        
        .metric {
            text-align: center;
        }
        
        .metric-value {
            font-size: 1.1rem;
            font-weight: 600;
            color: #e2e8f0;
        }
        
        .metric-label {
            font-size: 0.8rem;
            color: #94a3b8;
            margin-top: 4px;
        }
        
        .test-timeline {
            height: 35px;
            background: #475569;
            border-radius: 6px;
            overflow: hidden;
            position: relative;
            display: flex;
        }
        
        .timeline-bar {
            height: 100%;
            transition: width 0.3s ease;
            min-width: 1px;
        }
        
        .timeline-pass { background: #10b981; }
        .timeline-fail { background: #ef4444; }
        
        .loading {
            text-align: center;
            padding: 40px 20px;
            color: #94a3b8;
        }
        
        .spinner {
            border: 3px solid #475569;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            width: 35px;
            height: 35px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
            .charts-section {
                grid-template-columns: 1fr;
            }
            
            .stats-grid {
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            }
            
            .header h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="/panoptical-logo.png" alt="Panoptical Logo" style="height: 45px; margin-bottom: 15px;">
            <h1>Test Reports Server</h1>
            <p>Live Testing Analytics & Insights</p>
            <div class="header-actions">
                <button id="restart-btn" class="restart-button" onclick="refreshData()" title="Refresh page and fetch latest test data">
                    <i class="fas fa-sync-alt"></i>
                    Refresh Data
                </button>
            </div>
        </div>
        
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <p>Loading test data...</p>
        </div>
        
        <div id="dashboard" style="display: none;">
            <div class="stats-grid">
                <div class="stat-card info" onclick="showTestList('total', 'All Tests')">
                    <div class="stat-number" id="total-tests">-</div>
                    <div class="stat-label">Total Tests <i class="fas fa-info-circle" title="Unique tests found in .panoptical/runs.json (one per YAML test). Counted per test, not per run."></i></div>
                </div>
                <div class="stat-card success" onclick="showTestList('stable', 'Stable Tests')">
                    <div class="stat-number" id="passed-tests">-</div>
                    <div class="stat-label">Passed <i class="fas fa-info-circle" title="Tests currently Stable based on recent history (e.g., last 3 or 5 runs all passed)."></i></div>
                </div>
                <div class="stat-card danger" onclick="showTestList('failing', 'Failing Tests')">
                    <div class="stat-number" id="failed-tests">-</div>
                    <div class="stat-label">Failed <i class="fas fa-info-circle" title="Tests currently Failing based on recent history (e.g., recent runs mostly failed)."></i></div>
                </div>
                <div class="stat-card warning" onclick="showTestList('flaky', 'Flaky Tests')">
                    <div class="stat-number" id="flaky-tests">-</div>
                    <div class="stat-label">Flaky <i class="fas fa-info-circle" title="Tests with mixed recent results (some runs passed, some failed)."></i></div>
                </div>
            </div>
            <div class="stat-help">Counts are per test (not per run). Status reflects recent run history.</div>
            
            <!-- Test List Modal -->
            <div id="testModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title" id="modalTitle">Test List</div>
                        <span class="close" onclick="closeModal()">&times;</span>
                    </div>
                    <ul id="testList" class="test-list">
                        <!-- Test list items will be populated here -->
                    </ul>
                </div>
            </div>
            
            <div class="charts-section">
                <div class="chart-container">
                    <div class="chart-title">Test Results Overview</div>
                    <canvas id="resultsChart"></canvas>
                </div>
                <div class="chart-container">
                    <div class="chart-title">Top 20 Longest-Running Tests</div>
                    <div class="chart-note">Showing tests with longest execution times</div>
                    <canvas id="durationChart"></canvas>
                </div>
            </div>
            
            <div class="tests-section">
                <div class="section-title">
                    <i class="fas fa-list"></i>
                    Test Details
                </div>
                <div class="search-container">
                    <div class="search-input-wrapper">
                        <i class="fas fa-search search-icon"></i>
                        <input type="text" id="test-search" placeholder="Search tests by name..." class="search-input">
                        <div class="search-stats">
                            <span id="search-results-count">-</span> of <span id="total-tests-count">-</span> tests
                        </div>
                    </div>
                </div>
                <div id="test-grid" class="test-grid">
                    <!-- Test cards will be populated here -->
                </div>
            </div>
        </div>
    </div>
    
    <script>
        let testData = null;
        let resultsChart = null;
        let durationChart = null;
        
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
        
        // Determine test stability based on recent run patterns
        function determineTestStatus(testRuns) {
            if (!Array.isArray(testRuns) || testRuns.length === 0) {
                return { key: 'stable', className: 'status-pass', text: 'Stable' };
            }
            
            const sortedByTime = [...testRuns].sort((a, b) => {
                const at = typeof a.ts === 'number' ? a.ts : 0;
                const bt = typeof b.ts === 'number' ? b.ts : 0;
                return at - bt;
            });
            
            const lastThree = sortedByTime.slice(-3);
            const lastFive = sortedByTime.slice(-5);
            
            // Check recent patterns
            const lastThreeAllPass = lastThree.length >= 3 && lastThree.every(r => r.status === 'pass');
            const lastThreeAllFail = lastThree.length >= 3 && lastThree.every(r => r.status === 'fail');
            const lastFiveAllPass = lastFive.length >= 5 && lastFive.every(r => r.status === 'pass');
            
            // If last 3+ are all passes, consider stable
            if (lastThreeAllPass || lastFiveAllPass) {
                return { key: 'stable', className: 'status-pass', text: 'Stable' };
            }
            
            // If last 3+ are all fails, consider failing
            if (lastThreeAllFail) {
                return { key: 'failing', className: 'status-fail', text: 'Failing' };
            }
            
            // Check if there are recent failures (last 3 runs)
            const recentFailures = lastThree.filter(r => r.status === 'fail').length;
            const recentPasses = lastThree.filter(r => r.status === 'pass').length;
            
            // If recent failures outnumber recent passes, mark as failing
            if (recentFailures > recentPasses) {
                return { key: 'failing', className: 'status-fail', text: 'Failing' };
            }
            
            // If mixed recent results, mark as flaky
            if (recentFailures > 0 && recentPasses > 0) {
                return { key: 'flaky', className: 'status-flaky', text: 'Flaky' };
            }
            
            // Default to stable if no clear pattern
            return { key: 'stable', className: 'status-pass', text: 'Stable' };
        }
        
        async function loadTestData() {
            try {
                const response = await fetch('/api/test-data');
                testData = await response.json();
                renderDashboard();
            } catch (error) {
                console.error('Failed to load test data:', error);
                document.getElementById('loading').innerHTML = '<p style="color: #ef4444;">Failed to load test data</p>';
            }
        }
        
        function renderDashboard() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            
            renderStats();
            renderCharts();
            renderTestGrid();
            
            // Setup search functionality after dashboard is rendered
            setupSearch();
        }
        
        function renderStats() {
            const { runs, flakes } = testData;
            const testNames = Object.keys(runs);
            
            let totalTests = testNames.length;
            let passedTests = 0;
            let failedTests = 0;
            let flakyTests = 0;
            
            testNames.forEach(testName => {
                const testRuns = runs[testName];
                const status = determineTestStatus(testRuns).key;
                if (status === 'stable') passedTests++;
                else if (status === 'failing') failedTests++;
                else flakyTests++;
            });
            
            document.getElementById('total-tests').textContent = totalTests;
            document.getElementById('passed-tests').textContent = passedTests;
            document.getElementById('failed-tests').textContent = failedTests;
            document.getElementById('flaky-tests').textContent = flakyTests;
        }
        
        function renderCharts() {
            renderResultsChart();
            renderDurationChart();
        }
        
        function renderResultsChart() {
            const ctx = document.getElementById('resultsChart').getContext('2d');
            
            if (resultsChart) {
                resultsChart.destroy();
            }
            
            const { runs } = testData;
            const testNames = Object.keys(runs);
            
            let passCount = 0;
            let failCount = 0;
            let flakyCount = 0;
            
            testNames.forEach(testName => {
                const status = determineTestStatus(runs[testName]).key;
                if (status === 'stable') passCount++;
                else if (status === 'failing') failCount++;
                else flakyCount++;
            });
            
            resultsChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Passed', 'Failed', 'Flaky'],
                    datasets: [{
                        data: [passCount, failCount, flakyCount],
                        backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                        borderWidth: 2,
                        borderColor: '#1e293b'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                usePointStyle: true,
                                font: {
                                    size: 11,
                                    color: '#e2e8f0'
                                }
                            }
                        }
                    }
                }
            });
        }
        
        function renderDurationChart() {
            const ctx = document.getElementById('durationChart');
            if (!ctx) return;
            
            if (durationChart) {
                durationChart.destroy();
            }
            
            const { runs } = testData;
            const testNames = Object.keys(runs);
            
            // Get the most recent run for each test
            const recentRuns = [];
            testNames.forEach(testName => {
                const testRuns = runs[testName];
                if (testRuns.length > 0) {
                    const lastRun = testRuns[testRuns.length - 1];
                    recentRuns.push({
                        testName,
                        duration: lastRun.duration,
                        status: lastRun.status,
                        timestamp: lastRun.ts
                    });
                }
            });
            
            // Sort by duration (longest first) and take top 20
            recentRuns.sort((a, b) => b.duration - a.duration);
            const top20LongestRuns = recentRuns.slice(0, 20);
            
            try {
                durationChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: top20LongestRuns.map(r => r.testName.length > 15 ? r.testName.substring(0, 15) + '...' : r.testName),
                        datasets: [{
                            label: 'Duration',
                            data: top20LongestRuns.map(r => r.duration),
                            backgroundColor: top20LongestRuns.map(r => 
                                r.status === 'pass' ? 'rgba(16, 185, 68, 0.8)' : 'rgba(239, 68, 68, 0.8)'
                            ),
                            borderColor: top20LongestRuns.map(r => 
                                r.status === 'pass' ? '#10b981' : '#ef4444'
                            ),
                            borderWidth: 1,
                            borderRadius: 4,
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
            } catch (error) {
                console.error('Failed to render duration chart:', error);
                durationChart = null;
            }
        }
        
        function renderTestGrid() {
            const { runs, flakes } = testData;
            const testNames = Object.keys(runs);
            const testGrid = document.getElementById('test-grid');
            
            testGrid.innerHTML = '';
            
            testNames.forEach(testName => {
                const testRuns = runs[testName];
                const flakeData = flakes[testName];
                
                const statusInfo = determineTestStatus(testRuns);
                const statusClass = statusInfo.className;
                const statusText = statusInfo.text;
                
                const passRate = flakeData ? flakeData.passRate : 
                    (hasPasses && !hasFails ? 100 : 0);
                
                const avgDuration = testRuns.length > 0 ? 
                    Math.round(testRuns.reduce((sum, r) => sum + r.duration, 0) / testRuns.length) : 0;
                
                const testCard = document.createElement('div');
                testCard.className = 'test-card';
                testCard.onclick = () => showTestDetails(testName);
                testCard.setAttribute('data-test-name', testName.toLowerCase());
                
                testCard.innerHTML = 
                    '<div class="test-header">' +
                        '<div class="test-name">' + testName + '</div>' +
                        '<div class="test-status ' + statusClass + '">' + statusText + '</div>' +
                    '</div>' +
                    '<div class="test-metrics">' +
                        '<div class="metric">' +
                            '<div class="metric-value">' + testRuns.length + '</div>' +
                            '<div class="metric-label">Total Runs</div>' +
                        '</div>' +
                        '<div class="metric">' +
                            '<div class="metric-value">' + passRate + '%</div>' +
                            '<div class="metric-label">Pass Rate</div>' +
                        '</div>' +
                        '<div class="metric">' +
                            '<div class="metric-value">' + formatDuration(avgDuration) + '</div>' +
                            '<div class="metric-label">Avg Duration</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="test-timeline">' +
                        generateTimeline(testRuns) +
                    '</div>';
                
                testGrid.appendChild(testCard);
            });
            
            // Update search stats
            updateSearchStats();
        }
        
        function generateTimeline(runs) {
            if (runs.length === 0) return '';
            
            // Sort runs by timestamp to ensure chronological order
            const sortedRuns = [...runs].sort((a, b) => a.ts - b.ts);
            
            let html = '';
            sortedRuns.forEach(run => {
                const width = 100 / sortedRuns.length;
                const statusClass = run.status === 'pass' ? 'timeline-pass' : 'timeline-fail';
                html += '<div class="timeline-bar ' + statusClass + '" style="width: ' + width + '%"></div>';
            });
            return html;
        }
        
        function showTestDetails(testName) {
            // Navigate to test details page
            window.location.href = '/test/' + encodeURIComponent(testName);
        }
        
        function showTestList(status, title) {
            const modal = document.getElementById('testModal');
            const modalTitle = document.getElementById('modalTitle');
            const testList = document.getElementById('testList');
            
            modalTitle.textContent = title;
            testList.innerHTML = '';
            
            const { runs } = testData;
            const testNames = Object.keys(runs);
            
            testNames.forEach(testName => {
                const testRuns = runs[testName];
                const testStatus = determineTestStatus(testRuns);
                
                // Filter tests based on status
                if (status === 'total' || testStatus.key === status) {
                    const listItem = document.createElement('li');
                    listItem.className = 'test-list-item';
                    listItem.onclick = () => {
                        closeModal();
                        showTestDetails(testName);
                    };
                    
                    listItem.innerHTML = 
                        '<div class="test-name">' + testName + '</div>' +
                        '<div class="test-status">Status: ' + testStatus.text + '</div>';
                    
                    testList.appendChild(listItem);
                }
            });
            
            modal.style.display = 'block';
        }
        
        function closeModal() {
            const modal = document.getElementById('testModal');
            modal.style.display = 'none';
        }
        
        // Close modal when clicking outside of it
        window.onclick = function(event) {
            const modal = document.getElementById('testModal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        }
        
        // Refresh functionality
        function refreshData() {
            const button = document.getElementById('restart-btn');
            
            // Show loading state
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            button.disabled = true;
            button.style.opacity = '0.7';
            
            // Reload the page after a short delay to show the loading state
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
        
        // Search functionality
        function setupSearch() {
            const searchInput = document.getElementById('test-search');
            if (searchInput) {
                searchInput.addEventListener('input', filterTests);
                searchInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape') {
                        searchInput.value = '';
                        filterTests();
                        searchInput.blur();
                    }
                });
            }
        }
        
        function filterTests() {
            const searchTerm = document.getElementById('test-search').value.toLowerCase().trim();
            const testCards = document.querySelectorAll('.test-card');
            let visibleCount = 0;
            
            testCards.forEach(card => {
                const testName = card.getAttribute('data-test-name');
                if (searchTerm === '' || testName.includes(searchTerm)) {
                    card.classList.remove('hidden');
                    visibleCount++;
                } else {
                    card.classList.add('hidden');
                }
            });
            
            updateSearchStats(visibleCount);
        }
        
        function updateSearchStats(visibleCount = null) {
            const totalTests = document.querySelectorAll('.test-card').length;
            const visibleTests = visibleCount !== null ? visibleCount : totalTests;
            
            document.getElementById('total-tests-count').textContent = totalTests;
            document.getElementById('search-results-count').textContent = visibleTests;
            
            // Update search stats color based on results
            const searchStats = document.querySelector('.search-stats');
            if (visibleTests === 0 && document.getElementById('test-search').value.trim() !== '') {
                searchStats.style.color = '#ef4444'; // Red when no results
            } else {
                searchStats.style.color = '#94a3b8'; // Default color
            }
        }
        
        // Load data when page loads
        loadTestData();
        
        // Setup search after data loads
        document.addEventListener('DOMContentLoaded', function() {
            // Search will be set up after test data loads
        });
        
        // Refresh data every 30 seconds
        setInterval(loadTestData, 30000);
    </script>
</body>
</html>
  `;
}
