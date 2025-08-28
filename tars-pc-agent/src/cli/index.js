import { TARSWebSocketServer } from './websocket_server.js';

const PORT = process.env.PORT || 8080;

try {
  const wss = new TARSWebSocketServer(PORT);
  wss.start();
  console.log(`TARS WebSocket server started on port ${PORT}`);
} catch (err) {
  console.error('Failed to start TARS WebSocket server:', err);
  process.exit(1);
}