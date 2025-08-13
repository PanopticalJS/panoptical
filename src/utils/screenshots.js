import fs from 'fs';
import path from 'path';

/**
 * Screenshot management utility
 */
export class ScreenshotManager {
  constructor() {
    this.artifactsDir = './artifacts';
    this.screenshotsDir = './artifacts/screenshots';
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
   * List all screenshots
   */
  listScreenshots() {
    if (!fs.existsSync(this.screenshotsDir)) {
      return [];
    }
    
    const files = fs.readdirSync(this.screenshotsDir);
    return files.filter(file => file.endsWith('.png'));
  }

  /**
   * Clean old screenshots (keep last N files)
   */
  cleanOldScreenshots(maxFiles = 50) {
    const screenshots = this.listScreenshots();
    if (screenshots.length <= maxFiles) {
      return;
    }

    const sortedScreenshots = screenshots
      .map(filename => ({
        filename,
        path: this.getScreenshotPath(filename),
        mtime: fs.statSync(this.getScreenshotPath(filename)).mtime
      }))
      .sort((a, b) => a.mtime - b.mtime);

    const screenshotsToRemove = sortedScreenshots.slice(0, screenshots.length - maxFiles);
    
    screenshotsToRemove.forEach(screenshot => {
      try {
        fs.unlinkSync(screenshot.path);
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
      const filePath = path.join(this.screenshotsDir, file);
      fs.unlinkSync(filePath);
      console.log(`Removed: ${file}`);
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
    
    const filesToRemove = files.filter(file => {
      const filePath = path.join(this.screenshotsDir, file);
      const stats = fs.statSync(filePath);
      return stats.mtime < cutoffDate;
    });

    if (filesToRemove.length === 0) {
      console.log(`No screenshots older than ${daysOld} days`);
      return;
    }

    filesToRemove.forEach(file => {
      const filePath = path.join(this.screenshotsDir, file);
      fs.unlinkSync(filePath);
      console.log(`Removed old screenshot: ${file}`);
    });
    
    console.log(`Cleaned ${filesToRemove.length} screenshots older than ${daysOld} days`);
  }
}
