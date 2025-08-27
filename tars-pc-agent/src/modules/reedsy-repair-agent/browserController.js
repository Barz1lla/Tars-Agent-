const puppeteer = require('puppeteer');
const logger = require('../../shared/logger');

/**
 * @class BrowserController
 * @description A controller for managing and interacting with a browser instance using Puppeteer.
 */
class BrowserController {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    /**
     * Launches a browser instance and navigates to a specified URL.
     * @param {string} url - The URL to navigate to.
     * @param {object} [options={}] - Puppeteer launch options.
     * @returns {Promise<void>}
     */
    async initialize(url, options = { headless: false, defaultViewport: null }) {
        if (this.browser) {
            logger.warn('Browser is already initialized. Close it before initializing again.');
            return;
        }
        try {
            logger.info('🚀 Launching browser instance...');
            this.browser = await puppeteer.launch(options);
            this.page = await this.browser.newPage();
            
            logger.info(`Navigating to ${url}...`);
            await this.page.goto(url, { waitUntil: 'networkidle2' });
            
            logger.info('✅ Browser initialized and page loaded.');
        } catch (error) {
            logger.error('Browser initialization failed.', { error });
            await this.close(); // Attempt to clean up on failure
            throw error; // Re-throw the error for the caller to handle
        }
    }

    /**
     * Executes a script in the context of the page and returns the result.
     * @param {string|Function} script - The script or function to execute.
     * @param {...any} args - Arguments to pass to the script function.
     * @returns {Promise<any>} The return value of the script.
     */
    async executeScript(script, ...args) {
        if (!this.page) throw new Error('Page is not initialized. Call initialize() first.');
        try {
            // page.evaluate runs the script in the browser context
            return await this.page.evaluate(script, ...args);
        } catch (error) {
            logger.error('Failed to execute script in browser.', { error });
            throw error;
        }
    }

    /**
     * Clicks an element specified by a selector.
     * @param {string} selector - The CSS selector of the element to click.
     * @returns {Promise<void>}
     */
    async click(selector) {
        if (!this.page) throw new Error('Page is not initialized.');
        try {
            await this.page.waitForSelector(selector, { visible: true });
            await this.page.click(selector);
            logger.debug(`Clicked element: ${selector}`);
        } catch (error) {
            logger.error(`Failed to click element: ${selector}`, { error });
            throw error;
        }
    }

    /**
     * Types text into an element specified by a selector.
     * @param {string} selector - The CSS selector of the element to type into.
     * @param {string} text - The text to type.
     * @param {object} [options={ delay: 50 }] - Options for the typing action.
     * @returns {Promise<void>}
     */
    async type(selector, text, options = { delay: 50 }) {
        if (!this.page) throw new Error('Page is not initialized.');
        try {
            await this.page.waitForSelector(selector, { visible: true });
            await this.page.type(selector, text, options);
            logger.debug(`Typed text into: ${selector}`);
        } catch (error) {
            logger.error(`Failed to type into element: ${selector}`, { error });
            throw error;
        }
    }

    /**
     * Closes the browser instance and cleans up resources.
     * @returns {Promise<void>}
     */
    async close() {
        if (this.browser) {
            try {
                await this.browser.close();
                logger.info('Browser closed successfully.');
            } catch (error) {
                logger.error('Error closing the browser.', { error });
            } finally {
                this.browser = null;
                this.page = null;
            }
        }
    }
}

// Export a single instance to maintain a singleton pattern across the module
module.exports = new BrowserController();