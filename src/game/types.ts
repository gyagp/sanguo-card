export type Rarity = "common" | "rare" | "epic" | "legendary";

export type CardType = "minion" | "spell" | "weapon";

export interface Card {
  name: string;
  cost: number;
  attack: number;
  health: number;
  description: string;
  rarity: Rarity;
  type: CardType;
}

export interface HeroPower {
  name: string;
  cost: number;
  description: string;
}

export interface Hero {
  health: number;
  mana: number;
  heroPower: HeroPower;
}

export type GamePhase = "mulligan" | "playing" | "ended";

export type Deck = Card[] & { readonly __brand: "Deck" };

export const MAX_DECK_SIZE = 30;

export const MAX_COPIES_PER_CARD = 2;
export const MAX_COPIES_LEGENDARY = 1;
export const MAX_HAND_SIZE = 10;

export interface DrawResult {
  drawn: Card | null;
  burned: Card | null;
}

export function validateDeckCards(cards: Card[]): void {
  if (cards.length !== MAX_DECK_SIZE) {
    throw new Error(`Deck must contain exactly ${MAX_DECK_SIZE} cards, got ${cards.length}`);
  }
  const counts = new Map<string, { count: number; rarity: Rarity }>();
  for (const card of cards) {
    const entry = counts.get(card.name);
    if (entry) {
      entry.count++;
    } else {
      counts.set(card.name, { count: 1, rarity: card.rarity });
    }
  }
  for (const [name, { count, rarity }] of counts) {
    const max = rarity === "legendary" ? MAX_COPIES_LEGENDARY : MAX_COPIES_PER_CARD;
    if (count > max) {
      throw new Error(`Card "${name}" appears ${count} times (max ${max} for ${rarity})`);
    }
  }
}

export function createDeck(cards: Card[]): Deck {
  validateDeckCards(cards);
  return [...cards] as unknown as Deck;
}

export function shuffleDeck(deck: Deck): Deck {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled as unknown as Deck;
}

export function drawCard(player: PlayerState): DrawResult {
  if (player.deck.length === 0) {
    return { drawn: null, burned: null };
  }
  const deck = player.deck as unknown as Card[];
  const card = deck.shift()!;
  if (player.hand.length >= MAX_HAND_SIZE) {
    return { drawn: null, burned: card };
  }
  player.hand.push(card);
  return { drawn: card, burned: null };
}

export interface BoardMinion extends Card {
  currentAttack: number;
  currentHealth: number;
  summoningSickness: boolean;
}

export interface Weapon {
  name: string;
  attack: number;
  durability: number;
}

export interface PlayerState {
  hero: Hero;
  deck: Deck;
  hand: Card[];
  board: BoardMinion[];
  maxMana: number;
  weapon: Weapon | null;
}

export type TurnPhase = "start" | "play" | "combat" | "end";

export interface GameState {
  players: [PlayerState, PlayerState];
  board: [BoardMinion[], BoardMinion[]];
  turn: number;
  phase: GamePhase;
  turnPhase: TurnPhase;
  activePlayer: 0 | 1;
}

export const MAX_MANA = 10;
export const STARTING_HP = 30;
export const MAX_BOARD_SIZE = 7;

export function createPlayerState(deck: Deck): PlayerState {
  return {
    hero: {
      health: STARTING_HP,
      mana: 0,
      heroPower: { name: "", cost: 2, description: "" },
    },
    deck,
    hand: [],
    board: [],
    maxMana: 0,
    weapon: null,
  };
}

export function initializeGame(deck1: Deck, deck2: Deck): GameState {
  return {
    players: [createPlayerState(deck1), createPlayerState(deck2)],
    board: [[], []],
    turn: 0,
    phase: "playing",
    turnPhase: "start",
    activePlayer: 0,
  };
}

export function startTurn(state: GameState): DrawResult {
  state.turn++;
  state.turnPhase = "start";

  const player = state.players[state.activePlayer];

  if (player.maxMana < MAX_MANA) {
    player.maxMana++;
  }
  player.hero.mana = player.maxMana;

  for (const minion of player.board) {
    minion.summoningSickness = false;
  }

  const result = drawCard(player);

  state.turnPhase = "play";
  return result;
}

export function endTurn(state: GameState): void {
  state.turnPhase = "end";
  state.activePlayer = state.activePlayer === 0 ? 1 : 0;
}

export interface PlayCardResult {
  success: boolean;
  error?: string;
}

export function playCard(
  state: GameState,
  handIndex: number,
): PlayCardResult {
  const player = state.players[state.activePlayer];

  if (handIndex < 0 || handIndex >= player.hand.length) {
    return { success: false, error: "Invalid hand index" };
  }

  const card = player.hand[handIndex];

  if (card.cost > player.hero.mana) {
    return { success: false, error: "Not enough mana" };
  }

  if (card.type === "minion") {
    if (player.board.length >= MAX_BOARD_SIZE) {
      return { success: false, error: "Board is full" };
    }
    player.hero.mana -= card.cost;
    player.hand.splice(handIndex, 1);
    const minion: BoardMinion = {
      ...card,
      currentAttack: card.attack,
      currentHealth: card.health,
      summoningSickness: true,
    };
    player.board.push(minion);
    return { success: true };
  }

  if (card.type === "spell") {
    player.hero.mana -= card.cost;
    player.hand.splice(handIndex, 1);
    return { success: true };
  }

  if (card.type === "weapon") {
    player.hero.mana -= card.cost;
    player.hand.splice(handIndex, 1);
    player.weapon = {
      name: card.name,
      attack: card.attack,
      durability: card.health,
    };
    return { success: true };
  }

  return { success: false, error: "Unknown card type" };
}
