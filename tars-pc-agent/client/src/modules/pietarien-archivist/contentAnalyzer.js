const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const logger = require('../../shared/logger');

class ContentAnalyzer {
    constructor() {
        this.extractors = {
            '.txt': this.extractText,
            '.md': this.extractText,
            '.pdf': this.extractPDF,
            '.docx': this.extractDocx, // Note: Legacy .doc is not supported by Mammoth
            '.html': this.extractHTML,
            '.htm': this.extractHTML
        };

        // A comprehensive list of stop words for higher quality keyword extraction.
        this.stopWords = new Set(['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now']);
    }

    async extractContent(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const extractor = this.extractors[ext];

        if (!extractor) {
            throw new Error(`Unsupported file type: ${ext}`);
        }

        try {
            logger.debug(`📖 Extracting content from: ${filePath}`);
            const rawContent = await extractor.call(this, filePath);
            const cleanedContent = this.cleanContent(rawContent);
            // Truncate content to a max length for performance and to manage AI token limits.
            const finalContent = cleanedContent.substring(0, 15000);

            return {
                filePath,
                content: finalContent,
                wordCount: this.getWordCount(finalContent),
                keywords: this.extractKeywords(finalContent),
                metadata: await this.extractMetadata(filePath),
                extractedAt: new Date().toISOString()
            };

        } catch (error) {
            logger.error(`Content extraction error for ${filePath}.`, { error });
            throw error;
        }
    }

    async extractText(filePath) {
        return fs.readFile(filePath, 'utf-8');
    }

    async extractPDF(filePath) {
        const buffer = await fs.readFile(filePath);
        const data = await pdf(buffer);
        return data.text;
    }

    async extractDocx(filePath) {
        // Using the path directly is slightly more efficient than buffering.
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    }

    async extractHTML(filePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        // A simple regex for stripping tags. For complex HTML, a library like 'cheerio' would be more robust.
        return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    cleanContent(content) {
        // A less destructive cleaning process that preserves paragraph structure.
        return content
            .replace(/\r\n/g, '\n') // Normalize line endings
            .replace(/(\n\s*){3,}/g, '\n\n') // Collapse 3+ newlines into two
            .replace(/[ \t]+/g, ' ') // Collapse horizontal whitespace on each line
            .trim();
    }

    getWordCount(content) {
        return content.split(/\s+/).filter(word => word.length > 0).length;
    }

    async extractMetadata(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return {
                fileName: path.basename(filePath),
                fileSize: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                extension: path.extname(filePath)
            };
        } catch (error) {
            logger.warn(`Could not get stats for file: ${filePath}`);
            return {};
        }
    }

    extractKeywords(content, limit = 10) {
        const words = content.toLowerCase().match(/\b\w+\b/g) || [];
        const wordCounts = {};
        
        for (const word of words) {
            // Check against the comprehensive stop word list.
            if (word.length > 3 && !this.stopWords.has(word)) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        }
        
        return Object.entries(wordCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([word]) => word);
    }
}

module.exports = new ContentAnalyzer();