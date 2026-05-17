import { useState } from "react";

const ALL_FEATURES = [
  // ── ALREADY BUILT ──────────────────────────────────────────────────────────
  {
    id: 1, status: "BUILT", tier: "RESIDENT",
    title: "Voice SOS Auto-Fill",
    tagalog: "Boses → SOS Form",
    file: "voiceSOSAgent.ts",
    effort: 1, impact: 10, savesCost: true, offline: true,
    what: "Resident speaks Taglish → WebLLM extracts type, location, severity → auto-fills SOS.",
    example: '"May sunog sa likod ng simbahan" → FIRE, severity 8',
  },

  // ── RESIDENT (NEW) ─────────────────────────────────────────────────────────
  {
    id: 2, status: "EASY", tier: "RESIDENT",
    title: "Offline First-Aid Guide",
    tagalog: "Gabay sa Unang Tulong",
    file: "SOSChat.tsx",
    effort: 1, impact: 10, savesCost: true, offline: true,
    what: "When SOS is MEDICAL + no internet, WebLLM gives step-by-step first aid in Tagalog while Tanod arrives.",
    example: "MEDICAL SOS, no network → 'Huwag ilipat. Itaas ang binti. Pigilan ang dugo...'",
  },
  {
    id: 3, status: "EASY", tier: "RESIDENT",
    title: "SOS Chat Co-pilot",
    tagalog: "AIKasama sa Chat",
    file: "SOSChat.tsx",
    effort: 2, impact: 9, savesCost: true, offline: true,
    what: "While waiting for Tanod, WebLLM sends calm actionable instructions inside the SOS chat automatically.",
    example: "FIRE alert → 'Lumayo agad sa usok. Huwag bumalik para sa gamit.'",
  },
  {
    id: 4, status: "EASY", tier: "RESIDENT",
    title: "Voice Registration Fill",
    tagalog: "Boses para sa Form",
    file: "RegistrationForm.tsx",
    effort: 2, impact: 8, savesCost: false, offline: true,
    what: "Resident speaks their details instead of typing. WebLLM parses 'Ang pangalan ko ay Juan, 35 taong gulang...' into form fields. Critical for less-literate residents.",
    example: "'Nakatira ako sa 45 Rizal Street, Purok 2' → address, street, purok auto-filled",
  },
  {
    id: 5, status: "EASY", tier: "RESIDENT",
    title: "Report Status Explainer",
    tagalog: "Paliwanag ng Status",
    file: "CitizenReportTracker.tsx",
    effort: 1, impact: 7, savesCost: true, offline: true,
    what: "When resident checks their report, WebLLM writes a personalized Tagalog explanation of exactly what is happening with it — not just a raw status label.",
    example: "'responding' → 'Ang inyong ulat ay kasalukuyang sinasagot ni Tanod Juan. Inaasahang darating sa loob ng 10 minuto.'",
  },
  {
    id: 6, status: "EASY", tier: "RESIDENT",
    title: "Resident Q&A Chatbot",
    tagalog: '"Tanong kay Guardian"',
    file: "ResidentDashboard.tsx",
    effort: 2, impact: 7, savesCost: true, offline: true,
    what: "A simple Ask button. Resident types or speaks questions about emergencies, barangay rules, what to do. Fully offline after model load.",
    example: "'Paano mag-report ng nawawalang bata?' → step-by-step guide in Tagalog",
  },

  // ── TANOD (NEW) ────────────────────────────────────────────────────────────
  {
    id: 7, status: "EASY", tier: "TANOD",
    title: "Incident Report Auto-Writer",
    tagalog: "AI na Sumulat ng Blotter",
    file: "IncidentForm.tsx",
    effort: 2, impact: 10, savesCost: true, offline: true,
    what: "Tanod fills basic fields. WebLLM writes the full formal Filipino narrative — proper grammar, complete sentences, legal tone. Turns 5 words into a proper report.",
    example: "'away, 3 lalaki, pinahiwalay' → 'Sa ika-3 ng hapon, tatlong lalaki ang nakipagtalo...'",
  },
  {
    id: 8, status: "EASY", tier: "TANOD",
    title: "Real-time Severity Escalator",
    tagalog: "Live na Pagsuri ng Panganib",
    file: "AlertDetailsModal.tsx",
    effort: 2, impact: 9, savesCost: true, offline: true,
    what: "As new chat messages arrive in an active SOS, WebLLM silently re-evaluates. If severity jumps (weapon mentioned), it alerts Tanod immediately.",
    example: "'may dala siyang kutsilyo' → Severity 5→9, banner: '⚠️ WEAPON DETECTED'",
  },
  {
    id: 9, status: "MEDIUM", tier: "TANOD",
    title: "Shift Handover Briefing",
    tagalog: "Ulat sa Susunod na Tanod",
    file: "TanodDashboard.tsx",
    effort: 3, impact: 8, savesCost: false, offline: true,
    what: "When a Tanod's shift ends, WebLLM auto-generates a written briefing of everything that happened — for the next Tanod coming on duty to read immediately.",
    example: "'3 incidents, 1 unresolved in Purok 3, resident Juan still nervous. Recommend check-in.'",
  },
  {
    id: 10, status: "MEDIUM", tier: "TANOD",
    title: "Patrol Route Suggester",
    tagalog: "Pinakamainam na Ruta",
    file: "PatrolScheduler.tsx",
    effort: 3, impact: 7, savesCost: false, offline: true,
    what: "Feed this week's incident hotspots to WebLLM. It suggests which streets each Tanod should prioritize tonight — in plain Tagalog with reasons.",
    example: "'Purok 3 ay may 4 insidente. Inirekomenda: patrol tuwing 9PM-12MN sa Rizal St.'",
  },
  {
    id: 11, status: "MEDIUM", tier: "TANOD",
    title: "New Tanod Training Simulator",
    tagalog: "Pagsasanay para sa Bagong Tanod",
    file: "TanodRosterView.tsx",
    effort: 3, impact: 8, savesCost: false, offline: true,
    what: "A chatbot that simulates emergency scenarios for new Tanod officers to practice responses. 100% offline, no server. Captain sets the scenario, WebLLM plays the role of a resident.",
    example: "Captain: 'Simulate a FIRE at Purok 4' → WebLLM: 'May sunog! Tulungan niyo kami!'",
  },
  {
    id: 12, status: "EASY", tier: "TANOD",
    title: "Witness Statement Summarizer",
    tagalog: "Buod ng Sinabi ng Saksi",
    file: "WitnessService.ts",
    effort: 2, impact: 8, savesCost: true, offline: true,
    what: "When witnesses submit text statements, WebLLM extracts the key facts, detects contradictions between multiple witnesses, and writes a clean summary for the incident report.",
    example: "3 witness statements → 'Lahat ay nagpapatunay ng away. 2 of 3 say weapon present. Contradiction on suspect description.'",
  },

  // ── ADMIN (NEW) ────────────────────────────────────────────────────────────
  {
    id: 13, status: "EASY", tier: "ADMIN",
    title: "Weekly Report Generator",
    tagalog: "Auto na Ulat sa Kapitan",
    file: "TanodActivityLogs.tsx",
    effort: 2, impact: 9, savesCost: true, offline: true,
    what: "One click: feed all week's logs to WebLLM → it writes the official barangay weekly report the captain can sign. Proper Filipino, formatted paragraphs.",
    example: "'Sa nakalipas na linggo, 12 ulat ang natanggap: 4 sunog, 3 krimen...'",
  },
  {
    id: 14, status: "EASY", tier: "ADMIN",
    title: "Anomaly Alert in Plain Tagalog",
    tagalog: "AI na Paliwanag ng Anomalya",
    file: "anomalyDetectionService.ts",
    effort: 1, impact: 8, savesCost: false, offline: true,
    what: "Your anomaly service gives a riskScore. WebLLM converts it to a real Tagalog explanation the admin actually understands and acts on.",
    example: "riskScore: 87 → 'Ang admin na ito ay nagpadala ng 15 utos sa loob ng 20 minuto sa gabi. Posibleng kompromiso.'",
  },
  {
    id: 15, status: "EASY", tier: "ADMIN",
    title: "Broadcast Message Drafter",
    tagalog: "AI na Sulat ng Broadcast",
    file: "SOSBroadcastPanel.tsx",
    effort: 1, impact: 7, savesCost: true, offline: true,
    what: "Admin selects type + severity. WebLLM drafts a proper broadcast message in Filipino — calm, clear, actionable. Admin edits then approves.",
    example: "FIRE, severity 8 → 'PANSIN: May nasusunog sa Purok 4. Mangyaring lumayo at...'",
  },
  {
    id: 16, status: "MEDIUM", tier: "ADMIN",
    title: "Duplicate SOS Detector",
    tagalog: "Pagtukoy ng Parehong SOS",
    file: "AdminDashboard.tsx",
    effort: 3, impact: 8, savesCost: true, offline: true,
    what: "Multiple SOS arrive in same area within 5 minutes. WebLLM compares descriptions to detect if same incident — prevents splitting Tanod resources unnecessarily.",
    example: "'Sunog sa simbahan' + 'Apoy sa kanto ng simbahan' → ⚠️ Likely same incident",
  },
  {
    id: 17, status: "EASY", tier: "ADMIN",
    title: "Natural Language Log Search",
    tagalog: "Maghanap sa Logs ng Tagalog",
    file: "ReviewArchivedLogsDrawer.tsx",
    effort: 2, impact: 8, savesCost: false, offline: true,
    what: "Instead of scrolling through archived logs, admin types natural language queries. WebLLM filters and summarizes the matching entries.",
    example: "'Lahat ng sunog sa Purok 3 noong Enero' → instant filtered + summarized results",
  },
  {
    id: 18, status: "MEDIUM", tier: "ADMIN",
    title: "Hotspot Pattern Detector",
    tagalog: "Mapa ng Mapanganib na Lugar",
    file: "AdminAnalytics.tsx",
    effort: 4, impact: 9, savesCost: false, offline: true,
    what: "Feed a month of incident data. WebLLM identifies recurring patterns: same location, time, type. Outputs a written intelligence briefing for the captain.",
    example: "'3 fights on Rizal St every Friday night. Possible connection to nearby drinking spot.'",
  },
  {
    id: 19, status: "EASY", tier: "ADMIN",
    title: "Registration Application Screener",
    tagalog: "AI na Pagsusuri ng Aplikasyon",
    file: "AdminResidents.tsx",
    effort: 2, impact: 7, savesCost: false, offline: true,
    what: "When admin reviews pending registrations, WebLLM checks for incomplete data, suspicious patterns, duplicate addresses — gives a quick risk note per application.",
    example: "Two residents with same address and phone → '⚠️ Possible duplicate registration. Verify identity.'",
  },
  {
    id: 20, status: "MEDIUM", tier: "ADMIN",
    title: "Map Tactical Briefing",
    tagalog: "Buod ng Live Map",
    file: "LiveMap.tsx",
    effort: 3, impact: 7, savesCost: false, offline: true,
    what: "Admin opens the live map. WebLLM reads all active alerts + Tanod positions and generates a plain Tagalog situational briefing — like a real operations center.",
    example: "'2 aktibong insidente. Pinaka-urgent: sunog sa Purok 4. Pinakamalapit na Tanod: 400m ang layo.'",
  },

  // ── SYSTEM (NEW) ───────────────────────────────────────────────────────────
  {
    id: 21, status: "EASY", tier: "SYSTEM",
    title: "TTS Text Pre-processor",
    tagalog: "Mas Maayos na Tagalog TTS",
    file: "tts.worker.ts",
    effort: 2, impact: 7, savesCost: false, offline: true,
    what: "Before text goes to your ONNX TTS engine, WebLLM improves it — fixes grammar, expands abbreviations, adds proper sentence breaks. Makes announcements sound more natural.",
    example: "'SOS rcvd fr Purok3 re fire' → 'Natanggap ang SOS mula sa Purok Tatlo. May nasusunog.'",
  },
  {
    id: 22, status: "MEDIUM", tier: "SYSTEM",
    title: "Voice Biometrics Fallback",
    tagalog: "Pangalawang Paraan ng Pagpapatunay",
    file: "VoiceBiometricModal.tsx",
    effort: 3, impact: 8, savesCost: false, offline: true,
    what: "Your biometrics service is currently a scaffold that always returns false. WebLLM can do a Tagalog challenge-response Q&A as a real fallback verification layer.",
    example: "WebLLM asks: 'Anong pangalan ng inyong barangay captain?' → Admin answers → verified",
  },
  {
    id: 23, status: "EASY", tier: "SYSTEM",
    title: "SOS Sentiment Detector",
    tagalog: "Pagtukoy ng Takot sa Chat",
    file: "SOSChat.tsx",
    effort: 2, impact: 8, savesCost: true, offline: true,
    what: "WebLLM reads the resident's messages during an active SOS and detects panic level. If escalating distress is detected, it alerts the responding Tanod to expedite.",
    example: "Chat messages become shorter + capital letters → 'Resident distress level HIGH. Expedite response.'",
  },
  {
    id: 24, status: "MEDIUM", tier: "SYSTEM",
    title: "Blotter Legal Template Filler",
    tagalog: "Automatic na Blotter",
    file: "IncidentForm.tsx + server",
    effort: 3, impact: 9, savesCost: true, offline: true,
    what: "Philippine barangay blotter has a strict legal format. WebLLM fills the entire template from incident data — proper legal Filipino, case numbers, complete narrative. Ready to print.",
    example: "Incident data → Full printed blotter: 'Ito ay nagpapatunay na noong ika-18 ng Mayo...'",
  },
];

