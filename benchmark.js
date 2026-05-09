const numTanods = 1000;
const numPatrols = 1000;

const tanods = Array.from({ length: numTanods }, (_, i) => ({ uid: `t${i}`, name: `Tanod ${i}` }));
const patrols = Array.from({ length: numPatrols }, (_, i) => ({ tanodId: `t${i}`, isActive: true, status: 'patrolling' }));

console.time('Before Optimization (find inside map)');
for (let j = 0; j < 100; j++) {
    tanods.map(tanod => {
        const patrol = patrols.find(p => p.tanodId === tanod.uid);
        return patrol;
    });
}
console.timeEnd('Before Optimization (find inside map)');

console.time('After Optimization (precomputed map)');
for (let j = 0; j < 100; j++) {
    const patrolMap = patrols.reduce((acc, patrol) => {
        acc[patrol.tanodId] = patrol;
        return acc;
    }, {});

    tanods.map(tanod => {
        const patrol = patrolMap[tanod.uid];
        return patrol;
    });
}
console.timeEnd('After Optimization (precomputed map)');
