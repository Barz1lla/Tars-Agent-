const fs = require('fs').promises;
const path = require('path');
const tarsClient = require('../../shared/tarsClient');
const logger = require('../../shared/logger');

class CampaignTracker {
    constructor(config = {}) {
        this.campaignsDir = config.campaignsDir || path.join(process.cwd(), 'data', 'campaigns');
        this.campaigns = new Map();
    }

    /**
     * Initializes the tracker by loading all campaign files from the campaigns directory.
     */
    async initialize() {
        await fs.mkdir(this.campaignsDir, { recursive: true });
        const files = await fs.readdir(this.campaignsDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const campaignId = path.basename(file, '.json');
                const campaign = await this._loadCampaign(campaignId);
                if (campaign) {
                    this.campaigns.set(campaignId, campaign);
                }
            }
        }
        logger.info(`📈 Campaign tracker initialized with ${this.campaigns.size} campaigns.`);
    }

    /**
     * Starts a new campaign and creates its dedicated tracking file.
     * @param {object} campaignData - Data for the new campaign (e.g., bookTitle).
     * @returns {Promise<object>} The newly created campaign object.
     */
    async startCampaign(campaignData) {
        const campaignId = `campaign_${Date.now()}`;
        const campaign = {
            id: campaignId,
            bookTitle: campaignData.bookTitle,
            genre: campaignData.genre,
            startDate: new Date().toISOString(),
            status: 'active',
            events: [{ type: 'start', date: new Date().toISOString(), details: 'Campaign created.' }],
            submissions: {}, // Use an object for easy lookup
        };

        this.campaigns.set(campaignId, campaign);
        await this._saveCampaign(campaignId);
        logger.info(`🎯 Campaign started: ${campaign.bookTitle} (ID: ${campaignId})`);
        return campaign;
    }

    /**
     * Logs that a query has been sent to a publisher.
     * @param {string} campaignId - The ID of the campaign.
     * @param {string} publisherName - The name of the publisher.
     */
    async logSubmission(campaignId, publisherName) {
        const campaign = this.campaigns.get(campaignId);
        if (!campaign) return;

        campaign.submissions[publisherName] = { status: 'pending', submissionDate: new Date().toISOString() };
        campaign.events.push({ type: 'submission', date: new Date().toISOString(), details: `Query sent to ${publisherName}.` });
        
        await this._saveCampaign(campaignId);
    }

    /**
     * Logs a response from a publisher and calculates the response time.
     * @param {string} campaignId - The ID of the campaign.
     * @param {string} publisherName - The name of the publisher who responded.
     * @param {string} outcome - The result (e.g., 'accepted', 'rejected', 'request_for_manuscript').
     */
    async logResponse(campaignId, publisherName, outcome) {
        const campaign = this.campaigns.get(campaignId);
        if (!campaign || !campaign.submissions[publisherName]) return;

        const submission = campaign.submissions[publisherName];
        submission.status = outcome;
        submission.responseDate = new Date().toISOString();
        
        const start = new Date(submission.submissionDate);
        const end = new Date(submission.responseDate);
        submission.responseTimeDays = Math.round((end - start) / (1000 * 60 * 60 * 24));

        campaign.events.push({ type: 'response', date: new Date().toISOString(), details: `Response from ${publisherName}: ${outcome}.` });
        
        await this._saveCampaign(campaignId);
    }

    /**
     * Generates a report with stats and AI-powered recommendations.
     * @param {string} campaignId - The ID of the campaign to report on.
     * @returns {Promise<object|null>} The full report object.
     */
    async generateReport(campaignId) {
        const campaign = this.campaigns.get(campaignId);
        if (!campaign) return null;

        const stats = this.getCampaignStats(campaign);
        const prompt = this._createReportPrompt(stats);

        try {
            const aiAnalysis = await tarsClient.generate(prompt, { format: 'json' });
            return { ...stats, ...aiAnalysis };
        } catch (error) {
            logger.error('AI report generation failed.', { error });
            return { ...stats, recommendations: ['AI analysis failed.'], nextSteps: [] };
        }
    }

    /**
     * Generates a dynamic timeline of all events that have occurred in the campaign.
     * @param {object} campaign - The campaign object.
     * @returns {Array<object>} A sorted list of timeline events.
     */
    generateTimeline(campaign) {
        return campaign.events.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    getCampaignStats(campaign) {
        const submissions = Object.values(campaign.submissions);
        const responses = submissions.filter(s => s.status !== 'pending');
        const positiveResponses = responses.filter(s => s.status === 'accepted' || s.status === 'request_for_manuscript');
        
        const responseRate = submissions.length > 0 ? (responses.length / submissions.length) * 100 : 0;
        const positiveRate = responses.length > 0 ? (positiveResponses.length / responses.length) * 100 : 0;

        const responseTimes = responses.map(s => s.responseTimeDays).filter(d => d !== undefined);
        const avgResponseTime = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

        return {
            id: campaign.id,
            bookTitle: campaign.bookTitle,
            status: campaign.status,
            summary: {
                daysRunning: Math.round((new Date() - new Date(campaign.startDate)) / (1000 * 60 * 60 * 24)),
                submissionsSent: submissions.length,
                responsesReceived: responses.length,
                responseRate: Math.round(responseRate),
                positiveResponseRate: Math.round(positiveRate),
                averageResponseTimeDays: Math.round(avgResponseTime),
            },
            timeline: this.generateTimeline(campaign)
        };
    }

    async _loadCampaign(campaignId) {
        try {
            const data = await fs.readFile(path.join(this.campaignsDir, `${campaignId}.json`), 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.warn(`Could not load campaign ${campaignId}.`, { error: error.message });
            return null;
        }
    }

    async _saveCampaign(campaignId) {
        const campaign = this.campaigns.get(campaignId);
        if (!campaign) return;
        await fs.writeFile(path.join(this.campaignsDir, `${campaignId}.json`), JSON.stringify(campaign, null, 2));
    }

    _createReportPrompt(stats) {
        return `
            You are a publishing strategy expert. Analyze the following campaign performance data and provide actionable advice.

            **Campaign Data:**
            - Days Running: ${stats.summary.daysRunning}
            - Submissions Sent: ${stats.summary.submissionsSent}
            - Response Rate: ${stats.summary.responseRate}%
            - Positive Response Rate (accepted/request): ${stats.summary.positiveResponseRate}%
            - Average Response Time: ${stats.summary.averageResponseTimeDays} days

            **Instructions:**
            1.  Based on the data, generate 2-3 specific, actionable recommendations.
            2.  Suggest 2-3 concrete next steps for the user to take.
            3.  Keep the tone encouraging but realistic.

            Respond ONLY with a single, valid JSON object in the following format:
            {
              "recommendations": ["A list of specific recommendations based on the data."],
              "nextSteps": ["A list of concrete next steps for the campaign."]
            }
         `;
    }
}

module.exports = CampaignTracker;