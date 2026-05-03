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

export function createDeck(cards: Card[]): Deck {
  if (cards.length !== MAX_DECK_SIZE) {
    throw new Error(`Deck must contain exactly ${MAX_DECK_SIZE} cards, got ${cards.length}`);
  }
  return cards as Deck;
}

export interface BoardMinion extends Card {
  currentAttack: number;
  currentHealth: number;
}

export interface PlayerState {
  hero: Hero;
  deck: Deck;
  hand: Card[];
  board: BoardMinion[];
  maxMana: number;
}

export interface GameState {
  players: [PlayerState, PlayerState];
  board: [BoardMinion[], BoardMinion[]];
  turn: number;
  phase: GamePhase;
}
