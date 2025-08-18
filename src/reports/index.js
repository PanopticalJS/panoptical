import chalk from 'chalk';
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
}
