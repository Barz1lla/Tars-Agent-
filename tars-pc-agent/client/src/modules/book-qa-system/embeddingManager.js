const fs = require('fs').promises;
const path = require('path');
const tarsClient = require('../../shared/tarsClient'); // Assuming a TARS client exists
const logger = require('../../shared/logger');

/**
 * @class EmbeddingManager
 * @description Manages the creation, storage, and retrieval of text embeddings.
 */
class EmbeddingManager {
    /**
     * @param {object} [options={}] - Configuration options.
     * @param {string} [options.model='text-embedding-ada-002'] - The embedding model to use.
     * @param {number} [options.batchSize=50] - The number of text chunks to process in a single API call.
     */
    constructor(options = {}) {
        this.model = options.model || 'text-embedding-ada-002';
        this.batchSize = options.batchSize || 50;
        this.embeddingDir = path.join(process.cwd(), 'data', 'embeddings');
    }

    /**
     * Generates or retrieves embeddings for a collection of text chunks for a specific book.
     * @param {string} bookId - A unique identifier for the book.
     * @param {Array<object>} chunks - An array of chunk objects from the DocumentLoader.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of embedding objects.
     */
    async generateEmbeddingsForBook(bookId, chunks) {
        const cachedEmbeddings = await this.getEmbeddings(bookId);
        if (cachedEmbeddings && cachedEmbeddings.length === chunks.length) {
            logger.info(`Loaded ${cachedEmbeddings.length} embeddings from cache for book: ${bookId}`);
            return cachedEmbeddings;
        }

        logger.info(`Generating ${chunks.length} new embeddings for book: ${bookId}...`);
        const allEmbeddings = [];

        for (let i = 0; i < chunks.length; i += this.batchSize) {
            const batchChunks = chunks.slice(i, i + this.batchSize);
            const batchTexts = batchChunks.map(chunk => chunk.text);
            
            try {
                // This should be replaced with your actual TARS client call for batch embeddings
                const embeddingVectors = await tarsClient.createEmbeddings(batchTexts, { model: this.model });

                const embeddingObjects = batchChunks.map((chunk, index) => ({
                    chunkId: `${path.basename(chunk.source)}_${chunk.index}`,
                    text: chunk.text,
                    embedding: embeddingVectors[index],
                    metadata: chunk.metadata,
                }));

                allEmbeddings.push(...embeddingObjects);
                logger.debug(`Processed batch ${Math.floor(i / this.batchSize) + 1}, total embeddings: ${allEmbeddings.length}`);

            } catch (error) {
                logger.error(`Failed to process embedding batch for book: ${bookId}`, { error });
                // Decide if you want to stop or continue with partial results
                throw new Error('Embedding generation failed for a batch.');
            }
        }

        await this.storeEmbeddings(bookId, allEmbeddings);
        return allEmbeddings;
    }

    /**
     * Calculates the cosine similarity between two embedding vectors.
     * @param {Array<number>} vecA - The first embedding vector.
     * @param {Array<number>} vecB - The second embedding vector.
     * @returns {number} The cosine similarity score (from -1 to 1).
     */
    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

        let dotProduct = 0.0;
        let normA = 0.0;
        let normB = 0.0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator === 0 ? 0 : dotProduct / denominator;
    }

    /**
     * Finds the most similar chunks to a given query embedding.
     * @param {Array<object>} embeddings - The collection of embedding objects to search within.
     * @param {Array<number>} queryEmbedding - The embedding vector of the user's query.
     * @param {number} [topK=5] - The number of top results to return.
     * @returns {Array<object>} A sorted array of the most similar chunks.
     */
    async findSimilar(embeddings, queryEmbedding, topK = 5) {
        const similarities = embeddings.map(chunk => ({
            ...chunk,
            similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
        }));

        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
    }

    /**
     * Saves embeddings to a JSON file for persistence.
     * @param {string} bookId - The unique identifier for the book.
     * @param {Array<object>} embeddings - The array of embedding objects to save.
     */
    async storeEmbeddings(bookId, embeddings) {
        await fs.mkdir(this.embeddingDir, { recursive: true });
        const filePath = path.join(this.embeddingDir, `${bookId}.json`);
        await fs.writeFile(filePath, JSON.stringify(embeddings, null, 2));
        logger.info(`💾 Stored ${embeddings.length} embeddings for book "${bookId}" at: ${filePath}`);
    }

    /**
     * Retrieves stored embeddings from a JSON file.
     * @param {string} bookId - The unique identifier for the book.
     * @returns {Promise<Array<object>|null>} The array of embeddings, or null if not found.
     */
    async getEmbeddings(bookId) {
        const filePath = path.join(this.embeddingDir, `${bookId}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.debug(`No embedding cache found for book: ${bookId}`);
                return null;
            }
            throw error;
        }
    }
}

module.exports = EmbeddingManager;