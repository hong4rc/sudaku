/**
 * Board — High-performance Sudoku board with bitmask candidates.
 *
 * Performance:
 *   - Uint8Array for cells, Uint16Array for candidates/masks
 *   - Bitwise operations for candidate manipulation
 *   - Inline constraint propagation on place()
 */

const ALL: number = 0x3fe; // bits 1-9

// Pre-computed lookup tables (computed once at module load)
const ROW = new Uint8Array(81);
const COL = new Uint8Array(81);
const BOX = new Uint8Array(81);
const PEERS: readonly (readonly number[])[] = buildPeers();

for (let i = 0; i < 81; i++) {
  ROW[i] = (i / 9) | 0;
  COL[i] = i % 9;
  BOX[i] = (((i / 9) | 0) / 3 | 0) * 3 + (((i % 9) / 3) | 0);
}

function buildPeers(): number[][] {
  const peers: number[][] = [];
  for (let i = 0; i < 81; i++) {
    const set = new Set<number>();
    const r = (i / 9) | 0, c = i % 9;
    const br = ((r / 3) | 0) * 3, bc = ((c / 3) | 0) * 3;
    for (let j = 0; j < 9; j++) {
      set.add(r * 9 + j);
      set.add(j * 9 + c);
      set.add((br + ((j / 3) | 0)) * 9 + bc + (j % 3));
    }
    set.delete(i);
    peers.push([...set]);
  }
  return peers;
}

export { ROW, COL, BOX, PEERS, ALL };

export class Board {
  cells: Uint8Array;
  candidates: Uint16Array;
  rowUsed: Uint16Array;
  colUsed: Uint16Array;
  boxUsed: Uint16Array;

  constructor() {
    this.cells = new Uint8Array(81);
    this.candidates = new Uint16Array(81).fill(ALL);
    this.rowUsed = new Uint16Array(9);
    this.colUsed = new Uint16Array(9);
    this.boxUsed = new Uint16Array(9);
  }

  static fromString(puzzle: string): Board {
    const b = new Board();
    let idx = 0;

    // Pass 1: load givens, no propagation
    for (let i = 0; i < puzzle.length && idx < 81; i++) {
      const ch = puzzle.charCodeAt(i);
      if (ch >= 49 && ch <= 57) { // '1'-'9'
        const d = ch - 48;
        const r = ROW[idx], c = COL[idx], bx = BOX[idx];
        const bit = 1 << d;
        if ((b.rowUsed[r] | b.colUsed[c] | b.boxUsed[bx]) & bit) {
          throw new Error('Invalid puzzle: conflicting placement');
        }
        b.cells[idx] = d;
        b.candidates[idx] = 0;
        b.rowUsed[r] |= bit;
        b.colUsed[c] |= bit;
        b.boxUsed[bx] |= bit;
        idx++;
      } else if (ch === 48 || ch === 46) { // '0' or '.'
        idx++;
      }
    }

    if (idx !== 81) throw new Error(`Invalid puzzle: expected 81 cells, got ${idx}`);

    // Pass 2: compute candidates
    for (let i = 0; i < 81; i++) {
      if (b.cells[i] !== 0) continue;
      b.candidates[i] = ALL & ~b.rowUsed[ROW[i]] & ~b.colUsed[COL[i]] & ~b.boxUsed[BOX[i]];
    }

    return b;
  }

  /** Place digit with full constraint propagation (auto naked singles). */
  place(index: number, digit: number): boolean {
    const r = ROW[index], c = COL[index], bx = BOX[index];
    const bit = 1 << digit;
    if ((this.rowUsed[r] | this.colUsed[c] | this.boxUsed[bx]) & bit) return false;

    this.cells[index] = digit;
    this.candidates[index] = 0;
    this.rowUsed[r] |= bit;
    this.colUsed[c] |= bit;
    this.boxUsed[bx] |= bit;

    // Eliminate from peers
    const peers = PEERS[index];
    for (let p = 0; p < peers.length; p++) {
      const pi = peers[p];
      if (this.cells[pi] !== 0) continue;
      const cands = this.candidates[pi];
      if ((cands & bit) === 0) continue;

      const newCands = cands & ~bit;
      this.candidates[pi] = newCands;
      if (newCands === 0) return false; // contradiction

      // Auto naked single
      if ((newCands & (newCands - 1)) === 0) {
        if (!this.place(pi, ctz(newCands))) return false;
      }
    }
    return true;
  }

