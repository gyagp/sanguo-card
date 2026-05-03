# Autopo test Session

## Work Unit
Add hero power button and opponent hand face-down display

## Acceptance Criteria
- Hero power button is displayed near the hero portrait
- Clicking hero power calls useHeroPower and deducts mana
- Hero power button is grayed out when already used this turn or insufficient mana
- Opponent hand shows correct number of face-down cards matching their hand size

## Rules
# Rules


- **Ensure test infrastructure works before writing tests — verify the test runner config (ts-jest, vitest, etc.) can execute a trivial test file first** — wu-007 failed because 20+ tests were written but never actually ran due to missing Jest TypeScript configuration. The entire test suite was unverified.
  Learned: iteration 1, wu-007

- **Handle draw/tie conditions explicitly — never silently pick a winner when simultaneous outcomes are possible** — wu-007 was flagged because simultaneous hero death defaulted to player 1 winning with no justification
  Learned: iteration 1, wu-007
