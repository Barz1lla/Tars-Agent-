const fs = require('fs').promises;
const path = require('path');
const logger = require('../../shared/logger');

class TemplateEngine {
    constructor(config = {}) {
        this.templatesPath = config.templatesPath || path.join(process.cwd(), 'data', 'publishing_templates');
        this.templateCache = new Map();
    }

    /**
     * Initializes the engine by ensuring base templates exist and loading all templates into memory.
     */
    async initialize() {
        await this._ensureBaseTemplates();
        await this.loadAllTemplates();
        logger.info(`📄 Template engine initialized with ${this.templateCache.size} templates.`);
    }

    /**
     * Renders a template from the in-memory cache using the provided data.
     * @param {string} templateName - The name of the template (e.g., 'queryLetter_standard').
     * @param {object} data - An object with key-value pairs for placeholders.
     * @returns {string} The rendered content, or an empty string if the template doesn't exist.
     */
    render(templateName, data) {
        const template = this.templateCache.get(templateName);
        if (!template) {
            logger.warn(`Template "${templateName}" not found in cache.`);
            return '';
        }
        // Simple regex to replace all {{key}} placeholders.
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data.hasOwnProperty(key) ? data[key] : match;
        });
    }

    /**
     * Creates a new template file on disk and adds it to the live cache.
     * @param {string} name - The name for the new template.
     * @param {string} content - The content of the template.
     */
    async createTemplate(name, content) {
        const filePath = path.join(this.templatesPath, `${name}.txt`);
        await fs.writeFile(filePath, content, 'utf8');
        this.templateCache.set(name, content);
        logger.info(`📝 Custom template created and loaded: ${name}`);
    }

    /**
     * Returns a list of all currently loaded template names.
     * @returns {Array<string>}
     */
    listTemplates() {
        return Array.from(this.templateCache.keys());
    }

    /**
     * Scans the templates directory and loads all .txt files into the in-memory cache.
     */
    async loadAllTemplates() {
        try {
            const files = await fs.readdir(this.templatesPath);
            this.templateCache.clear();
            for (const file of files) {
                if (file.endsWith('.txt')) {
                    const name = path.basename(file, '.txt');
                    const content = await fs.readFile(path.join(this.templatesPath, file), 'utf8');
                    this.templateCache.set(name, content);
                }
            }
        } catch (error) {
            logger.error('Failed to load templates from disk.', { error });
        }
    }

    /**
     * Checks if base templates exist on disk and writes them if they don't.
     * This prevents overwriting user customizations on every startup.
     * @private
     */
    async _ensureBaseTemplates() {
        await fs.mkdir(this.templatesPath, { recursive: true });
        const baseTemplates = this._getBaseTemplates();

        for (const [name, content] of Object.entries(baseTemplates)) {
            const filePath = path.join(this.templatesPath, `${name}.txt`);
            try {
                await fs.access(filePath); // Check if file exists
            } catch {
                // File does not exist, so write it.
                await fs.writeFile(filePath, content, 'utf8');
                logger.info(`Created base template: ${name}`);
            }
        }
    }

    /**
     * Defines the default templates to be created on first run.
     * @private
     */
    _getBaseTemplates() {
        return {
            'queryLetter_standard': `Dear {{publisherName}},\n\nI am writing to seek representation for my {{genre}} novel, "{{bookTitle}}", complete at {{wordCount}} words.\n\n{{description}}\n\n{{authorBio}}\n\nThank you for your time and consideration.\n\nSincerely,\n{{authorName}}`,
            'social_twitter': `Just announced! My new book, "{{bookTitle}}", is coming soon. It's about {{hook}}. #{{genre}} #BookLaunch {{hashtags}}`,
            'social_linkedin': `I'm excited to share an update on my upcoming book, "{{bookTitle}}". This {{genre}} novel explores {{hook}}. I believe it will resonate with readers who enjoy {{comparableTitles}}.\n\n{{description}}\n\n#WritingCommunity #Publishing {{hashtags}}`,
            'email_followUp': `Subject: Follow-up: Query: {{bookTitle}}\n\nDear {{publisherName}},\n\nI hope this email finds you well. I'm writing to politely follow up on the query for my novel, "{{bookTitle}}", which I sent on {{submissionDate}}. I am still very interested in the possibility of working with you.\n\nThank you for your time.\n\nBest regards,\n{{authorName}}`
        };
    }
}

module.exports = new TemplateEngine();