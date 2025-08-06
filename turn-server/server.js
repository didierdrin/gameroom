// server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
app.use(cors());
app.use(express.json());

const JAAS_APP_ID = 'vpaas-magic-cookie-73e0b0238b9a447ab2d5bf9b9b41ff7c';
const JAAS_API_SECRET = 'vpaas-magic-cookie-73e0b0238b9a447ab2d5bf9b9b41ff7c/bc8b7e';
const JAAS_SUB = 'vpaas-magic-cookie-73e0b0238b9a447ab2d5bf9b9b41ff7c';

app.post('/token', (req, res) => {
  const { roomName, userName } = req.body;

  const payload = {
    aud: 'jitsi',
    iss: JAAS_APP_ID,
    sub: JAAS_SUB,
    room: roomName,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    context: {
      user: {
        name: userName || 'Guest',
      },
    },
  };

  const token = jwt.sign(payload, JAAS_API_SECRET, { algorithm: 'HS256' });

  res.json({ token });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// const turn = require('node-turn');
// const http = require('http');

// // Get port from environment (Render provides this)
// const HTTP_PORT = process.env.PORT || 3000;
// const TURN_PORT = 3478;

// // Create TURN server instance
// const turnServer = new turn({
//   // Network configuration
//   listeningPort: TURN_PORT,
//   listeningIps: ['0.0.0.0'],
//   relayIps: ['0.0.0.0'],
  
//   // Authentication
//   authMech: 'long-term',
//   credentials: {
//     username: process.env.TURN_USERNAME || 'defaultuser',
//     password: process.env.TURN_PASSWORD || 'defaultpass'
//   },
  
//   // Port ranges (important for NAT traversal)
//   minPort: 49152,
//   maxPort: 65535,
  
//   // Debugging
//   debugLevel: process.env.NODE_ENV === 'production' ? 'INFO' : 'ALL'
// });

// // Create HTTP server for health checks
// const httpServer = http.createServer((req, res) => {
//   if (req.url === '/health' || req.url === '/') {
//     res.writeHead(200, { 'Content-Type': 'application/json' });
//     res.end(JSON.stringify({
//       status: 'healthy',
//       service: 'TURN Server',
//       turnPort: TURN_PORT,
//       timestamp: new Date().toISOString()
//     }));
//   } else {
//     res.writeHead(404, { 'Content-Type': 'text/plain' });
//     res.end('Not Found');
//   }
// });

// // Start HTTP server (for Render's port scanning)
// httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
//   console.log(`HTTP health check server running on port ${HTTP_PORT}`);
// });

// // Start TURN server
// turnServer.start(function() {
//   console.log(`TURN server running on port ${TURN_PORT}`);
//   console.log('Server is listening on 0.0.0.0:' + TURN_PORT);
  
//   // Print server info
//   console.log('Server addresses:', turnServer.getServerAddresses());
//   console.log('Relay addresses:', turnServer.getRelayAddresses());
// });

// // Handle shutdown
// process.on('SIGINT', function() {
//   turnServer.stop();
//   httpServer.close();
//   console.log('Servers stopped');
//   process.exit(0);
// });

// // Error handling
// turnServer.on('error', function(err) {
//   console.error('TURN server error:', err);
// });

// httpServer.on('error', function(err) {
//   console.error('HTTP server error:', err);
// });
