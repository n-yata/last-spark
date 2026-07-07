# Retrospective: Hard Stage4 Pollution Balance

## What Changed

- Reduced Purifier bloom frequency in hard mode by adding hard-specific action weights.
- Kept normal mode Purifier action weights unchanged.
- Added a pollution hazard damage multiplier policy that keeps pollution water damage normal-equivalent even in hard mode.
- Extended `CombatSystem.applyPlayerDamage` to support source-specific damage multiplier overrides.

## Notes

- Static stage4 pollution and Purifier bloom patches share the same hazard group, so the damage override applies consistently to both.
- The hard-specific reduction only changes `bloom`; spray and other Purifier behavior remain unchanged.

## Verification

- `npm test -- tests/unit/systems/difficulty.test.ts tests/unit/systems/purifierBossAi.test.ts tests/unit/config/purifierBoss.test.ts`
- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run build`

Build passed with the existing Vite large chunk warning.
