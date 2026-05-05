export type Rarity = "common" | "rare" | "epic" | "legendary";

export type CardType = "minion" | "spell" | "weapon";

export type Faction = "wei" | "shu" | "wu" | "qun" | "neutral";

export interface FactionSynergyTier {
  requiredCount: number;
  attackBonus: number;
  healthBonus: number;
}

export interface FactionSynergyBonus {
  tiers: FactionSynergyTier[];
}

export type FactionPassiveTrigger = "turn_start" | "turn_end" | "minion_played" | "minion_died" | "spell_played";

export interface FactionPassive {
  faction: Exclude<Faction, "neutral">;
  trigger: FactionPassiveTrigger;
  description: string;
  effect: (ctx: EffectContext) => void;
}

export const DECK_FACTION_THRESHOLD = 20;

export const FACTION_SYNERGIES: Record<Exclude<Faction, "neutral">, FactionSynergyBonus> = {
  shu: { tiers: [
    { requiredCount: 2, attackBonus: 1, healthBonus: 0 },
    { requiredCount: 4, attackBonus: 2, healthBonus: 0 },
    { requiredCount: 6, attackBonus: 3, healthBonus: 1 },
  ]},
  wei: { tiers: [
    { requiredCount: 2, attackBonus: 0, healthBonus: 1 },
    { requiredCount: 4, attackBonus: 0, healthBonus: 2 },
    { requiredCount: 6, attackBonus: 1, healthBonus: 3 },
  ]},
  wu: { tiers: [
    { requiredCount: 2, attackBonus: 1, healthBonus: 1 },
    { requiredCount: 4, attackBonus: 1, healthBonus: 2 },
    { requiredCount: 6, attackBonus: 2, healthBonus: 3 },
  ]},
  qun: { tiers: [
    { requiredCount: 2, attackBonus: 2, healthBonus: 0 },
    { requiredCount: 4, attackBonus: 3, healthBonus: 0 },
    { requiredCount: 6, attackBonus: 4, healthBonus: 1 },
  ]},
};

export type GameEventType =
  | "minion_played"
  | "minion_died"
  | "turn_start"
  | "turn_end"
  | "spell_played"
  | "attack"
  | "hero_damaged";

export interface GameEvent {
  type: GameEventType;
  player: 0 | 1;
  source?: BoardMinion | Card | { kind: "hero"; player: 0 | 1 };
  target?: BoardMinion | { kind: "hero"; player: 0 | 1 };
  value?: number;
  state?: GameState;
}

export type SpellTargetType = "enemy_minion";

export interface EffectContext {
  event: GameEvent;
  sourceCard: Card | BoardMinion;
  player: 0 | 1;
  spellDamage?: number;
  targetIndex?: number;
}

export type Effect = (state: GameState, context: EffectContext) => GameState;

export type OnPlayHook = (state: GameState, minion: BoardMinion, player: 0 | 1) => void;

export interface Card {
  name: string;
  cost: number;
  attack: number;
  health: number;
  description: string;
  rarity: Rarity;
  type: CardType;
  faction: Faction;
  taunt?: boolean;
  charge?: boolean;
  divineShield?: boolean;
  deathrattle?: Effect;
  battlecry?: Effect;
  stealth?: boolean;
  windfury?: boolean;
  enrage?: Effect;
  spellDamage?: number;
  freeze?: boolean;
  immune?: boolean;
  spellImmune?: boolean;
  effect?: Effect;
  targetType?: SpellTargetType;
  onPlay?: OnPlayHook;
}

export type HeroPowerEffect = (state: GameState, playerIndex: 0 | 1) => void;

export interface HeroPower {
  name: string;
  cost: number;
  description: string;
  effect?: HeroPowerEffect;
}

