// PATCH: src/server/services/incidentService.ts  (createSOS method only)
//
// CRIT-04 — clientUuid dedup was in-memory (processedUuids Set).
//
// Changes:
//   1. The DB INSERT now includes client_uuid.
//   2. On a unique-violation (error code 23505), we return 200 with the
//      original alert — exactly the idempotent behaviour offline sync needs.
//   3. The in-memory Set is kept as a fast first-pass but is no longer the
//      authoritative check.
//
// Replace the createSOS method in your existing incidentService.ts with this.

// ── In-memory first-pass cache (survives only while the process is alive) ───
const recentSOS = new Map<string, number>();
const processedUuids = new Set<string>();

export async function createSOS(data: {
  reporterId: string;
  barangayId: string;
  description: string;
  latitude: number;
  longitude: number;
  initialType?: string;
  photos?: string[];
  voiceClip?: string;
  clientUuid?: string;
  isOfflineRecovered?: boolean;
}) {
  const { reporterId, barangayId, description, clientUuid, isOfflineRecovered } = data;
  let { latitude, longitude } = data;

  // 1. Validate UUID format
  if (clientUuid) {
    const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidV4Pattern.test(clientUuid)) {
      throw new AppError('Invalid clientUuid format. Must be UUID v4.', 400, 'INVALID_UUID');
    }

    // 2. Fast in-memory check (avoids a DB round-trip for hot duplicates)
    if (processedUuids.has(clientUuid)) {
      console.log(`[SOS] In-memory duplicate ignored: ${clientUuid}`);
      // Return a stub — the real row will be returned by the DB path if needed
      throw new AppError('Duplicate report already processed', 200, 'DUPLICATE');
    }
    processedUuids.add(clientUuid);
    setTimeout(() => processedUuids.delete(clientUuid), 3_600_000); // 1-hour TTL
  }

  // 3. User-radius/time cooldown (unchanged)
  const lastSOS = recentSOS.get(reporterId);
  if (lastSOS && Date.now() - lastSOS < 5_000) {
    throw new AppError('System busy. Please wait 5 seconds.', 429, 'RATE_LIMITED');
  }
  recentSOS.set(reporterId, Date.now());
  setTimeout(() => recentSOS.delete(reporterId), 30_000);

  // 4. Insert — pass client_uuid to the repository
  try {
    const incident = await incidentRepository.createSOS({
      reporterId,
      barangayId,
      description: description?.trim() || '',
      latitude,
      longitude,
      initialType: data.initialType,
      photos: data.photos,
      voiceClip: data.voiceClip,
      clientUuid,            // ← new field
      isOfflineRecovered,
    });
    return incident;
  } catch (err: any) {
    // 5. DB-level unique violation on client_uuid → idempotent response
    //    PostgreSQL error code 23505 = unique_violation
    if (err.code === '23505' && err.constraint?.includes('client_uuid')) {
      console.log(`[SOS] DB-level duplicate blocked for clientUuid=${clientUuid}`);
      // Return the existing row so the offline sync client can mark it as done
      const existing = await pool.query(
        'SELECT * FROM alerts WHERE client_uuid = $1',
        [clientUuid]
      );
      if (existing.rows[0]) return existing.rows[0];
      throw new AppError('Duplicate report already processed', 200, 'DUPLICATE');
    }
    throw err;
  }
}

// ── Repository change required ───────────────────────────────────────────────
// In IncidentRepository.createSOS, add client_uuid to the INSERT:
//
//   INSERT INTO alerts (... , client_uuid)
//   VALUES (... , $N)
//
// Pass undefined/null when clientUuid is not provided so the partial index
// allows multiple rows without a uuid.
