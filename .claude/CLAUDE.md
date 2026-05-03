# Autopo test Session

## Work Unit
Implement click-to-attack: select attacker minion, click target minion or hero

## Acceptance Criteria
- Clicking a friendly minion selects it as attacker with visual highlight
- Clicking an enemy minion or hero with a selected attacker triggers attack
- Attack result updates board state (damage, deaths)
- Clicking own minion again or empty space deselects
- Minions that already attacked this turn are visually dimmed and not selectable

## Rules
# Rules


- **Ensure test infrastructure works before writing tests — verify the test runner config (ts-jest, vitest, etc.) can execute a trivial test file first** — wu-007 failed because 20+ tests were written but never actually ran due to missing Jest TypeScript configuration. The entire test suite was unverified.
  Learned: iteration 1, wu-007

- **Handle draw/tie conditions explicitly — never silently pick a winner when simultaneous outcomes are possible** — wu-007 was flagged because simultaneous hero death defaulted to player 1 winning with no justification
  Learned: iteration 1, wu-007
