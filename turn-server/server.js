const { NodeTURN } = require('node-turn');

const server = new NodeTURN({
  listeningPort: 3478,
  authMech: 'long-term',
  credentials: {
    username: "aluglobe2025",
    password: "aluglobe2025development"
  },
  debugLevel: 'ALL'
});

server.start();