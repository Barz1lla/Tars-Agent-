require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const http = require('http');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const multer = require('multer');
const logger = require('./src/shared/logger');
const TarsClient = require('./src/shared/tarsClient');

// Load configuration
const config = require('./config/settings.json');
if (!config) {
    logger.error('Missing config/settings.json');
    process.exit(1);
}

// Initialize TARS client
const tarsClient = new TarsClient(config);

// Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Socket.IO for real-time events
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.'
});
app.use(limiter);

// Request logging
app.use((req, res, next) => {
    logger.info(`[${req.method}] ${req.url}`);
    next();
});

// Static files
app.use(express.static(path.join(__dirname, 'client/build')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

// API Documentation placeholder
app.get('/api/docs', (req, res) => {
    res.send('API documentation coming soon...');
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const providerStatus = tarsClient.getProviderStatus();
        res.json({
            status: 'healthy',
            uptime: process.uptime(),
            providers: providerStatus,
            socket: { connected_clients: io.engine.clientsCount },
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Providers
app.get('/api/providers', (req, res) => {
    try {
        res.json(tarsClient.getProviderStatus());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reedsy-specific formatter (NO tarsClient call)
app.post('/api/format', async (req, res) => {
  const { content, formatType = 'reedsy' } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Content is required and must be a string.' });
  }

  // super-simple stub formatter
  let html = content
    .replace(/\n\n/g, '</p>\n<p>')
    .replace(/^(.+)$/gm, '<p>$1</p>')
    .replace(/"(.+?)"/g, '<strong>"$1"</strong>');

  res.json({ success: true, result: html, provider: 'stub' });
});

// Format
app.post('/api/format', async (req, res) => {
    const { content, formatType = 'reedsy' } = req.body;
    if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'Content is required and must be a string.' });
    }
    try {
        const result = await tarsClient.formatContent(content, formatType);
        io.emit('format_complete', { ...result, formatType, timestamp: Date.now() });
        res.json(result);
    } catch (error) {
        logger.error('Format error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate
app.post('/api/generate', async (req, res) => {
    const { type, context } = req.body;
    if (!type || !context) {
        return res.status(400).json({ error: 'Type and context are required.' });
    }
    try {
        const result = await tarsClient.generateContent(type, context);
        io.emit('generate_complete', { ...result, type, context: context.title || 'Generated content' });
        res.json(result);
    } catch (error) {
        logger.error('Generate error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test connection
app.post('/api/test-connection', async (req, res) => {
    try {
        const result = await tarsClient.testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// File upload
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
        const fileContent = await fs.readFile(req.file.path, 'utf8');
        const result = await tarsClient.analyzeContent(fileContent, 'document');
        await fs.unlink(req.file.path);
        io.emit('upload_complete', { filename: req.file.originalname, analysis: result });
        res.json({ filename: req.file.originalname, size: req.file.size, analysis: result });
    } catch (error) {
        logger.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Side panel UI
app.get('/side-panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

// Catch-all for React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

// Socket.IO events
io.on('connection', (socket) => {
    logger.info(`Socket.IO client connected: ${socket.id}`);
    socket.emit('welcome', {
        message: 'Connected to TARS Socket.IO server',
        timestamp: Date.now(),
        clientId: socket.id,
        providers: tarsClient.getProviderStatus()
    });

    socket.on('get_provider_status', () => {
        socket.emit('provider_status', tarsClient.getProviderStatus());
    });

    socket.on('analyze_content', async (data) => {
        try {
            const result = await tarsClient.analyzeContent(data.content, data.analysisType || 'general');
            socket.emit('analysis_complete', result);
            socket.broadcast.emit('analysis_broadcast', {
                ...result,
                contentPreview: data.content.substring(0, 100) + '...',
                timestamp: Date.now(),
                clientId: socket.id
            });
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('disconnect', () => {
        logger.info(`Socket.IO client disconnected: ${socket.id}`);
    });
});

// Error handling
app.use((err, req, res, next) => {
    logger.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

// Startup provider self-test
(async () => {
    try {
        const testResult = await tarsClient.testConnection();
        logger.info('Provider self-test result:', testResult);
    } catch (err) {
        logger.error('Provider self-test failed:', err);
    }
})();

// Start server
const PORT = config.api?.port || process.env.PORT || 5000;
server.listen(PORT, () => {
    logger.info(`🚀 TARS Server running on port ${PORT}`);
    logger.info(`📡 Socket.IO endpoint: http://localhost:${PORT}/socket.io`);
    logger.info(`📊 Health check: http://localhost:${PORT}/api/health`);
    logger.info(`🖥️  Side panel: http://localhost:${PORT}/side-panel`);
});

module.exports = { app, server, io, tarsClient };