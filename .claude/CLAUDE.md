# Autopo test Session

## Work Unit
Fix test failures after completing goal "enhanced-ai". Failures:
Microtask node_modules/react-dom/cjs/react-dom-client.development.js:[2m18853:9[22m[39m
[90m [2m❯[22m node_modules/react-dom/cjs/react-dom-client.development.js:[2m18982:11[22m[39m
[90m [2m❯[22m flushActQueue node_modules/react/cjs/react.development.js:[2m590:34[22m[39m
[90m [2m❯[22m process.env.NODE_ENV.exports.act node_modules/react/cjs/react.development.js:[2m884:10[22m[39m

[31mThis error originated in "[1msrc/app/game/victory-defeat.test.tsx[22m" test file. It doesn't mean the error was thrown inside the file itself, but while it was running.[39m
[31mThe latest test that might've caused the error is "[1mdraw has Play Again button[22m". It might mean one of the following:
- The error was thrown, while Vitest was running this test.
- If the error occurred after the test had been completed, this was the last documented test before it was thrown.[39m
[31m[1mCaused by: Error[22m: Card "令行禁止" appears 4 times (max 2 for common)[39m
[36m [2m❯[22m validateDeckCards src/game/types.ts:[2m177:13[22m[39m
[90m [2m❯[22m createDeck src/game/types.ts:[2m183:3[22m[39m
[90m [2m❯[22m src/app/game/page.tsx:[2m863:25[22m[39m
[90m [2m❯[22m mountMemo node_modules/react-dom/cjs/react-dom-client.development.js:[2m8777:23[22m[39m
[90m [2m❯[22m Object.useMemo node_modules/react-dom/cjs/react-dom-client.development.js:[2m26216:18[22m[39m
[90m [2m❯[22m process.env.NODE_ENV.exports.useMemo node_modules/react/cjs/react.development.js:[2m1251:34[22m[39m
[90m [2m❯[22m GameInner src/app/game/page.tsx:[2m862:26[22m[39m
[90m [2m❯[22m Object.react_stack_bottom_frame node_modules/react-dom/cjs/react-dom-client.development.js:[2m25904:20[22m[39m
[90m [2m❯[22m renderWithHooks node_modules/react-dom/cjs/react-dom-client.development.js:[2m7662:22[22m[39m
[90m [2m❯[22m updateFunctionComponent node_modules/react-dom/cjs/react-dom-client.development.js:[2m10166:19[22m[39m

[31m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[39m



## Acceptance Criteria
- All tests pass (npm test / vitest run exits with 0 failures)

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