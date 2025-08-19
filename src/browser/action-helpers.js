import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * Panoptical Action Helpers - High-level automation methods that make testing delightful
 * These methods wrap Playwright complexity into simple, powerful YAML steps
 */
export class ActionHelpers {
  constructor(browser) {
    this.browser = browser;
    this.variables = new Map(); // Store variables for later use
  }

  /**
   * Get the current page object safely
   */
  getPage() {
    return this.browser.getPage();
  }

  // ===== Core Browser Actions (wrapped & improved) =====

  /**
   * login - Logs in with username/password (custom flow, domain-specific)
   */
  async login(credentials) {
    const { username, password, usernameSelector, passwordSelector, submitSelector, successIndicator } = credentials;
    try {
      // Wait for login form to be ready
      await this.browser.waitForSelector(usernameSelector);
      await this.browser.waitForSelector(passwordSelector);
      
      // Clear and fill username
      const page = this.getPage();
      await page.fill(usernameSelector, '');
      await this.browser.fill(usernameSelector, username);
      
      // Clear and fill password
      await page.fill(passwordSelector, '');
      await this.browser.fill(passwordSelector, password);
      
      // Submit the form
      if (submitSelector) {
        await this.browser.click(submitSelector);
      } else {
        // Try to submit by pressing Enter in password field
        await page.press(passwordSelector, 'Enter');
      }
      
      // Wait for successful login
      if (successIndicator) {
        if (typeof successIndicator === 'string') {
          // Check if it's a selector (starts with #, ., [, etc.) or text
          if (successIndicator.startsWith('#') || successIndicator.startsWith('.') || successIndicator.startsWith('[')) {
            // It's a selector
            await this.browser.waitForSelector(successIndicator, 30000);
            console.log(chalk.green(`✓ Successfully logged in as `) + chalk.bold.green(`${username}`));
          } else {
            // It's text to search for
            const page = this.getPage();
            await page.waitForFunction(
              (searchText) => {
                if (!document || !document.body) return false;
                return document.body.innerText && document.body.innerText.includes(searchText);
              },
              successIndicator,
              { timeout: 30000 }
            );
            console.log(chalk.green(`✓ Successfully logged in as `) + chalk.bold.green(`${username}`));
          }
        } else if (typeof successIndicator === 'object') {
          // Object format: { selector: "#element", text: "Dashboard" }
          if (successIndicator.selector) {
            await this.browser.waitForSelector(successIndicator.selector, 30000);
          }
          if (successIndicator.text) {
            const page = this.getPage();
            await page.waitForFunction(
              (searchText) => {
                if (!document || !document.body) return false;
                return document.body.innerText && document.body.innerText.includes(searchText);
              },
              successIndicator.text,
              { timeout: 30000 }
            );
          }
          console.log(chalk.green(`✓ Successfully logged in as `) + chalk.bold.green(`${username}`));
        }
      } else {
        // Wait for navigation or URL change
        await this.browser.waitForLoadState('networkidle');
        console.log(chalk.green(`✓ Login completed`));
      }
      
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Login failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * logout - Logs out and verifies the user is redirected to the login screen
   */
  async logout(logoutSelector, successIndicator) {
    try {
      // Handle flexible logout selector (selector, text, or object)
      if (typeof logoutSelector === 'string') {
        // Check if it's a selector (starts with #, ., [, etc.) or text
        if (logoutSelector.startsWith('#') || logoutSelector.startsWith('.') || logoutSelector.startsWith('[')) {
          // It's a selector
          await this.browser.waitForSelector(logoutSelector);
          await this.browser.click(logoutSelector);
        } else {
          // It's text to search for and click
          const page = this.getPage();
          await page.waitForFunction(
            (searchText) => {
              if (!document || !document.body) return false;
              return document.body.innerText && document.body.innerText.includes(searchText);
            },
            logoutSelector,
            { timeout: 30000 }
          );
          await page.click(`text="${logoutSelector}"`);
        }
      } else if (typeof logoutSelector === 'object') {
        // Object format: { selector: "#element", text: "Log Out" }
        if (logoutSelector.selector) {
          await this.browser.waitForSelector(logoutSelector.selector);
          await this.browser.click(logoutSelector.selector);
        }
        if (logoutSelector.text) {
          const page = this.getPage();
          await page.waitForFunction(
            (searchText) => {
              if (!document || !document.body) return false;
              return document.body.innerText && document.body.innerText.includes(searchText);
            },
            logoutSelector.text,
            { timeout: 30000 }
          );
          await page.click(`text="${logoutSelector.text}"`);
        }
      }
      
      // Wait for logout to complete
      await this.browser.waitForLoadState('networkidle');
      
      // Verify we're on login page
      if (successIndicator) {
        if (typeof successIndicator === 'string') {
          // Check if it's a selector or text
          if (successIndicator.startsWith('#') || successIndicator.startsWith('.') || successIndicator.startsWith('[')) {
            await this.browser.waitForSelector(successIndicator, 30000);
          } else {
            // It's text to search for
            const page = this.getPage();
            await page.waitForFunction(
              (searchText) => {
                if (!document || !document.body) return false;
                return document.body.innerText && document.body.innerText.includes(searchText);
              },
              successIndicator,
              { timeout: 30000 }
            );
          }
        }
        console.log(chalk.green(`✓ Successfully logged out`));
      } else {
        console.log(chalk.green(`✓ Logout completed`));
      }
      
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Logout failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * goto_with_auth - Navigates to a page but attaches an auth token/session automatically
   */
  async gotoWithAuth(url, authToken, tokenHeader = 'Authorization') {
    try {
      // Set auth header before navigation
      const page = this.getPage();
      await page.setExtraHTTPHeaders({
        [tokenHeader]: `Bearer ${authToken}`
      });
      
      // Navigate to the page
      await this.browser.goto(url);
      
              console.log(chalk.green(`✓ Navigated to `) + chalk.bold.green(`${url}`) + chalk.green(` with authentication`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Navigation with auth failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * click_if_visible - Clicks only if an element is visible, otherwise skips
   */
  async clickIfVisible(selector, options = {}) {
    try {
      const isVisible = await this.browser.isVisible(selector);
      
      if (isVisible) {
        await this.browser.click(selector, options);
        console.log(chalk.green(`✓ Clicked visible element: `) + chalk.bold.green(`${selector}`));
        return true;
      } else {
        console.log(chalk.yellow(`⚠ Element not visible, skipping click: ${selector}`));
        return false;
      }
    } catch (error) {
      console.error(chalk.red(`✗ Click if visible failed: ${error.message}`));
      throw error;
    }
  }

  // ===== UI Interaction Helpers =====

  /**
   * select_from_dropdown - Chooses an option by text, not by value (more human-friendly)
   */
  async selectFromDropdown(selector, optionText, options = {}) {
    try {
      const timeout = options.timeout || 30000;
      
      // Wait for dropdown to be ready
      await this.browser.waitForSelector(selector, timeout);
      
      // Try multiple approaches for dropdown selection
      const page = this.getPage();
      
      // Method 1: Try using Playwright's selectOption with label
      try {
        await page.selectOption(selector, { label: optionText });
        console.log(chalk.green(`✓ Selected `) + chalk.bold.green(`"${optionText}"`) + chalk.green(` from dropdown using label`));
        return true;
      } catch (selectError) {
        // Method 2: Try using selectOption with text
        try {
          await page.selectOption(selector, { text: optionText });
          console.log(chalk.green(`✓ Selected `) + chalk.bold.green(`"${optionText}"`) + chalk.green(` from dropdown using text`));
          return true;
        } catch (textError) {
          // Method 3: Manual click approach for custom dropdowns
          // Click to open dropdown
          await page.click(selector);
          
          // Wait a moment for dropdown to open
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Try to find and click the option by text content
          const optionElement = await page.locator(`text="${optionText}"`).first();
          if (await optionElement.isVisible()) {
            await optionElement.click();
            console.log(chalk.green(`✓ Selected `) + chalk.bold.green(`"${optionText}"`) + chalk.green(` from dropdown using manual click`));
            return true;
          } else {
            throw new Error(`Option "${optionText}" not visible in dropdown`);
          }
        }
      }
    } catch (error) {
      console.error(chalk.red(`✗ Dropdown selection failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * hover_and_click - Hover over a menu, then click a submenu item
   */
  async hoverAndClick(hoverSelector, clickSelector, options = {}) {
    try {
      // Hover over the main element
      const page = this.getPage();
      await page.hover(hoverSelector);
      
      // Wait for submenu to appear
      await this.browser.waitForSelector(clickSelector, 30000);
      
      // Click the submenu item
      await this.browser.click(clickSelector, options);
      
              console.log(chalk.green(`✓ Hover and click completed successfully`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Hover and click failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * upload_file - Attaches a file to a file input and verifies it's uploaded
   */
  async uploadFile(fileInputSelector, filePath, successIndicator, uploadButtonSelector = null) {
    try {
      // Wait for file input to be ready
      await this.browser.waitForSelector(fileInputSelector);
      
      // Upload the file
      const page = this.getPage();
      await page.setInputFiles(fileInputSelector, filePath);
      
      // Click upload button if specified
      if (uploadButtonSelector) {
        await this.browser.waitForSelector(uploadButtonSelector);
        await this.browser.click(uploadButtonSelector);
        console.log(chalk.green(`✓ Clicked upload button: `) + chalk.bold.green(`${uploadButtonSelector}`));
      }
      
      // Wait for upload to complete
      if (successIndicator) {
        await this.browser.waitForSelector(successIndicator, 30000);
        console.log(chalk.green(`✓ File uploaded successfully: `) + chalk.bold.green(`${path.basename(filePath)}`));
      } else {
        // Wait for any upload progress to complete
        await this.browser.waitForLoadState('networkidle');
        console.log(chalk.green(`✓ File upload completed: `) + chalk.bold.green(`${path.basename(filePath)}`));
      }
      
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ File upload failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * download_and_verify - Downloads a file, checks its size or contents
   */
  async downloadAndVerify(downloadSelector, expectedSize, expectedContent = null) {
    try {
      // Set up download listener
      const downloadPromise = this.browser.waitForEvent('download');
      
      // Click download button/link
      await this.browser.click(downloadSelector);
      
      // Wait for download to start
      const download = await downloadPromise;
      
      // Get download path
      const downloadPath = await download.path();
      
      if (!downloadPath) {
        throw new Error('Download path not available');
      }
      
      // Wait for file to be written
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify file size
      const stats = fs.statSync(downloadPath);
      const fileSize = stats.size;
      
      if (expectedSize && fileSize < expectedSize) {
        throw new Error(`File size too small: ${fileSize} bytes, expected at least ${expectedSize} bytes`);
      }
      
      // Verify file content if specified
      if (expectedContent) {
        const fileContent = fs.readFileSync(downloadPath, 'utf8');
        if (!fileContent.includes(expectedContent)) {
          throw new Error(`Expected content not found in downloaded file`);
        }
      }
      
              console.log(chalk.green(`✓ File downloaded and verified: `) + chalk.bold.green(`${path.basename(downloadPath)}`) + chalk.green(` (${fileSize} bytes)`));
      
      // Clean up downloaded file
      fs.unlinkSync(downloadPath);
      
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Download and verify failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * take_screenshot - Saves a screenshot with a custom name for debugging
   */
  async takeScreenshot(name, options = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${name}_${timestamp}.png`;
      
      // Use the screenshot manager to get the proper path for step screenshots
      const screenshotManager = new (await import('../utils/screenshots.js')).ScreenshotManager();
      const screenshotPath = screenshotManager.getStepScreenshotPath(filename);
      
      await this.browser.screenshot(screenshotPath, options);
      
      console.log(chalk.green(`✓ Screenshot saved: `) + chalk.bold.green(`${screenshotPath}`));
      return screenshotPath;
    } catch (error) {
      console.error(chalk.red(`✗ Screenshot failed: ${error.message}`));
      throw error;
    }
  }

  // ===== Data & Verification =====

  /**
   * verify_table_row - Asserts that a table contains a row with specific cell values
   */
  async verifyTableRow(tableSelector, expectedRow) {
    try {
      const page = this.getPage();
      const tableData = await page.evaluate(({ selector, expected }) => {
        const table = document.querySelector(selector);
        if (!table) return null;
        
        const rows = Array.from(table.querySelectorAll('tr'));
        const headers = Array.from(rows[0]?.querySelectorAll('th, td') || []).map(cell => cell.textContent.trim());
        
        for (let i = 1; i < rows.length; i++) {
          const cells = Array.from(rows[i].querySelectorAll('td')).map(cell => cell.textContent.trim());
          let match = true;
          
          for (const [key, value] of Object.entries(expected)) {
            const colIndex = headers.indexOf(key);
            if (colIndex === -1 || cells[colIndex] !== value) {
              match = false;
              break;
            }
          }
          
          if (match) return true;
        }
        
        return false;
      }, { selector: tableSelector, expected: expectedRow });
      
      if (tableData) {
        console.log(chalk.green(`✓ Table row verified successfully`));
        return true;
      } else {
        throw new Error(`Expected table row not found: ${JSON.stringify(expectedRow)}`);
      }
    } catch (error) {
      console.error(chalk.red(`✗ Table row verification failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * assert_element_count - Checks how many elements match a selector
   */
  async assertElementCount(selector, expectedCount, operator = '==') {
    try {
      const actualCount = await this.browser.locator(selector).count();
      
      let assertionPassed = false;
      switch (operator) {
        case '==':
          assertionPassed = actualCount === expectedCount;
          break;
        case '>':
          assertionPassed = actualCount > expectedCount;
          break;
        case '>=':
          assertionPassed = actualCount >= expectedCount;
          break;
        case '<':
          assertionPassed = actualCount < expectedCount;
          break;
        case '<=':
          assertionPassed = actualCount <= expectedCount;
          break;
        default:
          throw new Error(`Invalid operator: ${operator}. Use ==, >, >=, <, or <=`);
      }
      
      if (assertionPassed) {
        console.log(chalk.green(`✓ Element count assertion passed: `) + chalk.bold.green(`${actualCount} ${operator} ${expectedCount}`));
        return true;
      } else {
        throw new Error(`Element count assertion failed: ${actualCount} ${operator} ${expectedCount}`);
      }
    } catch (error) {
      console.error(chalk.red(`✗ Element count assertion failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * check_api_response - Sends an HTTP request and validates the response (API + UI combo testing)
   */
  async checkApiResponse(url, method = 'GET', headers = {}, body = null, expectedStatus = 200, expectedContent = null) {
    try {
      const response = await this.browser.request.fetch(url, {
        method,
        headers,
        data: body
      });
      
      // Check status code
      if (response.status() !== expectedStatus) {
        throw new Error(`Expected status ${expectedStatus}, got ${response.status()}`);
      }
      
      // Check response content if specified
      if (expectedContent) {
        const responseText = await response.text();
        if (!responseText.includes(expectedContent)) {
          throw new Error(`Expected content not found in response`);
        }
      }
      
              console.log(chalk.green(`✓ API response check passed: `) + chalk.bold.green(`${response.status()}`));
      return response;
    } catch (error) {
      console.error(chalk.red(`✗ API response check failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * assert_element_not_present - Ensures an element does not exist (good for post-action checks)
   */
  async assertElementNotPresent(selector, timeout = 30000) {
    try {
      // Wait a bit to see if element appears
      await new Promise(resolve => setTimeout(resolve, timeout));
      
      const isVisible = await this.browser.isVisible(selector);
      
      if (!isVisible) {
        console.log(chalk.green(`✓ Element not present as expected: `) + chalk.bold.green(`${selector}`));
        return true;
      } else {
        throw new Error(`Element should not be present: ${selector}`);
      }
    } catch (error) {
      console.error(chalk.red(`✗ Element not present assertion failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * measure_performance - Records page load time or specific action performance
   */
  async measurePerformance(action, options = {}) {
    try {
      const startTime = performance.now();
      
      // Execute the action
      if (typeof action === 'function') {
        await action();
      } else if (action === 'pageLoad') {
        await this.browser.waitForLoadState('networkidle');
      } else if (action === 'navigation') {
        await this.browser.waitForLoadState('domcontentloaded');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
              console.log(chalk.green(`✓ Performance measured: `) + chalk.bold.green(`${action}`) + chalk.green(` took `) + chalk.bold.green(`${duration.toFixed(2)}ms`));
      
      // Store performance data for later comparison
      this.variables.set(`performance_${action}`, duration);
      
      return duration;
    } catch (error) {
      console.error(chalk.red(`✗ Performance measurement failed: ${error.message}`));
      throw error;
    }
  }

  // ===== Flow Control =====

  /**
   * repeat - Loops a set of steps multiple times
   */
  async repeat(steps, count, options = {}) {
    try {
      for (let i = 0; i < count; i++) {
        
        for (const step of steps) {
          // Execute each step in the repeat block
          await this.executeStep(step);
        }
        
        // Optional delay between iterations
        if (options.delay && i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, options.delay));
        }
      }
      
              console.log(chalk.green(`✓ Repeat completed: `) + chalk.bold.green(`${count} iterations`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Repeat failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * run_if - Runs steps only if a condition is met (e.g., element exists)
   */
  async runIf(condition, steps, options = {}) {
    try {
      let shouldRun = false;
      
      // Check various condition types
      if (typeof condition === 'string' && condition.startsWith('element_exists:')) {
        const selector = condition.replace('element_exists:', '');
        shouldRun = await this.browser.isVisible(selector);
      } else if (typeof condition === 'string' && condition.startsWith('text_present:')) {
        const text = condition.replace('text_present:', '');
        shouldRun = await this.browser.evaluate((searchText) => document.body.innerText.includes(searchText), text);
      } else if (typeof condition === 'function') {
        shouldRun = await condition();
      } else if (typeof condition === 'boolean') {
        shouldRun = condition;
      }
      
      if (shouldRun) {

        
        for (const step of steps) {
          await this.executeStep(step);
        }
        
        console.log(chalk.green(`✓ Conditional execution completed successfully`));
        return true;
      } else {
        console.log(chalk.yellow(`Condition not met, skipping steps`));
        return false;
      }
    } catch (error) {
      console.error(chalk.red(`✗ Conditional execution failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * store_text - Saves text from an element into a variable for later steps
   */
  async storeText(selector, variableName) {
    try {
      const text = await this.browser.getText(selector);
      
      // Store in variables map
      this.variables.set(variableName, text);
      
              console.log(chalk.green(`✓ Stored text: `) + chalk.bold.green(`"${text}"`) + chalk.green(` → `) + chalk.bold.green(`$${variableName}`));
      return text;
    } catch (error) {
      console.error(chalk.red(`✗ Store text failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * compare_values - Compares stored variables or UI values and passes/fails based on equality
   */
  async compareValues(value1, value2, operator = '==', options = {}) {
    try {
      // Resolve variables if they start with $
      const resolveValue = (val) => {
        if (typeof val === 'string' && val.startsWith('$')) {
          const varName = val.substring(1);
          return this.variables.get(varName);
        }
        return val;
      };
      
      const resolvedValue1 = resolveValue(value1);
      const resolvedValue2 = resolveValue(value2);
      
      let comparisonPassed = false;
      switch (operator) {
        case '==':
          comparisonPassed = resolvedValue1 === resolvedValue2;
          break;
        case '!=':
          comparisonPassed = resolvedValue1 !== resolvedValue2;
          break;
        case '>':
          comparisonPassed = resolvedValue1 > resolvedValue2;
          break;
        case '>=':
          comparisonPassed = resolvedValue1 >= resolvedValue2;
          break;
        case '<':
          comparisonPassed = resolvedValue1 < resolvedValue2;
          break;
        case '<=':
          comparisonPassed = resolvedValue1 <= resolvedValue2;
          break;
        case 'contains':
          comparisonPassed = String(resolvedValue1).includes(String(resolvedValue2));
          break;
        default:
          throw new Error(`Invalid operator: ${operator}`);
      }
      
      if (comparisonPassed) {
        console.log(chalk.green(`✓ Comparison passed: `) + chalk.bold.green(`${resolvedValue1} ${operator} ${resolvedValue2}`));
        return true;
      } else {
        throw new Error(`Comparison failed: ${resolvedValue1} ${operator} ${resolvedValue2}`);
      }
    } catch (error) {
      console.error(chalk.red(`✗ Value comparison failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * random_fill - Generates random test data (names, emails, addresses) and fills forms automatically
   */
  async randomFill(formData) {
    try {
      for (const [selector, fieldType] of Object.entries(formData)) {
        let randomValue = '';
        
        // Generate appropriate random data based on field type
        switch (fieldType) {
          case 'firstName':
            randomValue = this.generateRandomName('first');
            break;
          case 'lastName':
            randomValue = this.generateRandomName('last');
            break;
          case 'email':
            randomValue = this.generateRandomEmail();
            break;
          case 'phone':
            randomValue = this.generateRandomPhone();
            break;
          case 'address':
            randomValue = this.generateRandomAddress();
            break;
          case 'company':
            randomValue = this.generateRandomCompany();
            break;
          case 'username':
            randomValue = this.generateRandomUsername();
            break;
          case 'password':
            randomValue = this.generateRandomPassword();
            break;
          case 'age':
          case 'number':
            randomValue = String(Math.floor(Math.random() * 100) + 18); // Generate age 18-117 as string
            break;
          default:
            randomValue = `test_${fieldType}_${Date.now()}`;
        }
        
        // Fill the field
        await this.browser.waitForSelector(selector);
        await this.browser.fill(selector, randomValue);
      }
      console.log(chalk.green(`✓ Random form filling completed successfully`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Random fill failed: ${error.message}`));
      throw error;
    }
  }

  // ===== Mobile & Responsive Testing =====

  /**
   * resize_viewport - Resizes the viewport to test responsive design
   */
  async resizeViewport(width, height, device = null) {
    try {
      const page = this.getPage();
      
      // Set viewport size
      await page.setViewportSize({ width, height });
      
      // If device is specified, set user agent and other device-specific properties
      if (device) {
        const deviceConfig = this.getDeviceConfig(device);
        if (deviceConfig) {
          await page.setUserAgent(deviceConfig.userAgent);
          await page.setViewportSize(deviceConfig.viewport);
        }
      }
      
              console.log(chalk.green(`✓ Viewport resized to `) + chalk.bold.green(`${width}x${height}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Viewport resize failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * swipe - Performs swipe gesture (useful for mobile testing)
   */
  async swipe(selector, direction, distance = 200) {
    try {
      const page = this.getPage();
      
      // Wait for element to be ready
      await this.browser.waitForSelector(selector);
      
      // Get element bounding box
      const element = await page.locator(selector);
      const box = await element.boundingBox();
      
      if (!box) {
        throw new Error('Element not found or not visible');
      }
      
      // Calculate start and end points based on direction
      let startX, startY, endX, endY;
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      
      switch (direction.toLowerCase()) {
        case 'left':
          startX = centerX + distance / 2;
          startY = centerY;
          endX = centerX - distance / 2;
          endY = centerY;
          break;
        case 'right':
          startX = centerX - distance / 2;
          startY = centerY;
          endX = centerX + distance / 2;
          endY = centerY;
          break;
        case 'up':
          startX = centerX;
          startY = centerY + distance / 2;
          endX = centerX;
          endY = centerY - distance / 2;
          break;
        case 'down':
          startX = centerX;
          startY = centerY - distance / 2;
          endX = centerX;
          endY = centerY + distance / 2;
          break;
        default:
          throw new Error(`Invalid direction: ${direction}. Use left, right, up, or down`);
      }
      
      // Perform the swipe
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY);
      await page.mouse.up();
      
              console.log(chalk.green(`✓ Swiped `) + chalk.bold.green(`${direction}`) + chalk.green(` on `) + chalk.bold.green(`${selector}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Swipe failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * tap - Performs tap gesture with configurable pressure
   */
  async tap(selector, pressure = 0.5) {
    try {
      const page = this.getPage();
      
      // Wait for element to be ready
      await this.browser.waitForSelector(selector);
      
      // Get element center
      const element = await page.locator(selector);
      const box = await element.boundingBox();
      
      if (!box) {
        throw new Error('Element not found or not visible');
      }
      
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      
      // Simulate tap with pressure (pressure affects the visual feedback)
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.up();
      
              console.log(chalk.green(`✓ Tapped `) + chalk.bold.green(`${selector}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Tap failed: ${error.message}`));
      throw error;
    }
  }

  // ===== Advanced Element Interactions =====

  /**
   * drag_and_drop - Drags an element and drops it on a target
   */
  async dragAndDrop(sourceSelector, targetSelector) {
    try {
      const page = this.getPage();
      
      // Wait for both elements to be ready
      await this.browser.waitForSelector(sourceSelector);
      await this.browser.waitForSelector(targetSelector);
      
      // Get source element
      const sourceElement = await page.locator(sourceSelector);
      const sourceBox = await sourceElement.boundingBox();
      
      if (!sourceBox) {
        throw new Error('Source element not found or not visible');
      }
      
      // Get target element
      const targetElement = await page.locator(targetSelector);
      const targetBox = await targetElement.boundingBox();
      
      if (!targetBox) {
        throw new Error('Target element not found or not visible');
      }
      
      // Calculate center points
      const sourceCenterX = sourceBox.x + sourceBox.width / 2;
      const sourceCenterY = sourceBox.y + sourceBox.height / 2;
      const targetCenterX = targetBox.x + targetBox.width / 2;
      const targetCenterY = targetBox.y + targetBox.height / 2;
      
      // Perform drag and drop
      await page.mouse.move(sourceCenterX, sourceCenterY);
      await page.mouse.down();
      await page.mouse.move(targetCenterX, targetCenterY);
      await page.mouse.up();
      
              console.log(chalk.green(`✓ Dragged `) + chalk.bold.green(`${sourceSelector}`) + chalk.green(` to `) + chalk.bold.green(`${targetSelector}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Drag and drop failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * multi_select - Selects multiple options from a group of checkboxes or multi-select
   */
  async multiSelect(selector, options) {
    try {
      const page = this.getPage();
      
      // Wait for the selector group to be ready
      await this.browser.waitForSelector(selector);
      
      // Handle different types of multi-select elements
      const element = await page.locator(selector);
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());
      
      if (tagName === 'select' && await element.getAttribute('multiple')) {
        // Multi-select dropdown
        for (const option of options) {
          await element.selectOption({ label: option });
        }
      } else {
        // Checkbox group or radio buttons
        for (const option of options) {
          const optionSelector = `${selector} input[value="${option}"], ${selector} input[data-value="${option}"]`;
          try {
            await this.browser.click(optionSelector);
          } catch (e) {
            // Try alternative selector for checkboxes
            const altSelector = `${selector} input[type="checkbox"], ${selector} input[type="radio"]`;
            const inputs = await page.locator(altSelector).all();
            for (const input of inputs) {
              const label = await input.evaluate(el => {
                const labelEl = el.closest('label') || el.parentElement;
                return labelEl ? labelEl.textContent.trim() : '';
              });
              if (label.includes(option)) {
                await input.check();
                break;
              }
            }
          }
        }
      }
      
              console.log(chalk.green(`✓ Selected multiple options: `) + chalk.bold.green(`${options.join(', ')}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Multi-select failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * press_keys - Presses keyboard keys or key combinations
   */
  async pressKeys(keys, targetSelector = null) {
    try {
      const page = this.getPage();
      
      // Focus on target element if specified
      if (targetSelector) {
        await this.browser.waitForSelector(targetSelector);
        await page.locator(targetSelector).focus();
      }
      
      // Press the key combination
      await page.keyboard.press(keys.join('+'));
      
              console.log(chalk.green(`✓ Pressed keys: `) + chalk.bold.green(`${keys.join(' + ')}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Key press failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * scroll_to_element - Scrolls to make an element visible
   */
  async scrollToElement(selector, behavior = 'smooth') {
    try {
      const page = this.getPage();
      
      // Wait for element to exist
      await this.browser.waitForSelector(selector);
      
      // Scroll to element
      await page.locator(selector).scrollIntoViewIfNeeded();
      
              console.log(chalk.green(`✓ Scrolled to element: `) + chalk.bold.green(`${selector}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Scroll to element failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * hover_element - Hovers over an element to trigger hover effects
   */
  async hoverElement(selector, duration = 1000) {
    try {
      const page = this.getPage();
      
      // Wait for element to be ready
      await this.browser.waitForSelector(selector);
      
      // Hover over element
      await page.hover(selector);
      
      // Keep hover for specified duration
      if (duration > 0) {
        await new Promise(resolve => setTimeout(resolve, duration));
      }
      
      console.log(chalk.green(`✓ Hovered over element: `) + chalk.bold.green(`${selector}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Hover failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * iframe_action - Performs actions inside iframes (click, type, get_text, etc.)
   */
  async iframeAction(iframeSelector, action, targetSelector, options = {}) {
    try {
      const page = this.getPage();
      
      // Wait for iframe to be ready
      await this.browser.waitForSelector(iframeSelector);
      
      // Get iframe element
      const iframe = await page.locator(iframeSelector);
      
      // Wait for iframe content to load
      await iframe.waitFor({ state: 'attached' });
      
      // Get iframe frame
      const frame = iframe.contentFrame();
      if (!frame) {
        throw new Error(`Could not access iframe content: ${iframeSelector}`);
      }
      
      // Wait for target element in iframe using Playwright's locator API
      const targetElement = frame.locator(targetSelector);
      await targetElement.waitFor({ timeout: options.timeout || 10000 });
      
      let result = null;
      
      // Perform the requested action
      switch (action.toLowerCase()) {
        case 'click':
          await targetElement.click();
          console.log(chalk.green(`✓ Clicked `) + chalk.bold.green(`${targetSelector}`) + chalk.green(` in iframe `) + chalk.bold.green(`${iframeSelector}`));
          break;
          
        case 'type':
          const text = options.text || '';
          if (!text) {
            throw new Error('Text is required for type action');
          }
          await targetElement.fill(text);
          console.log(chalk.green(`✓ Typed `) + chalk.bold.green(`"${text}"`) + chalk.green(` into `) + chalk.bold.green(`${targetSelector}`) + chalk.green(` in iframe `) + chalk.bold.green(`${iframeSelector}`));
          break;
          
        case 'get_text':
          result = await targetElement.textContent();
          console.log(chalk.green(`✓ Got text from `) + chalk.bold.green(`${targetSelector}`) + chalk.green(` in iframe: `) + chalk.bold.green(`"${result}"`));
          break;
          
        case 'wait':
          await targetElement.waitFor({ timeout: options.timeout || 10000 });
          console.log(chalk.green(`✓ Waited for `) + chalk.bold.green(`${targetSelector}`) + chalk.green(` in iframe `) + chalk.bold.green(`${iframeSelector}`));
          break;
          
        case 'is_visible':
          result = await targetElement.isVisible();
          console.log(chalk.green(`✓ Element `) + chalk.bold.green(`${targetSelector}`) + chalk.green(` in iframe is `) + chalk.bold.green(result ? 'visible' : 'hidden'));
          break;
          
        case 'evaluate':
          const script = options.script || '';
          if (!script) {
            throw new Error('Script is required for evaluate action');
          }
          result = await targetElement.evaluate(script);
          console.log(chalk.green(`✓ Executed script on `) + chalk.bold.green(`${targetSelector}`) + chalk.green(` in iframe `) + chalk.bold.green(`${iframeSelector}`));
          break;
          
        default:
          throw new Error(`Unsupported iframe action: ${action}. Use: click, type, get_text, wait, is_visible, or evaluate`);
      }
      
      return result;
    } catch (error) {
      console.error(chalk.red(`✗ Iframe action failed: ${error.message}`));
      throw error;
    }
  }

  // ===== Helper Methods =====

  /**
   * Execute a single step (used by repeat and run_if)
   */
  async executeStep(step) {
    if (step.click) {
      // Enhanced click action that handles multiple formats
      if (typeof step.click === 'string') {
        // Traditional selector click: click: "#button"
        await this.browser.click(step.click);
      } else if (step.click.text) {
        // Text-based click: click: text: "Button Text"
        const page = this.getPage();
        const timeout = step.click.timeout || 30000;
        
        // Wait for the text to be available
        await page.waitForFunction(
          (searchText) => {
            if (!document || !document.body) return false;
            return document.body.innerText && document.body.innerText.includes(searchText);
          },
          step.click.text,
          { timeout }
        );
        
        // Click on the element with the matching text
        await page.click(`text="${step.click.text}"`);
      } else if (step.click.selector) {
        // Selector with timeout: click: selector: "#button", timeout: 5000
        const timeout = step.click.timeout || 30000;
        await this.browser.waitForSelector(step.click.selector, timeout);
        await this.browser.click(step.click.selector);
      } else {
        throw new Error('click action must specify either a string selector, text, or selector object');
      }
          } else if (step.fill) {
        await this.browser.fill(step.fill.selector, step.fill.text);
      } else if (step.type) {
        const delay = step.type.delay || 100;
        await this.browser.type(step.type.selector, step.type.text, { delay });
      } else if (step.selectOption) {
      await this.browser.selectOption(step.selectOption.selector, step.selectOption.value);
    } else if (step.evaluate) {
      await this.browser.evaluate(step.evaluate.script, step.evaluate.selector);
    } else if (step.randomFill) {
      await this.randomFill(step.randomFill);
    } else if (step.wait) {
      if (step.wait.text) {
        const page = this.getPage();
        const timeout = step.wait.timeout || 30000;
        await page.waitForFunction(
          (searchText) => {
            if (!document || !document.body) return false;
            return document.body.innerText && document.body.innerText.includes(searchText);
          },
          step.wait.text,
          { timeout }
        );
      } else if (step.wait.selector) {
        await this.browser.waitForSelector(step.wait.selector, step.wait.timeout);
      }
    }
    // Add more step types as needed
  }

  /**
   * Generate random first names
   */
  generateRandomName(type) {
    const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    
    if (type === 'first') {
      return firstNames[Math.floor(Math.random() * firstNames.length)];
    } else {
      return lastNames[Math.floor(Math.random() * lastNames.length)];
    }
  }

  /**
   * Generate random email
   */
  generateRandomEmail() {
    const domains = ['example.com', 'test.org', 'demo.net', 'sample.io'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const timestamp = Date.now();
    return `user_${timestamp}@${domain}`;
  }

  /**
   * Generate random phone number
   */
  generateRandomPhone() {
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const prefix = Math.floor(Math.random() * 900) + 100;
    const lineNumber = Math.floor(Math.random() * 9000) + 1000;
    return `(${areaCode}) ${prefix}-${lineNumber}`;
  }

  /**
   * Generate random address
   */
  generateRandomAddress() {
    const numbers = Math.floor(Math.random() * 9999) + 1;
    const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'Elm St', 'Cedar Ln'];
    const street = streets[Math.floor(Math.random() * streets.length)];
    return `${numbers} ${street}`;
  }

  /**
   * Generate random company name
   */
  generateRandomCompany() {
    const companies = ['TechCorp', 'InnovateInc', 'FutureTech', 'Digital Solutions', 'Smart Systems'];
    return companies[Math.floor(Math.random() * companies.length)];
  }

  /**
   * Generate random username
   */
  generateRandomUsername() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `user_${random}_${timestamp}`;
  }

  /**
   * Generate random password
   */
  generateRandomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Get all stored variables
   */
  getVariables() {
    return Object.fromEntries(this.variables);
  }

  /**
   * Clear all stored variables
   */
  clearVariables() {
    this.variables.clear();

  }

  /**
   * Get device configuration for mobile testing
   */
  getDeviceConfig(deviceName) {
    const devices = {
      'iPhone SE': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
        viewport: { width: 375, height: 667 }
      },
      'iPhone 12 Pro': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
        viewport: { width: 390, height: 844 }
      },
      'iPad': {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
        viewport: { width: 768, height: 1024 }
      },
      'Android': {
        userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        viewport: { width: 360, height: 640 }
      }
    };
    
    return devices[deviceName] || null;
  }
}
