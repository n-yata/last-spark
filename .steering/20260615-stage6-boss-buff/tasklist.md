# タスクリスト: stage6 ラスボス強化

- [x] 1. `src/systems/bossAi.ts`: CORE_WEIGHTS.phase2 に summon 追加 + docコメント更新
- [x] 2. `src/config/balance.ts`: ECLIPSE_CORE.summonMaxActive 6→8 + docコメント更新
- [x] 3. `src/entities/CoreBoss.ts`: 「phase2 は召喚を止める」記述を新仕様へ更新(+ docs/functional-design.md 同期)
- [x] 4. `tests/unit/systems/coreBossAi.test.ts`: phase2 summon 継続へテスト反転 + shoot 主軸検証
- [x] 5. `tests/unit/config/coreBoss.test.ts`: 不変条件確認(summonCount3 <= summonMaxActive8 で通過)
- [x] 6. lint / typecheck / test(489 passed) / build を全て通す
- [x] 7. クルトワ(security-engineer)のセキュリティレビュー — Critical/High/Medium ゼロ
- [ ] 8. commit / push / PR 作成 / master へ Merge commit
- [ ] 9. worktree 削除・後片付け
