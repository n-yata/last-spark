# Design: Hard Mode Shadow RAY Boss

## Approach

Add a compact `ShadowRayBoss` entity that reuses the existing `Boss` behavior with a dedicated `SHADOW_RAY` tuning profile and a new `bossShadowRay` rig. The boss is the same physical size as RAY (`PLAYER.width` / `PLAYER.height`) but uses a darker mirrored palette.

## Flow

1. Stage6 starts as usual.
2. Hard mode skips story as already implemented.
3. ECLIPSE is defeated.
4. If difficulty is hard and the defeated boss is the ECLIPSE core, GameScene runs the core death sequence, clears summoned enemies/projectiles, and spawns Shadow RAY.
5. Defeating Shadow RAY runs the existing `finishStageClear` path.

## Normal Mode

Normal mode does not spawn Shadow RAY and continues to the existing ending cutscene path.

## Testing

- Unit-test the hard-only secret boss policy.
- Unit-test that `SHADOW_RAY` is RAY-sized.
- Unit-test that the `bossShadowRay` rig is RAY-like and independent from the player rig.
