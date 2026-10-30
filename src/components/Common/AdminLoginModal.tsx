import React, { useState } from 'react';
import { Lock, Mail, Key, ShieldCheck, AlertCircle, X } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate credentials: admin@gmail.com and admin123
    setTimeout(() => {
      if (email.trim().toLowerCase() === 'admin@gmail.com' && password === 'admin123') {
        setIsSubmitting(false);
        onSuccess();
        onClose();
      } else {
        setIsSubmitting(false);
        setError('Invalid credentials. Use admin@gmail.com / admin123');
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] rounded-2xl max-w-md w-full border border-black/10 shadow-2xl p-6 space-y-6 relative animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-[#444444] hover:text-[#000000] hover:bg-black/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#000000] text-[#FFFFFF] flex items-center justify-center shadow-md">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#000000]">Admin Authentication</h3>
            <p className="text-xs text-[#555555]">Access restricted to authorized road safety personnel</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-[#222222] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#000000]" /> Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@gmail.com"
              className="w-full px-3.5 py-2.5 bg-[#F2F2F2] border border-black/10 rounded-xl text-xs text-[#000000] focus:outline-none focus:border-black placeholder:text-[#888888]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-[#222222] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#000000]" /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-[#F2F2F2] border border-black/10 rounded-xl text-xs text-[#000000] focus:outline-none focus:border-black placeholder:text-[#888888]"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-black/[0.03] border border-black/5 text-[11px] font-mono text-[#555555]">
            Default Demo Credential: <strong className="text-[#000000]">admin@gmail.com</strong> / <strong className="text-[#000000]">admin123</strong>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-black/10 text-xs font-medium text-[#222222] hover:bg-black/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-full bg-[#000000] hover:bg-[#222222] text-[#FFFFFF] text-xs font-medium transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Verifying...' : 'Unlock Registry'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

