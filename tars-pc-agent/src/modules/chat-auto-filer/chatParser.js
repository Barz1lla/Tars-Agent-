const fs = require('fs').promises;
const path = require('path');
const logger = require('../../shared/logger');

class ChatParser {
    constructor() {
        // Centralize regex patterns for easier management
        this.patterns = {
            text: {
                user: /^(User|You|Human):\s*(.+)/i,
                ai: /^(AI|Assistant|Bot):\s*(.+)/i,
            },
            markdown: {
                user: /^#{1,6}\s*User[:.]?\s*(.*)/i,
                ai: /^#{1,6}\s*(AI|Assistant)[:.]?\s*(.*)/i,
            },
        };
        // A more comprehensive list of common English stop words
        this.stopWords = new Set(['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now']);
    }

    async parseChat(filePath) {
        const extension = path.extname(filePath).toLowerCase();
        const content = await fs.readFile(filePath, 'utf-8');
        
        try {
            let parsedData;
            switch (extension) {
                case '.json':
                    parsedData = this._parseJSONChat(content);
                    break;
                case '.txt':
                    parsedData = this._parseLineBasedChat(content, this.patterns.text, 'text');
                    break;
                case '.md':
                    parsedData = this._parseLineBasedChat(content, this.patterns.markdown, 'markdown');
                    break;
                default:
                    parsedData = this._parseGenericChat(content);
                    break;
            }
            // Attach common metadata to all successful parses
            parsedData.metadata = this._extractMetadata(parsedData.messages);
            return parsedData;
        } catch (error) {
            logger.error(`Chat parsing error for ${filePath}.`, { error: error.message });
            return { content, format: 'raw', error: error.message, messages: [], metadata: {} };
        }
    }

    _parseJSONChat(content) {
        const data = JSON.parse(content);
        let messages = [];

        if (Array.isArray(data)) {
            messages = data;
        } else if (data.conversations && Array.isArray(data.conversations)) {
            messages = data.conversations;
        } else if (data.messages && Array.isArray(data.messages)) {
            messages = data.messages;
        } else {
            throw new Error('JSON file does not contain a recognizable messages or conversations array.');
        }

        return { format: 'json', messages };
    }

    _parseLineBasedChat(content, patterns, format) {
        const lines = content.split('\n');
        const messages = [];
        let currentMessage = null;

        for (const line of lines) {
            const userMatch = line.match(patterns.user);
            const aiMatch = line.match(patterns.ai);

            if (userMatch || aiMatch) {
                if (currentMessage) messages.push(currentMessage);
                
                const role = userMatch ? 'user' : 'assistant';
                const text = (userMatch || aiMatch)[userMatch ? 2 : 2]?.trim() || '';
                
                currentMessage = { role, content: text };
            } else if (currentMessage) {
                // Append subsequent lines to the current message's content
                currentMessage.content += '\n' + line.trim();
            }
        }
        if (currentMessage) messages.push(currentMessage);

        // Clean up multi-line content
        messages.forEach(msg => { msg.content = msg.content.trim(); });

        return { format, messages };
    }

    _parseGenericChat(content) {
        return {
            format: 'raw',
            content,
            messages: [{ role: 'mixed', content: content.trim() }],
        };
    }

    _extractMetadata(messages) {
        if (!messages || messages.length === 0) return {};
        
        const participants = new Set(messages.map(msg => msg.role).filter(Boolean));
        const timestamps = messages.map(msg => new Date(msg.timestamp)).filter(date => !isNaN(date));

        return {
            totalMessages: messages.length,
            participants: Array.from(participants),
            dateRange: timestamps.length > 0 ? {
                start: new Date(Math.min(...timestamps)),
                end: new Date(Math.max(...timestamps)),
            } : null,
            topics: this._extractTopics(messages),
        };
    }

    _extractTopics(messages, topK = 5) {
        const allText = messages.map(msg => msg.content || '').join(' ').toLowerCase();
        const words = allText.match(/\b\w+\b/g) || [];
        
        const wordCounts = {};
        for (const word of words) {
            if (word.length > 3 && !this.stopWords.has(word)) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        }
        
        return Object.entries(wordCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, topK)
            .map(([word]) => word);
    }
}

module.exports = new ChatParser();