import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration management for Panoptical
 * Supports both file-based and environment-based configuration
 */
export class Config {
  constructor() {
    this.configPath = path.join(process.cwd(), '.panopticalrc.json');
    this.defaults = {
      browser: 'chromium',
      headless: true,
      timeout: 30000,
      retries: 3,
      artifactsDir: 'artifacts',
      screenshotDir: 'artifacts/screenshots',
      videoDir: 'artifacts/videos',
      logLevel: 'info',
      video: {
        enabled: false,
        dir: 'artifacts/videos',
        onlyOnFailure: true,
        size: { width: 1280, height: 720 }
      }
    };
    
    this.config = this.loadConfig();
  }
  
  /**
   * Load configuration from file or environment
   * @returns {Object} Configuration object
   */
  loadConfig() {
    const config = { ...this.defaults };
    
    // Load from file if it exists
    if (fs.existsSync(this.configPath)) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        Object.assign(config, fileConfig);
      } catch (error) {
        console.warn('Warning: Could not parse .panopticalrc.json, using defaults');
      }
    }
    
    // Override with environment variables
    if (process.env.PANOPTICAL_BROWSER) {
      config.browser = process.env.PANOPTICAL_BROWSER;
    }
    
    if (process.env.PANOPTICAL_HEADLESS) {
      config.headless = process.env.PANOPTICAL_HEADLESS === 'true';
    }
    
    if (process.env.PANOPTICAL_TIMEOUT) {
      config.timeout = parseInt(process.env.PANOPTICAL_TIMEOUT, 10);
    }
    
    if (process.env.PANOPTICAL_RETRIES) {
      config.retries = parseInt(process.env.PANOPTICAL_RETRIES, 10);
    }
    
    // Video configuration environment variables
    if (process.env.PANOPTICAL_VIDEO_ENABLED) {
      config.video = config.video || {};
      config.video.enabled = process.env.PANOPTICAL_VIDEO_ENABLED === 'true';
    }
    
    if (process.env.PANOPTICAL_VIDEO_DIR) {
      config.video = config.video || {};
      config.video.dir = process.env.PANOPTICAL_VIDEO_DIR;
    }
    
    if (process.env.PANOPTICAL_VIDEO_ONLY_ON_FAILURE) {
      config.video = config.video || {};
      config.video.onlyOnFailure = process.env.PANOPTICAL_VIDEO_ONLY_ON_FAILURE === 'true';
    }
    
    return config;
  }
  
  /**
   * Get a configuration value
   * @param {string} key - Configuration key
   * @param {any} defaultValue - Default value if key not found
   * @returns {any} Configuration value
   */
  get(key, defaultValue = undefined) {
    return this.config[key] ?? defaultValue;
  }
  
  /**
   * Set a configuration value
   * @param {string} key - Configuration key
   * @param {any} value - Configuration value
   */
  set(key, value) {
    this.config[key] = value;
  }
  
  /**
   * Save configuration to file
   */
  save() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log(`Configuration saved to ${this.configPath}`);
    } catch (error) {
      console.error('Could not save configuration:', error.message);
    }
  }
  
  /**
   * Create a sample configuration file
   */
  createSample() {
    const sampleConfig = {
      browser: 'chromium',
      headless: false,
      timeout: 30000,
      retries: 3,
      artifactsDir: 'artifacts',
      screenshotDir: 'artifacts/screenshots',
      videoDir: 'artifacts/videos',
      logLevel: 'info',
      video: {
        enabled: false,
        dir: 'artifacts/videos',
        onlyOnFailure: true,
        size: { width: 1280, height: 720 }
      },
      _comment: 'Panoptical configuration file. See documentation for available options.'
    };
    
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(sampleConfig, null, 2));
      console.log(`Sample configuration created at ${this.configPath}`);
      return true;
    } catch (error) {
      console.error('Could not create sample configuration:', error.message);
      return false;
    }
  }
  
  /**
   * Get all configuration as an object
   * @returns {Object} Complete configuration
   */
  getAll() {
    return { ...this.config };
  }
  
  /**
   * Validate configuration
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];
    const warnings = [];
    
    // Validate browser
    if (!['chromium', 'firefox', 'webkit'].includes(this.config.browser)) {
      errors.push(`Invalid browser: ${this.config.browser}. Must be chromium, firefox, or webkit.`);
    }
    
    // Validate timeout
    if (this.config.timeout < 1000) {
      warnings.push('Timeout is very low (< 1000ms), tests may fail unexpectedly.');
    }
    
    // Validate retries
    if (this.config.retries < 0 || this.config.retries > 10) {
      warnings.push('Retries should be between 0 and 10.');
    }
    
    // Validate video configuration
    if (this.config.video) {
      if (this.config.video.enabled && !this.config.video.dir) {
        errors.push('Video directory must be specified when video recording is enabled.');
      }
      
      if (this.config.video.size) {
        if (this.config.video.size.width < 100 || this.config.video.size.height < 100) {
          warnings.push('Video dimensions are very small, may affect recording quality.');
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Print configuration to console
   */
  print() {
    console.log(chalk.bold('Panoptical Configuration:'));
    for (const key in this.config) {
      const value = this.config[key];
      if (key !== '_comment') {
        console.log(chalk.white(`${key}: ${chalk.cyan(value)}`));
      }
    }
  }
}

// Export a singleton instance
export const config = new Config();
