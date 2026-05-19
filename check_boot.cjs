console.log("Checking server bootup errors...");
try {
  require('./dist/server.cjs');
} catch (e) {
  console.error("BOOT CRASH:", e);
  process.exit(1);
}
setTimeout(() => process.exit(0), 1000);
