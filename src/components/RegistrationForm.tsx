import React, { useState } from 'react';
import { setDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db, storage } from '../lib/firebase';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { TanodLogo, BackgroundPattern } from './Branding';
import PersonalDossierStep from './registration/PersonalDossierStep';
import IdAndCommunicationsStep from './registration/IdAndCommunicationsStep';
import GeospatialCoordinatesStep from './registration/GeospatialCoordinatesStep';
import HouseholdInterfaceStep from './registration/HouseholdInterfaceStep';
import RegistrationCompleteStep from './registration/RegistrationCompleteStep';
import { RegistrationFormData } from './registration/types';

export default function RegistrationForm({ onCancel, onComplete }: { onCancel: () => void, onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const currentUser = auth?.currentUser;
  
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);

  const [formData, setFormData] = useState<RegistrationFormData>({
    fullName: currentUser?.displayName || '',
    age: '',
    gender: 'Male',
    dob: '',
    civilStatus: 'Single',
    idType: 'PhilSys',
    idNumber: '',
    mobileNumber: '',
    altContactName: '',
    altContactNumber: '',
    email: currentUser?.email || '',
    houseNumber: '',
    street: '',
    householdCount: '1',
    specialNeeds: 'No',
    specialNeedsInfo: '',
    gpsLat: 13.0641,
    gpsLng: 120.7303,
    address: '',
    username: currentUser?.email?.split('@')[0] || '',
    password: '',
    confirmPassword: ''
  });

  if (!auth || !db) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 text-center">
        <div className="glass-panel p-12 rounded-[40px] border-emergency/30 max-w-sm">
           <Shield className="w-16 h-16 text-emergency mx-auto mb-6" />
           <h3 className="text-xl font-black italic text-white uppercase tracking-tighter mb-4">SYSTEM OFFLINE</h3>
           <p className="text-white/60 text-sm font-medium mb-8">The secure cloud link is not configured. Registration restricted to local mode.</p>
           <button onClick={onCancel} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold uppercase tracking-widest text-xs">ABORT MISSION</button>
        </div>
      </div>
    );
  }

  const fillDemoData = () => {
    setFormData({
      ...formData,
      fullName: 'Juan Dela Cruz',
      age: '28',
      gender: 'Male',
      dob: '1996-05-20',
      civilStatus: 'Single',
      idType: 'PhilSys',
      idNumber: '1234-5678-9012',
      mobileNumber: '09123456789',
      altContactName: 'Maria Dela Cruz',
      altContactNumber: '09987654321',
      houseNumber: 'Blk 12 Lot 5',
      street: 'Sampaguita St.',
      householdCount: '4',
      specialNeeds: 'No',
      specialNeedsInfo: '',
      gpsLat: 13.0641, // Occidental Mindoro center
      gpsLng: 120.7303,
      username: 'juandemo123',
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    toast.success('Form populated with demo data!', { icon: '⚡' });
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await resp.json();
      if (data.display_name) {
        setFormData(prev => ({
          ...prev,
          address: data.display_name,
          street: data.address.road || data.address.suburb || prev.street
        }));
      }
    } catch (e) {
      console.error("Geocoding failed", e);
    }
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      setDetecting(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setFormData(prev => ({
            ...prev,
            gpsLat: lat,
            gpsLng: lng
          }));
          reverseGeocode(lat, lng);
          setDetecting(false);
          // Feedback that high-precision lock was acquired
          if (pos.coords.accuracy > 100) {
            console.warn("GPS lock is weak: " + pos.coords.accuracy + "m");
          }
        },
        (err) => {
          setDetecting(false);
          let msg = 'Could not get your location.';
          if (err.code === 1) msg = 'Location permission denied. Please enable it in settings.';
          if (err.code === 2) msg = 'Location unavailable or weak GPS signal.';
          if (err.code === 3) msg = 'Location request timed out.';
          toast.error(msg);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 0 
        }
      );
    } else {
      toast.error('Your browser does not support geolocation.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!auth || !db) {
        // Mock success for offline mode
        console.log("Offline registration triggered, bypass active.");
        const mockUid = `offline_${Date.now()}`;
        toast.success("OFFLINE MODE: Registration request queued locally.", { icon: '📡' });
        onComplete();
        return;
      }

      let activeUser = auth.currentUser;
      
      // If not logged in, create account via email/password
      if (!activeUser) {
        if (!formData.email || !formData.password) {
          toast.error('Email and password are required for new account registration.');
          setLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match.');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        activeUser = userCredential.user;
        await updateProfile(activeUser, { displayName: formData.fullName });
      }

      const uid = activeUser.uid;
      let uploadedIdUrl = 'https://placehold.co/600x400?text=NO+ID+UPLOADED';
      let uploadedSelfieUrl = 'https://placehold.co/400x400?text=NO+SELFIE+UPLOADED';

      if (idPhoto && storage) {
        const idRef = ref(storage, `residents/${uid}/id_photo_${Date.now()}`);
        await uploadBytes(idRef, idPhoto);
        uploadedIdUrl = await getDownloadURL(idRef);
      }

      if (selfiePhoto && storage) {
        const selfieRef = ref(storage, `residents/${uid}/selfie_${Date.now()}`);
        await uploadBytes(selfieRef, selfiePhoto);
        uploadedSelfieUrl = await getDownloadURL(selfieRef);
      }

      const residentData = {
        ...formData,
        age: parseInt(formData.age) || 0,
        householdCount: parseInt(formData.householdCount) || 1,
        uid: uid,
        idPhotoUrl: uploadedIdUrl,
        selfieUrl: uploadedSelfieUrl,
        status: 'pending',
        registeredAt: new Date().toISOString()
      };

      // Remove sensitive auth fields before saving to Firestore
      const { password, confirmPassword, ...firestoreData } = residentData as any;

      await setDoc(doc(db, 'residents', uid), firestoreData);
      
      // Sync to Supabase for Tactical Command link
      if (isSupabaseConfigured) {
        try {
          const { error: supaErr } = await supabase.from('residents').upsert([{
            id: uid,
            name: formData.fullName,
            age: parseInt(formData.age) || 0,
            gender: formData.gender,
            mobile: formData.mobileNumber,
            address: formData.address,
            house_number: formData.houseNumber,
            street: formData.street,
            location_lat: formData.gpsLat,
            location_lng: formData.gpsLng,
            status: 'pending',
            created_at: new Date().toISOString()
          }]);
          if (supaErr) throw supaErr;
        } catch (err) {
          console.error('Supabase resident sync failed:', err);
        }
      }
      
      // Also create a basic user entry so they are recognized by auth flow
      const userUpdate: any = {
        uid: uid,
        name: formData.fullName,
        email: activeUser.email || formData.email,
        role: 'resident',
        status: 'pending',
        createdAt: new Date().toISOString(),
        lat: formData.gpsLat,
        lng: formData.gpsLng
      };

      try {
        const ngeohash = await import('ngeohash');
        userUpdate.geohash = ngeohash.encode(formData.gpsLat, formData.gpsLng, 6);
      } catch (e) {
        console.warn("Geohash calculation failed during registration", e);
      }

      await setDoc(doc(db, 'users', uid), userUpdate);
      
      setSuccessId(uid);
      setStep(5); // Success step
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast.error('Registration failed: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (step === 5) {
    return <RegistrationCompleteStep successId={successId} onComplete={onComplete} />;
  }

  return (
    <div className="min-h-screen bg-brand-bg text-white p-6 md:p-12 font-sans overflow-x-hidden relative pb-20">
      <BackgroundPattern />
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center gap-6 mb-16">
          <div className="relative">
            <div className="absolute inset-0 bg-emergency/20 blur-xl rounded-full" />
            <TanodLogo size={56} className="relative z-10 drop-shadow-[0_0_10px_rgba(255,75,75,0.5)]" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase font-mono italic leading-none">Brgy. <span className="text-emergency">Tanod</span> S.O.S</h1>
            <p className="text-white/30 font-black uppercase text-[9px] tracking-[0.4em] mt-2 font-mono">Resident Enrollment Protocol • 4.2.0</p>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="flex justify-between mb-16 relative">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 -translate-y-1/2 z-0"></div>
          {[1, 2, 3, 4].map(i => (
            <div 
              key={i}
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center z-10 font-black transition-all duration-500 font-mono italic text-lg",
                step >= i 
                  ? "bg-emergency text-white shadow-glow-red border border-emergency/50 rotate-0" 
                  : "bg-brand-card text-white/20 border border-white/5 rotate-0"
              )}
            >
              {i}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="glass-panel border-white/5 rounded-[48px] p-8 md:p-14 shadow-command animate-in slide-in-from-bottom-8 duration-700">
          {step === 1 && <PersonalDossierStep formData={formData} setFormData={setFormData} setStep={setStep} fillDemoData={fillDemoData} />}
          {step === 2 && <IdAndCommunicationsStep formData={formData} setFormData={setFormData} setStep={setStep} idPhoto={idPhoto} setIdPhoto={setIdPhoto} selfiePhoto={selfiePhoto} setSelfiePhoto={setSelfiePhoto} />}
          {step === 3 && <GeospatialCoordinatesStep formData={formData} setFormData={setFormData} setStep={setStep} detectLocation={detectLocation} detecting={detecting} reverseGeocode={reverseGeocode} />}
          {step === 4 && <HouseholdInterfaceStep formData={formData} setFormData={setFormData} setStep={setStep} loading={loading} />}
        </form>
      </div>
    </div>
  );
}
