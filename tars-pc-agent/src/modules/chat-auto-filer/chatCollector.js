const fs = require('fs').promises;
const path = require('path');
const logger = require('../../shared/logger');

/**
 * @class ChatCollector
 * @description Scans directories to find chat files based on specified criteria.
 * Its sole responsibility is to identify and collect file paths and metadata.
 */
class ChatCollector {
    /**
     * Finds all chat files in a given directory that match the specified formats.
     * @param {string} directoryPath - The root directory to start scanning from.
     * @param {Array<string>} supportedFormats - An array of file extensions to look for (e.g., ['.json', '.txt']).
     * @param {object} [options={}] - Additional scanning options.
     * @param {Array<string>} [options.excludeDirs] - A list of directory names to ignore.
     * @param {number} [options.maxDepth] - The maximum depth for recursive scanning.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of chat file objects.
     */
    async collectChats(directoryPath, supportedFormats, options = {}) {
        try {
            const stats = await fs.stat(directoryPath);
            if (!stats.isDirectory()) {
                throw new Error(`Provided path is not a directory: ${directoryPath}`);
            }
        } catch (error) {
            logger.error('Chat collection failed: Source directory not found or accessible.', { path: directoryPath, error: error.message });
            return []; // Return empty array if the root directory is invalid
        }

        const excludeDirs = new Set(options.excludeDirs || ['node_modules', '.git', 'archive']);
        const formats = new Set(supportedFormats || ['.json', '.txt', '.md']);
        
        logger.info(`🔍 Starting chat collection in "${directoryPath}"...`);
        const chats = await this._scanDirectory(directoryPath, formats, excludeDirs, options.maxDepth || 5);
        logger.info(`✅ Found ${chats.length} potential chat files.`);
        return chats;
    }

    /**
     * A private recursive method to scan directories for files.
     * @param {string} dirPath - The current directory being scanned.
     * @param {Set<string>} formats - A Set of supported file extensions.
     * @param {Set<string>} excludeDirs - A Set of directory names to exclude.
     * @param {number} maxDepth - The maximum recursion depth.
     * @param {number} [currentDepth=0] - The current depth of recursion.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of found chat file objects.
     * @private
     */
    async _scanDirectory(dirPath, formats, excludeDirs, maxDepth, currentDepth = 0) {
        if (currentDepth >= maxDepth) {
            logger.warn(`Reached max scan depth of ${maxDepth} at: ${dirPath}`);
            return [];
        }

        const foundFiles = [];
        
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory() && !excludeDirs.has(entry.name)) {
                    // Recurse into subdirectories
                    const subFiles = await this._scanDirectory(fullPath, formats, excludeDirs, maxDepth, currentDepth + 1);
                    foundFiles.push(...subFiles);

                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (formats.has(ext)) {
                        try {
                            const stats = await fs.stat(fullPath);
                            if (stats.size > 0) { // Ignore empty files
                                foundFiles.push({
                                    path: fullPath,
                                    name: entry.name,
                                    extension: ext,
                                    size: stats.size,
                                    modified: stats.mtime,
                                });
                            }
                        } catch (statError) {
                            logger.warn(`Could not get stats for file: ${fullPath}`, { error: statError.message });
                        }
                    }
                }
            }
        } catch (error) {
            logger.warn(`Cannot access directory: ${dirPath}`, { error: error.message });
        }
        
        return foundFiles;
    }
}

module.exports = new ChatCollector();