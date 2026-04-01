import { describe, it, expect } from 'vitest';
import { Board, ROW, COL, BOX, PEERS, HOUSE_INDICES, ALL, popcount, ctz, maskDigits, formatCandidates } from '../src/board.js';

const EASY = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

describe('Board', () => {
  it('parses a valid puzzle', () => {
    const b = Board.fromString(EASY);
    expect(b.cells[0]).toBe(5);
    expect(b.cells[1]).toBe(3);
    expect(b.cells[2]).toBe(0);
    expect(b.toString().length).toBe(81);
  });

  it('rejects conflicting puzzle', () => {
    const bad = '550070000600195000098000060800060003400803001700020006060000280000419005000080079';
    expect(() => Board.fromString(bad)).toThrow('conflicting');
  });

  it('rejects wrong length', () => {
    expect(() => Board.fromString('12345')).toThrow('expected 81');
  });

  it('computes candidates correctly', () => {
    const b = Board.fromString(EASY);
    expect(b.candidates[0]).toBe(0); // filled cell
    expect(b.candidates[2]).not.toBe(0); // empty cell has candidates
    // Cell 2 (R1C3) can't be 5,3 (row), 6,9,8,7 (col/box peers)
    const cands = maskDigits(b.candidates[2]);
    expect(cands).not.toContain(5);
    expect(cands).not.toContain(3);
  });

  it('place() propagates constraints', () => {
    const b = Board.fromString(EASY);
    const before = b.candidates[3]; // R1C4
    b.place(2, 4); // place 4 at R1C3
    expect(b.cells[2]).toBe(4);
    expect(b.candidates[2]).toBe(0);
    // 4 removed from R1C4 candidates (same row)
    expect(b.candidates[3] & (1 << 4)).toBe(0);
  });

  it('propagate() resolves hidden singles', () => {
    const b = Board.fromString(EASY);
    b.propagate();
    expect(b.emptyCount()).toBeLessThan(51);
  });

  it('isSolved() returns false for incomplete', () => {
    expect(Board.fromString(EASY).isSolved()).toBe(false);
  });

  it('clone() creates independent copy', () => {
    const a = Board.fromString(EASY);
    const b = a.clone();
    b.place(2, 4);
    expect(a.cells[2]).toBe(0);
    expect(b.cells[2]).toBe(4);
  });

  it('mrvCell() returns cell with fewest candidates', () => {
    const b = Board.fromString(EASY);
    const mrv = b.mrvCell();
    expect(mrv).not.toBeNull();
    const [idx, cands] = mrv!;
    expect(b.cells[idx]).toBe(0);
    expect(popcount(cands)).toBeGreaterThanOrEqual(1);
  });

  it('toString() roundtrips', () => {
    const b = Board.fromString(EASY);
    expect(b.toString()).toBe(EASY);
  });
});

describe('Lookup tables', () => {
  it('ROW/COL/BOX are correct for known cells', () => {
    expect(ROW[0]).toBe(0);
    expect(COL[0]).toBe(0);
    expect(BOX[0]).toBe(0);
    expect(ROW[80]).toBe(8);
    expect(COL[80]).toBe(8);
    expect(BOX[80]).toBe(8);
    expect(ROW[9]).toBe(1);
    expect(COL[9]).toBe(0);
  });

  it('PEERS has 20 peers per cell', () => {
    for (let i = 0; i < 81; i++) {
      expect(PEERS[i].length).toBe(20);
      expect(PEERS[i]).not.toContain(i);
    }
  });

  it('HOUSE_INDICES has 27 houses of 9 cells', () => {
    expect(HOUSE_INDICES.length).toBe(27);
    for (const h of HOUSE_INDICES) {
      expect(h.length).toBe(9);
    }
  });

  it('ALL is 0x3FE (bits 1-9)', () => {
    expect(ALL).toBe(0x3fe);
  });
});

describe('Bit utilities', () => {
  it('popcount counts bits', () => {
    expect(popcount(0)).toBe(0);
    expect(popcount(0b10)).toBe(1);
    expect(popcount(0b1010)).toBe(2);
    expect(popcount(ALL)).toBe(9);
  });

  it('ctz finds trailing zeros', () => {
    expect(ctz(1)).toBe(0);
    expect(ctz(2)).toBe(1);
    expect(ctz(8)).toBe(3);
    expect(ctz(1 << 5)).toBe(5);
  });

  it('maskDigits extracts digits', () => {
    expect(maskDigits((1 << 3) | (1 << 7))).toEqual([3, 7]);
    expect(maskDigits(0)).toEqual([]);
    expect(maskDigits(ALL)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('formatCandidates formats as set', () => {
    expect(formatCandidates((1 << 3) | (1 << 7))).toBe('{3,7}');
  });
});
