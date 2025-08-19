# Playwright Made Simple, Testing Made Delightful

**A modern, unified browser automation tool that makes Playwright easy to use with simple YAML syntax.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.54+-blue.svg)](https://playwright.dev/)
[![npm version](https://badge.fury.io/js/panoptical.svg)](https://www.npmjs.com/package/panoptical)
[![npm downloads](https://img.shields.io/npm/dm/panoptical.svg)](https://www.npmjs.com/package/panoptical)

![Banner](https://panoptical.dev/testing/ghbanner.jpg)

## **Documentation**

**[Full Documentation](https://panoptical.dev)** - Comprehensive guides, examples, and API reference

**[Getting Started](https://panoptical.dev/docs/getting-started)** - Write your first test in minutes

**[Examples](https://panoptical.dev/docs/examples/basic-testing)** - Real-world test scenarios

**[CLI Reference](https://panoptical.dev/docs/cli/commands)** - Complete command reference

---

## **What is Panoptical?**

**Panoptical is a testing tool that makes Playwright easy to use.** Instead of writing complex JavaScript code, you write simple YAML files that Panoptical converts into Playwright commands.

### **Why Use Panoptical Instead of Raw Playwright?**

**Raw Playwright (Complex JavaScript):**
```javascript
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://example.com');
await page.click('#button');
await page.screenshot({path: 'test.png'});
await browser.close();
```

**Panoptical (Simple YAML):**
```yaml
test: 'Simple Test'
steps:
  - goto: 'https://example.com'
  - click: '#button'
  - snapshot: 'test'
```

**Panoptical gives you:**
- **Simple YAML syntax** - No JavaScript coding required
- **Auto-healing selectors** - Automatically fix failing selectors
- **Professional CLI** - Clean, colored output with human-readable timing
- **Built-in reliability** - Auto-retries, failure screenshots
- **Playwright's power** - All the browser automation capabilities
- **Advanced Features** - High-level automation methods that make testing delightful

## **Advanced Features That Make Testing Delightful**

Panoptical includes **powerful automation methods** that transform it from a basic tool into a **high-level testing framework**. These features make complex testing scenarios simple and enjoyable:

### **Beautiful Test Reports**
- **Web Dashboard** - Beautiful, interactive reports accessible via browser
- **Real-time Updates** - Live data that refreshes automatically
- **Interactive Charts** - Visual test results and performance trends
- **Flakiness Analysis** - Built-in integration with test reliability metrics
- **Team Collaboration** - Share dashboards with your development team

### **Core Browser Actions**
- **`login`** - Smart authentication with automatic verification
- **`logout`** - Clean session management with verification
- **`goto_with_auth`** - Navigate to protected pages with auth tokens
- **`wait`** - Unified wait action for elements or text with configurable timeout
- **`click_if_visible`** - Smart clicking that won't fail
- **`fill`** - Fast form filling (instant text insertion)
- **`type`** - Realistic typing simulation with configurable delays

### **UI Interaction Helpers**
- **`select_from_dropdown`** - Human-friendly dropdown selection by text
- **`hover_and_click`** - Complex menu navigation made simple
- **`upload_file`** - File upload with automatic verification
- **`download_and_verify`** - Download and verify file contents
- **`take_screenshot`** - Named screenshots for better debugging

### **Data & Verification**
- **`verify_table_row`** - Verify table data without complex selectors
- **`assert_element_count`** - Check element quantities with operators
- **`check_api_response`** - API testing from UI tests
- **`assert_element_not_present`** - Verify elements are removed
- **`measure_performance`** - Built-in performance monitoring

### **Flow Control**
- **`repeat`** - Loop through actions multiple times
- **`run_if`** - Conditional execution based on conditions
- **`store_text`** - Save values in variables for later use
- **`compare_values`** - Compare values with flexible operators
- **`random_fill`** - Generate random test data automatically

### **Mobile & Responsive Testing**
- **`resize_viewport`** - Test responsive design with custom dimensions
- **`swipe`** - Perform swipe gestures (left, right, up, down)
- **`tap`** - Simulate mobile tap interactions

### **Advanced Element Interactions**
- **`drag_and_drop`** - Drag elements to targets with precision
- **`multi_select`** - Select multiple options from checkboxes/dropdowns
- **`press_keys`** - Keyboard shortcuts and key combinations
- **`scroll_to_element`** - Scroll to make elements visible
- **`hover_element`** - Hover interactions with configurable duration
- **`iframe_action`** - Perform actions inside iframes (click, type, get_text, evaluate, etc.)

## **Quick Start**

### **Installation**

**Prerequisites:**
- Node.js 18+ 
- npm or pnpm

#### **Option 1: NPM Package (Recommended for users)**

```bash
# Install globally for CLI usage
npm install -g panoptical

# Or install locally in your project
npm install --save-dev panoptical
```

#### **Option 2: Development Setup (for contributors)**

```bash
# Clone the repository
git clone https://github.com/PanopticalJS/panoptical.git
cd panoptical

# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install

# Make Panoptical globally available
pnpm link --global
```

### **Quick Start**

```bash
# With npm package (global installation)
panoptical run tests

# With npm package (local installation)
npx panoptical run tests

# With development setup
pnpm start
```

### **Your First Test**

Create `tests/example.yaml`:

```yaml
test: "Simple Login Test"
description: "Test user authentication flow"
steps:
  - goto: "https://example.com/login"
  - wait:
      selector: "#username"
  - fill:
      selector: "#username"
      text: "testuser"
  - fill:
      selector: "#password"
      text: "password123"
  - click: "#login-button"
  - expect:
      selector: "#dashboard"
      text: "Welcome"
```

### **Advanced Test Example**

```yaml
test: 'Advanced User Journey'
steps:
  # Smart login with verification
  - login:
      username: 'test@example.com'
      password: 'password123'
      usernameSelector: '#email'
      passwordSelector: '#password'
      successIndicator: '.dashboard'
  
  # Wait for welcome message
  - wait:
      text: 'Welcome back'
      timeout: 5000
  
  # Fill form with random data
  - random_fill:
      formData:
        '#first-name': 'firstName'
        '#email': 'email'
        '#company': 'company'
  
  # Verify table data
  - verify_table_row:
      tableSelector: '#users-table'
      expectedRow:
        'Name': 'John Doe'
        'Role': 'User'
```

### **Mobile & Advanced Interactions Example**

```yaml
test: 'Mobile E-commerce Test'
steps:
  # Test responsive design
  - resize_viewport:
      width: 375
      height: 667
      device: 'iPhone SE'
  
  # Navigate and interact
  - goto: 'https://store.example.com'
  - swipe:
      selector: '.product-carousel'
      direction: 'left'
      distance: 200
  
  # Advanced interactions
  - drag_and_drop:
      source: '#product-item'
      target: '#shopping-cart'
  
  - multi_select:
      selector: '.size-options'
      options: ['Small', 'Medium']
  
  - press_keys:
      keys: ['Control', 'A']
      targetSelector: '#search-input'
  
  - scroll_to_element:
      selector: '#checkout-button'
  
  - hover_element:
      selector: '.tooltip-trigger'
      duration: 2000
```

### **Fill vs Type Actions Example**

```yaml
test: 'Form Input Testing Demo'
description: 'Demonstrates the difference between fill and type actions'
steps:
  - goto: 'https://example.com/form'
  
  # Fast form filling for efficiency
  - fill:
      selector: '#email'
      text: 'user@example.com'
  - fill:
      selector: '#name'
      text: 'John Doe'
  
  # Realistic typing simulation
  - type:
      selector: '#message'
      text: 'This text is typed character by character'
      delay: 150  # 150ms delay between characters
  
  # Even slower typing for dramatic effect
  - type:
      selector: '#notes'
      text: 'Very slow typing simulation'
      delay: 300  # 300ms delay between characters
```

### **Run the Test**

```bash
# Run with visible browser
panoptical run tests --headed

# Run in headless mode (default)
panoptical run tests

# Use specific browser
panoptical run tests --browser firefox
panoptical run tests --browser webkit

# Run a single test file
panoptical run tests/example.yaml --headed
```

## **Core Features**

### **1. Playwright Made Simple**
- **All Playwright browsers**: Chromium, Firefox, WebKit
- **All Playwright capabilities**: Navigation, clicking, typing, screenshots
- **Simple interface**: YAML instead of JavaScript
- **Same reliability**: Playwright's battle-tested automation

### **2. Simple YAML Syntax**
```yaml
# Navigation
- goto: "https://example.com"

# Interactions
- click: "#button"
- fill:
    selector: "#input"
    text: "Hello World"
- type:
    selector: "#input"
    text: "Hello World"
    delay: 100  # Optional: customize typing delay (default: 100ms)

# Assertions
- expect:
    selector: "#output"
    text: "Success"

# Unified Waiting
- wait:
    selector: "#element"  # Wait for element to appear
- wait:
    text: "Loading complete"  # Wait for text to appear
- wait:
    selector: "#slow-element"
    timeout: 60000  # Custom timeout

# Screenshots
- snapshot: "test-result"

# Pausing
- pause: 2000
```

### **3. Built-in Reliability**
- **Auto-retries**: Automatic retry on navigation failures
- **Auto-healing selectors**: Automatically find alternative selectors when elements fail (experimental, disabled by default)
- **Smart waiting**: Intelligent element detection with timeouts
- **Error handling**: Clear, actionable error messages
- **Failure screenshots**: Automatic screenshots on test failures

### **4. Fill vs Type Actions**

Panoptical provides two different text input actions for different testing scenarios:

**`fill` Action - Fast Form Filling:**
```yaml
- fill:
    selector: '#email'
    text: 'user@example.com'
```
- Uses `page.fill()` for instant text insertion
- Perfect for form automation and fast testing
- No delays between characters

**`type` Action - Realistic Typing Simulation:**
```yaml
- type:
    selector: '#email'
    text: 'user@example.com'
    delay: 100  # Optional: customize delay (default: 100ms)
```
- Uses `page.type()` with configurable delays
- Simulates human typing behavior
- Great for testing realistic user interactions
- Can customize the delay between characters

**Use Cases:**
- **`fill`**: When you want fast, efficient form filling for bulk testing
- **`type`**: When you want to test realistic user behavior, debug timing issues, or simulate human interaction patterns

### **5. Auto-healing Selectors (Experimental)**

Panoptical can automatically try to heal failing selectors using multiple strategies. **This feature is disabled by default** and should be used with caution.

**Enable auto-healing:**
```bash
# Command line flag
panoptical run tests --auto-healing

# Environment variable
export PANOPTICAL_AUTO_HEALING_ENABLED=true
panoptical run tests

# Configuration file (.panopticalrc.json)
{
  "autoHealing": {
    "enabled": true,
    "strategies": ["text", "semantic", "partial", "aria", "data", "class", "parent-child"],
    "maxAttempts": 3
  }
}
```

**Healing Strategies:**
- **Text content matching**: Find elements by their text
- **Partial text matching**: Match elements with similar text
- **Semantic matching**: Understand action context (click vs fill)
- **ARIA attributes**: Use accessibility attributes as fallbacks
- **Data attributes**: Leverage test-specific attributes
- **Class patterns**: Try variations of CSS classes
- **Parent-child relationships**: Find elements within containers

**⚠️ Warning**: Auto-healing can make tests slower and sometimes mask real selector issues. Use for experimentation and debugging, not for production reliability.

### **6. Screenshot Management**

```bash
# List all screenshots
panoptical screenshots list

# Clean old screenshots (keep last 10)
panoptical screenshots clean

# Force cleanup (remove all)
panoptical screenshots force-clean

# Clean by age (remove older than N days)
panoptical screenshots clean-old 7
```

### **7. Video Recording on Failure**

Panoptical can record videos during test execution and automatically save them only when tests fail:

```bash
# Enable video recording
panoptical run tests --video

# Or configure permanently
panoptical config set video.enabled true
```

**Video Features:**
- **Automatic recording**: Records all tests when enabled
- **Failure-only storage**: Only saves videos for failed tests
- **Automatic cleanup**: Deletes videos for passing tests
- **Configurable quality**: Set video dimensions and directory
- **Easy management**: CLI commands to list and clean videos

```bash
# List failure videos
panoptical videos list

# Clean old videos (keep last 10)
panoptical videos clean

# Force cleanup (remove all)
panoptical videos force-clean

# Clean by age (remove older than N days)
panoptical videos clean-old 7
```

**Video Configuration:**
```json
{
  "video": {
    "enabled": false,
    "dir": "artifacts/videos",
    "onlyOnFailure": true,
    "size": {
      "width": 1280,
      "height": 720
    }
  }
}
```

### **8. Beautiful Test Reports**

Panoptical provides a beautiful, interactive web dashboard for viewing test results:

```bash
# Start reports server
panoptical reports

# Start on custom port
panoptical reports --port 3001

# Start and auto-open browser
panoptical reports --open

# Bind to all interfaces (for team access)
panoptical reports --host 0.0.0.0 --port 8080
```

**Reports Features:**
- **Interactive Dashboard**: Beautiful statistics and charts
- **Real-time Updates**: Data refreshes automatically every 30 seconds
- **Test Details**: Click any test to see detailed run history
- **Flakiness Analysis**: Built-in integration with reliability metrics
- **Responsive Design**: Works perfectly on all devices
- **Team Access**: Share dashboards with your development team

**Available Endpoints:**
- **Dashboard**: `http://localhost:3000` (or your custom port)
- **API Data**: `http://localhost:3000/api/test-data`
- **Test Details**: `http://localhost:3000/test/[test-name]`

**NPM Scripts:**
```bash
npm run reports          # Start reports server
npm run reports:open     # Start and open browser
```

## **Project Structure**

```
panoptical/
├── src/
│   ├── browser/           # Browser automation engine (Playwright wrapper)
│   │   ├── engine.js      # Core browser control with auto-healing
│   │   └── compatibility.js # YAML interface compatibility layer
│   ├── cli.js             # Command-line interface
│   ├── config.js          # Configuration management
│   ├── core/             # Test execution engine & YAML parser
│   ├── flakiness/         # Test reliability analysis
│   ├── healing/           # Auto-healing selector system
│   └── utils/             # Utility functions (screenshots)
├── tests/                 # Test files
│   └── test-page.html     # Test HTML page
├── docs/                  # Documentation (Docusaurus)
├── package.json           # Dependencies & scripts
└── README.md              # This file
```

## **Configuration**

### **Command Line Options**

```bash
# Browser selection
--browser chromium    # Use Chromium (default)
--browser firefox     # Use Firefox
--browser webkit      # Use WebKit

# Visibility mode
--headed             # Visible browser
--headless           # Hidden browser (default)

# Performance
--timeout 30000      # Default timeout (ms)
--retries 3          # Retry attempts
```

### **Configuration File**

Create `.panopticalrc.json`:

```json
{
  "browser": "chromium",
  "headless": false,
  "timeout": 30000,
  "retries": 3
}
```

### **Environment Variables**

```bash
export PANOPTICAL_BROWSER=firefox
export PANOPTICAL_HEADLESS=true
export PANOPTICAL_TIMEOUT=60000
```

## **Advanced Testing**

### **Complex Test Scenarios**

```yaml
test: "E-commerce Checkout Flow"
description: "Complete purchase process testing"
setup:
  - goto: "https://shop.example.com"
  - wait:
      selector: ".product-grid"
steps:
  # Product selection
  - click: ".product-card:first-child"
  - wait:
      selector: "#add-to-cart"
  - click: "#add-to-cart"
  
  # Cart management
  - expect:
      selector: "#cart-count"
      text: "1"
  - click: "#view-cart"
  
  # Checkout process
  - click: "#checkout-button"
  - fill:
      selector: "#email"
      text: "test@example.com"
  - fill:
      selector: "#card-number"
      text: "4242424242424242"
  - click: "#complete-order"
  
  # Success verification
  - expect:
      selector: "#success-message"
      text: "Order confirmed"
teardown:
  - goto: "https://shop.example.com"
```

### **Auto-healing in Action**

```yaml
test: "Auto-healing Demo"
description: "Demonstrates automatic selector healing"
steps:
  # These selectors will fail but auto-healing will find alternatives
  - goto: "https://example.com"
  - click: "Login"  # Auto-healing converts to text="Login"
  - type:
      selector: "Username"  # Auto-healing finds the input field
      text: "testuser"
```

## **Performance & Scale**

### **Test Execution**

```bash
# Run all tests in directory
panoptical run tests

# Run specific test file
panoptical run tests/smoke.yaml

# Run with different browsers
panoptical run tests --browser firefox
panoptical run tests --browser webkit

# Enable experimental features
panoptical run tests --auto-healing  # Enable auto-healing
panoptical run tests --video         # Enable video recording
```

## **Available Commands**

```bash
# Test execution
panoptical run <test-path> [options]

# Screenshot management
panoptical screenshots list
panoptical screenshots clean
panoptical screenshots force-clean
panoptical screenshots clean-old <days>

# Video management
panoptical videos list
panoptical videos clean
panoptical videos force-clean
panoptical videos clean-old <days>

# Configuration
panoptical config show
panoptical config set <key> <value>
panoptical config create

# Flakiness analysis
panoptical analyze-flakes

# Help
panoptical help
```

## **Contributing**

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Submit a pull request**

### **Development Setup**

```bash
git clone <your-repo-url>
cd panoptical
pnpm install
pnpm exec playwright install

# Run tests
panoptical run tests
```

## **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## **Acknowledgments**

- Built on top of [Playwright](https://playwright.dev/) for robust browser automation
- Inspired by modern testing frameworks and developer experience
- Community feedback and contributions

---

**Panoptical** - Playwright made simple with YAML. 🚀

**📚 [Full Documentation](https://panoptical.dev)** | **🐛 [Report Issues](https://github.com/PanopticalJS/panoptical/issues)** | **💬 [Discussions](https://github.com/PanopticalJS/panoptical/discussions)**
