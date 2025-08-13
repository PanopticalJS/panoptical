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
   * 1. login - Logs in with username/password (custom flow, domain-specific)
   */
  async login(credentials) {
    const { username, password, usernameSelector, passwordSelector, submitSelector, successIndicator } = credentials;
    
    console.log(chalk.blue(`Logging in as ${username}...`));
    
    try {
      // Wait for login form to be ready
      await this.browser.waitForSelector(usernameSelector);
      await this.browser.waitForSelector(passwordSelector);
      
      // Clear and fill username
      const page = this.getPage();
      await page.fill(usernameSelector, '');
      await this.browser.type(usernameSelector, username);
      
      // Clear and fill password
      await page.fill(passwordSelector, '');
      await this.browser.type(passwordSelector, password);
      
      // Submit the form
      if (submitSelector) {
        await this.browser.click(submitSelector);
      } else {
        // Try to submit by pressing Enter in password field
        await page.press(passwordSelector, 'Enter');
      }
      
      // Wait for successful login
      if (successIndicator) {
        await this.browser.waitForSelector(successIndicator, 30000);
        console.log(chalk.green(`✓ Successfully logged in as`) + ` ${username}`);
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
   * 2. logout - Logs out and verifies the user is redirected to the login screen
   */
  async logout(logoutSelector, loginPageIndicator) {
    console.log(chalk.blue(`Logging out...`));
    
    try {
      // Click logout button/link
      await this.browser.waitForSelector(logoutSelector);
      await this.browser.click(logoutSelector);
      
      // Wait for logout to complete
      await this.browser.waitForLoadState('networkidle');
      
              // Verify we're on login page
        if (loginPageIndicator) {
          await this.browser.waitForSelector(loginPageIndicator, 30000);
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
   * 3. goto_with_auth - Navigates to a page but attaches an auth token/session automatically
   */
  async gotoWithAuth(url, authToken, tokenHeader = 'Authorization') {
    console.log(chalk.blue(`Navigating to ${url} with authentication...`));
    
    try {
      // Set auth header before navigation
      const page = this.getPage();
      await page.setExtraHTTPHeaders({
        [tokenHeader]: `Bearer ${authToken}`
      });
      
      // Navigate to the page
      await this.browser.goto(url);
      
      console.log(chalk.green(`✓ Navigated to ${url} with authentication`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Navigation with auth failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * 4. wait_for_text - Waits until a given text appears anywhere on the page
   */
  async waitForText(text, timeout = 30000) {
    console.log(chalk.blue(`Waiting for text: "${text}"...`));
    
    try {
      const page = this.getPage();
      await page.waitForFunction(
        (searchText) => document.body.innerText.includes(searchText),
        text,
        { timeout }
      );
      
              console.log(chalk.green(`✓ Text found:`) + ` "${text}"`);
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Text not found within ${timeout}ms: "${text}"`));
      throw error;
    }
  }

  /**
   * 5. click_if_visible - Clicks only if an element is visible, otherwise skips
   */
  async clickIfVisible(selector, options = {}) {
    try {
      const isVisible = await this.browser.isVisible(selector);
      
      if (isVisible) {
        await this.browser.click(selector, options);
        console.log(chalk.green(`✓ Clicked visible element:`) + ` ${selector}`);
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
   * 6. select_from_dropdown - Chooses an option by text, not by value (more human-friendly)
   */
  async selectFromDropdown(selector, optionText, options = {}) {
    console.log(chalk.blue(`Selecting "${optionText}" from dropdown...`));
    
    try {
      // Wait for dropdown to be ready
      await this.browser.waitForSelector(selector);
      
      // Click to open dropdown
      await this.browser.click(selector);
      
      // Wait for options to appear and select by text
      const optionSelector = `text="${optionText}"`;
      await this.browser.waitForSelector(optionSelector, 30000);
      await this.browser.click(optionSelector);
      
      console.log(chalk.green(`✓ Selected "${optionText}" from dropdown`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Dropdown selection failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * 7. hover_and_click - Hover over a menu, then click a submenu item
   */
  async hoverAndClick(hoverSelector, clickSelector, options = {}) {
    console.log(chalk.blue(`Hovering over ${hoverSelector} and clicking ${clickSelector}...`));
    
    try {
      // Hover over the main element
      const page = this.getPage();
      await page.hover(hoverSelector);
      
      // Wait for submenu to appear
      await this.browser.waitForSelector(clickSelector, 30000);
      
      // Click the submenu item
      await this.browser.click(clickSelector, options);
      
      console.log(chalk.green(`✓ Hover and click completed`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Hover and click failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * 8. upload_file - Attaches a file to a file input and verifies it's uploaded
   */
  async uploadFile(fileInputSelector, filePath, successIndicator) {
    console.log(chalk.blue(`Uploading file: ${filePath}...`));
    
    try {
      // Wait for file input to be ready
      await this.browser.waitForSelector(fileInputSelector);
      
      // Upload the file
      const page = this.getPage();
      await page.setInputFiles(fileInputSelector, filePath);
      
      // Wait for upload to complete
      if (successIndicator) {
        await this.browser.waitForSelector(successIndicator, 30000);
        console.log(chalk.green(`✓ File uploaded successfully: ${path.basename(filePath)}`));
      } else {
        // Wait for any upload progress to complete
        await this.browser.waitForLoadState('networkidle');
        console.log(chalk.green(`✓ File upload completed: ${path.basename(filePath)}`));
      }
      
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ File upload failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * 9. download_and_verify - Downloads a file, checks its size or contents
   */
  async downloadAndVerify(downloadSelector, expectedSize, expectedContent = null) {
    console.log(chalk.blue(`Downloading file...`));
    
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
      
      console.log(chalk.green(`✓ File downloaded and verified: ${path.basename(downloadPath)} (${fileSize} bytes)`));
      
      // Clean up downloaded file
      fs.unlinkSync(downloadPath);
      
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Download and verify failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * 10. take_screenshot - Saves a screenshot with a custom name for debugging
   */
  async takeScreenshot(name, options = {}) {
    console.log(chalk.blue(`Taking screenshot: ${name}...`));
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${name}_${timestamp}.png`;
      const screenshotPath = path.join('screenshots', filename);
      
      // Ensure screenshots directory exists
      if (!fs.existsSync('screenshots')) {
        fs.mkdirSync('screenshots', { recursive: true });
      }
      
      await this.browser.screenshot(screenshotPath, options);
      
              console.log(chalk.green(`✓ Screenshot saved:`) + ` ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      console.error(chalk.red(`✗ Screenshot failed: ${error.message}`));
      throw error;
    }
  }

  // ===== Data & Verification =====

  /**
   * 11. verify_table_row - Asserts that a table contains a row with specific cell values
   */
  async verifyTableRow(tableSelector, expectedRow) {
    console.log(chalk.blue(`Verifying table row: ${JSON.stringify(expectedRow)}...`));
    
    try {
      const tableData = await this.browser.evaluate((selector, expected) => {
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
      }, tableSelector, expectedRow);
      
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
   * 12. assert_element_count - Checks how many elements match a selector
   */
  async assertElementCount(selector, expectedCount, operator = '==') {
    console.log(chalk.blue(`Asserting element count: ${selector} ${operator} ${expectedCount}...`));
    
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
        console.log(chalk.green(`✓ Element count assertion passed: ${actualCount} ${operator} ${expectedCount}`));
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
   * 13. check_api_response - Sends an HTTP request and validates the response (API + UI combo testing)
   */
  async checkApiResponse(url, method = 'GET', headers = {}, body = null, expectedStatus = 200, expectedContent = null) {
    console.log(chalk.blue(`Checking API response: ${method} ${url}...`));
    
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
      
      console.log(chalk.green(`✓ API response check passed: ${response.status()}`));
      return response;
    } catch (error) {
      console.error(chalk.red(`✗ API response check failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * 14. assert_element_not_present - Ensures an element does not exist (good for post-action checks)
   */
  async assertElementNotPresent(selector, timeout = 30000) {
    console.log(chalk.blue(`Asserting element not present: ${selector}...`));
    
    try {
      // Wait a bit to see if element appears
      await new Promise(resolve => setTimeout(resolve, timeout));
      
      const isVisible = await this.browser.isVisible(selector);
      
      if (!isVisible) {
        console.log(chalk.green(`✓ Element not present as expected: ${selector}`));
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
   * 15. measure_performance - Records page load time or specific action performance
   */
  async measurePerformance(action, options = {}) {
    console.log(chalk.blue(`Measuring performance: ${action}...`));
    
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
      
      console.log(chalk.green(`✓ Performance measured: ${action} took ${duration.toFixed(2)}ms`));
      
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
   * 16. repeat - Loops a set of steps multiple times
   */
  async repeat(steps, count, options = {}) {
    console.log(chalk.blue(`Repeating ${count} times...`));
    
    try {
      for (let i = 0; i < count; i++) {
        console.log(chalk.blue(`  Iteration ${i + 1}/${count}`));
        
        for (const step of steps) {
          // Execute each step in the repeat block
          await this.executeStep(step);
        }
        
        // Optional delay between iterations
        if (options.delay && i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, options.delay));
        }
      }
      
      console.log(chalk.green(`✓ Repeat completed: ${count} iterations`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Repeat failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * 17. run_if - Runs steps only if a condition is met (e.g., element exists)
   */
  async runIf(condition, steps, options = {}) {
    console.log(chalk.blue(`Checking condition: ${condition}...`));
    
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
        console.log(chalk.blue(`Condition met, running ${steps.length} steps...`));
        
        for (const step of steps) {
          await this.executeStep(step);
        }
        
        console.log(chalk.green(`✓ Conditional execution completed`));
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
   * 18. store_text - Saves text from an element into a variable for later steps
   */
  async storeText(selector, variableName) {
    console.log(chalk.blue(`Storing text from ${selector} into variable: ${variableName}...`));
    
    try {
      const text = await this.browser.getText(selector);
      
      // Store in variables map
      this.variables.set(variableName, text);
      
      console.log(chalk.green(`✓ Stored text: "${text}" → $${variableName}`));
      return text;
    } catch (error) {
      console.error(chalk.red(`✗ Store text failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * 19. compare_values - Compares stored variables or UI values and passes/fails based on equality
   */
  async compareValues(value1, value2, operator = '==', options = {}) {
    console.log(chalk.blue(`Comparing values: ${value1} ${operator} ${value2}...`));
    
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
        console.log(chalk.green(`✓ Comparison passed: ${resolvedValue1} ${operator} ${resolvedValue2}`));
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
   * 20. random_fill - Generates random test data (names, emails, addresses) and fills forms automatically
   */
  async randomFill(formData) {
    console.log(chalk.blue(`Filling form with random data...`));
    
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
          default:
            randomValue = `test_${fieldType}_${Date.now()}`;
        }
        
        // Fill the field
        await this.browser.waitForSelector(selector);
        await this.browser.type(selector, randomValue);
        
        console.log(chalk.blue(`Filled ${selector}: ${randomValue}`));
      }
      
      console.log(chalk.green(`✓ Form filled with random data`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Random fill failed: ${error.message}`));
      throw error;
    }
  }

  // ===== Mobile & Responsive Testing =====

  /**
   * 21. resize_viewport - Resizes the viewport to test responsive design
   */
  async resizeViewport(width, height, device = null) {
    console.log(chalk.blue(`Resizing viewport to ${width}x${height}...`));
    
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
      
      console.log(chalk.green(`✓ Viewport resized to ${width}x${height}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Viewport resize failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * 22. swipe - Performs swipe gesture (useful for mobile testing)
   */
  async swipe(selector, direction, distance = 200) {
    console.log(chalk.blue(`Swiping ${direction} on ${selector}...`));
    
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
      
      console.log(chalk.green(`✓ Swiped ${direction} on ${selector}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Swipe failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * 23. tap - Performs tap gesture with configurable pressure
   */
  async tap(selector, pressure = 0.5) {
    console.log(chalk.blue(`Tapping ${selector} with pressure ${pressure}...`));
    
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
      
      console.log(chalk.green(`✓ Tapped ${selector}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Tap failed: ${error.message}`));
      throw error;
    }
  }

  // ===== Advanced Element Interactions =====

  /**
   * 24. drag_and_drop - Drags an element and drops it on a target
   */
  async dragAndDrop(sourceSelector, targetSelector) {
    console.log(chalk.blue(`Dragging ${sourceSelector} to ${targetSelector}...`));
    
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
      
      console.log(chalk.green(`✓ Dragged ${sourceSelector} to ${targetSelector}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Drag and drop failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * 25. multi_select - Selects multiple options from a group of checkboxes or multi-select
   */
  async multiSelect(selector, options) {
    console.log(chalk.blue(`Selecting multiple options: ${options.join(', ')}...`));
    
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
      
      console.log(chalk.green(`✓ Selected multiple options: ${options.join(', ')}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Multi-select failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * 26. press_keys - Presses keyboard keys or key combinations
   */
  async pressKeys(keys, targetSelector = null) {
    console.log(chalk.blue(`Pressing keys: ${keys.join(' + ')}...`));
    
    try {
      const page = this.getPage();
      
      // Focus on target element if specified
      if (targetSelector) {
        await this.browser.waitForSelector(targetSelector);
        await page.locator(targetSelector).focus();
      }
      
      // Press the key combination
      await page.keyboard.press(keys.join('+'));
      
      console.log(chalk.green(`✓ Pressed keys: ${keys.join(' + ')}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Key press failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * 27. scroll_to_element - Scrolls to make an element visible
   */
  async scrollToElement(selector, behavior = 'smooth') {
    console.log(chalk.blue(`Scrolling to element: ${selector}...`));
    
    try {
      const page = this.getPage();
      
      // Wait for element to exist
      await this.browser.waitForSelector(selector);
      
      // Scroll to element
      await page.locator(selector).scrollIntoViewIfNeeded();
      
      console.log(chalk.green(`✓ Scrolled to element: ${selector}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Scroll to element failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * 28. hover_element - Hovers over an element to trigger hover effects
   */
  async hoverElement(selector, duration = 1000) {
    console.log(chalk.blue(`Hovering over element: ${selector}...`));
    
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
      
      console.log(chalk.green(`✓ Hovered over element: ${selector}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Hover failed: ${error.message}`));
      throw error;
    }
  }

  // ===== Helper Methods =====

  /**
   * Execute a single step (used by repeat and run_if)
   */
  async executeStep(step) {
    // This would integrate with your existing step execution logic
    // For now, we'll implement basic step execution
    if (step.click) {
      await this.browser.click(step.click);
    } else if (step.type) {
      await this.browser.type(step.type.selector, step.type.text);
    } else if (step.wait_for_element) {
      await this.browser.waitForSelector(step.wait_for_element.selector, step.wait_for_element.timeout);
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
    console.log(chalk.blue(`Variables cleared`));
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
