/**
 * @class ContextManager
 * @description Manages conversation history to provide context for follow-up questions and analysis.
 */
class ContextManager {
    /**
     * @param {object} [options={}] - Configuration options.
     * @param {number} [options.maxHistory=10] - The maximum number of interactions to store.
     */
    constructor(options = {}) {
        this.conversationHistory = [];
        this.maxHistory = options.maxHistory || 10;
        this.stopWords = new Set([
            'a', 'an', 'the', 'in', 'on', 'is', 'are', 'was', 'were', 'and', 'or',
            'what', 'who', 'when', 'where', 'why', 'how', 'do', 'does', 'did'
        ]);
    }

    /**
     * Adds a new question-answer interaction to the history.
     * @param {string} question - The user's question.
     * @param {object} answer - The answer object from the QAEngine.
     * @param {Array<object>} chunks - The context chunks used for the answer.
     */
    addInteraction(question, answer, chunks) {
        const interaction = {
            question,
            answer, // Store the full answer object for more context
            // Store lightweight chunk info
            chunks: chunks.map(c => ({
                chunkId: c.chunkId,
                source: c.source,
                bookId: c.bookId,
            })),
            timestamp: new Date().toISOString(),
        };

        this.conversationHistory.push(interaction);
        
        // Trim the history if it exceeds the maximum size
        if (this.conversationHistory.length > this.maxHistory) {
            this.conversationHistory.shift();
        }
    }

    /**
     * Retrieves the entire conversation history.
     * @returns {Array<object>} The array of interaction objects.
     */
    getConversationHistory() {
        return this.conversationHistory;
    }

    /**
     * Finds the most relevant past interactions based on keyword overlap.
     * @param {string} question - The current question to find context for.
     * @param {number} [topK=3] - The number of related questions to return.
     * @returns {Array<object>} A sorted array of the most relevant past interactions.
     */
    getRelatedQuestions(question, topK = 3) {
        const queryKeywords = this._getKeywords(question);
        if (queryKeywords.size === 0) return [];

        const related = this.conversationHistory.map(interaction => {
            const interactionKeywords = this._getKeywords(interaction.question);
            const commonKeywords = new Set([...queryKeywords].filter(kw => interactionKeywords.has(kw)));
            
            // A simple relevance score based on keyword overlap
            const relevance = commonKeywords.size / queryKeywords.size;

            return { ...interaction, relevance };
        });

        // Filter out irrelevant questions and sort by relevance
        return related
            .filter(interaction => interaction.relevance > 0)
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, topK);
        
        // FUTURE ENHANCEMENT: For even better results, this could be replaced with
        // semantic search using embeddings. We would embed the current question and
        // find the cosine similarity against the embeddings of past questions.
    }

    /**
     * Clears all interactions from the history.
     */
    clearHistory() {
        this.conversationHistory = [];
    }

    /**
     * A private helper to extract meaningful keywords from a text string.
     * @param {string} text - The text to process.
     * @returns {Set<string>} A set of unique, lowercase keywords.
     * @private
     */
    _getKeywords(text) {
        return new Set(
            text
                .toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 2 && !this.stopWords.has(word))
        );
    }
}

module.exports = new ContextManager();