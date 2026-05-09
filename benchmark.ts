import { performance } from 'node:perf_hooks';

const NUM_TANODS = 10000;
const NUM_PATROLS = 10000;

const tanods = Array.from({ length: NUM_TANODS }, (_, i) => ({ uid: `tanod_${i}` }));
const patrols = Array.from({ length: NUM_PATROLS }, (_, i) => ({ tanodId: `tanod_${i}` }));

// Baseline
const start1 = performance.now();
tanods.forEach((tanod) => {
  const patrol = patrols.find(p => p.tanodId === tanod.uid);
});
const end1 = performance.now();
console.log(`Baseline (O(N^2)): ${end1 - start1} ms`);

// Optimized
const start2 = performance.now();
const patrolMap = patrols.reduce((acc, patrol) => {
  acc[patrol.tanodId] = patrol;
  return acc;
}, {} as Record<string, any>);
tanods.forEach((tanod) => {
  const patrol = patrolMap[tanod.uid];
});
const end2 = performance.now();
console.log(`Optimized (O(N)): ${end2 - start2} ms`);
