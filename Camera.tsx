import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera as CameraIcon, RotateCcw, Loader2 } from 'lucide-react';

interface CameraProps {
  onCapture: (base64Image: string) => void;
  label: string;
  overlayText?: string;
}

const Camera: React.FC<CameraProps> = ({ onCapture, label, overlayText }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [isVideoReady, setIsVideoReady] = useState(false);

  const startCamera = async () => {
    setError('');
    setIsVideoReady(false);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error(err);
      setError('Unable to access camera. Check permissions or HTTPS.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsVideoReady(false);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Re-attach stream if ref or stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleVideoLoaded = () => {
    setIsVideoReady(true);
  };

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current && isVideoReady) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.85);
        onCapture(imageData);
      }
    }
  }, [onCapture, isVideoReady]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-2xl mb-6 group ring-1 ring-gray-900/5 dark:ring-white/10 flex items-center justify-center">
        
        {/* Loading Spinner */}
        {!isVideoReady && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 z-10">
            <Loader2 className="w-10 h-10 animate-spin mb-2" />
            <span className="text-sm font-medium">Initializing Camera...</span>
          </div>
        )}

        {!error ? (
           <video 
           ref={videoRef} 
           autoPlay 
           playsInline 
           muted
           onLoadedMetadata={handleVideoLoaded}
           className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`} 
         />
        ) : (
          <div className="flex items-center justify-center h-full text-white p-4 text-center bg-gray-800 w-full">
            <div className="max-w-xs">
              <p className="text-red-400 font-bold mb-1">Camera Error</p>
              <p className="text-sm text-gray-400">{error}</p>
            </div>
          </div>
        )}
       
        {isVideoReady && !error && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between py-6">
             {/* Text Overlay */}
             {overlayText && (
                <div className="bg-black/60 backdrop-blur-md text-white px-6 py-2 rounded-full text-sm font-bold animate-in slide-in-from-top-4 border border-white/20 shadow-lg">
                    {overlayText}
                </div>
             )}
             
             {/* Scanning Animation */}
             <div className="absolute inset-0 w-full h-full overflow-hidden opacity-30">
                <div className="w-full h-1 bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)] absolute animate-[scan_2s_ease-in-out_infinite]"></div>
             </div>
             <style>{`
               @keyframes scan {
                 0% { top: 0%; opacity: 0; }
                 10% { opacity: 1; }
                 90% { opacity: 1; }
                 100% { top: 100%; opacity: 0; }
               }
             `}</style>

             {/* Face guide overlay */}
            <div className="w-48 h-64 border-2 border-dashed border-white/50 rounded-[45%] shadow-[0_0_100px_rgba(0,0,0,0.5)_inset] z-10 relative">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-1 bg-white/30 rounded-full"></div>
               <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-32 h-1 bg-white/30 rounded-full"></div>
            </div>
            
            <div className="text-center text-white/80 text-xs font-medium bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm z-10">
                Position face within frame
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {error ? (
             <button 
             onClick={startCamera}
             className="flex items-center px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors font-medium"
           >
             <RotateCcw className="w-4 h-4 mr-2" /> Retry Camera
           </button>
        ) : (
          <button 
            onClick={capture}
            disabled={!isVideoReady}
            className={`flex items-center px-8 py-3.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg shadow-brand-500/30 transition-all ${
              !isVideoReady ? 'opacity-50 cursor-not-allowed' : 'hover:bg-brand-700 hover:scale-105 active:scale-95'
            }`}
          >
            {!isVideoReady ? (
               <>
                 <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                 Starting...
               </>
            ) : (
              <>
                 <CameraIcon className="w-5 h-5 mr-2" />
                 Capture {label}
              </>
            )}
          </button>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Camera;