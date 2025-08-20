#!/usr/bin/env node
import chalk from 'chalk';
import fs from 'fs';
import { config } from './config.js';
import { runTests } from './core/runner.js';
import { analyzeFlakes } from './flakiness/analyzer.js';
import { serveReports, showReportsHelp } from './reports/index.js';

// Get version from package.json
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packagePath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const version = packageJson.version;

const args = process.argv.slice(2);
const cmd = args[0];

// Check for version flags first
if (args.includes('--version') || args.includes('-v')) {
  console.log(version);
  process.exit(0);
}

function showHelp() {
  console.log(chalk.blue('\nPanoptical — See Everything, Test Everything'));
  console.log(chalk.cyan(`A modern testing tool that makes Playwright easy to use with simple YAML syntax (v${version})\n`));
  
  console.log(chalk.yellow('Usage:'));
  console.log(chalk.white('  panoptical <command> [options]\n'));
  
  console.log(chalk.yellow('Commands:'));
  console.log(chalk.white('  run <path>       Run tests from directory or specific YAML files'));
  console.log(chalk.white('  analyze-flakes   Analyze test flakiness'));
  console.log(chalk.white('  reports          Serve beautiful test reports dashboard'));
  console.log(chalk.white('  screenshots      List and manage screenshots'));
  console.log(chalk.white('  videos           List and manage failure videos'));
  console.log(chalk.white('  config           Manage configuration'));
  console.log(chalk.white('  help             Show this help message\n'));
  
  console.log(chalk.yellow('Options:'));
  console.log(chalk.white('  --headed         Run tests in headed mode (default)'));
  console.log(chalk.white('  --headless       Run tests in headless mode'));
  console.log(chalk.white('  --browser <type> Choose browser: chromium, firefox, webkit (default: chromium)'));
  console.log(chalk.white('  --timeout <ms>   Default timeout in milliseconds (default: 30000)'));
  console.log(chalk.white('  --retries <num>  Number of retry attempts (default: 3)'));
  console.log(chalk.white('  --video          Enable video recording (saves on failure only)'));
  console.log(chalk.white('  --auto-healing   Enable auto-healing for failed selectors (experimental)'));
  console.log(chalk.white('  --version, -v    Show version information'));
  console.log(chalk.white('  --help, -h       Show this help message\n'));
  
  console.log(chalk.yellow('Examples:'));
  console.log(chalk.white('  panoptical run tests                             # Run all tests in tests/ directory'));
  console.log(chalk.white('  panoptical run login.yaml                        # Run single test file'));
  console.log(chalk.white('  panoptical run tests --video                     # Run with video recording'));
  console.log(chalk.white('  panoptical run tests --headed --browser firefox  # Run with options\n'));
  
  console.log(chalk.yellow('Report Management:'));
  console.log(chalk.white('  panoptical reports clean orphaned                # Remove orphaned test data'));
  console.log(chalk.white('  panoptical reports clean test <name>             # Remove specific test data'));
  console.log(chalk.white('  panoptical reports clean all                     # Remove all test data'));
  console.log(chalk.white('  panoptical reports clean orphaned --force        # Remove without prompts\n'));
  
  console.log(chalk.yellow('Features:'));
  console.log(chalk.white('  Simple YAML test syntax'));
  console.log(chalk.white('  Auto-healing selectors'));
  console.log(chalk.white('  Professional CLI output'));
  console.log(chalk.white('  Playwright power made easy'));
  console.log(chalk.white('  Built-in reliability features'));
  console.log(chalk.white('  Video recording on failure'));
  console.log(chalk.white('  Test report cleanup and management'));
}

