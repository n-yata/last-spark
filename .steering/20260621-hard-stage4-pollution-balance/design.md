# Design: Hard Stage4 Pollution Balance

## Approach

Use difficulty-aware pure policy/AI helpers instead of stage-specific conditionals spread through GameScene.

- Add a pollution hazard damage multiplier helper that returns normal-equivalent damage.
- Extend `CombatSystem.applyPlayerDamage` so hazard callers can pass a source-specific damage multiplier override.
- Add hard-mode Purifier action weights with lower `bloom` weight while keeping the same action set.
- Pass the current GameScene difficulty into `PurifierBoss`.

## Expected Behavior

- In normal mode, Purifier bloom frequency stays unchanged.
- In hard mode, Purifier still can use bloom, but less often than normal.
- Static pollution and dynamically spawned bloom patches deal the same damage in hard as in normal.
