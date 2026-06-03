import { useState, useEffect } from "react";
import * as api from "../../lib/api";
import { User } from "../../types";
import {
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Search,
  UserCheck,
  Eye,
  MapPin,
  Calendar,
  Phone,
  Home,
  X,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MapContainer, Marker } from "react-leaflet";
import L from "leaflet";
import { OfflineTileLayer } from "../OfflineTileLayer";
import toast from "react-hot-toast";

// Fix for default marker icons
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface ResidentProfile extends User {
  phone?: string;
  address?: string;
  houseNumber?: string;
  householdSize?: number;
  isVerified?: boolean;
}

export const ResidentVerification = () => {
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "verified">(
    "pending"
  );
  const [search, setSearch] = useState("");
  const [selectedInspect, setSelectedInspect] = useState<any | null>(null);
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadResidents = async () => {
    try {
      setLoading(true);
      const data = await api.residents.getAll();
      setResidents(data);
    } catch (err) {
      toast.error("Failed to load residents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResidents();
  }, []);

  const handleVerify = async (
    id: string,
    status: "approved" | "rejected" | "pending",
    reason?: string
  ) => {
    try {
      if (status === "approved" && navigator.onLine) {
        // High-performance dedicated backend route
        await api.admin.approveResident(id, true, true);
      } else {
        const updatePayload: any = {
          status: status,
          isVerified: false,
          verificationDate: new Date().toISOString(),
        };
        if (status === "rejected") {
          updatePayload.rejectionReason =
            reason || "Audited and rejected by administrator";
        } else {
          updatePayload.rejectionReason = "";
        }

        if (navigator.onLine) {
          await api.residents.update(id, updatePayload);
          // Also update the main user status
          await api.generic.update(`users/${id}`, { status });
        } else {
          // Offline queue
          const { db } = await import("../../db/offlineDB");
          await db.queuedActions.add({
            type: "status_update",
            payload: { residentId: id, status: status },
            timestamp: Date.now(),
            retryCount: 0,
          });
          toast.success(`Action saved offline. Will sync when back online.`);
          return;
        }
      }

      toast.success(
        `Resident ${status.charAt(0).toUpperCase() + status.slice(1)}`
      );

      // Update selectedInspect state if modal is open
      if (selectedInspect && selectedInspect.id === id) {
        setSelectedInspect((prev: any) =>
          prev
            ? {
                ...prev,
                status,
                isVerified: status === "approved",
                rejectionReason: reason || "",
              }
            : null
        );
      }

      setShowRejectPrompt(false);
      setRejectionReason("");
      loadResidents();
    } catch (err) {
      toast.error("Verification update failed");
    }
  };

  // Helper extractor to solve dual camelCase / snake_case mapping gaps
  const getResidentDetails = (raw: any) => {
    if (!raw) return null;
    return {
      id: raw.id,
      name: raw.name || raw.fullName || raw.full_name || "UNKNOWN INDIVIDUAL",
      email: raw.email || "N/A",
      phone: raw.phone || raw.mobileNumber || raw.mobile_number || "N/A",
      address: raw.address || "N/A",
      houseNumber: raw.houseNumber || raw.house_number || "N/A",
      householdSize: raw.householdSize || raw.household_size || 1,
      bloodType: raw.bloodType || raw.blood_type || "N/A",
      medicalConditions: raw.medicalConditions || raw.medical_conditions || [],
      emergencyContactName:
        raw.emergencyContactName || raw.emergency_contact_name || "N/A",
      emergencyContactPhone:
        raw.emergencyContactPhone || raw.emergency_contact_phone || "N/A",
      gpsLat: Number(raw.gpsLat || raw.gps_lat || 13.0641),
      gpsLng: Number(raw.gpsLng || raw.gps_lng || 120.7303),
      selfieUrl: raw.selfieUrl || raw.selfie_url || "",
      idPhotoUrl: raw.idPhotoUrl || raw.id_photo_url || "",
      status: raw.status || "pending",
      isVerified: raw.isVerified || raw.is_verified || false,
      verificationDate: raw.verificationDate || raw.verification_date || "",
    };
  };

  const filteredResidents = residents
    .map((r) => getResidentDetails(r))
    .filter((r) => {
      if (!r) return false;
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "pending"
          ? r.status === "pending"
          : r.status === "approved" || r.isVerified;

      const matchesSearch =
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase()) ||
        r.address?.toLowerCase().includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black italic tracking-tighter uppercase font-mono flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-tactical-cyan" />
            Resident Verification Center
          </h3>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
            Review and approve community security access with biometric matching
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
          {(["pending", "verified", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === t
                  ? "bg-tactical-cyan text-black shadow-lg shadow-tactical-cyan/20"
                  : "text-white/40 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
        <input
          type="text"
          placeholder="SEARCH RESIDENTS BY NAME, EMAIL OR ADDRESS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-[10px] uppercase font-mono tracking-widest focus:outline-none focus:border-tactical-cyan/50 transition-all"
        />
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="py-20 text-center animate-pulse">
              <Shield className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                Establishing Secure Connection...
              </p>
            </div>
          ) : filteredResidents.length === 0 ? (
            <div className="py-20 text-center tactical-panel border-white/5 rounded-[32px]">
              <Clock className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                No matching residents found
              </p>
            </div>
          ) : (
            filteredResidents.map((resident) => {
              if (!resident) return null;
              return (
                <motion.div
                  key={resident.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="tactical-panel border-white/10 bg-white/[0.02] hover:bg-white/[0.04] rounded-[32px] p-6 transition-all group overflow-hidden relative"
                >
                  {/* Background Accent */}
                  <div
                    className={`absolute top-0 right-0 w-32 h-32 blur-[60px] -mr-16 -mt-16 transition-opacity opacity-20 ${
                      resident.status === "pending"
                        ? "bg-yellow-500"
                        : "bg-tactical-cyan"
                    }`}
                  />

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                      {/* Interactive Selfie Link */}
                      <div
                        onClick={() => setSelectedInspect(resident)}
                        className="w-16 h-16 rounded-[20px] bg-white/5 overflow-hidden border border-white/10 group-hover:border-tactical-cyan/40 transition-all cursor-pointer relative shrink-0 shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center"
                        title="Click to visually inspect biometrics"
                      >
                        {resident.selfieUrl ? (
                          <img
                            src={resident.selfieUrl}
                            className="w-full h-full object-cover"
                            alt="Selfie"
                          />
                        ) : (
                          <Shield
                            className={`w-6 h-6 ${
                              resident.status === "pending"
                                ? "text-yellow-500"
                                : "text-tactical-cyan"
                            }`}
                          />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4
                            className="font-black italic text-lg uppercase tracking-tight font-mono hover:text-tactical-cyan cursor-pointer"
                            onClick={() => setSelectedInspect(resident)}
                          >
                            {resident.name}
                          </h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {resident.email}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:inline" />
                          <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {resident.phone}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:flex lg:items-center gap-8">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-white/20 tracking-widest">
                          Address
                        </p>
                        <p className="text-[10px] font-bold uppercase truncate max-w-[200px]">
                          {resident.address}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-white/20 tracking-widest">
                          House #
                        </p>
                        <p className="text-[10px] font-bold uppercase">
                          {resident.houseNumber}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-white/20 tracking-widest">
                          Status
                        </p>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              resident.status === "pending"
                                ? "bg-yellow-500 animate-pulse"
                                : "bg-tactical-cyan"
                            }`}
                          />
                          <p
                            className={`text-[10px] font-black uppercase tracking-widest ${
                              resident.status === "pending"
                                ? "text-yellow-500"
                                : "text-tactical-cyan"
                            }`}
                          >
                            {resident.status}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                      <button
                        onClick={() => setSelectedInspect(resident)}
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 text-white/80 transition-all flex items-center justify-center gap-2"
                      >
                        <Eye className="w-3.5 h-3.5 text-tactical-cyan" />{" "}
                        Inspect
                      </button>

                      {resident.status === "pending" ? (
                        <>
                          <button
                            onClick={() =>
                              handleVerify(resident.id, "approved")
                            }
                            className="flex-1 md:flex-none px-6 py-3 bg-tactical-cyan text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-tactical-cyan/10"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Verify
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleVerify(resident.id, "pending")}
                          className="px-6 py-3 bg-white/5 text-white/40 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-white/30 transition-all"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Deep Visual Verification Inspection Modal */}
      <AnimatePresence>
        {selectedInspect &&
          (() => {
            const detailed = getResidentDetails(selectedInspect);
            if (!detailed) return null;
            return (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-[#12151C] border border-white/10 w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] font-sans text-white relative animate-in zoom-in-95 duration-200"
                >
                  {/* Header */}
                  <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-black/30">
                    <div>
                      <h3 className="font-mono font-black italic text-xl md:text-2xl tracking-tighter flex items-center gap-3 text-warning">
                        <Shield className="w-6 h-6 text-warning" />
                        BIOMETRIC SECURITY INSPECTION
                      </h3>
                      <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.2em] mt-1">
                        Target UID: {detailed.id.substring(0, 18).toUpperCase()}
                        ...
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedInspect(null);
                        setShowRejectPrompt(false);
                        setRejectionReason("");
                      }}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10"
                    >
                      <X className="w-5 h-5 text-white/60" />
                    </button>
                  </div>

                  {/* Main Content Areas */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                    {/* Visual Gaps Verification Panel */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left Panel: Portraits */}
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-warning font-mono">
                          Captured Visual Proof
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase">
                              1. FACE BIOMETRIC
                            </span>
                            <div className="w-full aspect-square rounded-3xl bg-[#0B0D12] overflow-hidden border border-white/10 shadow-xl relative min-h-[180px]">
                              {detailed.selfieUrl ? (
                                <img
                                  src={detailed.selfieUrl}
                                  className="w-full h-full object-cover"
                                  alt="Verification Selfie"
                                />
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                                  <Shield className="w-12 h-12 mb-2 animate-pulse" />
                                  <span className="text-[9px] font-mono">
                                    NO SELF PORTRAIT
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase">
                              2. GOVERNMENT ID
                            </span>
                            <div className="w-full aspect-square rounded-3xl bg-[#0B0D12] overflow-hidden border border-white/10 shadow-xl relative min-h-[180px] flex flex-col items-center justify-center">
                              {detailed.idPhotoUrl ? (
                                <img
                                  src={detailed.idPhotoUrl}
                                  className="w-full h-full object-contain"
                                  alt="Government ID"
                                />
                              ) : (
                                <div className="p-4 text-center text-white/30 space-y-2">
                                  <XCircle className="w-10 h-10 mx-auto text-white/10" />
                                  <p className="text-[9px] font-mono leading-none tracking-widest uppercase">
                                    NOT ATTACHED
                                  </p>
                                  <p className="text-[8px] leading-relaxed text-white/20 italic">
                                    Validated via community verification
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {detailed.status === "pending" ? (
                          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-start gap-3">
                            <Clock className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-[10px] font-black tracking-widest uppercase text-yellow-500 font-mono">
                                Awaiting Clearance
                              </p>
                              <p className="text-[10px] text-white/50 leading-relaxed font-semibold">
                                Inspect and compare the resident name with the
                                face photograph above before providing system
                                clearance.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-tactical-cyan/10 border border-tactical-cyan/20 rounded-2xl flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-tactical-cyan shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-[10px] font-black tracking-widest uppercase text-tactical-cyan font-mono">
                                Account Authorized
                              </p>
                              <p className="text-[10px] text-white/50 leading-relaxed font-semibold">
                                Verified on{" "}
                                {detailed.verificationDate
                                  ? new Date(
                                      detailed.verificationDate
                                    ).toLocaleDateString()
                                  : "N/A"}
                                . This resident holds active tactical SOS
                                rights.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Panel: Geolocation Profile */}
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-tactical-cyan font-mono">
                          Residential Context & Geolocation
                        </p>

                        <div className="grid grid-cols-2 gap-4 bg-white/[0.02] p-4 rounded-3xl border border-white/5 font-mono">
                          <div className="space-y-1">
                            <span className="text-[8px] text-white/30 uppercase tracking-widest flex items-center gap-1">
                              <Home className="w-3 h-3" /> Household Name
                            </span>
                            <p className="text-xs font-black uppercase text-white truncate">
                              {detailed.name}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] text-white/30 uppercase tracking-widest flex items-center gap-1">
                              <Phone className="w-3 h-3" /> Contact
                            </span>
                            <p className="text-xs font-black uppercase text-white truncate">
                              {detailed.phone}
                            </p>
                          </div>
                          <div className="space-y-1 mt-3 col-span-2">
                            <span className="text-[8px] text-white/30 uppercase tracking-widest flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Binding Coordinates
                            </span>
                            <p className="text-[10px] font-black text-tactical-cyan">
                              Lat: {detailed.gpsLat.toFixed(5)} • Lng:{" "}
                              {detailed.gpsLng.toFixed(5)}
                            </p>
                          </div>
                        </div>

                        <div className="h-44 rounded-3xl overflow-hidden border border-white/10 relative shadow-xl">
                          <MapContainer
                            center={[detailed.gpsLat, detailed.gpsLng]}
                            zoom={17}
                            className="w-full h-full grayscale"
                            scrollWheelZoom={false}
                            zoomControl={false}
                          >
                            <OfflineTileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png" />
                            <Marker
                              position={[detailed.gpsLat, detailed.gpsLng]}
                              icon={DefaultIcon}
                            />
                          </MapContainer>
                          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[8px] font-mono uppercase tracking-[0.2em] text-white/60 pointer-events-none flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-emergency" />{" "}
                            Pinpoint Location
                          </div>
                        </div>

                        <div className="space-y-1 bg-white/[0.01] p-4 rounded-2xl border border-white/5">
                          <span className="text-[8px] font-mono text-white/30 tracking-widest uppercase">
                            Verified Residential Sector / Address
                          </span>
                          <p className="text-[10px] font-mono uppercase font-black tracking-wide leading-relaxed text-white/80">
                            {detailed.address}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Controls */}
                  <div className="p-6 md:p-8 bg-black/40 border-t border-white/5 space-y-6">
                    {showRejectPrompt ? (
                      <div className="bg-red-500/5 p-6 rounded-3xl border border-red-500/20 space-y-4 animate-in slide-in-from-bottom duration-200">
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-red-550 font-mono flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />{" "}
                            Specify Rejection Parameters (Kulang na Detalye)
                          </h4>
                          <p className="text-[10px] text-white/40 font-mono uppercase mt-1">
                            Select a standard template or describe details with
                            localized Tagalog instructions
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            "Malabong Larawan o Selfie (Blurry Selfie Photograph)",
                            "Maling Pangalan o ID Mismatch (Government ID mismatches record)",
                            "Maling Bahay o GPS Coordinates (GPS pin outside barangay bounds)",
                            "Hindi Ma-verify na Numero (Phone confirmation invalid)",
                          ].map((tpl) => {
                            const isSelected = rejectionReason === tpl;
                            return (
                              <button
                                key={tpl}
                                type="button"
                                onClick={() => setRejectionReason(tpl)}
                                className={`p-3 text-[9px] font-mono font-black uppercase tracking-wide text-left rounded-xl border transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-red-500/15 border-red-500 text-red-400 font-extrabold shadow-lg"
                                    : "bg-black/20 border-white/5 hover:bg-black/40 hover:border-white/10 text-white/60"
                                }`}
                              >
                                {tpl}
                              </button>
                            );
                          })}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[8px] font-mono text-white/30 tracking-widest uppercase block">
                            Custom local audit notes / Karagdagang paliwanag
                            (Optional)
                          </label>
                          <textarea
                            placeholder="PAALALA SA RESIDENTE: ILAGAY KUNG ANONG PAPELES ANG DAPAT NA MULING KUNIN..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full h-16 bg-black/40 border border-white/5 rounded-xl p-3 text-[10px] font-mono text-white placeholder-white/15 focus:outline-none focus:border-red-500/50 uppercase"
                          />
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowRejectPrompt(false);
                              setRejectionReason("");
                            }}
                            className="px-5 py-3 border border-white/10 hover:bg-white/5 text-[9px] font-mono uppercase font-black tracking-wider text-white/60 hover:text-white rounded-xl transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleVerify(
                                detailed.id,
                                "rejected",
                                rejectionReason
                              )
                            }
                            className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-mono text-[9px] uppercase font-black tracking-wider rounded-xl hover:scale-[1.01] active:scale-95 transition-all shadow-lg shadow-red-600/10 cursor-pointer"
                          >
                            Submit Rejection
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedInspect(null);
                            setShowRejectPrompt(false);
                            setRejectionReason("");
                          }}
                          className="w-full sm:w-auto px-6 py-4 border border-white/10 hover:bg-white/5 font-mono text-xs font-black uppercase tracking-wider rounded-2xl text-white/60 hover:text-white transition-all text-center cursor-pointer"
                        >
                          Close Inspector
                        </button>

                        {detailed.status === "pending" ? (
                          <div className="flex w-full sm:w-auto gap-3">
                            <button
                              onClick={() => setShowRejectPrompt(true)}
                              className="flex-1 sm:flex-none px-6 py-4 bg-red-950/20 hover:bg-red-950/40 border border-tactical-red/30 hover:border-tactical-red text-tactical-red font-mono text-xs font-black uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" /> Reject Account
                            </button>
                            <button
                              onClick={() =>
                                handleVerify(detailed.id, "approved")
                              }
                              className="flex-2 sm:flex-none px-10 py-4 bg-tactical-cyan text-black font-mono text-xs font-black uppercase tracking-wider rounded-2xl hover:scale-[1.02] active:scale-95 shadow-lg shadow-tactical-cyan/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <CheckCircle className="w-4 h-4" /> Authorize &
                              Clear
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleVerify(detailed.id, "pending")}
                            className="w-full sm:w-auto px-6 py-4 border border-white/10 hover:border-white/30 hover:bg-white/5 font-mono text-xs font-black uppercase tracking-wider rounded-2xl text-white/40 hover:text-white transition-all text-center cursor-pointer"
                          >
                            Revoke Credentials (Set Pending)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })()}
      </AnimatePresence>
    </div>
  );
};
