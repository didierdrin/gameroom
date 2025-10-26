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
    console.log('Shuffling UNO deck...');
    const shuffledDeck = [...deck];
    
    // Use Fisher-Yates shuffle algorithm for better randomization
    for (let i = shuffledDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }
    
    // Additional shuffle pass for better distribution
    for (let i = 0; i < shuffledDeck.length; i++) {
      const randomIndex = Math.floor(Math.random() * shuffledDeck.length);
      [shuffledDeck[i], shuffledDeck[randomIndex]] = [shuffledDeck[randomIndex], shuffledDeck[i]];
    }
    
    console.log(`Deck shuffled: ${shuffledDeck.length} cards`);
    
    // Log color distribution for debugging
    const colorCount: Record<string, number> = {};
    shuffledDeck.forEach(card => {
      colorCount[card.color] = (colorCount[card.color] || 0) + 1;
    });
    console.log('Deck color distribution after shuffle:', colorCount);
    
    return shuffledDeck;
  }

  
async addPlayer(roomId: string, playerId: string, playerName: string) {
  const gameState = await this.getGameState(roomId);
  
  // Check if player already exists
  const existingPlayer = gameState.players.find(p => p.id === playerId);
  if (existingPlayer) {
    console.log(`Player ${playerId} already in UNO game, skipping duplicate join`);
    return gameState;
  }
  
  console.log(`Adding new player ${playerId} to UNO game in room ${roomId}`);
  
  gameState.players.push({
    id: playerId,
    name: playerName,
    cards: [],
    hasUno: false,
    score: 0
  });
  
  await this.updateGameState(roomId, gameState);
  return gameState;
}

  // async startGame(roomId: string) {
  //   const gameState = await this.getGameState(roomId);
    
  //   if (gameState.gameStarted) {
  //     throw new Error('Game already started');
  //   }
    
  //   if (gameState.players.length < 2) {
  //     throw new Error('At least 2 players required to start UNO');
  //   }
    
  //   // CRITICAL FIX: Ensure deck is properly initialized
  //   if (!gameState.deck || gameState.deck.length === 0) {
  //     console.warn('Deck is empty or undefined, creating new deck');
  //     gameState.deck = this.createDeck();
  //   }
    
  //   // CRITICAL FIX: Ensure discardPile is properly initialized
  //   if (!gameState.discardPile) {
  //     console.warn('Discard pile is undefined, initializing empty array');
  //     gameState.discardPile = [];
  //   }
    
  //   // CRITICAL FIX: Ensure we have enough cards to deal
  //   const totalCardsNeeded = gameState.players.length * 7;
  //   if (gameState.deck.length < totalCardsNeeded) {
  //     console.warn(`Not enough cards in deck (${gameState.deck.length}), creating new deck`);
  //     gameState.deck = this.createDeck();
  //   }
    
  //   // Deal 7 cards to each player
  //   gameState.players.forEach(player => {
  //     // CRITICAL FIX: Check if we have enough cards before splicing
  //     if (gameState.deck.length >= 7) {
  //       player.cards = gameState.deck.splice(0, 7);
  //     } else {
  //       console.error(`Not enough cards to deal to player ${player.name}`);
  //       player.cards = [];
  //     }
  //   });
    
  //   // CRITICAL FIX: Check if we have cards left for the first card
  //   if (gameState.deck.length === 0) {
  //     console.warn('No cards left after dealing, creating new deck');
  //     gameState.deck = this.createDeck();
  //   }
    
  //   // Start with first card from deck
  //   let firstCard: UnoCard | null = null;
  //   let attempts = 0;
  //   const maxAttempts = 10; // Safety limit
    
  //   do {
  //     if (gameState.deck.length === 0) {
  //       console.error('No cards available for first card');
  //       break;
  //     }
      
  //     firstCard = gameState.deck.pop()!;
      
  //     // CRITICAL FIX: Ensure discardPile exists before pushing
  //     if (!gameState.discardPile) {
  //       gameState.discardPile = [];
  //     }
  //     gameState.discardPile.push(firstCard);
      
  //     attempts++;
      
  //     // Safety break to prevent infinite loop
  //     if (attempts >= maxAttempts) {
  //       console.warn('Max attempts reached for finding non-wild first card');
  //       break;
  //     }
  //   } while (firstCard.type === 'wild' || firstCard.type === 'wild_draw_four');
    
  //   // FIXED: Handle case where firstCard might be null
  //   if (!firstCard) {
  //     console.error('Could not find a valid first card, creating default card');
  //     firstCard = {
  //       id: uuidv4(),
  //       type: 'number',
  //       color: 'red',
  //       value: '0',
  //       points: 0
  //     };
      
  //     // CRITICAL FIX: Ensure discardPile exists before pushing
  //     if (!gameState.discardPile) {
  //       gameState.discardPile = [];
  //     }
  //     gameState.discardPile.push(firstCard);
  //   }
    
  //   // Set game state properties
  //   gameState.currentColor = firstCard.color;
  //   gameState.currentValue = firstCard.value;
  //   gameState.gameStarted = true;
  //   gameState.currentTurn = gameState.players[0].id;
  //   gameState.currentPlayerIndex = 0;
    
  //   await this.updateGameState(roomId, gameState);
  //   return gameState;
  // }


  async startGame(roomId: string) {
    const gameState = await this.getGameState(roomId);
    
    if (gameState.gameStarted) {
      throw new Error('Game already started');
    }
    
    if (gameState.players.length < 2) {
      throw new Error('At least 2 players required to start UNO');
    }
    
    // CRITICAL FIX: Create and properly shuffle a new deck
    console.log('Creating and shuffling new deck for UNO game');
    gameState.deck = this.shuffleDeck(this.createDeck());
    
    // CRITICAL FIX: Ensure discardPile is properly initialized as empty
    gameState.discardPile = [];
    
    // CRITICAL FIX: Deal cards with proper randomization
    const totalCardsNeeded = gameState.players.length * 7;
    if (gameState.deck.length < totalCardsNeeded) {
      console.warn(`Not enough cards in deck (${gameState.deck.length}), creating new deck`);
      gameState.deck = this.shuffleDeck(this.createDeck());
    }
    
    // Deal 7 cards to each player - they should be random due to proper shuffling
    gameState.players.forEach(player => {
      if (gameState.deck.length >= 7) {
        player.cards = gameState.deck.splice(0, 7);
        console.log(`Dealt ${player.cards.length} cards to ${player.name}:`, 
          player.cards.map(c => `${c.color} ${c.value}`));
      } else {
        console.error(`Not enough cards to deal to player ${player.name}`);
        player.cards = [];
      }
    });
    
    // CRITICAL FIX: Start with empty discard pile and let first player play any card
    gameState.currentColor = '';
    gameState.currentValue = '';
    gameState.gameStarted = true;
    gameState.currentTurn = gameState.players[0].id;
    gameState.currentPlayerIndex = 0;
    gameState.pendingColorChoice = false;
    gameState.pendingDraw = 0;
    
    console.log('UNO game started with empty discard pile - first player can play any card');
    console.log('Remaining deck size:', gameState.deck.length);
    
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
    
    // Remove card from player's hand
    player.cards.splice(cardIndex, 1);
    
    // CRITICAL FIX: Ensure discardPile exists before pushing
    if (!gameState.discardPile) {
      console.warn('Discard pile was undefined, initializing empty array');
      gameState.discardPile = [];
    }
    
    // Add card to discard pile
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
    // CRITICAL FIX: Allow any card if no cards have been played yet (empty discard pile)
    if (gameState.discardPile.length === 0) {
      console.log('First move: allowing any card to be played');
      return true;
    }
    
    // Wild cards can always be played
    if (card.type === 'wild' || card.type === 'wild_draw_four') {
      return true;
    }
    
    // Normal card matching rules
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
    try {
      const redisState = await this.redisService.get(`game:${roomId}`);
      if (!redisState) {
        throw new Error('Game state not found');
      }
      
      const parsedState: UnoState = JSON.parse(redisState);
      
      // CRITICAL: Ensure all required properties exist with proper defaults
      const safeGameState: UnoState = {
        roomId: parsedState.roomId || roomId,
        players: parsedState.players || [],
        currentTurn: parsedState.currentTurn || '',
        currentPlayerIndex: parsedState.currentPlayerIndex || 0,
        gameStarted: parsedState.gameStarted || false,
        gameOver: parsedState.gameOver || false,
        winner: parsedState.winner || null,
        roomName: parsedState.roomName || '',
        gameType: 'uno',
        host: parsedState.host || '',
        deck: parsedState.deck || this.createDeck(),
        discardPile: parsedState.discardPile || [], // CRITICAL FIX: Ensure discardPile exists
        currentColor: parsedState.currentColor || '',
        currentValue: parsedState.currentValue || '',
        direction: parsedState.direction || 1,
        pendingDraw: parsedState.pendingDraw || 0,
        pendingColorChoice: parsedState.pendingColorChoice || false,
        lastPlayer: parsedState.lastPlayer || null,
        consecutivePasses: parsedState.consecutivePasses || 0,
      };
      
      // Ensure all players have required properties
      safeGameState.players.forEach(player => {
        if (!player.cards) player.cards = [];
        if (player.hasUno === undefined) player.hasUno = false;
        if (!player.score) player.score = 0;
      });
      
      return safeGameState;
    } catch (error) {
      console.error(`Error getting game state for room ${roomId}:`, error);
      // If recovery fails, return a fresh state
      return this.initializeGameState(roomId, '', 'Recovered Game');
    }
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
      
      // Fix any undefined properties with comprehensive checks
      if (!gameState.deck || !Array.isArray(gameState.deck)) {
        console.warn('Deck was corrupted, creating new deck');
        gameState.deck = this.createDeck();
      }
      
      if (!gameState.discardPile || !Array.isArray(gameState.discardPile)) {
        console.warn('Discard pile was corrupted, initializing empty array');
        gameState.discardPile = [];
      }
      
      if (!gameState.players || !Array.isArray(gameState.players)) {
        console.warn('Players array was corrupted, initializing empty array');
        gameState.players = [];
      }
      
      // Ensure all players have required properties
      gameState.players.forEach(player => {
        if (!player.cards || !Array.isArray(player.cards)) player.cards = [];
        if (player.hasUno === undefined) player.hasUno = false;
        if (!player.score) player.score = 0;
      });
      
      await this.updateGameState(roomId, gameState);
      return gameState;
    } catch (error) {
      console.error('Game state recovery failed, reinitializing:', error);
      return this.initializeGameState(roomId, '', 'Recovered Game');
    }
  }


}