const { performance } = require('perf_hooks');

// Setup mock data
const numTanods = 5000;
const numPatrols = 5000;

const tanods = Array.from({ length: numTanods }, (_, i) => ({ uid: `t_${i}`, name: `Tanod ${i}` }));
const patrols = Array.from({ length: numPatrols }, (_, i) => ({ tanodId: `t_${i}`, isActive: true }));

console.log(`Running benchmark with ${numTanods} tanods and ${numPatrols} patrols...`);

// Baseline: O(N * M) lookup
function runBaseline() {
    const start = performance.now();
    const result = tanods.map(t => {
        const patrolMatch = patrols.find(p => p.tanodId === t.uid);
        return patrolMatch;
    });
    const end = performance.now();
    console.log(`Baseline time: ${(end - start).toFixed(2)} ms`);
}

// Optimized: O(N + M) lookup
function runOptimized() {
    const start = performance.now();

    // Equivalent to useMemo
    const patrolMap = {};
    for (const p of patrols) {
        patrolMap[p.tanodId] = p;
    }

    const result = tanods.map(t => {
        const patrolMatch = patrolMap[t.uid];
        return patrolMatch;
    });

    const end = performance.now();
    console.log(`Optimized time: ${(end - start).toFixed(2)} ms`);
}

runBaseline();
runOptimized();