export interface Hero {
  health: number;
  mana: number;
  heroPower: HeroPower;
  isImmune?: boolean;
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

export interface RegisteredListener {
  type: GameEventType;
  listener: EventListener;
}

export interface BoardMinion extends Card {
  currentAttack: number;
  currentHealth: number;
  summoningSickness: boolean;
  hasAttacked: boolean;
  hasDivineShield: boolean;
  isStealth: boolean;
  isFrozen: boolean;
  freezeTurnsLeft: number;
  isImmune: boolean;
  windfuryAttacksLeft: number;
  enrageActive: boolean;
  enrageBonus: number;
  factionAttackBonus: number;
  factionHealthBonus: number;
  registeredListeners?: RegisteredListener[];
}

export type WeaponOnAttack = (state: GameState, targetPlayerIndex: 0 | 1, targetMinionIndex?: number) => void;

export const WEAPON_ON_ATTACK_HOOKS: Record<string, WeaponOnAttack> = {
  "丈八蛇矛": (s, tpi, tmi) => {
    if (tmi === undefined) return;
    const board = s.players[tpi].board;
    if (tmi > 0) {
      const left = board[tmi - 1];
      if (left && !left.isImmune) left.currentHealth -= 1;
    }
    if (tmi < board.length - 1) {
      const right = board[tmi + 1];
      if (right && !right.isImmune) right.currentHealth -= 1;
    }
  },
};

export interface Weapon {
  name: string;
  attack: number;
  durability: number;
  windfury?: boolean;
}

export interface PlayerState {
  hero: Hero;
  deck: Deck;
  hand: Card[];
  board: BoardMinion[];
  maxMana: number;
  weapon: Weapon | null;
  heroPowerUsed: boolean;
  heroHasAttacked: boolean;
  heroWindfuryAttacksLeft: number;
  deckFaction: Faction;
  hasDeckFactionBonus: boolean;
}

export type TurnPhase = "start" | "play" | "combat" | "end";

export interface GameState {
  players: [PlayerState, PlayerState];
  board: [BoardMinion[], BoardMinion[]];
  turn: number;
  phase: GamePhase;
  turnPhase: TurnPhase;
  activePlayer: 0 | 1;
  spellsPlayed: [Card[], Card[]];
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
    heroPowerUsed: false,
    heroHasAttacked: false,
    heroWindfuryAttacksLeft: 0,
    deckFaction: "neutral",
    hasDeckFactionBonus: false,
  };
}

export function initializeGame(deck1: Deck, deck2: Deck): GameState {
  const state: GameState = {
    players: [createPlayerState(deck1), createPlayerState(deck2)],
    board: [[], []],
    turn: 0,
    phase: "playing",
    turnPhase: "start",
    activePlayer: 0,
    spellsPlayed: [[], []],
  };

  state.players[0].hero.heroPower = FACTION_HERO_POWERS[getDeckFaction(deck1)];
  state.players[1].hero.heroPower = FACTION_HERO_POWERS[getDeckFaction(deck2)];

  state.players[0].deckFaction = getDeckFaction(deck1);
  state.players[1].deckFaction = getDeckFaction(deck2);
  state.players[0].hasDeckFactionBonus = getDeckFactionCount(deck1, state.players[0].deckFaction) >= DECK_FACTION_THRESHOLD;
  state.players[1].hasDeckFactionBonus = getDeckFactionCount(deck2, state.players[1].deckFaction) >= DECK_FACTION_THRESHOLD;

  // Opening hand: player 1 draws 3, player 2 draws 4 (coin advantage)
  for (let i = 0; i < 3; i++) drawCard(state.players[0]);
  for (let i = 0; i < 4; i++) drawCard(state.players[1]);

  return state;
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
    minion.hasAttacked = false;
    if (minion.isFrozen) {
      minion.freezeTurnsLeft--;
      if (minion.freezeTurnsLeft <= 0) {
        minion.isFrozen = false;
        minion.freezeTurnsLeft = 0;
      }
    }
    minion.windfuryAttacksLeft = minion.windfury ? 2 : 1;
  }

  player.hero.isImmune = false;
  player.heroPowerUsed = false;
  player.heroHasAttacked = false;
  player.heroWindfuryAttacksLeft = player.weapon ? (player.weapon.windfury ? 2 : 1) : 0;

  const result = drawCard(player);

  state.turnPhase = "play";

  gameEventBus.emit({ type: "turn_start", player: state.activePlayer });

  return result;
}

