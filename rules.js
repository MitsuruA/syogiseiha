import { generatePseudoLegalMoves } from './movement.js';

const PIECE = {
  FUHYO: 'FUHYO',
  KYOSHA: 'KYOSHA',
  KEIMA: 'KEIMA',
  GINSHO: 'GINSHO',
  KINSHO: 'KINSHO',
  KAKUGYO: 'KAKUGYO',
  HISHA: 'HISHA',
  OSHO: 'OSHO',
  TOKIN: 'TOKIN',
  NARIKYOSHA: 'NARIKYOSHA',
  NARIKEIMA: 'NARIKEIMA',
  NARIGINSHO: 'NARIGINSHO',
  RYUMA: 'RYUMA',
  RYUO: 'RYUO'
};

function boardSize(board) {
  const height = board.length;
  const width = height > 0 ? board[0].length : 0;
  return { width, height };
}

function cloneBoard(board) {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

function opposite(side) {
  return side === 'SENTE' ? 'GOTE' : 'SENTE';
}

function squareEmpty(board, x, y) {
  return !board[y][x];
}

function isLastRank(y, side, height) {
  if (side === 'SENTE') {
    return y === 0;
  }
  return y === height - 1;
}

function isLastTwoRanks(y, side, height) {
  if (side === 'SENTE') {
    return y <= 1;
  }
  return y >= height - 2;
}

function hasUnpromotedPawnOnFile(board, side, fileX) {
  const { height } = boardSize(board);
  for (let y = 0; y < height; y++) {
    const c = board[y][fileX];
    if (c && c.side === side && c.type === PIECE.FUHYO) return true;
  }
  return false;
}

function validateDropConstraints(board, move, side) {
  if (!move.drop) return { ok: true };

  const { height } = boardSize(board);
  const { x, y } = move.to;
  const pt = move.piece;

  if (!squareEmpty(board, x, y)) {
    return { ok: false, reason: 'occupied' };
  }

  if (pt === PIECE.FUHYO || pt === PIECE.KYOSHA) {
    if (isLastRank(y, side, height)) return { ok: false, reason: 'drop_last_rank' };
  }
  if (pt === PIECE.KEIMA) {
    if (isLastTwoRanks(y, side, height)) return { ok: false, reason: 'drop_last_two_ranks' };
  }

  if (pt === PIECE.FUHYO) {
    if (hasUnpromotedPawnOnFile(board, side, x)) {
      return { ok: false, reason: 'nifu' };
    }
  }

  if (pt === PIECE.OSHO) {
    return { ok: false, reason: 'drop_king_forbidden' };
  }

  return { ok: true };
}

function applyMove(board, move, side) {
  const next = cloneBoard(board);

  if (move.drop) {
    const { x, y } = move.to;
    next[y][x] = { side, type: move.piece };
    return next;
  }

  if (!move.from) {
    throw new Error('move.from is required for non-drop moves');
  }

  const { x: fromX, y: fromY } = move.from;
  const moving = next[fromY][fromX];
  if (!moving) {
    throw new Error('No piece at move.from');
  }
  const { x: toX, y: toY } = move.to;

  next[fromY][fromX] = null;

  const promoteTo = move.promoteTo ?? null;
  const finalType = promoteTo || moving.type;
  next[toY][toX] = { side: moving.side, type: finalType };

  return next;
}

function findKing(board, side) {
  const { width, height } = boardSize(board);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = board[y][x];
      if (cell && cell.side === side && cell.type === PIECE.OSHO) {
        return { x, y };
      }
    }
  }
  return null;
}

function inCheck(board, side) {
  const kingPos = findKing(board, side);
  if (!kingPos) {
    return true;
  }
  const opponent = opposite(side);
  const pseudo = generatePseudoLegalMoves(board, opponent);
  return pseudo.some(mv => mv.to.x === kingPos.x && mv.to.y === kingPos.y);
}

function isPawnDropCheckmate(boardAfterPawnDrop, attackerSide) {
  const defender = opposite(attackerSide);
  if (!inCheck(boardAfterPawnDrop, defender)) return false;

  const pseudo = generatePseudoLegalMoves(boardAfterPawnDrop, defender);
  for (const m of pseudo) {
    const nb = applyMove(boardAfterPawnDrop, m, defender);
    if (!inCheck(nb, defender)) return false;
  }
  return true;
}

function filterIllegalMoves(board, moves, side) {
  const legal = [];
  for (const mv of moves) {
    if (mv.drop) {
      const dr = validateDropConstraints(board, mv, side);
      if (!dr.ok) continue;
    }

    const after = applyMove(board, mv, side);
    if (inCheck(after, side)) continue;

    if (mv.drop && mv.piece === PIECE.FUHYO) {
      if (isPawnDropCheckmate(after, side)) continue;
    }

    legal.push(mv);
  }
  return legal;
}

export {
  PIECE,
  filterIllegalMoves,
  inCheck,
  validateDropConstraints,
  isPawnDropCheckmate,
  applyMove,
  cloneBoard,
  opposite
};
