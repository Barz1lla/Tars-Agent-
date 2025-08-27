
const axios = require('axios');
const logger = require('./logger');

class TarsClient {
    constructor(config = {}) {
        this.config = config;
        this.defaultModel = config.defaultModel || 'gpt-4';
        this.apiKey = process.env.OPENAI_API_KEY || config.apiKey;
        this.baseURL = config.baseURL || 'https://api.openai.com/v1';
        
        if (!this.apiKey) {
            logger.warn('No API key configured for TARS client');
        }
    }

    async callModel(model, prompt, content) {
        try {
            logger.info(`Calling model: ${model}`);
            
            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: model,
                    messages: [
                        { role: 'system', content: prompt },
                        { role: 'user', content: content }
                    ],
                    temperature: 0.7
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            return {
                text: response.data.choices[0].message.content,
                usage: response.data.usage
            };
        } catch (error) {
            logger.error('TARS API call failed:', error.message);
            
            // Return a fallback response for development
            return {
                text: JSON.stringify([]),
                usage: { total_tokens: 0 }
            };
        }
    }

    async analyzeContent(content, analysisType = 'general') {
        const prompt = `Analyze the following content for ${analysisType} issues and return a JSON array of findings.`;
        return await this.callModel(this.defaultModel, prompt, content);
    }
}

module.exports = TarsClient;
