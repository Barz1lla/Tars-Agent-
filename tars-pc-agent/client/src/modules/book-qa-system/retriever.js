const embeddingManager = require('./embeddingManager');
const logger = require('../../shared/logger');

/**
 * @class Retriever
 * @description Finds relevant text chunks from documents using semantic and keyword search.
 */
class Retriever {
    /**
     * Retrieves the most relevant chunks from a single book using semantic search.
     * @param {string} query - The user's search query.
     * @param {string} bookId - The unique identifier for the book.
     * @param {object} [options={}] - Retrieval options.
     * @param {number} [options.topK=5] - The number of top results to return.
     * @param {number} [options.threshold=0.3] - The minimum similarity score to consider a chunk relevant.
     * @returns {Promise<Array<object>>} A sorted array of relevant chunks.
     */
    async retrieve(query, bookId, options = {}) {
        const { topK = 5, threshold = 0.3 } = options;
        
        try {
            const bookEmbeddings = await embeddingManager.getEmbeddings(bookId);
            if (!bookEmbeddings || bookEmbeddings.length === 0) {
                logger.warn(`No embeddings found for book: ${bookId}`);
                return [];
            }

            // Assumes embeddingManager can create an embedding for a single query string.
            const queryEmbedding = await embeddingManager.createSingleEmbedding(query);
            const similarChunks = await embeddingManager.findSimilar(bookEmbeddings, queryEmbedding, topK);

            return similarChunks
                .filter(chunk => chunk.similarity >= threshold)
                .map(chunk => ({
                    ...chunk,
                    // Rename for clarity in hybrid search
                    semanticScore: chunk.similarity, 
                }));

        } catch (error) {
            logger.error(`Retrieval failed for book "${bookId}".`, { error });
            return [];
        }
    }

    /**
     * Retrieves relevant chunks from multiple books in parallel.
     * @param {string} query - The user's search query.
     * @param {Array<string>} bookIds - An array of book identifiers.
     * @param {object} [options={}] - Retrieval options.
     * @returns {Promise<Array<object>>} A sorted array of the top relevant chunks from all books.
     */
    async multiBookRetrieve(query, bookIds, options = {}) {
        // Run all retrieval tasks concurrently for better performance.
        const retrievalPromises = bookIds.map(bookId => 
            this.retrieve(query, bookId, options).then(results => 
                // Add bookId to each result for context
                results.map(r => ({ ...r, bookId }))
            )
        );

        const allResults = await Promise.all(retrievalPromises);
        
        // Flatten the array of arrays, sort by score, and take the global top K.
        return allResults
            .flat()
            .sort((a, b) => b.semanticScore - a.semanticScore)
            .slice(0, options.globalTopK || 10);
    }

    /**
     * Combines semantic and keyword search results for more robust retrieval.
     * It uses a weighted score to rank the combined, unique results.
     * @param {string} query - The user's search query.
     * @param {string} bookId - The unique identifier for the book.
     * @param {object} [options={}] - Retrieval options.
     * @returns {Promise<Array<object>>} A sorted array of the best-matching chunks.
     */
    async hybridSearch(query, bookId, options = {}) {
        // Run semantic and keyword searches in parallel.
        const [semanticResults, keywordResults] = await Promise.all([
            this.retrieve(query, bookId, options),
            this._keywordSearch(query, bookId)
        ]);

        const combined = new Map();

        // Process semantic results, giving them a higher weight.
        semanticResults.forEach(chunk => {
            combined.set(chunk.chunkId, {
                ...chunk,
                finalScore: (chunk.semanticScore || 0) * 0.7, // Semantic score is primary
            });
        });

        // Process keyword results, adding their score to existing entries or creating new ones.
        keywordResults.forEach(chunk => {
            const existing = combined.get(chunk.chunkId);
            if (existing) {
                existing.finalScore += (chunk.keywordScore || 0) * 0.3; // Add weighted keyword score
            } else {
                combined.set(chunk.chunkId, {
                    ...chunk,
                    finalScore: (chunk.keywordScore || 0) * 0.3,
                });
            }
        });

        return Array.from(combined.values())
            .sort((a, b) => b.finalScore - a.finalScore)
            .slice(0, options.topK || 5);
    }

    /**
     * Performs a simple keyword-based search against the text chunks of a book.
     * @private
     */
    async _keywordSearch(query, bookId) {
        // Note: This is inefficient as it loads all embeddings just to get the text.
        // In a production system, the text chunks would be stored separately for keyword search.
        const chunks = await embeddingManager.getEmbeddings(bookId);
        if (!chunks) return [];

        const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
        if (keywords.length === 0) return [];

        return chunks
            .map(chunk => {
                const text = chunk.text.toLowerCase();
                let score = 0;
                keywords.forEach(keyword => {
                    if (text.includes(keyword)) {
                        score += 1;
                    }
                });
                // Normalize score by number of keywords to get a value between 0 and 1.
                const normalizedScore = score / keywords.length;
                return { ...chunk, keywordScore: normalizedScore };
            })
            .filter(chunk => chunk.keywordScore > 0);
    }
}

module.exports = new Retriever