export function endTurn(state: GameState): void {
  state.turnPhase = "end";
  gameEventBus.emit({ type: "turn_end", player: state.activePlayer, state });
  state.activePlayer = state.activePlayer === 0 ? 1 : 0;
}

export interface PlayCardResult {
  success: boolean;
  error?: string;
}

export function recalculateFactionSynergies(player: PlayerState): void {
  const factionCounts = new Map<Faction, number>();
  for (const minion of player.board) {
    if (minion.faction !== "neutral") {
      factionCounts.set(minion.faction, (factionCounts.get(minion.faction) ?? 0) + 1);
    }
  }

  for (const minion of player.board) {
    if (minion.faction === "neutral") continue;
    const synergy = FACTION_SYNERGIES[minion.faction];
    const count = factionCounts.get(minion.faction) ?? 0;
    const oldAtkBonus = minion.factionAttackBonus;
    const oldHpBonus = minion.factionHealthBonus;

    let bestAtk = 0;
    let bestHp = 0;
    for (const tier of synergy.tiers) {
      if (count >= tier.requiredCount) {
        bestAtk = tier.attackBonus;
        bestHp = tier.healthBonus;
      }
    }
    minion.factionAttackBonus = bestAtk;
    minion.factionHealthBonus = bestHp;

    minion.currentAttack += minion.factionAttackBonus - oldAtkBonus;
    minion.currentHealth += minion.factionHealthBonus - oldHpBonus;
  }
}

export function playCard(
  state: GameState,
  handIndex: number,
  targetIndex?: number,
): PlayCardResult {
  const player = state.players[state.activePlayer];

  if (handIndex < 0 || handIndex >= player.hand.length) {
    return { success: false, error: "Invalid hand index" };
  }

  const card = player.hand[handIndex];

  const effectiveCost = getEffectiveCardCost(card, player);

  if (effectiveCost > player.hero.mana) {
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
      summoningSickness: card.charge ? false : true,
      hasAttacked: false,
      hasDivineShield: card.divineShield ?? false,
      isStealth: card.stealth ?? false,
      isFrozen: false,
      freezeTurnsLeft: 0,
      isImmune: card.immune ?? false,
      windfuryAttacksLeft: card.windfury ? 2 : 1,
      enrageActive: false,
      enrageBonus: 0,
      factionAttackBonus: 0,
      factionHealthBonus: 0,
    };
    player.board.push(minion);
    recalculateFactionSynergies(player);
    gameEventBus.emit({ type: "minion_played", player: state.activePlayer, source: minion });

    if (card.onPlay) {
      card.onPlay(state, minion, state.activePlayer);
    }

    if (card.battlecry) {
      const context: EffectContext = {
        event: { type: "minion_played", player: state.activePlayer, source: minion },
        sourceCard: card,
        player: state.activePlayer,
      };
      state = card.battlecry(state, context);
      checkEnrage(state);
      removeDeadMinions(state);
    }

    return { success: true };
  }

  if (card.type === "spell") {
    player.hero.mana -= effectiveCost;
    player.hand.splice(handIndex, 1);
    state.spellsPlayed[state.activePlayer].push({ ...card });
    gameEventBus.emit({ type: "spell_played", player: state.activePlayer, source: card });

    if (card.effect) {
      const spellDamage = player.board.reduce(
        (sum, m) => sum + (m.spellDamage ?? 0),
        0
      );
      const context: EffectContext = {
        event: { type: "spell_played", player: state.activePlayer, source: card },
        sourceCard: card,
        player: state.activePlayer,
        spellDamage,
        targetIndex,
      };
      state = card.effect(state, context);
      checkEnrage(state);
      removeDeadMinions(state);
    }

    if (player.deckFaction === "wei" && player.hasDeckFactionBonus) {
      drawCard(player);
    }

    return { success: true };
  }

  if (card.type === "weapon") {
    player.hero.mana -= card.cost;
    player.hand.splice(handIndex, 1);
    player.weapon = {
      name: card.name,
      attack: card.attack,
      durability: card.health,
      windfury: card.windfury,
    };
    player.heroWindfuryAttacksLeft = card.windfury ? 2 : 1;
    return { success: true };
  }

  return { success: false, error: "Unknown card type" };
}

