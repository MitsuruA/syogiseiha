// movement.js
// ─────────────────────────────────────────────────────────────
// 将棋の「コマごとの動き」ロジック（成り駒含む）の擬似合法手生成
// 反則（打ち制約・二歩・王手放置など）は未チェック。後でフィルタを追加してください。
// 座標系は左下を (0,0) とし、右および上へ進むほど値が増える。
// 先手(SENTE)は盤の下側→上方向へ進む（dy = +1）、後手(GOTE)はその逆。
// 盤は board[y][x] で参照（board[0] が最下段）。マスは null または { side: 'SENTE'|'GOTE', type: PieceType }。
// ─────────────────────────────────────────────────────────────

/** @typedef {'SENTE' | 'GOTE'} Side */

/** @typedef {'FUHYO'|'KYOSHA'|'KEIMA'|'GINSHO'|'KINSHO'|'KAKUGYO'|'HISHA'|'OSHO'
 *          |'TOKIN'|'NARIKYOSHA'|'NARIKEIMA'|'NARIGINSHO'|'RYUMA'|'RYUO'} PieceType */

/** @typedef {{x:number, y:number}} Square */
/** @typedef {{from:Square, to:Square, piece:PieceType, capture:boolean}} Move */

/** 方向ベクトル（先手基準：上が +1） */
const ORTHO = { L: [-1, 0], U: [0, 1], R: [1, 0], D: [0, -1] };
const DIAG  = { UL: [-1, 1], UR: [1, 1], DL: [-1, -1], DR: [1, -1] };

/** 金将の一歩（先手基準：斜め後ろは行かない） */
const GOLD_STEPS = [DIAG.UL, ORTHO.U, DIAG.UR, ORTHO.L, ORTHO.D, ORTHO.R];

/** 銀将の一歩（先手基準：前3方向＋斜め後ろ2方向） */
const SILVER_STEPS = [DIAG.UL, ORTHO.U, DIAG.UR, DIAG.DL, DIAG.DR];

/** 王将（八方一歩） */
const KING_STEPS = [DIAG.UL, ORTHO.U, DIAG.UR, ORTHO.L, ORTHO.R, DIAG.DL, ORTHO.D, DIAG.DR];

/** 角・飛のスライド方向（先手/後手共通だが、後でsideで符号反転は不要） */
const BISHOP_SLIDES = [DIAG.UL, DIAG.UR, DIAG.DL, DIAG.DR];
const ROOK_SLIDES   = [ORTHO.L, ORTHO.U, ORTHO.R, ORTHO.D];

/** 盤内判定 */
function inside(x, y, width, height) {
  return x >= 0 && y >= 0 && x < width && y < height;
}

/** 味方/敵判定 */
function allyAt(board, x, y, side) {
  const c = board[y][x];
  return c && c.side === side;
}
function enemyAt(board, x, y, side) {
  const c = board[y][x];
  return c && c.side !== side;
}

/** side に応じてベクトルの y を反転（先手基準→後手は上下反転） */
function orient([dx, dy], side /** @type {Side} */) {
  const s = (side === 'SENTE') ? 1 : -1;
  return [dx, dy * s]; // xは左右同じ、yのみ反転
}

/** 駒ごとの動きルール定義（先手基準） */
const RULES = /** @type {Record<PieceType, {
  stepDirs?: number[][];
  slideDirs?: number[][];
  // UMA/RYUO のように「スライド＋一歩追加」がある場合は両方定義
  knightJumps?: number[][]; // KEIMA 専用（サイドでy符号反転）
}>} */ ({
  FUHYO: { stepDirs: [ORTHO.U] },
  KYOSHA: { slideDirs: [ORTHO.U] },
  KEIMA: { knightJumps: [[-1, 2], [1, 2]] }, // 先手基準（後手はy反転）
  GINSHO: { stepDirs: SILVER_STEPS },
  KINSHO: { stepDirs: GOLD_STEPS },
  KAKUGYO: { slideDirs: BISHOP_SLIDES },
  HISHA: { slideDirs: ROOK_SLIDES },
  OSHO: { stepDirs: KING_STEPS },

  // 成り駒
  TOKIN: { stepDirs: GOLD_STEPS },          // 歩の成り＝金
  NARIKYOSHA: { stepDirs: GOLD_STEPS },     // 香の成り＝金
  NARIKEIMA: { stepDirs: GOLD_STEPS },      // 桂の成り＝金
  NARIGINSHO: { stepDirs: GOLD_STEPS },     // 銀の成り＝金
  RYUMA: { slideDirs: BISHOP_SLIDES, stepDirs: [ORTHO.L, ORTHO.U, ORTHO.R, ORTHO.D] }, // 角+王の直交一歩
  RYUO: { slideDirs: ROOK_SLIDES, stepDirs: [DIAG.UL, DIAG.UR, DIAG.DL, DIAG.DR] },     // 飛+王の斜め一歩
});

