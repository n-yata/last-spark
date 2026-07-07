# Retrospective: Hard Mode Shadow RAY Boss

## What Changed

- Added a hard-mode-only hidden boss after ECLIPSE in stage6.
- Added `ShadowRayBoss`, backed by the RAY-sized `SHADOW_RAY` tuning profile.
- Added a dedicated `bossShadowRay` rig that mirrors the player silhouette without sharing player part keys.
- GameScene now clears ECLIPSE summoned enemies/projectiles before starting the hidden duel.

## Design Notes

- Shadow RAY uses `PLAYER.width` and `PLAYER.height` directly to keep the requested same-size feel.
- The hidden boss policy is pure (`shouldSpawnHardModeSecretBoss`) so normal mode and other stages stay easy to verify.
- The secret encounter uses the existing final clear path after defeat, avoiding a separate save/progression route.

## Verification

- `npm test -- tests/unit/systems/difficulty.test.ts tests/unit/config/characterRig.test.ts tests/unit/config/shadowRayBoss.test.ts`
- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run build`

Build passed with the existing Vite large chunk warning.
