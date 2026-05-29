// src/services/smsCompression.ts

export interface SOSPayload {
  lat: number;
  lng: number;
  type: string;           // e.g., "CRIME", "MEDICAL", "FIRE", "DISASTER"
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: number;
  victimCount?: number;
}

/**
 * Compresses SOS data into minimal, transmission-ready format (<=140 characters)
 */
export function compressSOS(payload: SOSPayload): string {
  const typeCode = (payload.type || 'OT').substring(0, 2).toUpperCase();
  const severityCode = (payload.severity || 'M')[0].toUpperCase();

  // Standard payload format: SOS:lat|lng|type|severity|shortTimestamp|victimCount
  // We use specific rounding tolerances (.fixed5 is plenty accurate for positioning down to ~1 meter)
  const compressed = [
    payload.lat.toFixed(5),
    payload.lng.toFixed(5),
    typeCode,
    severityCode,
    Date.now().toString().slice(-6), // Compact 6-digit timestamp identifier
    payload.victimCount || 1
  ].join('|');

  return `SOS:${compressed}`;
}

/**
 * Decompress transmitted SMS text back into structured SOS payload
 */
export function decompressSOS(smsText: string): SOSPayload | null {
  try {
    if (!smsText.startsWith('SOS:')) return null;
    
    const parts = smsText.slice(4).split('|');
    if (parts.length < 4) return null;

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    const typeCode = parts[2];
    const severityInput = parts[3];
    const shortTs = parts[4] || '000000';
    const victimCount = parseInt(parts[5], 10) || 1;

    let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (severityInput === 'H') severity = 'HIGH';
    else if (severityInput === 'L') severity = 'LOW';

    // Map short code to standard type
    const mapCodes: Record<string, string> = {
      'CR': 'CRIME',
      'ME': 'MEDICAL',
      'FI': 'FIRE',
      'DI': 'DISASTER',
      'DO': 'DOMESTIC',
      'OT': 'OTHER'
    };
    const type = mapCodes[typeCode] || 'OTHER';

    return {
      lat,
      lng,
      type,
      severity,
      timestamp: Date.now(),
      victimCount
    };
  } catch (error) {
    console.error('Tactical decompression failed:', error);
    return null;
  }
}
