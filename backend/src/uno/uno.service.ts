import { Injectable, Inject } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { GameRoom, GameRoomDocument } from '../game/schemas/game-room.schema';
import { v4 as uuidv4 } from 'uuid';

export interface UnoCard {
  id: string;
  type: 'number' | 'skip' | 'reverse' | 'draw_two' | 'wild' | 'wild_draw_four';
  color: 'red' | 'blue' | 'green' | 'yellow' | 'black';
  value: string;
  points: number;
}

export interface UnoPlayer {
  id: string;
  name: string;
  cards: UnoCard[];
  hasUno: boolean;
  score: number;
}

export interface UnoState {
  roomId: string;
  players: UnoPlayer[];
  currentTurn: string;
  currentPlayerIndex: number;
  gameStarted: boolean;
  gameOver: boolean;
  winner: string | null;
  roomName: string;
  gameType: 'uno';
  host?: string;
  deck: UnoCard[];
  discardPile: UnoCard[];
  currentColor: string;
  currentValue: string;
  direction: 1 | -1; // 1 for clockwise, -1 for counter-clockwise
  pendingDraw: number; // Number of cards to draw for draw two/four
  pendingColorChoice: boolean; // If waiting for color choice after wild card
  lastPlayer: string | null; // Last player who played a card
  consecutivePasses: number; // Track consecutive passes
}

@Injectable()
export class UnoService {
  constructor(
    private readonly redisService: RedisService,
    @InjectModel(GameRoom.name) private gameRoomModel: Model<GameRoomDocument>,
  ) {}

  async initializeGameState(roomId: string, hostId: string, roomName: string) {
    const initialDeck = this.createDeck();
    const shuffledDeck = this.shuffleDeck([...initialDeck]);
  
    const initialGameState: UnoState = {
      roomId,
      players: [],
      currentTurn: hostId,
      currentPlayerIndex: 0,
      gameStarted: false,
      gameOver: false,
      winner: null,
      roomName,
      gameType: 'uno',
      host: hostId,
      deck: shuffledDeck, // Ensure deck is always an array
      discardPile: [], // Ensure discardPile is always an array
      currentColor: '',
      currentValue: '',
      direction: 1,
      pendingDraw: 0,
      pendingColorChoice: false,
      lastPlayer: null,
      consecutivePasses: 0,
    };
  
    await this.redisService.set(`game:${roomId}`, JSON.stringify(initialGameState));
    return initialGameState;
  }

  private createDeck(): UnoCard[] {
    const deck: UnoCard[] = [];
    const colors: ('red' | 'blue' | 'green' | 'yellow')[] = ['red', 'blue', 'green', 'yellow'];
    
    // Create number cards (0-9, two of each except 0)
    colors.forEach(color => {
      // One zero card per color
      deck.push({ 
        id: uuidv4(), 
        type: 'number', 
        color, 
        value: '0',  // Ensure this matches image naming
        points: 0 
      });
      
      // Two of each number 1-9 per color
      for (let i = 1; i <= 9; i++) {
        deck.push({ 
          id: uuidv4(), 
          type: 'number', 
          color, 
          value: i.toString(),  // This should match '1', '2', etc.
          points: i 
        });
        deck.push({ 
          id: uuidv4(), 
          type: 'number', 
          color, 
          value: i.toString(), 
          points: i 
        });
      }
      
      // Action cards (two of each per color)
      ['skip', 'reverse', 'draw_two'].forEach(action => {
        deck.push({ 
          id: uuidv4(), 
          type: action as any, 
          color, 
          value: action,  // This should match 'skip', 'reverse', 'draw_two'
          points: 20 
        });
        deck.push({ 
          id: uuidv4(), 
          type: action as any, 
          color, 
          value: action, 
          points: 20 
        });
      });
    });
    
    // Wild cards (4 of each)
    for (let i = 0; i < 4; i++) {
      deck.push({ 
        id: uuidv4(), 
        type: 'wild', 
        color: 'black', 
        value: 'wild',  // This should match 'wild'
        points: 50 
      });
      deck.push({ 
        id: uuidv4(), 
        type: 'wild_draw_four', 
        color: 'black', 
        value: 'wild_draw_four',  // This should match 'wild_draw_four'
        points: 50 
      });
    }
    
    return deck;
  }

