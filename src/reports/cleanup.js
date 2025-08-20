import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const RUNS_FILE = '.panoptical/runs.json';
const FLAKES_FILE = '.panoptical/flakes.json';

/**
 * Clean up test reports based on the specified strategy
 * @param {Object} options - Cleanup options
 * @param {string} options.strategy - Cleanup strategy: 'orphaned', 'specific', 'all'
 * @param {string} [options.testName] - Specific test name to remove (for 'specific' strategy)
 * @param {boolean} [options.force] - Skip confirmation prompts
 */
export async function cleanupReports(options = {}) {
  const { strategy, testName, force = false } = options;
  
  try {
    // Ensure .panoptical directory exists
    if (!fs.existsSync('.panoptical')) {
      console.log(chalk.yellow('No .panoptical directory found. Nothing to clean up.'));
      return;
    }
    
    // Load current data
    const runsData = loadJsonFile(RUNS_FILE, {});
    const flakesData = loadJsonFile(FLAKES_FILE, {});
    
    let removedTests = [];
    
    switch (strategy) {
      case 'orphaned':
        removedTests = await cleanupOrphanedTests(runsData, flakesData, force);
        break;
      case 'specific':
        if (!testName) {
          throw new Error('Test name is required for specific cleanup');
        }
        removedTests = await cleanupSpecificTest(runsData, flakesData, testName, force);
        break;
      case 'all':
        removedTests = await cleanupAllTests(runsData, flakesData, force);
        break;
      default:
        throw new Error(`Unknown cleanup strategy: ${strategy}`);
    }
    
    if (removedTests.length === 0) {
      console.log(chalk.cyan('No tests were removed.'));
      return;
    }
    
    // Save updated data
    await saveJsonFile(RUNS_FILE, runsData);
    await saveJsonFile(FLAKES_FILE, flakesData);
    
    // Show summary
    console.log(chalk.green(`\nSuccessfully cleaned up ${removedTests.length} test(s):`));
    removedTests.forEach(test => {
      console.log(chalk.white(`  • ${test}`));
    });
    
    // Recalculate and show new statistics
    await showUpdatedStatistics(runsData);
    
  } catch (error) {
    console.error(chalk.red(`\nCleanup failed: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Remove tests that no longer exist as YAML files
 */
async function cleanupOrphanedTests(runsData, flakesData, force = false) {
  console.log(chalk.blue('\nScanning for orphaned tests...'));
  
  const existingTests = await getExistingTestFiles();
  const reportedTests = Object.keys(runsData);
  const orphanedTests = reportedTests.filter(test => !existingTests.includes(test));
  
  if (orphanedTests.length === 0) {
    console.log(chalk.cyan('No orphaned tests found.'));
    return [];
  }
  
  console.log(chalk.yellow(`Found ${orphanedTests.length} orphaned test(s):`));
  orphanedTests.forEach(test => {
    console.log(chalk.white(`  • ${test}`));
  });
  
  // Ask for confirmation unless force flag is set
  if (!force) {
    const confirmed = await askForConfirmation(
      `\nDo you want to remove these ${orphanedTests.length} orphaned test(s)? (y/N)`
    );
    
    if (!confirmed) {
      console.log(chalk.cyan('Cleanup cancelled.'));
      return [];
    }
  }
  
  // Remove orphaned tests
  orphanedTests.forEach(test => {
    delete runsData[test];
    delete flakesData[test];
  });
  
  return orphanedTests;
}

/**
 * Remove a specific test from reports
 */
async function cleanupSpecificTest(runsData, flakesData, testName, force = false) {
  console.log(chalk.blue(`\nRemoving specific test: ${testName}`));
  
  if (!runsData[testName] && !flakesData[testName]) {
    console.log(chalk.yellow(`Test '${testName}' not found in reports.`));
    return [];
  }
  
  // Show test details before removal
  const runCount = runsData[testName]?.length || 0;
  const flakeData = flakesData[testName];
  
  console.log(chalk.white(`  • Test runs: ${runCount}`));
  if (flakeData) {
    console.log(chalk.white(`  • Flakiness data: Available`));
  }
  
  // Ask for confirmation unless force flag is set
  if (!force) {
    const confirmed = await askForConfirmation(
      `\nDo you want to remove '${testName}' and all its ${runCount} run(s)? (y/N)`
    );
    
    if (!confirmed) {
      console.log(chalk.cyan('Cleanup cancelled.'));
      return [];
    }
  }
  
  // Remove the test
  delete runsData[testName];
  delete flakesData[testName];
  
  return [testName];
}

/**
 * Remove all test data (destructive operation)
 */
async function cleanupAllTests(runsData, flakesData, force = false) {
  console.log(chalk.red('\nWARNING: This will remove ALL test data!'));
  
  const totalTests = Object.keys(runsData).length;
  const totalRuns = Object.values(runsData).reduce((sum, runs) => sum + runs.length, 0);
  
  console.log(chalk.white(`  • Total tests: ${totalTests}`));
  console.log(chalk.white(`  • Total runs: ${totalRuns}`));
  console.log(chalk.white(`  • Flakiness data: ${Object.keys(flakesData).length} tests`));
  
  // Ask for confirmation with stronger warning unless force flag is set
  if (!force) {
    const confirmed = await askForConfirmation(
      `\nAre you ABSOLUTELY sure you want to delete ALL test data? This cannot be undone! (yes/NO)`,
      'yes'
    );
    
    if (!confirmed) {
      console.log(chalk.cyan('Cleanup cancelled.'));
      return [];
    }
  }
  
  // Clear all data
  const removedTests = Object.keys(runsData);
  Object.keys(runsData).forEach(key => delete runsData[key]);
  Object.keys(flakesData).forEach(key => delete flakesData[key]);
  
  return removedTests;
}

/**
 * Get list of existing test YAML files (recursively searches subdirectories)
 */
async function getExistingTestFiles() {
  const testsDir = 'tests';
  if (!fs.existsSync(testsDir)) {
    return [];
  }
  
  try {
    const testFiles = [];
    
    function scanDirectory(dir) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Recursively scan subdirectories
          scanDirectory(fullPath);
        } else if (item.endsWith('.yaml') || item.endsWith('.yml')) {
          // Add test file (just the filename, not the full path)
          testFiles.push(item);
        }
      }
    }
    
    scanDirectory(testsDir);
    return testFiles;
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not read tests directory: ${error.message}`));
    return [];
  }
}

