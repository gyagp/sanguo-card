import { describe, it, expect, beforeEach } from "vitest";
import {
  GameState,
  BoardMinion,
  Deck,
  EventBus,
  gameEventBus,
  endTurn,
  removeDeadMinions,
  playCard,
  createPlayerState,
  MAX_HAND_SIZE,
  Lane,
} from "./types";
import { cards } from "./cards";

function makeDeck(n = 30): Deck {
  const filler = cards.find(c => c.name === "乡勇")!;
  return Array.from({ length: n }, () => ({ ...filler })) as unknown as Deck;
}

function makeState(): GameState {
  return {
    players: [createPlayerState(makeDeck()), createPlayerState(makeDeck())],
    board: [[], []],
    turn: 1,
    phase: "playing",
    turnPhase: "play",
    activePlayer: 0,
    spellsPlayed: [[], []], wuComboCount: [0, 0],
    terrain: { [Lane.Left]: null, [Lane.Center]: null, [Lane.Right]: null },
  };
}

function playZhugeliang(state: GameState): void {
  const zgl = cards.find(c => c.name === "诸葛亮")!;
  state.players[state.activePlayer].hand = [{ ...zgl }];
  state.players[state.activePlayer].hero.mana = 10;
  playCard(state, 0);
}

function makeMinion(card: typeof cards[number], overrides?: Partial<BoardMinion>): BoardMinion {
  return {
    ...card,
    currentAttack: card.attack,
    currentHealth: card.health,
    summoningSickness: false,
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
    formationAtkBonus: 0, formationHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0,
    wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
    lane: Lane.Center, slotIndex: 0,
    ...overrides,
  };
}

const spellCards = cards.filter(c => c.type === "spell");

describe("诸葛亮 end-of-turn effect via EventBus", () => {
  beforeEach(() => {
    gameEventBus.clear();
  });

  it("adds a spell to hand at end of turn when played via playCard", () => {
    const state = makeState();
    playZhugeliang(state);
    state.players[0].hand = [];

    endTurn(state);

    expect(state.players[0].hand.length).toBe(1);
    const added = state.players[0].hand[0];
    expect(added.type).toBe("spell");
  });

  it("only triggers on owner's turn end, not opponent's", () => {
    const state = makeState();
    playZhugeliang(state);
    state.players[0].hand = [];

    endTurn(state); // player 0's turn end — should trigger
    expect(state.players[0].hand.length).toBe(1);

    // Now activePlayer is 1, ending turn should NOT add to player 0
    endTurn(state); // player 1's turn end
    expect(state.players[0].hand.length).toBe(1);
  });

  it("does not add spell when hand is full", () => {
    const state = makeState();
    playZhugeliang(state);
    state.players[0].hand = Array.from({ length: MAX_HAND_SIZE }, () => ({ ...cards[0] }));

    endTurn(state);
    expect(state.players[0].hand.length).toBe(MAX_HAND_SIZE);
  });

  it("adds spell from the known spell pool", () => {
    const state = makeState();
    playZhugeliang(state);
    state.players[0].hand = [];

    endTurn(state);

    const added = state.players[0].hand[0];
    const spellNames = spellCards.map(c => c.name);
    expect(spellNames).toContain(added.name);
  });

  it("registers a listener on the EventBus when played", () => {
    const state = makeState();
    playZhugeliang(state);

    const minion = state.players[0].board.find(m => m.name === "诸葛亮")!;
    expect(minion.registeredListeners).toBeDefined();
    expect(minion.registeredListeners!.length).toBeGreaterThan(0);
    expect(minion.registeredListeners![0].type).toBe("turn_end");
  });
});

describe("Listener removal when minion dies", () => {
  beforeEach(() => {
    gameEventBus.clear();
  });

  it("unregisters EventBus listener when 诸葛亮 dies via removeDeadMinions", () => {
    const state = makeState();
    playZhugeliang(state);
    state.players[0].hand = [];

    const minion = state.players[0].board.find(m => m.name === "诸葛亮")!;
    expect(minion.registeredListeners!.length).toBe(1);

    minion.currentHealth = 0;
    removeDeadMinions(state);

    // Listener was unregistered — end turn should not add spell
    state.activePlayer = 0;
    endTurn(state);
    expect(state.players[0].hand.length).toBe(0);
  });

  it("stops triggering after 诸葛亮 removed from board mid-game", () => {
    const state = makeState();
    playZhugeliang(state);
    state.players[0].hand = [];

    // First end turn — should add spell
    endTurn(state);
    expect(state.players[0].hand.length).toBe(1);

    // Switch back to player 0 and kill 诸葛亮
    state.activePlayer = 0;
    const minion = state.players[0].board.find(m => m.name === "诸葛亮")!;
    minion.currentHealth = 0;
    removeDeadMinions(state);

    // End turn again — should NOT add spell
    const handCount = state.players[0].hand.length;
    endTurn(state);
    expect(state.players[0].hand.length).toBe(handCount);
  });

  it("self-removes listener when minion no longer on board (serialization path)", () => {
    const state = makeState();
    playZhugeliang(state);
    state.players[0].hand = [];

    // Simulate removing minion without going through removeDeadMinions
    state.players[0].board = [];

    endTurn(state);
    // Listener self-checks board and finds no 诸葛亮, so no spell added
    expect(state.players[0].hand.length).toBe(0);

    // Second call confirms listener was self-removed
    state.activePlayer = 0;
    endTurn(state);
    expect(state.players[0].hand.length).toBe(0);
  });
});

describe("playCard integration with 诸葛亮", () => {
  beforeEach(() => {
    gameEventBus.clear();
  });

  it("诸葛亮 played via playCard triggers end-of-turn spell", () => {
    const state = makeState();
    playZhugeliang(state);

    expect(state.players[0].board.length).toBe(1);
    expect(state.players[0].board[0].name).toBe("诸葛亮");

    state.players[0].hand = [];
    endTurn(state);
    expect(state.players[0].hand.length).toBe(1);
    expect(state.players[0].hand[0].type).toBe("spell");
  });
});

describe("EventBus basic functionality", () => {
  it("on/off/emit work correctly", () => {
    const bus = new EventBus();
    let count = 0;
    const listener = () => { count++; };

    bus.on("turn_end", listener);
    bus.emit({ type: "turn_end", player: 0 });
    expect(count).toBe(1);

    bus.off("turn_end", listener);
    bus.emit({ type: "turn_end", player: 0 });
    expect(count).toBe(1);
  });

  it("clear removes all listeners", () => {
    const bus = new EventBus();
    let count = 0;
    bus.on("turn_end", () => { count++; });
    bus.on("turn_start", () => { count++; });

    bus.clear();
    bus.emit({ type: "turn_end", player: 0 });
    bus.emit({ type: "turn_start", player: 0 });
    expect(count).toBe(0);
  });

  it("supports multiple listeners for same event type", () => {
    const bus = new EventBus();
    const results: string[] = [];
    bus.on("turn_end", () => results.push("a"));
    bus.on("turn_end", () => results.push("b"));
    bus.emit({ type: "turn_end", player: 0 });
    expect(results).toEqual(["a", "b"]);
  });
});
