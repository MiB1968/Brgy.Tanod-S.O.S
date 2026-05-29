export const classifyCommand = (text: string) => {
  const lower = text.toLowerCase().trim();

  const emergencyKeywords = ['help', 'tulungan', 'sos', 'sunog', 'nasaktan', 'barilan', 'holdap', 'aksidente'];
  const localCommands = {
    'stop': { action: 'STOP', handler: () => window.speechSynthesis.cancel() },
    'mute': { action: 'MUTE' },
    'map': { action: 'OPEN_MAP' },
    'track': { action: 'TRACK_LOCATION' },
  };

  if (emergencyKeywords.some(kw => lower.includes(kw))) {
    return { type: 'EMERGENCY', priority: 'HIGH', text };
  }

  for (const [cmd, config] of Object.entries(localCommands)) {
    if (lower.includes(cmd)) return { type: 'LOCAL', ...config };
  }

  return { type: 'AI_ANALYSIS', text };
};
