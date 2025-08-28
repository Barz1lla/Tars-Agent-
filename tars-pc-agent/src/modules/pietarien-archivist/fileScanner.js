const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const logger = require('../../shared/logger');

class FileScanner {
    constructor(config = {}) {
        // Default supported extensions should align with what ContentAnalyzer can process.
        this.supportedExtensions = new Set([
            '.md', '.txt', '.pdf', '.docx', '.html', '.htm'
        ]);
        
        // Make key behaviors configurable.
        this.maxFileSize = config.maxFileSize || 100 * 1024 * 1024; // 100 MB
        this.excludeDirs = new Set(config.excludeDirs || ['node_modules', '.git', 'archive']);
    }

    /**
     * Recursively scans a directory for files matching a set of extensions.
     * @param {string} dirPath - The root directory to start scanning.
     * @param {Set<string>|Array<string>} [extensions] - Optional set or array of extensions to scan for.
     * @param {object} [options={}] - Additional options.
     * @param {number} [options.maxDepth=10] - Maximum recursion depth.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of file objects.
     */
    async scanDirectory(dirPath, extensions, options = {}) {
        const targetExtensions = extensions ? new Set(extensions) : this.supportedExtensions;
        const maxDepth = options.maxDepth || 10;
        
        logger.info(`🔍 Starting file scan in: ${dirPath}`);
        const files = await this._scanRecursive(dirPath, targetExtensions, maxDepth);
        logger.info(`✅ Scan complete. Found ${files.length} matching files.`);
        return files;
    }

    /**
     * The private recursive scanning implementation.
     * @private
     */
    async _scanRecursive(dirPath, extensions, maxDepth, currentDepth = 0) {
        if (currentDepth >= maxDepth) {
            logger.warn(`Reached max scan depth at: ${dirPath}`);
            return [];
        }

        let files = [];
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory() && !this.excludeDirs.has(entry.name)) {
                    const subFiles = await this._scanRecursive(fullPath, extensions, maxDepth, currentDepth + 1);
                    files.push(...subFiles);
                } else if (entry.isFile()) {
                    const file = await this._processFile(fullPath, extensions);
                    if (file) files.push(file);
                }
            }
        } catch (error) {
            logger.warn(`Cannot access directory ${dirPath}.`, { error: error.message });
        }
        
        return files;
    }

    /**
     * Processes a single file, checking its extension and stats.
     * @private
     */
    async _processFile(filePath, extensions) {
        const ext = path.extname(filePath).toLowerCase();
        if (!extensions.has(ext)) return null;
        
        try {
            const stats = await fs.stat(filePath);
            // Ignore empty files or files that are too large.
            if (stats.size === 0 || stats.size > this.maxFileSize) return null;
            
            return {
                path: filePath,
                name: path.basename(filePath),
                extension: ext,
                size: stats.size,
                modified: stats.mtime,
                created: stats.birthtime
            };
        } catch (error) {
            logger.warn(`Cannot process file ${filePath}.`, { error: error.message });
            return null;
        }
    }

    /**
     * Generates a statistical report from a list of file objects.
     * @param {Array<object>} files - An array of file objects from a scan.
     * @returns {object} A statistics object.
     */
    generateStatsReport(files) {
        const stats = {
            totalFiles: files.length,
            totalSize: 0,
            byExtension: {},
        };

        for (const file of files) {
            if (!stats.byExtension[file.extension]) {
                stats.byExtension[file.extension] = { count: 0, size: 0 };
            }
            stats.byExtension[file.extension].count++;
            stats.byExtension[file.extension].size += file.size;
            stats.totalSize += file.size;
        }
        return stats;
    }

    /**
     * Watches a directory for changes and triggers a callback.
     * @param {string} directoryPath - The path to the directory to watch.
     * @param {Function} callback - A function to call on events, e.g., (eventType, filePath) => {}.
     * @returns {object} The chokidar watcher instance.
     */
    watchDirectory(directoryPath, callback) {
        const watcher = chokidar.watch(directoryPath, {
            ignored: /(^|[\/\\])\../, // Ignore dotfiles
            persistent: true,
            ignoreInitial: true, // Don't fire 'add' for existing files
        });

        const handleEvent = (eventType, filePath) => {
            if (this.supportedExtensions.has(path.extname(filePath).toLowerCase())) {
                callback(eventType, filePath);
            }
        };

        watcher
            .on('add', filePath => handleEvent('add', filePath))
            .on('change', filePath => handleEvent('change', filePath))
            .on('unlink', filePath => handleEvent('remove', filePath));

        logger.info(`👁️  Watching for changes in: ${directoryPath}`);
        return watcher;
    }
}

module.exports = new FileScanner();

