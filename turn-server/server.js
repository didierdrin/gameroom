const turn = require('node-turn');
const http = require('http');

// Get port from environment (Render provides this)
const HTTP_PORT =  3000;
const TURN_PORT = 3478;

// Create TURN server instance with better error handling
const turnServer = new turn({
  // Network configuration
  listeningPort: TURN_PORT,
  listeningIps: ['0.0.0.0'],
  relayIps: ['0.0.0.0'],
  
  // Authentication - use environment variables with fallbacks
  authMech: 'long-term',
  credentials: {
    username: 'aluglobe2025',
    password:  'aluglobe2025development'
  },
  
  // Port ranges (important for NAT traversal)
  minPort: 49152,
  maxPort: 65535,
  
  // Debugging
  debugLevel: process.env.NODE_ENV === 'production' ? 'INFO' : 'ALL',
  
  // Additional TURN server options
  realm: 'alu-globe-game-room',
  noAuth: false,
  
  // ICE server configuration
  iceServers: [
    {
      urls: [
        `stun:alu-globe-game-room-turn-server.onrender.com`,
        `turn:alu-globe-game-room-turn-server.onrender.com`
      ],
      username: 'aluglobe2025',
      credential: 'aluglobe2025development'
    }
  ]
});

// Create HTTP server for health checks
const httpServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'TURN Server',
      turnPort: TURN_PORT,
      httpPort: HTTP_PORT,
      timestamp: new Date().toISOString(),
      credentials: {
        username: process.env.TURN_USERNAME || 'aluglobe2025',
        password: '***' // Don't expose actual password
      }
    }));
  } else if (req.url === '/config') {
    // Endpoint to get TURN server configuration for clients
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      iceServers: [
        {
          urls: [
            `stun:alu-globe-game-room-turn-server.onrender.com`,
            `turn:alu-globe-game-room-turn-server.onrender.com`
          ],
          username: 'aluglobe2025',
          credential: 'aluglobe2025development'
        }
      ]
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start HTTP server (for Render's port scanning)
httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`HTTP health check server running on port ${HTTP_PORT}`);
  console.log(`TURN server will run on port ${TURN_PORT}`);
});

// Start TURN server with error handling
turnServer.start(function(err) {
  if (err) {
    console.error('Failed to start TURN server:', err);
    process.exit(1);
  }
  
  console.log(`TURN server running on port ${TURN_PORT}`);
  console.log('Server is listening on 0.0.0.0:' + TURN_PORT);
  
  // Print server info
  console.log('Server addresses:', turnServer.getServerAddresses());
  console.log('Relay addresses:', turnServer.getRelayAddresses());
  
  // Log configuration
  console.log('TURN Server Configuration:');
  console.log('- Realm:', turnServer.options.realm);
  console.log('- Auth Mechanism:', turnServer.options.authMech);
  console.log('- Username:', process.env.TURN_USERNAME || 'aluglobe2025');
  console.log('- Port Range:', `${turnServer.options.minPort}-${turnServer.options.maxPort}`);
});

// Handle shutdown gracefully
process.on('SIGINT', function() {
  console.log('Shutting down servers...');
  turnServer.stop();
  httpServer.close();
  console.log('Servers stopped');
  process.exit(0);
});

process.on('SIGTERM', function() {
  console.log('Received SIGTERM, shutting down...');
  turnServer.stop();
  httpServer.close();
  console.log('Servers stopped');
  process.exit(0);
});

// Error handling
turnServer.on('error', function(err) {
  console.error('TURN server error:', err);
});

httpServer.on('error', function(err) {
  console.error('HTTP server error:', err);
});

// Keep-alive function to prevent Render.com from sleeping
function keepAlive() {
  // Ping the health endpoint every 5 minutes to keep the server active
  setInterval(() => {
    const options = {
      hostname: 'localhost',
      port: HTTP_PORT,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      console.log(`Keep-alive ping successful: ${res.statusCode}`);
    });

    req.on('error', (err) => {
      console.log('Keep-alive ping failed:', err.message);
    });

    req.end();
  }, 5 * 60 * 1000); // Every 5 minutes

  console.log('Keep-alive function started - pinging every 5 minutes');
}

// Start keep-alive function
keepAlive();

// Handle uncaught exceptions
process.on('uncaughtException', function(err) {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', function(reason, promise) {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

