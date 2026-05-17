import React, { useState } from 'react';
import * as api from '../lib/api';
import { User, IncidentStatus } from '../types';
import { X } from 'lucide-react';
import AnimatedButton from './AnimatedButton';
import { promptWebLLM, setWebLLMProgressCallback } from '../lib/webllm';

interface IncidentFormProps {
  profile: User;
  onClose: () => void;
}

export default function IncidentForm({ profile, onClose }: IncidentFormProps) {
  const [formData, setFormData] = useState({
    type: '',
    location: '',
    description: '',
    personsInvolved: '',
    actionsTaken: '',
    status: 'pending' as IncidentStatus
  });
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceProgress, setEnhanceProgress] = useState(0);
  const [enhanceText, setEnhanceText] = useState('');

  const handleAIEnhance = async () => {
    if (!formData.description) return;
    setIsEnhancing(true);
    setEnhanceProgress(0);
    setWebLLMProgressCallback((pct, text) => {
        setEnhanceProgress(pct);
        setEnhanceText(text);
    });

    try {
        const sysPrompt = "You are a professional Philippine Barangay Secretary. Rewrite the following brief incident notes into a formal, clear, and complete incident report narrative in proper Tagalog. IT MUST SOUND LIKE AN OFFICIAL BLOTTER. ONLY output the written narrative, nothing else. Do not add made up details, but ensure sentences are complete.";
        const enhanced = await promptWebLLM(sysPrompt, `Notes:\nType: ${formData.type}\nLocation: ${formData.location}\nPersons: ${formData.personsInvolved}\nNotes: ${formData.description}\nActions: ${formData.actionsTaken}`);
        setFormData(prev => ({ ...prev, description: enhanced }));
    } catch (e) {
        console.error("AI Enhance failed:", e);
    } finally {
        setIsEnhancing(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile) return;
    
    setSubmitting(true);
    try {
      const incidentId = crypto.randomUUID();
      const incidentData = {
        id: incidentId,
        tanodId: profile.id,
        tanodName: profile.name,
        timestamp: new Date().toISOString(),
        location: formData.location,
        type: formData.type,
        description: formData.description,
        personsInvolved: formData.personsInvolved,
        actionsTaken: formData.actionsTaken,
        status: formData.status
      };

      await api.incidents.create(incidentData);

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#16191F] border border-[#2D3139] w-full max-w-xl rounded-[40px] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-[#2D3139] flex justify-between items-center bg-[#1A1D23]">
          <h3 className="font-black italic text-2xl tracking-tighter">FILE OFFICIAL REPORT</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#252932] rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#8E9299] tracking-widest ml-1">Incident Type</label>
              <select 
                required
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full bg-[#252932] border border-[#2D3139] rounded-2xl p-4 text-white focus:border-[#FF4B4B] outline-none"
              >
                <option value="">Select Category</option>
                <option value="Theft">Theft/Robbery</option>
                <option value="Physical Injury">Physical Injury</option>
                <option value="Noise Complaint">Noise Complaint</option>
                <option value="Fire">Fire Incident</option>
                <option value="Medical">Medical Support</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#8E9299] tracking-widest ml-1">Location / Zone</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Purok 4, Zone B"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full bg-[#252932] border border-[#2D3139] rounded-2xl p-4 text-white focus:border-[#FF4B4B] outline-none" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-[#8E9299] tracking-widest ml-1">Persons Involved</label>
            <input 
              type="text" 
              placeholder="e.g. John Doe, Peter Parker"
              value={formData.personsInvolved}
              onChange={(e) => setFormData({...formData, personsInvolved: e.target.value})}
              className="w-full bg-[#252932] border border-[#2D3139] rounded-2xl p-4 text-white focus:border-[#FF4B4B] outline-none" 
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[10px] font-black uppercase text-[#8E9299] tracking-widest">Incident Description</label>
              <button 
                type="button" 
                onClick={handleAIEnhance}
                disabled={!formData.description || isEnhancing}
                className="text-[10px] flex items-center gap-1 font-black uppercase tracking-widest text-[#f59e0b] hover:text-[#fbbf24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[#f59e0b]/10 px-2 py-1 rounded"
              >
                {isEnhancing ? (
                  <>
                    <span className="animate-spin text-[10px]">⏳</span>
                    {enhanceProgress < 100 ? `${enhanceProgress}%` : 'Enhancing...'}
                  </>
                ) : (
                  <>✨ AI Enhance</>
                )}
              </button>
            </div>
            <textarea 
              required
              rows={5}
              maxLength={2000}
              placeholder="Provide a detailed narrative of the event... or type brief notes and click AI Enhance."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-[#252932] border border-[#2D3139] rounded-2xl p-4 text-white focus:border-[#FF4B4B] outline-none resize-none" 
            />
            <div className="flex justify-between items-center text-[10px] text-[#8E9299]">
              {isEnhancing && enhanceProgress < 100 && <span className="font-mono text-cyan-400">{enhanceText}</span>}
              <span className="ml-auto">{formData.description.length} / 2000 characters</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#8E9299] tracking-widest ml-1">Actions Taken</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Pacified both parties"
                value={formData.actionsTaken}
                onChange={(e) => setFormData({...formData, actionsTaken: e.target.value})}
                className="w-full bg-[#252932] border border-[#2D3139] rounded-2xl p-4 text-white focus:border-[#FF4B4B] outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#8E9299] tracking-widest ml-1">Current Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as IncidentStatus})}
                className="w-full bg-[#252932] border border-[#2D3139] rounded-2xl p-4 text-white focus:border-[#FF4B4B] outline-none capitalize"
              >
                <option value="pending">Pending Investigation</option>
                <option value="ongoing">In Progress / Ongoing</option>
                <option value="resolved">Resolved / Closed</option>
                <option value="referred">Referred to PNP/BFP</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
             <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 font-bold rounded-2xl border border-[#2D3139] hover:bg-[#252932] transition-colors uppercase text-[10px] tracking-widest font-mono"
             >
                Cancel
             </button>
             <AnimatedButton 
              type="submit"
              isLoading={submitting}
              isSuccess={isSuccess}
              onClick={() => {}} // form submit handles it
              label="FILE REPORT"
              successLabel="REPORT FILED"
              className="flex-1"
             />
          </div>
        </form>
      </div>
    </div>
  );
}
