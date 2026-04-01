import { Board, ROW, COL, BOX } from './board.js';
import { LogicBoard } from './logic/logic-board.js';
import { solveLogic, DifficultyLevel } from './logic/techniques.js';
import * as hybrid from './solver/hybrid.js';

/**
 * Puzzle Analysis — Full breakdown of a puzzle.
 */

export interface PuzzleAnalysis {
  /** Original puzzle string */
  puzzle: string;
  /** Number of given clues */
  clueCount: number;
  /** Is the puzzle valid? */
  valid: boolean;
  /** Number of solutions (checked up to 2) */
  solutionCount: number;
  /** Solution string (if unique) */
  solution: string | null;
  /** Symmetry type */
  symmetry: SymmetryType;
  /** Difficulty analysis */
  difficulty: {
    level: DifficultyLevel;
    label: string;
    score: number;
    solvableByLogic: boolean;
  };
  /** Techniques required */
  techniques: {
    name: string;
    count: number;
    difficulty: DifficultyLevel;
  }[];
  /** Total logic steps to solve */
  totalLogicSteps: number;
  /** Solve time (brute force, ms) */
  solveTimeMs: number;
  /** Clue distribution per row/col/box */
  clueDistribution: {
    rows: number[];
    cols: number[];
    boxes: number[];
  };
  /** Empty cells count */
  emptyCells: number;
}

export type SymmetryType =
  | 'rotational-180'
  | 'rotational-90'
  | 'horizontal'
  | 'vertical'
  | 'diagonal'
  | 'none';

export function analyze(puzzle: string): PuzzleAnalysis {
  const cells = new Uint8Array(81);
  let idx = 0;
  for (let i = 0; i < puzzle.length && idx < 81; i++) {
    const ch = puzzle.charCodeAt(i);
    if (ch >= 49 && ch <= 57) cells[idx++] = ch - 48;
    else if (ch === 48 || ch === 46) idx++;
  }

  // Clue count & distribution
  let clueCount = 0;
  const rowClues = new Array(9).fill(0);
  const colClues = new Array(9).fill(0);
  const boxClues = new Array(9).fill(0);

  for (let i = 0; i < 81; i++) {
    if (cells[i] !== 0) {
      clueCount++;
      rowClues[ROW[i]]++;
      colClues[COL[i]]++;
      boxClues[BOX[i]]++;
    }
  }

  // Validity & solution count
  let valid = true;
  let solutionCount = 0;
  let solution: string | null = null;
  let solveTimeMs = 0;

  try {
    const board = Board.fromString(puzzle);
    const t0 = performance.now();
    const solved = hybrid.solve(board);
    solveTimeMs = performance.now() - t0;

    if (solved) {
      solution = solved.toString();
      solutionCount = hybrid.countSolutions(board, 2);
    }
  } catch {
    valid = false;
  }

  // Symmetry detection
  const symmetry = detectSymmetry(puzzle);

  // Logic solve
  let diffLevel = DifficultyLevel.Easy;
  let diffScore = 0;
  let solvableByLogic = false;
  let totalSteps = 0;
  const techniqueCounts = new Map<string, { count: number; difficulty: DifficultyLevel }>();

  try {
    const logicBoard = LogicBoard.fromPuzzle(puzzle);
    const { solved: logicSolved, steps } = solveLogic(logicBoard);
    solvableByLogic = logicSolved;
    totalSteps = steps.length;

    for (const step of steps) {
      const entry = techniqueCounts.get(step.technique);
      if (entry) entry.count++;
      else techniqueCounts.set(step.technique, { count: 1, difficulty: step.difficulty });
      if (step.difficulty > diffLevel) diffLevel = step.difficulty;
    }

    if (!logicSolved) diffLevel = DifficultyLevel.Evil;
    const base = [0, 0, 20, 40, 60, 80][diffLevel];
    const stepBonus = Math.min(10, (steps.length / 10) | 0);
    diffScore = Math.min(100, base + stepBonus);
  } catch { /* invalid puzzle */ }

  const labels = ['', 'Easy', 'Medium', 'Hard', 'Expert', 'Evil'];

  return {
    puzzle,
    clueCount,
    valid,
    solutionCount,
    solution,
    symmetry,
    difficulty: {
      level: diffLevel,
      label: labels[diffLevel],
      score: diffScore,
      solvableByLogic,
    },
    techniques: [...techniqueCounts.entries()].map(([name, { count, difficulty }]) => ({
      name, count, difficulty,
    })),
    totalLogicSteps: totalSteps,
    solveTimeMs: Math.round(solveTimeMs * 1000) / 1000,
    clueDistribution: {
      rows: rowClues,
      cols: colClues,
      boxes: boxClues,
    },
    emptyCells: 81 - clueCount,
  };
}