export interface AttackResult {
  success: boolean;
  error?: string;
}

export function checkEnrage(state: GameState): void {
  for (let playerIdx = 0; playerIdx < 2; playerIdx++) {
    for (const minion of state.players[playerIdx].board) {
      if (!minion.enrage) continue;
      const isDamaged = minion.currentHealth < minion.health;
      if (isDamaged && !minion.enrageActive) {
        const context: EffectContext = {
          event: { type: "attack", player: playerIdx as 0 | 1, source: minion },
          sourceCard: minion,
          player: playerIdx as 0 | 1,
        };
        minion.enrage(state, context);
      } else if (!isDamaged && minion.enrageActive) {
        minion.currentAttack -= minion.enrageBonus;
        minion.enrageBonus = 0;
        minion.enrageActive = false;
      }
    }
  }
}

export function removeDeadMinions(state: GameState): void {
  let hasDeaths = true;
  while (hasDeaths) {
    const dying: { minion: BoardMinion; owner: 0 | 1 }[] = [];
    for (let playerIdx = 0; playerIdx < 2; playerIdx++) {
      for (const minion of state.players[playerIdx].board) {
        if (minion.currentHealth <= 0) {
          dying.push({ minion, owner: playerIdx as 0 | 1 });
        }
      }
    }

    if (dying.length === 0) {
      hasDeaths = false;
      break;
    }

    for (const { minion, owner } of dying) {
      if (minion.registeredListeners) {
        for (const reg of minion.registeredListeners) {
          gameEventBus.off(reg.type, reg.listener);
        }
        minion.registeredListeners = [];
      }
      if (minion.deathrattle) {
        const context: EffectContext = {
          event: { type: "minion_died", player: owner, source: minion },
          sourceCard: minion,
          player: owner,
        };
        minion.deathrattle(state, context);
      }
      gameEventBus.emit({ type: "minion_died", player: owner, source: minion });
    }

    checkEnrage(state);

    const dyingSet = new Set(dying.map(d => d.minion));
    for (const player of state.players) {
      player.board = player.board.filter((m) => !dyingSet.has(m));
      recalculateFactionSynergies(player);
    }
  }
}

export function checkWinCondition(state: GameState): 0 | 1 | "draw" | null {
  const p1Dead = state.players[0].hero.health <= 0;
  const p2Dead = state.players[1].hero.health <= 0;
  if (p1Dead && p2Dead) return "draw";
  if (p1Dead) return 1;
  if (p2Dead) return 0;
  return null;
}

export function getEffectiveCardCost(card: Card, player: PlayerState): number {
  if (card.type === "spell" && player.deckFaction === "wei" && player.hasDeckFactionBonus) {
    return Math.max(0, card.cost - 1);
  }
  return card.cost;
}

export function applyFreeze(minion: BoardMinion, casterPlayer: PlayerState): void {
  minion.isFrozen = true;
  const weiEnhanced = casterPlayer.deckFaction === "wei" && casterPlayer.hasDeckFactionBonus;
  minion.freezeTurnsLeft = weiEnhanced ? 2 : 1;
}

