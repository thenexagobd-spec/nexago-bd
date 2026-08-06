import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface PosIframeProps {
  onBack?: () => void;
}

export default function PosIframe({ onBack }: PosIframeProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setTimeout(() => { frameRef.current?.contentWindow?.focus(); }, 500);
  }, []);

  return (
    <div style={{ position:'fixed',top:0,left:0,width:'100vw',height:'100vh',zIndex:9999,background:'#000' }}>
      {onBack && (
        <button onClick={onBack} style={{ position:'absolute',top:8,right:8,zIndex:10,background:'#e2136e',color:'#fff',border:'none',borderRadius:6,padding:'6px 12px',fontSize:12,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',gap:4 }}>
          <X size={14} /> Back to NexaGo BD
        </button>
      )}
      <iframe ref={frameRef} src="http://localhost:3009" title="Smart POS Plash" allow="fullscreen" style={{ width:'100%',height:'100%',border:'none' }} />
    </div>
  );
}
