import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PhoneCall, Settings, Save, HelpCircle, Check, AlertTriangle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generic } from '../../lib/api';

interface SMSFallbackSettingsProps {
  onClose?: () => void;
  onSettingsSaved?: (settings: { enabled: boolean; fallbackDelayMinutes: number; maxRecipients: number }) => void;
}

export default function SMSFallbackSettings({ onClose, onSettingsSaved }: SMSFallbackSettingsProps) {
  const [enabled, setEnabled] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(5);
  const [maxRecipients, setMaxRecipients] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    generic.get('system/twilio')
      .then(res => {
        if (res) {
          setEnabled(res.enabled ?? false);
          setDelayMinutes(res.fallbackDelayMinutes ?? 5);
          setMaxRecipients(res.maxRecipients ?? 10);
        }
      })
      .catch(err => {
        console.error("Failed to load Twilio settings in Fallback panel", err);
      });
  }, []);

  const saveSettings = async () => {
    setLoading(true);
    try {
      const updatedSettings = {
        enabled,
        fallbackDelayMinutes: delayMinutes,
        maxRecipients
      };
      await generic.update('system/twilio', updatedSettings);
      toast.success('SMS Fallback settings updated successfully');
      if (onSettingsSaved) {
        onSettingsSaved(updatedSettings);
      }
    } catch (err) {
      toast.error('Failed to save SMS settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#14171E] border border-white/5 p-6 rounded-3xl w-full shadow-2xl relative overflow-hidden">
      {/* Visual Accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3.5 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
            <PhoneCall className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black font-mono tracking-tight text-white uppercase flex items-center gap-2">
              SMS FALLBACK SYSTEM
            </h3>
            <p className="text-xs text-white/40 font-mono uppercase tracking-widest mt-0.5">
              TWILIO SMS AUTOMATION FAILOVER & TRIGGERS
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

      <div className="space-y-6">
        {/* Toggle Panel */}
        <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-colors">
          <div>
            <label className="text-sm font-bold text-white uppercase font-mono tracking-wide">Enable SMS Fallback</label>
            <p className="text-[11px] text-white/40 font-mono uppercase tracking-wider mt-1">
              Trigger fallback SMS alerts to Tanod patrols
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={enabled} 
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={loading}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
          </label>
        </div>

        {enabled && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-5"
          >
            {/* Delay input */}
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-white/60 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  Fallback Delay (minutes)
                </label>
                <HelpCircle className="w-3.5 h-3.5 text-white/30 hover:text-white/60 cursor-help" />
              </div>
              <input
                type="number"
                min={1}
                max={15}
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(Math.max(1, Math.min(15, parseInt(e.target.value) || 5)))}
                className="w-full bg-[#090B0E] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none font-mono"
                disabled={loading}
              />
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-mono mt-2">
                Alert remains unassigned before Tanod alert triggers. Recommended: 3-5 minutes.
              </p>
            </div>

            {/* Max recipients */}
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-white/60 uppercase tracking-widest font-mono">
                  Max Recipients Per Alert
                </label>
              </div>
              <input
                type="number"
                min={1}
                max={30}
                value={maxRecipients}
                onChange={(e) => setMaxRecipients(Math.max(1, Math.min(30, parseInt(e.target.value) || 10)))}
                className="w-full bg-[#090B0E] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none font-mono"
                disabled={loading}
              />
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-mono mt-2">
                Limits outbound SMS text frequency. Reduces Twilio account API usage.
              </p>
            </div>
          </motion.div>
        )}

        {/* Action Button */}
        <button 
          onClick={saveSettings} 
          disabled={loading}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/5 disabled:text-white/20 text-white rounded-2xl text-xs font-black font-mono uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]"
        >
          {loading ? (
            'PROCESSING TRANSACTION...'
          ) : (
            <>
              <Save className="w-4 h-4" />
              SAVE FALLBACK SETTINGS
            </>
          )}
        </button>

        {/* Notice Info */}
        <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-[10px] text-white/40 uppercase tracking-wider font-mono leading-relaxed">
            Ensure your <strong>Alphanumeric Sender ID</strong> or Twilio phone number is correctly configured inside your <code>.env</code> file.
          </div>
        </div>
      </div>
    </div>
  );
}