  /** Hidden singles propagation across all houses. Returns false on contradiction. */
  propagate(): boolean {
    let changed = true;
    while (changed) {
      changed = false;
      for (let h = 0; h < 27; h++) {
        const indices = HOUSE_INDICES[h];
        for (let d = 1; d <= 9; d++) {
          const bit = 1 << d;
          let count = 0, lastPos = 0;
          for (let k = 0; k < 9; k++) {
            const idx = indices[k];
            if (this.cells[idx] === d) { count = 10; break; }
            if (this.candidates[idx] & bit) { count++; lastPos = idx; }
          }
          if (count === 0) return false;
          if (count === 1) {
            changed = true;
            if (!this.place(lastPos, d)) return false;
          }
        }
      }
    }
    return true;
  }

  isSolved(): boolean {
    for (let i = 0; i < 81; i++) if (this.cells[i] === 0) return false;
    return true;
  }

  emptyCount(): number {
    let n = 0;
    for (let i = 0; i < 81; i++) if (this.cells[i] === 0) n++;
    return n;
  }

  /** MRV: find empty cell with fewest candidates. */
  mrvCell(): [number, number] | null {
    let bestIdx = -1, bestCount = 10, bestCands = 0;
    for (let i = 0; i < 81; i++) {
      if (this.cells[i] !== 0) continue;
      const c = popcount(this.candidates[i]);
      if (c < bestCount) {
        bestCount = c; bestIdx = i; bestCands = this.candidates[i];
        if (c === 2) break;
      }
    }
    return bestIdx === -1 ? null : [bestIdx, bestCands];
  }

  clone(): Board {
    const b = new Board();
    b.cells.set(this.cells);
    b.candidates.set(this.candidates);
    b.rowUsed.set(this.rowUsed);
    b.colUsed.set(this.colUsed);
    b.boxUsed.set(this.boxUsed);
    return b;
  }

  toString(): string {
    let s = '';
    for (let i = 0; i < 81; i++) s += this.cells[i];
    return s;
  }
}

// Pre-computed house indices: 0-8 rows, 9-17 cols, 18-26 boxes
const HOUSE_INDICES: number[][] = [];
for (let r = 0; r < 9; r++) {
  const h: number[] = [];
  for (let c = 0; c < 9; c++) h.push(r * 9 + c);
  HOUSE_INDICES.push(h);
}
for (let c = 0; c < 9; c++) {
  const h: number[] = [];
  for (let r = 0; r < 9; r++) h.push(r * 9 + c);
  HOUSE_INDICES.push(h);
}
for (let b = 0; b < 9; b++) {
  const h: number[] = [];
  const sr = ((b / 3) | 0) * 3, sc = (b % 3) * 3;
  for (let dr = 0; dr < 3; dr++)
    {for (let dc = 0; dc < 3; dc++)
      {h.push((sr + dr) * 9 + sc + dc);}}
  HOUSE_INDICES.push(h);
}

export { HOUSE_INDICES };

// Bit utilities
export function popcount(v: number): number {
  let n = v - ((v >> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  return ((n + (n >> 4)) & 0x0f0f0f0f) * 0x01010101 >> 24;
}

export function ctz(v: number): number {
  if (v === 0) return 32;
  return 31 - Math.clz32(v & -v);
}

export function maskDigits(mask: number): number[] {
  const digits: number[] = [];
  for (let d = 1; d <= 9; d++) if (mask & (1 << d)) digits.push(d);
  return digits;
}

export function formatCandidates(mask: number): string {
  return `{${maskDigits(mask).join(',')}}`;
}
