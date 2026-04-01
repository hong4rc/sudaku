import type { Board } from '../board.js';

/**
 * Strategy Pattern — ISolver interface.
 *
 * Two concrete strategies:
 *   - BitmaskSolver: constraint propagation + MRV backtracking (fast for few empties)
 *   - DLXSolver: Dancing Links exact cover (fast for many empties)
 *
 * HybridSolver selects strategy automatically based on board state.
 */
export interface ISolver {
  solve(board: Board): Board | null;
  countSolutions(board: Board, limit: number): number;
}
