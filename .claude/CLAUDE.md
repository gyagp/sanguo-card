# Autopo test Session

## Work Unit
Create basic game UI page with board layout using Tailwind CSS

## Acceptance Criteria
- Game page at src/app/game/page.tsx
- Board layout: opponent hand, opponent board, player board, player hand
- Hero portraits with HP and mana display on both sides
- End turn button
- Responsive layout using Tailwind CSS

## Rules
# Rules


- **Ensure test infrastructure works before writing tests — verify the test runner config (ts-jest, vitest, etc.) can execute a trivial test file first** — wu-007 failed because 20+ tests were written but never actually ran due to missing Jest TypeScript configuration. The entire test suite was unverified.
  Learned: iteration 1, wu-007

- **Handle draw/tie conditions explicitly — never silently pick a winner when simultaneous outcomes are possible** — wu-007 was flagged because simultaneous hero death defaulted to player 1 winning with no justification
  Learned: iteration 1, wu-007
