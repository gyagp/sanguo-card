# Autopo test Session

## Work Unit
Rebuild game page to use real game engine state via useGameState hook

## Acceptance Criteria
- Game page uses useGameState instead of mock data
- Player hand shows real drawn cards using the Card component
- Both player and opponent board zones show BoardMinion cards
- Hero portraits show real HP and mana from game state
- Mana bar displays available/total mana with filled/empty gems
- Page renders without errors

## Rules
# Rules


- **Ensure test infrastructure works before writing tests — verify the test runner config (ts-jest, vitest, etc.) can execute a trivial test file first** — wu-007 failed because 20+ tests were written but never actually ran due to missing Jest TypeScript configuration. The entire test suite was unverified.
  Learned: iteration 1, wu-007

- **Handle draw/tie conditions explicitly — never silently pick a winner when simultaneous outcomes are possible** — wu-007 was flagged because simultaneous hero death defaulted to player 1 winning with no justification
  Learned: iteration 1, wu-007
