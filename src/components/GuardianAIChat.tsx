// src/components/GuardianAIChat.tsx
import { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, Settings as SettingsIcon, Mic, MicOff, Trash2, Download, Sun, Moon, Camera, AlertTriangle, Info } from 'lucide-react';
import { useGuardianChat } from '../hooks/useGuardianChat';
import GuardianAISettings from './GuardianAISettings';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import { useRBAC } from '../context/AuthContext';
import { syncService } from '../services/syncService';
import { guardianAI } from '../services/guardianAI';

const emergencyTemplates = [
  { label: "🔥 Sunog", prompt: "May nangyayaring sunog sa aming Purok. Ano ang dapat gawin ng komunidad ngayon?" },
  { label: "🩹 Medical Rescue", prompt: "May kasamang nakaranas ng matinding hirap sa paghinga at kawalan ng malay. Paano mag-lapat ng first aid?" },
  { label: "🌊 Pagbaha", prompt: "Mabilis na tumataas ang tubig-baha dahil sa bagyo. Ano ang opisyal na evacuation procedure?" },
  { label: "🚨 Kahina-hinala", prompt: "May mga kahina-hinalang tao na umaaligid sa aming pinto. Paano ito ligtas na haharapin?" },
  { label: "⚡ Kuryente", prompt: "May bumagsak na kable ng kuryente sa kalsada at kumikislap. Ano ang tamang safety protocol?" },
];

