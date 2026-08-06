import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, QrCode, CheckCircle2, AlertCircle, RefreshCw, Volume2, VolumeX, Printer, Check, Clock, PackageCheck, Truck, Search, ArrowRight, X, Sparkles, Box, User, MapPin, CreditCard, ShieldCheck } from 'lucide-react';
import { Order } from '../types';

interface ScanOrderModuleProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: 'Completed' | 'Ongoing' | 'Cancelled') => void;
  onPrintReceipt: (order: Order) => void;
  onClose?: () => void;
}

interface ScanHistoryItem {
  orderId: string;
  customerName: string;
  amount: number;
  timestamp: string;
  previousStatus: string;
  newStatus: string;
}

export const ScanOrderModule: React.FC<ScanOrderModuleProps> = ({
  orders,
  onUpdateOrderStatus,
  onPrintReceipt,
  onClose,
}) => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Play audio beep synthesized via Web Audio API
  const playScanBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // AudioContext not supported or restricted by browser policy
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera access is not supported by your browser environment. You can use manual scan or demo barcode buttons.");
        setIsCameraActive(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.warn("Camera start failed:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Permission denied') || errMsg.includes('NotAllowedError')) {
        setCameraError("Camera permission was denied. Please allow camera access in browser permissions or use manual lookup below.");
      } else if (errMsg.includes('NotFoundError') || errMsg.includes('DevicesNotFoundError')) {
        setCameraError("No video camera detected on this device. Use manual lookup or sample order scanner below.");
      } else {
        setCameraError(`Camera connection error (${errMsg}). You can enter Order ID manually or select a sample code.`);
      }
      setIsCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [facingMode]);

  // Barcode / QR Code Frame Detection Loop
  useEffect(() => {
    let active = true;

    const detectFrame = async () => {
      if (!active || !isCameraActive || !videoRef.current || !isScanning) {
        if (active && isCameraActive) {
          animFrameRef.current = requestAnimationFrame(detectFrame);
        }
        return;
      }

      // If browser supports native BarcodeDetector API
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({
            formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a']
          });

          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const scannedRaw = barcodes[0].rawValue;
              handleCodeFound(scannedRaw);
            }
          }
        } catch {
          // Native detector error, fallback to video loop
        }
      }

      if (active && isCameraActive) {
        animFrameRef.current = requestAnimationFrame(detectFrame);
      }
    };

    if (isCameraActive) {
      animFrameRef.current = requestAnimationFrame(detectFrame);
    }

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isCameraActive, isScanning, orders]);

  // Lookup Order Code
  const handleCodeFound = (code: string) => {
    const cleanedCode = code.trim().replace(/^#/, '');
    if (cleanedCode === lastScannedCode && scannedOrder) {
      return; // prevent duplicate spamming
    }

    // Try matching order ID directly or numeric matching
    const matched = orders.find(o => 
      o.id.toLowerCase() === cleanedCode.toLowerCase() ||
      o.id.toLowerCase() === `ord-${cleanedCode.toLowerCase()}` ||
      cleanedCode.toLowerCase().includes(o.id.toLowerCase()) ||
      o.customerName.toLowerCase().includes(cleanedCode.toLowerCase())
    );

    if (matched) {
      playScanBeep();
      setScannedOrder(matched);
      setLastScannedCode(cleanedCode);
      setIsScanning(false);
    }
  };

  // Manual input submission
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeFound(manualCode);
  };

  // Perform Warehouse Action (e.g. Fulfill, Prepare, Cancel)
  const handlePerformAction = (newStatus: 'Completed' | 'Ongoing' | 'Cancelled') => {
    if (!scannedOrder) return;

    setIsProcessingAction(true);
    const prevStatus = scannedOrder.status;

    // Update in parent state
    onUpdateOrderStatus(scannedOrder.id, newStatus);

    // Update local scanned order instance
    const updated = { ...scannedOrder, status: newStatus };
    setScannedOrder(updated);

    // Add to session log
    const historyItem: ScanHistoryItem = {
      orderId: scannedOrder.id,
      customerName: scannedOrder.customerName,
      amount: scannedOrder.amount,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      previousStatus: prevStatus,
      newStatus: newStatus
    };

    setScanHistory(prev => [historyItem, ...prev.slice(0, 9)]);

    setTimeout(() => {
      setIsProcessingAction(false);
    }, 400);
  };

  return (
    <div className="bg-[#0c1624] border border-brand-border/80 rounded-2xl p-5 md:p-6 shadow-2xl space-y-6 fade-in text-gray-200">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-border/60 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange shadow-md shrink-0">
            <Camera className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wider">Warehouse Order Scanner</h3>
              <span className="px-2 py-0.5 bg-brand-orange/15 border border-brand-orange/30 text-brand-orange font-mono text-[9px] font-black uppercase rounded tracking-widest">
                Camera Live AI
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">Point device camera at receipt QR code / barcode for instant order lookup and status processing</p>
          </div>
        </div>

        {/* Controls: Sound toggle, camera switch, close */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              soundEnabled 
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25' 
                : 'bg-brand-dark/60 border-brand-border text-gray-400 hover:text-white'
            }`}
            title={soundEnabled ? "Audio Beep Active" : "Audio Muted"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline text-[10px] uppercase font-black">{soundEnabled ? 'Beep On' : 'Muted'}</span>
          </button>

          <button
            onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
            className="p-2 bg-brand-dark/80 hover:bg-brand-card border border-brand-border hover:border-brand-orange/40 text-gray-300 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
            title="Switch Front/Back Camera"
          >
            <RefreshCw className="w-4 h-4 text-brand-orange" />
            <span className="hidden md:inline text-[10px] uppercase font-black">Flip Cam</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-brand-dark/80 hover:bg-red-500/20 border border-brand-border hover:border-red-500/40 text-gray-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
              title="Close Scanner"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* MAIN MODULE CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CAMERA FEED / SCANNER FRAME (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          {/* CAMERA FEED CONTAINER */}
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border-2 border-brand-border/80 shadow-2xl flex items-center justify-center group">
            
            {/* Live Video Element */}
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
              playsInline
              muted
            />

            {/* Hidden Canvas for Frame Processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* SCANNING OVERLAY GRAPHICS (Shown when camera active) */}
            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
                
                {/* Top Overlay Banner */}
                <div className="w-full flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-black/60 backdrop-blur-xs px-3 py-1.5 rounded-md border border-emerald-500/30">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="font-bold">Scanner Active</span>
                  </div>
                  <span className="text-gray-400">Target Area Below</span>
                </div>

                {/* Center Crosshair Scan Frame */}
                <div className="relative w-56 h-56 md:w-64 md:h-64 border-2 border-dashed border-brand-orange/60 rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(249,115,22,0.15)]">
                  
                  {/* Four Corner Brackets */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-brand-orange rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-brand-orange rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-brand-orange rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-brand-orange rounded-br-lg"></div>

                  {/* Animated Red/Orange Laser Beam Line */}
                  {isScanning && (
                    <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-brand-orange to-transparent shadow-[0_0_15px_#f97316] animate-pulse top-0 animate-[bounce_2s_infinite]"></div>
                  )}

                  <QrCode className="w-12 h-12 text-brand-orange/30 animate-pulse" />
                </div>

                {/* Bottom Status Prompt */}
                <div className="bg-black/80 backdrop-blur-xs px-4 py-1.5 rounded-full border border-brand-border text-[11px] font-bold text-gray-300">
                  Align receipt QR code inside crosshair box
                </div>
              </div>
            )}

            {/* FALLBACK CAMERA DISABLED / ERROR DISPLAY */}
            {!isCameraActive && (
              <div className="p-8 text-center space-y-3 max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-brand-dark border border-brand-border flex items-center justify-center text-gray-500 mx-auto shadow-inner">
                  <CameraOff className="w-7 h-7 text-gray-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Camera Feed Offline</h4>
                  <p className="text-xs text-gray-400 mt-1">{cameraError || "Camera is turned off or not available in this window."}</p>
                </div>
                <button
                  onClick={() => {
                    setIsCameraActive(true);
                    startCamera();
                  }}
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md inline-flex items-center space-x-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Live Camera Stream</span>
                </button>
              </div>
            )}
          </div>

          {/* MANUAL LOOKUP BAR & DEMO SIMULATOR BUTTONS */}
          <div className="bg-brand-dark/60 border border-brand-border/60 rounded-xl p-4 space-y-3 shadow-md">
            
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Type Order ID (e.g. ORD-001248 or 1248)..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full bg-[#0c1624] border border-brand-border text-xs px-9 py-2.5 rounded-lg outline-none text-white focus:border-brand-orange transition-all uppercase placeholder:normal-case font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs rounded-lg uppercase tracking-wider transition-all cursor-pointer shrink-0"
              >
                Lookup
              </button>
            </form>

            {/* Quick Test Barcode Buttons for Demo Testing */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-orange" />
                  <span>Instant Test Scanner Simulators</span>
                </span>
                <span className="text-[9px] text-gray-500">Click any code below to trigger auto-scan</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {orders.slice(0, 5).map(o => (
                  <button
                    key={o.id}
                    onClick={() => handleCodeFound(o.id)}
                    className="px-2.5 py-1.5 bg-[#0c1624] hover:bg-brand-orange/20 border border-brand-border/80 hover:border-brand-orange/50 text-gray-300 hover:text-white rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center space-x-1.5 group"
                  >
                    <QrCode className="w-3 h-3 text-brand-orange group-hover:scale-110 transition-transform" />
                    <span>#{o.id}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: SCANNED ORDER DETAILS & WAREHOUSE ACTIONS (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          
          {scannedOrder ? (
            /* ACTIVE SCANNED ORDER CARD */
            <div className="bg-brand-dark/80 border-2 border-brand-orange/50 rounded-xl p-5 space-y-4 shadow-2xl animate-in fade-in slide-in-from-right-3 duration-200">
              
              {/* Header Box */}
              <div className="flex justify-between items-start border-b border-brand-border/60 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-black text-brand-orange uppercase">#{scannedOrder.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                      scannedOrder.status === 'Completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                      scannedOrder.status === 'Ongoing' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                      'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                      {scannedOrder.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Scanned Date: {scannedOrder.date || 'Today'} • {scannedOrder.time || '09:30 AM'}</p>
                </div>

                <button
                  onClick={() => {
                    setScannedOrder(null);
                    setLastScannedCode(null);
                    setIsScanning(true);
                  }}
                  className="text-xs text-gray-400 hover:text-white font-bold bg-brand-card/80 px-2 py-1 rounded border border-brand-border hover:border-gray-500 transition-all cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>

              {/* Customer & Address Details */}
              <div className="bg-[#0c1624] p-3 rounded-lg border border-brand-border/40 space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-white font-bold">
                  <User className="w-3.5 h-3.5 text-brand-orange" />
                  <span>{scannedOrder.customerName}</span>
                </div>
                <div className="flex items-start space-x-2 text-gray-400 text-[11px] font-medium">
                  <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                  <span>{scannedOrder.address || "Dhanmondi, Road 8A, Dhaka"}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-brand-border/30 text-[10px] text-gray-400">
                  <span className="flex items-center space-x-1">
                    <CreditCard className="w-3 h-3 text-brand-orange" />
                    <span>Payment: {scannedOrder.paymentMethod || "bKash Digital"}</span>
                  </span>
                  <span className="font-mono text-white font-bold text-xs">৳ {scannedOrder.amount.toLocaleString()}</span>
                </div>
              </div>

              {/* WAREHOUSE FAST ACTION BUTTONS */}
              <div className="space-y-2.5 pt-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                  Quick Warehouse Fulfillment Actions
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePerformAction('Ongoing')}
                    disabled={isProcessingAction || scannedOrder.status === 'Ongoing'}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      scannedOrder.status === 'Ongoing'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 opacity-80 cursor-default'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                    }`}
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Mark Preparing</span>
                  </button>

                  <button
                    onClick={() => handlePerformAction('Completed')}
                    disabled={isProcessingAction || scannedOrder.status === 'Completed'}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      scannedOrder.status === 'Completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 opacity-80 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Fulfill Complete</span>
                  </button>
                </div>

                <button
                  onClick={() => onPrintReceipt(scannedOrder)}
                  className="w-full py-2.5 bg-brand-dark hover:bg-brand-card border border-brand-border hover:border-brand-orange text-gray-200 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow"
                >
                  <Printer className="w-4 h-4 text-brand-orange" />
                  <span>Print Order Invoice Receipt</span>
                </button>
              </div>

            </div>
          ) : (
            /* EMPTY SCANNED STATE */
            <div className="bg-brand-dark/40 border border-brand-border/60 rounded-xl p-8 text-center space-y-3 flex flex-col items-center justify-center min-h-[220px]">
              <QrCode className="w-12 h-12 text-brand-orange/40 animate-pulse" />
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Awaiting Barcode Scan</h4>
                <p className="text-[11px] text-gray-400 mt-1">Point device camera at receipt code or click any test simulator code on the left.</p>
              </div>
            </div>
          )}

          {/* SESSION SCAN HISTORY LOG */}
          <div className="bg-brand-dark/60 border border-brand-border/60 rounded-xl p-4 space-y-3 flex-1">
            <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
              <span className="text-[10px] font-black text-white uppercase tracking-wider flex items-center space-x-1">
                <Clock className="w-3 h-3 text-brand-orange" />
                <span>Warehouse Session Scan Log</span>
              </span>
              <span className="text-[9px] font-mono text-gray-400 font-bold bg-brand-card px-2 py-0.5 rounded border border-brand-border">
                {scanHistory.length} Processed
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {scanHistory.length === 0 ? (
                <p className="text-center py-6 text-gray-500 text-[11px] font-medium">No order barcode scans registered in this session yet.</p>
              ) : (
                scanHistory.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-[#0c1624] rounded-lg border border-brand-border/30 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-white text-[11px]">#{item.orderId}</span>
                        <span className="text-[9px] font-semibold text-gray-400">{item.customerName}</span>
                      </div>
                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">
                        Status: <span className="text-gray-300">{item.previousStatus}</span> → <span className="text-emerald-400 font-bold">{item.newStatus}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="block text-[9px] font-mono text-gray-400">{item.timestamp}</span>
                      <span className="text-[10px] font-mono text-brand-orange font-bold">৳ {item.amount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
