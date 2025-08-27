const fs = require('fs').promises;
const path = require('path');
const logger = require('../../shared/logger');

class ChatArchiver {
    constructor(config = {}) {
        this.archiveBase = config.archivePath || path.join(process.cwd(), 'data', 'organized-chats');
    }

    /**
     * Archives a chat file by copying it to a structured directory and creating a metadata file.
     * @param {object} file - The original file object from the collector.
     * @param {object} classification - The classification object from the classifier.
     * @returns {Promise<string>} The path to the newly archived file.
     */
    async archiveChat(file, classification) {
        try {
            const safeCategory = this.sanitizeName(classification.category);
            const safeSubcategory = this.sanitizeName(classification.subcategory);
            
            const archivePath = path.join(
                this.archiveBase,
                safeCategory,
                safeSubcategory
            );
            
            await fs.mkdir(archivePath, { recursive: true });
            
            const newFileName = this.generateFileName(file, classification);
            const newFilePath = path.join(archivePath, newFileName);
            
            // Using copyFile is safer as it leaves the original file intact.
            await fs.copyFile(file.path, newFilePath);
            
            await this.createMetadata(file, newFilePath, classification);
            
            logger.info(`📁 Archived: "${file.name}" → ${path.relative(process.cwd(), newFilePath)}`);
            return newFilePath;
            
        } catch (error) {
            logger.error(`Archiving failed for ${file.name}.`, { error });
            throw error;
        }
    }

    /**
     * Generates a descriptive and safe filename for the archived chat.
     * @param {object} file - The original file object.
     * @param {object} classification - The classification object.
     * @returns {string} The new filename.
     */
    generateFileName(file, classification) {
        const baseName = this.sanitizeName(path.basename(file.name, path.extname(file.name)));
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        // Limit tags in filename to prevent excessive length
        const tags = (classification.tags || []).slice(0, 3).join('-');
        
        return `${timestamp}_${baseName}_${tags}${path.extname(file.name)}`;
    }

    /**
     * Creates a .json metadata file alongside the archived chat file.
     * @param {object} originalFile - The original file object.
     * @param {string} newFilePath - The path of the newly archived file.
     * @param {object} classification - The classification object.
     */
    async createMetadata(originalFile, newFilePath, classification) {
        const metadataPath = newFilePath + '.meta.json';
        
        const metadata = {
            originalPath: originalFile.path,
            archivedPath: newFilePath,
            classification,
            archivedAt: new Date().toISOString(),
            fileStats: await this.getFileStats(newFilePath)
        };
        
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    /**
     * Sanitizes a string to be used as a safe directory or file name.
     * @param {string} name - The string to sanitize.
     * @returns {string} The sanitized string.
     */
    sanitizeName(name) {
        if (!name) return 'unknown';
        return name
            .toLowerCase()
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/[^a-z0-9_-]/g, '') // Remove invalid characters
            .replace(/__+/g, '_'); // Collapse multiple underscores
    }

    /**
     * Retrieves file system stats for a given file path.
     * @param {string} filePath - The path to the file.
     * @returns {Promise<object>} An object with file stats.
     */
    async getFileStats(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return { size: stats.size, created: stats.birthtime, modified: stats.mtime };
        } catch (error) {
            logger.warn(`Could not get stats for file: ${filePath}`);
            return { size: 0, created: null, modified: null };
        }
    }

    /**
     * Generates a report detailing the structure and contents of the archive.
     * @returns {Promise<object>} A report object.
     */
    async generateArchiveReport() {
        const structure = {};
        let totalFiles = 0;
        
        try {
            const scan = async (dir, level = 0, struct) => {
                if (level > 5) return; // Safety break for deep recursion
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        struct[entry.name] = {};
                        await scan(fullPath, level + 1, struct[entry.name]);
                    } else if (!entry.name.endsWith('.meta.json')) {
                        // Count the file if it's not a metadata file
                        struct._fileCount = (struct._fileCount || 0) + 1;
                        totalFiles++;
                    }
                }
            };
            await scan(this.archiveBase, 0, structure);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.warn('Cannot generate full archive report.', { error: error.message });
            }
        }
        
        return {
            totalFiles,
            structure,
            lastGenerated: new Date().toISOString()
        };
    }
}

module.exports = new ChatArchiver();