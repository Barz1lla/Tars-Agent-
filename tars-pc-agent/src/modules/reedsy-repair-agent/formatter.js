const logger = require('../../shared/logger');

/**
 * @class Formatter
 * @description Applies fixes to HTML content based on detected issues.
 * It uses a rule-based system to apply string replacements or generate
 * executable browser scripts for more complex DOM manipulations.
 */
class Formatter {
    constructor() {
        /**
         * A map of fix strategies for different issue types.
         * Each fix can be a simple string replacement or a function that generates a browser script.
         * @type {Object.<string, object>}
         */
        this.fixStrategies = {
            // --- Rule-based String Replacements (Safer and Faster) ---
            EXCESSIVE_SPACING: {
                type: 'string-replace',
                description: 'Reduce multiple paragraph breaks to a single break.',
                // Finds two or more consecutive closing p-tags (with optional whitespace) and replaces them with one.
                fix: (html) => html.replace(/(<\/p>\s*){2,}/g, '</p>'),
            },
            MARKDOWN_BOLD: {
                type: 'string-replace',
                description: 'Convert Markdown bold syntax (**) to <strong> tags.',
                fix: (html) => html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'),
            },
            MARKDOWN_HEADER: {
                type: 'string-replace',
                description: 'Convert Markdown header syntax (#) to HTML <h1>-<h6> tags.',
                // Matches a line starting with 1-6 '#' and converts it to the appropriate h-tag.
                fix: (html) => html.replace(/^\s*(#{1,6})\s+(.+)/gm, (match, hashes, content) => {
                    const level = hashes.length;
                    return `<h${level}>${content.trim()}</h${level}>`;
                }),
            },
            STRAIGHT_QUOTES: {
                type: 'string-replace',
                description: 'Convert straight quotes to typographic (curly) quotes.',
                // This is a multi-pass replacement for better accuracy.
                fix: (html) => html
                    .replace(/(\s)"/g, '$1“') // Opening quote
                    .replace(/"/g, '”'),      // Closing quote
            },

            // --- Script Generation for Complex DOM Manipulation (Use Sparingly) ---
            // Example: A rule that requires complex DOM traversal not possible with regex.
            REMOVE_EMPTY_PARAGRAPHS: {
                type: 'script',
                description: 'Generate a script to remove empty <p> tags from the editor.',
                generateScript: () => `
                    (function() {
                        const editor = document.querySelector('.ProseMirror, [contenteditable="true"]');
                        if (!editor) return { error: 'Editor not found.' };
                        
                        let removedCount = 0;
                        editor.querySelectorAll('p').forEach(p => {
                            // Check if the paragraph is empty or contains only whitespace or a single <br>
                            if (p.textContent.trim() === '' && (p.innerHTML.trim() === '' || p.innerHTML.trim() === '<br>')) {
                                p.remove();
                                removedCount++;
                            }
                        });
                        return { success: true, message: \`Removed \${removedCount} empty paragraphs.\` };
                    })();
                `,
            },
        };
    }

    /**
     * Applies a set of fixes to the given HTML content.
     * It iterates through the issues and applies the corresponding string-based fixes.
     * @param {string} htmlContent - The initial HTML content from the editor.
     * @param {Array<object>} issues - An array of issue objects from the IssueDetector.
     * @returns {Promise<string>} The modified HTML content after applying all fixes.
     */
    async applyFixes(htmlContent, issues) {
        let modifiedHtml = htmlContent;
        
        for (const issue of issues) {
            const strategy = this.fixStrategies[issue.type];

            if (strategy && strategy.type === 'string-replace') {
                try {
                    const before = modifiedHtml;
                    modifiedHtml = strategy.fix(modifiedHtml);
                    if (before !== modifiedHtml) {
                        logger.info(`Applied fix for issue type: ${issue.type}`);
                    }
                } catch (error) {
                    logger.error(`Failed to apply fix for ${issue.type}.`, { error });
                }
            }
        }
        
        return modifiedHtml;
    }

    /**
     * Generates a browser-executable script for a specific issue.
     * This is used for fixes that require direct DOM manipulation.
     * @param {object} issue - The issue object to generate a script for.
     * @returns {object|null} A fix object with a description and script, or null if no script-based fix is available.
     */
    generateFixScript(issue) {
        const strategy = this.fixStrategies[issue.type];

        if (strategy && strategy.type === 'script') {
            const fix = {
                description: strategy.description,
                script: strategy.generateScript(issue), // Pass issue if script needs context
                type: issue.type,
            };
            logger.info(`Generated script-based fix for issue: ${issue.type}`);
            return fix;
        }

        logger.debug(`No script-based fix available for issue type: ${issue.type}`);
        return null;
    }
}

module.exports = new Formatter();
