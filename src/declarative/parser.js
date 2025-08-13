import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { PanopticalCompatibility } from '../browser/compatibility.js';
import { ScreenshotManager } from '../utils/screenshots.js';

/**
 * Convert milliseconds to human-readable format
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time string
 */
function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  const remainingMs = ms % 1000;
  
  if (seconds < 60) {
    return remainingMs > 0 ? `${seconds}s ${remainingMs}ms` : `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}

export async function runDeclarativeTest(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test file not found: ${filePath}`);
  }
  
  const raw = fs.readFileSync(filePath, 'utf8');
  let data;
  
  try {
    data = YAML.parse(raw);
  } catch (e) {
    throw new Error(`Invalid YAML in ${filePath}: ${e}`);
  }
  
  if (!data.test || !data.steps || !Array.isArray(data.steps)) {
    throw new Error(`Invalid test structure in ${filePath}. Must have 'test' and 'steps' fields.`);
  }
  
  console.log(`Running declarative test: ${data.test}`);
  if (data.description) {
    console.log(`Description: ${data.description}`);
  }
  
  // Initialize screenshot manager
  const screenshotManager = new ScreenshotManager();
  
  // Use the new Panoptical browser engine
  const browser = new PanopticalCompatibility(options);
  const startTime = Date.now();
  
  try {
    await browser.launch();
    await browser.newPage();
    
    // Run setup steps if defined
    if (data.setup && Array.isArray(data.setup)) {
      console.log('Running setup steps...');
      await runSteps(browser, data.setup, 'setup', screenshotManager, data.test);
    }
    
    // Run main test steps
    console.log('Running test steps...');
    await runSteps(browser, data.steps, 'test', screenshotManager, data.test);
    
    // Run teardown steps if defined
    if (data.teardown && Array.isArray(data.teardown)) {
      console.log('Running teardown steps...');
      await runSteps(browser, data.teardown, 'teardown', screenshotManager, data.test);
    }
    
    const duration = Date.now() - startTime;
    console.log(chalk.green(`✓ Test completed in ${formatDuration(duration)}`));
    
    // Clean up video on success
    if (browser.cleanupVideoOnSuccess) {
      await browser.cleanupVideoOnSuccess();
    }
    
    // Close browser for successful tests
    await browser.close();
    
    return { success: true, duration };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(chalk.red(`✗ Test failed after ${formatDuration(duration)}: ${error.message}`));
    try {
      const filename = path.basename(filePath, '.yaml');
      const failureFilename = screenshotManager.generateTestFailureFilename(filename);
      const failurePath = screenshotManager.getScreenshotPath(failureFilename);
      await browser.screenshot(failurePath);
      console.log(chalk.yellow(`Failure screenshot saved: ${failureFilename}`));
    } catch (screenshotError) {
      console.error('Failed to take failure screenshot:', screenshotError.message);
    }

    try {
      if (browser.saveVideoOnFailure) {
        const filename = path.basename(filePath, '.yaml');
        const videoPath = await browser.saveVideoOnFailure(filename);
        if (videoPath) {
        } else if (browser.options && browser.options.video && browser.options.video.enabled) {
          console.log(chalk.yellow('Video saving returned null'));
        }
      } else {
        console.log(chalk.red('saveVideoOnFailure method NOT found on browser object'));
      }
    } catch (videoError) {
      console.error('Failed to save failure video:', videoError.message);
      console.error('Video error stack:', videoError.stack);
    }

    throw error;
  } finally {
    try {
      if (browser.page && !browser.page.isClosed()) {
        await browser.close();
      }
    } catch (closeError) {
    }
  }
}

