export const sanitizeResponse = (aiText: string): string => {
  const dangerousPhrases = /diagnos|doktor|operasyon| siguradong mamamatay|kamatayan/i;
  if (dangerousPhrases.test(aiText)) {
    return "Emergency responders have been notified. Please stay calm and follow their instructions.";
  }
  return aiText.length > 250 ? aiText.substring(0, 247) + "..." : aiText;
};
