import { useState } from "react";
import * as api from "../../lib/api";
import { motion } from "motion/react";
import {
  UserPlus,
  Shield,
  UserCheck,
  Key,
  Mail,
  Check,
  AlertCircle,
  Phone,
  MapPin,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function CreateUserForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "tanod", // default to tanod
    phone: "",
    address: "",
    houseNumber: "",
    householdSize: "1",
    bloodType: "",
    medicalConditions: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(true);

  const roles = [
    {
      id: "tanod",
      name: "Tanod Patrol Officer",
      desc: "Peacekeepers with active patrol logs",
      icon: Shield,
    },
    {
      id: "resident",
      name: "Citizen Resident",
      desc: "Local barangay members with rescue alerts",
      icon: UserCheck,
    },
    {
      id: "admin",
      name: "Barangay Admin",
      desc: "Central command dispatchers",
      icon: UserPlus,
    },
  ];

  const handleInput = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Identity and communication details are required.");
      return;
    }

    if (!autoGenerate) {
      if (!formData.password.trim()) {
        toast.error("Passcode is required when auto-generation is disabled.");
        return;
      }
      if (formData.password.length < 6) {
        toast.error("Passcode must be at least 6 characters.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        role: formData.role,
        autoGeneratePassword: autoGenerate,
      };

      if (!autoGenerate) {
        payload.password = formData.password;
      }

      if (formData.role === "resident") {
        payload.details = {
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          houseNumber: formData.houseNumber.trim() || null,
          householdSize: formData.householdSize
            ? Number(formData.householdSize)
            : 1,
          bloodType: formData.bloodType.trim() || null,
          medicalConditions: formData.medicalConditions.trim() || null,
          emergencyContactName: formData.emergencyContactName.trim() || null,
          emergencyContactPhone: formData.emergencyContactPhone.trim() || null,
        };
      }

      await api.admin.createUser(payload);

      toast.success(
        `Committed successfully. Registered ${formData.name} as a verified ${formData.role}!`
      );

      // Reset only key fields
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "tanod",
        phone: "",
        address: "",
        houseNumber: "",
        householdSize: "1",
        bloodType: "",
        medicalConditions: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
      });
      setAutoGenerate(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("[AdminCreateUserForm] Error:", err);
      toast.error(
        err.message || "System fault: Failed to commit user registry."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#14171E] border border-white/5 rounded-3xl p-6 md:p-10 w-full max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
      {/* Decorative background visual */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-tactical-cyan via-emergency to-tactical-cyan animate-pulse" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-tactical-cyan/5 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3" />

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-tactical-cyan/10 border border-tactical-cyan/20 rounded-2xl text-tactical-cyan">
          <UserPlus className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-black font-mono tracking-tight text-white uppercase">
            Initialize Personnel & Resident Profiles
          </h2>
          <p className="text-xs text-white/40 font-mono uppercase tracking-widest mt-0.5">
            PROACTIVE GROUND ACCOUNT MANIFESTATION FOR BRGY. TANOD NETWORK
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Role Picker Section */}
        <div className="space-y-3">
          <label className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase font-mono block">
            System Classification Role
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roles.map((r) => {
              const Icon = r.icon;
              const isSelected = formData.role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, role: r.id }))
                  }
                  className={`flex flex-col items-start p-5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? "bg-tactical-cyan/10 border-tactical-cyan text-white shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                      : "bg-white/[0.01] border-white/5 text-white/40 hover:border-white/10 hover:bg-white/[0.03]"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl border mb-3.5 ${
                      isSelected
                        ? "bg-tactical-cyan/20 border-tactical-cyan/30 text-tactical-cyan"
                        : "bg-white/5 border-white/5 text-white/45"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-black font-mono uppercase text-white tracking-wide">
                    {r.name}
                  </span>
                  <span className="text-[11px] text-white/40 font-mono mt-1 leading-relaxed">
                    {r.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Identity Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase font-mono block">
              Operator Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInput}
                placeholder="e.g. Juan De La Cruz"
                className="w-full bg-white/[0.02] border border-white/5 focus:border-tactical-cyan/50 rounded-2xl p-4 text-white placeholder-white/10 focus:outline-none font-mono font-bold"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase font-mono block">
              Communication Address (Email Link)
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 w-4 h-4 text-white/20" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInput}
                placeholder="operator@brgytanod.gov"
                className="w-full bg-white/[0.02] border border-white/5 focus:border-tactical-cyan/50 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/10 focus:outline-none font-mono font-medium"
                required
              />
            </div>
          </div>

          {/* Password Settings */}
          <div className="space-y-4 md:col-span-2 p-5 bg-white/[0.01] border border-white/5 rounded-2xl">
            <div className="flex items-center gap-3">
              <input
                id="autoGeneratePasswordCheck"
                type="checkbox"
                checked={autoGenerate}
                onChange={(e) => {
                  setAutoGenerate(e.target.checked);
                  setFormData((prev) => ({ ...prev, password: "" }));
                }}
                className="w-5 h-5 accent-tactical-cyan cursor-pointer rounded border-white/10 bg-[#14171E]"
              />
              <label
                htmlFor="autoGeneratePasswordCheck"
                className="text-xs font-black tracking-wider text-white uppercase cursor-pointer font-mono select-none"
              >
                Auto-generate secure temporary passcode & welcome email
              </label>
            </div>
            <p className="text-[11px] text-white/40 font-mono uppercase tracking-wider leading-relaxed pl-8">
              {autoGenerate
                ? "💡 ACTIVE: The system will generate a secure 16-character credential and securely trigger an aesthetic HTML email notification."
                : "⚠️ ACTIVE: Manual access passcode overrides are active. Ensure the credential is safe and communicated offline."}
            </p>
          </div>

          {!autoGenerate && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 md:col-span-2"
            >
              <label className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase font-mono block">
                Access Code (System Password)
              </label>
              <div className="relative flex items-center">
                <Key className="absolute left-4 w-4 h-4 text-white/20" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInput}
                  placeholder="•••••••• (Min 6 characters)"
                  className="w-full bg-white/[0.02] border border-white/5 focus:border-tactical-cyan/50 rounded-2xl py-4 pl-12 pr-12 text-white placeholder-white/10 focus:outline-none font-mono font-medium"
                  required={!autoGenerate}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-white/20 hover:text-white/60 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Conditional Resident Details */}
        {formData.role === "resident" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-6 pt-6 border-t border-white/5 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 bg-tactical-cyan rounded-full animate-ping" />
              <h3 className="text-[10px] font-black tracking-[0.2em] text-tactical-cyan uppercase font-mono">
                COMMUNITY RESIDENCY COMPLIANCE INFORMATION (OPTIONAL)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase font-mono block">
                  Active Contact (Phone Number)
                </label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-4 w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInput}
                    placeholder="e.g. 09171234567"
                    className="w-full bg-white/[0.02] border border-white/5 focus:border-tactical-cyan/50 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/10 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase font-mono block">
                  Household Group Count
                </label>
                <input
                  type="number"
                  name="householdSize"
                  value={formData.householdSize}
                  onChange={handleInput}
                  min="1"
                  className="w-full bg-white/[0.02] border border-white/5 focus:border-tactical-cyan/50 rounded-2xl p-4 text-white focus:outline-none font-mono font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase font-mono block">
                  House physical designation ID
                </label>
                <input
                  type="text"
                  name="houseNumber"
                  value={formData.houseNumber}
                  onChange={handleInput}
                  placeholder="e.g. House #56, Block 3"
                  className="w-full bg-white/[0.02] border border-white/5 focus:border-tactical-cyan/50 rounded-2xl p-4 text-white placeholder-white/10 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase font-mono block">
                  Street Address
                </label>
                <div className="relative flex items-center">
                  <MapPin className="absolute left-4 w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInput}
                    placeholder="e.g. Purok Mabuhay"
                    className="w-full bg-white/[0.02] border border-white/5 focus:border-tactical-cyan/50 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/10 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase font-mono block">
                  Blood Type
                </label>
                <input
                  type="text"
                  name="bloodType"
                  value={formData.bloodType}
                  onChange={handleInput}
                  placeholder="e.g. O+, A-"
                  className="w-full bg-white/[0.02] border border-white/5 focus:border-tactical-cyan/50 rounded-2xl p-4 text-white placeholder-white/10 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase font-mono block">
                  Medical Conditions / Allergies
                </label>
                <input
                  type="text"
                  name="medicalConditions"
                  value={formData.medicalConditions}
                  onChange={handleInput}
                  placeholder="e.g. Asthma, Hypertension"
                  className="w-full bg-white/[0.02] border border-white/5 focus:border-tactical-cyan/50 rounded-2xl p-4 text-white placeholder-white/10 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase font-mono block">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleInput}
                  placeholder="Emergency contact person"
                  className="w-full bg-white/[0.02] border border-white/5 focus:border-tactical-cyan/50 rounded-2xl p-4 text-white placeholder-white/10 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase font-mono block">
                  Emergency Contact Phone
                </label>
                <input
                  type="text"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleInput}
                  placeholder="Phone number of emergency contact"
                  className="w-full bg-white/[0.02] border border-white/5 focus:border-tactical-cyan/50 rounded-2xl p-4 text-white placeholder-white/10 focus:outline-none font-mono"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Controls */}
        {!navigator.onLine && (
          <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-xl text-sm text-yellow-400 font-mono flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>
              ⚠️ New user creation requires internet connection (Firebase Auth
              limitation).
            </span>
          </div>
        )}
        <div className="flex gap-4 pt-4 border-t border-white/5">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-tactical-cyan text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl font-mono hover:scale-[1.01] active:scale-95 hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.2)] disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                COMMITTING AGENT...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                DEPLOY & VERIFY GROUND PROFILE
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
