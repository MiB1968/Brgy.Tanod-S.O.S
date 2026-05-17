// src/lib/ssmlTagalog.ts
export const createTagalogSSML = (text: string, style: 'calm' | 'urgent' | 'authoritative' | 'reassuring' = 'calm'): string => {
  let ssml = `<speak>`;

  // Style-based prosody
  let rate = '1.0';
  let pitch = '0st';

  switch (style) {
    case 'urgent':
      rate = '1.15';
      pitch = '+2st';
      break;
    case 'calm':
      rate = '0.95';
      pitch = '-1st';
      break;
    case 'authoritative':
      rate = '1.0';
      pitch = '+0.5st';
      break;
    case 'reassuring':
      rate = '0.92';
      pitch = '-2st';
      break;
  }

  ssml += `<prosody rate="${rate}" pitch="${pitch}">`;

  // Common Tagalog-friendly patterns
  ssml += text
    .replace(/SOS/gi, `<emphasis level="strong">SOS</emphasis>`)
    .replace(/emergency/gi, `<emphasis level="moderate">emergency</emphasis>`)
    .replace(/Tanod/gi, `<emphasis level="moderate">Tanod</emphasis>`);

  ssml += `</prosody></speak>`;

  return ssml;
};

// Example usage for common messages
export const emergencySSML = {
  sosActivated: `<speak>
    <prosody rate="1.1" pitch="+1st">
      <emphasis level="strong">SOS</emphasis> na-activate!
    </prosody>
    <break time="600ms"/>
    May emergency sa iyong lokasyon. 
    <break time="800ms"/>
    Tumutugon na ang mga Barangay Tanod.
  </speak>`,

  helpComing: `<speak>
    <prosody rate="0.95" pitch="-1.5st">
      Tulong paparating na. 
      <break time="700ms"/>
      Manatili sa ligtas na lugar at huwag mag-panic.
    </prosody>
  </speak>`,

  stayCalm: `<speak>
    <prosody rate="slow" pitch="-2st">
      Manatili kang <emphasis level="moderate">kalmado</emphasis>.
      <break time="500ms"/>
      Tulong ay paparating.
    </prosody>
  </speak>`
};
