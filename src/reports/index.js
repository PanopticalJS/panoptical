import chalk from 'chalk';
import { cleanupReports } from './cleanup.js';
import { createReportServer } from './server.js';

export async function serveReports(options = {}) {
  const port = options.port || 3000;
  const host = options.host || 'localhost';
  
  const app = createReportServer(port);
  
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, async () => {
      const url = `http://${host}:${port}`;
      
      console.log(chalk.blue('\nPanoptical Test Reports Server'));
      console.log(chalk.blue('─'.repeat(40)));
      console.log(chalk.green(`Server running at: ${chalk.underline(url)}`));
      console.log(chalk.cyan(`Dashboard: ${chalk.underline(url)}`));
      console.log(chalk.cyan(`API: ${chalk.underline(url)}/api/test-data`));
      console.log(chalk.cyan(`Test Details: ${chalk.underline(url)}/test/[test-name]`));
      console.log(chalk.blue('─'.repeat(40)));
      console.log(chalk.yellow('Press Ctrl+C to stop the server\n'));
      
      // Auto-open browser if requested
      if (options.open) {
        try {
          const { exec } = await import('child_process');
          const platform = process.platform;
          
          let command;
          if (platform === 'darwin') {
            command = 'open';
          } else if (platform === 'win32') {
            command = 'start';
          } else {
            command = 'xdg-open';
          }
          
          exec(`${command} ${url}`);
        } catch (error) {
          // Silently fail if we can't open browser
        }
      }
      
      resolve(server);
    });
    
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(chalk.red(`Port ${port} is already in use. Try a different port with --port`));
      } else {
        console.error(chalk.red(`Failed to start server: ${error.message}`));
      }
      reject(error);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\nShutting down reports server...'));
      server.close(() => {
        console.log(chalk.green('Reports server stopped'));
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', () => {
      console.log(chalk.yellow('\nShutting down reports server...'));
      server.close(() => {
        console.log(chalk.green('Reports server stopped'));
        process.exit(0);
      });
    });
  });
}

export async function handleReportsCleanup(args) {
  const subCommand = args[2];
  const force = args.includes('--force') || args.includes('--yes') || args.includes('-y');
  
  switch (subCommand) {
    case 'orphaned':
      await cleanupReports({ strategy: 'orphaned', force });
      break;
    case 'test':
      const testName = args[3];
      if (!testName) {
        console.error(chalk.red('Error: Test name required. Usage: panoptical reports clean test <test-name>'));
        process.exit(1);
      }
      await cleanupReports({ strategy: 'specific', testName, force });
      break;
    case 'all':
      await cleanupReports({ strategy: 'all', force });
      break;
    case 'help':
    default:
      showReportsCleanupHelp();
      break;
  }
}

export function showReportsHelp() {
  console.log(chalk.blue('\nPanoptical Test Reports'));
  console.log(chalk.cyan('Beautiful web-based test reporting for QA engineers\n'));
  
  console.log(chalk.yellow('Usage:'));
  console.log(chalk.white('  panoptical reports [options]\n'));
  
  console.log(chalk.yellow('Options:'));
  console.log(chalk.white('  --port <number>   Port to run server on (default: 3000)'));
  console.log(chalk.white('  --host <string>   Host to bind to (default: localhost)'));
  console.log(chalk.white('  --open            Automatically open browser'));
  console.log(chalk.white('  --help            Show this help message\n'));
  
  console.log(chalk.yellow('Examples:'));
  console.log(chalk.white('  panoptical reports                   # Start server on default port'));
  console.log(chalk.white('  panoptical reports --port 8080       # Start on port 8080'));
  console.log(chalk.white('  panoptical reports --open            # Start and open browser\n'));
  
  console.log(chalk.yellow('Features:'));
  console.log(chalk.white('  Beautiful dashboard with test statistics'));
  console.log(chalk.white('  Interactive charts and visualizations'));
  console.log(chalk.white('  Detailed test run history'));
  console.log(chalk.white('  Flakiness analysis integration'));
  console.log(chalk.white('  Responsive design for all devices'));
  console.log(chalk.white('  Real-time data updates'));
  console.log(chalk.white('  Test data cleanup and management'));
}

function showReportsCleanupHelp() {
  console.log(chalk.blue('\nPanoptical Test Reports Cleanup'));
  console.log(chalk.cyan('Clean up test reports and remove outdated data\n'));
  
  console.log(chalk.yellow('Usage:'));
  console.log(chalk.white('  panoptical reports clean <command> [options]\n'));
  
  console.log(chalk.yellow('Commands:'));
  console.log(chalk.white('  orphaned          Remove tests that no longer exist as YAML files'));
  console.log(chalk.white('  test <name>       Remove specific test from reports'));
  console.log(chalk.white('  all               Remove all test data (WARNING: destructive)'));
  console.log(chalk.white('  help              Show this help message\n'));
  
  console.log(chalk.yellow('Options:'));
  console.log(chalk.white('  --force, --yes, -y    Skip confirmation prompts\n'));
  
  console.log(chalk.yellow('Examples:'));
  console.log(chalk.white('  panoptical reports clean orphaned              # Remove orphaned tests'));
  console.log(chalk.white('  panoptical reports clean orphaned --force      # Remove without prompts'));
  console.log(chalk.white('  panoptical reports clean test login.yaml       # Remove specific test'));
  console.log(chalk.white('  panoptical reports clean test login.yaml --yes # Remove without prompts'));
  console.log(chalk.white('  panoptical reports clean all                   # Remove all test data\n'));
  
  console.log(chalk.yellow('Notes:'));
  console.log(chalk.white('  • Cleanup affects both runs.json and flakes.json'));
  console.log(chalk.white('  • Statistics will be recalculated after cleanup'));
  console.log(chalk.white('  • Use with caution - deleted data cannot be recovered'));
  console.log(chalk.white('  • Use --force to skip confirmation prompts (useful for scripts)'));
}
