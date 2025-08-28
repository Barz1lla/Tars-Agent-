const axios = require('axios');
const logger = require('./logger');

class ProviderManager {
    constructor(config) {
        this.config = config;
        this.providers = new Map();
        this.primaryProvider = config.providers?.primary || 'deepseek';
        this.fallbackProviders = config.providers?.fallback || [];
        this.providerHealth = new Map();
        
        this.initializeProviders();
        this.startHealthChecks();
    }

    initializeProviders() {
        if (!this.config.providers?.models) {
            logger.error('No provider models configured');
            return;
        }

        Object.entries(this.config.providers.models).forEach(([key, providerConfig]) => {
            if (providerConfig.enabled) {
                this.providers.set(key, new AIProvider(key, providerConfig));
                this.providerHealth.set(key, { 
                    status: 'unknown', 
                    lastCheck: null, 
                    responseTime: null,
                    errorCount: 0
                });
                logger.info(`Initialized provider: ${key} (${providerConfig.name})`);
            }
        });
    }

    async callWithFallback(prompt, content, options = {}) {
        const providers = [this.primaryProvider, ...this.fallbackProviders];
        let lastError = null;

        for (const providerKey of providers) {
            const provider = this.providers.get(providerKey);
            if (!provider || !this.isProviderHealthy(providerKey)) {
                continue;
            }

            try {
                logger.info(`Attempting API call with provider: ${providerKey}`);
                const startTime = Date.now();
                
                const result = await provider.call(prompt, content, options);
                
                const responseTime = Date.now() - startTime;
                this.updateProviderHealth(providerKey, 'healthy', responseTime);
                
                logger.info(`API call successful with ${providerKey} (${responseTime}ms)`);
                return {
                    ...result,
                    provider: providerKey,
                    responseTime
                };
            } catch (error) {
                lastError = error;
                this.updateProviderHealth(providerKey, 'error');
                logger.warn(`Provider ${providerKey} failed: ${error.message}`);
                continue;
            }
        }

        throw new Error(`All providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    isProviderHealthy(providerKey) {
        const health = this.providerHealth.get(providerKey);
        if (!health) return false;
        
        const maxErrorCount = 5;
        const healthCheckTimeout = 5 * 60 * 1000; // 5 minutes
        
        return health.status === 'healthy' || 
               (health.status === 'unknown' && health.errorCount < maxErrorCount) ||
               (Date.now() - (health.lastCheck || 0)) > healthCheckTimeout;
    }

    updateProviderHealth(providerKey, status, responseTime = null) {
        const health = this.providerHealth.get(providerKey) || {};
        
        health.status = status;
        health.lastCheck = Date.now();
        
        if (responseTime) {
            health.responseTime = responseTime;
        }
        
        if (status === 'error') {
            health.errorCount = (health.errorCount || 0) + 1;
        } else if (status === 'healthy') {
            health.errorCount = 0;
        }
        
        this.providerHealth.set(providerKey, health);
    }

    async startHealthChecks() {
        // Perform health checks every 2 minutes
        setInterval(async () => {
            for (const [key, provider] of this.providers.entries()) {
                try {
                    await provider.healthCheck();
                    this.updateProviderHealth(key, 'healthy');
                } catch (error) {
                    this.updateProviderHealth(key, 'error');
                }
            }
        }, 2 * 60 * 1000);
    }

    getProviderStatus() {
        const status = {};
        for (const [key, health] of this.providerHealth.entries()) {
            const provider = this.providers.get(key);
            status[key] = {
                name: provider?.name || key,
                status: health.status,
                responseTime: health.responseTime,
                errorCount: health.errorCount,
                lastCheck: health.lastCheck,
                costPerToken: provider?.costPerToken || 0
            };
        }
        return status;
    }
}

class AIProvider {
    constructor(key, config) {
        this.key = key;
        this.name = config.name;
        this.api = config.api;
        this.apiKey = config.apiKey;
        this.baseURL = config.baseURL;
        this.model = config.model;
        this.maxTokens = config.maxTokens || 4000;
        this.temperature = config.temperature || 0.7;
        this.costPerToken = config.costPerToken || 0;
    }

    async call(prompt, content, options = {}) {
        const headers = {
            'Content-Type': 'application/json'
        };

        // Set up authentication based on API type
        if (this.api === 'openrouter') {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
            headers['HTTP-Referer'] = 'https://localhost:5000';
            headers['X-Title'] = 'TARS PC Agent';
        } else if (this.api === 'openai') {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const messages = [
            { role: 'system', content: prompt },
            { role: 'user', content: content }
        ];

        const payload = {
            model: this.model,
            messages: messages,
            temperature: options.temperature || this.temperature,
            max_tokens: options.maxTokens || this.maxTokens
        };

        try {
            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                payload,
                {
                    headers,
                    timeout: 30000
                }
            );

            return {
                text: response.data.choices[0].message.content,
                usage: response.data.usage || { total_tokens: 0 },
                model: this.model,
                provider: this.key
            };
        } catch (error) {
            logger.error(`${this.name} API call failed:`, error.response?.data || error.message);
            throw new Error(`${this.name} API Error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async healthCheck() {
        try {
            await this.call(
                'You are a helpful assistant.',
                'Reply with just "OK" to confirm you are working.',
                { maxTokens: 10 }
            );
            return true;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = ProviderManager;