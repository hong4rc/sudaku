// Main
export { Sudaku } from './sudaku.js';
export type { SolveResult, HintResult, DifficultyResult, LogicSolveResult } from './sudaku.js';

// Generator
export type { GenerateOptions, GenerateResult } from './generator.js';

// Validator
export type { ValidationResult, ValidationError } from './validator.js';

// Logic Techniques
export { DifficultyLevel, solveLogicIterator, type TechniqueResult, type CellRef, type Elimination, type Placement } from './logic/techniques.js';

// Technique Interface (Chain of Responsibility)
export type { ITechnique } from './logic/technique.js';

// Solver Interface (Strategy)
export type { ISolver } from './solver/solver.js';
export { BitmaskSolver } from './solver/bitmask.js';
export { DLXSolver } from './solver/dlx.js';
export { HybridSolver } from './solver/hybrid.js';

// Game State (Command + Observer + Memento)
export { SudokuGame, type GameState, type Move, type GameEvent, type GameEventType, type GameListener } from './game.js';

// Serialization
export { toSDK, fromSDK, toOpenSudoku, fromOpenSudoku, prettyPrint, prettyOneLine, gameStateToJSON, gameStateFromJSON } from './serialization.js';

// Analysis
export { analyze, rate, scoreToRating, type PuzzleAnalysis, type RatingResult, type SymmetryType } from './analysis.js';
