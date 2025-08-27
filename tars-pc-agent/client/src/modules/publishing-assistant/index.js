const OutreachEngine = require('./outreachEngine');
const SocialManager = require('./socialManager');
const CampaignTracker = require('./campaignTracker');
const logger = require('../../shared/logger');

class PublishingAssistant {
    constructor(config) {
        this.config = config;
        // Use dependency injection for a clean, testable architecture.
        this.outreachEngine = new OutreachEngine(config);
        this.socialManager = new SocialManager();
        this.campaignTracker = new CampaignTracker(config);
    }

    /**
     * Initializes the assistant and all its dependent modules.
     */
    async initialize() {
        logger.info('🚀 Initializing Publishing Assistant...');
        // The OutreachEngine's initialize method handles its own dependencies.
        await this.outreachEngine.initialize();
        logger.info('✅ Publishing Assistant initialized successfully.');
    }

    /**
     * A high-level workflow to launch a complete, multi-faceted publishing campaign.
     * @param {object} bookInfo - Detailed information about the book.
     * @param {object} [options={}] - Campaign options.
     * @param {number} [options.targetCount=5] - Number of publishers to target.
     * @param {number} [options.socialDuration=7] - Duration of the social campaign in days.
     * @param {boolean} [options.dryRun=false] - If true, generates content without logging.
     * @returns {Promise<object>} A summary of the launched campaign.
     */
    async launchFullCampaign(bookInfo, options = {}) {
        const { targetCount = 5, socialDuration = 7, dryRun = false } = options;
        logger.info(`🚀 Launching full campaign for: "${bookInfo.title}"...`);

        // 1. Find and validate potential publishers using the OutreachEngine.
        const targets = await this.outreachEngine.findAndValidateTargets(bookInfo.genre, targetCount);
        if (targets.length === 0) {
            throw new Error('Could not find any valid publisher targets.');
        }
        logger.info(`🎯 Found ${targets.length} validated publisher targets.`);

        // 2. Start a new campaign with the CampaignTracker.
        const campaign = dryRun
            ? { id: 'dry-run-campaign' }
            : await this.campaignTracker.startCampaign(bookInfo);
        
        // 3. Run the publisher outreach campaign.
        const outreachSummary = await this.outreachEngine.runCampaign(bookInfo, targets, { dryRun });

        // 4. Generate and schedule the social media campaign.
        const socialPosts = await this.socialManager.generateCampaign(bookInfo, { duration: socialDuration });
        for (const post of socialPosts) {
            if (!dryRun) {
                // In a real app, this would log to the tracker.
                // await this.campaignTracker.logSocialPost(campaign.id, post);
            }
        }
        logger.info(`📱 Generated ${socialPosts.length} social media posts.`);

        const finalReport = dryRun
            ? { summary: 'Dry run complete. No report generated.' }
            : await this.campaignTracker.generateReport(campaign.id);

        return {
            campaignId: campaign.id,
            status: dryRun ? 'Dry Run Completed' : 'Campaign Launched',
            outreach: outreachSummary,
            social: { postCount: socialPosts.length },
            report: finalReport
        };
    }

    /**
     * Retrieves the status and report for a specific campaign from the tracker.
     * @param {string} campaignId - The ID of the campaign to get.
     * @returns {Promise<object|null>} The campaign report.
     */
    async getCampaignReport(campaignId) {
        return this.campaignTracker.generateReport(campaignId);
    }

    /**
     * Lists all campaigns currently managed by the tracker.
     * @returns {Array<object>} A list of campaign summary objects.
     */
    listCampaigns() {
        return Array.from(this.campaignTracker.campaigns.values()).map(c => ({
            id: c.id,
            bookTitle: c.bookTitle,
            status: c.status,
            startDate: c.startDate,
            submissions: Object.keys(c.submissions).length
        }));
    }
}

module.exports = PublishingAssistant;

