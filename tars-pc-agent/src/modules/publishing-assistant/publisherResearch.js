const fs = require('fs').promises;
const path = require('path');
const tarsClient = require('../../shared/tarsClient');
const logger = require('../../shared/logger');

class PublisherResearch {
    constructor(config) {
        this.config = config || {};
        this.publishersPath = this.config.publishersDbPath || path.join(process.cwd(), 'data', 'publishers.json');
        this.publishers = new Map();
    }

    /**
     * Initializes the module by loading the publisher database from disk.
     */
    async initialize() {
        try {
            const data = await fs.readFile(this.publishersPath, 'utf8');
            const publishers = JSON.parse(data);
            publishers.forEach(p => this.publishers.set(p.name.toLowerCase(), p));
            logger.info(`📚 Loaded ${this.publishers.size} publishers from database.`);
        } catch (error) {
            logger.warn('Publisher database not found or invalid. Starting with an empty database.', { error: error.message });
            this.publishers = new Map();
        }
    }

    /**
     * Finds relevant publishers from the existing database based on genre.
     * @param {object} [options={}] - Search options.
     * @param {string} [options.genre] - The genre to filter by.
     * @param {number} [options.targetCount=10] - The max number of publishers to return.
     * @returns {Array<object>} A list of matching publishers.
     */
    findRelevantPublishers(options = {}) {
        const { genre, targetCount = 10 } = options;
        let relevant = Array.from(this.publishers.values());
        
        if (genre) {
            const lowerGenre = genre.toLowerCase();
            relevant = relevant.filter(p => 
                p.genres.some(g => g.toLowerCase().includes(lowerGenre))
            );
        }
        
        return relevant.slice(0, targetCount);
    }

    /**
     * Uses an AI model to research new, unlisted publishers for a given genre.
     * @param {string} genre - The genre to research.
     * @returns {Promise<Array<object>>} A promise that resolves to a list of newly found publishers.
     */
    async researchNewPublishers(genre) {
        const prompt = `
            Research 3-5 reputable book publishers that specialize in the "${genre}" genre and are currently open to submissions.
            Exclude major publishers like Penguin Random House, HarperCollins, Simon & Schuster, etc. Focus on independent or mid-sized presses.

            For each publisher, provide the following information. Respond ONLY with a single, valid JSON array of objects:
            [
              {
                "name": "Publisher Name",
                "genres": ["${genre}", "Other Genre"],
                "submissionGuidelines": "A brief summary of their submission process (e.g., 'Query letter + first 3 chapters via online form').",
                "website": "https://publisher-website.com/submissions",
                "notes": "Any other relevant notes, like if they are known for debut authors."
              }
            ]
        `;
        try {
            const result = await tarsClient.generate(prompt, { format: 'json' });
            return Array.isArray(result) ? result : [];
        } catch (error) {
            logger.error('AI publisher research failed.', { error });
            return [];
        }
    }

    /**
     * Uses an AI model to validate a publisher's website for legitimacy.
     * @param {object} publisher - The publisher object containing a 'website' property.
     * @returns {Promise<object>} A validation result object.
     */
    async validatePublisher(publisher) {
        const prompt = `
            Analyze the publisher website "${publisher.website}" for legitimacy and professionalism.
            Check for red flags like charging authors fees, having no clear submission guidelines, or a non-functional website.
            
            Respond ONLY with a single, valid JSON object:
            {
              "isValid": <true or false>,
              "confidence": <A score from 0-100 for your assessment>,
              "notes": "<A brief summary of your findings, mentioning any red flags or positive signs.>"
            }
        `;
        try {
            const result = await tarsClient.generate(prompt, { format: 'json' });
            return result && typeof result.isValid === 'boolean' ? result : { isValid: false, confidence: 0, notes: 'AI validation failed.' };
        } catch (error) {
            logger.error(`AI validation failed for ${publisher.name}`, { error });
            return { isValid: false, confidence: 0, notes: 'An error occurred during validation.' };
        }
    }

    /**
     * Adds a new publisher to the in-memory database.
     * @param {object} publisher - The publisher object to add.
     */
    addPublisher(publisher) {
        if (!publisher || !publisher.name) return;
        this.publishers.set(publisher.name.toLowerCase(), publisher);
        logger.info(`Added/updated publisher: ${publisher.name}`);
    }

    /**
     * Saves the current in-memory publisher list back to the JSON file.
     */
    async savePublishers() {
        const publisherList = Array.from(this.publishers.values());
        await fs.writeFile(this.publishersPath, JSON.stringify(publisherList, null, 2));
        logger.info(`💾 Saved ${publisherList.length} publishers to database.`);
    }

    /**
     * Calculates statistics about the current publisher database.
     */
    getPublisherStats() {
        const genreMap = {};
        this.publishers.forEach(p => {
            p.genres.forEach(genre => {
                genreMap[genre] = (genreMap[genre] || 0) + 1;
            });
        });

        return {
            total: this.publishers.size,
            byGenre: genreMap,
            averageResponseWeeks: this.analyzeResponseTimes()
        };
    }

    /**
     * Parses response time strings (e.g., "4-6 weeks") and calculates a numerical average.
     * @returns {number|null} The average response time in weeks, or null if not enough data.
     */
    analyzeResponseTimes() {
        const weekValues = [];
        this.publishers.forEach(p => {
            if (!p.responseTime) return;
            const matches = p.responseTime.match(/(\d+)-(\d+)\s+weeks/);
            if (matches) {
                const avg = (parseInt(matches[1]) + parseInt(matches[2])) / 2;
                weekValues.push(avg);
            }
        });

        if (weekValues.length === 0) return null;
        const sum = weekValues.reduce((a, b) => a + b, 0);
        return Math.round((sum / weekValues.length) * 10) / 10; // Return average rounded to one decimal
    }
}

module.exports = PublisherResearch;