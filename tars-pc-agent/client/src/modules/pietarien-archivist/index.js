const fileScanner = require('./fileScanner');
const contentAnalyzer = require('./contentAnalyzer');
const fileOrganizer = require('./fileOrganizer');
const emotionalValidator = require('./emotionalValidator');
const metadataManager = require('./metadataManager');
const tarsClient = require('../../shared/tarsClient');
const logger = require('../../shared/logger');
const path = require('path');

class PietarienArchivist {
    constructor(config) {
        this.config = config;
        this.processedFiles = new Map();
        this.stats = {
            scanned: 0,
            organized: 0,
            errors: 0,
            categories: new Map()
        };
    }

    async organizePietarien(options = {}) {
        logger.info('🚀 Starting Pietarien organization...');
        
        try {
            const files = await fileScanner.scanDirectory(
                this.config.paths.pietarienDirectory,
                new Set(this.config.fileExtensions)
            );
            
            this.stats.scanned = files.length;
            console.log(`📁 Found ${files.length} files to organize`);
            
            const batches = this.createBatches(files, 5);
            for (let i = 0; i < batches.length; i++) {
                console.log(`🔄 Processing batch ${i + 1}/${batches.length}`);
                await this.processBatch(batches[i], options);
            }
            
            const report = await this.generateReport();
            await this.saveReport(report);
            
            console.log('✅ Pietarien organization completed!');
            return report;
            
        } catch (error) {
            logger.error('❌ Organization failed:', error);
            throw error;
        }
    }

    async processBatch(files, options) {
        for (const file of files) {
            try {
                await this.processFile(file, options);
            } catch (error) {
                this.stats.errors++;
                console.error(`❌ Error processing ${file.name}:`, error.message);
            }
        }
    }

    async processFile(file, options) {
        const content = await contentAnalyzer.extractContent(file.path);
        const analysis = await contentAnalyzer.analyzeWithTars(content.content);
        const emotional = await emotionalValidator.validate(content.content, analysis);
        
        const newPath = await fileOrganizer.organizeFile(
            file.path,
            analysis.category,
            analysis.subcategory,
            emotional
        );
        
        await metadataManager.createMetadata(newPath, {
            originalPath: file.path,
            category: analysis.category,
            emotionalTags: emotional.tags,
            confidence: analysis.confidence
        });
        
        this.processedFiles.set(file.path, newPath);
        this.stats.organized++;
        
        const count = this.stats.categories.get(analysis.category) || 0;
        this.stats.categories.set(analysis.category, count + 1);
        
        console.log(`📂 ${file.name} → ${analysis.category}/${analysis.subcategory}`);
    }

    createBatches(array, size) {
        const batches = [];
        for (let i = 0; i < array.length; i += size) {
            batches.push(array.slice(i, i + size));
        }
        return batches;
    }

    async generateReport() {
        return {
            timestamp: new Date().toISOString(),
            stats: {
                ...this.stats,
                categories: Object.fromEntries(this.stats.categories)
            },
            processedFiles: Object.fromEntries(this.processedFiles),
            recommendations: await this.getRecommendations()
        };
    }

    async saveReport(report) {
        const reportPath = path.join(this.config.paths.outputDirectory, 'organization_report.json');
        await require('fs').promises.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`📊 Report saved: ${reportPath}`);
    }

    async getRecommendations() {
        return [
            "Consider creating subcategories for high-volume categories",
            "Review low-confidence classifications",
            "Check for duplicate content"
        ];
    }
}

module.exports = PietarienArchivist;