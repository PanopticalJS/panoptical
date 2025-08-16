import fs from 'fs';
import path from 'path';

/**
 * Screenshot management utility
 */
export class ScreenshotManager {
  constructor() {
    this.artifactsDir = './artifacts';
    this.screenshotsDir = './artifacts/screenshots';
    this.successDir = './artifacts/screenshots/success';
    this.failureDir = './artifacts/screenshots/failure';
    this.stepDir = './artifacts/screenshots/steps';
    this.ensureScreenshotsDir();
  }

  /**
   * Ensure screenshots directory exists
   */
  ensureScreenshotsDir() {
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
    if (!fs.existsSync(this.successDir)) {
      fs.mkdirSync(this.successDir, { recursive: true });
    }
    if (!fs.existsSync(this.failureDir)) {
      fs.mkdirSync(this.failureDir, { recursive: true });
    }
    if (!fs.existsSync(this.stepDir)) {
      fs.mkdirSync(this.stepDir, { recursive: true });
    }
  }

  /**
   * Generate screenshot filename with timestamp
   */
  generateFilename(prefix = 'screenshot', type = 'success') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}-${type}-${timestamp}.png`;
  }

  /**
   * Generate test-specific failure screenshot filename
   * This will be overwritten each time the same test fails
   */
  generateTestFailureFilename(testName) {
    // Clean the test name for filename safety
    const cleanName = testName
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    
    return `${cleanName}-failure.png`;
  }

  /**
   * Generate test-specific success screenshot filename
   */
  generateTestSuccessFilename(testName, stepName = '') {
    const cleanName = testName
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    
    const cleanStep = stepName
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    
    if (cleanStep) {
      return `${cleanName}-${cleanStep}-success.png`;
    }
    return `${cleanName}-success.png`;
  }

  /**
   * Get full path for screenshot
   */
  getScreenshotPath(filename) {
    return path.join(this.screenshotsDir, filename);
  }

  /**
   * Get path for step screenshots (manual screenshots taken during test)
   */
  getStepScreenshotPath(filename) {
    return path.join(this.stepDir, filename);
  }

  /**
   * Get path for failure screenshots (automatic on test failure)
   */
  getFailureScreenshotPath(filename) {
    return path.join(this.failureDir, filename);
  }

  /**
   * Get path for success screenshots (final state, etc.)
   */
  getSuccessScreenshotPath(filename) {
    return path.join(this.successDir, filename);
  }

  /**
   * List all screenshots
   */
  listScreenshots() {
    const allScreenshots = [];
    
    // Check each directory for screenshots
    const directories = [this.screenshotsDir, this.successDir, this.failureDir, this.stepDir];
    
    directories.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const screenshots = files
          .filter(file => file.endsWith('.png'))
          .map(file => ({
            filename: file,
            path: path.join(dir, file),
            type: path.basename(dir),
            mtime: fs.statSync(path.join(dir, file)).mtime
          }));
        allScreenshots.push(...screenshots);
      }
    });
    
    return allScreenshots;
  }

  /**
   * Clean old screenshots (keep last N files)
   */
  cleanOldScreenshots(maxFiles = 50) {
    const screenshots = this.listScreenshots();
    if (screenshots.length <= maxFiles) {
      return;
    }

    // Screenshots already have path and mtime from listScreenshots
    const sortedScreenshots = screenshots
      .sort((a, b) => a.mtime - b.mtime);

    const screenshotsToRemove = sortedScreenshots.slice(0, screenshots.length - maxFiles);
    
    screenshotsToRemove.forEach(screenshot => {
      try {
        fs.unlinkSync(screenshot.path);
        console.log(`Removed: ${screenshot.filename} [${screenshot.type}]`);
      } catch (error) {
        console.warn(`Could not remove screenshot ${screenshot.filename}: ${error.message}`);
      }
    });

    console.log(`Cleaned up ${screenshotsToRemove.length} old screenshots`);
  }

  /**
   * Force cleanup - remove all screenshots
   */
  forceCleanup() {
    const files = this.listScreenshots();
    if (files.length === 0) {
      console.log('No screenshots to clean');
      return;
    }

    files.forEach(file => {
      try {
        fs.unlinkSync(file.path);
        console.log(`Removed: ${file.filename} [${file.type}]`);
      } catch (error) {
        console.warn(`Could not remove screenshot ${file.filename}: ${error.message}`);
      }
    });
    
    console.log(`Force cleaned ${files.length} screenshots`);
  }

  /**
   * Clean screenshots older than N days
   */
  cleanByAge(daysOld = 7) {
    const files = this.listScreenshots();
    if (files.length === 0) {
      console.log('No screenshots to clean');
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // Files already have mtime from listScreenshots
    const filesToRemove = files.filter(file => file.mtime < cutoffDate);

    if (filesToRemove.length === 0) {
      console.log(`No screenshots older than ${daysOld} days`);
      return;
    }

    filesToRemove.forEach(file => {
      try {
        fs.unlinkSync(file.path);
        console.log(`Removed old screenshot: ${file.filename} [${file.type}]`);
      } catch (error) {
        console.warn(`Could not remove screenshot ${file.filename}: ${error.message}`);
      }
    });
    
    console.log(`Cleaned ${filesToRemove.length} screenshots older than ${daysOld} days`);
  }
}
