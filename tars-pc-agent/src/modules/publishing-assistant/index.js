const logger = require('../../shared/logger').module('PublishingAssistant');
const fs = require('fs-extra');
const path = require('path');

class PublishingAssistant {
    constructor(config, tarsClient) {
        this.config = config;
        this.tarsClient = tarsClient;
        this.enabled = config.modules?.publishing_assistant?.enabled || false;
        this.automateOutreach = config.modules?.publishing_assistant?.automateOutreach || false;
        this.trackResponses = config.modules?.publishing_assistant?.trackResponses || true;
        this.outputDir = path.join(config.paths?.outputDirectory || './data/output', 'publishing');
        
        // Publishing configuration
        this.defaultPublishers = config.publishing?.defaultPublishers || 10;
        this.followUpDays = config.publishing?.followUpDays || 14;
        this.socialPlatforms = config.publishing?.socialPlatforms || ['twitter', 'linkedin', 'facebook'];
        
        // Ensure directories exist
        fs.ensureDirSync(this.outputDir);
        fs.ensureDirSync(path.join(this.outputDir, 'query-letters'));
        fs.ensureDirSync(path.join(this.outputDir, 'social-content'));
        fs.ensureDirSync(path.join(this.outputDir, 'campaigns'));
        
        logger.info('PublishingAssistant initialized');
    }

