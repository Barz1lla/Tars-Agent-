const tarsClient = require('../../shared/tarsClient');
const logger = require('../../shared/logger');

class ChatClassifier {
    constructor() {
        this.categories = [
            'System Architecture',
            'Module Design',
            'Publishing Strategy',
            'Emotional Logic',
            'Technical Implementation',
            'User Feedback',
            'Debugging',
            'Planning',
            'Creative Writing',
            'Code Review',
            'Documentation',
            'Research'
        ];

        // A single, powerful prompt to get all classification data at once.
        this.classificationPrompt = `
            Analyze the following AI conversation and classify it.

            Instructions:
            1. Categorize the conversation into ONE of the following primary themes:
               ${this.categories.join(', ')}
            2. Determine a specific, 1-3 word subcategory.
            3. Generate 3-5 relevant keyword tags.
            4. Write a concise, one-sentence summary of the conversation.
            5. Analyze the overall sentiment (positive, neutral, or negative).
            6. Provide a confidence score (0-100) for the primary category.

            Conversation Snippet:
            ---
            {content}
            ---

            Respond ONLY with a single, valid JSON object in the following format:
            {
                "category": "Primary Category",
                "subcategory": "Specific Subcategory",
                "confidence": 85,
                "tags": ["tag1", "tag2", "tag3"],
                "summary": "A one-sentence summary of the conversation's main topic.",
                "sentiment": "positive"
            }
        `;
    }

    /**
     * Classifies a chat conversation using an AI model.
     * @param {object} parsedData - The parsed chat data object from chatParser.
     * @returns {Promise<object>} A promise that resolves to the classification object.
     */
    async classifyChat(parsedData) {
        // Use the full text content for better classification context
        const content = parsedData.messages.map(m => m.content).join('\n');

        if (!content || content.trim().length < 50) {
            logger.warn('Content too short for classification, returning default.');
            return this.getDefaultClassification();
        }

        try {
            // Truncate content to avoid excessive token usage
            const truncatedContent = content.substring(0, 4000);
            const prompt = this.classificationPrompt.replace('{content}', truncatedContent);

            // Call the actual AI client
            const result = await tarsClient.generate(prompt, { format: 'json' });

            // Validate the AI response and merge with defaults for safety
            if (result && result.category) {
                return { ...this.getDefaultClassification(), ...result };
            }
            
            logger.warn('AI classification response was malformed.', { response: result });
            return this.getDefaultClassification();

        } catch (error) {
            logger.error('AI classification request failed.', { error });
            return this.getDefaultClassification();
        }
    }

    /**
     * Provides a default classification object in case of errors or invalid input.
     * @returns {object} A default classification object.
     */
    getDefaultClassification() {
        return {
            category: 'General',
            subcategory: 'Uncategorized',
            confidence: 50,
            tags: ['general'],
            summary: 'An unclassified AI conversation.',
            sentiment: 'neutral'
        };
    }
}

module.exports = new ChatClassifier();