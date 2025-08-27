const tarsClient = require('../../shared/tarsClient');
const logger = require('../../shared/logger');

class SocialMediaManager {
    /**
     * Generates a complete, multi-day social media campaign using an AI model.
     * @param {object} bookInfo - Detailed information about the book.
     * @param {object} [options={}] - Campaign generation options.
     * @param {number} [options.duration=7] - The duration of the campaign in days.
     * @param {Array<string>} [options.platforms=['twitter', 'linkedin']] - The target social media platforms.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of scheduled post objects.
     */
    async generateCampaign(bookInfo, options = {}) {
        const { duration = 7, platforms = ['twitter', 'linkedin'] } = options;

        try {
            const prompt = this._createCampaignPrompt(bookInfo, duration, platforms);
            const campaignPosts = await tarsClient.generate(prompt, { format: 'json' });

            if (Array.isArray(campaignPosts)) {
                logger.info(`🤖 AI generated a ${duration}-day campaign with ${campaignPosts.length} posts.`);
                return campaignPosts;
            }

            logger.warn('AI campaign generation returned a malformed response.', { response: campaignPosts });
            return [];

        } catch (error) {
            logger.error('AI campaign generation failed.', { error });
            return [];
        }
    }

    /**
     * Simulates scheduling a post for a specific platform and date.
     * In a real application, this would integrate with a social media API.
     * @param {object} post - The post object to schedule.
     * @returns {Promise<object>} A promise that resolves to a confirmation object.
     */
    async schedulePost(post) {
        const scheduleDate = new Date();
        scheduleDate.setDate(scheduleDate.getDate() + post.day);

        logger.info(`📅 Scheduling for ${post.platform} on Day ${post.day}: "${post.content.substring(0, 40)}..."`);
        
        return {
            id: `post_${Date.now()}_${Math.random()}`,
            status: 'scheduled',
            scheduledDate: scheduleDate.toISOString(),
            ...post
        };
    }

    /**
     * Private helper to construct the main AI prompt for campaign generation.
     * @private
     */
    _createCampaignPrompt(bookInfo, duration, platforms) {
        return `
            You are an expert social media manager for book launches.
            Your task is to create a promotional campaign for a new book.

            **Book Information:**
            - Title: "${bookInfo.title}"
            - Genre: ${bookInfo.genre}
            - Hook: ${bookInfo.hook}
            - Key Insights/Themes: ${bookInfo.insights.join(', ')}

            **Campaign Requirements:**
            - Duration: ${duration} days.
            - Platforms: ${platforms.join(', ')}.
            - Create 1-2 posts per day, distributed across the specified platforms.
            - Generate a variety of content: announcements, behind-the-scenes, key insights, questions for the audience, and quotes from the book.
            - Tailor the tone for each platform: Twitter should be short and punchy (under 280 chars), LinkedIn should be professional and insightful.
            - Include 2-3 relevant hashtags for each post.

            Respond ONLY with a single, valid JSON array of post objects. Each object must have the following structure:
            [
              {
                "day": <Day number of the campaign (e.g., 1)>,
                "platform": "<The target platform (e.g., 'twitter')>",
                "content": "<The full text of the social media post>",
                "hashtags": ["#hashtag1", "#hashtag2"]
              }
            ]
        `;
    }
}

module.exports = new SocialMediaManager();