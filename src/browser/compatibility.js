import { PanopticalBrowser } from './engine.js';

/**
 * Panoptical Browser Interface - Main interface for browser automation
 * Provides a clean API for YAML test execution
 */
export class PanopticalCompatibility {
  constructor(options = {}) {
    this.browser = new PanopticalBrowser(options);
  }

  /**
   * Launch the browser (compatible with existing parser)
   */
  async launch() {
    return await this.browser.launch();
  }

  /**
   * Create a new page (compatible with existing parser)
   */
  async newPage() {
    return await this.browser.newPage();
  }

  /**
   * Navigate to URL (compatible with existing parser)
   */
  async goto(url) {
    return await this.browser.goto(url);
  }

  /**
   * Click an element (compatible with existing parser)
   */
  async click(selector) {
    return await this.browser.click(selector);
  }

  /**
   * Type text (compatible with existing parser)
   */
  async type(selector, text) {
    return await this.browser.type(selector, text);
  }

  /**
   * Wait for selector (compatible with existing parser)
   */
  async waitForSelector(selector, timeout) {
    return await this.browser.waitForSelector(selector, timeout);
  }

  /**
   * Get text content (compatible with existing parser)
   */
  async getText(selector) {
    return await this.browser.getText(selector);
  }

  /**
   * Check if element is visible (compatible with existing parser)
   */
  async isVisible(selector) {
    return await this.browser.isVisible(selector);
  }

  /**
   * Take screenshot (compatible with existing parser)
   */
  async screenshot(path, options) {
    return await this.browser.screenshot(path, options);
  }

  /**
   * Wait for load state (compatible with existing parser)
   */
  async waitForLoadState(state) {
    return await this.browser.waitForLoadState(state);
  }

  /**
   * Execute JavaScript (compatible with existing parser)
   */
  async evaluate(script, ...args) {
    return await this.browser.evaluate(script, ...args);
  }

  /**
   * Close browser (compatible with existing parser)
   */
  async close() {
    return await this.browser.close();
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
    return this.browser.getPage();
  }

  /**
   * Save video on test failure
   */
  async saveVideoOnFailure(testName) {
    return await this.browser.saveVideoOnFailure(testName);
  }

  /**
   * Clean up video on test success
   */
  async cleanupVideoOnSuccess() {
    return await this.browser.cleanupVideoOnSuccess();
  }

  /**
   * Get video path for current test
   */
  getVideoPath() {
    return this.browser.getVideoPath();
  }
}
