export function scheduleDailyLogReset(
  onReset: (archivedDate: string) => void
) {
  const now = new Date();
  const next7AM = new Date();
  next7AM.setHours(7, 0, 0, 0);
  if (now >= next7AM) next7AM.setDate(next7AM.getDate() + 1);

  const msUntilReset = next7AM.getTime() - now.getTime();

  const timer = setTimeout(() => {
    const sessionDate = new Date().toISOString().split('T')[0];
    onReset(sessionDate);
    scheduleDailyLogReset(onReset); // re-schedule for next day
  }, msUntilReset);

  return () => clearTimeout(timer);
}
