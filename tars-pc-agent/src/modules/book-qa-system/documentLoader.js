const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const logger = require('../../shared/logger');

/**
 * @class DocumentLoader
 * @description Loads various document types, extracts their text content, and splits them into manageable, overlapping chunks.
 */
class DocumentLoader {
    constructor() {
        this.loaders = {
            '.txt': this._loadText,
            '.md': this._loadText,
            '.pdf': this._loadPDF,
            '.docx': this._loadDocx,
            '.html': this._loadHTML,
            '.json': this._loadJSON,
        };
    }

    /**
     * Loads a document from a file path, extracts its content, and attaches metadata.
     * @param {string} filePath - The path to the document.
     * @returns {Promise<object>} A document object with content and metadata.
     */
    async loadDocument(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const loader = this.loaders[ext];

        if (!loader) {
            throw new Error(`Unsupported document type: ${ext}`);
        }

        try {
            logger.debug(`📖 Loading document: ${filePath}`);
            const content = await loader.call(this, filePath);
            
            return {
                filePath,
                content,
                metadata: await this._extractMetadata(filePath),
                loadedAt: new Date().toISOString(),
            };

        } catch (error) {
            logger.error(`Error loading document: ${filePath}`, { error });
            throw error;
        }
    }

    /**
     * Splits a document's content into overlapping chunks of a specified size.
     * This uses a simple and effective sliding window algorithm.
     * @param {object} document - The document object from loadDocument.
     * @param {object} [options] - Chunking options.
     * @param {number} [options.chunkSize=1000] - The maximum number of characters per chunk.
     * @param {number} [options.overlap=200] - The number of characters to overlap between chunks.
     * @returns {Array<object>} An array of chunk objects.
     */
    splitIntoChunks(document, { chunkSize = 1000, overlap = 200 } = {}) {
        if (overlap >= chunkSize) {
            throw new Error('Overlap must be smaller than chunkSize.');
        }

        const content = document.content;
        const chunks = [];
        let index = 0;
        let chunkIndex = 0;

        while (index < content.length) {
            const end = index + chunkSize;
            const chunkText = content.substring(index, end);
            
            chunks.push({
                text: chunkText.trim(),
                index: chunkIndex++,
                wordCount: chunkText.split(/\s+/).filter(Boolean).length,
                source: document.filePath,
                metadata: document.metadata,
            });

            // Move the index forward by the chunk size minus the overlap
            index += (chunkSize - overlap);
        }

        logger.info(`✅ Split "${path.basename(document.filePath)}" into ${chunks.length} chunks.`);
        return chunks;
    }

    // --- Private Loader & Helper Methods ---

    async _loadText(filePath) {
        return fs.readFile(filePath, 'utf-8');
    }

    async _loadPDF(filePath) {
        const buffer = await fs.readFile(filePath);
        const data = await pdf(buffer);
        return data.text;
    }

    async _loadDocx(filePath) {
        const { value } = await mammoth.extractRawText({ path: filePath });
        return value;
    }

    async _loadHTML(filePath) {
        const html = await fs.readFile(filePath, 'utf-8');
        // Simple regex to strip HTML tags. For complex HTML, a library like 'cheerio' would be better.
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    async _loadJSON(filePath) {
        const jsonString = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(jsonString);
        // Convert JSON object to a string representation for analysis.
        return JSON.stringify(data, null, 2);
    }

    async _extractMetadata(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return {
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
            };
        } catch (error) {
            logger.warn(`Could not extract metadata for ${filePath}.`);
            return { size: 0, createdAt: null, modifiedAt: null };
        }
    }
}

module.exports = DocumentLoader;