const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const chatCollector = require('./chatCollector');
const chatParser = require('./chatParser');
const chatClassifier = require('./chatClassifier');
const chatArchiver = require('./chatArchiver');
const searchEngine = require('./searchEngine');
const logger = require('../../shared/logger');

class ChatAutoFiler {
    constructor(config) {
        if (!config || !config.paths || !config.paths.chatDirectory) {
            throw new Error('Configuration must include paths.chatDirectory');
        }
        this.config = config;
        this.processedInSession = new Set();
        this.stats = {
            processed: 0,
            classified: 0,
            errors: 0,
            categories: new Map()
        };
    }

    async processAllChats(options = {}) {
        logger.info('💬 Starting chat auto-filing...');
        
        try {
            const chatFiles = await chatCollector.collectChats(
                this.config.paths.chatDirectory,
                this.config.supportedFormats
            );
            
            logger.info(`📁 Found ${chatFiles.length} chat files to process.`);
            
            const batchSize = this.config.batchSize || 10;
            const batches = this.createBatches(chatFiles, batchSize);

            for (let i = 0; i < batches.length; i++) {
                logger.info(`🔄 Processing batch ${i + 1}/${batches.length}`);
                await this.processBatch(batches[i], options);
            }
            
            const report = await this.generateReport();
            await this.saveReport(report);
            
            logger.info('✅ Chat auto-filing completed!');
            return report;
            
        } catch (error) {
            logger.error('❌ Chat processing failed during initial run.', { error });
            throw error;
        }
    }

    async processBatch(files, options) {
        for (const file of files) {
            try {
                await this.processChat(file, options);
            } catch (error) {
                this.stats.errors++;
                logger.error(`❌ Error processing ${file.name}.`, { error: error.message });
            }
        }
    }

    async processChat(file, options) {
        if (this.processedInSession.has(file.path)) {
            logger.debug(`Skipping already processed file: ${file.name}`);
            return;
        }

        const content = await chatParser.parseChat(file.path);
        const classification = await chatClassifier.classifyChat(content);
        const archivePath = await chatArchiver.archiveChat(file, classification);
        
        await searchEngine.indexChat(content, classification, archivePath);
        
        this.stats.processed++;
        const count = this.stats.categories.get(classification.category) || 0;
        this.stats.categories.set(classification.category, count + 1);
        this.processedInSession.add(file.path);
        
        logger.info(`💬 Filed: "${file.name}" -> ${classification.category}`);
    }

    async watchChatDirectory() {
        const watcher = chokidar.watch(this.config.paths.chatDirectory, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            ignoreInitial: true, // Don't fire 'add' for existing files
        });

        watcher.on('add', async (filePath) => {
            if (this.isSupportedFormat(filePath)) {
                logger.info(`👁️ New chat detected: ${path.basename(filePath)}`);
                await this.processChat({ path: filePath, name: path.basename(filePath) });
            }
        });

        logger.info('👁️ Chat directory monitoring active.');
        return watcher;
    }

    isSupportedFormat(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const supported = this.config.supportedFormats || ['.json', '.txt', '.md'];
        return supported.includes(ext);
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
            categoryBreakdown: Array.from(this.stats.categories.entries())
                .sort(([,a], [,b]) => b - a)
                .map(([category, count]) => ({ category, count }))
        };
    }

    async saveReport(report) {
        const reportPath = path.join(process.cwd(), 'reports', 'chat_filing_report.json');
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        logger.info(`📊 Report saved: ${reportPath}`);
    }
}

module.exports = ChatAutoFiler;