// chess.gateway.ts
import { SubscribeMessage, WebSocketGateway, WebSocketServer, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChessService } from './chess.service';
import { SelectChessPlayersDto, MakeChessMoveDto } from './dto/chess.dto';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChessGateway {
  @WebSocketServer()
  server: Server;

  constructor(private chessService: ChessService) {}

  handleConnection(client: Socket) {
    const roomId = client.handshake.query.roomId as string;
    if (roomId) {
      client.join(roomId);
    }
  }

  @SubscribeMessage('selectChessPlayers')
  async handleSelectPlayers(@MessageBody() dto: SelectChessPlayersDto) {
    try {
      const game = await this.chessService.selectChessPlayers(dto);
      this.server.to(dto.roomId).emit('chessPlayersSelected', { gameState: game });
    } catch (error) {
      this.server.to(dto.roomId).emit('error', { message: error.message });
    }
  }


  @SubscribeMessage('makeChessMove')
  async handleMakeMove(@MessageBody() dto: MakeChessMoveDto, client: Socket) {
    try {
      const result = await this.chessService.makeMove(dto);
      this.server.to(dto.roomId).emit('chessMove', {
        move: dto.move,
        playerId: dto.playerId,
        success: true,
        timestamp: Date.now(),
      });
      this.server.to(dto.roomId).emit('gameState', result.game);
    } catch (error) {
      client.emit('chessMoveError', {
        message: error.message,
        move: dto.move,
        playerId: dto.playerId,
        timestamp: Date.now(),
      });
    }
  }

}