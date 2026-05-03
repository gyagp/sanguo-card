# Autopo execute Session

## Work Unit
Set up test infrastructure (vitest) and write tests for Card component

## Acceptance Criteria
- Vitest configured and a trivial test passes before writing real tests
- Tests verify rarity frame colors render correctly
- Tests verify faction colors render correctly
- Tests verify minion/spell/weapon types render differently
- Tests verify mana, attack, health values display
- All tests pass via npm run test

## Rules
# Rules


- **Ensure test infrastructure works before writing tests — verify the test runner config (ts-jest, vitest, etc.) can execute a trivial test file first** — wu-007 failed because 20+ tests were written but never actually ran due to missing Jest TypeScript configuration. The entire test suite was unverified.
  Learned: iteration 1, wu-007

- **Handle draw/tie conditions explicitly — never silently pick a winner when simultaneous outcomes are possible** — wu-007 was flagged because simultaneous hero death defaulted to player 1 winning with no justification
  Learned: iteration 1, wu-007