async function main() {
  try {
    switch (cmd) {
      case 'run':
        const testDir = args[1] || 'tests';
        const runOptions = parseRunOptions(args);
        console.log(chalk.blue(`\nRunning tests from: ${testDir}`));
        console.log(chalk.cyan(`Browser: ${runOptions.browser}`));
        console.log(chalk.cyan(`Mode: ${runOptions.headless ? 'headless' : 'headed'}`));
        await runTests(testDir, runOptions);
        break;
        
      case 'analyze-flakes':
        await analyzeFlakes();
        break;
        
      case 'reports':
        await handleReportsCommand(args);
        break;
        
      case 'screenshots':
        await handleScreenshotsCommand(args);
        break;
        
      case 'videos':
        await handleVideosCommand(args);
        break;
        
      case 'config':
        handleConfigCommand(args);
        break;
        
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
        
      default:
        if (cmd) {
          console.error(chalk.red(`Unknown command: ${cmd}`));
          console.log(chalk.yellow('Use "panoptical help" for available commands'));
          process.exit(1);
        } else {
          showHelp();
        }
    }
  } catch (error) {
    console.error(chalk.red('\nPanoptical encountered an error:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    
    if (error instanceof Error && error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
    
    process.exit(1);
  }
}

/**
 * Parse run command options
 * @param {string[]} args - Command line arguments
 * @returns {Object} Parsed options
 */
function parseRunOptions(args) {
  const options = { 
    browser: config.get('browser', 'chromium'),
    headless: config.get('headless', false),
    timeout: config.get('timeout', 30000),
    retries: config.get('retries', 3),
    video: config.get('video', { enabled: false, dir: 'videos', onlyOnFailure: true })
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--browser' && i + 1 < args.length) {
      options.browser = args[i + 1];
      i++; // Skip next argument
    } else if (arg === '--headless') {
      options.headless = true;
    } else if (arg === '--headed') {
      options.headless = false;
    } else if (arg === '--auto-healing') {
      options.autoHealing = { enabled: true };
    } else if (arg === '--timeout' && i + 1 < args.length) {
      options.timeout = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--retries' && i + 1 < args.length) {
      options.retries = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--video') {
      options.video.enabled = true;
    }
  }
  
  return options;
}

/**
 * Handle configuration commands
 * @param {string[]} args - Command line arguments
 */
function handleConfigCommand(args) {
  const subCommand = args[1];
  
  switch (subCommand) {
    case 'show':
      showCurrentConfig();
      break;
      
    case 'set':
      if (args.length < 4) {
        console.error(chalk.red('Usage: panoptical config set <key> <value>'));
        return;
      }
      config.set(args[2], args[3]);
      config.save();
      break;
      
    case 'create':
      config.createSample();
      break;
      
    case 'validate':
      validateConfig();
      break;
      
    default:
      console.log(chalk.blue('\nConfiguration Management'));
      console.log(chalk.blue('─'.repeat(40)));
      console.log(chalk.white('  panoptical config show              # Show current configuration'));
      console.log(chalk.white('  panoptical config set <key> <value> # Set configuration value'));
      console.log(chalk.white('  panoptical config create            # Create sample config file'));
      console.log(chalk.white('  panoptical config validate          # Validate configuration'));
      console.log(chalk.blue('\n─'.repeat(40)));
      console.log(chalk.cyan('Available keys:'));
      console.log(chalk.white('  browser      - Browser type (chromium, firefox, webkit)'));
      console.log(chalk.white('  headless     - Run in headless mode (true/false)'));
      console.log(chalk.white('  timeout      - Default timeout in milliseconds'));
      console.log(chalk.white('  retries      - Number of retry attempts'));
      console.log(chalk.white('  artifactsDir - Directory for all test artifacts'));
      console.log(chalk.white('  screenshotDir - Directory for screenshots'));
      console.log(chalk.white('  videoDir     - Directory for videos'));
      console.log(chalk.white('  logLevel     - Logging level (debug, info, warn, error)'));
      console.log(chalk.white('  video        - Video recording configuration'));
      console.log(chalk.white('    video.enabled        - Enable video recording (true/false)'));
      console.log(chalk.white('    video.dir            - Directory for videos'));
      console.log(chalk.white('    video.onlyOnFailure  - Save videos only on failure (true/false)'));
      console.log(chalk.white('    video.size           - Video dimensions (width, height)'));
      console.log(chalk.white('  autoHealing  - Auto-healing configuration'));
      console.log(chalk.white('    autoHealing.enabled  - Enable auto-healing (true/false)'));
      console.log(chalk.white('    autoHealing.strategies - Healing strategies to use'));
      console.log(chalk.white('    autoHealing.maxAttempts - Maximum healing attempts'));
  }
}

/**
 * Show current configuration
 */
function showCurrentConfig() {
  console.log(chalk.blue('\nCurrent Configuration'));
  console.log(chalk.blue('─'.repeat(40)));
  
  const allConfig = config.getAll();
  Object.entries(allConfig).forEach(([key, value]) => {
    if (key !== '_comment') {
      console.log(chalk.white(`${key}: ${chalk.cyan(value)}`));
    }
  });
  
  console.log(chalk.blue('─'.repeat(40)));
  console.log(chalk.gray(`Config file: ${config.configPath}`));
}

/**
 * Validate configuration
 */
function validateConfig() {
  console.log(chalk.blue('\nConfiguration Validation'));
  console.log(chalk.blue('─'.repeat(40)));
  
  const validation = config.validate();
  
  if (validation.valid) {
    console.log(chalk.green('Configuration is valid'));
  } else {
    console.log(chalk.red('Configuration has errors:'));
    validation.errors.forEach(error => {
      console.log(chalk.red(`  • ${error}`));
    });
  }
  
  if (validation.warnings.length > 0) {
    console.log(chalk.yellow('\nWarnings:'));
    validation.warnings.forEach(warning => {
      console.log(chalk.yellow(`  • ${warning}`));
    });
  }
}

/**
 * Handle screenshots commands
 * @param {string[]} args - Command line arguments
 */
async function handleScreenshotsCommand(args) {
  const { ScreenshotManager } = await import('./utils/screenshots.js');
  const screenshotManager = new ScreenshotManager();
  
  const subCommand = args[1];
  
  switch (subCommand) {
    case 'list':
    case undefined:
      const screenshots = screenshotManager.listScreenshots();
      if (screenshots.length === 0) {
        console.log(chalk.blue('No screenshots found'));
        return;
      }
      
      console.log(chalk.blue(`\nScreenshots (${screenshots.length} files):`));
      console.log(chalk.blue('─'.repeat(50)));
      
      screenshots.forEach(screenshot => {
        const size = (screenshot.path ? fs.statSync(screenshot.path).size : 0) / 1024;
        const date = screenshot.mtime ? screenshot.mtime.toLocaleDateString() : 'Unknown';
        const type = screenshot.type ? `[${screenshot.type}]` : '';
        console.log(chalk.white(`${screenshot.filename} ${type} (${size.toFixed(1)}KB, ${date})`));
      });
      
      console.log(chalk.blue('─'.repeat(50)));
      console.log(chalk.cyan(`Main directory: ${screenshotManager.screenshotsDir}`));
      console.log(chalk.cyan(`Success screenshots: ${screenshotManager.successDir}`));
      console.log(chalk.cyan(`Failure screenshots: ${screenshotManager.failureDir}`));
      console.log(chalk.cyan(`Step screenshots: ${screenshotManager.stepDir}`));
      break;
      
    case 'clean':
      const maxFiles = args[2] ? parseInt(args[2]) : 10; // Default to keep only 10 files
      screenshotManager.cleanOldScreenshots(maxFiles);
      break;
      
    case 'force-clean':
      screenshotManager.forceCleanup();
      break;
      
    case 'clean-old':
      const daysOld = args[2] ? parseInt(args[2]) : 1; // Default to 1 day
      screenshotManager.cleanByAge(daysOld);
      break;
      
    default:
      console.error(chalk.red(`Unknown screenshots command: ${subCommand}`));
      console.log(chalk.yellow('Available commands: list, clean, force-clean, clean-old'));
  }
}

/**
 * Handle videos commands
 * @param {string[]} args - Command line arguments
 */
async function handleVideosCommand(args) {
  const { VideoManager } = await import('./utils/videos.js');
  const videoManager = new VideoManager();

  const subCommand = args[1];

  switch (subCommand) {
    case 'list':
    case undefined:
      const videos = videoManager.listVideos();
      if (videos.length === 0) {
        console.log(chalk.blue('No videos found'));
        return;
      }

      console.log(chalk.blue(`\nVideos (${videos.length} files):`));
      console.log(chalk.blue('─'.repeat(50)));

      videos.forEach(video => {
        const filePath = videoManager.getVideoPath(video);
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024).toFixed(1);
        const date = stats.mtime.toLocaleDateString();
        console.log(chalk.white(`${video} (${size}KB, ${date})`));
      });

      console.log(chalk.blue('─'.repeat(50)));
      console.log(chalk.cyan(`Directory: ${videoManager.videosDir}`));
      break;

    case 'clean':
      const maxVideoFiles = args[2] ? parseInt(args[2]) : 10; // Default to keep only 10 files
      videoManager.cleanOldVideos(maxVideoFiles);
      break;

    case 'force-clean':
      videoManager.forceCleanup();
      break;

    case 'clean-old':
      const daysOldVideos = args[2] ? parseInt(args[2]) : 1; // Default to 1 day
      videoManager.cleanByAge(daysOldVideos);
      break;

    default:
      console.error(chalk.red(`Unknown videos command: ${subCommand}`));
      console.log(chalk.yellow('Available commands: list, clean, force-clean, clean-old'));
  }
}

/**
 * Handle reports commands
 * @param {string[]} args - Command line arguments
 */
async function handleReportsCommand(args) {
  if (args.includes('--help') || args.includes('-h')) {
    showReportsHelp();
    return;
  }
  
  // Check for cleanup subcommand
  if (args[1] === 'clean') {
    const { handleReportsCleanup } = await import('./reports/index.js');
    await handleReportsCleanup(args);
    return;
  }
  
  const options = {};
  
  // Parse port option
  const portIndex = args.indexOf('--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    const port = parseInt(args[portIndex + 1]);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error(chalk.red('❌ Invalid port number. Must be between 1 and 65535.'));
      return;
    }
    options.port = port;
  }
  
  // Parse host option
  const hostIndex = args.indexOf('--host');
  if (hostIndex !== -1 && args[hostIndex + 1]) {
    options.host = args[hostIndex + 1];
  }
  
  // Parse open option
  if (args.includes('--open')) {
    options.open = true;
  }
  
  try {
    await serveReports(options);
  } catch (error) {
    console.error(chalk.red(`❌ Failed to start reports server: ${error.message}`));
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
      console.error(chalk.red('\nUnhandled Promise Rejection:'));
  console.error(chalk.red(reason));
  process.exit(1);
});

// Run the CLI
main();