function detectSymmetry(puzzle: string): SymmetryType {
  const filled = new Uint8Array(81);
  for (let i = 0; i < 81; i++) filled[i] = (puzzle[i] !== '0' && puzzle[i] !== '.') ? 1 : 0;

  // Rotational 180 (point symmetry)
  let rot180 = true;
  for (let i = 0; i < 81; i++) {
    if (filled[i] !== filled[80 - i]) { rot180 = false; break; }
  }

  // Rotational 90
  let rot90 = true;
  for (let r = 0; r < 9; r++) {for (let c = 0; c < 9; c++) {
    if (filled[r * 9 + c] !== filled[c * 9 + (8 - r)]) { rot90 = false; break; }
    if (!rot90) break;
  }}

  // Horizontal (left-right)
  let horiz = true;
  for (let r = 0; r < 9; r++) {for (let c = 0; c < 4; c++) {
    if (filled[r * 9 + c] !== filled[r * 9 + (8 - c)]) { horiz = false; break; }
    if (!horiz) break;
  }}

  // Vertical (top-bottom)
  let vert = true;
  for (let r = 0; r < 4; r++) {for (let c = 0; c < 9; c++) {
    if (filled[r * 9 + c] !== filled[(8 - r) * 9 + c]) { vert = false; break; }
    if (!vert) break;
  }}

  // Diagonal (main diagonal)
  let diag = true;
  for (let r = 0; r < 9; r++) {for (let c = 0; c < 9; c++) {
    if (filled[r * 9 + c] !== filled[c * 9 + r]) { diag = false; break; }
    if (!diag) break;
  }}

  if (rot90) return 'rotational-90';
  if (rot180) return 'rotational-180';
  if (horiz) return 'horizontal';
  if (vert) return 'vertical';
  if (diag) return 'diagonal';
  return 'none';
}

// ---- Rate against top1465 difficulty scale ----

export interface RatingResult {
  /** 0-100 score */
  score: number;
  /** Descriptive rating */
  rating: string;
  /** Comparison to benchmark */
  benchmark: string;
}

/** Convert a numeric score (0-100) to a rating label + benchmark. */
export function scoreToRating(score: number): RatingResult {
  let rating: string;
  let benchmark: string;

  if (score <= 10) { rating = 'Trivial'; benchmark = 'Easier than most newspaper puzzles'; }
  else if (score <= 25) { rating = 'Easy'; benchmark = 'Typical newspaper easy puzzle'; }
  else if (score <= 45) { rating = 'Medium'; benchmark = 'Typical newspaper medium puzzle'; }
  else if (score <= 60) { rating = 'Hard'; benchmark = 'Challenging — requires pair/pointing techniques'; }
  else if (score <= 80) { rating = 'Expert'; benchmark = 'Competition level — requires X-Wing or Y-Wing'; }
  else if (score <= 95) { rating = 'Evil'; benchmark = 'Near hardest — requires Swordfish or Coloring'; }
  else { rating = 'Diabolical'; benchmark = 'Beyond logic — requires guessing/bifurcation'; }

  return { score, rating, benchmark };
}

export function rate(puzzle: string): RatingResult {
  return scoreToRating(analyze(puzzle).difficulty.score);
}