/**
 * Load JSON file safely
 */
function loadJsonFile(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not parse ${filePath}: ${error.message}`));
  }
  return defaultValue;
}

/**
 * Save JSON file safely
 */
async function saveJsonFile(filePath, data) {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file with pretty formatting
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    throw new Error(`Failed to save ${filePath}: ${error.message}`);
  }
}

/**
 * Ask for user confirmation
 */
async function askForConfirmation(message, expectedAnswer = 'y') {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(message + ' ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === expectedAnswer.toLowerCase());
    });
  });
}

/**
 * Show updated statistics after cleanup
 */
async function showUpdatedStatistics(runsData) {
  const totalTests = Object.keys(runsData).length;
  const totalRuns = Object.values(runsData).reduce((sum, runs) => sum + runs.length, 0);
  
  if (totalTests === 0) {
    console.log(chalk.cyan('\nAll test data has been removed.'));
    return;
  }
  
  const passedRuns = Object.values(runsData).reduce((sum, runs) => 
    sum + runs.filter(r => r.status === 'pass').length, 0
  );
  const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0;
  
  console.log(chalk.blue('\nUpdated Statistics:'));
  console.log(chalk.white(`  • Total tests: ${totalTests}`));
  console.log(chalk.white(`  • Total runs: ${totalRuns}`));
  console.log(chalk.white(`  • Pass rate: ${passRate}%`));
}
