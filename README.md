# Sudaku

[![CI](https://github.com/hong4rc/sudaku/actions/workflows/ci.yml/badge.svg)](https://github.com/hong4rc/sudaku/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/hong4rc/sudaku/graph/badge.svg)](https://codecov.io/gh/hong4rc/sudaku)
[![npm](https://img.shields.io/npm/v/sudaku)](https://www.npmjs.com/package/sudaku)
[![license](https://img.shields.io/npm/l/sudaku)](https://github.com/hong4rc/sudaku/blob/main/LICENSE)

High-performance Sudoku library — solver (DLX + bitmask), generator, hints, difficulty grading. Pure TypeScript, zero dependencies.

**[Live Demo](https://hong4rc.github.io/sudaku/)**

## Install

```bash
npm install sudaku
```

## Quick Start

```js
import { Sudaku } from 'sudaku';

const sdk = new Sudaku();

// Solve
sdk.solve('530070000600195000098000060...');
// → { solved: true, solution: '534678912672195348...' }

// Generate
sdk.generate({ minClues: 25, symmetric: true });
// → { puzzle: '...', solution: '...' }

// Hint
sdk.hint('530070000...');
// → { found: true, hint: { technique: 'Hidden Single', explanation: '...' } }

// Difficulty
sdk.difficulty('530070000...');
// → { label: 'Easy', score: 5, techniquesUsed: ['Naked Single'], ... }
```

## Features

| Feature | Method |
|---|---|
| **Solve** | `solve()`, `solveBatch()`, `solveWithTimeout()` |
| **Logic Solve** | `solveLogic()`, `solveLogicSteps()` (iterator) |
| **Hints** | `hint()`, `allHints()`, `progressiveHint()` |
| **Difficulty** | `difficulty()` — Easy → Evil, score 0-100 |
| **Generate** | `generate()`, `generateBatch()` with difficulty targeting |
| **Validate** | `validate()` — duplicates, solvability, uniqueness |
| **Candidates** | `candidates()`, `candidateDigits()` |
| **Game State** | `createGame()` → undo/redo, pencil marks, conflicts |
| **Analysis** | `analyze()` — symmetry, clue distribution, rating |
| **Serialization** | `toSDK()`, `fromSDK()`, `toOpenSudoku()`, `prettyPrint()` |
| **Save/Load** | `saveGame()`, `loadGame()` — JSON game state |

## 13 Logic Techniques

Naked Single → Hidden Single → Naked Pair → Hidden Pair → Naked Triple → Hidden Triple → Pointing Pair → Box/Line Reduction → X-Wing → Y-Wing → Unique Rectangle → Swordfish → Simple Coloring

## Solver Architecture

Hybrid strategy — constraint propagation first, then:
- **< 20 empties** → Bitmask + MRV backtracking
- **≥ 20 empties** → DLX (Dancing Links, Algorithm X)

~0.6ms per hard puzzle on modern hardware.

## Design Patterns

Strategy, Chain of Responsibility, Iterator, Observer, Command, Memento, Facade, Flyweight.

## License

MIT
