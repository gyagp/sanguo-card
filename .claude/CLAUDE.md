# Autopo test Session

## Work Unit
Create useGameState hook to connect game engine to React UI state

## Acceptance Criteria
- useGameState hook initializes a GameState from the engine
- Hook exposes playCard, attack, endTurn, useHeroPower actions
- Hook re-renders UI on state changes
- Importing and calling useGameState in a component works without errors

## Rules
# Rules


- **Ensure test infrastructure works before writing tests — verify the test runner config (ts-jest, vitest, etc.) can execute a trivial test file first** — wu-007 failed because 20+ tests were written but never actually ran due to missing Jest TypeScript configuration. The entire test suite was unverified.
  Learned: iteration 1, wu-007

- **Handle draw/tie conditions explicitly — never silently pick a winner when simultaneous outcomes are possible** — wu-007 was flagged because simultaneous hero death defaulted to player 1 winning with no justification
  Learned: iteration 1, wu-007
