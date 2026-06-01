import { useState, useRef } from 'react';
import { Mic, ShieldCheck, X } from 'lucide-react';

export default function VoiceBiometricModal({
  isOpen,
  onVerified,
  onCancel,
  actionType,
}: {
  isOpen: boolean;
  onVerified: (audioBlob: Blob) => void;
  onCancel: () => void;
  actionType?: string;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Press the mic and say: 'I confirm this action'");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunks.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setStatus("Submitting confirmation...");
        onVerified(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus("Recording... Speak now.");
    } catch (err) {
      console.error(err);
      setStatus("Microphone access denied or error occurred.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200]">
      <div className="bg-zinc-950 border border-amber-500 shadow-2xl rounded-3xl p-8 max-w-md w-full relative">
        <button
          onClick={onCancel}
          className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <ShieldCheck className="text-amber-400" size={32} />
          <div>
            <h3 className="text-xl font-bold font-mono text-amber-500 tracking-wide">
              CONFIRM ACTION
            </h3>
            <p className="text-sm text-gray-400">
              {actionType ? `Action: ${actionType.replace(/_/g, ' ')}` : 'Action Confirmation'}
            </p>
          </div>
        </div>

        {/* Notice — honest about what this does */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 mb-4">
          <p className="text-[11px] text-amber-300/70 font-mono text-center">
            Your JWT role authorizes this action. Voice recording is logged for audit purposes only.
          </p>
        </div>

        <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-6 text-center mb-6">
          <p className="text-sm mb-6 text-amber-200/80 font-mono tracking-wider h-6">{status}</p>

          <button
            onClick={isRecording
              ? () => { mediaRecorderRef.current?.stop(); setIsRecording(false); }
              : startRecording
            }
            className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] ${
              isRecording
                ? 'bg-red-600/20 border border-red-500 text-red-400 animate-pulse'
                : 'bg-amber-600/20 border border-amber-500 text-amber-400 hover:bg-amber-600/30 hover:scale-105'
            }`}
          >
            <Mic size={40} />
          </button>

          <p className="mt-6 text-[10px] text-gray-500 font-mono">
            {isRecording ? "TAP TO STOP & CONFIRM" : "TAP MIC TO START"}
          </p>
        </div>

        <button
          onClick={onCancel}
          className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-gray-300 font-medium rounded-xl transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
