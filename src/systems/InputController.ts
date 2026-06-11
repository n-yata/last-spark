import Phaser from 'phaser';
import type { InputState, MoveDir } from '../types/input';
import {
  createTouchLayout,
  isInsideButton,
  isInMoveZone,
  moveDirFromDelta,
  climbDirFromDelta,
  type TouchLayout,
} from '../config/touchLayout';
import { resolveControlBand } from '../config/controlBand';

// タッチ/キーボード入力を抽象操作(InputState)に正規化する。
// 左半分=追従式タッチパッド(触れた箇所を原点に左右移動)、右側=ジャンプ/ショットの仮想ボタン。
// 移動とジャンプ/ショットを別ポインタに分離し、同時操作を可能にする。

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
  private climbDir: -1 | 0 | 1 = 0;
  private movePointerId: number | null = null;
  // 追従式パッドの原点(触れた箇所)と現在位置
  private moveOriginX = 0;
  private moveOriginY = 0;
  private moveCurX = 0;
  private moveCurY = 0;

  private shootHeld = false;
  private shootPointerId: number | null = null;
  private shootPressedEdge = false;
  private shootReleasedEdge = false;
  private shootCancelEdge = false;

  private jumpPressedEdge = false;
  private jumpButtonHeld = false;
  private jumpButtonPointerId: number | null = null;

  // キーボード(開発時フォールバック)
  private keys?: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    jump: Phaser.Input.Keyboard.Key;
    shoot: Phaser.Input.Keyboard.Key;
  };
  private keyShootWasDown = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.layout = createTouchLayout(
      scene.scale.width,
      scene.scale.height,
      resolveControlBand(scene),
    );
  }

  private refreshLayout(): void {
    this.layout = createTouchLayout(
      this.scene.scale.width,
      this.scene.scale.height,
      resolveControlBand(this.scene),
    );
  }

  /** タッチゾーン/仮想ボタンとキーボードを登録する。 */
  attachTouchZones(): void {
    const input = this.scene.input;
    input.addPointer(2); // 既定 1 + 追加 2 = 3 ポインタ(移動 + ジャンプ + ショット)
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
        up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        jump: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        shoot: kb.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      };
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const { x, y } = pointer;
    if (isInsideButton(this.layout.shootButton, x, y)) {
      this.shootHeld = true;
      this.shootPressedEdge = true;
      this.shootPointerId = pointer.id;
      return;
    }
    if (isInsideButton(this.layout.jumpButton, x, y) && this.jumpButtonPointerId === null) {
      this.jumpButtonHeld = true;
      this.jumpButtonPointerId = pointer.id;
      this.jumpPressedEdge = true;
      return;
    }
    if (isInMoveZone(this.layout.moveZone, x) && this.movePointerId === null) {
      // 触れた箇所をパッドの原点にする(追従式)。
      this.movePointerId = pointer.id;
      this.moveOriginX = x;
      this.moveOriginY = y;
      this.moveCurX = x;
      this.moveCurY = y;
      this.moveDir = 0;
      this.climbDir = 0;
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.movePointerId) return;
    this.moveCurX = pointer.x;
    this.moveCurY = pointer.y;
    // 原点からの横方向で左右、縦方向で梯子昇降を判定する(追従式パッドの Y 成分)。
    this.moveDir = moveDirFromDelta(pointer.x - this.moveOriginX);
    this.climbDir = climbDirFromDelta(pointer.y - this.moveOriginY);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.movePointerId) {
      this.movePointerId = null;
      this.moveDir = 0;
      this.climbDir = 0;
    }
    if (pointer.id === this.jumpButtonPointerId) {
      this.jumpButtonPointerId = null;
      this.jumpButtonHeld = false;
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
    this.jumpButtonPointerId = null;
    this.moveDir = 0;
    this.climbDir = 0;
    this.jumpButtonHeld = false;
    this.shootHeld = false;
    // チャージ中(指が離れた armed 状態)も含めショット操作を強制中断して待機へ戻す。
    this.shootCancelEdge = true;
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

  /** 毎フレーム最新の入力状態を返す。エッジ(jump/shoot)は消費する。 */
  update(): InputState {
    let moveDir = this.moveDir;
    let climbDir = this.climbDir;
    let jumpPressed = this.jumpPressedEdge;
    let jumpHeld = this.jumpButtonHeld;
    let shootPressed = this.shootPressedEdge;
    let shootHeld = this.shootHeld;
    let shootReleased = this.shootReleasedEdge;
    const shootCancel = this.shootCancelEdge;

    // キーボードフォールバックを合成
    if (this.keys) {
      if (this.keys.left.isDown) moveDir = -1;
      else if (this.keys.right.isDown) moveDir = moveDir === -1 ? moveDir : 1;
      if (this.keys.up.isDown) climbDir = -1;
      else if (this.keys.down.isDown) climbDir = climbDir === -1 ? climbDir : 1;
      if (Phaser.Input.Keyboard.JustDown(this.keys.jump)) jumpPressed = true;
      if (this.keys.jump.isDown) jumpHeld = true;

      const keyShootDown = this.keys.shoot.isDown;
      if (keyShootDown) shootHeld = true;
      if (keyShootDown && !this.keyShootWasDown) shootPressed = true;
      if (!keyShootDown && this.keyShootWasDown) shootReleased = true;
      this.keyShootWasDown = keyShootDown;
    }

    // エッジを消費
    this.jumpPressedEdge = false;
    this.shootPressedEdge = false;
    this.shootReleasedEdge = false;
    this.shootCancelEdge = false;

    return {
      moveDir,
      climbDir,
      jumpPressed,
      jumpHeld,
      shootPressed,
      shootHeld,
      shootReleased,
      shootCancel,
    };
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
