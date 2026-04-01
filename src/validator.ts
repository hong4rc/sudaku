import { Board } from './board.js';
import * as hybrid from './solver/hybrid.js';

export interface ValidationError { type: string; cell: number; message: string; }
export interface ValidationResult { valid: boolean; solvable: boolean; unique: boolean; clueCount: number; errors: ValidationError[]; }

export function validate(puzzle: string): ValidationResult {
  const errors: ValidationError[] = [];
  const cells = new Uint8Array(81);
  let clueCount = 0, idx = 0;

  for (let i = 0; i < puzzle.length && idx < 81; i++) {
    const ch = puzzle.charCodeAt(i);
    if (ch >= 49 && ch <= 57) { cells[idx++] = ch - 48; clueCount++; }
    else if (ch === 48 || ch === 46) { idx++; }
  }

  if (idx !== 81) return { valid: false, solvable: false, unique: false, clueCount: 0, errors: [{ type: 'invalid', cell: 0, message: `Expected 81 cells, got ${idx}` }] };

  // Check duplicates
  for (let r = 0; r < 9; r++) {
    const seen = new Uint8Array(10);
    for (let c = 0; c < 9; c++) {
      const d = cells[r * 9 + c];
      if (d === 0) continue;
      if (seen[d]) errors.push({ type: 'duplicate_row', cell: r * 9 + c, message: `Duplicate ${d} in row ${r + 1}` });
      seen[d] = 1;
    }
  }
  for (let c = 0; c < 9; c++) {
    const seen = new Uint8Array(10);
    for (let r = 0; r < 9; r++) {
      const d = cells[r * 9 + c];
      if (d === 0) continue;
      if (seen[d]) errors.push({ type: 'duplicate_col', cell: r * 9 + c, message: `Duplicate ${d} in column ${c + 1}` });
      seen[d] = 1;
    }
  }
  for (let b = 0; b < 9; b++) {
    const seen = new Uint8Array(10);
    const sr = ((b / 3) | 0) * 3, sc = (b % 3) * 3;
    for (let dr = 0; dr < 3; dr++) {for (let dc = 0; dc < 3; dc++) {
      const d = cells[(sr + dr) * 9 + sc + dc];
      if (d === 0) continue;
      if (seen[d]) errors.push({ type: 'duplicate_box', cell: (sr + dr) * 9 + sc + dc, message: `Duplicate ${d} in box ${b + 1}` });
      seen[d] = 1;
    }}
  }

  if (errors.length > 0) return { valid: false, solvable: false, unique: false, clueCount, errors };

  let board: Board;
  try { board = Board.fromString(puzzle); } catch {
    return { valid: false, solvable: false, unique: false, clueCount, errors: [{ type: 'unsolvable', cell: 0, message: 'Conflicting constraints' }] };
  }

  const count = hybrid.countSolutions(board, 2);
  const solvable = count >= 1;
  const unique = count === 1;

  if (!solvable) errors.push({ type: 'unsolvable', cell: 0, message: 'No solution exists' });
  else if (!unique) errors.push({ type: 'not_unique', cell: 0, message: 'Multiple solutions' });

  return { valid: errors.length === 0, solvable, unique, clueCount, errors };
}
