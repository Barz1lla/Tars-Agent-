const tarsClient = require('../../shared/tarsClient');
const logger = require('../../shared/logger');

class EmotionalValidator {
    constructor() {
        // A single, comprehensive prompt to get all analysis in one efficient call.
        this.validationPrompt = `
            Analyze the following content for emotional impact and narrative clarity.

            Content:
            ---
            {content}
            ---

            Instructions:
            1.  Evaluate the emotional resonance and narrative clarity.
            2.  Identify the most likely target audience (e.g., 'Technical', 'Creative', 'General').
            3.  Provide actionable suggestions for improvement.

            Respond ONLY with a single, valid JSON object in the following format:
            {
              "emotionalScore": <A score from 0-100 for emotional impact>,
              "clarityScore": <A score from 0-100 for narrative clarity>,
              "themes": ["<A list>", "<of 3-5>", "<key emotional themes>"],
              "targetAudience": "<The most likely target audience>",
              "suggestions": ["<A list>", "<of 3-5 actionable suggestions>", "<for improving the content>"]
            }
        `;
    }

    /**
     * Performs a comprehensive emotional and narrative validation of the given content.
     * @param {string} content - The text content to validate.
     * @returns {Promise<object>} A promise that resolves to an object with validation scores and suggestions.
     */
    async validate(content) {
        if (!content || content.trim().length < 50) {
            logger.warn('Content is too short for meaningful validation.');
            return this.getDefaultResponse('Content too short for analysis.');
        }

        try {
            // Truncate content to a reasonable length to manage token usage.
            const truncatedContent = content.substring(0, 4000);
            const prompt = this.validationPrompt.replace('{content}', truncatedContent);

            // Make a single, real call to the AI client.
            const result = await tarsClient.generate(prompt, { format: 'json' });

            // Validate the AI's response.
            if (result && typeof result.emotionalScore === 'number') {
                return { ...this.getDefaultResponse(), ...result };
            }
            
            logger.warn('AI validation response was malformed.', { response: result });
            return this.getDefaultResponse('AI returned a malformed response.');

        } catch (error) {
            logger.error('Emotional validation request failed.', { error });
            return this.getDefaultResponse('An error occurred during AI analysis.');
        }
    }

    /**
     * Provides a default response object in case of errors or invalid input.
     * @param {string} [reason='Analysis could not be completed.'] - The reason for the default response.
     * @returns {object} A default validation object.
     */
    getDefaultResponse(reason = 'Analysis could not be completed.') {
        return {
            emotionalScore: 0,
            clarityScore: 0,
            themes: [],
            targetAudience: 'Unknown',
            suggestions: [reason],
        };
    }
}

module.exports = new EmotionalValidator();