# Autopo test Session

## Work Unit
Create Gemini API image generation script — build a Node.js script that calls the Gemini 2.0 flash preview image generation API to generate cartoon-style card art PNGs for all 34 cards, saving them to public/card-art/[cardName].png

## Acceptance Criteria
- scripts/generate-card-art.ts exists
- Script reads card definitions from src/game/cards.ts
- Script calls POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent with responseModalities: ['TEXT', 'IMAGE']
- Generates faction-appropriate prompts: 三国武将卡通风格 for minions, 法术效果场景 for spells, 武器造型 for weapons
- Prompts include faction color direction (魏=blue, 蜀=green, 吴=red, 群=amber)
- Saves base64-decoded PNG to public/card-art/[cardName].png
- Script handles rate limiting with delays between requests
- Script skips cards that already have generated PNGs (idempotent)
- GEMINI_API_KEY read from environment variable

## Rules
# Rules


- **Ensure test infrastructure works before writing tests — verify the test runner config (ts-jest, vitest, etc.) can execute a trivial test file first** — wu-007 failed because 20+ tests were written but never actually ran due to missing Jest TypeScript configuration. The entire test suite was unverified.
  Learned: iteration 1, wu-007

- **Handle draw/tie conditions explicitly — never silently pick a winner when simultaneous outcomes are possible** — wu-007 was flagged because simultaneous hero death defaulted to player 1 winning with no justification
  Learned: iteration 1, wu-007

- **When animations depend on game state, snapshot the relevant state before the engine mutates it — never read post-mutation state for pre-mutation visuals** — wu-020 failed because death animations targeted board indices after dead minions were already removed from the array, causing wrong-target or no-target animations
  Learned: iteration 1, wu-020

- **After fixing a bug, update all existing tests to match the new behavior before submitting — stale tests that assert the old buggy behavior will fail review** — wu-020's second review failed because 7 tests still asserted the pre-fix (buggy) implementation
  Learned: iteration 1, wu-020

- **setTimeout/setInterval in React components must be tracked in refs and cleaned up on unmount** — Reviewer flagged state updates on unmounted components as a warning in wu-020
  Learned: iteration 1, wu-020

- **Remove all dead code (unused variables, unreachable branches) before submitting — lint-level issues are review errors** — wu-034 failed partly because a `stateForThis` variable was assigned but never read, flagged as dead code
  Learned: iteration 1, wu-034

- **Never use index-based references (cardIndex, attackerIndex) across separate setTimeout callbacks — indices can go stale between React state updates** — wu-034's core race condition: sequential setTimeouts each calling setState(prev => ...) with index-based decisions could