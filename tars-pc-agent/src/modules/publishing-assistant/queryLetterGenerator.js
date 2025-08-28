const tarsClient = require('../../shared/tarsClient');
const logger = require('../../shared/logger');

class QueryLetterGenerator {
    /**
     * Generates a complete, personalized query letter using an AI model.
     * @param {object} bookInfo - Detailed information about the book.
     * @param {object} publisher - Information about the target publisher.
     * @returns {Promise<object>} A promise that resolves to a structured letter object.
     */
    async generateQueryLetter(bookInfo, publisher) {
        try {
            const prompt = this._createMainPrompt(bookInfo, publisher);
            const result = await tarsClient.generate(prompt, { format: 'json' });

            if (result && result.subject && result.body) {
                return result;
            }
            
            logger.warn('AI query letter generation returned a malformed response.', { response: result });
            return this._getFallbackLetter(bookInfo, publisher);

        } catch (error) {
            logger.error('AI query letter generation failed.', { error });
            return this._getFallbackLetter(bookInfo, publisher);
        }
    }

    /**
     * Generates a polite and professional follow-up letter using an AI model.
     * @param {string} originalSubject - The subject line of the original query.
     * @param {string} authorName - The name of the author.
     * @param {string} publisherName - The name of the publisher.
     * @returns {Promise<object>} A promise that resolves to a structured follow-up letter object.
     */
    async generateFollowUpLetter(originalSubject, authorName, publisherName) {
        const prompt = `
            Write a brief, polite, and professional follow-up email for a book query.
            The original query subject was: "${originalSubject}"
            The publisher is: ${publisherName}
            The author's name is: ${authorName}

            Keep it concise (under 100 words). Do not re-pitch the book.
            Simply state that you are following up and are still interested.

            Respond ONLY with a single, valid JSON object:
            {
              "subject": "Follow-up: Query: [Book Title]",
              "body": "The full text of the follow-up email."
            }
        `;
        try {
            return await tarsClient.generate(prompt, { format: 'json' });
        } catch (error) {
            logger.error('AI follow-up letter generation failed.', { error });
            return { subject: `Follow-up: ${originalSubject}`, body: 'Error generating follow-up.' };
        }
    }

    /**
     * Private helper to construct the main AI prompt.
     * @private
     */
    _createMainPrompt(bookInfo, publisher) {
        return `
            You are an expert literary agent. Write a compelling and professional query letter.

            **Instructions:**
            1.  Create a personalized opening that references the publisher's interest in specific genres.
            2.  Write a captivating hook.
            3.  Seamlessly integrate the book description, author bio, and market analysis.
            4.  Maintain a professional and confident tone.
            5.  The final letter should be between 300 and 400 words.

            **Book Information:**
            - Title: ${bookInfo.bookTitle}
            - Genre: ${bookInfo.genre}
            - Word Count: ${bookInfo.wordCount}
            - Description: ${bookInfo.description}
            - Unique Points: ${bookInfo.uniquePoints.join(', ')}
            - Author Bio: ${bookInfo.authorBio}
            - Market Analysis: Target audience is ${bookInfo.targetAudience}. Comparable to ${bookInfo.comparableTitles.join(' and ')}.

            **Publisher Information:**
            - Name: ${publisher.name}
            - Known for these genres: ${publisher.genres.join(', ')}

            **Author Contact:**
            - Name: ${bookInfo.authorName}
            - Email: ${bookInfo.authorEmail}
            - Website: ${bookInfo.authorWebsite}

            Respond ONLY with a single, valid JSON object in the following format:
            {
              "subject": "Query: [Book Title] - A [Genre] Novel",
              "body": "The full, formatted text of the query letter.",
              "attachments": ["Synopsis", "First Three Chapters"]
            }
        `;
    }

    /**
     * Private helper to generate a simple fallback letter if the AI fails.
     * @private
     */
    _getFallbackLetter(bookInfo, publisher) {
        return {
            subject: `Query: ${bookInfo.bookTitle}`,
            body: `Dear ${publisher.name},\n\nI am seeking representation for my ${bookInfo.genre} book, "${bookInfo.bookTitle}".\n\nThe manuscript is complete at ${bookInfo.wordCount} words and is available for your review.\n\nSincerely,\n${bookInfo.authorName}`,
            attachments: []
        };
    }
}

module.exports = new QueryLetterGenerator();