/**
 * 指定マス上の駒の擬似合法手を生成
 * @param {{side:Side,type:PieceType}[][]} board board[y][x]
 * @param {number} fromX
 * @param {number} fromY
 * @returns {Move[]}
 */
export function generatePseudoLegalMovesForSquare(board, fromX, fromY) {
  const height = board.length;
  const width = board[0].length;

  const cell = board[fromY][fromX];
  if (!cell) return [];

  const { side, type } = cell;
  const rule = RULES[type];
  const moves = [];

  // スライド（角/飛/香、UMA/RYUOのスライド部）
  if (rule.slideDirs) {
    for (const dir of rule.slideDirs) {
      const [dxBase, dyBase] = dir;
      const [dx, dy] = orient([dxBase, dyBase], side);
      let x = fromX + dx;
      let y = fromY + dy;
      while (inside(x, y, width, height)) {
        if (allyAt(board, x, y, side)) break;
        moves.push({ from: { x: fromX, y: fromY }, to: { x, y }, piece: type, capture: !!enemyAt(board, x, y, side) });
        if (enemyAt(board, x, y, side)) break; // 相手駒を取ったら停止
        x += dx; y += dy;
      }
    }
  }

  // 一歩系（王/金/銀、UMA/RYUOの一歩部、成り金グループ、歩）
  if (rule.stepDirs) {
    for (const dir of rule.stepDirs) {
      const [dxBase, dyBase] = dir;
      const [dx, dy] = orient([dxBase, dyBase], side);
      const x = fromX + dx;
      const y = fromY + dy;
      if (inside(x, y, width, height) && !allyAt(board, x, y, side)) {
        moves.push({ from: { x: fromX, y: fromY }, to: { x, y }, piece: type, capture: !!enemyAt(board, x, y, side) });
      }
    }
  }

  // 桂馬ジャンプ
  if (rule.knightJumps) {
    for (const [dxBase, dyBase] of rule.knightJumps) {
      const [dx, dy] = orient([dxBase, dyBase], side);
      const x = fromX + dx;
      const y = fromY + dy;
      if (inside(x, y, width, height) && !allyAt(board, x, y, side)) {
        moves.push({ from: { x: fromX, y: fromY }, to: { x, y }, piece: type, capture: !!enemyAt(board, x, y, side) });
      }
    }
  }

  return moves;
}

/**
 * 盤全体の擬似合法手（side側のみ）を生成
 * @param {{side:Side,type:PieceType}[][]} board
 * @param {Side} side
 * @returns {Move[]}
 */
export function generatePseudoLegalMoves(board, side) {
  const height = board.length;
  const width = board[0].length;
  /** @type {Move[]} */
  const all = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = board[y][x];
      if (c && c.side === side) {
        all.push(...generatePseudoLegalMovesForSquare(board, x, y));
      }
    }
  }
  return all;
}

// ─────────────────────────────────────────────────────────────
// 使い方（例）:
//
// const emptyRow = Array.from({length:9}, () => null);
// const board = Array.from({length:9}, () => emptyRow.map(()=>null));
//
// // 先手の歩を(4,2)、後手の歩を(4,6) に置く（y増加は上方向）
// board[2][4] = { side:'SENTE', type:'FUHYO' };
// board[6][4] = { side:'GOTE',  type:'FUHYO' };
//
// // 先手の手を生成
// const moves = generatePseudoLegalMoves(board, 'SENTE');
// console.log(moves);
// ─────────────────────────────────────────────────────────────
