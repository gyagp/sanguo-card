# Autopo test Session

## Work Unit
Add End Turn button with visual feedback and turn indicator

## Acceptance Criteria
- End Turn button calls endTurn and starts opponent simulated turn
- Button shows active/disabled state based on whose turn it is
- Turn indicator displays whose turn it is (Player/Opponent)
- Visual turn timer bar animates during the turn

## Rules
# Rules


- **Ensure test infrastructure works before writing tests — verify the test runner config (ts-jest, vitest, etc.) can execute a trivial test file first** — wu-007 failed because 20+ tests were written but never actually ran due to missing Jest TypeScript configuration. The entire test suite was unverified.
  Learned: iteration 1, wu-007

- **Handle draw/tie conditions explicitly — never silently pick a winner when simultaneous outcomes are possible** — wu-007 was flagged because simultaneous hero death defaulted to player 1 winning with no justification
  Learned: iteration 1, wu-007
