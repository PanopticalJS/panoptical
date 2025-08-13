# 🧪 Panoptical — See Everything, Test Everything

**A modern, unified browser automation tool that makes Playwright easy to use with simple YAML syntax.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.54+-blue.svg)](https://playwright.dev/)

## 🚀 **What is Panoptical?**

**Panoptical is a testing tool that makes Playwright easy to use.** Instead of writing complex JavaScript code, you write simple YAML files that Panoptical converts into Playwright commands.

### **Why Use Panoptical Instead of Raw Playwright?**

| **With Raw Playwright** | **With Panoptical** |
|-------------------------|---------------------|
| ```javascript<br>const browser = await chromium.launch();<br>const page = await browser.newPage();<br>await page.goto('https://example.com');<br>await page.click('#button');<br>await page.screenshot({path: 'test.png'});<br>await browser.close();``` | ```yaml<br>test: "Simple Test"<br>steps:<br>  - goto: "https://example.com"<br>  - click: "#button"<br>  - snapshot: "test"``` |

**Panoptical gives you:**
- ✅ **Simple YAML syntax** - No JavaScript coding required
- ✅ **Auto-healing selectors** - Automatically fix failing selectors
- ✅ **Professional CLI** - Clean, colored output with human-readable timing
- ✅ **Built-in reliability** - Auto-retries, failure screenshots
- ✅ **Playwright's power** - All the browser automation capabilities

## 🎯 **Quick Start**

### **Installation**

```bash
# Clone the repository
git clone <your-repo-url>
cd panoptical

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Make Panoptical globally available
npm link
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
      timeout: 5000
  - type:
      selector: "#username"
      text: "testuser"
  - type:
      selector: "#password"
      text: "password123"
  - click: "#login-button"
  - expect:
      selector: "#dashboard"
      text: "Welcome"
```

### **Run the Test**

```bash
# Run with visible browser (default)
panoptical run tests

# Run in headless mode
panoptical run tests --headless

# Use specific browser
panoptical run tests --browser firefox
panoptical run tests --browser webkit

# Run a single test file
panoptical run tests/example.yaml --headed
```

## 🔧 **Core Features**

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
- type:
    selector: "#input"
    text: "Hello World"

# Assertions
- expect:
    selector: "#output"
    text: "Success"

# Waiting
- wait:
    selector: "#element"
    timeout: 5000

# Screenshots
- snapshot: "test-result"

# Pausing
- pause: 2000
```

### **3. Built-in Reliability**
- **Auto-retries**: Automatic retry on navigation failures
- **Auto-healing selectors**: Automatically find alternative selectors when elements fail
- **Smart waiting**: Intelligent element detection with timeouts
- **Error handling**: Clear, actionable error messages
- **Failure screenshots**: Automatic screenshots on test failures

### **4. Auto-healing Selectors**

Panoptical automatically tries to heal failing selectors using multiple strategies:

- **Text content matching**: Find elements by their text
- **Partial text matching**: Match elements with similar text
- **ARIA attributes**: Use accessibility attributes as fallbacks
- **Data attributes**: Leverage test-specific attributes
- **Class patterns**: Try variations of CSS classes
- **Parent-child relationships**: Find elements within containers

### **5. Screenshot Management**

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

### **6. Video Recording on Failure**

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

## 📁 **Project Structure**

```
panoptical/
├── src/
│   ├── browser/           # Browser automation engine (Playwright wrapper)
│   │   ├── engine.js      # Core browser control with auto-healing
│   │   └── compatibility.js # YAML interface compatibility layer
│   ├── cli.js             # Command-line interface
│   ├── config.js          # Configuration management
│   ├── declarative/       # YAML test parser
│   ├── flakiness/         # Test reliability analysis
│   ├── healing/           # Auto-healing selector system
│   ├── runner/            # Test execution engine
│   └── utils/             # Utility functions (screenshots)
├── tests/                 # Test files
│   └── test-page.html     # Test HTML page
├── package.json           # Dependencies & scripts
└── README.md              # This file
```

## ⚙️ **Configuration**

### **Command Line Options**

```bash
# Browser selection
--browser chromium    # Use Chromium (default)
--browser firefox     # Use Firefox
--browser webkit      # Use WebKit

# Visibility mode
--headed             # Visible browser (default)
--headless           # Hidden browser

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

## 🧪 **Advanced Testing**

### **Complex Test Scenarios**

```yaml
test: "E-commerce Checkout Flow"
description: "Complete purchase process testing"
setup:
  - goto: "https://shop.example.com"
  - wait:
      selector: ".product-grid"
      timeout: 10000
steps:
  # Product selection
  - click: ".product-card:first-child"
  - wait:
      selector: "#add-to-cart"
      timeout: 5000
  - click: "#add-to-cart"
  
  # Cart management
  - expect:
      selector: "#cart-count"
      text: "1"
  - click: "#view-cart"
  
  # Checkout process
  - click: "#checkout-button"
  - type:
      selector: "#email"
      text: "test@example.com"
  - type:
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

## 🚀 **Performance & Scale**

### **Test Execution**

```bash
# Run all tests in directory
panoptical run tests

# Run specific test file
panoptical run tests/smoke.yaml

# Run with different browsers
panoptical run tests --browser firefox
panoptical run tests --browser webkit

# Run in headless mode for CI/CD
panoptical run tests --headless
```

### **CI/CD Integration**

```yaml
# GitHub Actions example
name: Panoptical Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install
      - run: panoptical run tests --headless
```

## 🔍 **Debugging & Troubleshooting**

### **Common Issues**

1. **Browser not launching**
   ```bash
   # Install browser binaries
   npx playwright install
   ```

2. **Element not found**
   ```yaml
   # Increase timeout
   - wait:
       selector: "#element"
       timeout: 10000
   ```

3. **Test flakiness**
   ```bash
   # Analyze test reliability
   panoptical analyze-flakes
   ```

### **Debug Features**

- **Headed mode**: See browser actions in real-time
- **Failure screenshots**: Automatic capture on failures
- **Auto-healing feedback**: See which selectors are being healed
- **Human-readable timing**: Test durations in minutes/seconds format

## 📊 **Available Commands**

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

## 🤝 **Contributing**

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add tests**
5. **Submit a pull request**

### **Development Setup**

```bash
git clone <your-repo-url>
cd panoptical
npm install
npx playwright install

# Run tests
panoptical run tests --headed
```

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- Built on top of [Playwright](https://playwright.dev/) for robust browser automation
- Inspired by modern testing frameworks and developer experience
- Community feedback and contributions

---

**Panoptical** - Playwright made simple with YAML. 🚀
