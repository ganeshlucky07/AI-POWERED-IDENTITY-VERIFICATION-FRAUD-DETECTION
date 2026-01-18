
import React, { useState } from 'react';
import { User } from '../types';
import { loginUser, registerUser } from '../services/authService';
import { Shield, Lock, Mail, User as UserIcon, ArrowRight, Sun, Moon, AlertCircle, CheckCircle, ScanFace } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin, isDark, toggleTheme }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleMode = (mode: boolean) => {
    setIsLogin(mode);
    setError('');
    setSuccess('');
    setFormData({ name: '', email: '', password: '' });
  };

  const validateEmail = (email: string): string | null => {
    // 1. Basic Format
    if (!email) return "Email is required";
    
    // 2. Strict Regex
    // Requires standard user@domain.tld format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return "Invalid email format.";

    const parts = email.split('@');
    if (parts.length !== 2) return "Invalid email format.";
    
    const domain = parts[1].toLowerCase();

    // 3. Domain Structure Checks
    if (!domain.includes('.')) return "Email domain must contain a dot (e.g. .com).";
    
    const domainParts = domain.split('.');
    const tld = domainParts[domainParts.length - 1];

    if (tld.length < 2) return "Invalid domain extension.";
    if (/^\d+$/.test(tld)) return "Domain extension cannot be numeric.";

    // 4. Common Typos and Invalid Domains
    const typoDomains = [
        'gmil.com', 'gmal.com', 'gmai.com', 'gmail.co', 
        'yaho.com', 'yahoo.co', 
        'outlok.com', 'hotmai.com'
    ];
    if (typoDomains.includes(domain)) {
        return "Invalid domain. Did you make a typo?";
    }

    // 5. Block Disposable Domains
    const disposableDomains = [
      'tempmail.com', 'yopmail.com', 'mailinator.com', 'guerrillamail.com', 
      '10minutemail.com', 'throwawaymail.com', 'trashmail.com', 'fake-email.com',
      'sharklasers.com', 'maildrop.cc', 'getairmail.com', 'dispostable.com',
      'temp-mail.org', 'grr.la', 'teleworm.us', 'superrito.com', 'jourrapide.com',
      'gustr.com', 'einrot.com', 'fleckens.com', 'rhyta.com', 'wremail.com',
      'ce.mintemail.com', 'armyspy.com', 'dayrep.com', 'cuvox.de',
      'test.com', 'example.com', 'email.com', 'demo.com', 'sample.com'
    ];
    
    if (disposableDomains.some(d => domain.endsWith(d))) {
      return "Disposable, temporary, or test email domains are not allowed.";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Run Validation
    const emailError = validateEmail(formData.email);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (!isLogin && formData.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
    }

    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      if (isLogin) {
        const user = loginUser(formData.email, formData.password);
        onLogin(user);
      } else {
        registerUser(formData.name, formData.email, formData.password);
        setIsLogin(true);
        setSuccess('Account created successfully! Please log in.');
        setFormData(prev => ({ ...prev, password: '' }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4 md:p-6 lg:p-8">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
        <div className="absolute inset-0 opacity-30 dark:opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-400 via-gray-100 to-gray-100 dark:from-brand-900 dark:via-gray-950 dark:to-gray-950"></div>
      </div>

      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 md:top-6 md:right-6 p-3 rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-md border border-white/20 shadow-lg text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-white transition-all hover:scale-110 z-20"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-5xl min-h-[600px] lg:h-[650px] rounded-[2rem] md:rounded-[2.5rem] shadow-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 flex flex-col md:flex-row overflow-hidden relative z-10 transition-all duration-500">
        
        {/* Left Side - Visual / Branding (Hidden on Mobile) */}
        <div className={`hidden md:flex flex-col justify-between w-1/2 p-10 lg:p-12 text-white relative overflow-hidden transition-all duration-700 ease-in-out ${isLogin ? 'bg-gray-900' : 'bg-brand-900'}`}>
             {/* Animated Gradient Overlay */}
             <div className="absolute inset-0 bg-gradient-to-br from-brand-600/90 to-purple-900/90 mix-blend-overlay z-0"></div>
             <div className="absolute -top-24 -left-24 w-64 h-64 bg-brand-500 rounded-full mix-blend-screen filter blur-[80px] opacity-60 animate-blob"></div>
             <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-pink-500 rounded-full mix-blend-screen filter blur-[80px] opacity-60 animate-blob animation-delay-2000"></div>

             <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono mb-6">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    SYSTEM ONLINE
                </div>
                <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-8 h-8 text-brand-300" />
                    <span className="font-bold text-xl tracking-widest font-mono">IDENTITY AGENT</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold leading-tight mt-4">
                  Secure your digital <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-200 to-white">existence.</span>
                </h1>
             </div>

             <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="p-2 bg-brand-500/20 rounded-lg">
                        <ScanFace className="w-6 h-6 text-brand-200" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">Biometric Matching</h3>
                        <p className="text-xs text-gray-300">AI-powered facial geometry analysis.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Shield className="w-6 h-6 text-purple-200" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">Forensic Check</h3>
                        <p className="text-xs text-gray-300">Deep scanning for document tampering.</p>
                    </div>
                </div>
             </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 lg:p-14 flex flex-col justify-center bg-white/40 dark:bg-black/20 backdrop-blur-sm">
            <div className="max-w-sm mx-auto w-full">
                
                {/* Mobile Header Branding */}
                <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
                    <Shield className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                    <span className="font-bold text-lg tracking-widest font-mono text-gray-900 dark:text-white">IDENTITY AGENT</span>
                </div>

                <div className="mb-8 text-center md:text-left">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {isLogin ? 'Enter your credentials to access the secure vault.' : 'Start your secure identity journey today.'}
                    </p>
                </div>

                {/* Toggle Tabs */}
                <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-8 relative">
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-700 rounded-lg shadow-sm transition-all duration-300 ease-out ${isLogin ? 'left-1' : 'left-[calc(50%+2px)]'}`}></div>
                    <button 
                        onClick={() => toggleMode(true)}
                        className={`flex-1 relative z-10 py-2 text-sm font-semibold transition-colors duration-300 ${isLogin ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                        Log In
                    </button>
                    <button 
                        onClick={() => toggleMode(false)}
                        className={`flex-1 relative z-10 py-2 text-sm font-semibold transition-colors duration-300 ${!isLogin ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    {!isLogin && (
                    <div className="relative group">
                        <UserIcon className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400 transition-colors" />
                        <input
                        type="text"
                        placeholder="Full Name"
                        required
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white outline-none transition-all placeholder:text-gray-400 shadow-sm"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    )}

                    <div className="relative group">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400 transition-colors" />
                    <input
                        type="email"
                        placeholder="Email Address"
                        required
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white outline-none transition-all placeholder:text-gray-400 shadow-sm"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                    </div>

                    <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400 transition-colors" />
                    <input
                        type="password"
                        placeholder="Password"
                        required
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white outline-none transition-all placeholder:text-gray-400 shadow-sm"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                    </div>

                    {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-lg flex items-center border border-red-100 dark:border-red-800 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                        {error}
                    </div>
                    )}

                    {success && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300 text-sm rounded-lg flex items-center border border-emerald-100 dark:border-emerald-800 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle className="w-4 h-4 mr-2 shrink-0" />
                        {success}
                    </div>
                    )}

                    <div className="pt-2 space-y-4">
                        <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3.5 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 relative overflow-hidden group"
                        >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white dark:border-gray-900/30 dark:border-t-gray-900 rounded-full animate-spin" />
                        ) : (
                            <>
                            <span className="relative z-10">{isLogin ? 'Access Dashboard' : 'Create Account'}</span>
                            <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                            {/* Shine Effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-shine bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"></div>
                            </>
                        )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