    async outreach(data) {
        if (!this.enabled) {
            throw new Error('Publishing Assistant is disabled');
        }

        try {
            const { bookTitle, genre, description, author, publisherName } = data;
            
            if (!bookTitle || !genre) {
                throw new Error('Book title and genre are required');
            }

            logger.info(`Creating outreach materials for: ${bookTitle}`);

            // Generate query letter
            const queryLetter = await this.generateQueryLetter({
                title: bookTitle,
                genre,
                description: description || '',
                author: author || 'Author',
                publisher: publisherName || 'Publisher'
            });

            // Save query letter
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${bookTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;
            
            await this.saveQueryLetter(filename, queryLetter, data);

            logger.info('Outreach materials generated successfully');

            return {
                queryLetter: queryLetter.content,
                filename,
                provider: queryLetter.provider,
                saved: true
            };

        } catch (error) {
            logger.error('Outreach generation failed:', error.message);
            throw error;
        }
    }

    async generateQueryLetter(context) {
        try {
            const result = await this.tarsClient.generateContent('query-letter', context);
            
            return {
                content: result.text,
                provider: result.provider,
                usage: result.usage,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Failed to generate query letter: ${error.message}`);
        }
    }

    async generateSocialContent(bookTitle, genre, platform = 'twitter') {
        try {
            const characterLimits = {
                twitter: 280,
                linkedin: 3000,
                facebook: 2000,
                instagram: 2200
            };

            const context = {
                title: bookTitle,
                genre,
                platform,
                characterLimit: characterLimits[platform] || 280
            };

            const result = await this.tarsClient.generateContent('social-post', context);

            return {
                content: result.text,
                platform,
                characterLimit: characterLimits[platform],
                provider: result.provider,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Failed to generate social content: ${error.message}`);
        }
    }

    async createFullCampaign(data) {
        try {
            const { bookTitle, genre, description, author } = data;
            
            logger.info(`Creating full marketing campaign for: ${bookTitle}`);

            const campaign = {
                bookDetails: { bookTitle, genre, description, author },
                createdAt: new Date().toISOString(),
                materials: {}
            };

            // Generate query letter
            campaign.materials.queryLetter = await this.generateQueryLetter({
                title: bookTitle,
                genre,
                description,
                author
            });

            // Generate social media content for all platforms
            campaign.materials.socialContent = {};
            for (const platform of this.socialPlatforms) {
                try {
                    campaign.materials.socialContent[platform] = await this.generateSocialContent(
                        bookTitle, genre, platform
                    );
                } catch (error) {
                    logger.warn(`Failed to generate ${platform} content:`, error.message);
                }
            }

            // Generate marketing strategy
            campaign.materials.strategy = await this.generateMarketingStrategy(data);

            // Generate publisher list
            campaign.materials.publishers = await this.generatePublisherList(genre);

            // Save campaign
            await this.saveCampaign(bookTitle, campaign);

            logger.info('Full campaign created successfully');

            return campaign;

        } catch (error) {
            logger.error('Campaign creation failed:', error.message);
            throw error;
        }
    }

    async generateMarketingStrategy(bookData) {
        try {
            const prompt = `Create a comprehensive marketing strategy for the book "${bookData.bookTitle}" 
            in the ${bookData.genre} genre. Include:
            1. Target audience analysis
            2. Key selling points
            3. Marketing timeline (pre-launch, launch, post-launch)
            4. Platform-specific strategies
            5. Budget considerations
            
            Book description: ${bookData.description || 'Not provided'}`;

            const result = await this.tarsClient.callModel('auto', prompt, '');

            return {
                content: result.text,
                provider: result.provider,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Failed to generate marketing strategy: ${error.message}`);
        }
    }

    async generatePublisherList(genre) {
        try {
            const prompt = `Generate a list of ${this.defaultPublishers} potential publishers for a ${genre} book. 
            Include publisher names, their focus areas, submission guidelines, and contact preferences. 
            Format as a structured list.`;

            const result = await this.tarsClient.callModel('auto', prompt, '');

            return {
                content: result.text,
                provider: result.provider,
                genre,
                count: this.defaultPublishers,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Failed to generate publisher list: ${error.message}`);
        }
    }

    async saveQueryLetter(filename, queryLetter, originalData) {
        try {
            const letterPath = path.join(this.outputDir, 'query-letters', `${filename}.md`);
            
            const content = `# Query Letter for "${originalData.bookTitle}"

**Generated:** ${queryLetter.generatedAt}
**Provider:** ${queryLetter.provider}
**Genre:** ${originalData.genre}
**Author:** ${originalData.author || 'Author'}

---

${queryLetter.content}

---

**Original Request:**
- Title: ${originalData.bookTitle}
- Genre: ${originalData.genre}
- Description: ${originalData.description || 'Not provided'}
- Target Publisher: ${originalData.publisherName || 'General'}
`;

            await fs.writeFile(letterPath, content, 'utf8');
            
            // Also save metadata
            const metaPath = path.join(this.outputDir, 'query-letters', `${filename}.meta.json`);
            await fs.writeJson(metaPath, {
                ...originalData,
                queryLetter,
                filename,
                savedAt: new Date().toISOString()
            }, { spaces: 2 });

            logger.info(`Query letter saved: ${filename}`);

        } catch (error) {
            logger.warn('Failed to save query letter:', error.message);
        }
    }

    async saveCampaign(bookTitle, campaign) {
        try {
            const sanitizedTitle = bookTitle.replace(/[^a-zA-Z0-9]/g, '_');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${sanitizedTitle}_campaign_${timestamp}`;
            
            const campaignPath = path.join(this.outputDir, 'campaigns', `${filename}.json`);
            await fs.writeJson(campaignPath, campaign, { spaces: 2 });

            // Create summary document
            const summaryPath = path.join(this.outputDir, 'campaigns', `${filename}_summary.md`);
            const summaryContent = this.createCampaignSummary(campaign);
            await fs.writeFile(summaryPath, summaryContent, 'utf8');

            logger.info(`Campaign saved: ${filename}`);

        } catch (error) {
            logger.warn('Failed to save campaign:', error.message);
        }
    }

    createCampaignSummary(campaign) {
        const { bookDetails, materials } = campaign;
        
        return `# Marketing Campaign: "${bookDetails.bookTitle}"

**Created:** ${campaign.createdAt}
**Genre:** ${bookDetails.genre}
**Author:** ${bookDetails.author}

## Campaign Materials

### Query Letter
${materials.queryLetter ? '✅ Generated' : '❌ Failed'}
Provider: ${materials.queryLetter?.provider || 'N/A'}

### Social Media Content
${Object.keys(materials.socialContent || {}).map(platform => 
    `- **${platform.toUpperCase()}**: ${materials.socialContent[platform] ? '✅ Generated' : '❌ Failed'}`
).join('\
')}

### Marketing Strategy
${materials.strategy ? '✅ Generated' : '❌ Failed'}

### Publisher List
${materials.publishers ? '✅ Generated' : '❌ Failed'}

---

## Next Steps
1. Review and customize query letter
2. Research and verify publisher contacts
3. Schedule social media posts
4. Implement marketing strategy phases
5. Track responses and follow up after ${this.followUpDays} days

## Notes
- All materials are AI-generated and should be reviewed
- Customize content based on specific publisher requirements
- Track all submissions and responses for analytics
`;
    }

    async getCampaignList() {
        try {
            const campaignsDir = path.join(this.outputDir, 'campaigns');
            const files = await fs.readdir(campaignsDir);
            
            const campaigns = [];
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const campaignPath = path.join(campaignsDir, file);
                        const campaign = await fs.readJson(campaignPath);
                        campaigns.push({
                            filename: file,
                            bookTitle: campaign.bookDetails?.bookTitle,
                            genre: campaign.bookDetails?.genre,
                            createdAt: campaign.createdAt,
                            materialsCount: Object.keys(campaign.materials || {}).length
                        });
                    } catch (error) {
                        logger.warn(`Failed to load campaign ${file}:`, error.message);
                    }
                }
            }

            return campaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        } catch (error) {
            logger.error('Failed to get campaign list:', error.message);
            throw error;
        }
    }

    async getStats() {
        try {
            const stats = {
                totalQueryLetters: 0,
                totalCampaigns: 0,
                recentActivity: []
            };

            // Count query letters
            const lettersDir = path.join(this.outputDir, 'query-letters');
            if (await fs.pathExists(lettersDir)) {
                const letterFiles = await fs.readdir(lettersDir);
                stats.totalQueryLetters = letterFiles.filter(f => f.endsWith('.md')).length;
            }

            // Get campaign stats
            const campaigns = await this.getCampaignList();
            stats.totalCampaigns = campaigns.length;
            stats.recentActivity = campaigns.slice(0, 5);

            return stats;

        } catch (error) {
            logger.error('Failed to get stats:', error.message);
            throw error;
        }
    }

    getStatus() {
        return {
            enabled: this.enabled,
            automateOutreach: this.automateOutreach,
            trackResponses: this.trackResponses,
            defaultPublishers: this.defaultPublishers,
            followUpDays: this.followUpDays,
            socialPlatforms: this.socialPlatforms,
            outputDir: this.outputDir,
            hasConnection: this.tarsClient ? true : false
        };
    }
}

module.exports = PublishingAssistant;