const TIERS = ["RESIDENT", "TANOD", "ADMIN", "SYSTEM"];
const TIER_COLORS: Record<string, any> = {
  RESIDENT: { main: "#ef4444", dim: "#ef444420", border: "#ef444440", label: "Para sa Residente" },
  TANOD:    { main: "#f97316", dim: "#f9731620", border: "#f9731640", label: "Para sa Tanod" },
  ADMIN:    { main: "#3b82f6", dim: "#3b82f620", border: "#3b82f640", label: "Para sa Admin" },
  SYSTEM:   { main: "#a855f7", dim: "#a855f720", border: "#a855f740", label: "System-level" },
};
const STATUS_STYLE: Record<string, any> = {
  BUILT:  { bg: "#10b98120", border: "#10b98140", text: "#10b981", dot: "#10b981" },
  EASY:   { bg: "#06b6d420", border: "#06b6d440", text: "#06b6d4", dot: "#06b6d4" },
  MEDIUM: { bg: "#f59e0b20", border: "#f59e0b40", text: "#f59e0b", dot: "#f59e0b" },
  HARD:   { bg: "#ef444420", border: "#ef444440", text: "#ef4444", dot: "#ef4444" },
};

function Bar({ val, color, max = 10 }: { val: number, color: string, max?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "#ffffff15", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${(val / max) * 100}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 10, color: "#ffffff50", fontFamily: "monospace", minWidth: 28 }}>{val}/10</span>
    </div>
  );
}

