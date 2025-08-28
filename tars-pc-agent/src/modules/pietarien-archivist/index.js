const logger = require('../../shared/logger').module('PietarienArchivist');
const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');

class PietarienArchivist {
    constructor(config, tarsClient) {
        this.config = config;
        this.tarsClient = tarsClient;
        this.enabled = config.modules?.pietarien_archivist?.enabled || false;
        this.categories = config.modules?.pietarien_archivist?.categories || [
            'Justice Acceleration',
            'Innovation Enablement', 
            'Environmental Intelligence',
            'Sport Equity',
            'Education Reform'
        ];
        this.watchMode = config.modules?.pietarien_archivist?.watchMode || false;
        this.sourceDir = config.paths?.pietarienDirectory || './data/pietarien';
        this.outputDir = path.join(config.paths?.outputDirectory || './data/output', 'pietarien-organized');
        
        // Ensure directories exist
        fs.ensureDirSync(this.sourceDir);
        fs.ensureDirSync(this.outputDir);
        
        if (this.watchMode) {
            this.startWatching();
        }
        
        logger.info('PietarienArchivist initialized');
    }

    async organizePietarien(options = {}) {
        if (!this.enabled) {
            throw new Error('Pietarien Archivist is disabled');
        }

        try {
            logger.info('Starting Pietarien organization process');
            
            const files = await this.getFilesToProcess();
            const results = {
                totalFiles: files.length,
                processed: 0,
                categorized: {},
                errors: []
            };

            // Initialize category counters
            this.categories.forEach(cat => {
                results.categorized[cat] = 0;
                // Ensure category directory exists
                fs.ensureDirSync(path.join(this.outputDir, this.sanitizeFolderName(cat)));
            });

            for (const file of files) {
                try {
                    await this.processFile(file, results);
                    results.processed++;
                } catch (error) {
                    logger.error(`Failed to process file ${file}:`, error.message);
                    results.errors.push({ file, error: error.message });
                }
            }

            logger.info(`Organization completed: ${results.processed}/${results.totalFiles} files processed`);
            
            // Save organization report
            await this.saveOrganizationReport(results);
            
            return results;

        } catch (error) {
            logger.error('Organization process failed:', error.message);
            throw error;
        }
    }

    async getFilesToProcess() {
        const files = [];
        const items = await fs.readdir(this.sourceDir);
        
        for (const item of items) {
            const fullPath = path.join(this.sourceDir, item);
            const stat = await fs.stat(fullPath);
            
            if (stat.isFile() && this.isValidFile(item)) {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    isValidFile(filename) {
        const validExtensions = this.config.fileExtensions || ['.md', '.txt', '.pdf', '.docx', '.json'];
        const ext = path.extname(filename).toLowerCase();
        return validExtensions.includes(ext);
    }

    async processFile(filePath, results) {
        logger.info(`Processing file: ${path.basename(filePath)}`);
        
        // Read file content
        const content = await this.readFileContent(filePath);
        
        if (!content || content.trim().length < 10) {
            throw new Error('File content too short or empty');
        }

        // Categorize content using TARS
        const category = await this.categorizeContent(content);
        
        // Move file to appropriate category folder
        await this.moveFileToCategory(filePath, category);
        
        // Update results
        if (results.categorized[category] !== undefined) {
            results.categorized[category]++;
        }
        
        logger.info(`File categorized as: ${category}`);
    }

    async readFileContent(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        
        try {
            switch (ext) {
                case '.txt':
                case '.md':
                    return await fs.readFile(filePath, 'utf8');
                case '.json':
                    const jsonData = await fs.readJson(filePath);
                    return JSON.stringify(jsonData, null, 2);
                case '.pdf':
                    // For now, just return filename as content
                    // Could integrate pdf-parse here
                    return `PDF file: ${path.basename(filePath)}`;
                default:
                    return path.basename(filePath);
            }
        } catch (error) {
            throw new Error(`Failed to read file content: ${error.message}`);
        }
    }

    async categorizeContent(content) {
        try {
            const result = await this.tarsClient.categorizeContent(content, this.categories);
            
            // Clean and validate the category
            const category = result.text.trim();
            
            // Check if the returned category is valid
            const validCategory = this.categories.find(cat => 
                cat.toLowerCase() === category.toLowerCase()
            );
            
            if (validCategory) {
                return validCategory;
            } else {
                // Default to first category if invalid response
                logger.warn(`Invalid category returned: ${category}, using default`);
                return this.categories[0];
            }
            
        } catch (error) {
            logger.error('Categorization failed:', error.message);
            // Return default category on error
            return this.categories[0];
        }
    }

    async moveFileToCategory(filePath, category) {
        const filename = path.basename(filePath);
        const categoryDir = path.join(this.outputDir, this.sanitizeFolderName(category));
        const targetPath = path.join(categoryDir, filename);
        
        // Handle name conflicts
        let finalPath = targetPath;
        let counter = 1;
        
        while (await fs.pathExists(finalPath)) {
            const ext = path.extname(filename);
            const nameWithoutExt = path.basename(filename, ext);
            finalPath = path.join(categoryDir, `${nameWithoutExt}_${counter}${ext}`);
            counter++;
        }
        
        await fs.move(filePath, finalPath);
        logger.debug(`Moved ${filename} to ${category} folder`);
    }

    sanitizeFolderName(name) {
        return name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
    }

    async saveOrganizationReport(results) {
        try {
            const reportPath = path.join(this.outputDir, `organization-report-${Date.now()}.json`);
            const report = {
                ...results,
                timestamp: new Date().toISOString(),
                categories: this.categories,
                sourceDirectory: this.sourceDir,
                outputDirectory: this.outputDir
            };
            
            await fs.writeJson(reportPath, report, { spaces: 2 });
            logger.info(`Organization report saved to ${reportPath}`);
        } catch (error) {
            logger.warn('Failed to save organization report:', error.message);
        }
    }

    startWatching() {
        if (this.watcher) {
            this.watcher.close();
        }
        
        this.watcher = chokidar.watch(this.sourceDir, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            ignoreInitial: true
        });
        
        this.watcher.on('add', async (filePath) => {
            try {
                logger.info(`New file detected: ${path.basename(filePath)}`);
                const results = { categorized: {}, errors: [] };
                this.categories.forEach(cat => results.categorized[cat] = 0);
                
                await this.processFile(filePath, results);
                logger.info('Auto-organization completed');
            } catch (error) {
                logger.error('Auto-organization failed:', error.message);
            }
        });
        
        logger.info('File watching started');
    }

    stopWatching() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
            logger.info('File watching stopped');
        }
    }

    getStatus() {
        return {
            enabled: this.enabled,
            watchMode: this.watchMode,
            categories: this.categories,
            sourceDir: this.sourceDir,
            outputDir: this.outputDir,
            hasConnection: this.tarsClient ? true : false
        };
    }
}

module.exports = PietarienArchivist;