const fs = require('fs').promises;
const path = require('path');
const logger = require('../../shared/logger');

/**
 * @class MetadataManager
 * @description Manages metadata for processed files by creating individual .meta.json files
 * and maintaining a cache for efficient reporting.
 */
class MetadataManager {
    constructor() {
        this.metadataDir = path.join(process.cwd(), 'data', 'reedsy_metadata');
        this.cachePath = path.join(this.metadataDir, '_metadata_cache.json');
    }

    /**
     * Creates and saves a metadata record for a processed file.
     * @param {string} originalFilePath - The original path of the file being processed.
     * @param {object} data - An object containing metadata like newPath, category, issues, etc.
     * @returns {Promise<object>} The full metadata object that was saved.
     */
    async createMetadata(originalFilePath, data) {
        try {
            const fileStats = await this._getFileStats(data.newPath);
            const record = {
                id: path.basename(originalFilePath) + '_' + Date.now(),
                originalPath: originalFilePath,
                newPath: data.newPath,
                category: data.category,
                emotionalTags: data.emotionalTags || [],
                confidence: data.confidence || 0,
                wordCount: data.wordCount || 0,
                processedAt: new Date().toISOString(),
                fileStats: fileStats,
                version: 2, // Represents the new metadata structure
                processingHistory: [{
                    action: 'reedsy_repair',
                    timestamp: new Date().toISOString(),
                    issues: data.issues || []
                }]
            };

            await this._saveRecord(record);
            await this._updateCache(record);

            logger.info(`Metadata created successfully for: ${path.basename(originalFilePath)}`);
            return record;

        } catch (error) {
            logger.error(`Failed to create metadata for ${originalFilePath}.`, { error });
            throw error;
        }
    }

    /**
     * Generates a comprehensive report based on the cached metadata.
     * @returns {Promise<object>} An object containing summary and detailed statistics.
     */
    async generateReport() {
        const cache = await this._loadCache();
        const stats = {
            totalFiles: cache.records.length,
            byCategory: {},
            averageConfidence: 0,
            mostCommonIssues: {}
        };

        let totalConfidence = 0;
        for (const record of cache.records) {
            stats.byCategory[record.category] = (stats.byCategory[record.category] || 0) + 1;
            totalConfidence += record.confidence;
            record.processingHistory[0]?.issues.forEach(issue => {
                stats.mostCommonIssues[issue.type] = (stats.mostCommonIssues[issue.type] || 0) + 1;
            });
        }

        stats.averageConfidence = stats.totalFiles > 0 
            ? Math.round(totalConfidence / stats.totalFiles) 
            : 0;

        return {
            summary: {
                totalFiles: stats.totalFiles,
                averageConfidence: stats.averageConfidence,
                topCategories: Object.entries(stats.byCategory).sort(([,a], [,b]) => b - a).slice(0, 5),
                topIssues: Object.entries(stats.mostCommonIssues).sort(([,a], [,b]) => b - a).slice(0, 5)
            },
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Saves a single metadata record to its own .json file.
     * @private
     */
    async _saveRecord(record) {
        await fs.mkdir(this.metadataDir, { recursive: true });
        const recordPath = path.join(this.metadataDir, `${record.id}.meta.json`);
        await fs.writeFile(recordPath, JSON.stringify(record, null, 2));
    }

    /**
     * Loads the metadata cache file.
     * @private
     */
    async _loadCache() {
        try {
            const data = await fs.readFile(this.cachePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // If cache doesn't exist or is invalid, return a default structure
            return { version: "2.0-cache", lastUpdated: null, records: [] };
        }
    }

    /**
     * Updates the cache file with a new record.
     * @private
     */
    async _updateCache(record) {
        const cache = await this._loadCache();
        // Create a summary for the cache to keep it lightweight
        const cacheEntry = {
            id: record.id,
            category: record.category,
            confidence: record.confidence,
            processedAt: record.processedAt,
            processingHistory: [{ issues: record.processingHistory[0]?.issues.map(i => ({ type: i.type })) }]
        };
        cache.records.push(cacheEntry);
        cache.lastUpdated = new Date().toISOString();
        await fs.writeFile(this.cachePath, JSON.stringify(cache, null, 2));
    }

    /**
     * Retrieves file system stats for a given file path.
     * @private
     */
    async _getFileStats(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return { size: stats.size, created: stats.birthtime, modified: stats.mtime };
        } catch (error) {
            logger.warn(`Could not get stats for file: ${filePath}`);
            return { size: 0, created: null, modified: null };
        }
    }
}

module.exports = new MetadataManager();