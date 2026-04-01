import type { Board } from '../board.js';
import { ctz } from '../board.js';
import type { ISolver } from './solver.js';

/**
 * Strategy Pattern — BitmaskSolver.
 *
 * Constraint propagation + MRV (Minimum Remaining Values) backtracking.
 * Best for boards with few empty cells (< 20).
 */
export class BitmaskSolver implements ISolver {
  solve(board: Board): Board | null {
    const b = board.clone();
    if (!b.propagate()) return null;
    if (b.isSolved()) return b;
    return this.backtrack(b);
  }

  countSolutions(board: Board, limit: number): number {
    const b = board.clone();
    if (!b.propagate()) return 0;
    if (b.isSolved()) return 1;
    const ref = { count: 0 };
    this.countBacktrack(b, limit, ref);
    return ref.count;
  }

  private countBacktrack(board: Board, limit: number, ref: { count: number }): void {
    const mrv = board.mrvCell();
    if (!mrv) { if (board.isSolved()) ref.count++; return; }
    const [index, candidates] = mrv;

    let cands = candidates;
    while (cands !== 0 && ref.count < limit) {
      const bit = cands & (-cands);
      const digit = ctz(bit);
      cands &= cands - 1;

      const b = board.clone();
      if (b.place(index, digit) && b.propagate()) {
        if (b.isSolved()) {
          ref.count++;
          if (ref.count >= limit) return;
        } else {
          this.countBacktrack(b, limit, ref);
        }
      }
    }
  }

  private backtrack(board: Board): Board | null {
    const mrv = board.mrvCell();
    if (!mrv) return board.isSolved() ? board : null;
    const [index, candidates] = mrv;

    let cands = candidates;
    while (cands !== 0) {
      const bit = cands & (-cands);
      const digit = ctz(bit);
      cands &= cands - 1;

      const b = board.clone();
      if (b.place(index, digit) && b.propagate()) {
        if (b.isSolved()) return b;
        const result = this.backtrack(b);
        if (result) return result;
      }
    }
    return null;
  }
}

// Singleton for backward compatibility
const solver = new BitmaskSolver();
export const solve = (board: Board) => solver.solve(board);
export const countSolutionsBoard = (board: Board, limit: number) => solver.countSolutions(board, limit);