export function attackMinion(
  state: GameState,
  attackerIndex: number,
  defenderIndex: number,
): AttackResult {
  const attacker = state.players[state.activePlayer];
  const defenderPlayerIdx = state.activePlayer === 0 ? 1 : 0;
  const defender = state.players[defenderPlayerIdx];

  if (attackerIndex < 0 || attackerIndex >= attacker.board.length) {
    return { success: false, error: "Invalid attacker index" };
  }
  if (defenderIndex < 0 || defenderIndex >= defender.board.length) {
    return { success: false, error: "Invalid defender index" };
  }

  const attackingMinion = attacker.board[attackerIndex];
  const defendingMinion = defender.board[defenderIndex];

  if (attackingMinion.summoningSickness) {
    return { success: false, error: "Minion has summoning sickness" };
  }
  if (attackingMinion.windfuryAttacksLeft <= 0 || attackingMinion.hasAttacked) {
    return { success: false, error: "Minion has already attacked this turn" };
  }
  if (attackingMinion.isFrozen) {
    return { success: false, error: "Minion is frozen" };
  }
  if (defendingMinion.isStealth) {
    return { success: false, error: "Cannot target stealthed minion" };
  }

  const hasTaunt = defender.board.some(m => m.taunt);
  if (hasTaunt && !defendingMinion.taunt) {
    return { success: false, error: "Must attack a minion with taunt" };
  }

  if (defendingMinion.hasDivineShield) {
    defendingMinion.hasDivineShield = false;
  } else if (!defendingMinion.isImmune) {
    defendingMinion.currentHealth -= attackingMinion.currentAttack;
  }

  if (attackingMinion.hasDivineShield) {
    attackingMinion.hasDivineShield = false;
  } else if (!attackingMinion.isImmune) {
    attackingMinion.currentHealth -= defendingMinion.currentAttack;
  }

  if (attackingMinion.isStealth) {
    attackingMinion.isStealth = false;
  }

  attackingMinion.windfuryAttacksLeft--;
  if (attackingMinion.windfuryAttacksLeft <= 0) {
    attackingMinion.hasAttacked = true;
  }

  gameEventBus.emit({
    type: "attack",
    player: state.activePlayer,
    source: attackingMinion,
    target: defendingMinion,
  });

  checkEnrage(state);
  removeDeadMinions(state);

  return { success: true };
}

export function attackHero(
  state: GameState,
  attackerIndex: number,
): AttackResult {
  const attacker = state.players[state.activePlayer];
  const defender = state.players[state.activePlayer === 0 ? 1 : 0];

  if (attackerIndex < 0 || attackerIndex >= attacker.board.length) {
    return { success: false, error: "Invalid attacker index" };
  }

  const attackingMinion = attacker.board[attackerIndex];

  if (attackingMinion.summoningSickness) {
    return { success: false, error: "Minion has summoning sickness" };
  }
  if (attackingMinion.windfuryAttacksLeft <= 0 || attackingMinion.hasAttacked) {
    return { success: false, error: "Minion has already attacked this turn" };
  }
  if (attackingMinion.currentAttack <= 0) {
    return { success: false, error: "Minion has 0 attack" };
  }
  if (attackingMinion.isFrozen) {
    return { success: false, error: "Minion is frozen" };
  }

  const hasTaunt = defender.board.some(m => m.taunt);
  if (hasTaunt) {
    return { success: false, error: "Must attack a minion with taunt" };
  }

  const damage = attackingMinion.currentAttack;
  if (defender.hero.isImmune) {
    attackingMinion.windfuryAttacksLeft--;
    if (attackingMinion.windfuryAttacksLeft <= 0) {
      attackingMinion.hasAttacked = true;
    }
    if (attackingMinion.isStealth) {
      attackingMinion.isStealth = false;
    }
    return { success: true };
  }
  defender.hero.health -= damage;

  if (attackingMinion.isStealth) {
    attackingMinion.isStealth = false;
  }

  attackingMinion.windfuryAttacksLeft--;
  if (attackingMinion.windfuryAttacksLeft <= 0) {
    attackingMinion.hasAttacked = true;
  }

  gameEventBus.emit({
    type: "attack",
    player: state.activePlayer,
    source: attackingMinion,
    target: { kind: "hero", player: state.activePlayer === 0 ? 1 : 0 },
  });

  if (damage > 0) {
    gameEventBus.emit({
      type: "hero_damaged",
      player: state.activePlayer === 0 ? 1 : 0,
      value: damage,
    });
  }

  const result3 = checkWinCondition(state);
  if (result3 !== null) {
    state.phase = "ended";
  }

  return { success: true };
}

export interface HeroAttackResult {
  success: boolean;
  error?: string;
}

