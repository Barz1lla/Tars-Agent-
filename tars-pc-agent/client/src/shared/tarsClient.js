const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');

class TarsClient {
  constructor(config = {}) {
    this.config = config;
    this.defaultModel = config.defaultModel || 'copilot';
  }

  /**
   * Execute TARS CLI command
   * @param {string} command - The TARS command to execute
   * @param {object} options - Command options
   * @returns {Promise<object>} Command result
   */
  async executeCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const fullCommand = `npx @agent-tars/cli@latest ${command}`;
      
      logger.info(`Executing TARS command: ${fullCommand}`);
      
      exec(fullCommand, options, (error, stdout, stderr) => {
        if (error) {
          logger.error(`TARS command failed: ${error.message}`);
          reject(error);
          return;
        }
        
        if (stderr) {
          logger.warn(`TARS stderr: ${stderr}`);
        }
        
        logger.info(`TARS command completed successfully`);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          success: true
        });
      });
    });
  }

  /**
   * Call AI model for text analysis
   * @param {string} model - Model name (copilot, kimi, local)
   * @param {string} prompt - The prompt to send
   * @param {string} content - Content to analyze
   * @returns {Promise<object>} Model response
   */
  async callModel(model = this.defaultModel, prompt, content = '') {
    try {
      const fullPrompt = content ? `${prompt}\n\nContent: ${content}` : prompt;
      const command = `call --model ${model} --prompt "${fullPrompt}"`;
      
      const result = await this.executeCommand(command);
      
      return {
        text: result.stdout,
        model: model,
        success: true
      };
    } catch (error) {
      logger.error(`Model call failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Multi-model comparison
   * @param {string} prompt - The prompt to send to all models
   * @param {string} content - Content to analyze
   * @param {string[]} models - Models to use for comparison
   * @returns {Promise<object>} Aggregated results
   */
  async multiModelCall(prompt, content = '', models = ['copilot', 'kimi']) {
    try {
      const responses = await Promise.all(
        models.map(model => this.callModel(model, prompt, content))
      );

      // Aggregate responses
      const aggregationPrompt = `
Compare these AI responses and summarize key points they agree on and where they diverge:

${responses.map((resp, i) => `${models[i].toUpperCase()}: ${resp.text}`).join('\n\n')}

Provide a balanced synthesis.`;

      const synthesis = await this.callModel('copilot', aggregationPrompt);

      return {
        responses: responses,
        synthesis: synthesis.text,
        models: models
      };
    } catch (error) {
      logger.error(`Multi-model call failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Browser automation for Reedsy
   * @param {string} action - Action to perform (navigate, click, type, etc.)
   * @param {object} params - Action parameters
   * @returns {Promise<object>} Action result
   */
  async browserAction(action, params = {}) {
    try {
      const command = `browser ${action} ${JSON.stringify(params)}`;
      return await this.executeCommand(command);
    } catch (error) {
      logger.error(`Browser action failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get DOM content from browser
   * @param {string} selector - CSS selector
   * @returns {Promise<string>} DOM content
   */
  async getDOMContent(selector = 'body') {
    try {
      const script = `document.querySelector('${selector}').innerHTML`;
      const result = await this.browserAction('execute', { script });
      return result.stdout;
    } catch (error) {
      logger.error(`DOM extraction failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = TarsClient;

