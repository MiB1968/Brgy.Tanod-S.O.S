// src/lib/tagalogPhrases.ts
export const tagalogPhrases = {
  // Guardian Button & SOS
  sosActivated: "SOS na-activate! May emergency sa iyong lokasyon. Tumutugon na ang mga Tanod.",
  helpComing: "Tulong paparating na. Manatili sa ligtas na lugar at huwag mag-panic.",
  tanodNearby: "May malapit na Barangay Tanod. Huwag mag-alala, darating sila agad.",
  sosCancelled: "SOS ay kinansela. Salamat sa iyong kaligtasan.",

  // Status Updates
  connecting: "Kumokonekta sa sistema...",
  offlineMode: "Offline mode. Ang SOS ay ise-send kapag may koneksyon.",
  locationShared: "Iyong lokasyon ay naibahagi na sa mga responder.",

  // Tactical / Guardian Messages
  stayCalm: "Manatili kang kalmado. Tulong ay paparating.",
  policeComing: "Ang pulis o responder ay papunta na.",
  medicalHelp: "May medical help na paparating para sa iyo.",

  // General
  welcome: "Maligayang pagdating sa Brgy. Tanod SOS System.",
  thankYou: "Salamat po. Mag-ingat po kayo.",
  testSuccess: "Test ng Guardian Button ay matagumpay. Huwag gamitin sa totoong emergency.",
};

export type PhraseKey = keyof typeof tagalogPhrases;

/**
 * Get Tagalog message with optional variable replacement
 */
export const getTagalogMessage = (key: PhraseKey, vars: Record<string, string> = {}): string => {
  let text = tagalogPhrases[key];
  Object.keys(vars).forEach((k) => {
    text = text.replace(`{${k}}`, vars[k]);
  });
  return text;
};
