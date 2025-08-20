import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { logRun } from '../flakiness/analyzer.js';
import { runDeclarativeTest } from './parser.js';

/**
 * Convert milliseconds to human-readable format
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time string
 */
function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = ms / 1000;
  
  if (seconds < 60) {
    // Show seconds with 1 decimal place for precision
    return `${seconds.toFixed(1)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds < 1) {
    return `${minutes}m`;
  }
  
  // Show minutes and seconds with 1 decimal place
  return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
}

export async function runTests(dir, options = {}) {
  if (!fs.existsSync(dir)) {
    console.error(chalk.red(`❌ Test path not found: ${dir}`));
    return;
  }
  
  const stats = fs.statSync(dir);
  let testFiles = [];
  
  if (stats.isDirectory()) {
    // Directory mode - run all YAML files
    const files = fs.readdirSync(dir);
    testFiles = files.filter(f => f.endsWith('.yaml')).map(f => path.join(dir, f));
    
    if (testFiles.length === 0) {
      console.log(chalk.yellow(`No YAML test files found in ${dir}`));
      console.log(chalk.blue(`Note: JavaScript test support is available for imperative tests`));
      return;
    }
    
    console.log(chalk.blue(`\nRunning ${testFiles.length} YAML tests from ${dir}\n`));
  } else if (stats.isFile() && dir.endsWith('.yaml')) {
    // Single file mode
    testFiles = [dir];
    console.log(chalk.blue(`\nRunning single test file: ${path.basename(dir)}\n`));
  } else {
    console.error(chalk.red(`Invalid test path: ${dir}. Must be a directory or YAML file.`));
    return;
  }
  
  let passed = 0;
  let failed = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < testFiles.length; i++) {
    const file = testFiles[i];
    const fileName = path.basename(file);
    const testStartTime = Date.now();
    
    try {
      console.log(chalk.cyan(`Running ${fileName}...`));
      await runDeclarativeTest(file, options);
      
      const duration = Date.now() - testStartTime;
      await logRun(fileName, 'pass', duration);
      console.log(`${fileName} passed (${formatDuration(duration)})`);
      passed++;
      
    } catch (err) {
      const duration = Date.now() - testStartTime;
      const errorMessage = err instanceof Error ? err.message : String(err);
      const screenshotInfo = err.screenshotInfo || null;
      await logRun(fileName, 'fail', duration, errorMessage, screenshotInfo);
      
      console.error(chalk.red(`Test: ${fileName} failed`));
      console.error(chalk.red(`${errorMessage}`));
      
      // Display screenshot and video info if available
      if (err.screenshotInfo) {
        console.error(chalk.yellow('Screenshot is saved to artifacts'));
      }
      if (err.videoInfo) {
        console.error(chalk.yellow(err.videoInfo));
      }
      
      console.error(chalk.grey(`Duration: ${formatDuration(duration)}`));
      failed++;
    }
    
    console.log(''); // Empty line for readability
  }
  
  const totalDuration = Date.now() - startTime;
  console.log(chalk.blue('Test Results Summary'));
  console.log(chalk.blue('─'.repeat(30)));
  console.log(chalk.green(`Passed: ${passed}`));
  console.log(chalk.red(`Failed: ${failed}`));
  console.log(chalk.blue(`Total Time: ${formatDuration(totalDuration)}`));
  console.log(chalk.blue(`Test Directory: ${dir}`));
  
  if (failed > 0) {
    process.exit(1); // Exit with error code for CI/CD
  }
}
