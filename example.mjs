import { Sudaku, SudokuGame, prettyPrint, prettyOneLine, toSDK, fromSDK, toOpenSudoku, fromOpenSudoku, gameStateToJSON, gameStateFromJSON, analyze, rate } from './dist/index.js';

const sdk = new Sudaku();
const sep = () => console.log('\n' + '='.repeat(60) + '\n');

// ============================================================
// 1. SOLVE
// ============================================================
console.log('1. SOLVE');
console.log('-'.repeat(40));

const puzzle = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const result = sdk.solve(puzzle);
console.log('Puzzle:');
console.log(prettyPrint(puzzle));
console.log('\nSolved:', result.solved);
console.log('Solution:');
console.log(prettyPrint(result.solution));

sep();

// ============================================================
// 2. SOLVE WITH TIMEOUT
// ============================================================
console.log('2. SOLVE WITH TIMEOUT');
console.log('-'.repeat(40));

const hard = '800000000003600000070090200050007000000045700000100030001000068008500010090000400';
const fast = sdk.solveWithTimeout(hard, 5000);
console.log('Hard puzzle solved within timeout:', fast?.solved);

sep();

// ============================================================
// 3. COUNT SOLUTIONS & UNIQUENESS
// ============================================================
console.log('3. COUNT SOLUTIONS & UNIQUENESS');
console.log('-'.repeat(40));

console.log('Solution count (limit 2):', sdk.countSolutions(puzzle, 2));
console.log('Has unique solution:', sdk.hasUniqueSolution(puzzle));

// Puzzle with clue removed (might have multiple solutions)
const ambiguous = puzzle.slice(0, 3) + '0' + puzzle.slice(4);
console.log('Ambiguous puzzle solutions:', sdk.countSolutions(ambiguous, 5));

sep();

// ============================================================
// 4. BATCH SOLVE
// ============================================================
console.log('4. BATCH SOLVE');
console.log('-'.repeat(40));

const puzzles = [
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  '800000000003600000070090200050007000000045700000100030001000068008500010090000400',
  '000000010400000000020000000000050407008000300001090000300400200050100000000806000',
];
const batchResults = sdk.solveBatch(puzzles);
console.log(`Solved ${batchResults.filter(r => r.solved).length}/${batchResults.length} puzzles`);

sep();

// ============================================================
// 5. LOGIC SOLVER (step-by-step)
// ============================================================
console.log('5. LOGIC SOLVER (step-by-step)');
console.log('-'.repeat(40));

const logic = sdk.solveLogic(puzzle);
console.log('Solved by logic:', logic.solved);
console.log('Total steps:', logic.totalSteps);
console.log('First 5 steps:');
for (const step of logic.steps.slice(0, 5)) {
  console.log(`  Step ${logic.steps.indexOf(step) + 1}: [${step.technique}] ${step.explanation}`);
}
console.log('  ...');

// Count techniques used
const techCounts = {};
for (const step of logic.steps) {
  techCounts[step.technique] = (techCounts[step.technique] || 0) + 1;
}
console.log('Technique breakdown:', techCounts);

sep();

// ============================================================
// 6. HINT (single)
// ============================================================
console.log('6. HINT (single)');
console.log('-'.repeat(40));

const h = sdk.hint(puzzle);
console.log('Found:', h.found);
console.log('Technique:', h.hint.technique);
console.log('Difficulty:', h.hint.difficulty);
console.log('Explanation:', h.hint.explanation);
if (h.hint.placements.length > 0) {
  const p = h.hint.placements[0];
  console.log(`Action: place ${p.digit} at R${p.cell.row + 1}C${p.cell.col + 1}`);
}
if (h.hint.eliminations.length > 0) {
  console.log(`Action: eliminate ${h.hint.eliminations.length} candidates`);
}

sep();

// ============================================================
// 7. ALL HINTS
// ============================================================
console.log('7. ALL HINTS (every applicable technique)');
console.log('-'.repeat(40));

const allH = sdk.allHints(puzzle);
console.log(`${allH.length} techniques applicable right now:`);
for (const hint of allH) {
  console.log(`  [${hint.technique}] ${hint.explanation}`);
}

sep();

// ============================================================
// 8. PROGRESSIVE HINT (3 levels)
// ============================================================
console.log('8. PROGRESSIVE HINT');
console.log('-'.repeat(40));

const ph = sdk.progressiveHint(puzzle);
console.log('Level 1 (vague):', ph.level1);
console.log('Level 2 (area):', ph.level2);
console.log('Level 3 (full):', ph.level3.explanation);

sep();

// ============================================================
// 9. DIFFICULTY
// ============================================================
console.log('9. DIFFICULTY');
console.log('-'.repeat(40));

