import { Board } from './board.js';
import * as hybrid from './solver/hybrid.js';
import { LogicBoard } from './logic/logic-board.js';
import { solveLogic } from './logic/techniques.js';

// Simple xorshift64 PRNG
class Rng {
  private hi: number;
  private lo: number;

  constructor(seed: number) {
    this.hi = (seed >>> 16) | 0x12345678;
    this.lo = (seed & 0xffff) | 0xDEADBEEF;
  }

  next(): number {
    const t = this.hi ^ (this.hi << 5);
    this.hi = this.lo;
    this.lo = ((this.lo >>> 1) ^ (this.lo >>> 3)) ^ (t ^ (t >>> 13));
    return (this.lo >>> 0) & 0x7fffffff;
  }

  range(n: number): number {
    return this.next() % n;
  }

  shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.range(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}

export function generateFilled(seed: number): Board {
  const rng = new Rng(seed);
  const board = new Board();

  // Fill diagonal boxes (independent of each other)
  for (const bx of [0, 4, 8]) {
    const sr = ((bx / 3) | 0) * 3, sc = (bx % 3) * 3;
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    rng.shuffle(digits);
    let k = 0;
    for (let dr = 0; dr < 3; dr++)
      {for (let dc = 0; dc < 3; dc++)
        {board.place((sr + dr) * 9 + sc + dc, digits[k++]);}}
  }

  const solved = hybrid.solve(board);
  if (!solved) return generateFilled(seed + 1); // retry
  return solved;
}

export interface GenerateOptions {
  minClues?: number;
  symmetric?: boolean;
  seed?: number;
  /** Target difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'evil'. Retries until match. */
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert' | 'evil';
  /** Max retries for difficulty targeting (default 50) */
  maxRetries?: number;
}

export interface GenerateResult {
  puzzle: string;
  solution: string;
}

export function generate(options: GenerateOptions = {}): GenerateResult {
  const { minClues = 25, symmetric = true, seed = Date.now() } = options;
  const rng = new Rng(seed);
  const filled = generateFilled(seed);
  const solution = filled.toString();

  // Copy cells for removal
  const cells = new Uint8Array(filled.cells);
  const min = Math.max(17, minClues);

  // Random removal order
  const order = Array.from({ length: 81 }, (_, i) => i);
  rng.shuffle(order);

  let clueCount = 81;

  for (const idx of order) {
    if (clueCount <= min) break;
    if (cells[idx] === 0) continue;

    const saved = cells[idx];
    const symIdx = 80 - idx;

    if (symmetric && idx !== symIdx && cells[symIdx] === 0) continue;

    cells[idx] = 0;
    let removed = 1;

    if (symmetric && idx !== symIdx && cells[symIdx] !== 0) {
      cells[symIdx] = 0;
      removed = 2;
    }

    // Check uniqueness
    let puzzleStr = '';
    for (let i = 0; i < 81; i++) puzzleStr += cells[i];

    try {
      const testBoard = Board.fromString(puzzleStr);
      if (hybrid.countSolutions(testBoard, 2) === 1) {
        clueCount -= removed;
        continue;
      }
    } catch { /* invalid state */ }

    // Restore
    cells[idx] = saved;
    if (symmetric && removed === 2) cells[symIdx] = filled.cells[symIdx];
  }

  let puzzle = '';
  for (let i = 0; i < 81; i++) puzzle += cells[i];

  return { puzzle, solution };
}

/** Generate with difficulty targeting. */
export function generateWithDifficulty(options: GenerateOptions = {}): GenerateResult {
  const { difficulty: target, maxRetries = 50, ...rest } = options;
  if (!target) return generate(rest);

  const diffMap: Record<string, [number, number]> = {
    easy: [0, 19], medium: [20, 39], hard: [40, 59], expert: [60, 79], evil: [80, 100],
  };
  const clueMap: Record<string, number> = {
    easy: 36, medium: 30, hard: 26, expert: 23, evil: 20,
  };
  const [minScore, maxScore] = diffMap[target];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = generate({ ...rest, seed: (rest.seed ?? Date.now()) + attempt, minClues: clueMap[target] ?? 25 });

    try {
      const board = LogicBoard.fromPuzzle(result.puzzle);
      const { solved, steps } = solveLogic(board);
      let maxDiff = 1;
      for (const step of steps) if (step.difficulty > maxDiff) maxDiff = step.difficulty;
      if (!solved) maxDiff = 5;

      const base = [0, 0, 20, 40, 60, 80][maxDiff];
      const score = Math.min(100, base + Math.min(10, (steps.length / 10) | 0));

      if (score >= minScore && score <= maxScore) return result;
    } catch { continue; }
  }

  // Fallback: return last attempt
  return generate({ ...rest, minClues: clueMap[target] ?? 25 });
}

/** Generate multiple puzzles at once. */
export function generateBatch(count: number, options: GenerateOptions = {}): GenerateResult[] {
  const results: GenerateResult[] = [];
  const baseSeed = options.seed ?? Date.now();
  const fn = options.difficulty ? generateWithDifficulty : generate;
  for (let i = 0; i < count; i++) {
    results.push(fn({ ...options, seed: baseSeed + i * 1000 }));
  }
  return results;
}
