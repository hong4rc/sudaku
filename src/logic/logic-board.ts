import { ALL, ROW, COL, BOX } from '../board.js';

/**
 * LogicBoard — No auto-propagation. Each deduction attributed to a technique.
 */
export class LogicBoard {
  cells: Uint8Array;
  candidates: Uint16Array;

  constructor(cells?: Uint8Array, candidates?: Uint16Array) {
    this.cells = cells ? new Uint8Array(cells) : new Uint8Array(81);
    this.candidates = candidates ? new Uint16Array(candidates) : new Uint16Array(81);
  }

  static fromPuzzle(puzzle: string): LogicBoard {
    const cells = new Uint8Array(81);
    let idx = 0;
    for (let i = 0; i < puzzle.length && idx < 81; i++) {
      const ch = puzzle.charCodeAt(i);
      if (ch >= 49 && ch <= 57) { cells[idx++] = ch - 48; }
      else if (ch === 48 || ch === 46) { idx++; }
    }
    if (idx !== 81) throw new Error('Expected 81 cells');

    const candidates = new Uint16Array(81);
    for (let i = 0; i < 81; i++) {
      if (cells[i] !== 0) continue;
      const r = ROW[i], c = COL[i], bx = BOX[i];
      let mask = ALL;
      // Scan peers
      for (let j = 0; j < 9; j++) {
        const d1 = cells[r * 9 + j]; if (d1) mask &= ~(1 << d1);
        const d2 = cells[j * 9 + c]; if (d2) mask &= ~(1 << d2);
      }
      const sr = ((bx / 3) | 0) * 3, sc = (bx % 3) * 3;
      for (let dr = 0; dr < 3; dr++)
        {for (let dc = 0; dc < 3; dc++) {
          const d = cells[(sr + dr) * 9 + sc + dc];
          if (d) mask &= ~(1 << d);
        }}
      candidates[i] = mask;
    }

    return new LogicBoard(cells, candidates);
  }

  place(index: number, digit: number): void {
    this.cells[index] = digit;
    this.candidates[index] = 0;
    const bit = 1 << digit;
    const r = ROW[index], c = COL[index];
    const sr = ((r / 3) | 0) * 3, sc = ((c / 3) | 0) * 3;
    for (let j = 0; j < 9; j++) {
      this.candidates[r * 9 + j] &= ~bit;
      this.candidates[j * 9 + c] &= ~bit;
    }
    for (let dr = 0; dr < 3; dr++)
      {for (let dc = 0; dc < 3; dc++)
        {this.candidates[(sr + dr) * 9 + sc + dc] &= ~bit;}}
  }

  eliminate(index: number, digit: number): boolean {
    const bit = 1 << digit;
    if ((this.candidates[index] & bit) === 0) return false;
    this.candidates[index] &= ~bit;
    return true;
  }

  isSolved(): boolean {
    for (let i = 0; i < 81; i++) if (this.cells[i] === 0) return false;
    return true;
  }

  clone(): LogicBoard {
    return new LogicBoard(this.cells, this.candidates);
  }

  toString(): string {
    let s = '';
    for (let i = 0; i < 81; i++) s += this.cells[i];
    return s;
  }
}
