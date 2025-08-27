/**
 * @file Configuration for the Reedsy Repair Agent.
 * This file centralizes all operational settings, rules, and AI prompts.
 */

module.exports = {
    /**
     * General settings for the agent's operation.
     */
    agent: {
        // The URL of the Reedsy editor to target.
        editorUrl: "https://reedsy.com/write-book/",
        // How often (in milliseconds) to check the DOM for changes.
        checkIntervalMs: 3000,
        // A safety limit to prevent the agent from running indefinitely.
        maxIterations: 1000,
    },

    /**
     * Feature flags to enable or disable major functionalities.
     */
    features: {
        // If true, the agent will automatically apply detected fixes.
        autoFixEnabled: true,
        // If true, the agent will perform emotional and narrative analysis.
        emotionalValidationEnabled: true,
    },

    /**
     * Configuration for the AI model interactions.
     */
    ai: {
        // Prompts used for AI-based analysis. Placeholders like {content} will be replaced.
        prompts: {
            /**
             * Prompt for the IssueDetector to find complex stylistic and structural issues.
             */
            issueDetection: `
                Analyze the following chapter text for common writing and formatting issues.
                Focus on identifying:
                1. Inconsistent character dialogue punctuation.
                2. Awkward sentence structures or pacing problems.
                3. Sudden shifts in tone or perspective.
                
                Text snippet for analysis:
                ---
                {content}
                ---
                
                Respond ONLY with a valid JSON array of issue objects. Each object must have "type", "description", "severity", and "suggestion" keys. If no issues are found, return an empty array [].
                Example: [{"type": "TONE_SHIFT", "description": "The tone shifts abruptly from comedic to serious in the third paragraph.", "severity": "medium", "suggestion": "Smooth the transition between the different tones to maintain reader immersion."}]
            `,
            /**
             * Prompt for the EmotionalValidator to perform a deep narrative analysis.
             */
            emotionalValidation: `
                Analyze the following text for its emotional and narrative impact.
                Evaluate it based on emotional resonance, narrative clarity, and reader engagement.

                Text for analysis:
                ---
                {content}
                ---

                Respond ONLY with a single, valid JSON object in the following format:
                {
                  "emotionalImpactScore": 0-100,
                  "narrativeClarityScore": 0-100,
                  "overallTone": "string",
                  "keyThemes": ["array", "of", "themes"],
                  "suggestions": ["array", "of", "suggestions"]
                }
            `
        },
        
        /**
         * Browser automation settings.
         */
        browser: {
            headless: false,
            viewport: { width: 1920, height: 1080 },
            timeout: 30000
        }
    },
                Evaluate it based on emotional resonance, narrative clarity, and reader engagement.

                Text for analysis:
                ---
                {content}
                ---

                Respond ONLY with a single, valid JSON object. The JSON object must conform to the following structure:
                {
                  "emotionalImpactScore": <A score from 0-100 representing the emotional power of the text>,
                  "narrativeClarityScore": <A score from 0-100 on how clear and coherent the narrative is>,
                  "overallTone": "<A 2-3 word description of the dominant emotional tone (e.g., 'Hopeful and melancholic')>",
                  "keyThemes": ["<A list>", "<of 3-5>", "<key emotional themes>"],
                  "suggestions": ["<A list>", "<of 3-5 actionable suggestions>", "<for improving emotional engagement and clarity>"]
                }
            `,
        },
    },

    /**
     * Rule-based patterns for the IssueDetector to find simple, predictable formatting errors.
     */
    formattingRules: [
        {
            id: 'EXCESSIVE_SPACING',
            description: 'Excessive spacing between paragraphs (2+ line breaks).',
            pattern: /(<\/p>\s*){2,}/g,
            severity: 'medium',
            suggestion: 'Reduce to a single paragraph break for standard spacing.'
        },
        {
            id: 'MARKDOWN_BOLD',
            description: 'Markdown bold syntax (**) found, which may not render in HTML.',
            pattern: /\*\*([^*]+)\*\*/g,
            severity: 'medium',
            suggestion: 'Convert to <strong> HTML tags for proper bold formatting.'
        },
        {
            id: 'MARKDOWN_HEADER',
            description: 'Markdown header syntax (#) found instead of HTML tags.',
            pattern: /^\s*#{1,6}\s+.+/gm,
            severity: 'high',
            suggestion: 'Convert to proper <h1>-<h6> HTML tags.'
        },
        {
            id: 'STRAIGHT_QUOTES',
            description: 'Straight quotation marks (") are used instead of curly quotes (“”).',
            pattern: /"/g,
            severity: 'low',
            suggestion: 'Replace with typographic (curly) quotes for professional formatting.'
         }    
    ],
};