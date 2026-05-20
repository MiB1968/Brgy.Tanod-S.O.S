// src/components/auth/LoginView.tsx
import React from "react";
import { Mail, Lock, Globe } from "lucide-react";

interface LoginViewProps {
  onLogin: (email?: string, password?: string) => void;
  onGoogleLogin: () => void;
  onRegister: () => void;
  isLoggingIn: boolean;
}

export default function LoginView({
  onLogin,
  onGoogleLogin,
  onRegister,
  isLoggingIn,
}: LoginViewProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="mx-auto mb-6 w-20 h-20 bg-red-600 rounded-2xl flex items-center justify-center">
            🛡️
          </div>
          <h1 className="text-4xl font-bold">Brgy. Tanod</h1>
          <p className="text-gray-400 mt-2">S.O.S. Emergency Response System</p>
        </div>

        <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Email / Unit ID</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-2xl pl-12 py-3 focus:outline-none focus:border-blue-600"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-2xl pl-12 py-3 focus:outline-none focus:border-blue-600"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-red-600 hover:bg-red-700 py-4 rounded-2xl font-semibold text-lg transition-all disabled:opacity-70"
            >
              {isLoggingIn ? "AUTHENTICATING..." : "LOGIN"}
            </button>
          </form>

          <div className="my-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative text-center">
              <span className="bg-gray-900 px-4 text-gray-500">OR</span>
            </div>
          </div>

          <button
            onClick={onGoogleLogin}
            className="w-full flex items-center justify-center gap-3 border border-gray-700 hover:border-gray-600 py-4 rounded-2xl transition-all"
          >
            <Globe className="w-5 h-5" />
            Continue with Google Workspace
          </button>

          <button
            onClick={onRegister}
            className="w-full text-center mt-6 text-sm text-gray-400 hover:text-white transition-colors"
          >
            New Resident? Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
