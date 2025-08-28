const ProviderManager = require('./providerManager');
const logger = require('./logger');

class TarsClient {
    constructor(config = {}) {
        this.config = config;
        this.providerManager = new ProviderManager(config);
        logger.info('TARS Client initialized with multi-provider support');
    }

    async callModel(model, prompt, content, options = {}) {
        try {
            const result = await this.providerManager.callWithFallback(prompt, content, {
                ...options,
                preferredModel: model
            });
            logger.info(`Model call successful via ${result.provider} (${result.responseTime}ms)`);
            return result;
        } catch (error) {
            logger.error('All providers failed:', error.message);
            return {
                text: `Error: ${error.message}. Please check your API configuration.`,
                usage: { total_tokens: 0 },
                error: true,
                provider: 'none'
            };
        }
    }

    async analyzeContent(content, analysisType = 'general', options = {}) {
        const prompt = `Analyze the following content for ${analysisType} issues and provide detailed insights.`;
        return await this.callModel('auto', prompt, content, options);
    }

    // Enhanced formatContent: uses provider if available, else stub
    async formatContent(content, formatType = 'reedsy', options = {}) {
        // If you want to use a provider, you can add logic here
        // For now, use stub logic as fallback
        try {
            // Example: If you want to use a provider, uncomment below
            // const prompt = `Format the following content for ${formatType} platform.`;
            // return await this.callModel('auto', prompt, content, options);

            // Stubbed formatting logic
            const html = content
                .replace(/\n\n/g, '</p><p>')
                .replace(/^(.+)$/gm, '<p>$1</p>')
                .replace(/"(.+?)"/g, '<strong>"$1"</strong>');
            return { text: html, provider: 'stub' };
        } catch (err) {
            logger.error('Format error:', err);
            return {
                text: `Error: ${err.message}`,
                provider: 'none',
                error: true
            };
        }
    }

    getProviderStatus() {
        return this.providerManager.getProviderStatus();
    }

    async testConnection() {
        try {
            const result = await this.callModel('auto', 'System check', 'Reply with "TARS System Online"');
            return {
                success: !result.error,
                message: result.text,
                provider: result.provider
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                provider: 'none'
            };
        }
    }
}

module.exports = TarsClient;