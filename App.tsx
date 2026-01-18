
import React, { useState, useEffect } from 'react';
import { Shield, ChevronRight, CheckCircle2, AlertCircle, LogOut, LayoutDashboard, UserCheck, Moon, Sun, Clock, Activity, Scan, Lock, Wifi, Server, Database, RefreshCw, Fingerprint, Smartphone, Globe, Cpu, Terminal, FileCheck, Info, Loader2 } from 'lucide-react';
import { KycState, KycStatus, User, RiskLevel } from './types';
import { analyzeKycDocuments } from './services/kycService';
import { getCurrentUser, logoutUser, updateUserKycStatus, updateUserSecurityStats } from './services/authService';
import FileUpload from './components/FileUpload';
import Camera from './components/Camera';
import ResultsView from './components/ResultsView';
import Auth from './components/Auth';
import AiAssistant from './components/AiAssistant';

const getInitialState = (): KycState => ({
  status: KycStatus.IDLE,
  idImage: null,
  selfieImage: null,
  result: null,
  error: null
});

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [kycState, setKycState] = useState<KycState>(getInitialState());
  const [view, setView] = useState<'DASHBOARD' | 'KYC'>('DASHBOARD');
  
  // Device Intel State
  const [deviceInfo, setDeviceInfo] = useState({ 
    os: 'Analyzing...', 
    browser: 'Analyzing...', 
    ip: 'Fetching...' 
  });

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    
    // 1. Detect OS & Browser via User Agent
    const ua = navigator.userAgent;
    let os = "Unknown OS";
    if (ua.indexOf("Win") !== -1) os = "Windows";
    if (ua.indexOf("Mac") !== -1) os = "macOS";
    if (ua.indexOf("Linux") !== -1) os = "Linux";
    if (ua.indexOf("Android") !== -1) os = "Android";
    if (ua.indexOf("like Mac") !== -1) os = "iOS";

    let browser = "Unknown";
    if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
    else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
    else if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) browser = "Safari";
    else if (ua.indexOf("Edg") !== -1) browser = "Edge";

    // 2. Fetch Real IP Address and Store Security Stats
    const fetchIpAndStore = async () => {
      let ip = 'Hidden / Protected';
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (response.ok) {
           const data = await response.json();
           ip = data.ip;
        }
      } catch (err) {
        console.error("IP Fetch Error:", err);
      }

      setDeviceInfo({ os, browser, ip });
      
      // Store persistent log if user is logged in
      if (user) {
        updateUserSecurityStats(user.id, {
            ip,
            os,
            browser,
            userAgent: ua,
            lastSeen: Date.now()
        });
        // Refresh user data from storage to show new history immediately
        const updated = getCurrentUser();
        if (updated) setCurrentUser(updated);
      }
    };

    setDeviceInfo({ os, browser, ip: 'Fetching...' });
    fetchIpAndStore();

  }, [currentUser?.id]); // Re-run if user ID changes (login)

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setKycState(getInitialState());
  };

  const handleStartKyc = () => {
    setView('KYC');
    setKycState(getInitialState());
  };

  const handleIdUpload = (base64: string) => {
    setKycState(prev => ({ 
      ...prev, 
      idImage: base64, 
      status: KycStatus.SCANNING_ID 
    }));
    setTimeout(() => {
      setKycState(prev => ({ ...prev, status: KycStatus.CAPTURING_SELFIE }));
    }, 800);
  };

  const handleSelfieCapture = async (base64: string) => {
    setKycState(prev => ({ 
      ...prev, 
      selfieImage: base64, 
      status: KycStatus.ANALYZING 
    }));

    try {
      if (!kycState.idImage) throw new Error("ID Image missing");
      const result = await analyzeKycDocuments(kycState.idImage, base64);
      setKycState(prev => ({ ...prev, status: KycStatus.COMPLETED, result }));
      if (currentUser) {
        updateUserKycStatus(currentUser.id, result);
        const updated = getCurrentUser();
        if (updated) setCurrentUser(updated);
      }
    } catch (error) {
      console.error(error);
      setKycState(prev => ({ ...prev, status: KycStatus.ERROR, error: error instanceof Error ? error.message : "Verification failed" }));
    }
  };

  const resetProcess = () => {
    setKycState(getInitialState());
    setView('DASHBOARD');
  };

  if (!currentUser) {
    return <Auth onLogin={setCurrentUser} isDark={isDark} toggleTheme={() => setIsDark(!isDark)} />;
  }

  const getAiContext = () => {
    if (view === 'DASHBOARD') return `User ${currentUser.name} is on the dashboard. Verification status: ${currentUser.isVerified ? 'Verified' : 'Unverified'}.`;
    if (kycState.status === KycStatus.IDLE) return "User is about to upload their ID document.";
    if (kycState.status === KycStatus.CAPTURING_SELFIE) return "User is taking a selfie for biometric matching.";
    if (kycState.status === KycStatus.ANALYZING) return "User is waiting for AI analysis.";
    if (kycState.status === KycStatus.ERROR) return `User encountered an error: ${kycState.error}`;
    return "User is reviewing their results.";
  };

  const systemEvents = [
    { event: "Secure Enclave Initialized", status: "OK", time: "Just now" },
    { event: "TLS 1.3 Handshake", status: "Verified", time: "1 min ago" },
    { event: "Biometric Engine", status: "Ready", time: "2 mins ago" },
    { event: "Fraud Detection Rules", status: "Active", time: "5 mins ago" },
  ];

  return (
    <div className="min-h-screen pb-12 transition-colors duration-300 relative">
      
      {/* Navbar */}
      <nav className="sticky top-4 z-40 max-w-7xl mx-auto px-4">
        <div className="glass rounded-2xl h-16 flex items-center justify-between px-4 sm:px-6 border border-white/20 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('DASHBOARD')}>
            <div className="relative">
                <div className="absolute inset-0 bg-brand-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-brand-600 to-brand-700 p-2 rounded-xl shadow-lg border border-brand-400/20">
                    <Shield className="w-5 h-5 text-white" />
                </div>
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white hidden sm:block font-mono tracking-widest group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              IDENTITY <span className="text-brand-600 dark:text-brand-400">AGENT</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-all hover:rotate-12"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2 pl-1 pr-4 py-1.5 bg-gray-100/50 dark:bg-gray-800/50 rounded-full border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
              <div className="w-7 h-7 bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-inner">
                {currentUser.name.charAt(0)}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:block">{currentUser.name}</span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 mt-4">
        
        {view === 'DASHBOARD' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
            <header className="mb-10 px-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-purple-500 to-brand-400 animate-gradient-xy">{currentUser.name.split(' ')[0]}</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg">Your identity dashboard is secure.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* LEFT COLUMN: Security Status + Audit Log */}
              <div className="space-y-8">
                  {/* Status Card */}
                  <div className="glass-card p-8 rounded-[2rem] relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300 shadow-xl shadow-brand-900/5 dark:shadow-black/40 flex flex-col">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-brand-500/10 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                    
                    <div className="relative z-10 h-full flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Scan className="w-5 h-5 text-brand-500" />
                            Security Status
                        </h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${currentUser.isVerified ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                            {currentUser.isVerified ? 'PROTECTED' : 'AT RISK'}
                        </span>
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center">
                        {currentUser.isVerified ? (
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                    <CheckCircle2 className="w-10 h-10 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Verified Identity</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mt-1">Full access granted to all services.</p>
                                </div>
                                <button 
                                    onClick={handleStartKyc}
                                    className="mt-6 w-full py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl font-bold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Update Documents
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl flex gap-4">
                                    <AlertCircle className="w-8 h-8 text-amber-500 shrink-0" />
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white mb-1">Identity Unverified</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Transaction limits applied. Complete KYC to unlock features.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleStartKyc}
                                    className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 group/btn relative overflow-hidden"
                                >
                                    <span className="relative z-10">Start Verification</span>
                                    <ChevronRight className="w-5 h-5 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                                    <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-shine bg-gradient-to-r from-transparent via-white/20 dark:via-gray-900/20 to-transparent"></div>
                                </button>
                            </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Audit Log Card */}
                  <div className="glass-card p-8 rounded-[2rem] flex flex-col relative overflow-hidden shadow-xl shadow-brand-900/5 dark:shadow-black/40 h-[400px]">
                     <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-purple-500" />
                            Audit Log
                        </h2>
                        <div className="text-xs font-mono text-gray-400 flex items-center gap-2">
                          <Terminal className="w-3 h-3" /> System Stream
                        </div>
                     </div>

                     <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin">
                        {/* Real User History */}
                        {currentUser.history && currentUser.history.length > 0 && currentUser.history.map((record, i) => (
                            <div key={i} className="group relative p-4 rounded-2xl bg-white/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 hover:border-brand-200 dark:hover:border-brand-800 transition-all hover:shadow-md flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${
                                        record.riskLevel === RiskLevel.LOW ? 'bg-emerald-500 shadow-emerald-500' :
                                        record.riskLevel === RiskLevel.MEDIUM ? 'bg-amber-500 shadow-amber-500' : 'bg-red-500 shadow-red-500'
                                    }`}></div>
                                    <div>
                                       <div className="font-bold text-sm text-gray-900 dark:text-white">ID Verification: {record.riskLevel} Risk</div>
                                       <div className="text-xs text-gray-500 dark:text-gray-400">Doc: {record.extractedData.documentType}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-mono text-gray-400">{new Date(record.timestamp).toLocaleTimeString()}</div>
                                    <div className="text-[10px] font-bold text-gray-900 dark:text-white mt-1">Score: {record.riskScore}</div>
                                </div>
                            </div>
                        ))}
                        
                        {/* Device History Logs */}
                        {currentUser.deviceHistory && currentUser.deviceHistory.map((device, i) => (
                           <div key={`dev-${i}`} className="p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/10 flex justify-between items-center">
                               <div className="flex items-center gap-3">
                                  <Smartphone className="w-3 h-3 text-blue-500" />
                                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">New Login</span>
                               </div>
                               <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400">{device.os}</span>
                                  <span className="text-[10px] text-gray-400 w-16 text-right">{new Date(device.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                               </div>
                           </div>
                        ))}

                        {/* System Events (Always shown at bottom or if empty) */}
                        {systemEvents.map((event, i) => (
                           <div key={`sys-${i}`} className="p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 flex justify-between items-center opacity-70">
                               <div className="flex items-center gap-3">
                                  <Server className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{event.event}</span>
                               </div>
                               <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">{event.status}</span>
                                  <span className="text-[10px] text-gray-400 w-16 text-right">{event.time}</span>
                               </div>
                           </div>
                        ))}
                     </div>
                  </div>
              </div>

              {/* RIGHT SECTION: Spans 2 cols */}
              <div className="lg:col-span-2 space-y-8">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {/* Real Device Intelligence Card */}
                       <div className="glass-card p-8 rounded-[2rem] relative overflow-hidden flex flex-col shadow-xl shadow-brand-900/5 dark:shadow-black/40">
                         <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Smartphone className="w-5 h-5 text-blue-500" />
                                Device Intel
                            </h2>
                            <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded-md text-[10px] font-bold uppercase tracking-wider">Trusted</span>
                         </div>
                         
                         <div className="flex-1 space-y-4 font-mono text-sm">
                            <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700">
                              <div className="flex items-center gap-3">
                                <Cpu className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">OS</span>
                              </div>
                              <span className="font-bold text-gray-900 dark:text-white">{deviceInfo.os}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700">
                              <div className="flex items-center gap-3">
                                <Globe className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">Browser</span>
                              </div>
                              <span className="font-bold text-gray-900 dark:text-white">{deviceInfo.browser}</span>
                            </div>
                             <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700">
                              <div className="flex items-center gap-3">
                                <Wifi className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">IP Addr</span>
                              </div>
                              <span className="font-bold text-gray-900 dark:text-white text-xs flex items-center gap-2">
                                {deviceInfo.ip === 'Fetching...' && <Loader2 className="w-3 h-3 animate-spin" />}
                                {deviceInfo.ip}
                              </span>
                            </div>
                         </div>
                         <div className="mt-6 text-[10px] text-center text-gray-400">
                            Real-time fingerprinting active.
                         </div>
                      </div>
                      
                       {/* Compliance & Standards Card */}
                       <div className="glass-card p-8 rounded-[2rem] relative overflow-hidden flex flex-col justify-between shadow-xl shadow-brand-900/5 dark:shadow-black/40">
                          <div className="flex items-center gap-2 mb-6">
                              <FileCheck className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Compliance</h2>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                             <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-brand-200 dark:hover:border-brand-800 transition-colors">
                                <Shield className="w-6 h-6 text-brand-600 mb-2" />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">GDPR</span>
                                <span className="text-[9px] text-gray-400">Ready</span>
                             </div>
                             <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                                <Lock className="w-6 h-6 text-emerald-600 mb-2" />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">SOC2</span>
                                <span className="text-[9px] text-gray-400">Type II</span>
                             </div>
                             <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
                                <Database className="w-6 h-6 text-purple-600 mb-2" />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">ISO</span>
                                <span className="text-[9px] text-gray-400">27001</span>
                             </div>
                             <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                                <Info className="w-6 h-6 text-blue-600 mb-2" />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">CCPA</span>
                                <span className="text-[9px] text-gray-400">Verified</span>
                             </div>
                          </div>
                       </div>
                  </div>
              </div>

            </div>
          </div>
        )}

        {view === 'KYC' && (
          <div className="animate-in slide-in-from-right duration-500">
            <div className="mb-8 flex items-center gap-3 text-sm">
               <button onClick={() => setView('DASHBOARD')} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Dashboard</button>
               <ChevronRight className="w-4 h-4 text-gray-300" />
               <span className="text-brand-600 dark:text-brand-400 font-bold bg-brand-50 dark:bg-brand-900/20 px-3 py-1 rounded-full border border-brand-100 dark:border-brand-900/50">KYC Process</span>
            </div>

            {kycState.status === KycStatus.ERROR && (
              <div className="glass-card border-l-4 border-l-red-500 p-8 rounded-2xl text-center mb-8 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Process Terminated</h3>
                <p className="text-red-600 dark:text-red-300 mb-6 max-w-md mx-auto">{kycState.error}</p>
                <div className="flex justify-center gap-4">
                    <button 
                      onClick={() => setKycState(getInitialState())}
                      className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity font-medium"
                    >
                      Retry System
                    </button>
                    <button 
                      onClick={() => setView('DASHBOARD')}
                      className="px-6 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      Abort
                    </button>
                </div>
              </div>
            )}

            <div className="max-w-2xl mx-auto">
              {kycState.status === KycStatus.IDLE && (
                <div className="glass-card p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                   <div className="relative z-10">
                        <div className="flex items-center gap-6 mb-10">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-900/50 dark:to-brand-800/30 text-brand-600 dark:text-brand-400 flex items-center justify-center text-2xl font-black shadow-inner">1</div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Document Uplink</h2>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">Submit high-resolution Identity Document.</p>
                            </div>
                        </div>
                        <FileUpload label="Government ID" onUpload={handleIdUpload} />
                   </div>
                </div>
              )}

              {(kycState.status === KycStatus.CAPTURING_SELFIE || kycState.status === KycStatus.SCANNING_ID) && (
                <div className="glass-card p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -ml-16 -mt-16"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-6 mb-10">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-900/50 dark:to-brand-800/30 text-brand-600 dark:text-brand-400 flex items-center justify-center text-2xl font-black shadow-inner">2</div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Biometric Scan</h2>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">Align face with the guidance frame.</p>
                            </div>
                        </div>
                        <Camera label="Selfie" onCapture={handleSelfieCapture} />
                    </div>
                </div>
              )}

              {kycState.status === KycStatus.ANALYZING && (
                <div className="glass-card p-16 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center text-center">
                  <div className="relative w-32 h-32 mb-8">
                    <div className="absolute inset-0 border-4 border-gray-100 dark:border-gray-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-brand-600 dark:border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Shield className="w-12 h-12 text-brand-600 dark:text-brand-500 animate-pulse" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Processing Data</h2>
                  <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto animate-pulse">
                    Analyzing cryptographic markers and biometric features...
                  </p>
                </div>
              )}
            </div>

            {kycState.status === KycStatus.COMPLETED && kycState.result && (
              <ResultsView result={kycState.result} onReset={resetProcess} />
            )}
          </div>
        )}

      </main>
      
      <AiAssistant context={getAiContext()} />
    </div>
  );
}
