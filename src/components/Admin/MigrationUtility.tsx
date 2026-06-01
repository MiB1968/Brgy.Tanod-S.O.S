import React, { useState } from 'react';
import { 
  collection, 
  writeBatch, 
  doc, 
  getDocs, 
  query, 
  CollectionReference,
  DocumentData,
  Timestamp,
  GeoPoint,
  DocumentReference
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BARANGAY_PROTOCOLS } from '../../data/barangayProtocols';
import { Database, Download, Upload, ShieldCheck, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * GuardianForge Migration Utility
 * 
 * This component allows for client-side data migration and seeding.
 * It bypasses the need for service account keys by using the user's browser session.
 */
const MigrationUtility: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [progress, setProgress] = useState(0);

  const log = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatus({ type, message });
    console.log(`[Migration] ${message}`);
  };

  /**
   * Seeds the core barangay data from BARANGAY_PROTOCOLS constant
   */
  const seedBarangays = async () => {
    setLoading(true);
    setProgress(0);
    log('Starting initial seeding of Barangay data...', 'info');

    try {
      const batch = writeBatch(db);
      const barangaysCol = collection(db, 'barangays');
      const protocolsCol = collection(db, 'emergency_protocols');

      // Seed Protocols (Corrected mapping)
      let protocolCount = 0;
      for (const protocol of BARANGAY_PROTOCOLS) {
        const protocolRef = doc(protocolsCol);
        batch.set(protocolRef, {
          ...protocol,
          updatedAt: Timestamp.now()
        });
        protocolCount++;
      }

      // Seed Dummy Barangays for initial setup
      const sampleBarangays = [
        { id: 'brgy-san-lorenzo', name: 'San Lorenzo', lat: 14.5526, lng: 121.0163 },
        { id: 'brgy-bel-air', name: 'Bel-Air', lat: 14.5612, lng: 121.0312 },
        { id: 'brgy-poblacion', name: 'Poblacion', lat: 14.5663, lng: 121.0331 }
      ];

      for (const brgy of sampleBarangays) {
        const brgyRef = doc(barangaysCol, brgy.id);
        batch.set(brgyRef, {
          name: brgy.name,
          location: new GeoPoint(brgy.lat, brgy.lng),
          status: 'active',
          updatedAt: Timestamp.now()
        });
      }

      await batch.commit();
      log(`Successfully seeded ${protocolCount} protocols and ${sampleBarangays.length} barangays into the new project!`, 'success');
    } catch (error: any) {
      log(`Seeding failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles JSON file upload and restores data to Firestore
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    log('Processing backup file...', 'info');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target?.result as string);
        log('Backup loaded. Restoring data...', 'info');
        
        await restoreBackup(backupData);
      } catch (error: any) {
        log(`Failed to parse/restore backup: ${error.message}`, 'error');
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const restoreBackup = async (data: any) => {
    try {
      let totalDocs = 0;
      for (const [colId, colData] of Object.entries(data)) {
        const colRef = collection(db, colId);
        const batch = writeBatch(db);
        let batchCount = 0;

        // Note: Simple restoration logic for top-level docs only for now
        // Can be extended for subcollections if needed
        for (const [docId, docContent] of Object.entries(colData as any)) {
          const content = (docContent as any)._data; // Extract _data if using serialized format
          if (!content) continue;

          // Convert markers back to Firestore types
          const deserialized = deserializeData(content);
          const docRef = doc(colRef, docId);
          batch.set(docRef, deserialized, { merge: true });
          
          batchCount++;
          totalDocs++;

          if (batchCount >= 400) {
            await batch.commit();
            batchCount = 0;
          }
        }
        
        if (batchCount > 0) await batch.commit();
      }
      
      log(`Successfully restored ${totalDocs} documents!`, 'success');
    } catch (error: any) {
      log(`Restoration failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deserializeData = (data: any): any => {
    if (data === null || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(deserializeData);
    
    if (data.__timestamp__) return Timestamp.fromMillis(data.__timestamp__);
    if (data.__geopoint__) return new GeoPoint(data.__geopoint__.lat, data.__geopoint__.lng);
    
    const out: any = {};
    for (const [k, v] of Object.entries(data)) {
      out[k] = deserializeData(v);
    }
    return out;
  };

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-amber-50 rounded-lg">
          <Database className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">Guardian Migration Tools</h2>
          <p className="text-sm text-gray-500">Bypass Cloud Policy restrictions for project migration</p>
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${
          status.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 
          status.type === 'error' ? 'bg-rose-50 text-rose-800' : 'bg-blue-50 text-blue-800'
        }`}>
          {status.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {status.type === 'error' && <AlertTriangle className="w-5 h-5 shrink-0" />}
          {status.type === 'info' && <ShieldCheck className="w-5 h-5 shrink-0" />}
          <p className="text-sm font-medium">{status.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seed Card */}
        <div className="p-4 border border-blue-100 bg-blue-50/30 rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Initial Seeding</h3>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">
            Prepopulates the new project with essential Barangay data and emergency protocols from the source code constants.
          </p>
          <button
            onClick={seedBarangays}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-all shadow-sm active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            Seed Barangay Data
          </button>
        </div>

        {/* Upload Card */}
        <div className="p-4 border border-amber-100 bg-amber-50/30 rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900">Manual JSON Restore</h3>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Upload a `firebase-backup-*.json` file to restore your previous data into this new project.
          </p>
          <label className="block">
            <div className="w-full cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-all shadow-sm active:scale-95 text-center">
              <Download className="w-4 h-4 rotate-180" />
              Upload Backup File
              <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} disabled={loading} />
            </div>
          </label>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Instructions</h4>
        <ul className="text-xs text-gray-600 space-y-2 list-disc pl-4">
          <li>Ensure you are logged in with an <strong>Admin account</strong> in the target project.</li>
          <li>This utility works directly in your browser, bypassing Restricted Cloud Policies.</li>
          <li>A backup file is required for "Manual Restore". If you don't have one, use "Initial Seeding" to start fresh.</li>
        </ul>
      </div>
    </div>
  );
};

export default MigrationUtility;
