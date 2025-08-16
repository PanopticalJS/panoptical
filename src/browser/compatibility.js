import { ActionHelpers } from './action-helpers.js';
import { PanopticalBrowser } from './engine.js';

/**
 * Panoptical Browser Interface - Main interface for browser automation
 * Provides a clean API for YAML test execution
 */
export class PanopticalCompatibility {
  constructor(options = {}) {
    this.browser = new PanopticalBrowser(options);
    this.actions = null; // Will be initialized after browser launch
  }

  /**
   * Launch the browser (compatible with existing parser)
   */
  async launch() {
    const result = await this.browser.launch();
    // Initialize action helpers after browser is launched
    this.actions = new ActionHelpers(this.browser);
    return result;
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
   * Select option from dropdown (compatible with existing parser)
   */
  async selectOption(selector, value) {
    return await this.browser.selectOption(selector, value);
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
   * Hover over an element
   */
  async hover(selector) {
    return await this.browser.hover(selector);
  }

  /**
   * Set input files for file upload
   */
  async setInputFiles(selector, filePath) {
    return await this.browser.setInputFiles(selector, filePath);
  }

  /**
   * Wait for a specific event
   */
  async waitForEvent(event, options) {
    return await this.browser.waitForEvent(event, options);
  }

  /**
   * Get a locator for counting elements
   */
  locator(selector) {
    return this.browser.locator(selector);
  }

  /**
   * Access page request for API testing
   */
  get request() {
    return this.browser.request;
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

  /**
   * login - Logs in with username/password
   */
  async login(credentials) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.login(credentials);
  }

  /**
   * logout - Logs out and verifies redirect
   */
  async logout(logoutSelector, loginPageIndicator) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.logout(logoutSelector, loginPageIndicator);
  }

  /**
   * goto_with_auth - Navigates with auth token
   */
  async gotoWithAuth(url, authToken, tokenHeader) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.gotoWithAuth(url, authToken, tokenHeader);
  }

  /**
   * click_if_visible - Clicks only if visible
   */
  async clickIfVisible(selector, options) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.clickIfVisible(selector, options);
  }

  /**
   * select_from_dropdown - Selects dropdown option by text
   */
  async selectFromDropdown(selector, optionText, options) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.selectFromDropdown(selector, optionText, options);
  }

  /**
   * hover_and_click - Hover then click submenu
   */
  async hoverAndClick(hoverSelector, clickSelector, options) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.hoverAndClick(hoverSelector, clickSelector, options);
  }

  /**
   * upload_file - Uploads and verifies file
   */
  async uploadFile(fileInputSelector, filePath, successIndicator, uploadButtonSelector = null) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.uploadFile(fileInputSelector, filePath, successIndicator, uploadButtonSelector);
  }

  /**
   * download_and_verify - Downloads and verifies file
   */
  async downloadAndVerify(downloadSelector, expectedSize, expectedContent) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.downloadAndVerify(downloadSelector, expectedSize, expectedContent);
  }

  /**
   * take_screenshot - Takes named screenshot
   */
  async takeScreenshot(name, options) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.takeScreenshot(name, options);
  }

  /**
   * verify_table_row - Verifies table contains specific row
   */
  async verifyTableRow(tableSelector, expectedRow) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.verifyTableRow(tableSelector, expectedRow);
  }

  /**
   * assert_element_count - Asserts element count
   */
  async assertElementCount(selector, expectedCount, operator) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.assertElementCount(selector, expectedCount, operator);
  }

  /**
   * check_api_response - Checks API response
   */
  async checkApiResponse(url, method, headers, body, expectedStatus, expectedContent) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.checkApiResponse(url, method, headers, body, expectedStatus, expectedContent);
  }

  /**
   * assert_element_not_present - Asserts element doesn't exist
   */
  async assertElementNotPresent(selector, timeout) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.assertElementNotPresent(selector, timeout);
  }

  /**
   * measure_performance - Measures performance
   */
  async measurePerformance(action, options) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.measurePerformance(action, options);
  }

  /**
   * repeat - Repeats steps
   */
  async repeat(steps, count, options) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.repeat(steps, count, options);
  }

  /**
   * run_if - Runs steps conditionally
   */
  async runIf(condition, steps, options) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.runIf(condition, steps, options);
  }

  /**
   * store_text - Stores text in variable
   */
  async storeText(selector, variableName) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.storeText(selector, variableName);
  }

  /**
   * compare_values - Compares values
   */
  async compareValues(value1, value2, operator, options) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.compareValues(value1, value2, operator, options);
  }

  /**
   * random_fill - Fills form with random data
   */
  async randomFill(formData) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.randomFill(formData);
  }

  // ===== Mobile & Responsive Testing =====

  /**
   * resize_viewport - Resizes viewport for responsive testing
   */
  async resizeViewport(width, height, device) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.resizeViewport(width, height, device);
  }

  /**
   * swipe - Performs swipe gesture
   */
  async swipe(selector, direction, distance) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.swipe(selector, direction, distance);
  }

  /**
   * tap - Performs tap gesture
   */
  async tap(selector, pressure) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.tap(selector, pressure);
  }

  // ===== Advanced Element Interactions =====

  /**
   * drag_and_drop - Drags and drops elements
   */
  async dragAndDrop(sourceSelector, targetSelector) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.dragAndDrop(sourceSelector, targetSelector);
  }

  /**
   * multi_select - Selects multiple options
   */
  async multiSelect(selector, options) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.multiSelect(selector, options);
  }

  /**
   * press_keys - Presses keyboard keys
   */
  async pressKeys(keys, targetSelector) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.pressKeys(keys, targetSelector);
  }

  /**
   * scroll_to_element - Scrolls to element
   */
  async scrollToElement(selector, behavior) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.scrollToElement(selector, behavior);
  }

  /**
   * hover_element - Hovers over element
   */
  async hoverElement(selector, duration) {
    if (!this.actions) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.actions.hoverElement(selector, duration);
  }

  /**
   * Get all stored variables
   */
  getVariables() {
    if (!this.actions) {
      return {};
    }
    return this.actions.getVariables();
  }

  /**
   * Clear all stored variables
   */
  clearVariables() {
    if (this.actions) {
      this.actions.clearVariables();
    }
  }
}