  private shuffleDeck(deck: UnoCard[]): UnoCard[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  async addPlayer(roomId: string, playerId: string, playerName: string) {
    const gameState = await this.getGameState(roomId);
    
    if (!gameState.players.find(p => p.id === playerId)) {
      gameState.players.push({
        id: playerId,
        name: playerName,
        cards: [],
        hasUno: false,
        score: 0
      });
      
      await this.updateGameState(roomId, gameState);
    }
    
    return gameState;
  }

  async startGame(roomId: string) {
    const gameState = await this.getGameState(roomId);
    
    if (gameState.gameStarted) {
      throw new Error('Game already started');
    }
    
    if (gameState.players.length < 2) {
      throw new Error('At least 2 players required to start UNO');
    }
    
    // Deal 7 cards to each player
    gameState.players.forEach(player => {
      player.cards = gameState.deck.splice(0, 7);
    });
    
    // Start with first card from deck
    let firstCard: UnoCard;
    do {
      firstCard = gameState.deck.pop()!;
      gameState.discardPile.push(firstCard);
    } while (firstCard.type === 'wild' || firstCard.type === 'wild_draw_four');
    
    gameState.currentColor = firstCard.color;
    gameState.currentValue = firstCard.value;
    gameState.gameStarted = true;
    gameState.currentTurn = gameState.players[0].id;
    gameState.currentPlayerIndex = 0;
    
    await this.updateGameState(roomId, gameState);
    return gameState;
  }

  async playCard(roomId: string, playerId: string, cardId: string, chosenColor?: string) {
    const gameState = await this.getGameState(roomId);
    
    // Validate turn
    if (gameState.currentTurn !== playerId) {
      throw new Error('Not your turn');
    }
    
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');
    
    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) throw new Error('Card not found in hand');
    
    const card = player.cards[cardIndex];
    
    // Validate card can be played
    if (!this.canPlayCard(card, gameState)) {
      throw new Error('Invalid card play');
    }
    
    // Remove card from player's hand and add to discard pile
    player.cards.splice(cardIndex, 1);
    gameState.discardPile.push(card);
    gameState.lastPlayer = playerId;
    gameState.consecutivePasses = 0;
    
    // Handle card effects
    await this.handleCardEffect(roomId, gameState, card, chosenColor);
    
    // Check for UNO
    player.hasUno = player.cards.length === 1;
    
    // Check for win
    if (player.cards.length === 0) {
      gameState.gameOver = true;
      gameState.winner = playerId;
      await this.calculateScores(gameState);
    }
    
    await this.updateGameState(roomId, gameState);
    return gameState;
  }

  async drawCard(roomId: string, playerId: string) {
    const gameState = await this.getGameState(roomId);
    
    if (gameState.currentTurn !== playerId) {
      throw new Error('Not your turn');
    }
    
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');
  
    // CRITICAL FIX: Ensure deck exists and is properly initialized
    if (!gameState.deck) {
      console.warn('Deck was undefined, initializing new deck');
      gameState.deck = this.createDeck();
    }
  
    // Handle pending draws first
    if (gameState.pendingDraw > 0) {
      // Ensure we have enough cards for pending draw
      if (gameState.deck.length < gameState.pendingDraw) {
        this.reshuffleDeck(gameState);
      }
      
      const drawnCards = gameState.deck.splice(0, gameState.pendingDraw);
      player.cards.push(...drawnCards);
      gameState.pendingDraw = 0;
      this.nextTurn(gameState);
    } else {
      // Normal draw - ensure we have cards
      if (gameState.deck.length === 0) {
        this.reshuffleDeck(gameState);
      }
      
      // Double-check we have cards after reshuffle
      if (gameState.deck.length === 0) {
        throw new Error('No cards available to draw');
      }
      
      const drawnCard = gameState.deck.pop()!;
      player.cards.push(drawnCard);
      gameState.consecutivePasses++;
      
      // If player can play the drawn card, allow them to play it immediately
      if (this.canPlayCard(drawnCard, gameState)) {
        this.nextTurn(gameState);
      } else {
        this.nextTurn(gameState);
      }
    }
    
    await this.updateGameState(roomId, gameState);
    return gameState;
  }

  async sayUno(roomId: string, playerId: string) {
    const gameState = await this.getGameState(roomId);
    const player = gameState.players.find(p => p.id === playerId);
    
    if (player && player.cards.length === 1) {
      player.hasUno = true;
      await this.updateGameState(roomId, gameState);
    }
    
    return gameState;
  }

  async chooseColor(roomId: string, playerId: string, color: string) {
    const gameState = await this.getGameState(roomId);
    
    if (gameState.currentTurn !== playerId || !gameState.pendingColorChoice) {
      throw new Error('Cannot choose color now');
    }
    
    if (!['red', 'blue', 'green', 'yellow'].includes(color)) {
      throw new Error('Invalid color');
    }
    
    gameState.currentColor = color;
    gameState.pendingColorChoice = false;
    this.nextTurn(gameState);
    
    await this.updateGameState(roomId, gameState);
    return gameState;
  }

