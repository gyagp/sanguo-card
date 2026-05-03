# Autopo test Session

## Work Unit
Create Card component with cartoon-style visual design, rarity frame colors, mana crystal, attack/health values, name/description, and faction colors

## Acceptance Criteria
- Card component exists at src/components/Card.tsx
- Card displays mana cost crystal in top-left corner
- Card displays attack value at bottom-left and health at bottom-right
- Card displays name and description text
- Card frame color changes by rarity: common (gray), rare (blue), epic (purple), legendary (orange)
- 5 faction background colors: Wei (blue), Shu (green), Wu (red), Qun (yellow), neutral (gray)
- Different visual treatment for minion, spell, and weapon card types
- Card hover animation: enlarge (scale) and glow effect using Tailwind CSS

## Rules
# Rules


- **Ensure test infrastructure works before writing tests — verify the test runner config (ts-jest, vitest, etc.) can execute a trivial test file first** — wu-007 failed because 20+ tests were written but never actually ran due to missing Jest TypeScript configuration. The entire test suite was unverified.
  Learned: iteration 1, wu-007

- **Handle draw/tie conditions explicitly — never silently pick a winner when simultaneous outcomes are possible** — wu-007 was flagged because simultaneous hero death defaulted to player 1 winning with no justification
  Learned: iteration 1, wu-007