export default function GuardianAIChat({ isInline = false }: { isInline?: boolean }) {
  const { messages, sendMessage, clearConversation, isThinking } = useGuardianChat();
  const { profile } = useRBAC();
  
  const [isOpen, setIsOpen] = useState(isInline);
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([]); // base64 strings
  const [compatibility, setCompatibility] = useState<{
    supported: boolean;
    message: string;
    level: 'good' | 'warning' | 'error';
  }>({ supported: true, message: '', level: 'good' });

  // Enhanced Compatibility Check
  useEffect(() => {
    const checkCompatibility = async () => {
      const gpu = (navigator as any).gpu;

      if (!gpu) {
        setCompatibility({
          supported: false,
          message: "Hindi suportado ang WebGPU sa browser na ito. Maaari tayong gumamit ng server AI kung online.",
          level: 'error'
        });
        return;
      }

      // Browser-specific warnings
      const ua = navigator.userAgent;
      if (ua.includes("Firefox")) {
        setCompatibility({
          supported: true,
          message: "Firefox naman ito, subalit mas mabilis ang offline AI kapag sa Google Chrome.",
          level: 'warning'
        });
      } else if (ua.includes("Android") && !ua.includes("Chrome")) {
        setCompatibility({
          supported: true,
          message: "Inirerekomenda ang paggamit ng Google Chrome sa Android para sa mas mabilis na offline response.",
          level: 'warning'
        });
      } else {
        setCompatibility({
          supported: true,
          message: "WebGPU Ready ✓",
          level: 'good'
        });
      }
    };

    checkCompatibility();
  }, []);

  // Auto-suggest model loading when chat opens
  useEffect(() => {
    if (isOpen && compatibility.supported && !guardianAI.isLoaded) {
      const timer = setTimeout(() => {
        if (!guardianAI.isLoaded) {
          setShowSettings(true);
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isOpen, compatibility.supported]);

  const chatRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const capturePhoto = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.capture = 'environment'; // Rear camera on mobile
    fileInput.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target?.result as string;
          if (base64) {
            setAttachedPhotos(prev => [...prev, base64]);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  };

  const removePhoto = (index: number) => {
    setAttachedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Auto-open if inline
  useEffect(() => {
    if (isInline) {
      setIsOpen(true);
    }
  }, [isInline]);

  // WebLLM Progress Event Listener (from global event dispatcher)
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.type === 'progress') {
        const rawProgress = e.detail.payload.progress;
        const prog = Math.round(rawProgress <= 1 ? rawProgress * 100 : rawProgress);
        setLoadingProgress(prog);
      } else if (e.detail?.type === 'ready') {
        setLoadingProgress(100);
        setTimeout(() => setLoadingProgress(0), 1500);
      }
    };
    window.addEventListener('guardian-ai-event', handler);
    return () => window.removeEventListener('guardian-ai-event', handler);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const toggleVoiceInput = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert("Unsupported Speech recognition in current browser. Try Microsoft Edge or Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const rec = new SpeechRecognitionAPI();
      rec.lang = 'tl-PH'; // Native Filipino
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        if (result) {
          setInput(prev => (prev ? prev + ' ' : '') + result);
          sendMessage(result); // Auto send on transcript completion
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const handleSend = () => {
    if ((!input.trim() && attachedPhotos.length === 0) || isThinking) return;
    let finalInput = input.trim();
    if (attachedPhotos.length > 0) {
      finalInput += ` (May kalakip na ${attachedPhotos.length} larawan/ebidensya sa ulat na ito)`;
    }
    sendMessage(finalInput);
    setInput('');
  };

  const exportIncidentReport = async () => {
    if (messages.length === 0) {
      alert("Walang laman ang chat para i-export.");
      return;
    }

    // 1. Plain Text Format Download
    const reportHeadline = `GUARDIAN AI EMERGENCY INCIDENT REPORT\n` +
      `Barangay Tanod Emergency Unit • Date: ${new Date().toLocaleDateString('en-PH')}\n` +
      `Reporter Tanod: ${profile?.name || 'Unknown Officer'} (${profile?.id || profile?.uid || 'N/A'})\n` +
      `========================================================================\n\n`;
    
    const reportText = messages
      .map(m => {
        const timeStr = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '';
        return `[${timeStr}] ${m.role.toUpperCase()}:\n${m.content}\n`;
      })
      .join('\n------------------------------------------------------------\n');

    const blob = new Blob([reportHeadline + reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Tanod-Incident-Report-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    // 2. Beautiful PDF formatting download using jsPDF (auto-wraps and handles pagination)
    try {
      const doc = new jsPDF();
      
      // Top theme header decoration panel
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 42, 'F');
      
      // Label headers
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("GUARDIAN AI EMERGENCY INCIDENT REPORT", 14, 18);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(165, 180, 252); // indigo-300
      doc.text(`Barangay S.O.S. Command & Patrol System`, 14, 26);
      doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, 14, 32);
      
      // Overview stats box
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("REPORT OVERVIEW", 14, 52);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Total Logged Exchanges: ${messages.length}`, 14, 60);
      doc.text(`Reporter Officer: ${profile?.name || 'Local Barangay Tanod Officer'}`, 14, 66);
      doc.text(`Operational Target Core: Local Barangay Emergency Safety & Patrol Coordination`, 14, 72);
      
      // Section separator rule
      doc.setFont("helvetica", "bold");
      doc.text("LIVE DIALOG LOGS AND GUIDANCE:", 14, 84);
      doc.setFillColor(109, 40, 217); // purple-700 rule
      doc.rect(14, 86, 182, 1, 'F');
      
      // Iterate messages
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59); // graphite text
      
      let verticalCursor = 94;
      
      messages.forEach((m) => {
        if (verticalCursor > 270) {
          doc.addPage();
          verticalCursor = 20;
        }
        
        const timeStr = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '';
        const roleLabel = m.role === 'user' ? "Resident / Officer Prompt" : "Guardian AI Safety Helper";
        
        doc.setFont("helvetica", "bold");
        doc.text(`[${timeStr}] ${roleLabel}:`, 14, verticalCursor);
        verticalCursor += 5;
        
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(m.content, 182);
        
        lines.forEach((line: string) => {
          if (verticalCursor > 275) {
            doc.addPage();
            verticalCursor = 20;
          }
          doc.text(line, 14, verticalCursor);
          verticalCursor += 5;
        });
        
        verticalCursor += 4; // structural padding
      });
      
      // Add Photos to PDF Report
      if (attachedPhotos.length > 0) {
        doc.addPage();
        
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("ATTACHED PHOTO EVIDENCE (MGA LITRATONG EBIDENSYA)", 14, 13);
        
        let photoCursor = 35;
        for (const photo of attachedPhotos) {
          if (photoCursor > 150) {
            doc.addPage();
            photoCursor = 20;
          }
          try {
            doc.addImage(photo, 'JPEG', 14, photoCursor, 182, 110);
            photoCursor += 120;
          } catch (imgError) {
            console.error("Failed to add image to PDF:", imgError);
          }
        }
      }

      // Save PDF
      doc.save(`Brgy-Tanod-Incident-Report-${new Date().toISOString().slice(0, 10)}.pdf`);

      // === AUTO-SYNC QUEUE TO COMMAND CENTER ===
      const reportPayload = {
        type: "incident_report",
        reportId: `REP-${Date.now()}`,
        tanodId: profile?.id || profile?.uid || 'guest_tanod',
        tanodName: profile?.name || 'Active Barangay Officer',
        timestamp: new Date().toISOString(),
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : (m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString())
        })),
        attachedPhotosCount: attachedPhotos.length,
        generatedBy: "Guardian AI Chat",
      };

      await syncService.queueReport(reportPayload);
      setAttachedPhotos([]);
      alert("✅ Na-save na ang Report bilang PDF at nakapila na ito para i-sync sa Barangay Hall kapag online!");
    } catch (pdfErr) {
      console.error("Failed to generate report PDF: ", pdfErr);
      alert("❌ May problema sa pag-export. Subukan ulit.");
    }
  };

  return (
    <>
      {isInline ? null : (
        <>
          {/* Floating Action trigger button */}
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-36 right-6 bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-600 w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-2xl z-40 hover:scale-110 active:scale-95 transition-all border-4 border-white/20 hover:shadow-purple-500/20"
            title="Open Guardian AI Dialog"
            id="guardian-ai-floating-trigger"
          >
            🤖
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={`fixed bottom-24 right-6 w-96 h-[580px] rounded-3xl shadow-2xl flex flex-col z-[80] overflow-hidden font-sans border transition-all ${
                  isDark 
                    ? 'bg-[#0a1428] border-purple-500/30 text-white' 
                    : 'bg-white border-gray-200 text-gray-900 shadow-xl'
                }`}
              >
                {/* Header section with operational status and actions */}
                <div className={`p-4 border-b flex items-center justify-between transition-colors ${
                  isDark 
                    ? 'border-white/10 bg-gradient-to-r from-purple-950/80 to-[#0a1428]' 
                    : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                      isDark 
                        ? 'bg-purple-500/15 border-purple-500/30' 
                        : 'bg-purple-100 border-purple-300'
                    }`}>
                      <Bot className={`w-6 h-6 animate-pulse ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <div>
                      <p className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Guardian AI</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
                        <p className="text-[10px] text-green-500 font-mono uppercase tracking-wider font-semibold">Offline Guard</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setIsDark(!isDark)}
                      className={`p-1.5 rounded-xl transition ${isDark ? 'hover:bg-white/5 text-gray-400 hover:text-yellow-400' : 'hover:bg-gray-200 text-gray-500 hover:text-purple-600'}`}
                      title={isDark ? "Maliwanag na Mode" : "Madilim na Mode"}
                    >
                      {isDark ? <Sun size={17} /> : <Moon size={17} />}
                    </button>
                    <button 
                      onClick={exportIncidentReport}
                      className={`p-1.5 rounded-xl transition ${isDark ? 'hover:bg-white/5 text-gray-400 hover:text-emerald-400' : 'hover:bg-gray-200 text-gray-500 hover:text-emerald-600'}`}
                      title="I-export ang Report (PDF + Text)"
                    >
                      <Download size={17} />
                    </button>
                    <button 
                      onClick={clearConversation}
                      className={`p-1.5 rounded-xl transition ${isDark ? 'hover:bg-white/5 text-gray-400 hover:text-red-400' : 'hover:bg-gray-200 text-gray-500 hover:text-red-600'}`}
                      title="Burahin ang Chat"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button 
                      onClick={() => setShowSettings(true)}
                      className={`p-1.5 rounded-xl transition ${isDark ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-black'}`}
                      title="AI Config"
                    >
                      <SettingsIcon size={17} />
                    </button>
                    <button 
                      onClick={() => setIsOpen(false)}
                      className={`p-1.5 rounded-xl transition ${isDark ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-black'}`}
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Compatibility Banner */}
                {compatibility.level !== 'good' && (
                  <div className={`px-4 py-2.5 flex items-start gap-2.5 text-xs border-b ${
                    compatibility.level === 'error' 
                      ? isDark ? 'bg-red-950/40 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-800'
                      : isDark ? 'bg-amber-950/40 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    {compatibility.level === 'error' ? 
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" /> : 
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
                    }
                    <div className="flex-1">
                      <p className="font-medium">{compatibility.message}</p>
                      {compatibility.level === 'error' && (
                        <a 
                          href="https://www.google.com/chrome/" 
                          target="_blank" 
                          rel="noreferrer" 
                          className={`mt-1 inline-block font-semibold underline ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                        >
                          → I-download ang Google Chrome
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Model Load Warning / Status Progress bar */}
                {loadingProgress > 0 && loadingProgress < 100 && (
                  <div className={`px-4 py-2 text-xs border-b transition-colors ${
                    isDark ? 'bg-purple-950/35 border-purple-500/10' : 'bg-purple-50 border-purple-200'
                  }`}>
                    <div className={`mb-1 flex justify-between font-mono ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
                      <span>I-download ang AI model nang lokal...</span>
                      <span>{loadingProgress}%</span>
                    </div>
                    <div className="h-1 bg-gray-300 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300" style={{ width: `${loadingProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Quick Emergency Templates List */}
                <div className={`p-2.5 border-b flex gap-1.5 overflow-x-auto custom-scrollbar whitespace-nowrap scroll-smooth ${
                  isDark ? 'border-white/5 bg-slate-950/45' : 'border-gray-100 bg-gray-50/80'
                }`}>
                  {emergencyTemplates.map((template, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(template.prompt)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition active:scale-95 select-none ${
                        isDark
                          ? 'bg-slate-800 border border-white/5 text-gray-200 hover:bg-purple-600 hover:text-white hover:border-purple-500'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-purple-600 hover:text-white hover:border-purple-500 shadow-sm'
                      }`}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>

                {/* Chat message timeline scrolls here */}
                <div 
                  ref={chatRef} 
                  className={`flex-1 overflow-y-auto p-4 space-y-4 text-sm custom-scrollbar transition-colors ${
                    isDark ? 'bg-[#070e1c]' : 'bg-gray-50/40'
                  }`}
                >
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[85%] px-4 py-3 rounded-2xl leading-relaxed whitespace-pre-wrap shadow-sm transition-all ${
                          msg.role === 'user' 
                            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-none' 
                            : isDark
                              ? 'bg-slate-900 border border-white/5 text-gray-100 rounded-tl-none'
                              : 'bg-white border-gray-200 text-gray-800 rounded-tl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {isThinking && (
                    <div className="flex items-center gap-2 text-purple-500 text-xs pl-1">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                      </span>
                      <span>Sumusuri sa Barangay Protocols...</span>
                    </div>
                  )}
                </div>

                {/* Footer with speech actions and input controls */}
                <div className={`p-4 border-t transition-colors ${isDark ? 'border-white/10 bg-[#0a1428]' : 'border-gray-200 bg-white'}`}>
                  {attachedPhotos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2 border-b border-gray-100 dark:border-white/5">
                      {attachedPhotos.map((photo, index) => (
                        <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-300 dark:border-white/10 flex-shrink-0">
                          <img src={photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow transition active:scale-95 cursor-pointer"
                            title="Remove photo"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button 
                      onClick={toggleVoiceInput}
                      className={`p-3 rounded-2xl border transition-all ${
                        isListening 
                          ? 'bg-red-500 border-red-400 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                          : isDark
                            ? 'bg-slate-900 border-white/10 text-gray-400 hover:text-white hover:bg-slate-800'
                            : 'bg-gray-100 border-gray-300 text-gray-600 hover:text-purple-600 hover:bg-gray-200'
                      }`}
                      title="Mag-salita sa Native Tagalog"
                    >
                      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>

                    <button 
                      onClick={capturePhoto}
                      className={`p-3 rounded-2xl border transition-all ${
                        isDark
                          ? 'bg-slate-900 border-white/10 text-gray-400 hover:text-white hover:bg-slate-800'
                          : 'bg-gray-100 border-gray-300 text-gray-600 hover:text-purple-600 hover:bg-gray-200'
                      }`}
                      title="Kumuha o Mag-upload ng Ebidensya (Camera)"
                    >
                      <Camera size={18} />
                    </button>

                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder={isListening ? "Nakikinig sa iyo..." : "Magtanong ukol sa emergency..."}
                      className={`flex-1 border text-sm rounded-2xl px-4 py-3 outline-none transition ${
                        isDark 
                          ? 'bg-slate-950/80 border-white/15 focus:border-purple-500 text-gray-100 placeholder-gray-500'
                          : 'bg-gray-50 border-gray-300 focus:border-purple-500 text-gray-900 placeholder-gray-400'
                      }`}
                      disabled={isThinking}
                    />
                    
                    <button
                      onClick={handleSend}
                      disabled={isThinking || (!input.trim() && attachedPhotos.length === 0)}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 text-white p-3 rounded-2xl transition shadow-lg flex items-center justify-center cursor-pointer"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {isInline ? (
        <div 
          className={`w-full max-w-4xl mx-auto h-[620px] rounded-3xl flex flex-col overflow-hidden font-sans border transition-all ${
            isDark 
              ? 'bg-[#0a1428] border-purple-500/30 text-white' 
              : 'bg-white border-gray-200 text-gray-900 shadow-xl'
          }`}
        >
          {/* Header section with operational status and actions */}
          <div className={`p-4 border-b flex items-center justify-between transition-colors ${
            isDark 
              ? 'border-white/10 bg-gradient-to-r from-purple-950/80 to-[#0a1428]' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                isDark 
                  ? 'bg-purple-500/15 border-purple-500/30' 
                  : 'bg-purple-100 border-purple-300'
              }`}>
                <Bot className={`w-6 h-6 animate-pulse ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
              <div>
                <p className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Guardian AI Command Center</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
                  <p className="text-[10px] text-green-500 font-mono uppercase tracking-wider font-semibold">Active Inline Security Duty</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIsDark(!isDark)}
                className={`p-1.5 rounded-xl transition ${isDark ? 'hover:bg-white/5 text-gray-400 hover:text-yellow-400' : 'hover:bg-gray-200 text-gray-500 hover:text-purple-600'}`}
                title={isDark ? "Maliwanag na Mode" : "Madilim na Mode"}
              >
                {isDark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <button 
                onClick={exportIncidentReport}
                className={`p-1.5 rounded-xl transition ${isDark ? 'hover:bg-white/5 text-gray-400 hover:text-emerald-400' : 'hover:bg-gray-200 text-gray-500 hover:text-emerald-600'}`}
                title="I-export ang Report (PDF + Text)"
              >
                <Download size={17} />
              </button>
              <button 
                onClick={clearConversation}
                className={`p-1.5 rounded-xl transition ${isDark ? 'hover:bg-white/5 text-gray-400 hover:text-red-400' : 'hover:bg-gray-200 text-gray-500 hover:text-red-600'}`}
                title="Burahin ang Chat"
              >
                <Trash2 size={16} />
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className={`p-1.5 rounded-xl transition ${isDark ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-black'}`}
                title="AI Config"
              >
                <SettingsIcon size={17} />
              </button>
            </div>
          </div>

          {/* Compatibility Banner */}
          {compatibility.level !== 'good' && (
            <div className={`px-4 py-2.5 flex items-start gap-2.5 text-xs border-b ${
              compatibility.level === 'error' 
                ? isDark ? 'bg-red-950/40 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-800'
                : isDark ? 'bg-amber-950/40 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {compatibility.level === 'error' ? 
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" /> : 
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
              }
              <div className="flex-1">
                <p className="font-medium">{compatibility.message}</p>
                {compatibility.level === 'error' && (
                  <a 
                    href="https://www.google.com/chrome/" 
                    target="_blank" 
                    rel="noreferrer" 
                    className={`mt-1 inline-block font-semibold underline ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                  >
                    → I-download ang Google Chrome
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Model Load Warning / Status Progress bar */}
          {loadingProgress > 0 && loadingProgress < 100 && (
            <div className={`px-4 py-2 text-xs border-b transition-colors ${
              isDark ? 'bg-purple-950/35 border-purple-500/10' : 'bg-purple-50 border-purple-200'
            }`}>
              <div className={`mb-1 flex justify-between font-mono ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
                <span>I-download ang AI model nang lokal...</span>
                <span>{loadingProgress}%</span>
              </div>
              <div className="h-1 bg-gray-300 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300" style={{ width: `${loadingProgress}%` }} />
              </div>
            </div>
          )}

          {/* Quick Emergency Templates List */}
          <div className={`p-2.5 border-b flex gap-1.5 overflow-x-auto custom-scrollbar whitespace-nowrap scroll-smooth ${
            isDark ? 'border-white/5 bg-slate-950/45' : 'border-gray-100 bg-gray-50/80'
          }`}>
            {emergencyTemplates.map((template, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(template.prompt)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition active:scale-95 select-none ${
                  isDark
                    ? 'bg-slate-800 border border-white/5 text-gray-200 hover:bg-purple-600 hover:text-white hover:border-purple-500'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-purple-600 hover:text-white hover:border-purple-500 shadow-sm'
                }`}
              >
                {template.label}
              </button>
            ))}
          </div>

          {/* Chat message timeline scrolls here */}
          <div 
            ref={chatRef} 
            className={`flex-1 overflow-y-auto p-4 space-y-4 text-sm custom-scrollbar transition-colors ${
              isDark ? 'bg-[#070e1c]' : 'bg-gray-50/40'
            }`}
          >
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] px-4 py-3 rounded-2xl leading-relaxed whitespace-pre-wrap shadow-sm transition-all ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-none' 
                      : isDark
                        ? 'bg-slate-900 border border-white/5 text-gray-100 rounded-tl-none'
                        : 'bg-white border-gray-200 text-gray-800 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex items-center gap-2 text-purple-500 text-xs pl-1">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                <span>Sumusuri sa Barangay Protocols...</span>
              </div>
            )}
          </div>

          {/* Footer with speech actions and input controls */}
          <div className={`p-4 border-t transition-colors ${isDark ? 'border-white/10 bg-[#0a1428]' : 'border-gray-200 bg-white'}`}>
            {attachedPhotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-2 border-b border-gray-100 dark:border-white/5">
                {attachedPhotos.map((photo, index) => (
                  <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-300 dark:border-white/10 flex-shrink-0">
                    <img src={photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow transition active:scale-95 cursor-pointer"
                      title="Remove photo"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button 
                onClick={toggleVoiceInput}
                className={`p-3 rounded-2xl border transition-all ${
                  isListening 
                    ? 'bg-red-500 border-red-400 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                    : isDark
                      ? 'bg-slate-900 border-white/10 text-gray-400 hover:text-white hover:bg-slate-800'
                      : 'bg-gray-100 border-gray-300 text-gray-600 hover:text-purple-600 hover:bg-gray-200'
                }`}
                title="Mag-salita sa Native Tagalog"
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <button 
                onClick={capturePhoto}
                className={`p-3 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-slate-900 border-white/10 text-gray-400 hover:text-white hover:bg-slate-800'
                    : 'bg-gray-100 border-gray-300 text-gray-600 hover:text-purple-600 hover:bg-gray-200'
                }`}
                title="Kumuha o Mag-upload ng Ebidensya (Camera)"
              >
                <Camera size={18} />
              </button>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isListening ? "Nakikinig sa iyo..." : "Magtanong ukol sa emergency..."}
                className={`flex-1 border text-sm rounded-2xl px-4 py-3 outline-none transition ${
                  isDark 
                    ? 'bg-slate-950/80 border-white/15 focus:border-purple-500 text-gray-100 placeholder-gray-500'
                    : 'bg-gray-50 border-gray-300 focus:border-purple-500 text-gray-900 placeholder-gray-400'
                }`}
                disabled={isThinking}
              />
              
              <button
                onClick={handleSend}
                disabled={isThinking || (!input.trim() && attachedPhotos.length === 0)}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 text-white p-3 rounded-2xl transition shadow-lg flex items-center justify-center cursor-pointer"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Embedded Settings View overlay popup panel */}
      <GuardianAISettings 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </>
  );
}
