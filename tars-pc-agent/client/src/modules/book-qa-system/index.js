const logger = require('../../shared/logger');

/**
 * A high-level orchestrator for a Retrieval-Augmented Generation (RAG) system.
 * It coordinates document loading, embedding, retrieval, and answer generation.
 */
class BookQASystem {
    /**
     * The constructor is private. Use the static `create` method for instantiation.
     * @param {object} dependencies - The injected dependencies.
     * @private
     */
    constructor(dependencies) {
        this.documentLoader = dependencies.documentLoader;
        this.embeddingManager = dependencies.embeddingManager;
        this.retriever = dependencies.retriever;
        this.qaEngine = dependencies.qaEngine;
        this.contextManager = dependencies.contextManager;
        this.config = dependencies.config;
    }

    /**
     * Asynchronously creates and initializes a new BookQASystem instance.
     * This is the correct way to instantiate the class.
     * @param {object} config - The system configuration.
     * @param {object} dependencies - The modules the system depends on.
     * @returns {Promise<BookQASystem>} A promise that resolves to the initialized system.
     */
    static async create(config, dependencies) {
        logger.info('🚀 Initializing Book QA System...');
        
        await dependencies.embeddingManager.initialize(config.embeddingModel);
        await dependencies.retriever.initialize();
        dependencies.contextManager.initialize();

        const system = new BookQASystem({ ...dependencies, config });

        if (config.books && config.books.length > 0) {
            for (const bookConfig of config.books) {
                await system.loadBook(bookConfig.path, bookConfig.title);
            }
        }
        
        logger.info('✅ Book QA System initialized successfully.');
        return system;
    }

    /**
     * Loads, chunks, and embeds a book, making it available for querying.
     * @param {string} filePath - The path to the book file.
     * @param {string} title - The title of the book.
     * @returns {Promise<string>} The unique ID of the loaded book.
     */
    async loadBook(filePath, title) {
        logger.info(`Processing book: ${title}`);
        
        const bookId = this._generateBookId(title);
        if (await this.embeddingManager.isBookLoaded(bookId)) {
            logger.info(`Book "${title}" is already loaded. Skipping.`);
            return bookId;
        }

        const document = await this.documentLoader.loadDocument(filePath);
        const chunks = await this.documentLoader.splitIntoChunks(
            document,
            this.config.chunkSize,
            this.config.chunkOverlap
        );
        
        await this.embeddingManager.addBook(bookId, title, chunks);
        logger.info(`Successfully loaded and embedded ${chunks.length} chunks for "${title}".`);
        return bookId;
    }

    /**
     * Asks a question and gets a comprehensive, source-backed answer.
     * @param {string} question - The user's question.
     * @param {object} [options={}] - Q&A options.
     * @param {string} [options.sessionId] - The ID for the conversation session.
     * @param {Array<string>} [options.bookIds] - A list of book IDs to search within.
     * @returns {Promise<object>} A promise that resolves to the answer object.
     */
    async ask(question, options = {}) {
        logger.info(`Processing question: "${question.substring(0, 100)}..."`);

        const conversationHistory = options.sessionId 
            ? this.contextManager.getContext(options.sessionId) 
            : [];

        const relevantChunks = await this.retriever.findSimilar(
            question,
            options.bookIds, // Search across specified books, or all if null
            { topK: this.config.maxChunks || 5 }
        );

        if (relevantChunks.length === 0) {
            return {
                answer: "I couldn't find any relevant information in the loaded books to answer that question.",
                sources: [],
                confidence: 0,
            };
        }

        const result = await this.qaEngine.generateAnswer(
            question,
            relevantChunks,
            conversationHistory
        );

        if (options.sessionId) {
            this.contextManager.addInteraction(options.sessionId, {
                question,
                answer: result.answer,
                sources: result.sources,
            });
        }

        return result;
    }

    /**
     * Unloads a book and removes its associated embeddings.
     * @param {string} bookId - The ID of the book to unload.
     */
    async unloadBook(bookId) {
        await this.embeddingManager.removeBook(bookId);
        logger.info(`Book ${bookId} and its embeddings have been unloaded.`);
    }

    /**
     * Retrieves statistics from the underlying modules.
     * @returns {Promise<object>} An object containing system-wide statistics.
     */
    async getStats() {
        return {
            embeddingManager: await this.embeddingManager.getStats(),
            retriever: await this.retriever.getStats(),
            contextManager: this.contextManager.getStats(),
        };
    }

    /**
     * Generates a deterministic ID for a book based on its title.
     * @param {string} title - The title of the book.
     * @returns {string} A sanitized, unique ID.
     * @private
     */
    _generateBookId(title) {
        return title.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/__+/g, '_');
    }
}

module.exports = BookQASystem;