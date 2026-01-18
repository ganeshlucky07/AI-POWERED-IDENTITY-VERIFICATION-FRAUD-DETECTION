import React from 'react';
import { KycResult, RiskLevel } from '../types';
import { ShieldCheck, ShieldAlert, UserCheck, AlertTriangle, FileText, Activity, CreditCard, RotateCcw } from 'lucide-react';

interface ResultsViewProps {
  result: KycResult;
  onReset: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ result, onReset }) => {
  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.LOW: 
        return 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-200';
      case RiskLevel.MEDIUM: 
        return 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-800 dark:text-amber-200';
      case RiskLevel.HIGH: 
        return 'from-red-500/10 to-red-500/5 border-red-500/20 text-red-800 dark:text-red-200';
    }
  };

  const getRiskIcon = (level: RiskLevel) => {
    const className = "w-8 h-8";
    switch (level) {
      case RiskLevel.LOW: return <ShieldCheck className={className} />;
      case RiskLevel.MEDIUM: return <AlertTriangle className={className} />;
      case RiskLevel.HIGH: return <ShieldAlert className={className} />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Header / Verdict */}
      <div className={`p-10 rounded-[2.5rem] border bg-gradient-to-br backdrop-blur-xl relative overflow-hidden ${getRiskColor(result.riskLevel)}`}>
        {/* Animated background glow */}
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-[100px] opacity-30 -mr-20 -mt-20 ${result.riskLevel === 'Low' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className={`p-5 rounded-2xl shadow-lg bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20`}>
              {getRiskIcon(result.riskLevel)}
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight mb-2">Assessment: {result.riskLevel}</h2>
              <p className="opacity-90 font-medium text-lg leading-relaxed max-w-lg">{result.reasoning}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center md:items-end">
            <div className="text-6xl font-black tracking-tighter tabular-nums leading-none">
              {result.riskScore}
              <span className="text-2xl opacity-50 font-medium ml-1">/100</span>
            </div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] opacity-75 mt-2">Risk Score</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Biometrics */}
        <div className="glass-card p-8 rounded-[2rem] shadow-xl dark:shadow-none hover:translate-y-[-4px] transition-transform duration-300">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-2xl">
               <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl text-gray-900 dark:text-white">Biometric Match</h3>
          </div>
          
          <div className="flex items-center justify-center py-4">
            <div className="relative w-48 h-48 group">
               {/* Outer pulsing ring */}
               <div className="absolute inset-0 rounded-full border-4 border-brand-500/10 animate-pulse"></div>
               
              <svg className="w-full h-full rotate-[-90deg] drop-shadow-2xl" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={result.riskLevel === RiskLevel.HIGH ? '#fee2e2' : '#ecfccb'} 
                  strokeOpacity="0.1"
                  strokeWidth="1.5"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={result.faceMatchScore > 80 ? "#10b981" : result.faceMatchScore > 50 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="2"
                  strokeDasharray={`${result.faceMatchScore}, 100`}
                  strokeLinecap="round"
                  className="animate-[spin_1.5s_ease-out_reverse]"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{result.faceMatchScore}%</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-2">Confidence</span>
              </div>
            </div>
          </div>
        </div>

        {/* Extracted Data */}
        <div className="glass-card p-8 rounded-[2rem] shadow-xl dark:shadow-none hover:translate-y-[-4px] transition-transform duration-300">
          <div className="flex items-center gap-4 mb-8">
             <div className="p-3 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-2xl">
               <FileText className="w-6 h-6" />
             </div>
            <h3 className="font-bold text-xl text-gray-900 dark:text-white">Extracted Data</h3>
          </div>
          <div className="space-y-5">
            {[
              { label: "Document Type", value: result.extractedData.documentType, icon: <CreditCard className="w-4 h-4" /> },
              { label: "Full Name", value: result.extractedData.fullName },
              { label: "Document No.", value: result.extractedData.documentNumber },
              { label: "Date of Birth", value: result.extractedData.dateOfBirth },
              { label: "Issuing Country", value: result.extractedData.issuingCountry },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center border-b border-gray-100/50 dark:border-gray-700/50 pb-4 last:border-0 last:pb-0 group">
                <span className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-3 font-medium">
                   <span className="text-gray-300 dark:text-gray-600">{item.icon}</span> {item.label}
                </span>
                <span className="font-bold text-gray-900 dark:text-gray-200 text-right group-hover:text-brand-600 transition-colors">{item.value || "N/A"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fraud Checks */}
      <div className="glass-card p-8 rounded-[2rem] shadow-xl dark:shadow-none">
        <div className="flex items-center gap-4 mb-8">
           <div className="p-3 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-2xl">
             <Activity className="w-6 h-6" />
           </div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Forensic Analysis</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {result.fraudChecks.map((check, idx) => (
            <div key={idx} className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg ${
              check.passed 
              ? 'bg-gray-50/80 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700 hover:border-emerald-200' 
              : 'bg-red-50/80 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 hover:border-red-300'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">{check.check}</span>
                {check.passed ? (
                  <span className="text-[10px] px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-full font-black uppercase tracking-wider">PASS</span>
                ) : (
                  <span className="text-[10px] px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-full font-black uppercase tracking-wider">FAIL</span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">{check.details}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={onReset}
          className="px-12 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl hover:scale-105 active:scale-95 transition-all font-bold shadow-2xl hover:shadow-brand-500/20 flex items-center gap-3"
        >
          <RotateCcw className="w-5 h-5" />
          Process New Identity
        </button>
      </div>
    </div>
  );
};

export default ResultsView;