export function WebLLMFeatureMap() {
  const [selected, setSelected] = useState(ALL_FEATURES[0]);
  const [tier, setTier] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [view, setView] = useState("list"); // list | matrix

  const filtered = ALL_FEATURES
    .filter(f => tier === "ALL" || f.tier === tier)
    .filter(f => statusFilter === "ALL" || f.status === statusFilter);

  const grouped = TIERS.reduce((acc, t) => {
    const items = filtered.filter(f => f.tier === t);
    if (items.length) acc[t] = items;
    return acc;
  }, {} as Record<string, typeof ALL_FEATURES>);

  const sel = selected;
  const ss = STATUS_STYLE[sel.status];
  const tc = TIER_COLORS[sel.tier];

  const totalEasy = ALL_FEATURES.filter(f => f.status === "EASY").length;
  const totalBuilt = ALL_FEATURES.filter(f => f.status === "BUILT").length;
  const totalSaves = ALL_FEATURES.filter(f => f.savesCost).length;
  const totalOffline = ALL_FEATURES.filter(f => f.offline).length;

  return (
    <div className="rounded-3xl" style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", background: "#080a0f", minHeight: "600px", color: "#fff", padding: "20px 16px" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 10, letterSpacing: "0.25em", color: "#ef444480", textTransform: "uppercase", fontWeight: 700 }}>WebLLM Intelligence Map — Complete</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>Brgy. Tanod S.O.S.</h1>
        <p style={{ fontSize: 11, color: "#ffffff50", margin: "4px 0 0" }}>24 features · 1 model download · zero API cost per run</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
        {[
          { label: "Total Features", val: ALL_FEATURES.length, color: "#ffffff" },
          { label: "Easy to Add", val: totalEasy, color: "#06b6d4" },
          { label: "Saves Gemini ₱", val: totalSaves, color: "#f59e0b" },
          { label: "Offline", val: totalOffline, color: "#10b981" },
        ].map(s => (
          <div key={s.label} style={{ background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 9, color: "#ffffff40", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        {["ALL", ...TIERS].map(t => (
          <button key={t} onClick={() => setTier(t)} style={{
            padding: "4px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", cursor: "pointer", border: "1px solid",
            background: tier === t ? "#ffffff20" : "#ffffff08",
            borderColor: tier === t ? "#ffffff40" : "#ffffff15",
            color: tier === t ? "#fff" : "#ffffff50",
          }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {["ALL", "BUILT", "EASY", "MEDIUM"].map(s => {
          const st = STATUS_STYLE[s] || { bg: "#ffffff10", border: "#ffffff20", text: "#ffffff60" };
          return (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: "3px 8px", borderRadius: 99, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", cursor: "pointer", border: `1px solid`,
              background: statusFilter === s ? st.bg : "#ffffff05",
              borderColor: statusFilter === s ? st.border : "#ffffff10",
              color: statusFilter === s ? st.text : "#ffffff30",
            }}>{s}</button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Feature List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.entries(grouped).map(([t, features]) => {
            const tc2 = TIER_COLORS[t];
            return (
              <div key={t}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: tc2.main }} />
                  <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", color: tc2.main + "bb" }}>
                    {t} — {tc2.label}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "#ffffff08" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
                  {features.map(f => {
                    const fs = STATUS_STYLE[f.status];
                    const isActive = selected.id === f.id;
                    return (
                      <button key={f.id} onClick={() => setSelected(f)} style={{
                        textAlign: "left", padding: "12px 14px", borderRadius: 14,
                        border: `1px solid ${isActive ? "#ffffff30" : "#ffffff10"}`,
                        background: isActive ? "#ffffff10" : "#ffffff04",
                        cursor: "pointer", transition: "all 0.15s",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{f.title}</div>
                            <div style={{ fontSize: 9, color: "#ffffff40", marginTop: 2 }}>{f.tagalog}</div>
                          </div>
                          <span style={{
                            fontSize: 8, fontWeight: 900, padding: "2px 7px", borderRadius: 99,
                            background: fs.bg, border: `1px solid ${fs.border}`, color: fs.text,
                            marginLeft: 6, whiteSpace: "nowrap", letterSpacing: "0.1em",
                          }}>{f.status}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 9, color: f.offline ? "#10b981" : "#ffffff30" }}>
                            {f.offline ? "✅" : "❌"} offline
                          </span>
                          <span style={{ fontSize: 9, color: f.savesCost ? "#f59e0b" : "#ffffff30" }}>
                            {f.savesCost ? "💰 saves API" : "➕ new feature"}
                          </span>
                          <span style={{ marginLeft: "auto", fontSize: 11 }}>
                            {"⚡".repeat(Math.min(Math.ceil(f.impact / 4), 3))}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        <div style={{ background: "#ffffff06", border: "1px solid #ffffff12", borderRadius: 18, padding: 20 }}>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 8, fontWeight: 900, padding: "3px 8px", borderRadius: 99, background: ss.bg, border: `1px solid ${ss.border}`, color: ss.text, letterSpacing: "0.1em" }}>
                  {sel.status}
                </span>
                <span style={{ fontSize: 8, fontWeight: 900, padding: "3px 8px", borderRadius: 99, background: tc.dim, border: `1px solid ${tc.border}`, color: tc.main, letterSpacing: "0.1em" }}>
                  {sel.tier}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, lineHeight: 1.2 }}>{sel.title}</h2>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ffffff50" }}>{sel.tagalog}</p>
            </div>
            <div style={{ fontSize: 9, color: "#ffffff30", background: "#ffffff08", padding: "4px 10px", borderRadius: 99, border: "1px solid #ffffff10", whiteSpace: "nowrap" }}>
              📁 {sel.file}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[["Impact", sel.impact, "#ef4444"], ["Effort (low=easy)", sel.effort, "#3b82f6"]].map(([label, val, color]) => (
              <div key={label as string} style={{ background: "#ffffff06", borderRadius: 10, padding: "10px 12px", border: "1px solid #ffffff08" }}>
                <div style={{ fontSize: 9, color: "#ffffff40", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{label as string}</div>
                <Bar val={val as number} color={color as string} />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {sel.offline && <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 99, background: "#10b98115", border: "1px solid #10b98130", color: "#10b981" }}>✅ 100% Offline</span>}
            {sel.savesCost && <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 99, background: "#f59e0b15", border: "1px solid #f59e0b30", color: "#f59e0b" }}>💰 Saves Gemini API</span>}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "#ffffff40", marginBottom: 6 }}>What it does</div>
            <p style={{ margin: 0, fontSize: 13, color: "#ffffffcc", lineHeight: 1.6 }}>{sel.what}</p>
          </div>

          <div style={{ background: "#000000aa", borderRadius: 12, padding: 14, border: "1px solid #ffffff08" }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "#ffffff30", marginBottom: 6 }}>Example</div>
            <p style={{ margin: 0, fontSize: 12, color: "#67e8f9cc", fontFamily: "monospace", lineHeight: 1.5 }}>{sel.example}</p>
          </div>

          {sel.status !== "BUILT" && (
            <div style={{ marginTop: 14, background: "#ffffff04", borderRadius: 12, padding: 12, border: "1px solid #ffffff08" }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "#ffffff30", marginBottom: 4 }}>Build time estimate</div>
              <p style={{ margin: 0, fontSize: 11, color: "#ffffff50", lineHeight: 1.5 }}>
                {sel.effort <= 1
                  ? "~30 min. Change the system prompt in voiceSOSAgent.ts. Wire to component."
                  : sel.effort === 2
                  ? "~1–2 hours. Copy agent pattern → new prompt → connect to existing component."
                  : sel.effort === 3
                  ? "~half day. Needs state + streaming output + possibly a data aggregation step."
                  : "~1–2 days. Requires data pipeline + multi-step agent + UI for results."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
