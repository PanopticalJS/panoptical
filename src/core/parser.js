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
  
  const seconds = ms / 1000;
  
  if (seconds < 60) {
    // Show seconds with 1 decimal place for precision
    return `${seconds.toFixed(1)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds < 1) {
    return `${minutes}m`;
  }
  
  // Show minutes and seconds with 1 decimal place
  return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
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
  
  console.log(`Running test: ${data.test}`);
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
    console.log(`Test completed in ${formatDuration(duration)}`);
    
    // Clean up video on success
    if (browser.cleanupVideoOnSuccess) {
      await browser.cleanupVideoOnSuccess();
    }
    
    // Close browser for successful tests
    await browser.close();
    
    return { success: true, duration };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    let screenshotInfo = '';
    let videoInfo = '';

    try {
      const filename = path.basename(filePath, '.yaml');
      const failureFilename = screenshotManager.generateTestFailureFilename(filename);
      const failurePath = screenshotManager.getFailureScreenshotPath(failureFilename);
      await browser.screenshot(failurePath);
      screenshotInfo = `Screenshot: ${failureFilename}`;
    } catch (screenshotError) {
      console.error('Failed to take failure screenshot:', screenshotError.message);
    }

    try {
      if (browser.saveVideoOnFailure) {
        const filename = path.basename(filePath, '.yaml');
        const videoPath = await browser.saveVideoOnFailure(filename);
        if (videoPath) {
          videoInfo = `Video: ${path.basename(videoPath)}`;
        } else if (browser.options && browser.options.video && browser.options.video.enabled) {
          videoInfo = 'Video: Failed to save';
        }
      } else {
        videoInfo = 'Video: Not available';
      }
    } catch (videoError) {
      console.error('Failed to save failure video:', videoError.message);
      videoInfo = 'Video: Failed to save';
    }

    // Create enhanced error with screenshot and video info
    const enhancedError = new Error(error.message);
    enhancedError.screenshotInfo = screenshotInfo;
    enhancedError.videoInfo = videoInfo;
    enhancedError.originalError = error;
    
    throw enhancedError;
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
        console.log(chalk.green(`✓ Navigated to `) + chalk.bold.green(`${step.goto}`));
      }
      
      if (step.click) {
        if (typeof step.click === 'string') {
          await browser.waitForSelector(step.click);
          await browser.click(step.click);
          console.log(chalk.green(`✓ Clicked on element `) + chalk.bold.green(`${step.click}`));
        } else if (step.click.text) {
          const timeout = step.click.timeout || browser.browser.options.timeout;
          const page = browser.getPage();
          await page.waitForFunction(
            (searchText) => {
              if (!document || !document.body) return false;
              return document.body.innerText && document.body.innerText.includes(searchText);
            },
            step.click.text,
            { timeout }
          );
          await page.click(`text="${step.click.text}"`);
          console.log(chalk.green(`✓ Clicked on text `) + chalk.bold.green(`"${step.click.text}"`));
        } else if (step.click.selector) {
          const timeout = step.click.timeout || browser.browser.options.timeout;
          await browser.waitForSelector(step.click.selector, timeout);
          await browser.click(step.click.selector);
          console.log(chalk.green(`✓ Clicked on element `) + chalk.bold.green(`${step.click.selector}`));
        } else {
          throw new Error('click action must specify either a string selector, text, or selector object');
        }
      }
      
      if (step.type) {
        await browser.waitForSelector(step.type.selector);
        await browser.type(step.type.selector, step.type.text);
        console.log(chalk.green(`✓ Typed `) + chalk.bold.green(`"${step.type.text}"`) + chalk.green(` into `) + chalk.bold.green(`${step.type.selector}`));
      }
      
      if (step.selectOption) {
        await browser.waitForSelector(step.selectOption.selector);
        await browser.selectOption(step.selectOption.selector, step.selectOption.value);
        console.log(chalk.green(`✓ Selected `) + chalk.bold.green(`"${step.selectOption.value}"`) + chalk.green(` from `) + chalk.bold.green(`${step.selectOption.selector}`));
      }
      
      if (step.evaluate) {
        await browser.waitForSelector(step.evaluate.selector);
        await browser.evaluate(step.evaluate.script, step.evaluate.selector);
        console.log(chalk.green(`✓ Executed script on `) + chalk.bold.green(`${step.evaluate.selector}`));
      }
      
      if (step.randomFill) {
        await browser.randomFill(step.randomFill);
      }
      
      if (step.expect) {
        await browser.waitForSelector(step.expect.selector);
        const text = await browser.getText(step.expect.selector);
        if (!text.includes(step.expect.text)) {
          throw new Error(`Expected text "${step.expect.text}" not found. Got: "${text}"`);
        }
        console.log(chalk.green(`✓ Text `) + chalk.bold.green(`"${step.expect.text}"`) + chalk.green(` is verified`));
      }
      
      if (step.wait) {
        if (step.wait.text) {
          const timeout = step.wait.timeout || browser.browser.options.timeout;
          const page = browser.getPage();
          await page.waitForFunction(
            (searchText) => {
              if (!document || !document.body) return false;
              return document.body.innerText && document.body.innerText.includes(searchText);
            },
            step.wait.text,
            { timeout }
          );
          console.log(chalk.green(`✓ Text `) + chalk.bold.green(`"${step.wait.text}"`) + chalk.green(` is found`));
        } else if (step.wait.selector) {
          const timeout = step.wait.timeout || browser.browser.options.timeout;
          await browser.waitForSelector(step.wait.selector, timeout);
          console.log(chalk.green(`✓ Element `) + chalk.bold.green(`${step.wait.selector}`) + chalk.green(` is found`));
        } else {
          throw new Error('wait action must specify either "text" or "selector"');
        }
      }
      
      if (step.snapshot) {
        const filename = screenshotManager.generateTestSuccessFilename(testName, step.snapshot);
        const screenshotPath = screenshotManager.getSuccessScreenshotPath(filename);
        await browser.screenshot(screenshotPath);
        console.log(chalk.green(`✓ Screenshot `) + chalk.bold.green(`${filename}`) + chalk.green(` is taken`));
      }
      
      if (step.pause) {
        await new Promise(resolve => setTimeout(resolve, step.pause));
        console.log(chalk.green(`✓ Paused for `) + chalk.bold.green(`${step.pause}ms`));
      }

      // login - Logs in with username/password
      if (step.login) {
        await browser.login(step.login);
      }

      // logout - Logs out and verifies redirect
      if (step.logout) {
        const { logoutSelector, successIndicator } = step.logout;
        await browser.logout(logoutSelector, successIndicator);
      }

      // goto_with_auth - Navigates with auth token
      if (step.goto_with_auth) {
        const { url, authToken, tokenHeader } = step.goto_with_auth;
        await browser.gotoWithAuth(url, authToken, tokenHeader);
      }

      // click_if_visible - Clicks only if visible
      if (step.click_if_visible) {
        const { selector, options } = step.click_if_visible;
        await browser.clickIfVisible(selector, options);
      }

      // select_from_dropdown - Selects dropdown option by text
      if (step.select_from_dropdown) {
        const { selector, optionText, options } = step.select_from_dropdown;
        await browser.selectFromDropdown(selector, optionText, options);
      }

      // hover_and_click - Hover then click submenu
      if (step.hover_and_click) {
        const { hoverSelector, clickSelector, options } = step.hover_and_click;
        await browser.hoverAndClick(hoverSelector, clickSelector, options);
      }

      // upload_file - Uploads and verifies file
      if (step.upload_file) {
        const { fileInputSelector, filePath, successIndicator, uploadButtonSelector } = step.upload_file;
        await browser.uploadFile(fileInputSelector, filePath, successIndicator, uploadButtonSelector);
      }

      // download_and_verify - Downloads and verifies file
      if (step.download_and_verify) {
        const { downloadSelector, expectedSize, expectedContent } = step.download_and_verify;
        await browser.downloadAndVerify(downloadSelector, expectedSize, expectedContent);
      }

      // take_screenshot - Takes named screenshot
      if (step.take_screenshot) {
        const { name, options } = step.take_screenshot;
        await browser.takeScreenshot(name, options);
      }

      // verify_table_row - Verifies table contains specific row
      if (step.verify_table_row) {
        const { tableSelector, expectedRow } = step.verify_table_row;
        await browser.verifyTableRow(tableSelector, expectedRow);
      }

      // assert_element_count - Asserts element count
      if (step.assert_element_count) {
        const { selector, expectedCount, operator } = step.assert_element_count;
        await browser.assertElementCount(selector, expectedCount, operator);
      }

      // check_api_response - Checks API response
      if (step.check_api_response) {
        const { url, method, headers, body, expectedStatus, expectedContent } = step.check_api_response;
        await browser.checkApiResponse(url, method, headers, body, expectedStatus, expectedContent);
      }

      // assert_element_not_present - Asserts element doesn't exist
      if (step.assert_element_not_present) {
        const { selector, timeout } = step.assert_element_not_present;
        await browser.assertElementNotPresent(selector, timeout || browser.browser.options.timeout);
      }

      // measure_performance - Measures performance
      if (step.measure_performance) {
        const { action, options } = step.measure_performance;
        await browser.measurePerformance(action, options);
      }

      // repeat - Repeats steps
      if (step.repeat) {
        const { steps: repeatSteps, count, options } = step.repeat;
        await browser.repeat(repeatSteps, count, options);
      }

      // run_if - Runs steps conditionally
      if (step.run_if) {
        const { condition, steps: conditionalSteps, options } = step.run_if;
        await browser.runIf(condition, conditionalSteps, options);
      }

      // store_text - Stores text in variable
      if (step.store_text) {
        const { selector, variableName } = step.store_text;
        await browser.storeText(selector, variableName);
      }

      // compare_values - Compares values
      if (step.compare_values) {
        const { value1, value2, operator, options } = step.compare_values;
        await browser.compareValues(value1, value2, operator, options);
      }

      // random_fill - Fills form with random data
      if (step.random_fill) {
        const { formData } = step.random_fill;
        await browser.randomFill(formData);
      }

      // resize_viewport - Resizes viewport for responsive testing
      if (step.resize_viewport) {
        const { width, height, device } = step.resize_viewport;
        await browser.resizeViewport(width, height, device);
      }

      // swipe - Performs swipe gesture
      if (step.swipe) {
        const { selector, direction, distance } = step.swipe;
        await browser.swipe(selector, direction, distance);
      }

      // tap - Performs tap gesture
      if (step.tap) {
        const { selector, pressure } = step.tap;
        await browser.tap(selector, pressure);
      }

      // drag_and_drop - Drags and drops elements
      if (step.drag_and_drop) {
        const { source, target } = step.drag_and_drop;
        await browser.dragAndDrop(source, target);
      }

      // multi_select - Selects multiple options
      if (step.multi_select) {
        const { selector, options } = step.multi_select;
        await browser.multiSelect(selector, options);
      }

      // press_keys - Presses keyboard keys
      if (step.press_keys) {
        const { keys, targetSelector } = step.press_keys;
        await browser.pressKeys(keys, targetSelector);
      }

      // scroll_to_element - Scrolls to element
      if (step.scroll_to_element) {
        const { selector, behavior } = step.scroll_to_element;
        await browser.scrollToElement(selector, behavior);
      }

      // hover_element - Hovers over element
      if (step.hover_element) {
        const { selector, duration } = step.hover_element;
        await browser.hoverElement(selector, duration);
      }
      
    } catch (error) {
      const stepNumber = i + 1;
      const stepAction = Object.keys(step)[0] || 'unknown';
      const stepDetails = JSON.stringify(step[stepAction] || step);
      throw new Error(`Step ${stepNumber} (${stepAction}): ${stepDetails}\nFailure: ${error.message || error}`);
    }
  }
}