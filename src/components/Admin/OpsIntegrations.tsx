import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Server, 
  Settings, 
  Workflow, 
  Bot, 
  Wifi, 
  Terminal, 
  CheckCircle2, 
  XCircle,
  CloudRain,
  Map as MapIcon,
  Search,
  Zap,
  PhoneCall,
  Radio
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { generic } from '../../lib/api';
import SMSFallbackSettings from './SMSFallbackSettings';
import GSMModemIntegration from './GSMModemIntegration';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'connected' | 'disconnected' | 'configuring';
  lastSync?: string;
  color: string;
}

const INITIAL_INTEGRATIONS: Integration[] = [
  {
    id: 'gsm',
    name: 'GSM Hardware Modem Gateway',
    description: 'Decompress compressed cellular alerts (<140 chars) received over-the-air from remote offline Tanods.',
    icon: Radio,
    status: 'connected',
    lastSync: 'Sync active',
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20'
  },
  {
    id: 'kibitzr',
    name: 'Kibitzr Web Assistant',
    description: 'Lightweight automated web monitoring for local news and barangay announcements.',
    icon: Bot,
    status: 'connected',
    lastSync: '2 mins ago',
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
  },
  {
    id: 'stackstorm',
    name: 'StackStorm (IFTTT Ops)',
    description: 'Event-driven auto-remediation and dispatch workflows for critical SOS triggers.',
    icon: Zap,
    status: 'connected',
    lastSync: 'Just now',
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20'
  },
  {
    id: 'twilio',
    name: 'Twilio SMS Fallback',
    description: 'Auto-dispatch SMS alert failovers to nearby Tanods during unassigned or offline-recovered emergencies.',
    icon: PhoneCall,
    status: 'disconnected',
    color: 'text-rose-400 bg-rose-400/10 border-rose-400/20'
  },
  {
    id: 'fmd',
    name: 'FMD Server',
    description: 'Find My Device server to track all issued Tanod radios and smartphones.',
    icon: Search,
    status: 'disconnected',
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
  },
  {
    id: 'nodered',
    name: 'Node-RED IoT',
    description: 'Wiring flood sensors and fire alarms via MQTT into the Barangay Command Center.',
    icon: Workflow,
    status: 'connected',
    lastSync: '10 mins ago',
    color: 'text-red-400 bg-red-400/10 border-red-400/20'
  },
  {
    id: 'ors',
    name: 'OpenRouteService',
    description: 'Isochrone map generation and real-time navigation directions for Tanod Responders.',
    icon: MapIcon,
    status: 'connected',
    lastSync: '5 mins ago',
    color: 'text-purple-400 bg-purple-400/10 border-purple-400/20'
  },
  {
    id: 'openmeteo',
    name: 'Open-Meteo',
    description: 'Weather forecasting and climate data integration for flooding and typhoon alerts.',
    icon: CloudRain,
    status: 'connected',
    lastSync: '1 hour ago',
    color: 'text-sky-400 bg-sky-400/10 border-sky-400/20'
  },
  {
    id: 'opik',
    name: 'Opik Observability',
    description: 'Evaluate Guardian AI LLM responses to assure high accuracy during emergencies.',
    icon: Terminal,
    status: 'disconnected',
    color: 'text-pink-400 bg-pink-400/10 border-pink-400/20'
  }
];

