const tarsClient = require('../../shared/tarsClient');
const logger =require('../../shared/logger');

/**
 * @class EmotionalValidator
 * @description Analyzes text content for emotional resonance, narrative clarity, and reader engagement using an AI model.
 */
class EmotionalValidator {
    constructor() {
        /**
         * A single, comprehensive prompt to analyze content efficiently.
         * It requests a structured JSON output to ensure reliable parsing.
         * @type {string}
         */
        this.analysisPrompt = `
            Analyze the following text for its emotional and narrative impact.
            Evaluate it based on emotional resonance, narrative clarity, and reader engagement.

            Text for analysis:
            ---
            {content}
            ---

            Respond ONLY with a single, valid JSON object. The JSON object must conform to the following structure:
            {
              "emotionalImpactScore": <A score from 0-100 representing the emotional power of the text>,
              "narrativeClarityScore": <A score from 0-100 on how clear and coherent the narrative is>,
              "overallTone": "<A 2-3 word description of the dominant emotional tone (e.g., 'Hopeful and melancholic')>",
              "keyThemes": ["<A list>", "<of 3-5>", "<key emotional themes>"],
              "suggestions": ["<A list>", "<of 3-5 actionable suggestions>", "<for improving emotional engagement and clarity>"]
            }
        `;
    }

    /**
     * Performs a comprehensive emotional and narrative validation of the given content.
     * @param {string} content - The text content to validate.
     * @returns {Promise<object>} A promise that resolves to an object with validation scores and suggestions.
     */
    async validate(content) {
        if (!content || content.trim().length < 20) {
            logger.warn('Content too short for emotional validation, returning default response.');
            return this._getDefaultResponse();
        }

        try {
            const analysisResult = await this._executeAIAnalysis(this.analysisPrompt, content);
            return analysisResult;
        } catch (error) {
            logger.error('Emotional validation failed.', { error });
            return this._getDefaultResponse();
        }
    }

    /**
     * A private helper method to execute an AI analysis prompt.
     * @param {string} promptTemplate - The prompt template string.
     * @param {string} content - The content to insert into the prompt.
     * @returns {Promise<object>} The parsed JSON response from the AI.
     * @private
     */
    async _executeAIAnalysis(promptTemplate, content) {
        // Use a substring to avoid sending excessively large payloads to the AI
        const truncatedContent = content.substring(0, 4000);
        const prompt = promptTemplate.replace('{content}', truncatedContent);

        try {
            const response = await tarsClient.generate(prompt, { format: 'json' });
            // Basic validation to ensure the response has the expected structure
            if (response && typeof response.emotionalImpactScore === 'number') {
                return response;
            }
            logger.warn('AI response was malformed. Falling back to default.', { response });
            return this._getDefaultResponse();
        } catch (error) {
            logger.error('Error during TARS client call in EmotionalValidator.', { error });
            throw error; // Re-throw to be caught by the public validate method
        }
    }

    /**
     * Provides a default response object for cases of error or invalid input.
     * @returns {object} A default validation object.
     * @private
     */
    _getDefaultResponse() {
        return {
            emotionalImpactScore: 0,
            narrativeClarityScore: 0,
            overallTone: 'N/A',
            keyThemes: [],
            suggestions: ['Could not analyze content due to an error or insufficient text.'],
        };
    }
}

module.exports = new EmotionalValidator();