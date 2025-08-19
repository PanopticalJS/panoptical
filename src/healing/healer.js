/**
 * Panoptical Auto-healing Selector System
 * Automatically finds alternative selectors when the primary one fails
 * Makes tests more robust against UI changes
 */

export class SelectorHealer {
  constructor(page, config = {}) {
    this.page = page;
    this.config = {
      enabled: true,
      strategies: ['text', 'semantic', 'partial', 'aria', 'data', 'class', 'parent-child'],
      maxAttempts: 3,
      ...config
    };
    
    // Build healing strategies based on configuration
    this.healingStrategies = this.buildHealingStrategies();
  }

  /**
   * Build healing strategies based on configuration
   */
  buildHealingStrategies() {
    const strategyMap = {
      'text': this.tryTextContent,
      'semantic': this.trySemanticMatching,
      'partial': this.tryPartialText,
      'aria': this.tryAriaAttributes,
      'data': this.tryDataAttributes,
      'class': this.tryClassPatterns,
      'parent-child': this.tryParentChild,
      'sibling': this.trySiblingElements
    };

    return this.config.strategies
      .map(strategy => strategyMap[strategy])
      .filter(Boolean); // Remove undefined strategies
  }

  /**
   * Try to heal a failed selector by finding alternatives
   * @param {string} originalSelector - The selector that failed
   * @param {string} action - What we're trying to do (click, type, etc.)
   * @returns {string|null} - New selector or null if no alternative found
   */
  async healSelector(originalSelector, action = 'click') {
    console.log(`  Auto-healing selector: '${originalSelector}'`);
    
    for (const strategy of this.healingStrategies) {
      try {
        const newSelector = await strategy.call(this, originalSelector, action);
        if (newSelector && await this.isElementVisible(newSelector)) {
          console.log(`  Healed with: ${newSelector}`);
          return newSelector;
        }
      } catch (error) {
        // Continue to next strategy
      }
    }
    
    console.log(`  Could not heal selector: ${originalSelector}`);
    return null;
  }

  /**
   * Strategy 1: Try text content matching with common variations
   */
  async tryTextContent(selector, action) {
    // Extract text from selector (remove #, ., etc.)
    const textContent = selector.replace(/[#.\[\]=]/g, '').trim();
    if (textContent.length < 2) return null;

    // Try exact text match first (correct Playwright syntax)
    const textSelector = `text=${textContent}`;
    if (await this.isElementVisible(textSelector)) {
      return textSelector;
    }

    // For click actions, try to find text that contains our search term
    if (action === 'click') {
      // Try common text variations that might contain our search term
      const textVariations = [
        `text=${textContent}!`,      // with exclamation
        `text=${textContent}?`,      // with question mark
        `text=${textContent} `,      // with trailing space
        `text= ${textContent}`,      // with leading space
        `text=${textContent}.`,      // with period
        `text=${textContent}:`       // with colon
      ];
      
      for (const variation of textVariations) {
        if (await this.isElementVisible(variation)) {
          return variation;
        }
      }
    }

    return null;
  }

  /**
   * Strategy 2: Try semantic matching based on action type
   */
  async trySemanticMatching(selector, action) {
    if (action === 'click') {
      // Try to find any button element first
      if (await this.isElementVisible('button')) {
        return 'button';
      }
      
      // Try to find any clickable element
      const clickableSelectors = ['a', '[role="button"]', '[onclick]'];
      for (const clickableSelector of clickableSelectors) {
        if (await this.isElementVisible(clickableSelector)) {
          return clickableSelector;
        }
      }
    }
    
    if (action === 'fill' || action === 'type') {
      // Try to find any input element
      const inputSelectors = ['input', 'textarea', '[contenteditable]'];
      for (const inputSelector of inputSelectors) {
        if (await this.isElementVisible(inputSelector)) {
          return inputSelector;
        }
      }
    }
    
    return null;
  }

  /**
   * Strategy 3: Try partial text matching
   */
  async tryPartialText(selector, action) {
    const textContent = selector.replace(/[#.\[\]=]/g, '').trim();
    if (textContent.length < 4) return null;

    // Try first half of text
    const halfLength = Math.floor(textContent.length / 2);
    const partialText = textContent.substring(0, halfLength);
    
    const partialSelector = `text*='${partialText}'`;
    if (await this.isElementVisible(partialSelector)) {
      return partialSelector;
    }

    return null;
  }

  /**
   * Strategy 3: Try ARIA attributes
   */
  async tryAriaAttributes(selector, action) {
    const textContent = selector.replace(/[#.\[\]=]/g, '').trim();
    if (textContent.length < 2) return null;

    const ariaSelectors = [
      `[aria-label*='${textContent}']`,
      `[aria-labelledby*='${textContent}']`,
      `[title*='${textContent}']`,
      `[alt*='${textContent}']`
    ];

    for (const ariaSelector of ariaSelectors) {
      if (await this.isElementVisible(ariaSelector)) {
        return ariaSelector;
      }
    }

    return null;
  }

  /**
   * Strategy 4: Try data attributes
   */
  async tryDataAttributes(selector, action) {
    const textContent = selector.replace(/[#.\[\]=]/g, '').trim();
    if (textContent.length < 2) return null;

    const dataSelectors = [
      `[data-testid*='${textContent}']`,
      `[data-test*='${textContent}']`,
      `[data-qa*='${textContent}']`,
      `[data-automation*='${textContent}']`
    ];

    for (const dataSelector of dataSelectors) {
      if (await this.isElementVisible(dataSelector)) {
        return dataSelector;
      }
    }

    return null;
  }

  /**
   * Strategy 5: Try class patterns
   */
  async tryClassPatterns(selector, action) {
    // If selector is a class, try variations
    if (selector.startsWith('.')) {
      const className = selector.substring(1);
      const variations = [
        `.${className}`,
        `[class*='${className}']`,
        `[class*='${className}-']`,
        `[class*='-${className}']`
      ];

      for (const variation of variations) {
        if (await this.isElementVisible(variation)) {
          return variation;
        }
      }
    }

    return null;
  }

  /**
   * Strategy 6: Try parent-child relationships
   */
  async tryParentChild(selector, action) {
    // Try to find parent elements that might contain our target
    const textContent = selector.replace(/[#.\[\]=]/g, '').trim();
    if (textContent.length < 2) return null;

    // Look for parent containers with the text
    const parentSelector = `:has-text('${textContent}')`;
    try {
      const parent = await this.page.locator(parentSelector).first();
      if (await parent.count() > 0) {
        // Find clickable child within parent
        const clickableChild = await parent.locator('button, a, [role="button"], input, textarea').first();
        if (await clickableChild.count() > 0) {
          return clickableChild.toString();
        }
      }
    } catch (error) {
      // Continue to next strategy
    }

    return null;
  }

  /**
   * Strategy 7: Try sibling elements
   */
  async trySiblingElements(selector, action) {
    // This is a fallback strategy
    return null;
  }

  /**
   * Check if an element is visible and actionable
   */
  async isElementVisible(selector) {
    try {
      const element = this.page.locator(selector);
      const count = await element.count();
      if (count === 0) return false;
      
      const firstElement = element.first();
      return await firstElement.isVisible();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get healing statistics
   */
  getStats() {
    return {
      strategies: this.healingStrategies.length,
      description: 'Auto-healing selector system with multiple fallback strategies'
    };
  }
}

/**
 * Convenience function for quick healing
 */
export async function healSelector(page, selector, action = 'click') {
  const healer = new SelectorHealer(page);
  return await healer.healSelector(selector, action);
}
