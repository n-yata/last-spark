# Retrospective: Hard Mode Story Skip

## What Changed

- Hard mode now disables story text and cutscene routes from `GameScene`.
- The display policy is centralized in `shouldShowStoryForDifficulty`.
- Stage 6 hard mode skips the ending cutscene but still reaches `ClearScene` with `stageId`, so the existing clear-save path remains intact.

## Notes For Future Work

- Story display is now a difficulty policy, not a stage data concern. Keep future story-skip rules in `src/systems/difficulty.ts` or a similarly pure policy module.
- If hard mode later needs separate UI copy, update the options menu and docs together.

## Verification

- `npm test -- tests/unit/systems/difficulty.test.ts`
- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run build`

`npm test` passed all tests but Vitest emitted Windows worker termination warnings (`kill EPERM`) after reporting success.
