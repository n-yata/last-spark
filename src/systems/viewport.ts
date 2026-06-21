// 実ビューポート寸法(CSS px)の取得。Phaser 非依存の純粋関数として切り出し、テスト可能にする。
//
// なぜ visualViewport を優先するか:
// モバイルブラウザ(タブ)では orientationchange 発火時点の window.innerWidth/innerHeight が
// 回転完了前(縦向き)の値を返すことがあり、横向きでも canvas を縦向き幅で作って左右に黒帯が出る。
// visualViewport は実際の可視ビューポートを返し、回転・ツールバー出入りの確定後に正しい値になるため、
// これを優先することで横向き全幅表示を安定させる。PWA standalone では元々安定しており影響しない。
// index.html の user-scalable=no によりピンチズーム scale=1 固定のため、visualViewport.width は
// レイアウト幅と一致する(ピンチで縮む懸念がない)。

export interface ViewportSize {
  width: number;
  height: number;
}

/**
 * 実ビューポート寸法(CSS px)を返す。
 * visualViewport が利用可能で正の寸法を持つならそれを優先し、無ければ window.innerWidth/innerHeight。
 */
export function getViewportSize(): ViewportSize {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  if (vv && vv.width > 0 && vv.height > 0) {
    return { width: vv.width, height: vv.height };
  }
  // フォールバックも正値を保証する(width*dpr を scale.resize に渡すため、0/負で canvas が壊れるのを防ぐ)。
  return {
    width: window.innerWidth > 0 ? window.innerWidth : 1,
    height: window.innerHeight > 0 ? window.innerHeight : 1,
  };
}
