<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

---******************************************************************************

## API Documentation

### Authentication Routes

#### POST /auth/signup
Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string (min 6 characters)"
}
```

**Response:**
```json
{
  "access_token": "string",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string"
  }
}
```

#### POST /auth/login
Login to existing account.

**Request Body:**
```json
{
  "usernameOrEmail": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "string",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string"
  }
}
```

---

### User Routes

#### POST /user/login-or-register
Login or register a user with just a username.

**Request Body:**
```json
{
  "username": "string"
}
```

**Response:**
```json
{
  "id": "string",
  "username": "string",
  "createdAt": "date"
}
```

#### GET /user/leaderboard
Get global or game-specific leaderboard.

**Query Parameters:**
- `gameType` (optional): Filter by game type (trivia, chess, uno, etc.)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "string",
      "username": "string",
      "avatar": "string",
      "score": "number",
      "gamesPlayed": "number",
      "gamesWon": "number",
      "winRate": "number"
    }
  ]
}
```

#### POST /user/populate-sample-data
Populate database with sample game data for testing.

**Response:**
```json
{
  "success": true,
  "message": "Sample data populated successfully"
}
```

#### POST /user/sync-user-stats
Synchronize user statistics from game sessions.

**Response:**
```json
{
  "success": true,
  "message": "User statistics synchronized successfully",
  "data": {}
}
```

#### POST /user/bootstrap-test-data
Bootstrap test data for development.

**Response:**
```json
{
  "success": true,
  "message": "Test data bootstrapped successfully"
}
```

#### GET /user/username/:username
Get user by username.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "username": "string",
    "avatar": "string"
  }
}
```

#### GET /user/:id
Get user by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "avatar": "string",
    "totalScore": "number",
    "gamesPlayed": "number",
    "gamesWon": "number"
  }
}
```

#### GET /user/:id/profile
Get detailed user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {},
    "stats": {},
    "recentGames": []
  }
}
```

#### GET /user/:id/stats
Get user game statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalScore": "number",
    "gamesPlayed": "number",
    "gamesWon": "number",
    "winRate": "number"
  }
}
```

#### PUT /user/:id/profile
Update user profile.

**Request Body:**
```json
{
  "username": "string (optional)",
  "email": "string (optional)",
  "avatar": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "avatar": "string"
  }
}
```

---

### Game Routes

#### GET /gamerooms
Get all game rooms.

**Response:**
```json
[
  {
    "_id": "string",
    "roomId": "string",
    "name": "string",
    "gameType": "string",
    "status": "string",
    "host": "string",
    "playerIds": ["string"],
    "maxPlayers": "number",
    "isPrivate": "boolean"
  }
]
```

#### GET /game/:roomId
Get specific game room details.

**Response:**
```json
{
  "_id": "string",
  "roomId": "string",
  "name": "string",
  "gameType": "string",
  "status": "string",
  "host": "string",
  "playerIds": ["string"],
  "winner": "string"
}
```

#### GET /game/:roomId/score
Get game scores for a room.

**Response:**
```json
{
  "roomId": "string",
  "scores": [
    {
      "playerId": "string",
      "score": "number"
    }
  ]
}
```

---

### Chess Routes

#### GET /chess/:roomId
Get chess game state.

**Response:**
```json
{
  "roomId": "string",
  "board": "string (FEN notation)",
  "currentTurn": "string",
  "player1": "string",
  "player2": "string",
  "status": "string",
  "winner": "string"
}
```

#### POST /chess/select-players
Select players for chess game.

**Request Body:**
```json
{
  "roomId": "string",
  "player1Id": "string",
  "player2Id": "string",
  "hostId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Players selected successfully"
}
```

---

### Trivia Routes

#### GET /trivia/questions
Get trivia questions.

**Query Parameters:**
- `count` (optional): Number of questions (1-50, default: 10)
- `difficulty` (optional): easy, medium, hard (default: medium)
- `category` (optional): general, science, history, geography, etc.

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "question": "string",
        "correctAnswer": "string",
        "incorrectAnswers": ["string"],
        "category": "string",
        "difficulty": "string"
      }
    ],
    "settings": {
      "questionCount": "number",
      "difficulty": "string",
      "category": "string"
    }
  }
}
```

#### POST /trivia/populate-database
Populate trivia database with questions.

**Response:**
```json
{
  "success": true,
  "message": "Database population started successfully"
}
```

#### GET /trivia/stats
Get trivia question statistics.

**Query Parameters:**
- `category` (optional): Filter by category
- `difficulty` (optional): Filter by difficulty

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalQuestions": "number",
      "byCategory": {},
      "byDifficulty": {}
    },
    "filters": {
      "category": "string",
      "difficulty": "string"
    }
  }
}
```

#### GET /trivia/database-status
Get trivia database status.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalQuestions": "number",
    "categoryStats": {},
    "status": "POPULATED | EMPTY"
  }
}
```

#### GET /trivia/categories
Get available trivia categories.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "value": "string",
      "label": "string",
      "icon": "string"
    }
  ]
}
```

#### GET /trivia/clear-cache
Clear trivia question cache.

**Response:**
```json
{
  "success": true,
  "message": "Question cache cleared successfully"
}
```

---

### UNO Routes

#### GET /uno/:roomId
Get UNO game state.

**Response:**
```json
{
  "roomId": "string",
  "currentCard": {},
  "currentPlayer": "string",
  "players": [],
  "status": "string",
  "winner": "string"
}
```

#### POST /uno/:roomId/restart
Restart UNO game.

**Response:**
```json
{
  "success": true,
  "message": "Game restarted successfully"
}
```

---

### WebSocket Events

The application uses Socket.IO for real-time communication. Connect to the WebSocket server and listen for the following events:

#### Game Events
- `createGame` - Create a new game room
- `joinGame` - Join an existing game
- `leaveGame` - Leave a game
- `startGame` - Start the game
- `gameUpdate` - Receive game state updates

#### Chess Events
- `makeMove` - Make a chess move
- `moveMade` - Receive move updates
- `gameOver` - Game ended

#### UNO Events
- `playCard` - Play a card
- `drawCard` - Draw a card
- `callUno` - Call UNO
- `cardPlayed` - Card played update

#### User Events
- `userOnline` - User came online
- `userOffline` - User went offline
- `userTyping` - User is typing