export function heroAttack(
  state: GameState,
  targetPlayerIndex: 0 | 1,
  targetMinionIndex?: number,
): HeroAttackResult {
  const attackerPlayer = state.players[state.activePlayer];

  if (!attackerPlayer.weapon) {
    return { success: false, error: "Hero has no weapon equipped" };
  }

  if (attackerPlayer.heroWindfuryAttacksLeft <= 0 || attackerPlayer.heroHasAttacked) {
    return { success: false, error: "Hero has already attacked this turn" };
  }

  if (targetPlayerIndex === state.activePlayer) {
    return { success: false, error: "Cannot attack your own side" };
  }

  const defender = state.players[targetPlayerIndex];
  const weaponAttack = attackerPlayer.weapon.attack;

  if (targetMinionIndex !== undefined) {
    if (targetMinionIndex < 0 || targetMinionIndex >= defender.board.length) {
      return { success: false, error: "Invalid target minion index" };
    }

    const targetMinion = defender.board[targetMinionIndex];

    if (targetMinion.isStealth) {
      return { success: false, error: "Cannot target stealthed minion" };
    }

    const hasTaunt = defender.board.some(m => m.taunt);
    if (hasTaunt && !targetMinion.taunt) {
      return { success: false, error: "Must attack a minion with taunt" };
    }

    if (targetMinion.hasDivineShield) {
      targetMinion.hasDivineShield = false;
    } else if (!targetMinion.isImmune) {
      targetMinion.currentHealth -= weaponAttack;
    }

    if (!attackerPlayer.hero.isImmune) {
      attackerPlayer.hero.health -= targetMinion.currentAttack;
    }

    const weaponName = attackerPlayer.weapon.name;

    attackerPlayer.heroWindfuryAttacksLeft--;
    if (attackerPlayer.heroWindfuryAttacksLeft <= 0) {
      attackerPlayer.heroHasAttacked = true;
    }
    attackerPlayer.weapon.durability--;
    if (attackerPlayer.weapon.durability <= 0) {
      attackerPlayer.weapon = null;
    }

    const onAttackHook = WEAPON_ON_ATTACK_HOOKS[weaponName];
    if (onAttackHook) {
      onAttackHook(state, targetPlayerIndex, targetMinionIndex);
    }

    gameEventBus.emit({
      type: "attack",
      player: state.activePlayer,
      source: { kind: "hero", player: state.activePlayer },
      target: targetMinion,
    });

    checkEnrage(state);
    removeDeadMinions(state);

    const winner = checkWinCondition(state);
    if (winner !== null) {
      state.phase = "ended";
    }

    return { success: true };
  }

  // Attacking enemy hero
  const hasTaunt = defender.board.some(m => m.taunt);
  if (hasTaunt) {
    return { success: false, error: "Must attack a minion with taunt" };
  }

  if (!defender.hero.isImmune) {
    defender.hero.health -= weaponAttack;
  }

  attackerPlayer.heroWindfuryAttacksLeft--;
  if (attackerPlayer.heroWindfuryAttacksLeft <= 0) {
    attackerPlayer.heroHasAttacked = true;
  }
  attackerPlayer.weapon.durability--;
  if (attackerPlayer.weapon.durability <= 0) {
    attackerPlayer.weapon = null;
  }

  gameEventBus.emit({
    type: "attack",
    player: state.activePlayer,
    source: { kind: "hero", player: state.activePlayer },
    target: { kind: "hero", player: targetPlayerIndex },
  });

  if (!defender.hero.isImmune && weaponAttack > 0) {
    gameEventBus.emit({
      type: "hero_damaged",
      player: targetPlayerIndex,
      value: weaponAttack,
    });
  }

  const winner = checkWinCondition(state);
  if (winner !== null) {
    state.phase = "ended";
  }

  return { success: true };
}

export type EventListener = (event: GameEvent) => void;

export class EventBus {
  private listeners: Map<GameEventType, EventListener[]> = new Map();

  on(type: GameEventType, listener: EventListener): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  off(type: GameEventType, listener: EventListener): void {
    const list = this.listeners.get(type);
    if (!list) return;
    this.listeners.set(type, list.filter(l => l !== listener));
  }

