# タスクリスト: stage6 HP増強 + 召喚位置安全化

- [x] 1. `src/systems/coreSummon.ts` 新規: computeSummonXs 純粋関数
- [x] 2. `src/config/balance.ts`: maxHp 56→64、summonSafeRadius/summonSpacing 追加
- [x] 3. `src/entities/CoreBoss.ts`: summonMinions を computeSummonXs へ置換 + import
- [x] 4. `tests/unit/systems/coreSummon.test.ts` 新規: 配置の不変条件を検証
- [x] 5. `tests/unit/config/coreBoss.test.ts`: safeRadius/spacing 検証を追加
- [ ] 6. lint / typecheck / test / build を全て通す
- [ ] 7. クルトワ(security-engineer)のセキュリティレビュー
- [ ] 8. commit / push / PR 作成 / master へ Merge commit
- [ ] 9. worktree 削除・後片付け
