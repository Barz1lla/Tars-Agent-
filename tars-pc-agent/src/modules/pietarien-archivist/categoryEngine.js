const tarsClient = require('../../shared/tarsClient');
const logger = require('../../shared/logger');

class CategoryEngine {
    constructor() {
        this.categories = [
            'Justice Acceleration',
            'Innovation Enablement',
            'Environmental Intelligence',
            'Sport Equity',
            'Education Reform',
            'Civic OS',
            'Democracy 2.0',
            'Business Strategy',
            'General'
        ];
        
        // A single, powerful prompt to get all classification data at once.
        this.categorizationPrompt = `
            You are an expert assistant tasked with categorizing content based on David's Pietarien project themes.

            Analyze the following content and perform these tasks:
            1.  Choose the ONE most fitting primary category from this list: ${this.categories.join(', ')}.
            2.  Generate a specific, 1-3 word subcategory that accurately describes the content's focus.
            3.  Provide a confidence score (0-100) for your primary category choice.
            4.  Write a brief, one-sentence reasoning for your classification.
            5.  List up to two other related categories from the list.

            Content Snippet:
            ---
            {content}
            ---

            Respond ONLY with a single, valid JSON object in the following format:
            {
              "category": "Primary Category",
              "subcategory": "Generated Subcategory",
              "confidence": 85,
              "reasoning": "A one-sentence explanation for the chosen category.",
              "relatedCategories": ["Related Category 1", "Related Category 2"]
            }
        `;
    }

    /**
     * Determines the category for a piece of content using a single AI call.
     * @param {string} content - The text content to categorize.
     * @returns {Promise<object>} A promise that resolves to the full category object.
     */
    async determineCategory(content) {
        if (!content || content.trim().length < 20) {
            logger.warn('Content too short for categorization, returning default.');
            return this.getDefaultCategory();
        }

        try {
            // Truncate content to a reasonable length to manage token usage.
            const truncatedContent = content.substring(0, 4000);
            const prompt = this.categorizationPrompt.replace('{content}', truncatedContent);

            // Make a single, real call to the AI client.
            const result = await tarsClient.generate(prompt, { format: 'json' });

            // Validate the AI's response.
            if (result && result.category && typeof result.confidence === 'number') {
                return { ...this.getDefaultCategory(), ...result };
            }
            
            logger.warn('AI categorization response was malformed.', { response: result });
            return this.getDefaultCategory('AI returned a malformed response.');

        } catch (error) {
            logger.error('AI categorization request failed.', { error });
            return this.getDefaultCategory('An error occurred during AI analysis.');
        }
    }

    /**
     * Provides a default category object in case of errors or invalid input.
     * @param {string} [reason='Default fallback due to error or insufficient content.']
     * @returns {object} A default category object.
     */
    getDefaultCategory(reason = 'Default fallback due to error or insufficient content.') {
        return {
            category: 'General',
            subcategory: 'uncategorized',
            confidence: 50,
            reasoning: reason,
            relatedCategories: []
        };
    }
}

module.exports = new CategoryEngine();