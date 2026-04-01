import { Board, maskDigits } from './board.js';
import * as hybrid from './solver/hybrid.js';
import { LogicBoard } from './logic/logic-board.js';
import { findNext, solveLogic, solveLogicIterator, CHAIN, type TechniqueResult, DifficultyLevel } from './logic/techniques.js';
import { generate, generateBatch, type GenerateOptions, type GenerateResult } from './generator.js';
import { validate, type ValidationResult } from './validator.js';
import { SudokuGame, type GameState } from './game.js';
import { toSDK, fromSDK, toOpenSudoku, fromOpenSudoku, prettyPrint, prettyOneLine, gameStateToJSON, gameStateFromJSON } from './serialization.js';
import { analyze, rate, type PuzzleAnalysis, type RatingResult } from './analysis.js';

// ---- Result types ----

export interface SolveResult { solved: boolean; solution: string | null; }
export interface HintResult { found: boolean; hint: TechniqueResult | null; }
export interface DifficultyResult { level: DifficultyLevel; label: string; score: number; solvableByLogic: boolean; techniquesUsed: string[]; hardestTechnique: string; totalSteps: number; }
export interface LogicSolveResult { solved: boolean; totalSteps: number; steps: TechniqueResult[]; }

export class Sudaku {
  // ---- Solver ----

  solve(puzzle: string): SolveResult {
    try {
      const board = Board.fromString(puzzle);
      const result = hybrid.solve(board);
      if (result?.isSolved()) return { solved: true, solution: result.toString() };
    } catch { /* invalid */ }
    return { solved: false, solution: null };
  }

  solveWithTimeout(puzzle: string, timeoutMs: number): SolveResult | null {
    const start = performance.now();
    const result = this.solve(puzzle);
    return (performance.now() - start > timeoutMs) ? null : result;
  }

  countSolutions(puzzle: string, limit = 2): number {
    try { return hybrid.countSolutions(Board.fromString(puzzle), limit); } catch { return 0; }
  }

  hasUniqueSolution(puzzle: string): boolean { return this.countSolutions(puzzle, 2) === 1; }

  solveBatch(puzzles: string[]): SolveResult[] { return puzzles.map(p => this.solve(p)); }

  // ---- Logic Solver ----

  solveLogic(puzzle: string): LogicSolveResult {
    const { solved, steps } = solveLogic(LogicBoard.fromPuzzle(puzzle));
    return { solved, totalSteps: steps.length, steps };
  }

  /** Iterator Pattern — lazy step-by-step solve for streaming/animation. */
  *solveLogicSteps(puzzle: string): Generator<TechniqueResult> {
    yield* solveLogicIterator(LogicBoard.fromPuzzle(puzzle));
  }

  // ---- Hints ----

  hint(puzzle: string): HintResult {
    const result = findNext(LogicBoard.fromPuzzle(puzzle));
    return { found: result !== null, hint: result };
  }

  allHints(puzzle: string): TechniqueResult[] {
    const b = LogicBoard.fromPuzzle(puzzle);
    const results: TechniqueResult[] = [];
    for (const fn of CHAIN) { const r = fn(b); if (r) results.push(r); }
    return results;
  }

  progressiveHint(puzzle: string): { found: boolean; level1: string | null; level2: string | null; level3: TechniqueResult | null } {
    const result = findNext(LogicBoard.fromPuzzle(puzzle));
    if (!result) return { found: false, level1: null, level2: null, level3: null };
    const rows = [...new Set(result.primaryCells.map(c => c.row + 1))];
    const cols = [...new Set(result.primaryCells.map(c => c.col + 1))];
    return { found: true, level1: `Try looking for a ${result.technique}`, level2: `Look for a ${result.technique} around Row ${rows.join(',')} Column ${cols.join(',')}`, level3: result };
  }

  // ---- Difficulty ----

  difficulty(puzzle: string): DifficultyResult {
    const { solved, steps } = solveLogic(LogicBoard.fromPuzzle(puzzle));
    const used = new Set<string>();
    let maxDiff = DifficultyLevel.Easy, hardest = 'None';
    const counts = new Map<number, number>();
    for (const step of steps) {
      used.add(step.technique);
      counts.set(step.difficulty, (counts.get(step.difficulty) ?? 0) + 1);
      if (step.difficulty > maxDiff) { maxDiff = step.difficulty; hardest = step.technique; }
    }
    if (!solved) { maxDiff = DifficultyLevel.Evil; hardest = 'Guessing'; }
    const base = [0, 0, 20, 40, 60, 80][maxDiff];
    const stepBonus = Math.min(10, (steps.length / 10) | 0);
    let advCount = 0;
    for (const [d, c] of counts) if (d >= 3) advCount += c;
    const score = Math.min(100, base + stepBonus + Math.min(8, advCount * 2) + (solved ? 0 : 10));
    const labels = ['', 'Easy', 'Medium', 'Hard', 'Expert', 'Evil'];
    return { level: maxDiff, label: labels[maxDiff], score, solvableByLogic: solved, techniquesUsed: [...used], hardestTechnique: hardest, totalSteps: steps.length };
  }

  // ---- Validator ----

  validate(puzzle: string): ValidationResult { return validate(puzzle); }

  // ---- Generator ----

  generate(options?: GenerateOptions): GenerateResult { return generate(options); }
  generateBatch(count: number, options?: GenerateOptions): GenerateResult[] { return generateBatch(count, options); }

  // ---- Candidates ----

  candidates(puzzle: string): number[] { return Array.from(LogicBoard.fromPuzzle(puzzle).candidates); }
  candidateDigits(puzzle: string): number[][] { return this.candidates(puzzle).map(m => maskDigits(m)); }

  // ---- Game State ----

  createGame(puzzle: string): SudokuGame { return new SudokuGame(puzzle); }

  // ---- Analysis ----

  analyze(puzzle: string): PuzzleAnalysis { return analyze(puzzle); }
  rate(puzzle: string): RatingResult { return rate(puzzle); }

  // ---- Serialization ----

  toSDK(puzzle: string): string { return toSDK(puzzle); }
  fromSDK(sdk: string): string { return fromSDK(sdk); }
  toOpenSudoku(puzzle: string, pencilMarks?: number[][]): string { return toOpenSudoku(puzzle, pencilMarks); }
  fromOpenSudoku(data: string): { puzzle: string; pencilMarks: number[][] } { return fromOpenSudoku(data); }
  prettyPrint(puzzle: string): string { return prettyPrint(puzzle); }
  prettyOneLine(puzzle: string): string { return prettyOneLine(puzzle); }
  saveGame(state: GameState): string { return gameStateToJSON(state); }
  loadGame(json: string): SudokuGame { return SudokuGame.fromState(gameStateFromJSON(json)); }
}
