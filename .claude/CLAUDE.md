# Autopo test Session

## Work Unit
Implement drag-and-drop to play cards from hand to board

## Acceptance Criteria
- Cards in hand are draggable
- Board zone is a valid drop target with visual highlight on dragover
- Dropping a card calls playCard and updates the board
- Cards with insufficient mana show visual feedback and cannot be played
- Board respects MAX_BOARD_SIZE limit

## Rules
# Rules


- **Ensure test infrastructure works before writing tests — verify the test runner config (ts-jest, vitest, etc.) can execute a trivial test file first** — wu-007 failed because 20+ tests were written but never actually ran due to missing Jest TypeScript configuration. The entire test suite was unverified.
  Learned: iteration 1, wu-007

- **Handle draw/tie conditions explicitly — never silently pick a winner when simultaneous outcomes are possible** — wu-007 was flagged because simultaneous hero death defaulted to player 1 winning with no justification
  Learned: iteration 1, wu-007
