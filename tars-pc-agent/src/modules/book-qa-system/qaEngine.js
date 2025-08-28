const tarsClient = require('../../shared/tarsClient');
const logger = require('../../shared/logger');

/**
 * @class QAEngine
 * @description Generates answers to questions based on a provided context of text chunks using an AI model.
 */
class QAEngine {
    /**
     * Generates a comprehensive, sourced answer to a question using provided text chunks.
     * @param {string} question - The user's question.
     * @param {Array<object>} chunks - An array of relevant chunk objects from the Retriever.
     * @param {object} [options={}] - Generation options.
     * @returns {Promise<object>} A promise that resolves to a structured answer object.
     */
    async generateAnswer(question, chunks, options = {}) {
        if (!chunks || chunks.length === 0) {
            return this._getNoContextResponse();
        }

        try {
            const context = this._buildContext(chunks, options.maxContextLength || 4000);
            const prompt = this._createPrompt(question, context);

            // Call the actual AI service
            const aiResponse = await tarsClient.generate(prompt, { format: 'json' });

            if (!aiResponse || !aiResponse.answer) {
                logger.warn('AI response was malformed or empty.', { response: aiResponse });
                return this._getNoContextResponse("The AI failed to generate a valid answer from the context.");
            }

            return this._formatFinalResponse(aiResponse, chunks);

        } catch (error) {
            logger.error('An error occurred during QA generation.', { error });
            return this._getNoContextResponse("An internal error occurred while generating the answer.");
        }
    }

    /**
     * Creates the prompt for the AI model, instructing it to provide a structured JSON response.
     * @private
     */
    _createPrompt(question, context) {
        return `
            You are an expert academic assistant. Your task is to answer the user's question based *only* on the provided text excerpts.

            Here is the user's question:
            "${question}"

            Here are the relevant excerpts from the book:
            ---
            ${context}
            ---

            Instructions:
            1.  Carefully read the question and all excerpts.
            2.  Formulate a concise answer using only information from the provided excerpts.
            3.  Do not use any outside knowledge. If the answer is not in the excerpts, state that clearly.
            4.  Identify which excerpts you used to formulate your answer.
            5.  Respond with a single, valid JSON object in the following format, and nothing else:
            {
              "answer": "<Your generated answer>",
              "confidence": "<A score from 0 to 100 indicating your confidence that the answer is fully supported by the excerpts>",
              "answerType": "<Classify your answer as 'definition', 'explanation', 'analysis', or 'summary'>",
              "usedExcerpts": [<An array of integer numbers corresponding to the excerpts you used, e.g., [1, 3]>]
            }
        `;
    }

    /**
     * Builds the context string from an array of chunks to be injected into the prompt.
     * @private
     */
    _buildContext(chunks, maxLength) {
        let context = '';
        // Assumes chunks are pre-sorted by relevance
        for (let i = 0; i < chunks.length; i++) {
            const chunkText = `[Excerpt ${i + 1}] Source: ${path.basename(chunks[i].source)}\n${chunks[i].text.trim()}\n\n`;
            if (context.length + chunkText.length > maxLength) {
                break;
            }
            context += chunkText;
        }
        return context;
    }

    /**
     * Formats the raw AI response into the final, user-facing answer object with full source details.
     * @private
     */
    _formatFinalResponse(aiResponse, originalChunks) {
        const usedChunkIds = new Set(aiResponse.usedExcerpts || []);
        
        const sources = Array.from(usedChunkIds)
            .map(excerptNum => {
                const chunk = originalChunks[excerptNum - 1]; // -1 to convert to 0-based index
                if (!chunk) return null;
                return {
                    chunkId: chunk.chunkId,
                    sourceFile: path.basename(chunk.source),
                    textSnippet: chunk.text.substring(0, 150) + '...',
                    semanticScore: chunk.semanticScore,
                };
            })
            .filter(Boolean); // Remove any nulls if excerpt number was invalid

        return {
            text: aiResponse.answer,
            confidence: aiResponse.confidence || 0,
            answerType: aiResponse.answerType || 'unknown',
            sources: sources,
        };
    }

    /**
     * Returns a standardized response for when an answer cannot be generated.
     * @private
     */
    _getNoContextResponse(message = "I'm unable to find an answer to your question in the provided documents.") {
        return {
            text: message,
            confidence: 0,
            answerType: 'no_answer',
            sources: [],
        };
    }
}

module.exports = QAEngine;