  private canPlayCard(card: UnoCard, gameState: UnoState): boolean {
    if (card.type === 'wild' || card.type === 'wild_draw_four') {
      return true;
    }
    
    return card.color === gameState.currentColor || card.value === gameState.currentValue;
  }

  private async handleCardEffect(roomId: string, gameState: UnoState, card: UnoCard, chosenColor?: string) {
    gameState.currentColor = card.color;
    gameState.currentValue = card.value;
    
    switch (card.type) {
      case 'skip':
        this.nextTurn(gameState); // Skip next player
        break;
        
      case 'reverse':
        gameState.direction *= -1;
        // In 2-player game, reverse acts like skip
        if (gameState.players.length === 2) {
          this.nextTurn(gameState);
        }
        break;
        
      case 'draw_two':
        gameState.pendingDraw += 2;
        this.nextTurn(gameState);
        break;
        
      case 'wild':
      case 'wild_draw_four':
        gameState.pendingColorChoice = true;
        gameState.currentColor = 'black'; // Temporary
        if (card.type === 'wild_draw_four') {
          gameState.pendingDraw += 4;
          this.nextTurn(gameState);
        }
        if (chosenColor) {
          gameState.currentColor = chosenColor;
          gameState.pendingColorChoice = false;
        }
        break;
        
      default:
        this.nextTurn(gameState);
        break;
    }
  }

  private nextTurn(gameState: UnoState) {
    let nextIndex = gameState.currentPlayerIndex + gameState.direction;
    
    if (nextIndex >= gameState.players.length) {
      nextIndex = 0;
    } else if (nextIndex < 0) {
      nextIndex = gameState.players.length - 1;
    }
    
    gameState.currentPlayerIndex = nextIndex;
    gameState.currentTurn = gameState.players[nextIndex].id;
  }

  private reshuffleDeck(gameState: UnoState) {
    // Ensure discard pile exists and has cards to reshuffle
    if (!gameState.discardPile || gameState.discardPile.length <= 1) {
      // If no cards to reshuffle, create a new deck
      console.warn('No cards to reshuffle, creating new deck');
      gameState.deck = this.shuffleDeck(this.createDeck());
      gameState.discardPile = [];
      return;
    }
    
    const currentDiscard = gameState.discardPile.pop(); // Keep top card
    gameState.deck = this.shuffleDeck([...gameState.discardPile]);
    gameState.discardPile = currentDiscard ? [currentDiscard] : [];
  }

  private async calculateScores(gameState: UnoState) {
    const winner = gameState.players.find(p => p.id === gameState.winner);
    if (!winner) return;
    
    let totalScore = 0;
    gameState.players.forEach(player => {
      if (player.id !== gameState.winner) {
        totalScore += player.cards.reduce((sum, card) => sum + card.points, 0);
      }
    });
    
    winner.score += totalScore;
  }

  async getGameState(roomId: string): Promise<UnoState> {
    const redisState = await this.redisService.get(`game:${roomId}`);
    if (!redisState) {
      throw new Error('Game state not found');
    }
    return JSON.parse(redisState);
  }

  async updateGameState(roomId: string, gameState: UnoState) {
    await this.redisService.set(`game:${roomId}`, JSON.stringify(gameState));
  }

  async restartGame(roomId: string) {
    const gameState = await this.getGameState(roomId);
    const newGameState = await this.initializeGameState(roomId, gameState.host || gameState.players[0]?.id, gameState.roomName);
    
    // Preserve players
    newGameState.players = gameState.players.map(player => ({
      ...player,
      cards: [],
      hasUno: false
    }));
    
    await this.updateGameState(roomId, newGameState);
    return newGameState;
  }


  async recoverGameState(roomId: string) {
    try {
      let gameState = await this.getGameState(roomId);
      
      // Fix any undefined properties
      if (!gameState.deck) gameState.deck = [];
      if (!gameState.discardPile) gameState.discardPile = [];
      if (!gameState.players) gameState.players = [];
      
      // Ensure all players have required properties
      gameState.players.forEach(player => {
        if (!player.cards) player.cards = [];
        if (player.hasUno === undefined) player.hasUno = false;
        if (!player.score) player.score = 0;
      });
      
      await this.updateGameState(roomId, gameState);
      return gameState;
    } catch (error) {
      // If recovery fails, reinitialize the game
      console.error('Game state recovery failed, reinitializing:', error);
      return this.initializeGameState(roomId, '', 'Recovered Game');
    }
  }


}