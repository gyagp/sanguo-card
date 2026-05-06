import { describe, it, expect } from 'vitest';
import { cards } from './cards';

describe('Wu minion cards', () => {
  const wuMinions = cards.filter(c => c.faction === 'wu' && c.type === 'minion');
  const newWuMinions = wuMinions.filter(c =>
    ['吴营水兵', '丹阳劲卒', '楼船射手', '水寨哨兵', '凌统', '黄盖', '程普', '吕蒙', '陆逊', '鲁肃',
     '江东斥候', '水营弓手', '巡江水手', '吴郡游侠', '韩当', '蒋钦', '朱然', '潘璋', '丁奉', '徐盛'].includes(c.name)
  );

  it('has exactly 20 Wu minion cards', () => {
    expect(newWuMinions).toHaveLength(20);
  });

  it('all new Wu minions have valid stats', () => {
    for (const c of newWuMinions) {
      expect(c.cost).toBeGreaterThanOrEqual(1);
      expect(c.attack).toBeGreaterThanOrEqual(0);
      expect(c.health).toBeGreaterThanOrEqual(1);
      expect(c.faction).toBe('wu');
      expect(c.type).toBe('minion');
    }
  });

  it('has correct rarity distribution', () => {
    const common = newWuMinions.filter(c => c.rarity === 'common');
    const rare = newWuMinions.filter(c => c.rarity === 'rare');
    const epic = newWuMinions.filter(c => c.rarity === 'epic');
    expect(common.length).toBeGreaterThanOrEqual(3);
    expect(rare.length).toBeGreaterThanOrEqual(2);
    expect(epic.length).toBeGreaterThanOrEqual(2);
  });

  it('no duplicate card names', () => {
    const names = newWuMinions.map(c => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('鲁肃 deathrattle caps heal at max health', () => {
    const lusu = cards.find(c => c.name === '鲁肃')!;
    expect(lusu.deathrattle).toBeDefined();

    const { GameState } = createMockState();
    const board = GameState.players[0].board;
    board.push({
      name: '测试随从', currentHealth: 4, health: 5, currentAttack: 2,
      attack: 2, cost: 2, summoningSickness: false, hasAttacked: false,
      hasDivineShield: false, isStealth: false, isFrozen: false,
      freezeTurnsLeft: 0, divineShield: false, stealth: false,
      charge: false, taunt: false, enrageActive: false, enrageBonus: 0,
      attacksThisTurn: 0, maxAttacksPerTurn: 1,
      heroSkillAtkBonus: 0, heroSkillHpBonus: 0,
      heroSkillCooldownLeft: 0, heroSkillMaxCooldown: 0,
    } as any);

    lusu.deathrattle!(GameState, { player: 0, sourceCard: {} as any });
    expect(board[0].currentHealth).toBe(5); // capped at max health, not 6
  });
});

function createMockState() {
  const makePlayer = () => ({
    hero: { health: 30, maxHealth: 30, attack: 0, armor: 0 },
    board: [] as any[],
    hand: [],
    deck: [],
    mana: 10,
    maxMana: 10,
    heroPowerUsed: false,
    fatigue: 0,
    traps: [],
    weapon: null,
    field: [],
  });
  return {
    GameState: {
      players: [makePlayer(), makePlayer()],
      currentPlayer: 0,
      turn: 1,
      phase: 'playing',
    } as any,
  };
}
