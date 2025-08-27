const logger = require('../../shared/logger');
const tarsClient = require('../../shared/tarsClient'); // Assuming a TARS client exists

/**
 * @class IssueDetector
 * @description Detects formatting and stylistic issues in HTML content using both rule-based patterns and AI analysis.
 */
class IssueDetector {
    constructor() {
        /**
         * A set of rules to detect common formatting issues using regular expressions.
         * @type {Array<object>}
         */
        this.formattingRules = [
            {
                id: 'EXCESSIVE_SPACING',
                description: 'Excessive spacing between paragraphs (3+ line breaks).',
                // Looks for 3 or more consecutive closing paragraph tags, with optional whitespace.
                pattern: /(<\/p>\s*){3,}/g,
                severity: 'medium',
                suggestion: 'Reduce to a single paragraph break for standard spacing.'
            },
            {
                id: 'MARKDOWN_BOLD',
                description: 'Markdown bold syntax (**) found, which may not render in HTML.',
                // Finds text wrapped in double asterisks.
                pattern: /\*\*([^*]+)\*\*/g,
                severity: 'medium',
                suggestion: 'Convert to <strong> HTML tags for proper bold formatting.'
            },
            {
                id: 'MARKDOWN_HEADER',
                description: 'Markdown header syntax (#) found instead of HTML tags.',
                // Finds lines starting with one to six '#' characters (markdown headers).
                pattern: /^\s*#{1,6}\s+.+/gm,
                severity: 'high',
                suggestion: 'Convert to proper <h1>-<h6> HTML tags.'
            },
            // NOTE: This rule is a heuristic and may have false positives.
            {
                id: 'STRAIGHT_QUOTES',
                description: 'Straight quotation marks (") are used instead of curly quotes (“”).',
                pattern: /"/g,
                severity: 'low',
                suggestion: 'Replace with typographic (curly) quotes for professional formatting.'
            }
        ];
    }

    /**
     * Analyzes HTML content to detect a list of issues.
     * @param {object} domState - The current state of the DOM, containing .html and .text properties.
     * @param {Array<object>} [customRules=this.formattingRules] - An optional array of rules to use.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of detected issue objects.
     */
    async detectIssues(domState, customRules = this.formattingRules) {
        if (!domState || !domState.html) {
            logger.warn('detectIssues called with invalid domState.');
            return [];
        }

        const issues = [];
        
        try {
            // 1. Rule-based detection
            for (const rule of customRules) {
                const matches = domState.html.match(rule.pattern);
                if (matches) {
                    issues.push({
                        type: rule.id,
                        description: rule.description,
                        severity: rule.severity,
                        suggestion: rule.suggestion,
                        count: matches.length,
                        // Provide a few examples without overwhelming the log/UI
                        examples: matches.slice(0, 3), 
                    });
                }
            }

            // 2. AI-based detection for more complex issues
            const aiIssues = await this.detectWithAI(domState.text);
            issues.push(...aiIssues);

            logger.info(`Detection complete. Found ${issues.length} types of issues.`);
            return issues;

        } catch (error) {
            logger.error('An error occurred during issue detection.', { error });
            return []; // Return empty array on failure to prevent downstream errors
        }
    }

    /**
     * Uses an AI model to detect complex or stylistic issues from plain text.
     * @param {string} text - The plain text content from the editor.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of AI-detected issues.
     */
    async detectWithAI(text) {
        if (!text || text.trim().length < 50) {
            // Avoid running AI on empty or very short text
            return [];
        }

        const prompt = `
            Analyze the following chapter text for common writing and formatting issues.
            Focus on identifying:
            1. Inconsistent character dialogue punctuation.
            2. Awkward sentence structures or pacing problems.
            3. Sudden shifts in tone or perspective.
            
            Text snippet for analysis:
            ---
            ${text.substring(0, 2000)}
            ---
            
            Respond ONLY with a valid JSON array of issue objects. Each object must have "type", "description", "severity", and "suggestion" keys. If no issues are found, return an empty array [].
            Example: [{"type": "TONE_SHIFT", "description": "The tone shifts abruptly from comedic to serious in the third paragraph.", "severity": "medium", "suggestion": "Smooth the transition between the different tones to maintain reader immersion."}]
        `;

        try {
            // This should be replaced with your actual TARS client call
            const response = await tarsClient.generate(prompt, { format: 'json' });
            // Assuming the client returns a parsed JSON object
            return response || [];
        } catch (error) {
            logger.error('AI-based issue detection failed.', { error });
            return [];
        }
    }
}

module.exports