export default function OpsIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);
  const [activeConfig, setActiveConfig] = useState<string | null>(null);
  const [twilioSettings, setTwilioSettings] = useState({
    enabled: false,
    fallbackDelayMinutes: 5,
    maxRecipients: 10
  });

  useEffect(() => {
    generic.get('system/twilio')
      .then(res => {
        if (res) {
          setTwilioSettings({
            enabled: res.enabled ?? false,
            fallbackDelayMinutes: res.fallbackDelayMinutes ?? 5,
            maxRecipients: res.maxRecipients ?? 10
          });
          setIntegrations(prev => prev.map(int => {
            if (int.id === 'twilio') {
              return {
                ...int,
                status: res.enabled ? 'connected' : 'disconnected',
                lastSync: 'Sync active'
              };
            }
            return int;
          }));
        }
      })
      .catch(err => {
        console.error("Failed to load Twilio settings", err);
      });
  }, []);

  const toggleStatus = async (id: string) => {
    if (id === 'twilio') {
      const updatedEnabled = !twilioSettings.enabled;
      try {
        const nextSettings = { ...twilioSettings, enabled: updatedEnabled };
        await generic.update('system/twilio', nextSettings);
        setTwilioSettings(nextSettings);
        setIntegrations(prev => prev.map(int => {
          if (int.id === 'twilio') {
            return {
              ...int,
              status: updatedEnabled ? 'connected' : 'disconnected',
              lastSync: updatedEnabled ? 'Just now' : undefined
            };
          }
          return int;
        }));
        if (updatedEnabled) {
          toast.success("Twilio SMS Fallback Enabled");
        } else {
          toast.error("Twilio SMS Fallback Disabled");
        }
      } catch (err) {
        toast.error("Failed to toggle SMS Fallback");
      }
      return;
    }

    setIntegrations(prev => prev.map(int => {
      if (int.id === id) {
        const nextStatus = int.status === 'connected' ? 'disconnected' : 'connected';
        if (nextStatus === 'connected') {
          toast.success(`${int.name} linked successfully!`);
        } else {
          toast.error(`${int.name} offline.`);
        }
        return { ...int, status: nextStatus, lastSync: nextStatus === 'connected' ? 'Just now' : undefined };
      }
      return int;
    }));
  };

  return (
    <div className="glass-panel p-4 md:p-8 rounded-[40px] border-white/5 h-full overflow-y-auto flex flex-col gap-6 relative">
      <div className="absolute inset-0 bg-brand-disabled/5 pointer-events-none rounded-[40px]" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 w-full">
        <div>
          <h2 className="text-2xl font-black font-mono text-white tracking-tight uppercase flex items-center gap-3">
            <Server className="w-6 h-6 text-emergency" />
            Operations & Integrations
          </h2>
          <p className="text-sm font-mono text-white/40 mt-1 uppercase tracking-widest max-w-2xl leading-relaxed">
            Manage third-party microservices, IoT nodes, routing engines, and automation frameworks directly hooked into the Tactical Grid.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 z-10 w-full mt-4">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const isConnected = integration.status === 'connected';

          return (
            <motion.div
              key={integration.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1A1D24] border border-[#2A2E39] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start gap-4 transition-all hover:bg-[#1E222A]"
            >
              <div className={cn("p-4 rounded-xl border shrink-0", integration.color)}>
                <Icon className="w-8 h-8" />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-white text-lg tracking-wide">{integration.name}</h3>
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      isConnected ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                    )}>
                      {isConnected ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {isConnected ? 'ONLINE' : 'OFFLINE'}
                    </div>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed min-h-[40px]">
                    {integration.description}
                  </p>
                </div>
                
                <div className="flex items-center justify-between mt-4 border-t border-white/5 pt-4">
                  <span className="text-[10px] uppercase font-mono text-white/30 tracking-widest flex items-center gap-2">
                    <Wifi className="w-3 h-3" />
                    {isConnected ? `SYNC: ${integration.lastSync}` : 'NO SIGNAL'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setActiveConfig(integration.id)}
                      className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => toggleStatus(integration.id)}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border",
                        isConnected 
                          ? "bg-brand-card hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 text-white/60 border-white/10" 
                          : "bg-emergency text-white border-emergency/50 hover:bg-emergency/80 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                      )}
                    >
                      {isConnected ? 'Disconnect' : 'Hook Up'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {activeConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className={cn(
            "bg-[#16191F] border border-[#2D3139] p-6 rounded-3xl shadow-2xl w-full max-h-[92vh] overflow-y-auto",
            activeConfig === 'gsm' ? 'max-w-5xl' : 'max-w-md'
          )}>
            {activeConfig === 'twilio' ? (
              <SMSFallbackSettings 
                onClose={() => setActiveConfig(null)}
                onSettingsSaved={(settings) => {
                  setTwilioSettings(settings);
                  setIntegrations(prev => prev.map(int => {
                    if (int.id === 'twilio') {
                      return {
                        ...int,
                        status: settings.enabled ? 'connected' : 'disconnected',
                        lastSync: 'Config updated'
                      };
                    }
                    return int;
                  }));
                  setActiveConfig(null);
                }}
              />
            ) : activeConfig === 'gsm' ? (
              <GSMModemIntegration onClose={() => setActiveConfig(null)} />
            ) : (
              <>
                <h3 className="text-xl font-bold font-mono uppercase text-white mb-2">Configure Service</h3>
                <p className="text-xs text-white/50 mb-6">Enter connection endpoints or access tokens.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5 block">Endpoint URL</label>
                    <input type="text" placeholder="https://api.example.com/v1" className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-emergency outline-none font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5 block">API / Auth Token (Optional)</label>
                    <input type="password" placeholder="••••••••••••••••" className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-emergency outline-none font-mono" />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button onClick={() => setActiveConfig(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => { setActiveConfig(null); toast.success('Configuration saved'); }} className="flex-1 py-3 bg-emergency hover:bg-emergency/90 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] rounded-xl text-sm font-bold transition-all">
                    Save Settings
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
