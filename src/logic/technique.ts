import type { LogicBoard } from './logic-board.js';

/**
 * Chain of Responsibility — ITechnique interface.
 *
 * Each technique handler:
 *   1. Scans the board for its pattern
 *   2. Returns TechniqueResult if found, null otherwise
 *   3. Does NOT mutate the board
 */

export enum DifficultyLevel { Easy = 1, Medium = 2, Hard = 3, Expert = 4, Evil = 5 }

export interface CellRef { cell: number; row: number; col: number; }
export interface Elimination { cell: CellRef; digit: number; }
export interface Placement { cell: CellRef; digit: number; }

export interface TechniqueResult {
  technique: string;
  difficulty: DifficultyLevel;
  eliminations: Elimination[];
  placements: Placement[];
  primaryCells: CellRef[];
  secondaryCells: CellRef[];
  explanation: string;
}

export interface ITechnique {
  readonly name: string;
  readonly difficulty: DifficultyLevel;
  apply(board: LogicBoard): TechniqueResult | null;
}
