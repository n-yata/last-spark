import Phaser from 'phaser';
import type { InputState, MoveDir } from '../types/input';
import {
  createTouchLayout,
  initialJumpSwipe,
  isInsideButton,
  isInMoveZone,
  moveDirFromDelta,
  stepJumpSwipe,
  type JumpSwipeState,
  type TouchLayout,
} from '../config/touchLayout';

// タッチ/キーボード入力を抽象操作(InputState)に正規化する。
// 左半分=追従式タッチパッド(触れた箇所を原点に左右移動 + 上スワイプでジャンプ)、右半分=ショット仮想ボタン。
// 左親指=移動+ジャンプ、右親指=チャージ専任に分離し、チャージしながらジャンプを可能にする。

/** 追従式タッチパッドの状態(描画用)。 */
export interface MovePadState {
  active: boolean;
  baseX: number;
  baseY: number;
  curX: number;
  curY: number;
}

export class InputController {
  private readonly scene: Phaser.Scene;
  private layout: TouchLayout;

  private moveDir: MoveDir = 0;
  private movePointerId: number | null = null;
  // 追従式パッドの原点(触れた箇所)と現在位置
  private moveOriginX = 0;
  private moveOriginY = 0;
  private moveCurX = 0;
  private moveCurY = 0;

  private shootHeld = false;
  private shootPointerId: number | null = null;
  private shootReleasedEdge = false;

  private jumpPressedEdge = false;
  private jumpHeld = false;
  // 上スワイプ・ジャンプの判定状態(移動ポインタに紐づく)
  private jumpSwipe: JumpSwipeState = initialJumpSwipe();

  // キーボード(開発時フォールバック)
  private keys?: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    jump: Phaser.Input.Keyboard.Key;
    shoot: Phaser.Input.Keyboard.Key;
  };
  private keyShootWasDown = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.layout = createTouchLayout(scene.scale.width, scene.scale.height);
  }

  private refreshLayout(): void {
    this.layout = createTouchLayout(this.scene.scale.width, this.scene.scale.height);
  }

  /** タッチゾーン/仮想ボタンとキーボードを登録する。 */
  attachTouchZones(): void {
    const input = this.scene.input;
    input.addPointer(2); // 既定 1 + 追加 2 = 3 ポインタ
    this.refreshLayout();

    input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    input.on(Phaser.Input.Events.GAME_OUT, this.onGameOut, this);
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.refreshLayout, this);

    const kb = this.scene.input.keyboard;
    if (kb) {
      this.keys = {
        left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        jump: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        shoot: kb.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      };
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const { x, y } = pointer;
    if (isInsideButton(this.layout.shootButton, x, y)) {
      this.shootHeld = true;
      this.shootPointerId = pointer.id;
      return;
    }
    if (isInMoveZone(this.layout.moveZone, x) && this.movePointerId === null) {
      // 触れた箇所をパッドの原点にする(追従式)。上スワイプ判定もここから再アーム。
      this.movePointerId = pointer.id;
      this.moveOriginX = x;
      this.moveOriginY = y;
      this.moveCurX = x;
      this.moveCurY = y;
      this.moveDir = 0;
      this.jumpSwipe = initialJumpSwipe();
      this.jumpHeld = false;
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.movePointerId) return;
    this.moveCurX = pointer.x;
    this.moveCurY = pointer.y;
    // 原点からの横方向の移動量で左右を判定する
    this.moveDir = moveDirFromDelta(pointer.x - this.moveOriginX);
    // 原点からの上方向変位で上スワイプ・ジャンプを判定する(横移動と同時に成立)
    const upwardDelta = this.moveOriginY - pointer.y;
    const { state, pressed } = stepJumpSwipe(this.jumpSwipe, upwardDelta);
    this.jumpSwipe = state;
    this.jumpHeld = state.held;
    if (pressed) this.jumpPressedEdge = true;
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.movePointerId) {
      this.movePointerId = null;
      this.moveDir = 0;
      this.jumpSwipe = initialJumpSwipe();
      this.jumpHeld = false;
    }
    if (pointer.id === this.shootPointerId) {
      this.shootPointerId = null;
      this.shootHeld = false;
      this.shootReleasedEdge = true;
    }
  }

  private onGameOut(): void {
    // 画面外に出た場合は安全側で入力をクリアする
    this.movePointerId = null;
    this.shootPointerId = null;
    this.moveDir = 0;
    this.jumpSwipe = initialJumpSwipe();
    this.jumpHeld = false;
    if (this.shootHeld) {
      this.shootReleasedEdge = true;
    }
    this.shootHeld = false;
  }

  /** 追従式タッチパッドの現在状態(描画用)を返す。 */
  getMovePad(): MovePadState {
    return {
      active: this.movePointerId !== null,
      baseX: this.moveOriginX,
      baseY: this.moveOriginY,
      curX: this.moveCurX,
      curY: this.moveCurY,
    };
  }

  /** 毎フレーム最新の入力状態を返す。エッジ(jump/shootReleased)は消費する。 */
  update(): InputState {
    let moveDir = this.moveDir;
    let jumpPressed = this.jumpPressedEdge;
    let jumpHeld = this.jumpHeld;
    let shootHeld = this.shootHeld;
    let shootReleased = this.shootReleasedEdge;

    // キーボードフォールバックを合成
    if (this.keys) {
      if (this.keys.left.isDown) moveDir = -1;
      else if (this.keys.right.isDown) moveDir = moveDir === -1 ? moveDir : 1;
      if (Phaser.Input.Keyboard.JustDown(this.keys.jump)) jumpPressed = true;
      if (this.keys.jump.isDown) jumpHeld = true;

      const keyShootDown = this.keys.shoot.isDown;
      if (keyShootDown) shootHeld = true;
      if (!keyShootDown && this.keyShootWasDown) shootReleased = true;
      this.keyShootWasDown = keyShootDown;
    }

    // エッジを消費
    this.jumpPressedEdge = false;
    this.shootReleasedEdge = false;

    return { moveDir, jumpPressed, jumpHeld, shootHeld, shootReleased };
  }

  /** チャージ表示用に現在のショット押下状態を返す。 */
  isShootHeld(): boolean {
    return this.shootHeld || this.keyShootWasDown;
  }

  destroy(): void {
    const input = this.scene.input;
    input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    input.off(Phaser.Input.Events.GAME_OUT, this.onGameOut, this);
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.refreshLayout, this);
  }
}