for (const p of puzzles) {
  const d = sdk.difficulty(p);
  console.log(`${d.label.padEnd(8)} score:${String(d.score).padStart(3)}/100  logic:${d.solvableByLogic}  steps:${d.totalSteps}  hardest: ${d.hardestTechnique}`);
}

sep();

// ============================================================
// 10. VALIDATE
// ============================================================
console.log('10. VALIDATE');
console.log('-'.repeat(40));

const valid = sdk.validate(puzzle);
console.log('Valid:', valid.valid, '| Solvable:', valid.solvable, '| Unique:', valid.unique, '| Clues:', valid.clueCount);

// Invalid puzzle (duplicate 5 in row 1)
const bad = '550070000600195000098000060800060003400803001700020006060000280000419005000080079';
const badResult = sdk.validate(bad);
console.log('\nInvalid puzzle:', !badResult.valid);
console.log('Errors:', badResult.errors.map(e => e.message).join(', '));

sep();

// ============================================================
// 11. GENERATE
// ============================================================
console.log('11. GENERATE');
console.log('-'.repeat(40));

const gen = sdk.generate({ minClues: 25, symmetric: true });
console.log('Generated puzzle:');
console.log(prettyPrint(gen.puzzle));
console.log('\nClues:', gen.puzzle.split('').filter(c => c !== '0').length);
console.log('Difficulty:', sdk.difficulty(gen.puzzle).label);

sep();

// ============================================================
// 12. GENERATE BATCH
// ============================================================
console.log('12. GENERATE BATCH');
console.log('-'.repeat(40));

const batch = sdk.generateBatch(5);
console.log(`Generated ${batch.length} puzzles:`);
for (let i = 0; i < batch.length; i++) {
  const d = sdk.difficulty(batch[i].puzzle);
  const clues = batch[i].puzzle.split('').filter(c => c !== '0').length;
  console.log(`  #${i + 1}: ${clues} clues, ${d.label} (score ${d.score})`);
}

sep();

// ============================================================
// 13. CANDIDATES
// ============================================================
console.log('13. CANDIDATES');
console.log('-'.repeat(40));

const masks = sdk.candidates(puzzle);
const digits = sdk.candidateDigits(puzzle);
console.log('Cell 2 (R1C3, empty):');
console.log('  Bitmask:', masks[2], `(binary: ${masks[2].toString(2)})`);
console.log('  Digits:', digits[2]);

console.log('Cell 0 (R1C1, filled with 5):');
console.log('  Bitmask:', masks[0], '(no candidates)');
console.log('  Digits:', digits[0]);

sep();

// ============================================================
// 14. GAME STATE (undo/redo, pencil marks)
// ============================================================
console.log('14. GAME STATE');
console.log('-'.repeat(40));

const game = sdk.createGame(puzzle);
const sol = result.solution;

// Find first empty cell
let emptyCell = -1;
for (let i = 0; i < 81; i++) { if (puzzle[i] === '0') { emptyCell = i; break; } }

const r1 = emptyCell / 9 | 0, c1 = emptyCell % 9;
console.log(`First empty cell: R${r1 + 1}C${c1 + 1} (index ${emptyCell})`);
console.log(`Pencil marks: [${game.getState().pencilMarks[emptyCell].join(', ')}]`);

// Place wrong digit
game.place(emptyCell, 1);
console.log(`\nPlaced 1 -> correct: ${game.isCorrect(emptyCell)}`);
console.log('Conflicts:', game.getConflicts().length > 0 ? 'yes' : 'none');
console.log('Errors:', game.getErrors());

// Undo
game.undo();
console.log('\nUndo -> cell is empty again');

// Place correct digit
const correct = Number(sol[emptyCell]);
game.place(emptyCell, correct);
console.log(`Placed ${correct} -> correct: ${game.isCorrect(emptyCell)}`);
console.log(`Progress: ${(game.getProgress() * 100).toFixed(1)}%`);

// Toggle pencil mark on another cell
let emptyCell2 = -1;
for (let i = emptyCell + 1; i < 81; i++) { if (puzzle[i] === '0') { emptyCell2 = i; break; } }
game.togglePencilMark(emptyCell2, 3);
game.togglePencilMark(emptyCell2, 7);
console.log(`\nPencil marks on cell ${emptyCell2}: [${game.getState().pencilMarks[emptyCell2].join(', ')}]`);
game.togglePencilMark(emptyCell2, 3); // remove 3
console.log(`After removing 3: [${game.getState().pencilMarks[emptyCell2].join(', ')}]`);

// Check if given
console.log(`\nCell 0 is given: ${game.isGiven(0)}`);
console.log(`Cell ${emptyCell} is given: ${game.isGiven(emptyCell)}`);
console.log(`Elapsed time: ${game.getElapsedTime()}s`);

sep();

// ============================================================
// 15. SAVE / LOAD GAME
// ============================================================
console.log('15. SAVE / LOAD GAME');
console.log('-'.repeat(40));