  emit(event: GameEvent): void {
    const list = this.listeners.get(event.type);
    if (!list) return;
    for (const listener of list) {
      listener(event);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const gameEventBus = new EventBus();

export function getDeckFaction(deck: Deck): Faction {
  const counts = new Map<Faction, number>();
  for (const card of deck) {
    if (card.faction !== "neutral") {
      counts.set(card.faction, (counts.get(card.faction) ?? 0) + 1);
    }
  }
  let best: Faction = "neutral";
  let bestCount = 0;
  for (const [faction, count] of counts) {
    if (count > bestCount) {
      best = faction;
      bestCount = count;
    }
  }
  return best;
}

export function getDeckFactionCount(deck: Deck, faction: Faction): number {
  let count = 0;
  for (const card of deck) {
    if (card.faction === faction) count++;
  }
  return count;
}

export const FACTION_HERO_POWERS: Record<Faction, HeroPower> = {
  shu: {
    name: "仁德",
    cost: 2,
    description: "恢复英雄2点生命值",
    effect: (state, playerIndex) => {
      state.players[playerIndex].hero.health = Math.min(
        state.players[playerIndex].hero.health + 2,
        STARTING_HP
      );
    },
  },
  wei: {
    name: "霸略",
    cost: 2,
    description: "对敌方英雄造成1点伤害",
    effect: (state, playerIndex) => {
      const opponentIndex = (playerIndex === 0 ? 1 : 0) as 0 | 1;
      state.players[opponentIndex].hero.health -= 1;
    },
  },
  wu: {
    name: "制衡",
    cost: 2,
    description: "召唤一个1/1的士兵",
    effect: (state, playerIndex) => {
      const player = state.players[playerIndex];
      if (player.board.length >= MAX_BOARD_SIZE) return;
      const token: BoardMinion = {
        name: "士兵",
        cost: 0,
        type: "minion",
        rarity: "common",
        faction: "neutral",
        attack: 1,
        health: 1,
        description: "",
        currentAttack: 1,
        currentHealth: 1,
        summoningSickness: true,
        hasAttacked: false,
        hasDivineShield: false,
        isStealth: false,
        isFrozen: false,
        freezeTurnsLeft: 0,
        isImmune: false,
        windfuryAttacksLeft: 1,
        enrageActive: false,
        enrageBonus: 0,
        factionAttackBonus: 0,
        factionHealthBonus: 0,
      };
      player.board.push(token);
    },
  },
  qun: {
    name: "乱击",
    cost: 2,
    description: "装备一把1/2的短刀",
    effect: (state, playerIndex) => {
      state.players[playerIndex].weapon = { name: "短刀", attack: 1, durability: 2 };
      state.players[playerIndex].heroHasAttacked = false;
    },
  },
  neutral: {
    name: "策略",
    cost: 2,
    description: "对随机一个敌方随从造成1点伤害",
    effect: (state, playerIndex) => {
      const opponentIndex = (playerIndex === 0 ? 1 : 0) as 0 | 1;
      const targets = state.players[opponentIndex].board.filter(m => !m.isImmune);
      if (targets.length === 0) {
        state.players[opponentIndex].hero.health -= 1;
        return;
      }
      const target = targets[Math.floor(Math.random() * targets.length)];
      target.currentHealth -= 1;
      removeDeadMinions(state);
    },
  },
};

export interface HeroPowerResult {
  success: boolean;
  error?: string;
}

export function useHeroPower(state: GameState): HeroPowerResult {
  const player = state.players[state.activePlayer];

  if (player.heroPowerUsed) {
    return { success: false, error: "Hero power already used this turn" };
  }

  const cost = player.hero.heroPower.cost;
  if (player.hero.mana < cost) {
    return { success: false, error: "Not enough mana" };
  }

  player.hero.mana -= cost;
  player.heroPowerUsed = true;

  let effect = player.hero.heroPower.effect;
  if (!effect) {
    const match = Object.values(FACTION_HERO_POWERS).find(p => p.name === player.hero.heroPower.name);
    if (match) effect = match.effect;
  }
  if (effect) {
    effect(state, state.activePlayer);
  }

  return { success: true };
}
