import chalk from 'chalk';
import fs from 'fs';

const RUNS_FILE = '.panoptical/runs.json';
const FLAKES_FILE = '.panoptical/flakes.json';

export async function logRun(testName, status, duration, error) {
  const runs = fs.existsSync(RUNS_FILE) ? JSON.parse(fs.readFileSync(RUNS_FILE, 'utf8')) : {};
  if (!runs[testName]) runs[testName] = [];
  
  const runResult = { 
    status, 
    ts: Date.now(),
    duration,
    error
  };
  
  runs[testName].push(runResult);
  
  // Keep only last 50 runs per test
  if (runs[testName].length > 50) {
    runs[testName] = runs[testName].slice(-50);
  }
  
  fs.mkdirSync('.panoptical', { recursive: true });
  fs.writeFileSync(RUNS_FILE, JSON.stringify(runs, null, 2));
  
  // Update flakiness analysis
  await updateFlakinessAnalysis(testName, runs[testName]);
}

async function updateFlakinessAnalysis(testName, history) {
  const flakes = fs.existsSync(FLAKES_FILE) ? JSON.parse(fs.readFileSync(FLAKES_FILE, 'utf8')) : {};
  
  const totalRuns = history.length;
  const passes = history.filter(h => h.status === 'pass').length;
  const fails = history.filter(h => h.status === 'fail').length;
  const passRate = totalRuns > 0 ? passes / totalRuns : 0;
  
  // Calculate flakiness score (0-100, higher = more flaky)
  let flakinessScore = 0;
  if (totalRuns >= 3) {
    if (passes > 0 && fails > 0) {
      // Flaky test: has both passes and fails
      flakinessScore = Math.round((1 - Math.abs(passes - fails) / totalRuns) * 100);
    } else if (fails > 0) {
      // Consistently failing
      flakinessScore = 0;
    } else {
      // Consistently passing
      flakinessScore = 0;
    }
  }
  
  flakes[testName] = {
    runs: history,
    flakinessScore,
    lastRun: history[history.length - 1]?.ts || 0,
    totalRuns,
    passRate: Math.round(passRate * 100)
  };
  
  fs.writeFileSync(FLAKES_FILE, JSON.stringify(flakes, null, 2));
}

export async function analyzeFlakes() {
  if (!fs.existsSync(FLAKES_FILE)) {
    console.log(chalk.yellow('No flakiness data available. Run some tests first.'));
    return;
  }
  
  const flakes = JSON.parse(fs.readFileSync(FLAKES_FILE, 'utf8'));
  const testNames = Object.keys(flakes);
  
  if (testNames.length === 0) {
    console.log(chalk.yellow('No test data available.'));
    return;
  }
  
  console.log(chalk.blue('\n🔍 Flakiness Analysis Report\n'));
  
  // Sort by flakiness score (most flaky first)
  const sortedTests = testNames.sort((a, b) => flakes[b].flakinessScore - flakes[a].flakinessScore);
  
  for (const testName of sortedTests) {
    const data = flakes[testName];
    const { flakinessScore, totalRuns, passRate, lastRun } = data;
    
    if (flakinessScore > 0) {
      console.log(chalk.red(`🚨 [Flaky] ${testName}`));
      console.log(`   Flakiness Score: ${chalk.yellow(flakinessScore)}/100`);
      console.log(`   Pass Rate: ${chalk.cyan(passRate)}% (${totalRuns} runs)`);
      console.log(`   Last Run: ${new Date(lastRun).toLocaleString()}`);
      console.log('');
    } else if (data.runs.some(r => r.status === 'fail')) {
      console.log(chalk.red(`❌ [Failing] ${testName}`));
      console.log(`   Pass Rate: ${chalk.cyan(passRate)}% (${totalRuns} runs)`);
      console.log(`   Last Run: ${new Date(lastRun).toLocaleString()}`);
      console.log('');
    } else {
      console.log(chalk.green(`✅ [Stable] ${testName}`));
      console.log(`   Pass Rate: ${chalk.cyan(passRate)}% (${totalRuns} runs)`);
      console.log(`   Last Run: ${new Date(lastRun).toLocaleString()}`);
      console.log('');
    }
  }
  
  const flakyCount = Object.values(flakes).filter(f => f.flakinessScore > 0).length;
  const totalTests = testNames.length;
  
  console.log(chalk.blue(`\n📊 Summary: ${flakyCount}/${totalTests} tests show flakiness`));
}
