const fs = require('fs').promises;
const path = require('path');
const logger = require('../../shared/logger');

class MetadataManager {
    constructor(config = {}) {
        // The root directory where archived files and their metadata are stored.
        this.archiveBase = config.archivePath || path.join(process.cwd(), 'data', 'pietarien_archive');
    }

    /**
     * Creates and saves a metadata record for a newly archived file.
     * @param {string} originalFilePath - The path of the original source file.
     * @param {object} data - An object containing details like newPath, category, etc.
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
                subcategory: data.subcategory || 'general',
                emotionalTags: data.emotionalTags || [],
                confidence: data.confidence || 0,
                wordCount: data.wordCount || 0,
                processedAt: new Date().toISOString(),
                fileStats: fileStats,
                version: 2, // Represents the new, more robust structure
                processingHistory: [{
                    action: 'pietarien_organize',
                    timestamp: new Date().toISOString(),
                    issues: data.issues || []
                }]
            };

            await this._saveRecord(record);
            logger.info(`Metadata created for: ${path.basename(originalFilePath)}`);
            return record;

        } catch (error) {
            logger.error(`Metadata creation failed for ${originalFilePath}.`, { error });
            throw error;
        }
    }

    /**
     * Generates a comprehensive report by scanning all metadata files in the archive.
     * @returns {Promise<object>} A report object with detailed statistics.
     */
    async generateReport() {
        const stats = {
            totalFiles: 0,
            totalWordCount: 0,
            byCategory: {},
            emotionalThemes: {},
            confidenceSum: 0,
        };

        try {
            await this._scanForMetadata(this.archiveBase, stats);
        } catch (error) {
            logger.error('Failed to generate a complete report.', { error });
        }

        const averageConfidence = stats.totalFiles > 0
            ? Math.round(stats.confidenceSum / stats.totalFiles)
            : 0;

        return {
            reportGeneratedAt: new Date().toISOString(),
            summary: {
                totalFiles: stats.totalFiles,
                totalWordCount: stats.totalWordCount,
                averageConfidence: averageConfidence,
                categoryCount: Object.keys(stats.byCategory).length,
            },
            byCategory: stats.byCategory,
            topEmotionalThemes: Object.entries(stats.emotionalThemes)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10),
        };
    }

    /**
     * Private recursive method to find and process all .meta.json files.
     * @private
     */
    async _scanForMetadata(directory, stats) {
        const entries = await fs.readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                await this._scanForMetadata(fullPath, stats);
            } else if (entry.name.endsWith('.meta.json')) {
                try {
                    const content = await fs.readFile(fullPath, 'utf8');
                    const meta = JSON.parse(content);
                    
                    // Aggregate stats from the metadata file
                    stats.totalFiles++;
                    stats.totalWordCount += meta.wordCount || 0;
                    stats.confidenceSum += meta.confidence || 0;
                    
                    stats.byCategory[meta.category] = (stats.byCategory[meta.category] || 0) + 1;
                    
                    (meta.emotionalTags || []).forEach(tag => {
                        stats.emotionalThemes[tag] = (stats.emotionalThemes[tag] || 0) + 1;
                    });

                } catch (error) {
                    logger.warn(`Skipping corrupted metadata file: ${fullPath}`, { error });
                }
            }
        }
    }

    /**
     * Private helper to save a metadata record to a file.
     * @private
     */
    async _saveRecord(record) {
        const metadataFile = record.newPath + '.meta.json';
        await fs.writeFile(metadataFile, JSON.stringify(record, null, 2));
    }

    /**
     * Private helper to get file system stats.
     * @private
     */
    async _getFileStats(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
            };
        } catch (error) {
            logger.warn(`Could not get stats for file: ${filePath}`);
            return { size: 0, created: null, modified: null };
        }
    }
}

module.exports = new MetadataManager();