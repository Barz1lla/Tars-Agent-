const fs = require('fs').promises;
const path = require('path');
const logger = require('../../shared/logger');

class SearchEngine {
    constructor() {
        this.indexDir = path.join(process.cwd(), 'data', 'chat_search_index');
        this.docMapPath = path.join(this.indexDir, 'doc_map.json');
        this.invertedIndexPath = path.join(this.indexDir, 'inverted_index.json');
        
        this.docMap = new Map(); // Maps doc ID to its metadata
        this.invertedIndex = new Map(); // Maps keyword to a map of { docId: termFrequency }
        this.stopWords = new Set(['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now']);
    }

    async initialize() {
        await fs.mkdir(this.indexDir, { recursive: true });
        await this._loadIndex();
        logger.info(`🔍 Search engine initialized with ${this.docMap.size} indexed chats.`);
    }

    async indexChat(content, classification, archivePath) {
        const docId = this.generateId(archivePath);
        const { keywords, termFrequencies } = this.extractKeywords(content);

        const docEntry = {
            id: docId,
            contentExcerpt: content.substring(0, 500),
            fullPath: archivePath,
            classification,
            keywords,
            indexedAt: new Date().toISOString()
        };

        this.docMap.set(docId, docEntry);

        for (const [term, freq] of termFrequencies.entries()) {
            if (!this.invertedIndex.has(term)) {
                this.invertedIndex.set(term, new Map());
            }
            this.invertedIndex.get(term).set(docId, freq);
        }

        await this.saveIndex();
        logger.debug(`Indexed chat: ${docId}`);
    }

    async search(query, options = {}) {
        const queryKeywords = this.extractKeywords(query).keywords;
        const docScores = new Map();

        for (const keyword of queryKeywords) {
            if (this.invertedIndex.has(keyword)) {
                const postings = this.invertedIndex.get(keyword);
                for (const [docId, termFrequency] of postings.entries()) {
                    // Simple TF-based scoring (Term Frequency)
                    const score = (docScores.get(docId) || 0) + termFrequency;
                    docScores.set(docId, score);
                }
            }
        }

        const sortedDocs = Array.from(docScores.entries())
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
            .slice(0, options.limit || 10);

        return sortedDocs.map(([docId, score]) => ({
            ...this.docMap.get(docId),
            relevance: score
        }));
    }

    extractKeywords(content) {
        const words = content.toLowerCase().match(/\b\w+\b/g) || [];
        const termFrequencies = new Map();
        
        for (const word of words) {
            if (word.length > 2 && !this.stopWords.has(word)) {
                termFrequencies.set(word, (termFrequencies.get(word) || 0) + 1);
            }
        }
        
        const keywords = Array.from(termFrequencies.keys());
        return { keywords, termFrequencies };
    }

    generateId(filePath) {
        // Create a more stable ID based on the file path
        return require('crypto').createHash('sha1').update(filePath).digest('hex').substring(0, 16);
    }

    async saveIndex() {
        // Convert Maps to JSON-serializable formats
        const serializableInvertedIndex = Object.fromEntries(
            Array.from(this.invertedIndex.entries()).map(([key, value]) => [key, Object.fromEntries(value)])
        );
        const serializableDocMap = Object.fromEntries(this.docMap);

        await fs.writeFile(this.invertedIndexPath, JSON.stringify(serializableInvertedIndex));
        await fs.writeFile(this.docMapPath, JSON.stringify(serializableDocMap));
    }

    async _loadIndex() {
        try {
            const [docMapData, invertedIndexData] = await Promise.all([
                fs.readFile(this.docMapPath, 'utf8').catch(() => '{}'),
                fs.readFile(this.invertedIndexPath, 'utf8').catch(() => '{}')
            ]);

            const parsedDocMap = JSON.parse(docMapData);
            const parsedInvertedIndex = JSON.parse(invertedIndexData);

            this.docMap = new Map(Object.entries(parsedDocMap));
            this.invertedIndex = new Map(
                Object.entries(parsedInvertedIndex).map(([key, value]) => [key, new Map(Object.entries(value))])
            );
        } catch (error) {
            logger.error('Failed to load search index. Starting fresh.', { error });
            this.docMap = new Map();
            this.invertedIndex = new Map();
        }
    }
}

module.exports = new SearchEngine();