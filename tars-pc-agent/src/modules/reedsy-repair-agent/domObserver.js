const crypto = require('crypto');
const browserController = require('./browserController');
const logger = require('../../shared/logger');

/**
 * @class DOMObserver
 * @description Observes a specific DOM element (e.g., a rich text editor) within a browser page,
 * extracts its content, and monitors it for changes.
 */
class DOMObserver {
    /**
     * @param {object} [options={}]
     * @param {number} [options.pollInterval=2000] - The interval in milliseconds to check for DOM changes.
     */
    constructor(options = {}) {
        this.pollInterval = options.pollInterval || 2000;
        this.monitoringTimer = null;
        this.lastContentHash = null;
    }

    /**
     * Executes a script in the browser to find the editor and extract its state.
     * @returns {Promise<object|null>} A promise that resolves to the editor's state or null if not found.
     */
    async getEditorState() {
        try {
            const script = `
                (() => {
                    const selectors = [
                        '.ProseMirror', // Common in modern editors
                        '.ql-editor', // Quill.js
                        '[contenteditable="true"]', // Generic fallback
                        '.editor-content',
                        '#editor-content',
                        '[data-testid="editor-content"]'
                    ];
                    
                    for (const selector of selectors) {
                        const editor = document.querySelector(selector);
                        // Ensure the editor is visible and part of the DOM
                        if (editor && editor.offsetParent !== null) {
                            return {
                                html: editor.innerHTML,
                                text: editor.innerText || editor.textContent,
                                wordCount: (editor.innerText || '').split(/\\s+/).filter(Boolean).length,
                                hasContent: editor.innerText.trim().length > 0,
                                timestamp: Date.now(),
                            };
                        }
                    }
                    return { error: 'Supported editor element not found or is not visible.' };
                })();
            `;
            
            const result = await browserController.executeScript(script);
            if (result.error) {
                logger.debug(`getEditorState: ${result.error}`);
                return null;
            }
            return result;
            
        } catch (error) {
            logger.error('Failed to execute script in browser to get editor state.', { error });
            return null;
        }
    }

    /**
     * Starts monitoring the editor for changes at a set interval.
     * @param {Function} changeCallback - The function to call with the new editor state when a change is detected.
     */
    startMonitoring(changeCallback) {
        if (this.monitoringTimer) {
            logger.warn('Monitoring is already active. Stop it before starting again.');
            return;
        }

        logger.info(`Starting DOM monitoring with a ${this.pollInterval}ms interval.`);
        
        this.monitoringTimer = setInterval(async () => {
            const currentState = await this.getEditorState();
            if (!currentState) return;

            const currentHash = crypto.createHash('sha256').update(currentState.html).digest('hex');

            if (this.lastContentHash !== currentHash) {
                logger.debug('DOM change detected.');
                this.lastContentHash = currentHash;
                changeCallback(currentState);
            }
        }, this.pollInterval);
    }

    /**
     * Stops the active monitoring interval.
     */
    stopMonitoring() {
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
            this.lastContentHash = null;
            logger.info('DOM monitoring stopped.');
        }
    }

    /**
     * Waits for the editor element to become available in the DOM.
     * @param {number} [timeout=15000] - Maximum time to wait in milliseconds.
     * @returns {Promise<object>} The editor state once found.
     * @throws {Error} If the editor is not found within the timeout period.
     */
    async waitForEditor(timeout = 15000) {
        const startTime = Date.now();
        logger.info('Waiting for editor to become available...');

        while (Date.now() - startTime < timeout) {
            const editorState = await this.getEditorState();
            if (editorState) {
                logger.info('Editor found.');
                this.lastContentHash = crypto.createHash('sha256').update(editorState.html).digest('hex');
                return editorState;
            }
            // Wait for a short period before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error(`Editor not found within the ${timeout}ms timeout.`);
    }
}

module.exports = DOMObserver;