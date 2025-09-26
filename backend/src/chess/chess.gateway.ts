// chess.gateway.ts
import { SubscribeMessage, WebSocketGateway, WebSocketServer, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChessService } from './chess.service';
import { GameService } from '../game/game.service';
import { SelectChessPlayersDto, MakeChessMoveDto } from './dto/chess.dto';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChessGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private chessService: ChessService,
    private gameService: GameService
  ) {}

  handleConnection(client: Socket) {
    const roomId = client.handshake.query.roomId as string;
    if (roomId) {
      client.join(roomId);
    }
  }

  // @SubscribeMessage('selectChessPlayers')
  // async handleSelectPlayers(@MessageBody() dto: SelectChessPlayersDto) {
  //   try {
  //     const chessGame = await this.chessService.selectChessPlayers(dto);
      
  //     // Update the main game state in Redis
  //     const gameState = await this.gameService.getGameState(dto.roomId);
  //     gameState.players = chessGame.players.map(p => ({
  //       id: p.id,
  //       name: p.id,  // Names will be handled in frontend
  //       chessColor: p.chessColor
  //     }));
  //     gameState.chessPlayers = { 
  //       player1Id: dto.player1Id, 
  //       player2Id: dto.player2Id 
  //     };
  //     gameState.currentTurn = chessGame.currentTurn;
  //     gameState.currentPlayer = gameState.players.findIndex(
  //       p => p.id === chessGame.currentTurn
  //     );
      
  //     await this.gameService.updateGameState(dto.roomId, gameState);
      
  //     // Emit the updated full game state
  //     this.server.to(dto.roomId).emit('chessPlayersSelected', { gameState });
  //     this.server.to(dto.roomId).emit('gameState', gameState);
  //   } catch (error) {
  //     this.server.to(dto.roomId).emit('selectChessPlayersError', { message: error.message });
  //   }
  // }

  // @SubscribeMessage('makeChessMove')
  // async handleMakeMove(@MessageBody() dto: MakeChessMoveDto, client: Socket) {
  //   try {
  //     const result = await this.chessService.makeMove(dto);
      
  //     // Update the main game state in Redis
  //     const gameState = await this.gameService.getGameState(dto.roomId);
  //     gameState.currentTurn = result.game.currentTurn;
  //     gameState.currentPlayer = gameState.players.findIndex(
  //       p => p.id === result.game.currentTurn
  //     );
  //     gameState.chessState = { 
  //       board: result.game.chessState.board, 
  //       moves: result.game.chessState.moves 
  //     };
  //     gameState.gameOver = result.game.gameOver;
  //     gameState.winner = result.game.winner!;
  //     gameState.winCondition = result.game.winCondition;
      
  //     await this.gameService.updateGameState(dto.roomId, gameState);
      
  //     // Emit move and updated game state
  //     this.server.to(dto.roomId).emit('chessMove', {
  //       move: dto.move,
  //       playerId: dto.playerId,
  //       success: true,
  //       timestamp: Date.now(),
  //     });
  //     this.server.to(dto.roomId).emit('gameState', gameState);
  //   } catch (error) {
  //     client.emit('chessMoveError', {
  //       message: error.message,
  //       move: dto.move,
  //       playerId: dto.playerId,
  //       timestamp: Date.now(),
  //     });
  //   }
  // }
}
