import { useState, useEffect } from "react";
import * as api from "../lib/api";
import socket from "../lib/socket";
import { ResidentProfile } from "../types";
import {
  Check,
  X,
  Eye,
  Search,
  Filter,
  MapPin,
  Phone,
  User,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";

export default function AdminResidents({ profile }: { profile: any }) {
  const [residents, setResidents] = useState<ResidentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResident, setSelectedResident] =
    useState<ResidentProfile | null>(null);
  const [rejectingResident, setRejectingResident] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    // Extra safety, although conditional rendering in App.tsx prevents this component
    // from being rendered if not authorized
    if (
      !profile ||
      (profile.role !== "admin" &&
        profile.role !== "tanod" &&
        profile.role !== "super_admin")
    ) {
      setLoading(false);
      return;
    }

    const fetchResidents = async () => {
      try {
        const data = await api.residents.getAll();
        const formatted = data.map((r: any) => {
          const detailObj = r.details || {};
          const nameValue =
            r.fullName ||
            r.full_name ||
            r.name ||
            detailObj.fullName ||
            detailObj.name ||
            "UNKNOWN RESIDENT";
          const selfieValue =
            r.selfieUrl ||
            r.selfie_url ||
            detailObj.selfieUrl ||
            detailObj.selfie_url ||
            "";
          const idPhotoValue =
            r.idPhotoUrl ||
            r.id_photo_url ||
            detailObj.idPhotoUrl ||
            detailObj.id_photo_url ||
            "";
          const phoneValue =
            r.phone ||
            r.mobileNumber ||
            r.mobile_number ||
            detailObj.phone ||
            detailObj.mobileNumber ||
            "N/A";
          const houseNo =
            r.houseNumber ||
            r.house_number ||
            detailObj.houseNumber ||
            detailObj.house_number ||
            "N/A";
          const idT =
            r.idType || r.id_type || detailObj.idType || "BARANGAY VERIFIED";
          const idNum =
            r.idNumber || r.id_number || detailObj.idNumber || "N/A";
          const bType =
            r.bloodType || r.blood_type || detailObj.bloodType || "N/A";
          const medConditions =
            r.medicalConditions ||
            r.medical_conditions ||
            detailObj.medicalConditions ||
            [];
          const eContactName =
            r.emergencyContactName ||
            r.emergency_contact_name ||
            detailObj.emergencyContactName ||
            "N/A";
          const eContactPhone =
            r.emergencyContactPhone ||
            r.emergency_contact_phone ||
            detailObj.emergencyContactPhone ||
            "N/A";

          return {
            ...r,
            ...detailObj,
            id: r.id,
            fullName: nameValue,
            selfieUrl: selfieValue,
            idPhotoUrl: idPhotoValue,
            mobileNumber: phoneValue,
            houseNumber: houseNo,
            street:
              r.address ||
              r.street ||
              detailObj.address ||
              detailObj.street ||
              "N/A",
            idType: idT,
            idNumber: idNum,
            bloodType: bType,
            medicalConditions:
              typeof medConditions === "string"
                ? [medConditions]
                : medConditions,
            emergencyContactName: eContactName,
            emergencyContactPhone: eContactPhone,
            gpsLat: Number(
              r.gpsLat || r.gps_lat || detailObj.gpsLat || 13.0641
            ),
            gpsLng: Number(
              r.gpsLng || r.gps_lng || detailObj.gpsLng || 120.7303
            ),
          } as ResidentProfile;
        });

        const filteredList =
          filter === "all"
            ? formatted
            : formatted.filter((r: ResidentProfile) => r.status === filter);

        setResidents(filteredList);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch residents", err);
        setLoading(false);
      }
    };

    fetchResidents();
    socket.on("resident_update", fetchResidents);

    return () => {
      socket.off("resident_update", fetchResidents);
    };
  }, [filter, profile]);

  const handleApprove = async (id: string, name: string) => {
    try {
      const residentDoc = residents.find((r) => r.id === id);
      const updateData: any = {
        status: "approved",
        approvedAt: new Date().toISOString(),
      };

      if (residentDoc) {
        // In this migration, geohash logic is ideally backend-side
        // but we'll include it in the update payload if needed
        try {
          const ngeohash = await import("ngeohash");
          updateData.geohash = ngeohash.encode(
            residentDoc.gpsLat,
            residentDoc.gpsLng,
            6
          );
        } catch (e) {
          console.warn("Geohash calculation skipped in frontend", e);
        }
      }

      await api.residents.update(id, updateData);

      // Also update the main user profile status
      await api.auth.updateProfile(id, { status: "approved" });

      toast.success(`${name} approved`);
    } catch (err: any) {
      console.error("Approve failed:", err);
      toast.error("Approval failed");
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await api.residents.update(id, {
        status: "rejected",
        rejectionReason: reason,
      });
      // Sync with users collection
      await api.auth.updateProfile(id, { status: "rejected" });

      setRejectingResident(null);
      setRejectReason("");
      toast.success("Registration rejected");
    } catch (err: any) {
      console.error("Reject failed:", err);
      toast.error("Rejection failed");
    }
  };

  const filteredResidents = residents.filter(
    (r) =>
      (r.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.idNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.mobileNumber || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex overflow-x-auto gap-2 bg-[#16191F] p-1 rounded-xl border border-[#2D3139] scrollbar-none shadow-inner">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                filter === f
                  ? "bg-[#FF4B4B] text-white shadow-lg"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E9299]" />
          <input
            type="text"
            placeholder="Search residents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#16191F] border border-[#2D3139] rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-[#FF4B4B] outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredResidents.map((resident) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={resident.id}
              className="bg-[#16191F] border border-[#2D3139] rounded-3xl p-6 hover:border-[#FF4B4B]/50 transition-all group"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-[#252932] overflow-hidden border border-[#2D3139] shrink-0">
                  <img
                    src={resident.selfieUrl}
                    alt={resident.fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white truncate">
                    {resident.fullName}
                  </h4>
                  <p className="text-xs text-[#8E9299] mb-2">
                    {resident.idType}: {resident.idNumber}
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      resident.status === "pending"
                        ? "bg-amber-500/20 text-amber-500"
                        : resident.status === "approved"
                        ? "bg-green-500/20 text-green-500"
                        : "bg-red-500/20 text-red-500"
                    }`}
                  >
                    {resident.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-[#8E9299]">
                  <Phone className="w-3 h-3" /> {resident.mobileNumber}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#8E9299]">
                  <MapPin className="w-3 h-3" /> {resident.street},{" "}
                  {resident.houseNumber}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedResident(resident)}
                  className="flex-1 py-2 bg-[#252932] text-white text-xs font-bold rounded-lg hover:bg-[#2D3139] transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-3 h-3" /> VIEW
                </button>
                {resident.status === "pending" && (
                  <>
                    <button
                      onClick={() =>
                        handleApprove(resident.id, resident.fullName)
                      }
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setRejectingResident({
                          id: resident.id,
                          name: resident.fullName,
                        })
                      }
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {loading && residents.length === 0 && (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#FF4B4B] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Profile Modal */}
      <AnimatePresence>
        {selectedResident && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="bg-[#16191F] border-t md:border border-[#2D3139] w-full max-w-2xl rounded-t-[32px] md:rounded-[40px] overflow-hidden shadow-2xl h-[90vh] md:h-auto md:max-h-[90vh] flex flex-col"
            >
              <div className="p-5 md:p-8 border-b border-[#2D3139] flex justify-between items-center bg-[#1A1D23] shrink-0">
                <h3 className="font-black italic text-xl md:text-2xl tracking-tighter">
                  RESIDENT PROFILE
                </h3>
                <button
                  onClick={() => setSelectedResident(null)}
                  className="p-2 hover:bg-[#252932] rounded-full transition-colors text-[#8E9299] hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 md:p-8">
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8">
                  <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-visible shrink-0 pb-2 md:pb-0">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl md:rounded-3xl bg-[#0F1115] overflow-hidden border border-[#2D3139]">
                        <img
                          src={selectedResident.selfieUrl}
                          className="w-full h-full object-cover"
                          alt="Selfie"
                        />
                      </div>
                      <p className="text-[8px] md:text-[10px] font-black uppercase text-[#8E9299] tracking-widest text-center">
                        Selfie / Profile
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-32 h-32 md:w-48 md:h-32 rounded-xl md:rounded-2xl bg-[#0F1115] overflow-hidden border border-[#2D3139]">
                        <img
                          src={selectedResident.idPhotoUrl}
                          className="w-full h-full object-contain"
                          alt="ID"
                        />
                      </div>
                      <p className="text-[8px] md:text-[10px] font-black uppercase text-[#8E9299] tracking-widest text-center">
                        Government ID
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <ProfileItem
                      label="Full Name"
                      value={selectedResident.fullName}
                    />
                    <ProfileItem
                      label="Age / Gender"
                      value={`${selectedResident.age} / ${selectedResident.gender}`}
                    />
                    <ProfileItem
                      label="Date of Birth"
                      value={selectedResident.dob}
                    />
                    <ProfileItem
                      label="Civil Status"
                      value={selectedResident.civilStatus}
                    />
                    <ProfileItem
                      label="Mobile"
                      value={selectedResident.mobileNumber}
                    />
                    <ProfileItem
                      label="Email"
                      value={selectedResident.email || "N/A"}
                    />
                    <ProfileItem
                      label="ID Type"
                      value={selectedResident.idType}
                    />
                    <ProfileItem
                      label="ID Number"
                      value={selectedResident.idNumber}
                    />
                    <ProfileItem
                      label="Address"
                      value={`${selectedResident.houseNumber}, ${selectedResident.street}`}
                      span={2}
                    />
                    <ProfileItem
                      label="Household"
                      value={`${selectedResident.householdCount} Members`}
                    />
                    <ProfileItem
                      label="Special Needs"
                      value={selectedResident.specialNeeds}
                    />
                    {selectedResident.specialNeeds === "Yes" && (
                      <ProfileItem
                        label="Special Needs Info"
                        value={selectedResident.specialNeedsInfo || "N/A"}
                        span={2}
                      />
                    )}
                  </div>
                </div>

                <div className="bg-[#0F1115] p-6 rounded-3xl border border-[#2D3139]">
                  <h5 className="text-xs font-black text-[#8E9299] uppercase tracking-widest mb-4 flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#FF4B4B]" /> REGISTERED
                      LOCATION
                    </div>
                    {/* Inline update test handler */}
                    <button
                      onClick={async () => {
                        const lat = prompt(
                          "Enter new latitude:",
                          selectedResident.gpsLat?.toString()
                        );
                        const lng = prompt(
                          "Enter new longitude:",
                          selectedResident.gpsLng?.toString()
                        );
                        if (lat && lng) {
                          try {
                            const res = await api.fetchAPI(
                              `/residents/${selectedResident.id}/location`,
                              {
                                method: "PATCH",
                                body: JSON.stringify({
                                  lat: Number(lat),
                                  lng: Number(lng),
                                }),
                              }
                            );

                            if (res.is_outside_barangay) {
                              toast.error(
                                "⚠️ Warning: This location is outside the barangay boundary.",
                                { duration: 6000 }
                              );
                            } else {
                              toast.success("Location updated successfully");
                            }
                            // Update local state temporarily
                            setSelectedResident({
                              ...selectedResident,
                              gpsLat: Number(lat),
                              gpsLng: Number(lng),
                            });
                          } catch (e) {
                            toast.error("Failed to update location");
                          }
                        }
                      }}
                      className="text-[9px] font-bold tracking-widest text-tactical-cyan hover:text-white transition-colors"
                    >
                      UPDATE COORDS
                    </button>
                  </h5>
                  <div className="flex justify-between items-center text-sm">
                    {selectedResident.gpsLat !== undefined &&
                    selectedResident.gpsLat !== null &&
                    selectedResident.gpsLng !== undefined &&
                    selectedResident.gpsLng !== null ? (
                      <>
                        <code className="text-[#FF4B4B]">
                          {selectedResident.gpsLat.toFixed(6)},{" "}
                          {selectedResident.gpsLng.toFixed(6)}
                        </code>
                        <a
                          href={`https://www.google.com/maps?q=${selectedResident.gpsLat},${selectedResident.gpsLng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white hover:text-[#FF4B4B] flex items-center gap-2 font-bold"
                        >
                          OPEN IN GOOGLE MAPS{" "}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </>
                    ) : (
                      <span className="text-[#8E9299] italic">
                        Location not available
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 md:p-8 border-t border-[#2D3139] flex flex-col md:flex-row gap-3 md:gap-4 bg-[#1A1D23] shrink-0">
                {selectedResident.status === "pending" ? (
                  <>
                    <button
                      onClick={() => {
                        handleApprove(
                          selectedResident.id,
                          selectedResident.fullName
                        );
                        setSelectedResident(null);
                      }}
                      className="flex-1 py-3 md:py-4 bg-green-600 text-white font-bold rounded-xl md:rounded-2xl hover:bg-green-700 transition-all shadow-xl text-sm"
                    >
                      APPROVE
                    </button>
                    <button
                      onClick={() => {
                        setRejectingResident({
                          id: selectedResident.id,
                          name: selectedResident.fullName,
                        });
                        setSelectedResident(null);
                      }}
                      className="flex-1 py-3 md:py-4 bg-red-600 text-white font-bold rounded-xl md:rounded-2xl hover:bg-red-700 transition-all shadow-xl text-sm"
                    >
                      REJECT
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          await api.residents.updateRole(
                            selectedResident.id,
                            "tanod"
                          );
                          toast.success("Promoted to Tanod");
                          setSelectedResident(null);
                        } catch (e) {
                          toast.error("Failed to promote");
                        }
                      }}
                      className="flex-1 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all text-sm"
                    >
                      PROMOTE TO TANOD
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await api.residents.updateRole(
                            selectedResident.id,
                            "admin"
                          );
                          toast.success("Promoted to Admin");
                          setSelectedResident(null);
                        } catch (e) {
                          toast.error("Failed to promote");
                        }
                      }}
                      className="flex-1 py-3 bg-red-800 text-white font-bold rounded-xl hover:bg-red-900 transition-all text-sm"
                    >
                      PROMOTE TO ADMIN
                    </button>
                    <button
                      onClick={() => setSelectedResident(null)}
                      className="flex-1 py-3 bg-[#252932] text-white font-bold rounded-xl hover:bg-[#2D3139] transition-all text-sm"
                    >
                      CLOSE PROFILE
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {rejectingResident && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#16191F] border border-[#2D3139] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl flex flex-col p-6"
            >
              <h3 className="font-black italic text-xl md:text-2xl tracking-tighter text-white mb-2">
                Reject Registration
              </h3>
              <p className="text-[#8E9299] text-xs font-medium mb-6">
                Please provide a reason for rejecting {rejectingResident.name}.
                This will be shown to the resident.
              </p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Blurry ID, Invalid Address, Not a resident"
                className="w-full bg-[#0F1115] border border-[#2D3139] rounded-2xl p-4 text-white placeholder-[#8E9299] mb-6 focus:outline-none focus:border-[#FF4B4B] min-h-[120px]"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setRejectingResident(null)}
                  className="flex-1 py-3 bg-[#252932] text-white font-bold rounded-xl hover:bg-[#2D3139] transition-all text-sm"
                >
                  CANCEL
                </button>
                <button
                  onClick={() =>
                    handleReject(rejectingResident.id, rejectReason)
                  }
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all text-sm"
                >
                  CONFIRM REJECT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileItem({
  label,
  value,
  span = 1,
}: {
  label: string;
  value: string;
  span?: number;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <p className="text-[10px] font-black uppercase text-[#8E9299] tracking-widest mb-1">
        {label}
      </p>
      <p className="text-sm font-bold text-white break-words">{value}</p>
    </div>
  );
}
