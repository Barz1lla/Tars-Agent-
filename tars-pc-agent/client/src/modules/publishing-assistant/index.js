const OutreachEngine = require('./outreachEngine');
const SocialManager = require('./socialManager');
const CampaignTracker = require('./campaignTracker');
const logger = require('../../shared/logger').module('PublishingAssistant');
const path = require('path');

class PublishingAssistant {
    constructor(config, tarsClient) {
        this.config = config;
        this.tarsClient = tarsClient;
        this.enabled = config.modules?.publishing_assistant?.enabled ?? false;
        this.outreachEngine = new OutreachEngine(config);
        this.socialManager = new SocialManager();
        this.campaignTracker = new CampaignTracker(config);
        logger.info('PublishingAssistant initialized');
    }

    async initialize() {
        logger.info('🚀 Initializing Publishing Assistant...');
        await this.outreachEngine.initialize();
        logger.info('✅ Publishing Assistant initialized successfully.');
    }

    /**
     * Outreach: Generate a professional query letter for a book.
     * @param {object} data - { title, genre, author }
     * @returns {Promise<object>}
     */
    async outreach(data) {
        if (!this.enabled) throw new Error('Publishing Assistant is disabled');
        if (!data || !data.title || !data.genre || !data.author) throw new Error('Missing book data');
        logger.info(`Generating query letter for "${data.title}" (${data.genre})`);
        const query = await this.tarsClient.generateContent('query-letter', {
            title: data.title,
            genre: data.genre,
            author: data.author
        });
        return { query: query.text, provider: query.provider };
    }

    async launchFullCampaign(bookInfo, options = {}) {
        const { targetCount = 5, socialDuration = 7, dryRun = false } = options;
        if (!this.enabled) throw new Error('Publishing Assistant is disabled');
        logger.info(`🚀 Launching full campaign for: "${bookInfo.title}"...`);

        const targets = await this.outreachEngine.findAndValidateTargets(bookInfo.genre, targetCount);
        if (targets.length === 0) {
            throw new Error('Could not find any valid publisher targets.');
        }
        logger.info(`🎯 Found ${targets.length} validated publisher targets.`);

        const campaign = dryRun
            ? { id: 'dry-run-campaign' }
            : await this.campaignTracker.startCampaign(bookInfo);

        const outreachSummary = await this.outreachEngine.runCampaign(bookInfo, targets, { dryRun });

        const socialPosts = await this.socialManager.generateCampaign(bookInfo, { duration: socialDuration });
        for (const post of socialPosts) {
            if (!dryRun) {
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

    async getCampaignReport(campaignId) {
        return this.campaignTracker.generateReport(campaignId);
    }

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

