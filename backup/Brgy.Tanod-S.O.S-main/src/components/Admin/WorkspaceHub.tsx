import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Calendar, 
  Plus, 
  Settings, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  LogOut,
  CheckSquare,
  FileText,
  Presentation,
  FormInput,
  PlusCircle
} from 'lucide-react';
import { 
  chatService, 
  calendarService, 
  workspaceAuth,
  taskService,
  docsService,
  slidesService,
  formsService 
} from '../../services/googleWorkspaceService';
import { TacticalCard } from '../Tactical/TacticalCard';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

export function WorkspaceHub({ profile }: { profile: any }) {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [taskLists, setTaskLists] = useState<any[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>(localStorage.getItem('brgy_chat_space') || '');
  const [selectedTaskList, setSelectedTaskList] = useState<string>(localStorage.getItem('brgy_task_list') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [isCalendarEnabled, setIsCalendarEnabled] = useState(localStorage.getItem('brgy_calendar_enabled') === 'true');
  const [activeTab, setActiveTab] = useState<'comms' | 'reporting'>('comms');

  const token = workspaceAuth.getAccessToken();

  useEffect(() => {
    if (token) {
      loadWorkspaceData();
    }
  }, [token]);

  const loadWorkspaceData = async () => {
    setIsLoading(true);
    try {
      const [spacesRes, eventsRes, taskListsRes] = await Promise.all([
        chatService.listSpaces(),
        calendarService.listEvents(),
        taskService.listTaskLists()
      ]);

      if (spacesRes.spaces) setSpaces(spacesRes.spaces);
      if (eventsRes.items) setEvents(eventsRes.items.slice(0, 5));
      if (taskListsRes.items) setTaskLists(taskListsRes.items);
      
    } catch (err: any) {
      console.error("Workspace load error:", err);
      toast.error("Failed to load Workspace data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSpace = (name: string) => {
    setSelectedSpace(name);
    localStorage.setItem('brgy_chat_space', name);
    toast.success("Chat Space Optimized");
  };

  const handleSelectTaskList = (id: string) => {
    setSelectedTaskList(id);
    localStorage.setItem('brgy_task_list', id);
    toast.success("Task List Synchronized");
  };

  const createTacticalDoc = async (type: 'doc' | 'slides' | 'form') => {
    const toastId = toast.loading(`Generating Tactical ${type.toUpperCase()}...`);
    try {
      let res;
      const title = `BRGY_TANOD_REPORT_${new Date().toISOString()}`;
      
      if (type === 'doc') res = await docsService.createDocument(title);
      if (type === 'slides') res = await slidesService.createPresentation(title);
      if (type === 'form') res = await formsService.createForm(title);
      
      toast.success(`${type.toUpperCase()} Generated Successfully`, { id: toastId });
      if (res.documentId || res.presentationId || res.formId) {
        const id = res.documentId || res.presentationId || res.formId;
        const url = type === 'doc' ? `https://docs.google.com/document/d/${id}/edit` :
                    type === 'slides' ? `https://docs.google.com/presentation/d/${id}/edit` :
                    `https://docs.google.com/forms/d/${id}/edit`;
        window.open(url, '_blank');
      }
    } catch (err) {
      toast.error(`Generation Failed`, { id: toastId });
    }
  };

  const toggleCalendar = () => {
    const next = !isCalendarEnabled;
    setIsCalendarEnabled(next);
    localStorage.setItem('brgy_calendar_enabled', String(next));
    toast.success(next ? "Calendar Logging Active" : "Calendar Logging Paused");
  };

  if (!token) {
    return (
      <TacticalCard className="p-8 border-white/5 bg-white/5">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
             <RefreshCw className="w-10 h-10 text-white/20 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-xl font-black italic tracking-tighter uppercase font-mono text-white">Google Workspace Link Required</h3>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-2 px-12 leading-relaxed">Connect Google Chat and Calendar to mirror alerts and incident logs for professional command oversight</p>
          </div>
          <button 
            onClick={() => workspaceAuth.signIn().then(loadWorkspaceData)}
            className="px-12 py-4 bg-white text-black font-black font-mono text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-tactical-cyan hover:text-black transition-all active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
          >
            Connect Neural Link
          </button>
        </div>
      </TacticalCard>
    );
  }

  return (
    <TacticalCard className="p-0 overflow-hidden border-tactical-cyan/20 bg-tactical-dark/80 backdrop-blur-xl">
      <div className="px-8 py-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-tactical-cyan/10 flex items-center justify-center border border-tactical-cyan/30">
            <RefreshCw className={cn("w-5 h-5 text-tactical-cyan", isLoading && "animate-spin")} />
          </div>
          <div>
            <h3 className="text-sm font-black italic tracking-tighter uppercase font-mono text-white">Workspace HUB</h3>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
               <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Neural Link: ESTABLISHED</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadWorkspaceData}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4 text-white/20", isLoading && "animate-spin")} />
          </button>
          <button 
            onClick={() => {
              workspaceAuth.logout();
              window.location.reload();
            }}
            className="p-2 hover:bg-tactical-red/20 rounded-lg transition-colors group"
            title="Disconnect Neural Link"
          >
            <LogOut className="w-4 h-4 text-white/20 group-hover:text-tactical-red" />
          </button>
        </div>
      </div>

      <div className="px-8 py-2 border-b border-white/5 flex gap-4">
        <button 
          onClick={() => setActiveTab('comms')}
          className={cn(
            "px-4 py-2 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all",
            activeTab === 'comms' ? "border-tactical-cyan text-tactical-cyan" : "border-transparent text-white/30 hover:text-white/60"
          )}
        >
          Communications
        </button>
        <button 
          onClick={() => setActiveTab('reporting')}
          className={cn(
            "px-4 py-2 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all",
            activeTab === 'reporting' ? "border-tactical-cyan text-tactical-cyan" : "border-transparent text-white/30 hover:text-white/60"
          )}
        >
          Tactical Reporting
        </button>
      </div>

      <div className="p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'comms' ? (
            <motion.div 
              key="comms"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Chat Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-info uppercase font-mono font-black italic tracking-tighter">
                  <MessageSquare className="w-4 h-4" />
                  <span>SOS Chat Dispatch</span>
                </div>
                
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-white/20 uppercase tracking-widest block">Select Notification Space</label>
                  <select 
                    value={selectedSpace}
                    onChange={(e) => handleSelectSpace(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white font-mono text-[11px] focus:border-info/50 outline-none uppercase tracking-widest"
                  >
                    <option value="">[ SELECT COMMAND SPACE ]</option>
                    {spaces.map(s => (
                      <option key={s.name} value={s.name}>{s.displayName || s.name}</option>
                    ))}
                  </select>
                  {selectedSpace && (
                    <div className="p-4 rounded-2xl bg-success/5 border border-success/20 flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="text-[9px] font-bold text-success/60 uppercase tracking-widest">SOS Alerts will be mirrored here</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tasks Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-tactical-cyan uppercase font-mono font-black italic tracking-tighter">
                  <CheckSquare className="w-4 h-4" />
                  <span>Tanod Logistics Tasks</span>
                </div>
                
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-white/20 uppercase tracking-widest block">Select Tactical Task List</label>
                  <select 
                    value={selectedTaskList}
                    onChange={(e) => handleSelectTaskList(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white font-mono text-[11px] focus:border-info/50 outline-none uppercase tracking-widest"
                  >
                    <option value="">[ SELECT TASK LIST ]</option>
                    {taskLists.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                  {selectedTaskList && (
                    <div className="p-4 rounded-2xl bg-info/5 border border-info/20 flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-info" />
                      <span className="text-[9px] font-bold text-info/60 uppercase tracking-widest">High-priority tasks will sync here</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="reporting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Calendar Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-caution uppercase font-mono font-black italic tracking-tighter">
                  <Calendar className="w-4 h-4" />
                  <span>Chronological Forensics</span>
                </div>
                
                <div className="space-y-3">
                   <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                     <div>
                       <p className="text-[10px] font-black text-white italic tracking-tighter uppercase">Incident Auto-Logging</p>
                       <p className="text-[8px] text-white/40 uppercase tracking-widest mt-1">Mirror reports to Calendar</p>
                     </div>
                     <button 
                       onClick={toggleCalendar}
                       className={cn(
                         "w-12 h-6 rounded-full p-1 transition-all",
                         isCalendarEnabled ? "bg-success/20 border border-success/40" : "bg-white/5 border border-white/10"
                       )}
                     >
                       <div className={cn(
                         "w-4 h-4 rounded-full transition-all",
                         isCalendarEnabled ? "bg-success translate-x-6" : "bg-white/20 translate-x-0"
                       )} />
                     </button>
                   </div>

                   <div className="space-y-2">
                      <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Recent Activity</p>
                      {events.length > 0 ? events.map(e => (
                        <div key={e.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                          <span className="text-[9px] text-white/60 truncate max-w-[150px] font-mono uppercase">{e.summary}</span>
                          <span className="text-[8px] text-white/20 font-mono italic">{new Date(e.start.dateTime || e.start.date).toLocaleDateString()}</span>
                        </div>
                      )) : (
                        <p className="text-[9px] text-white/20 font-mono italic">No recent incidents logged...</p>
                      )}
                   </div>
                </div>
              </div>

              {/* Advanced Reporting Assets */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-tactical-blue uppercase font-mono font-black italic tracking-tighter">
                  <FileText className="w-4 h-4" />
                  <span>Tactical Asset Engine</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => createTacticalDoc('doc')}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex flex-col items-center gap-3 group"
                  >
                    <FileText className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Incident Report</span>
                  </button>
                  <button 
                    onClick={() => createTacticalDoc('slides')}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex flex-col items-center gap-3 group"
                  >
                    <Presentation className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Briefing Deck</span>
                  </button>
                  <button 
                    onClick={() => createTacticalDoc('form')}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex flex-col items-center gap-3 group"
                  >
                    <FormInput className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Survey Form</span>
                  </button>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-1 opacity-50">
                    <PlusCircle className="w-6 h-6 text-white/20" />
                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/20">More Assets</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TacticalCard>
  );
}
