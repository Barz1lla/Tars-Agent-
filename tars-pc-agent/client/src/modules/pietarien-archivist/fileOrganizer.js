const fs = require('fs').promises;
const path = require('path');
const logger = require('../../shared/logger');

class FileOrganizer {
    constructor(config) {
        if (!config || !config.paths || !config.paths.pietarienDirectory) {
            throw new Error('FileOrganizer requires a config object with paths.pietarienDirectory.');
        }
        this.config = config;
        this.basePath = config.paths.pietarienDirectory;
        // The directory structure is now expected to be part of the config.
        this.categoryStructure = config.categoryStructure || {};
    }

    /**
     * Organizes a file by copying it to a structured directory based on its category.
     * @param {string} filePath - The path of the source file.
     * @param {string} category - The primary category for the file.
     * @param {string} [subcategory='Ideas'] - A suggested subcategory.
     * @param {object} [options={}] - Additional options like deleting the original file.
     * @returns {Promise<string>} The path to the newly organized file.
     */
    async organizeFile(filePath, category, subcategory = 'Ideas', options = {}) {
        try {
            const fileName = path.basename(filePath);
            const fileExt = path.extname(fileName);
            const baseName = path.basename(fileName, fileExt);

            const categoryDir = path.join(this.basePath, this.sanitizeName(category));
            const targetSubdir = this.determineSubdirectory(fileName, subcategory);
            const targetDir = path.join(categoryDir, this.sanitizeName(targetSubdir));

            await this.ensureDir(targetDir);

            const newFileName = await this.generateUniqueFilename(targetDir, baseName, fileExt);
            const newFilePath = path.join(targetDir, newFileName);

            await fs.copyFile(filePath, newFilePath);

            if (options.deleteOriginal) {
                await fs.unlink(filePath);
            }

            logger.info(`📁 Organized: "${fileName}" → ${path.relative(this.basePath, newFilePath)}`);
            return newFilePath;

        } catch (error) {
            logger.error(`File organization failed for ${filePath}.`, { error });
            throw error;
        }
    }

    /**
     * Determines the appropriate subdirectory based on keywords in the filename.
     * @param {string} fileName - The name of the file.
     * @param {string} defaultSubdir - The fallback subdirectory.
     * @returns {string} The determined subdirectory name.
     */
    determineSubdirectory(fileName, defaultSubdir) {
        const lowerName = fileName.toLowerCase();
        // Use regex for more robust matching (e.g., word boundaries)
        if (/\b(draft|wip)\b/.test(lowerName)) return 'Drafts';
        if (/\b(research|study|data)\b/.test(lowerName)) return 'Research';
        if (/\b(emotional|logic|validation)\b/.test(lowerName)) return 'EmotionalLogic';
        
        return defaultSubdir || 'Ideas';
    }

    /**
     * Ensures a directory exists, creating it if necessary.
     * @param {string} dirPath - The path to the directory.
     */
    async ensureDir(dirPath) {
        await fs.mkdir(dirPath, { recursive: true });
    }

    /**
     * Generates a unique filename to prevent overwriting existing files.
     * @param {string} dirPath - The target directory.
     * @param {string} baseName - The base name of the file.
     * @param {string} extension - The file extension.
     * @returns {Promise<string>} A unique filename.
     */
    async generateUniqueFilename(dirPath, baseName, extension) {
        const sanitizedBase = this.sanitizeName(baseName, true);
        let counter = 0;
        let filename = `${sanitizedBase}${extension}`;
        
        while (true) {
            const fullPath = path.join(dirPath, filename);
            try {
                await fs.access(fullPath);
                // If access doesn't throw, file exists. Increment and try again.
                counter++;
                filename = `${sanitizedBase}_${counter}${extension}`;
            } catch {
                // If access throws, file does not exist. We found a unique name.
                return filename;
            }
        }
    }

    /**
     * Sanitizes a string to be used as a safe directory or file name.
     * @param {string} name - The string to sanitize.
     * @param {boolean} [isFile=false] - If true, allows dots for file extensions.
     * @returns {string} The sanitized string.
     */
    sanitizeName(name, isFile = false) {
        if (!name) return 'unknown';
        const regex = isFile ? /[^a-z0-9_.-]/g : /[^a-z0-9_-]/g;
        return name
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(regex, '')
            .replace(/__+/g, '_');
    }

    /**
     * Generates a report on the file counts within a specific category's subdirectories.
     * @param {string} category - The category to report on.
     * @returns {Promise<object>} A report object.
     */
    async generateCategoryReport(category) {
        const categoryDir = path.join(this.basePath, this.sanitizeName(category));
        const subdirs = this.categoryStructure[category] || ['Ideas', 'Research', 'Drafts', 'EmotionalLogic'];
        const report = { category, subdirectories: {}, totalFiles: 0 };

        for (const subdir of subdirs) {
            const dirPath = path.join(categoryDir, this.sanitizeName(subdir));
            try {
                const files = await fs.readdir(dirPath);
                const fileCount = files.filter(f => !f.startsWith('.')).length;
                report.subdirectories[subdir] = fileCount;
                report.totalFiles += fileCount;
            } catch (error) {
                if (error.code === 'ENOENT') {
                    report.subdirectories[subdir] = 0; // Directory doesn't exist, count is 0.
                } else {
                    logger.warn(`Could not generate report for ${dirPath}`, { error });
                    report.subdirectories[subdir] = 'Error';
                }
            }
        }
        return report;
    }
}

// Export the class itself, not an instance, so it can be instantiated with a configuration.
module.exports = FileOrganizer;