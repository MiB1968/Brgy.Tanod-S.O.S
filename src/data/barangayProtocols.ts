export interface BarangayProtocol {
  keywords: string[];
  title: string;
  content: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export const BARANGAY_PROTOCOLS: BarangayProtocol[] = [
  {
    keywords: ["sunog", "apoy", "fire", "extinguisher", "silbato", "hazard", "brand", "smoke", "usok"],
    title: "Fire Response Protocol",
    severity: 'CRITICAL',
    content: "1. SOUND THE ALARM: Sumigaw ng 'Sunog!' at gamitin ang sipol o silbato para alamin ng lahat.\n2. COORDINATE EVACUATION: Lumikas agad papunta sa itinakdang evacuation assembly point.\n3. CALL BFP / HOTLINE: Tawagan ang Bureau of Fire Protection (BFP) o desk ng Barangay Tanod.\n4. USE EXTINGUISHER: Kung ligtas, gamitin ang fire extinguisher gamit ang P.A.S.S. method (Pull, Aim, Squeeze, Sweep). Huwag gumamit ng tubig sa electrical fire."
  },
  {
    keywords: ["medical", "hininga", "first aid", "sugat", "fracture", "bali", "atake", "heart", "stroke", "hilo", "nakagat", "sakit", "patak", "dugo", "unconscious", "nahimatay"],
    title: "Barangay Medical First Aid",
    severity: 'HIGH',
    content: "1. CHECK AIRWAY & BREATHING: Siguraduhing may hangin ang biktima. Paluwagin ang masisikip na damit.\n2. POSITION COMFORTABLY: Upasala o ihiga sa ligtas at komportableng posisyon.\n3. CONTROL BLEEDING: Lagyan ng presyon (direct pressure) gamit ang malinis na tela kung may dumudugong sugat.\n4. STAY CALM & MONITOR: Huwag bigyan ng pagkain o inumin ang walang malay. Maghintay ng emergency responders habang binabantayan ang kalagayan nito."
  },
  {
    keywords: ["baha", "bagyo", "flood", "ulan", "evacuate", "kuryente", "typhoon", "storm", "surge", "landslide", "runoff"],
    title: "Flood & Typhoon Safety Protocol",
    severity: 'HIGH',
    content: "1. DISCONNECT POWER: Patayin ang pangunahing switch ng kuryente at tanggalin sa saksakan ang mga appliance.\n2. MONITOR WATER LEVELS: Makinig sa anunsyo ng barangay gamit ang Guardian Megaphone o radyo.\n3. EVACUATE EARLY: Kung nasa mababang lugar, lumikas nang maaga papunta sa Barangay Evacuation Court.\n4. AVOID WATER: Huwag lumusong, maglaro, o magmaneho sa baha upang maiwasan ang leptospirosis at pagkakuryente."
  },
  {
    keywords: ["crime", "krimen", "magnanakaw", "holdap", "away", "gulo", "suspicious", "stranger", "atake", "threat", "robbery", "theft", "assault", "violence"],
    title: "Crime and Security Protocol",
    severity: 'HIGH',
    content: "1. PRIORITY SAFETY: Katiting na kaligtasan ang unahin. Huwag makipag-away o lumaban sa armadong salarin. Ibigay ang hiling at tumakbo sa ligtas na dako.\n2. CALL BACKUP: Tawagan o senyasan agad ang pinakamalapit na Tanod Patrol o PNP hotlines.\n3. OBSERVE & RECORD: Tandaan ang itsura, kasuotan, at direksyon ng pagtakas ng salarin.\n4. SECURE EVIDENCE: Huwag hawakan ang pinangyarihan ng krimen upang mapangalagaan ang fingerprints o ebidensya."
  },
  {
    keywords: ["lindol", "earthquake", "quake", "shake", "cracks", "pader", "intensity", "tremor"],
    title: "Earthquake Emergency Protocol",
    severity: 'CRITICAL',
    content: "1. DROP, COVER, HOLD: Sumilong sa ilalim ng matitibay na mesa at humawak nang mahigpit habang may pagyanig.\n2. STAY CLEAR: Umiwas sa mga glass windows, pader, at matatayog na poste o kable.\n3. EVACUATE CALMLY: Pagkatapos ng pagyanig, lumikas nang mahinahon gamit ang nakatalagang fire exit patungo sa ligtas na open space.\n4. BE PREPARED: Maghanda para sa mga aftershocks sa pamamagitan ng pag-antabay sa pampublikong ulat."
  },
  {
    keywords: ["kable", "wire", "spark", "electric", "poste", "downed line", "kuryente", "pumutok"],
    title: "Electrical Hazard Safety",
    severity: 'HIGH',
    content: "1. KEEP DISTANCE: Lumayo ng hindi bababa sa 10 metro mula sa bumagsak na kable o poste ng kuryente.\n2. ISOLATE AREA: Harangan ang daan at lagyan ng pansamantalga na babala upang walang makalapit.\n3. CALL POWER CO / BARANGAY: Ipagbigay-alam agad sa Meralco at Barangay Emergency Team upang ma-isolate at mapatay ang linya ng kuryente."
  },
  {
    keywords: ["abuse", "domestic", "child", "violence", "sakitan", "bugbog", "sigaw", "bata"],
    title: "Domestic & Child Safety Protocol",
    severity: 'HIGH',
    content: "1. DISCRETE INTERVENTION: Huwag lumapit nang nag-iisa kung may aktibong karahasan. Tumawag ng Barangay Tanod (VAWC Desk).\n2. RECORD DETAILS: Itala ang oras, naririnig na ingay, at kalagayan ng biktima mula sa ligtas na dako.\n3. CALL PNP: Para sa matinding kaso, tumawag agad sa PNP Women and Children Protection Center."
  }
];