async function runSteps(browser, steps, stepType, screenshotManager, testName) {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    try {
      if (step.goto) {
        // Retry navigation up to 3 times
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            await browser.goto(step.goto);
            break; // Success, exit retry loop
          } catch (error) {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw error; // Give up after max retries
            }
            console.log(`    Retry ${retryCount}/${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          }
        }
        
        // Use a more robust wait strategy
        try {
          await browser.waitForLoadState();
        } catch (e) {
          // Fallback: wait for body element (use 1/3 of browser timeout)
          const fallbackTimeout = Math.floor(browser.browser.options.timeout / 3);
          await browser.waitForSelector('body', fallbackTimeout);
        }
        
        // Navigation completed successfully
        console.log(chalk.green(`✓ Navigated to:`) + ` ${step.goto}`);
      }
      
      if (step.click) {
        await browser.waitForSelector(step.click);
        await browser.click(step.click);
        console.log(chalk.green(`✓ Clicked`) + ` ${step.click}`);
      }
      
      if (step.type) {
        await browser.waitForSelector(step.type.selector);
        await browser.type(step.type.selector, step.type.text);
        console.log(chalk.green(`✓ Typed`) + ` "${step.type.text}" ` + chalk.green(`into`) + ` ${step.type.selector}`);
      }
      
      if (step.expect) {
        await browser.waitForSelector(step.expect.selector);
        const text = await browser.getText(step.expect.selector);
        if (!text.includes(step.expect.text)) {
          throw new Error(`Expected text "${step.expect.text}" not found. Got: "${text}"`);
        }
        console.log(chalk.green(`✓ Text verified:`) + ` "${step.expect.text}"`);
      }
      
      if (step.wait_for_element) {
        const timeout = step.wait_for_element.timeout || browser.browser.options.timeout;
        await browser.waitForSelector(step.wait_for_element.selector, timeout);
        console.log(chalk.green(`✓ Element ready:`) + ` ${step.wait_for_element.selector}`);
      }
      
      if (step.snapshot) {
        const filename = screenshotManager.generateTestSuccessFilename(testName, step.snapshot);
        const screenshotPath = screenshotManager.getScreenshotPath(filename);
        await browser.screenshot(screenshotPath);
        console.log(chalk.green(`✓ Screenshot taken:`) + ` ${filename}`);
      }
      
      if (step.pause) {
        await new Promise(resolve => setTimeout(resolve, step.pause));
        console.log(chalk.green(`✓ Paused for`) + ` ${step.pause}ms`);
      }

      // ===== New Action Helper Steps =====

      // 1. login - Logs in with username/password
      if (step.login) {
        await browser.login(step.login);
      }

      // 2. logout - Logs out and verifies redirect
      if (step.logout) {
        const { selector, loginPageIndicator } = step.logout;
        await browser.logout(selector, loginPageIndicator);
      }

      // 3. goto_with_auth - Navigates with auth token
      if (step.goto_with_auth) {
        const { url, authToken, tokenHeader } = step.goto_with_auth;
        await browser.gotoWithAuth(url, authToken, tokenHeader);
      }

      // 4. wait_for_text - Waits for text to appear
      if (step.wait_for_text) {
        const { text, timeout } = step.wait_for_text;
        await browser.waitForText(text, timeout || browser.browser.options.timeout);
      }

      // 5. click_if_visible - Clicks only if visible
      if (step.click_if_visible) {
        const { selector, options } = step.click_if_visible;
        await browser.clickIfVisible(selector, options);
      }

      // 6. select_from_dropdown - Selects dropdown option by text
      if (step.select_from_dropdown) {
        const { selector, optionText, options } = step.select_from_dropdown;
        await browser.selectFromDropdown(selector, optionText, options);
      }

      // 7. hover_and_click - Hover then click submenu
      if (step.hover_and_click) {
        const { hoverSelector, clickSelector, options } = step.hover_and_click;
        await browser.hoverAndClick(hoverSelector, clickSelector, options);
      }

      // 8. upload_file - Uploads and verifies file
      if (step.upload_file) {
        const { fileInputSelector, filePath, successIndicator } = step.upload_file;
        await browser.uploadFile(fileInputSelector, filePath, successIndicator);
      }

      // 9. download_and_verify - Downloads and verifies file
      if (step.download_and_verify) {
        const { downloadSelector, expectedSize, expectedContent } = step.download_and_verify;
        await browser.downloadAndVerify(downloadSelector, expectedSize, expectedContent);
      }

      // 10. take_screenshot - Takes named screenshot
      if (step.take_screenshot) {
        const { name, options } = step.take_screenshot;
        await browser.takeScreenshot(name, options);
      }

      // 11. verify_table_row - Verifies table contains specific row
      if (step.verify_table_row) {
        const { tableSelector, expectedRow } = step.verify_table_row;
        await browser.verifyTableRow(tableSelector, expectedRow);
      }

      // 12. assert_element_count - Asserts element count
      if (step.assert_element_count) {
        const { selector, expectedCount, operator } = step.assert_element_count;
        await browser.assertElementCount(selector, expectedCount, operator);
      }

      // 13. check_api_response - Checks API response
      if (step.check_api_response) {
        const { url, method, headers, body, expectedStatus, expectedContent } = step.check_api_response;
        await browser.checkApiResponse(url, method, headers, body, expectedStatus, expectedContent);
      }

      // 14. assert_element_not_present - Asserts element doesn't exist
      if (step.assert_element_not_present) {
        const { selector, timeout } = step.assert_element_not_present;
        await browser.assertElementNotPresent(selector, timeout || browser.browser.options.timeout);
      }

      // 15. measure_performance - Measures performance
      if (step.measure_performance) {
        const { action, options } = step.measure_performance;
        await browser.measurePerformance(action, options);
      }

      // 16. repeat - Repeats steps
      if (step.repeat) {
        const { steps: repeatSteps, count, options } = step.repeat;
        await browser.repeat(repeatSteps, count, options);
      }

      // 17. run_if - Runs steps conditionally
      if (step.run_if) {
        const { condition, steps: conditionalSteps, options } = step.run_if;
        await browser.runIf(condition, conditionalSteps, options);
      }

      // 18. store_text - Stores text in variable
      if (step.store_text) {
        const { selector, variableName } = step.store_text;
        await browser.storeText(selector, variableName);
      }

      // 19. compare_values - Compares values
      if (step.compare_values) {
        const { value1, value2, operator, options } = step.compare_values;
        await browser.compareValues(value1, value2, operator, options);
      }

      // 20. random_fill - Fills form with random data
      if (step.random_fill) {
        const { formData } = step.random_fill;
        await browser.randomFill(formData);
      }

      // ===== Mobile & Responsive Testing =====

      // 21. resize_viewport - Resizes viewport for responsive testing
      if (step.resize_viewport) {
        const { width, height, device } = step.resize_viewport;
        await browser.resizeViewport(width, height, device);
      }

      // 22. swipe - Performs swipe gesture
      if (step.swipe) {
        const { selector, direction, distance } = step.swipe;
        await browser.swipe(selector, direction, distance);
      }

      // 23. tap - Performs tap gesture
      if (step.tap) {
        const { selector, pressure } = step.tap;
        await browser.tap(selector, pressure);
      }

      // ===== Advanced Element Interactions =====

      // 24. drag_and_drop - Drags and drops elements
      if (step.drag_and_drop) {
        const { source, target } = step.drag_and_drop;
        await browser.dragAndDrop(source, target);
      }

      // 25. multi_select - Selects multiple options
      if (step.multi_select) {
        const { selector, options } = step.multi_select;
        await browser.multiSelect(selector, options);
      }

      // 26. press_keys - Presses keyboard keys
      if (step.press_keys) {
        const { keys, targetSelector } = step.press_keys;
        await browser.pressKeys(keys, targetSelector);
      }

      // 27. scroll_to_element - Scrolls to element
      if (step.scroll_to_element) {
        const { selector, behavior } = step.scroll_to_element;
        await browser.scrollToElement(selector, behavior);
      }

      // 28. hover_element - Hovers over element
      if (step.hover_element) {
        const { selector, duration } = step.hover_element;
        await browser.hoverElement(selector, duration);
      }
      
    } catch (error) {
      throw new Error(`Step failed: ${error}`);
    }
  }
}