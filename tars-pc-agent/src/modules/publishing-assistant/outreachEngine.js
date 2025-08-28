const QueryLetterGenerator = require('./queryLetterGenerator');
const PublisherResearch = require('./publisherResearch');
const CampaignTracker = require('./campaignTracker');
const logger = require('../../shared/logger');

class OutreachEngine {
    constructor(config) {
        this.config = config;
        // Use dependency injection for better testability and clarity
        this.publisherResearch = new PublisherResearch(config);
        this.queryLetterGenerator = new QueryLetterGenerator();
        this.campaignTracker = new CampaignTracker(config);
    }

    /**
     * Initializes all dependent modules.
     */
    async initialize() {
        await this.publisherResearch.initialize();
        await this.campaignTracker.initialize();
        logger.info('🚀 Outreach Engine and its dependencies are initialized.');
    }

    /**
     * Finds potential publishers, validates them, and returns a clean list of targets.
     * @param {string} genre - The genre to search for.
     * @param {number} [count=5] - The number of targets to find.
     * @returns {Promise<Array<object>>} A list of validated publisher objects.
     */
    async findAndValidateTargets(genre, count = 5) {
        const newPublishers = await this.publisherResearch.researchNewPublishers(genre);
        const validated = [];
        for (const pub of newPublishers) {
            const validation = await this.publisherResearch.validatePublisher(pub);
            if (validation.isValid) {
                validated.push({ ...pub, validation });
                if (validated.length >= count) break;
            }
        }
        return validated;
    }

    /**
     * Runs a full outreach campaign for a list of publishers.
     * @param {object} bookInfo - Detailed information about the book.
     * @param {Array<object>} publishers - A list of target publisher objects.
     * @param {object} [options={}] - Campaign options.
     * @param {boolean} [options.dryRun=false] - If true, generates content without logging/sending.
     * @returns {Promise<object>} A summary of the campaign actions.
     */
    async runCampaign(bookInfo, publishers, options = { dryRun: false }) {
        const campaign = options.dryRun
            ? { id: 'dry-run-campaign' }
            : await this.campaignTracker.startCampaign(bookInfo);

        const results = [];
        for (const publisher of publishers) {
            logger.info(`Generating outreach for ${publisher.name}...`);
            const queryLetter = await this.queryLetterGenerator.generateQueryLetter(bookInfo, publisher);
            
            if (!options.dryRun) {
                await this.campaignTracker.logSubmission(campaign.id, publisher.name);
            }
            
            results.push({ publisher: publisher.name, status: 'processed', letter: queryLetter });
        }

        return {
            campaignId: campaign.id,
            status: options.dryRun ? 'Dry Run Completed' : 'Campaign Started',
            outreachCount: results.length,
            results
        };
    }

    /**
     * Generates and logs a follow-up email for a specific submission in a campaign.
     * @param {string} campaignId - The ID of the campaign.
     * @param {string} publisherName - The name of the publisher to follow up with.
     * @param {object} bookInfo - The book information object.
     * @returns {Promise<object|null>} The generated follow-up letter.
     */
    async sendFollowUp(campaignId, publisherName, bookInfo) {
        const campaign = this.campaignTracker.campaigns.get(campaignId);
        if (!campaign || !campaign.submissions[publisherName]) {
            logger.error(`Submission for ${publisherName} not found in campaign ${campaignId}.`);
            return null;
        }

        const originalSubject = `Query: ${bookInfo.title}`; // Recreate the likely subject
        const followUpLetter = await this.queryLetterGenerator.generateFollowUpLetter(
            originalSubject,
            bookInfo.authorName,
            publisherName
        );

        // In a real app, this would log an 'email_sent' event.
        // For now, we just log a generic event to the tracker.
        await this.campaignTracker.logResponse(campaignId, publisherName, 'followed_up');
        
        logger.info(`Follow-up generated for ${publisherName} in campaign ${campaignId}.`);
        return followUpLetter;
    }
}

module.exports = OutreachEngine;