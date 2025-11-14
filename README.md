# Arena Game Room - Leaderboard System

This project implements a comprehensive leaderboard system for the Arena Game Room, aggregating data from game rooms, game sessions, and users to provide real-time gaming statistics.

## Features

- **Real-time Leaderboard**: Aggregates data from completed games to show current rankings
- **Game Type Filtering**: Filter leaderboards by specific game types (Trivia, Chess, UNO, etc.)
- **Comprehensive Stats**: Shows score, games played, games won, and win rate
- **Fallback System**: Falls back to user-based stats if game data is unavailable
- **Beautiful UI**: Modern, responsive design with podium view for top 3 players

## Backend Implementation

### Database Schema

The leaderboard system uses three main collections:

1. **Users** (`users`): Player information and aggregated stats
2. **Game Rooms** (`gamerooms`): Game room metadata and final scores
3. **Game Sessions** (`gamesessionentities`): Individual game session data

### Leaderboard Algorithm

The system uses MongoDB aggregation pipelines to:

1. **Match completed games** by game type (if specified)
2. **Lookup game sessions** for each room
3. **Calculate player stats** including wins, games played, and scores
4. **Join with user data** to get usernames and avatars
5. **Sort by score** (wins × 100 points) and win rate
6. **Fall back to user stats** if no game data exists

### API Endpoints

- `GET /user/leaderboard` - Get global leaderboard
- `GET /user/leaderboard?gameType=trivia` - Get leaderboard for specific game
- `POST /user/populate-sample-data` - Populate sample data for testing

## Frontend Implementation

### Components

- **LeaderboardPage**: Main leaderboard view with filters and podium
- **Game Type Filter**: Buttons to filter by specific games
- **Top 3 Podium**: Special display for top 3 players
- **Full Table**: Complete leaderboard with all stats

### Data Flow

1. **Fetch leaderboard** from backend API
2. **Parse response** and handle different data formats
3. **Format data** with fallback values for missing properties
4. **Render UI** with proper error handling and loading states

## Testing the Leaderboard

### 1. Populate Sample Data

First, populate the database with sample game data:

```bash
curl -X POST https://alu-globe-gameroom.onrender.com/user/populate-sample-data
```

This creates sample game rooms and sessions for testing.

### 2. Test Different Game Types

- **Global Leaderboard**: `GET /user/leaderboard`
- **Trivia Leaderboard**: `GET /user/leaderboard?gameType=trivia`
- **Chess Leaderboard**: `GET /user/leaderboard?gameType=chess`

### 3. Verify Data

The sample data includes:
- **didier0**: 1 win in trivia (100 points)
- **didierdrin9**: 1 win in chess (100 points)

## Database Structure

### Game Room Example
```json
{
  "_id": "68a0694e32f1c2b822f4b107",
  "roomId": "b035993a-9306-444f-a3c6-e77091e44564",
  "name": "Trivia trials 1",
  "host": "686a1c5ba08ee864040b43ba",
  "gameType": "trivia",
  "status": "completed",
  "winner": "686a1c5ba08ee864040b43ba",
  "playerIds": ["686a1c5ba08ee864040b43ba", "686a1b39a08ee864040b43b1"]
}
```

### Game Session Example
```json
{
  "_id": "68a069f032f1c2b822f4b123",
  "roomId": "b035993a-9306-444f-a3c6-e77091e44564",
  "players": ["686a1c5ba08ee864040b43ba", "686a1b39a08ee864040b43b1"],
  "winner": "686a1c5ba08ee864040b43ba",
  "startedAt": "2025-08-16T11:22:23.784+00:00",
  "endedAt": "2025-08-16T11:22:23.784+00:00"
}
```

## Scoring System

- **Win**: 100 points
- **Loss**: 0 points
- **Total Score**: Sum of all wins × 100
- **Win Rate**: (Games Won / Games Played) × 100

## Future Enhancements

- **Tournament Support**: Special scoring for tournament games
- **Time-based Rankings**: Weekly/monthly leaderboards
- **Achievement System**: Badges and rewards for milestones
- **Social Features**: Friend leaderboards and comparisons
- **Real-time Updates**: WebSocket notifications for score changes

## Troubleshooting

### Common Issues

1. **Empty Leaderboard**: Ensure games are marked as "completed" with winners
2. **Missing User Data**: Verify user IDs exist in the users collection
3. **Type Errors**: Check that gameType values match expected game types

### Debug Mode

Enable detailed logging by checking console output for:
- Aggregation pipeline details
- Query results
- Fallback method usage

## Development

### Prerequisites
- Node.js 18+
- MongoDB 5+
- NestJS framework

### Setup
```bash
cd backend
npm install
npm run start:dev
```

### Testing
```bash
npm run test
npm run test:e2e
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## License

This project is part of the Arena Game Room initiative.
