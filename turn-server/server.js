const turn = require('node-turn');

// Create TURN server instance
const server = new turn({
  // Network configuration
  listeningPort: 3478, // process.env.PORT ||  Use Render's PORT or default
  listeningIps: ['0.0.0.0'], // Crucial for Render
  relayIps: ['0.0.0.0'],
  
  // Authentication
  authMech: 'long-term',
  credentials: {
    username: process.env.TURN_USERNAME,
    password: process.env.TURN_PASSWORD
  },
  
  // Port ranges (important for NAT traversal)
  minPort: 49152,
  maxPort: 65535,
  
  // Debugging
  debugLevel: process.env.NODE_ENV === 'production' ? 'INFO' : 'ALL'
});

// Start server
server.start(function() {
  console.log('TURN server running on port:', server.listeningPort);
  
  // Print server info
  console.log('Server addresses:', server.getServerAddresses());
  console.log('Relay addresses:', server.getRelayAddresses());
});

// Handle shutdown
process.on('SIGINT', function() {
  server.stop();
  console.log('TURN server stopped');
  process.exit(0);
});

// Error handling
server.on('error', function(err) {
  console.error('TURN server error:', err);
});





// const { NodeTURN } = require('node-turn');

// const server = new NodeTURN({
//   listeningPort: 3478,
//   authMech: 'long-term',
//   credentials: {
//     username: "aluglobe2025",
//     password: "aluglobe2025development"
//   },
//   debugLevel: 'ALL'
// });

// server.start();