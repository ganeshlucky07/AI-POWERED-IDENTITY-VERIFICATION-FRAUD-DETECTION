import React, { useRef, useState } from 'react';
import { UploadCloud, AlertCircle, FileImage } from 'lucide-react';

interface FileUploadProps {
  onUpload: (base64Image: string) => void;
  label: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, label }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG).');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('File size too large. Max 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onUpload(reader.result as string);
    };
    reader.readAsDataURL(file);
    setError('');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div 
        className={`
          relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300 cursor-pointer group
          flex flex-col items-center justify-center text-center overflow-hidden
          ${isDragging 
            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/20 scale-[1.02]' 
            : 'border-gray-200 dark:border-gray-700 hover:border-brand-400 dark:hover:border-brand-500 bg-white/50 dark:bg-gray-800/30 hover:bg-white dark:hover:bg-gray-800'
          }
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        {/* Animated background on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <div className={`
          relative w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-300
          ${isDragging ? 'bg-brand-100 text-brand-600 scale-110' : 'bg-white dark:bg-gray-700 text-gray-400 group-hover:text-brand-500 group-hover:bg-brand-50 dark:group-hover:bg-gray-600 shadow-xl'}
        `}>
          <UploadCloud className="w-10 h-10" />
          {/* Ripple effect rings */}
          <div className="absolute inset-0 rounded-3xl border border-brand-500/30 scale-125 opacity-0 group-hover:scale-150 group-hover:opacity-100 transition-all duration-700"></div>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 relative z-10">Upload {label}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto text-sm relative z-10">
          Drag & drop your document here, or click to browse files
        </p>
        
        <div className="flex gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest relative z-10">
          <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">JPG</span>
          <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">PNG</span>
          <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">Max 5MB</span>
        </div>
        
        <input 
          type="file" 
          ref={inputRef}
          className="hidden" 
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-center p-4 text-sm text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30 animate-in fade-in slide-in-from-top-2 backdrop-blur-sm">
          <AlertCircle className="w-5 h-5 mr-3" />
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;