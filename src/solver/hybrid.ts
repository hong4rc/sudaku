import type { Board } from '../board.js';
import type { ISolver } from './solver.js';
import { BitmaskSolver } from './bitmask.js';
import { DLXSolver } from './dlx.js';

/**
 * Strategy Pattern — HybridSolver.
 *
 * Selects the best strategy based on board state:
 *   - Propagate constraints first
 *   - < 20 empties → BitmaskSolver (lower overhead)
 *   - >= 20 empties → DLXSolver (better asymptotic)
 */
const DLX_THRESHOLD = 20;

export class HybridSolver implements ISolver {
  private readonly bitmask = new BitmaskSolver();
  private readonly dlx = new DLXSolver();

  solve(board: Board): Board | null {
    const b = board.clone();
    if (!b.propagate()) return null;
    if (b.isSolved()) return b;
    return this.pick(b).solve(b);
  }

  countSolutions(board: Board, limit: number): number {
    const b = board.clone();
    if (!b.propagate()) return 0;
    if (b.isSolved()) return 1;
    return this.pick(b).countSolutions(b, limit);
  }

  private pick(board: Board): ISolver {
    return board.emptyCount() < DLX_THRESHOLD ? this.bitmask : this.dlx;
  }
}

// Singleton + backward-compatible exports
const solver = new HybridSolver();
export const solve = (board: Board) => solver.solve(board);
export const countSolutions = (board: Board, limit: number) => solver.countSolutions(board, limit);
export const hasUniqueSolution = (board: Board) => solver.countSolutions(board, 2) === 1;
