import type { Board } from '../board.js';
import { ROW, COL, BOX } from '../board.js';
import type { ISolver } from './solver.js';

/**
 * Strategy Pattern — DLXSolver.
 *
 * Dancing Links (Algorithm X) for Exact Cover.
 * Flat Uint16Array nodes for cache efficiency.
 * Best for boards with many empty cells (>= 20).
 */

const MAX_NODES = 4096;

class DLXMatrix {
  private left: Uint16Array;
  private right: Uint16Array;
  private up: Uint16Array;
  private down: Uint16Array;
  private col: Uint16Array;
  private rowId: Uint16Array;
  private size: Uint16Array;
  private nodeCount: number;
  private solution: number[];

  constructor() {
    this.left = new Uint16Array(MAX_NODES);
    this.right = new Uint16Array(MAX_NODES);
    this.up = new Uint16Array(MAX_NODES);
    this.down = new Uint16Array(MAX_NODES);
    this.col = new Uint16Array(MAX_NODES);
    this.rowId = new Uint16Array(MAX_NODES);
    this.size = new Uint16Array(325);
    this.nodeCount = 0;
    this.solution = [];
  }

  static fromBoard(board: Board): DLXMatrix {
    const dlx = new DLXMatrix();
    dlx.initHeaders();

    for (let cell = 0; cell < 81; cell++) {
      if (board.cells[cell] !== 0) continue;
      const r = ROW[cell], c = COL[cell], bx = BOX[cell];
      const cands = board.candidates[cell];
      for (let d = 1; d <= 9; d++) {
        if ((cands & (1 << d)) === 0) continue;
        const di = d - 1;
        dlx.addRow(cell * 9 + di, [cell + 1, r * 9 + di + 82, c * 9 + di + 163, bx * 9 + di + 244]);
      }
    }

    for (let cell = 0; cell < 81; cell++) {
      if (board.cells[cell] === 0) continue;
      const d = board.cells[cell], di = d - 1;
      dlx.cover(cell + 1);
      dlx.cover(ROW[cell] * 9 + di + 82);
      dlx.cover(COL[cell] * 9 + di + 163);
      dlx.cover(BOX[cell] * 9 + di + 244);
    }

    return dlx;
  }

  private initHeaders(): void {
    this.left[0] = 324; this.right[0] = 1; this.up[0] = 0; this.down[0] = 0; this.col[0] = 0;
    for (let c = 1; c <= 324; c++) {
      this.left[c] = c - 1;
      this.right[c] = c === 324 ? 0 : c + 1;
      this.up[c] = c; this.down[c] = c; this.col[c] = c; this.size[c] = 0;
    }
    this.nodeCount = 325;
  }

  private addRow(rowId: number, columns: number[]): void {
    const first = this.nodeCount;
    const len = columns.length;
    for (let i = 0; i < len; i++) {
      const ni = this.nodeCount;
      const c = columns[i];
      const prevUp = this.up[c];
      this.left[ni] = i === 0 ? first + len - 1 : ni - 1;
      this.right[ni] = i === len - 1 ? first : ni + 1;
      this.up[ni] = prevUp; this.down[ni] = c; this.col[ni] = c; this.rowId[ni] = rowId;
      this.down[prevUp] = ni; this.up[c] = ni; this.size[c]++;
      this.nodeCount++;
    }
  }

  private cover(c: number): void {
    this.right[this.left[c]] = this.right[c];
    this.left[this.right[c]] = this.left[c];
    let rowNode = this.down[c];
    while (rowNode !== c) {
      let j = this.right[rowNode];
      while (j !== rowNode) {
        this.down[this.up[j]] = this.down[j]; this.up[this.down[j]] = this.up[j]; this.size[this.col[j]]--;
        j = this.right[j];
      }
      rowNode = this.down[rowNode];
    }
  }

  private uncover(c: number): void {
    let rowNode = this.up[c];
    while (rowNode !== c) {
      let j = this.left[rowNode];
      while (j !== rowNode) {
        this.size[this.col[j]]++; this.up[this.down[j]] = j; this.down[this.up[j]] = j;
        j = this.left[j];
      }
      rowNode = this.up[rowNode];
    }
    this.right[this.left[c]] = c; this.left[this.right[c]] = c;
  }

  private chooseColumn(): number {
    let best = this.right[0];
    if (best === 0) return -1;
    let bestSize = this.size[best];
    let c = this.right[best];
    while (c !== 0) {
      if (this.size[c] < bestSize) { bestSize = this.size[c]; best = c; if (bestSize <= 1) break; }
      c = this.right[c];
    }
    return best;
  }

  searchFirst(): boolean {
    const c = this.chooseColumn();
    if (c === -1) return true;
    if (this.size[c] === 0) return false;
    this.cover(c);
    let rowNode = this.down[c];
    while (rowNode !== c) {
      this.solution.push(this.rowId[rowNode]);
      let j = this.right[rowNode];
      while (j !== rowNode) { this.cover(this.col[j]); j = this.right[j]; }
      if (this.searchFirst()) return true;
      this.solution.pop();
      j = this.left[rowNode];
      while (j !== rowNode) { this.uncover(this.col[j]); j = this.left[j]; }
      rowNode = this.down[rowNode];
    }
    this.uncover(c);
    return false;
  }

  countSolutions(limit: number): number {
    let count = 0;
    const countRec = (): void => {
      const c = this.chooseColumn();
      if (c === -1) { count++; return; }
      if (this.size[c] === 0) return;
      this.cover(c);
      let rowNode = this.down[c];
      while (rowNode !== c && count < limit) {
        let j = this.right[rowNode];
        while (j !== rowNode) { this.cover(this.col[j]); j = this.right[j]; }
        countRec();
        j = this.left[rowNode];
        while (j !== rowNode) { this.uncover(this.col[j]); j = this.left[j]; }
        rowNode = this.down[rowNode];
      }
      this.uncover(c);
    };
    countRec();
    return count;
  }

  extractSolution(base: Board): Board {
    const b = base.clone();
    for (const rowId of this.solution) b.cells[(rowId / 9) | 0] = (rowId % 9) + 1;
    return b;
  }
}

export class DLXSolver implements ISolver {
  solve(board: Board): Board | null {
    const dlx = DLXMatrix.fromBoard(board);
    return dlx.searchFirst() ? dlx.extractSolution(board) : null;
  }

  countSolutions(board: Board, limit: number): number {
    return DLXMatrix.fromBoard(board).countSolutions(limit);
  }
}

// Backward-compatible function exports
const solver = new DLXSolver();
export const solve = (board: Board) => solver.solve(board);
export const countSolutions = (board: Board, limit: number) => solver.countSolutions(board, limit);
