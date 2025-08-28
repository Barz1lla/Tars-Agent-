const io = require('socket.io-client');

const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('✅ Connected to TARS Socket.IO server');
});

socket.on('welcome', (data) => {
    console.log('🎉 Welcome:', data.message);
});

socket.on('provider_status', (providers) => {
    console.log('📊 Providers:', providers);
});

socket.on('analysis_complete', (result) => {
    console.log('📈 Analysis:', result.provider, result.responseTime + 'ms');
});

// Test analysis
socket.emit('analyze_content', {
    content: 'This is a test document about AI innovations.',
    analysisType: 'technical'
});

// Keep connection alive for 10 seconds
setTimeout(() => {
    socket.disconnect();
    console.log('🔌 Disconnected');
}, 10000);