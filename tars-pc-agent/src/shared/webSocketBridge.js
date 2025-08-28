const WebSocket = require('ws');
const logger = require('./logger');

class WebSocketBridge {
    constructor(port = 5001) {
        this.wss = new WebSocket.Server({ port });
        this.clients = new Set();
        this.setupServer();
        
        logger.info(`WebSocket Bridge initialized on port ${port}`);
    }

    setupServer() {
        this.wss.on('connection', (ws) => {
            this.clients.add(ws);
            logger.info(`WebSocket client connected. Total clients: ${this.clients.size}`);
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(ws, message);
                } catch (error) {
                    logger.error('WebSocket message parse error:', error);
                }
            });
            
            ws.on('close', () => {
                this.clients.delete(ws);
                logger.info(`WebSocket client disconnected. Total clients: ${this.clients.size}`);
            });
            
            ws.on('error', (error) => {
                logger.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
    }

    handleMessage(ws, message) {
        switch (message.type) {
            case 'subscribe':
                ws.subscriptions = new Set(message.events || []);
                logger.debug(`Client subscribed to: ${Array.from(ws.subscriptions).join(', ')}`);
                break;
                
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                break;
                
            default:
                logger.debug(`Received message: ${message.type}`);
        }
    }

    broadcast(type, data, eventType = null) {
        const message = JSON.stringify({ type, data, timestamp: Date.now(), eventType });
        
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                if (!eventType || !client.subscriptions || client.subscriptions.has(eventType)) {
                    client.send(message);
                }
            }
        });
    }

    sendToClient(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    getStats() {
        return {
            connected_clients: this.clients.size,
            uptime: process.uptime()
        };
    }
}

module.exports = WebSocketBridge;