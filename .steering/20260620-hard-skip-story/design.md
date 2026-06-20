# Design: Hard Mode Story Skip

## Approach

Add a difficulty policy helper that answers whether story should be displayed for the selected difficulty. GameScene will use that policy at scene creation time and gate all story display routes from a single flag.

## Story Routes To Gate

- Stage intro cutscenes.
- StoryOverlay text events emitted through `emitStory`.
- Post-boss rescue cutscene.
- Boss defeat reflection text.
- Final ending cutscene.

## Progression

When hard mode skips the final ending cutscene, it should route to `ClearScene` with the current `stageId` so the final clear is still saved by the existing clear flow.
