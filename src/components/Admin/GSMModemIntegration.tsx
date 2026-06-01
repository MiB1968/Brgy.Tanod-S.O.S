// src/components/Admin/GSMModemIntegration.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radio, 
  Cpu, 
  Terminal, 
  Check, 
  Play, 
  AlertTriangle, 
  Database,
  Unplug,
  History,
  CornerDownRight,
  RefreshCw,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { decompressSOS } from '../../services/smsCompression';
import { useIncidentStore } from '../../store/useIncidentStore';
import * as api from '../../lib/api';

interface SMSLog {
  id: string;
  sender: string;
  rawPayload: string;
  timestamp: string;
  status: 'pending' | 'decompressed' | 'failed_checksum' | 'alert_launched';
  decompressedData?: any;
}

interface GSMModemIntegrationProps {
  onClose?: () => void;
}

export default function GSMModemIntegration({ onClose }: GSMModemIntegrationProps) {
  const { addAlert } = useIncidentStore();

  const [isConnected, setIsConnected] = useState(true);
  const [comPort, setComPort] = useState('COM3_USB_SERIAL');
  const [baudRate, setBaudRate] = useState(115200);
  const [customPacketInput, setCustomPacketInput] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "[GSM] Loading AT+CGREG network registration handlers...",
    "[GSM] Modem identified: SIM800L v2.0.1 Chipset.",
    "[GSM] Serial bus synchronized on /dev/ttyUSB0 (Baud: 115200)",
    "[GSM] Status: ● CONNECTED to 'Globe Telecom' (RSSI: -64dBm, Strong)",
    "[GSM] Parsing listening buffer for SMS signals..."
  ]);
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([
    {
      id: "raw-1",
      sender: "+639175551234",
      rawPayload: "SOS:13.22360|120.59600|CR|H|451293|2",
      timestamp: new Date(Date.now() - 3600000).toLocaleString(),
      status: "alert_launched",
      decompressedData: {
        lat: 13.22360,
        lng: 120.59600,
        type: "CRIME",
        severity: "HIGH",
        timestamp: Date.now() - 3600000,
        victimCount: 2
      }
    },
    {
      id: "raw-2",
      sender: "+639184449876",
      rawPayload: "SOS:13.22950|120.58400|ME|L|198374|1",
      timestamp: new Date(Date.now() - 1800000).toLocaleString(),
      status: "decompressed",
      decompressedData: {
        lat: 13.22950,
        lng: 120.58400,
        type: "MEDICAL",
        severity: "LOW",
        timestamp: Date.now() - 1800000,
        victimCount: 1
      }
    }
  ]);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  const addConsoleLog = (text: string) => {
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${text}`]);
  };

  const handleDecompressAndTrigger = async (rawSms: string, sender: string) => {
    const trimmed = rawSms.trim();
    if (!trimmed) {
      toast.error("Raw GSM stream is empty.");
      return;
    }

    addConsoleLog(`Incoming SMS payload from ${sender}: "${trimmed}"`);

    // 1. Tactical decompression
    const payload = decompressSOS(trimmed);
    if (!payload) {
      addConsoleLog(`⚠ ERROR: Decompression failed for payload "${trimmed}". Checksum or packet header mismatch.`);
      
      const newLog: SMSLog = {
        id: crypto.randomUUID(),
        sender,
        rawPayload: trimmed,
        timestamp: new Date().toLocaleString(),
        status: 'failed_checksum'
      };
      setSmsLogs(prev => [newLog, ...prev]);
      toast.error("Payload corruption detected. Sync discarded.");
      return;
    }

    addConsoleLog(`✔ Decompressed Successfully: Type=${payload.type}, Severity=${payload.severity}, Location=${payload.lat}, ${payload.lng}`);

    const newSmsId = crypto.randomUUID();
    const newLog: SMSLog = {
      id: newSmsId,
      sender,
      rawPayload: trimmed,
      timestamp: new Date().toLocaleString(),
      status: 'decompressed',
      decompressedData: payload
    };

    setSmsLogs(prev => [newLog, ...prev]);

    // 2. Insert as a live system alert
    try {
      addConsoleLog("Dispatching emergency payload to live in-memory command grid...");
      
      const clientUuid = crypto.randomUUID();
      const alertData = {
        id: clientUuid,
        residentId: `gsm-${sender}`,
        residentName: `SMS Dispatch via ${sender}`,
        type: payload.type as any,
        location: { lat: payload.lat, lng: payload.lng },
        status: "pending" as const,
        description: `[CELLULAR SMS REPORTED VIA MODEM]\nVictims Count: ${payload.victimCount || 1}\nSeverity: ${payload.severity}\nPayload: ${trimmed}`,
        timestamp: new Date().toISOString(),
        photos: [],
      };

      // Push to client-side Zustand store for immediate awareness
      addAlert(alertData);

      // Persist in relational DB if online
      if (navigator.onLine) {
        try {
          await api.alerts.create({
            ...alertData,
            clientUuid
          });
          addConsoleLog("✔ Relational Database synchronized.");
        } catch (dbErr) {
          addConsoleLog(`⚠ DB sync skipped / stored locally: ${dbErr}`);
        }
      }

      setSmsLogs(prev => prev.map(log => 
        log.id === newSmsId ? { ...log, status: 'alert_launched' } : log
      ));

      toast.success(`🚨 MOBILE DETECTED: Alert broadcasted for ${payload.type}`);
    } catch (err: any) {
      addConsoleLog(`⚠ Failed to publish alert: ${err.message || err}`);
      toast.error("Command hub routing fault.");
    }
  };

  const handleManualSimulate = () => {
    if (!isConnected) {
      toast.error("Modem serial link is offline. Cannot process packet.");
      return;
    }
    const sample = customPacketInput.trim();
    if (!sample) return;
    
    handleDecompressAndTrigger(sample, "USB_COM_SIM");
    setCustomPacketInput('');
  };

  const precomposedPackets = [
    { label: "Crime Poblacion (High)", payload: "SOS:13.22360|120.59600|CR|H|451293|2" },
    { label: "Medical Outbreak Bagna (Low)", payload: "SOS:13.22950|120.58400|ME|L|198374|1" },
    { label: "Fire Capipisa (High)", payload: "SOS:13.21100|120.61200|FI|H|492813|4" },
    { label: "Domestic Abuse Talisay", payload: "SOS:13.21550|120.57800|DO|M|444987|1" }
  ];

  return (
    <div className="bg-[#14171E] border border-white/5 p-6 rounded-3xl w-full shadow-2xl relative overflow-hidden">
      {/* Visual top bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500" />
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3.5 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black font-mono tracking-tight text-white uppercase flex items-center gap-2">
              GSM MODEM RECEPTION CENTER
            </h3>
            <p className="text-xs text-white/40 font-mono uppercase tracking-widest mt-0.5">
              PHYSICAL HARDWARE SERIAL INTERFACE & CELL DECOMPRESSOR
            </p>
          </div>
        </div>
        
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Serial Configuration & Live Monitor */}
        <div className="space-y-4">
          <div className="bg-[#0C0E12] border border-white/5 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
              <span className="text-[10px] font-black font-mono text-white/40 uppercase tracking-widest">
                Serial Hardware Port Mapping
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {isConnected ? 'LIVE INTERFACE' : 'OFFLINE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-1.5 block">COM Port / Device Path</label>
                <select 
                  value={comPort}
                  onChange={(e) => {
                    setComPort(e.target.value);
                    addConsoleLog(`Port redirected to: ${e.target.value}`);
                  }}
                  className="w-full bg-[#14171E] border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                >
                  <option value="COM3_USB_SERIAL">COM3 (USB Serial)</option>
                  <option value="COM4_CELL_RELAY">COM4 (Cell Relay)</option>
                  <option value="/dev/ttyUSB0">/dev/ttyUSB0 (Linux Node)</option>
                  <option value="/dev/ttyAMA0">/dev/ttyAMA0 (Pi Header)</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-1.5 block">Hardware Baud Rate</label>
                <select 
                  value={baudRate}
                  onChange={(e) => {
                    setBaudRate(Number(e.target.value));
                    addConsoleLog(`Baud rate configured to: ${e.target.value} bps`);
                  }}
                  className="w-full bg-[#14171E] border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                >
                  <option value={9600}>9600 bps</option>
                  <option value={19200}>19200 bps</option>
                  <option value={57600}>57600 bps</option>
                  <option value={115200}>115200 bps</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                const next = !isConnected;
                setIsConnected(next);
                addConsoleLog(next ? `Modem linked on port ${comPort}.` : "Modem disconnected manually.");
                toast(next ? "Modem interface online" : "Modem disconnected");
              }}
              className={`w-full py-2.5 rounded-xl text-[10px] font-mono font-black uppercase tracking-widest transition-all ${
                isConnected 
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white'
              }`}
            >
              {isConnected ? "DISCONNECT BUS" : "RE-ESTABLISH BUS LINK"}
            </button>
          </div>

          {/* Console Output */}
          <div className="bg-black/80 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-500" />
                Raw modem terminal stream
              </span>
              <button 
                onClick={() => setConsoleLogs([])}
                className="text-[8px] font-mono text-white/30 hover:text-white uppercase tracking-widest"
              >
                Clear Live
              </button>
            </div>
            <div className="bg-[#050608] border border-white/5 rounded-xl p-3 h-48 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-1.5">
              {consoleLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  {log.startsWith('⚠') ? (
                    <span className="text-red-400">{log}</span>
                  ) : log.startsWith('✔') ? (
                    <span className="text-emerald-400">{log}</span>
                  ) : (
                    <span>{log}</span>
                  )}
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </div>

        {/* SMS Receiver Queue & Parser Testing */}
        <div className="space-y-4">
          <div className="bg-[#0C0E12] border border-white/5 p-4 rounded-2xl">
            <span className="text-[10px] font-black font-mono text-white/40 uppercase tracking-widest block mb-2">
              Inject / Receive Raw Packet Stream
            </span>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="e.g., SOS:13.22360|120.59600|CR|H|451293|2"
                value={customPacketInput}
                onChange={(e) => setCustomPacketInput(e.target.value)}
                className="flex-1 bg-[#14171E] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none font-mono placeholder:text-white/20"
              />
              <button
                onClick={handleManualSimulate}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black font-mono text-[10px] uppercase tracking-wider rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Play className="w-3 h-3 fill-black text-black" />
                PROCESS
              </button>
            </div>

            {/* Quick Test Vectors */}
            <div className="mt-3.5 pt-3.5 border-t border-white/5">
              <span className="text-[8px] font-mono font-black text-white/30 uppercase tracking-widest block mb-2">
                Simulated Precomposed Transmissions:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {precomposedPackets.map((pkt) => (
                  <button
                    key={pkt.label}
                    onClick={() => setCustomPacketInput(pkt.payload)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-left text-[9px] font-mono text-white/80 hover:text-white border border-transparent hover:border-white/5"
                  >
                    <div className="font-bold flex items-center gap-1">
                      <CornerDownRight className="w-2.5 h-2.5 text-amber-500" />
                      {pkt.label}
                    </div>
                    <div className="text-[8px] text-white/25 truncate font-bold mt-1">
                      {pkt.payload}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Historical Logs of Incoming Radio Packets */}
          <div className="bg-[#0C0E12] border border-white/5 p-4 rounded-2xl">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block font-mono mb-3 border-b border-white/5 pb-2">
              Transmitted Cellular Log History
            </span>

            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {smsLogs.map((log) => {
                const isFail = log.status === 'failed_checksum';
                const isSuccess = log.status === 'decompressed' || log.status === 'alert_launched';

                return (
                  <div key={log.id} className="p-2.5 bg-black/35 rounded-xl border border-white/5 text-[10px] font-mono flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white/80">{log.sender}</span>
                        <span className="text-[8px] text-white/30">{log.timestamp}</span>
                      </div>
                      <div className="text-white/40 break-all bg-black/45 p-1 rounded font-bold">
                        {log.rawPayload}
                      </div>
                      
                      {log.decompressedData && (
                        <div className="mt-1.5 text-[8px] text-emerald-400 flex items-center gap-1.5">
                          <Check className="w-3 h-3" />
                          <span>
                            Parsed: {log.decompressedData.type} | SEV: {log.decompressedData.severity}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      {log.status === 'failed_checksum' && (
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-widest">
                          Bad Checksum
                        </span>
                      )}
                      {log.status === 'decompressed' && (
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
                          Parsed
                        </span>
                      )}
                      {log.status === 'alert_launched' && (
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                          Alert Run
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
