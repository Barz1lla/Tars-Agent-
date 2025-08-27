const logger = require('../../shared/logger');
const TarsClient = require('../../shared/tarsClient');
const browserController = require('./browserController');
const domObserver = require('./domObserver');
const formatter = require('./formatter');
const fs = require('fs').promises;
const path = require('path');

class ReedsyRepairAgent {
    constructor(config) {
        this.config = config;
        this.tarsClient = new TarsClient(config.models);

        // Session State
        this.isActive = false;
        this.issuesFound = [];
        this.fixesApplied = [];
        this.sessionStats = {
            startTime: null,
            issuesDetected: 0,
            issuesFixed: 0,
            emotionalPasses: 0
        };

        // Configuration Validation
        if (!this.config.reedsy?.editorUrl) {
            logger.error("Reedsy editor URL is not configured in settings.");
            throw new Error("Missing Reedsy editor URL in configuration.");
        }
        if (!this.config.reedsy?.checkInterval || typeof this.config.reedsy.checkInterval !== "number") {
            logger.error("Invalid checkInterval in Reedsy settings.");
            throw new Error("Invalid checkInterval in configuration.");
        }
    }

    /**
     * Starts a non-blocking monitoring session.
     */
    async startRepairSession(options = {}) {
        if (this.isActive) {
            logger.warn('⚠️ Monitoring session is already active.');
            return { success: false, message: 'Session already active.' };
        }

        this.isActive = true;
        this.sessionStats.startTime = new Date();
        logger.info('🚀 Starting Reedsy repair monitoring session...');
        logger.info("🧠 Emotional logic: Ensuring content clarity, resonance, and formatting consistency.");

        try {
            await this.scanDrafts();
            await browserController.initialize(this.config.reedsy.editorUrl);

            // The loop runs in the background without blocking the start method
            this.monitoringLoop(options); 

            // Handle graceful shutdown
            this.setupShutdownListener();

            return { success: true, message: 'Monitoring session started.' };
        } catch (error) {
            logger.error('❌ Failed to initialize monitoring session:', error);
            this.isActive = false;
            throw error;
        }
    }

    /**
     * The core loop that periodically checks the DOM for issues using the AI model.
     */
    async monitoringLoop(options) {
        const checkInterval = options.interval || this.config.reedsy.checkInterval;

        while (this.isActive) {
            try {
                const htmlContent = await domObserver.getCurrentDOM();
                if (!htmlContent) {
                    await this.sleep(checkInterval);
                    continue;
                }

                const analysisResult = await this.tarsClient.callModel(
                    this.tarsClient.defaultModel,
                    this.config.prompts.formatting.detectIssues,
                    htmlContent
                );
                const issues = JSON.parse(analysisResult.text);

                if (issues && issues.length > 0) {
                    logger.info(`🔍 Found ${issues.length} new issues.`);
                    this.sessionStats.issuesDetected += issues.length;
                    this.issuesFound.push(...issues.map(i => ({ ...i, timestamp: new Date().toISOString() })));

                    if (this.config.reedsy.autoFixEnabled) {
                        logger.info("Auto-fix is enabled. Applying fixes...");
                        const fixes = await this.applyFixes(issues);
                        this.sessionStats.issuesFixed += fixes.filter(f => f.success).length;
                        this.fixesApplied.push(...fixes);
                    }
                }

                await this.sleep(checkInterval);

            } catch (error) {
                logger.error('❌ An error occurred in the monitoring loop:', error);
                await this.sleep(checkInterval * 2); // Wait longer on error
            }
        }
        logger.info('Monitoring loop has ended.');
    }

    /**
     * Attempts to apply fixes for a list of detected issues.
     */
    async applyFixes(issues) {
        const fixes = [];
        for (const issue of issues) {
            try {
                const fix = await formatter.createFix(issue); // Assumes formatter can generate a script
                const result = await browserController.executeScript(fix.script);

                const fixRecord = {
                    issue: issue.type,
                    description: issue.description,
                    fix: fix.description,
                    success: result.success,
                    timestamp: new Date().toISOString()
                };
                fixes.push(fixRecord);
                logger.info(`✅ Fixed issue: ${issue.type}`);
            } catch (error) {
                const errorRecord = { issue: issue.type, success: false, error: error.message };
                fixes.push(errorRecord);
                logger.error(`❌ Failed to fix issue: ${issue.type}`, error);
            }
        }
        return fixes;
    }

    /**
     * Stops the active monitoring session, generates a report, and cleans up resources.
     */
    async stopRepairSession() {
        if (!this.isActive) {
            logger.warn('⚠️ No active monitoring session to stop.');
            return { success: false, message: 'No active session.' };
        }
        this.isActive = false;
        logger.info('🛑 Stopping monitoring session...');

        await this.sleep(100); // Allow loop to exit cleanly

        const report = this.generateSessionReport();
        await this.saveReport(report);

        await browserController.close();

        logger.info('Session stopped and resources cleaned up.');
        return report;
    }

    /**
     * Scans the local drafts directory for files.
     */
    async scanDrafts() {
        const draftsDir = path.join(__dirname, "../../../drafts");
        logger.info(`Scanning local drafts directory: ${draftsDir}`);
        try {
            const files = await fs.readdir(draftsDir);
            if (files.length === 0) {
                logger.info("No draft files found.");
            } else {
                logger.info(`Found draft files: ${files.join(", ")}`);
            }
        } catch (err) {
            if (err.code === 'ENOENT') {
                logger.warn(`Drafts directory not found at ${draftsDir}. Skipping scan.`);
            } else {
                logger.error("Error reading drafts directory:", err.message);
            }
        }
    }

    generateSessionReport() {
        const duration = this.sessionStats.startTime ? Math.round((new Date() - this.sessionStats.startTime) / 1000) : 0;
        return {
            sessionId: `session_${this.sessionStats.startTime.getTime()}`,
            startTime: this.sessionStats.startTime.toISOString(),
            durationInSeconds: duration,
            stats: this.sessionStats,
            issuesFound: this.issuesFound,
            fixesApplied: this.fixesApplied
        };
    }

    async saveReport(report) {
        try {
            const logsDir = path.join(process.cwd(), 'logs');
            await fs.mkdir(logsDir, { recursive: true });
            const reportPath = path.join(logsDir, `reedsy_repair_report_${report.sessionId}.json`);
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            logger.info(`📊 Session report saved successfully: ${reportPath}`);
        } catch (error) {
            logger.error('❌ Failed to save session report:', error);
        }
    }

    setupShutdownListener() {
        const handleShutdown = async () => {
            logger.info('Received shutdown signal (Ctrl+C).');
            if (this.isActive) {
                await this.stopRepairSession();
            }
            process.exit(0);
        };
        // Ensure we only have one listener
        process.removeAllListeners('SIGINT');
        process.on('SIGINT', handleShutdown);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// The following class definition was a duplicate and has been removed.
// The intention was to fix syntax errors by adding proper module.exports,
// which implies the duplicate class definition was a mistake.
// The original intention also implies that the first, more complete class
// definition should be the one that is exported.

module.exports = ReedsyRepairAgent;