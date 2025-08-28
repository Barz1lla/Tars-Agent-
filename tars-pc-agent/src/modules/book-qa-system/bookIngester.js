const DocumentLoader = require('./documentLoader');
const EmbeddingManager = require('./embeddingManager');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../shared/logger');

class BookIngester {
    constructor(config = {}) {
        this.config = {
            chunkSize: config.chunkSize || 1000,
            chunkOverlap: config.chunkOverlap || 200,
            ...config,
        };
        this.documentLoader = new DocumentLoader();
        this.embeddingManager = new EmbeddingManager({ model: this.config.embeddingModel });
        
        this.bookInfoDir = path.join(process.cwd(), 'data', 'book_info');
        this.ingestedBooks = new Map();
    }

    /**
     * Initializes the ingester by loading all existing book metadata from disk.
     */
    async initialize() {
        try {
            await fs.mkdir(this.bookInfoDir, { recursive: true });
            const files = await fs.readdir(this.bookInfoDir);
            for (const file of files) {
                if (path.extname(file) === '.json') {
                    const data = await fs.readFile(path.join(this.bookInfoDir, file), 'utf8');
                    const bookInfo = JSON.parse(data);
                    this.ingestedBooks.set(bookInfo.id, bookInfo);
                }
            }
            logger.info(`Initialized with ${this.ingestedBooks.size} existing books.`);
        } catch (error) {
            logger.error('Failed to initialize BookIngester.', { error });
        }
    }

    /**
     * Orchestrates the full ingestion pipeline for a single book.
     * @param {string} filePath - The path to the book file.
     * @param {string|null} [bookId=null] - An optional unique ID for the book.
     * @returns {Promise<string>} The ID of the ingested book.
     */
    async ingestBook(filePath, bookId = null) {
        const bookIdToUse = bookId || this._generateBookId(filePath);
        
        try {
            logger.info(`📚 Ingesting book: ${filePath}`);
            
            const document = await this.documentLoader.loadDocument(filePath);
            
            const chunks = this.documentLoader.splitIntoChunks(document, {
                chunkSize: this.config.chunkSize,
                overlap: this.config.chunkOverlap,
            });
            
            // This method now handles both generation and storage of embeddings.
            await this.embeddingManager.generateEmbeddingsForBook(bookIdToUse, chunks);
            
            const bookInfo = {
                id: bookIdToUse,
                title: path.basename(filePath, path.extname(filePath)),
                path: filePath,
                chunkCount: chunks.length,
                wordCount: chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0),
                ingestedAt: new Date().toISOString(),
                metadata: document.metadata,
            };
            
            await this._saveBookInfo(bookInfo);
            this.ingestedBooks.set(bookIdToUse, bookInfo);
            
            logger.info(`✅ Book ingested: "${bookInfo.title}" (${bookInfo.chunkCount} chunks)`);
            return bookIdToUse;
            
        } catch (error) {
            logger.error(`Book ingestion failed for "${filePath}".`, { error });
            throw error;
        }
    }

    /**
     * Lists all currently ingested books.
     * @returns {Array<object>} An array of book information objects.
     */
    listBooks() {
        return Array.from(this.ingestedBooks.values());
    }

    /**
     * Completely removes a book and its associated data (metadata and embeddings).
     * @param {string} bookId - The ID of the book to remove.
     */
    async removeBook(bookId) {
        if (!this.ingestedBooks.has(bookId)) {
            logger.warn(`Attempted to remove non-existent book: ${bookId}`);
            return;
        }
        
        try {
            // This should be implemented in EmbeddingManager to delete the file.
            // For now, we'll assume it exists.
            // await this.embeddingManager.deleteEmbeddings(bookId);
            
            // As a fallback, overwrite with empty data.
            await this.embeddingManager.storeEmbeddings(bookId, []);
            
            await this._deleteBookInfo(bookId);
            this.ingestedBooks.delete(bookId);
            
            logger.info(`🗑️ Book removed successfully: ${bookId}`);
        } catch (error) {
            logger.error(`Failed to remove book: ${bookId}`, { error });
        }
    }

    _generateBookId(filePath) {
        const name = path.basename(filePath, path.extname(filePath));
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    async _saveBookInfo(bookInfo) {
        const infoPath = path.join(this.bookInfoDir, `${bookInfo.id}.json`);
        await fs.writeFile(infoPath, JSON.stringify(bookInfo, null, 2));
    }

    async _deleteBookInfo(bookId) {
        const infoPath = path.join(this.bookInfoDir, `${bookId}.json`);
        try {
            await fs.unlink(infoPath);
        } catch (error) {
            // Ignore if file doesn't exist, but log other errors.
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
}

// Export the class so it can be instantiated with a configuration.
module.exports