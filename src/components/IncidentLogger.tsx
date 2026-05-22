import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const IncidentLogger: React.FC = () => {
  const { profile: user } = useAuthStore();
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const saveIncident = async () => {
    if (!type || !description.trim()) {
      alert("Please fill in both type and description.");
      return;
    }

    setIsLogging(true);
    try {
      await addDoc(collection(db, 'incidents'), {
        type,
        description: description.trim(),
        timestamp: serverTimestamp(),
        reportedBy: user?.id,
        status: 'reported',
      });

      alert("✅ Incident successfully logged.");
      setDescription('');
      setType('');
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save incident.");
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="mt-6 p-6 bg-zinc-900 rounded-3xl border border-zinc-700">
      <h3 className="text-xl font-bold mb-4">📋 Incident Logger</h3>
      
      <select 
        value={type} 
        onChange={(e) => setType(e.target.value)}
        className="w-full p-4 rounded-2xl bg-zinc-800 mb-4 text-white"
      >
        <option value="">Select Type</option>
        <option value="medical">🩹 Medical Emergency</option>
        <option value="crime">🚨 Crime / Security</option>
        <option value="fire">🔥 Fire</option>
        <option value="flood">🌊 Flood / Typhoon</option>
        <option value="other">📌 Other</option>
      </select>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe what happened..."
        className="w-full h-32 p-4 rounded-2xl bg-zinc-800 text-white resize-y"
      />

      <button
        onClick={saveIncident}
        disabled={isLogging || !type || !description.trim()}
        className="w-full mt-4 py-4 bg-red-600 hover:bg-red-700 rounded-2xl font-bold disabled:opacity-50"
      >
        {isLogging ? 'Saving Report...' : 'Submit Incident Report'}
      </button>
    </div>
  );
};

export default IncidentLogger;
