import chalk from 'chalk';
import { chromium, firefox, webkit } from 'playwright';
import { SelectorHealer } from '../healing/healer.js';

/**
 * Panoptical Browser Engine - Real browser automation without the complexity
 * Powerful, unified browser control for modern web testing
 */
export class PanopticalBrowser {
  constructor(options = {}) {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.options = {
      browser: options.browser || 'chromium', // chromium, firefox, webkit
      headless: options.headless !== undefined ? options.headless : false,
      slowMo: options.slowMo || 0,
      timeout: options.timeout || 30000,
      viewport: options.viewport || { width: 1280, height: 720 },
      video: options.video || { enabled: false, dir: 'videos', onlyOnFailure: true },
      ...options
    };
    
    this.browserType = this.getBrowserType();
  }

  /**
   * Get the appropriate browser type
   */
  getBrowserType() {
    switch (this.options.browser.toLowerCase()) {
      case 'firefox':
        return firefox;
      case 'webkit':
        return webkit;
      case 'chromium':
      default:
        return chromium;
    }
  }

  /**
   * Launch the browser with real automation
   */
  async launch() {
    try {
      console.log(`Launching ${this.options.browser} browser...`);
      
      this.browser = await this.browserType.launch({
        headless: this.options.headless,
        slowMo: this.options.slowMo,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      // Create context with video recording if enabled
      if (this.options.video.enabled) {
        this.context = await this.browser.newContext({
          recordVideo: {
            dir: this.options.video.dir,
            size: this.options.video.size || { width: 1280, height: 720 }
          }
        });
      } else {
        this.context = await this.browser.newContext();
      }

      if (!this.options.headless) {
        console.log('Browser running in headed mode');
      } else {
        console.log('Browser running in headless mode');
      }

      console.log(`Browser ${this.options.browser} launched successfully`);
    } catch (error) {
      console.error(`Failed to launch browser: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new page/tab
   */
  async newPage() {
    if (!this.browser) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    if (this.context) {
      this.page = await this.context.newPage();
    } else {
      this.page = await this.browser.newPage();
    }
    
    // Set default timeout
    this.page.setDefaultTimeout(this.options.timeout);
    
    // Set viewport
    await this.page.setViewportSize(this.options.viewport);
    
    // Store video path if recording is enabled
    if (this.options.video.enabled && this.context) {
      // Get video path from context (not from page)
      try {
        // The video path is available from the context, not the page
        // We'll get it when we need to save
      } catch (error) {
        console.warn(chalk.yellow(`Could not setup video recording: ${error.message}`));
      }
    }
    
    console.log('New page created');
    return this.page;
  }

  /**
   * Navigate to a URL
   */
  async goto(url, options = {}) {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    try {
      await this.page.goto(url, {
        waitUntil: options.waitUntil || 'networkidle',
        timeout: options.timeout || this.options.timeout
      });
    } catch (error) {
      console.error(`Navigation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Click an element with auto-healing
   */
  async click(selector, options = {}) {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    try {
      await this.page.click(selector, options);
    } catch (error) {
      // Check if auto-healing is enabled
      if (!this.options.autoHealing?.enabled) {
        throw error; // Auto-healing disabled, throw original error
      }

      // Try auto-healing the selector
      console.log(`  Click failed, attempting auto-healing...`);
      const healer = new SelectorHealer(this.page, this.options.autoHealing);
      const healedSelector = await healer.healSelector(selector, 'click');
      
      if (healedSelector) {
        try {
          await this.page.click(healedSelector, options);
          console.log(`  Click succeeded with healed selector: ${healedSelector}`);
        } catch (healedError) {
          console.error(`  Auto-healing failed: ${healedError.message}`);
          throw error; // Throw original error
        }
      } else {
        throw error; // No healing possible, throw original error
      }
    }
  }

  /**
   * Fill text into an element with auto-healing (fast form filling)
   */
  async fill(selector, text, options = {}) {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    try {
      await this.page.fill(selector, text, options);
    } catch (error) {
      // Check if auto-healing is enabled
      if (!this.options.autoHealing?.enabled) {
        throw error; // Auto-healing disabled, throw original error
      }

      // Try auto-healing the selector
      console.log(`  Fill failed, attempting auto-healing...`);
      const healer = new SelectorHealer(this.page, this.options.autoHealing);
      const healedSelector = await healer.healSelector(selector, 'fill');
      
      if (healedSelector) {
        try {
          await this.page.fill(healedSelector, text, options);
          console.log(`  Fill succeeded with healed selector: ${healedSelector}`);
        } catch (healedError) {
          console.error(`  Auto-healing failed: ${healedError.message}`);
          throw error; // Throw original error
        }
      } else {
        throw error; // No healing possible, throw original error
      }
    }
  }

  /**
   * Type text into an element with realistic delays (slow typing simulation)
   */
  async type(selector, text, options = {}) {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    const delay = options.delay || 100; // Default 100ms delay between characters

    try {
      await this.page.type(selector, text, { delay });
    } catch (error) {
      // Check if auto-healing is enabled
      if (!this.options.autoHealing?.enabled) {
        throw error; // Auto-healing disabled, throw original error
      }

      // Try auto-healing the selector
      console.log(`  Type failed, attempting auto-healing...`);
      const healer = new SelectorHealer(this.page, this.options.autoHealing);
      const healedSelector = await healer.healSelector(selector, 'type');
      
      if (healedSelector) {
        try {
          await this.page.type(healedSelector, text, { delay });
          console.log(`  Type succeeded with healed selector: ${healedSelector}`);
        } catch (healedError) {
          console.error(`  Auto-healing failed: ${healedError.message}`);
          throw error; // Throw original error
        }
      } else {
        throw error; // No healing possible, throw original error
      }
    }
  }



  /**
   * Select option from dropdown with auto-healing
   */
    async selectOption(selector, value, options = {}) {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    try {
      await this.page.selectOption(selector, value, options);
    } catch (error) {
      // Check if auto-healing is enabled
      if (!this.options.autoHealing?.enabled) {
        throw error; // Auto-healing disabled, throw original error
      }

      // Try auto-healing the selector
      console.log(`  Select option failed, attempting auto-healing...`);
      const healer = new SelectorHealer(this.page, this.options.autoHealing);
      const healedSelector = await healer.healSelector(selector, 'select');
      
      if (healedSelector) {
        try {
          await this.page.selectOption(healedSelector, value, options);
          console.log(`  Select option succeeded with healed selector: ${healedSelector}`);
        } catch (healedError) {
          console.error(`  Auto-healing failed: ${healedError.message}`);
          throw error; // Throw original error
        }
      } else {
        throw error; // No healing possible, throw original error
      }
    }
  }

  /**
   * Wait for an element to appear with auto-healing
   */
  async waitForSelector(selector, timeout = null) {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    const waitTimeout = timeout || this.options.timeout;
    
    try {
      await this.page.waitForSelector(selector, { timeout: waitTimeout });
    } catch (error) {
      // Check if auto-healing is enabled
      if (!this.options.autoHealing?.enabled) {
        throw error; // Auto-healing disabled, throw original error
      }

      // Try auto-healing the selector
      console.log(`  Wait failed, attempting auto-healing...`);
      const healer = new SelectorHealer(this.page, this.options.autoHealing);
      const healedSelector = await healer.healSelector(selector, 'wait');
      
      if (healedSelector) {
        try {
          await this.page.waitForSelector(healedSelector, { timeout: waitTimeout });
          console.log(`  Wait succeeded with healed selector: ${healedSelector}`);
        } catch (healedError) {
          console.error(`  Auto-healing failed: ${healedError.message}`);
          throw error; // Throw original error
        }
      } else {
        throw error; // No healing possible, throw original error
      }
    }
  }

  /**
   * Get text content from an element
   */
  async getText(selector) {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    try {
      const text = await this.page.textContent(selector);
      return text;
    } catch (error) {
      console.error(`Failed to get text from ${selector}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector) {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    try {
      const isVisible = await this.page.isVisible(selector);
      return isVisible;
    } catch (error) {
      console.error(`Failed to check visibility of ${selector}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(path, options = {}) {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    try {
      if (path) {
        // Save to file if path is provided
        await this.page.screenshot({
          path,
          fullPage: options.fullPage || false,
          ...options
        });
      }
      
      // Always return the screenshot as a buffer
      const buffer = await this.page.screenshot({
        fullPage: options.fullPage || false,
        ...options
      });
      
      return buffer;
    } catch (error) {
      console.error(`Screenshot failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Wait for page to load
   */
  async waitForLoadState(state = 'networkidle') {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    try {
      await this.page.waitForLoadState(state);
    } catch (error) {
      console.error(`Load state wait failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute JavaScript in the page
   */
  async evaluate(script, ...args) {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    try {
      const result = await this.page.evaluate(script, ...args);
      console.log(chalk.green(`JavaScript executed successfully`));
      return result;
    } catch (error) {
      console.error(`JavaScript execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Hover over an element
   */
  async hover(selector) {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    try {
      await this.page.hover(selector);
      return true;
    } catch (error) {
      console.error(`Hover failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set input files for file upload
   */
  async setInputFiles(selector, filePath) {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    try {
      await this.page.setInputFiles(selector, filePath);
      return true;
    } catch (error) {
      console.error(`Set input files failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Wait for a specific event
   */
  async waitForEvent(event, options = {}) {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    try {
      const result = await this.page.waitForEvent(event, options);
      return result;
    } catch (error) {
      console.error(`Wait for event failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a locator for counting elements
   */
  locator(selector) {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    try {
      return this.page.locator(selector);
    } catch (error) {
      console.error(`Locator failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Access page request for API testing
   */
  get request() {
    if (!this.page) {
      throw new Error('Page not created. Call newPage() first.');
    }

    try {
      return this.page.request;
    } catch (error) {
      console.error(`Request access failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Close the browser
   */
  async close() {
    if (this.browser) {
      // Don't log browser closing - keep it silent
      await this.browser.close();
      this.browser = null;
      this.page = null;
      // Don't log browser closed - keep it silent
    }
  }

  /**
   * Get the underlying browser engine for advanced operations
   */
  getBrowser() {
    return this.browser;
  }

  /**
   * Get the page object for advanced operations
   */
  getPage() {
    return this.page;
  }

  /**
   * Save video on test failure
   */
  async saveVideoOnFailure(testName) {
    if (!this.options.video.enabled || !this.context) {
      return null;
    }
    
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const failureDir = `${this.options.video.dir}/failures`;
      if (!fs.existsSync(failureDir)) {
        fs.mkdirSync(failureDir, { recursive: true });
      }
      
      const failureVideoPath = path.join(failureDir, `${testName.toLowerCase().replace(/\s+/g, '_')}-failure.mp4`);
      
      // Instead of slow video.saveAs(), we'll copy the file directly
      // First, close the context to finalize the video
      await this.context.close();
      
      // Wait a moment for video file to be written
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Look for the video file in the videos directory
      const videoFiles = fs.readdirSync(this.options.video.dir)
        .filter(f => f.endsWith('.webm') || f.endsWith('.mp4'))
        .filter(f => !f.includes('failures'));
      
      if (videoFiles.length > 0) {
        const videoFile = videoFiles[0]; // Get the first video file
        const sourcePath = path.join(this.options.video.dir, videoFile);
        
        // Check if video file is complete
        const stats = fs.statSync(sourcePath);
        if (stats.size > 1024) {
          // Copy video to failures directory
          fs.copyFileSync(sourcePath, failureVideoPath);
          console.log(chalk.yellow(`Failure video saved: ${failureVideoPath}`));
          console.log(chalk.green(`Video file size: ${(stats.size / 1024).toFixed(1)}KB`));
          
          // Remove the original temporary video
          fs.unlinkSync(sourcePath);
          
          return failureVideoPath;
        } else {
          console.warn(chalk.yellow('Video file too small, may not be complete'));
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.warn(chalk.yellow(`Could not save failure video: ${error.message}`));
      return null;
    }
  }

  /**
   * Clean up video on test success
   */
  async cleanupVideoOnSuccess() {
    if (!this.options.video.enabled || !this.context) {
      return;
    }
    
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Close the context to finalize video recording
      await this.context.close();
      
      // Wait a moment for video file to be written
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Look for temporary video files and remove them
      const videoFiles = fs.readdirSync(this.options.video.dir)
        .filter(f => f.endsWith('.webm') || f.endsWith('.mp4'))
        .filter(f => !f.includes('failures'));
      
      // Remove all temporary video files
      videoFiles.forEach(videoFile => {
        try {
          const videoPath = path.join(this.options.video.dir, videoFile);
          if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
          }
        } catch (error) {
          console.warn(chalk.yellow(`Could not remove temporary video ${videoFile}: ${error.message}`));
        }
      });
      
    } catch (error) {
      console.warn(chalk.yellow(`Could not handle video cleanup: ${error.message}`));
    }
  }

  /**
   * Get video path for current test
   */
  getVideoPath() {
    return null; // videoPath property removed, so return null
  }
}