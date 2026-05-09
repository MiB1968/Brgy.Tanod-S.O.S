const { performance } = require('perf_hooks');

const NUM_TANODS = 5000;
const NUM_PATROLS = 5000;

const tanods = Array.from({ length: NUM_TANODS }, (_, i) => ({ uid: `tanod-${i}`, name: `Tanod ${i}` }));
// randomize patrols slightly
const patrols = Array.from({ length: NUM_PATROLS }, (_, i) => ({ tanodId: `tanod-${NUM_PATROLS - 1 - i}`, isActive: true, lastUpdate: Date.now() }));

// Baseline: array.find
function runBaseline() {
  const start = performance.now();
  let matches = 0;
  tanods.map((t) => {
    const patrolMatch = patrols.find(p => p.tanodId === t.uid);
    if (patrolMatch) matches++;
  });
  const end = performance.now();
  return end - start;
}

// Optimized: record lookup
function runOptimized() {
  const start = performance.now();

  // Includes the time to build the record
  const patrolRecord = patrols.reduce((acc, p) => {
    acc[p.tanodId] = p;
    return acc;
  }, {});

  let matches = 0;
  tanods.map((t) => {
    const patrolMatch = patrolRecord[t.uid];
    if (patrolMatch) matches++;
  });
  const end = performance.now();
  return end - start;
}

let baselineTimes = [];
let optimizedTimes = [];

for (let i = 0; i < 10; i++) {
  baselineTimes.push(runBaseline());
  optimizedTimes.push(runOptimized());
}

const avgBaseline = baselineTimes.reduce((a, b) => a + b) / baselineTimes.length;
const avgOptimized = optimizedTimes.reduce((a, b) => a + b) / optimizedTimes.length;

console.log(`Average Baseline time: ${avgBaseline.toFixed(2)}ms`);
console.log(`Average Optimized time: ${avgOptimized.toFixed(2)}ms`);
console.log(`Speedup: ${(avgBaseline / avgOptimized).toFixed(2)}x`);
