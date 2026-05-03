# Autopo test Session

## Work Unit
Spell casting visual effects — add particle trail and flash effect when a spell card is played

## Acceptance Criteria
- Spell cards trigger a distinct visual effect (not the minion popIn)
- Particle trail or burst effect plays on the spell target area
- Effect includes a screen flash or glow overlay lasting ~600ms

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