const savedJson = sdk.saveGame(game.getState());
console.log('Saved game JSON length:', savedJson.length, 'chars');

const loadedGame = sdk.loadGame(savedJson);
console.log('Loaded game progress:', (loadedGame.getProgress() * 100).toFixed(1) + '%');
console.log('State matches:', loadedGame.getState().puzzle === game.getState().puzzle);

sep();

// ============================================================
// 16. ANALYSIS
// ============================================================
console.log('16. ANALYSIS');
console.log('-'.repeat(40));

const a = sdk.analyze(puzzle);
console.log('Clues:', a.clueCount);
console.log('Empty cells:', a.emptyCells);
console.log('Symmetry:', a.symmetry);
console.log('Difficulty:', a.difficulty.label, `(score ${a.difficulty.score})`);
console.log('Solvable by logic:', a.difficulty.solvableByLogic);
console.log('Solve time (brute force):', a.solveTimeMs + 'ms');
console.log('Logic steps:', a.totalLogicSteps);
console.log('Solutions:', a.solutionCount);
console.log('Techniques:');
for (const t of a.techniques) {
  console.log(`  ${t.name}: ${t.count}x`);
}
console.log('Clue distribution:');
console.log('  Rows:', a.clueDistribution.rows.join(', '));
console.log('  Cols:', a.clueDistribution.cols.join(', '));
console.log('  Boxes:', a.clueDistribution.boxes.join(', '));

sep();

// ============================================================
// 17. RATING
// ============================================================
console.log('17. RATING');
console.log('-'.repeat(40));

for (const p of puzzles) {
  const rating = sdk.rate(p);
  console.log(`Score: ${String(rating.score).padStart(3)} | ${rating.rating.padEnd(12)} | ${rating.benchmark}`);
}

sep();

// ============================================================
// 18. SERIALIZATION FORMATS
// ============================================================
console.log('18. SERIALIZATION');
console.log('-'.repeat(40));

// SDK format
const sdkStr = sdk.toSDK(puzzle);
console.log('SDK format:', sdkStr);
const parsed = sdk.fromSDK(sdkStr);
console.log('Roundtrip:', parsed === puzzle);

// One-line
console.log('One-line:', sdk.prettyOneLine(puzzle));

// Pretty print
console.log('Pretty print:');
console.log(sdk.prettyPrint(puzzle));

// OpenSudoku
const openSudoku = sdk.toOpenSudoku(puzzle, sdk.candidateDigits(puzzle).map(d => d));
console.log('\nOpenSudoku format (first 80 chars):', openSudoku.slice(0, 80) + '...');
const { puzzle: p2 } = sdk.fromOpenSudoku(openSudoku);
console.log('OpenSudoku roundtrip:', p2.length === 81);

sep();

// ============================================================
// 19. SOLVE WITH TIMEOUT
// ============================================================
console.log('19. SOLVE WITH TIMEOUT');
console.log('-'.repeat(40));

const quickResult = sdk.solveWithTimeout(hard, 100);
console.log('Solved within 100ms:', quickResult?.solved);

sep();

// ============================================================
// 20. MOVE VALIDATION (would be correct?)
// ============================================================
console.log('20. MOVE VALIDATION');
console.log('-'.repeat(40));

const game2 = sdk.createGame(puzzle);
const testCell = emptyCell;
console.log(`Cell R${(testCell / 9 | 0) + 1}C${(testCell % 9) + 1}:`);
for (let d = 1; d <= 9; d++) {
  const ok = game2.wouldBeCorrect(testCell, d);
  console.log(`  Digit ${d}: ${ok ? 'CORRECT' : 'wrong'}`);
}

sep();

// ============================================================
// 21. BENCHMARK
// ============================================================
console.log('21. BENCHMARK');
console.log('-'.repeat(40));

// Solve benchmark
let t0 = performance.now();
const N = 1000;
for (let i = 0; i < N; i++) sdk.solve(hard);
let ms = performance.now() - t0;
console.log(`Solve:    ${N}x hard puzzle -> ${ms.toFixed(0)}ms total, ${(ms / N).toFixed(3)}ms/puzzle`);

// Generate benchmark
t0 = performance.now();
const G = 20;
for (let i = 0; i < G; i++) sdk.generate({ seed: i });
ms = performance.now() - t0;
console.log(`Generate: ${G}x puzzles -> ${ms.toFixed(0)}ms total, ${(ms / G).toFixed(0)}ms/puzzle`);

// Hint benchmark
t0 = performance.now();
const H = 1000;
for (let i = 0; i < H; i++) sdk.hint(puzzle);
ms = performance.now() - t0;
console.log(`Hint:     ${H}x hints -> ${ms.toFixed(0)}ms total, ${(ms / H).toFixed(3)}ms/hint`);

console.log('\n--- ALL FEATURES DEMONSTRATED ---');
