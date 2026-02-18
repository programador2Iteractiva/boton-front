import { useEffect, useRef, useState } from 'react';

const CameraCapture = ({ onCapture, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // --- ESTADOS ---
  const [photo, setPhoto] = useState(null);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState(null);
  
  // 🛠️ MODO DEBUG
  const DEBUG_MODE = true; 

  // 1. INICIAR CÁMARA
  useEffect(() => {
    let currentStream = null;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        currentStream = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error acceso cámara:", err);
        setError("No se pudo acceder a la cámara. Revisa permisos o HTTPS.");
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 2. TOMAR FOTO
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    
    // Espejo
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `race_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);
      setPhoto({ file, previewUrl });
    }, 'image/jpeg', 0.90);
  };

  const retake = () => {
    setPhoto(null);
    setError(null);
  };

  const confirm = () => {
    if (photo) onCapture(photo.file);
  };

  const debugSimulatePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ccc';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = 'red';
    ctx.font = '30px Arial';
    ctx.fillText('FOTO DE PRUEBA', 200, 240);
    canvas.toBlob(blob => {
        const file = new File([blob], "debug_photo.jpg", { type: "image/jpeg" });
        setPhoto({ file, previewUrl: URL.createObjectURL(blob) });
    });
  };

  // --- RENDERIZADO ---

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-900 text-white">
        <div className="bg-red-900/80 p-6 rounded-xl text-center border border-red-500">
          <p className="text-xl mb-4">🚫 {error}</p>
          <button onClick={onCancel} className="px-6 py-2 bg-white text-red-900 font-bold rounded-lg hover:bg-gray-200">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    // ⚠️ CAMBIO PRINCIPAL AQUÍ:
    // 1. Quitamos 'fixed inset-0 z-50'
    // 2. Ponemos 'w-full h-full relative' para que llene el espacio que le deja tu status-bar
    <div className="w-full h-full relative flex flex-col items-center justify-center bg-slate-900 p-2 overflow-hidden">
      
      {/* 🛠️ DEBUGGER (Ahora posicionado relativo al componente, no a la pantalla) */}
      {DEBUG_MODE && (
        <div className="absolute top-2 left-2 z-40 bg-black/80 p-2 rounded border border-yellow-500 text-xs text-yellow-500 flex flex-col gap-2">
            <strong className="text-white border-b border-gray-600 pb-1">🛠️ DEBUG</strong>
            <button onClick={debugSimulatePhoto} className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">📸 Simular</button>
            <button onClick={() => setError("Error Simulado")} className="bg-red-900 hover:bg-red-800 px-2 py-1 rounded text-white">⚠️ Error</button>
            <button onClick={retake} className="bg-blue-900 hover:bg-blue-800 px-2 py-1 rounded text-white">🔄 Reset</button>
            <div className="text-[10px] text-gray-400">Estado: {photo ? 'Listo' : 'Espera'}</div>
        </div>
      )}

      {/* CABECERA (Más compacta para que quepa bien debajo de tu status bar) */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-2">
        <h2 className="text-white text-lg font-bold tracking-wider">
          {photo ? '¿CONFIRMAR?' : 'REGISTRO'}
        </h2>
        {!photo && (
          <button 
            onClick={onCancel} 
            className="text-gray-400 hover:text-white font-bold px-3 py-1 border border-gray-600 rounded hover:border-white text-sm"
          >
            CANCELAR
          </button>
        )}
      </div>

      {/* VISOR (Usamos flex-1 para que ocupe el máximo espacio posible verticalmente) */}
      <div className="relative w-full max-w-2xl aspect-video bg-black rounded-xl overflow-hidden shadow-lg border-2 border-slate-700">
        
        {!photo && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
        )}

        {photo && (
          <img
            src={photo.previewUrl}
            alt="Preview"
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
        )}

        {flash && <div className="absolute inset-0 bg-white z-20 transition-opacity duration-150" />}
        
        {!photo && (
          <div className="absolute inset-0 border-2 border-white/20 m-4 rounded-full opacity-30 pointer-events-none" />
        )}
      </div>

      {/* CONTROLES */}
      <div className="w-full max-w-2xl mt-4 flex items-center justify-center gap-4 h-20">
        
        {!photo ? (
          <button
            onClick={takePhoto}
            className="group relative flex items-center justify-center transition-transform active:scale-95"
          >
            <div className="w-16 h-16 rounded-full border-4 border-white opacity-80" />
            <div className="absolute w-12 h-12 bg-white rounded-full group-hover:bg-yellow-400 transition-colors" />
          </button>
        ) : (
          <>
            <button
              onClick={retake}
              className="px-6 py-3 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-600 border border-slate-500"
            >
              🔄 REPETIR
            </button>
            
            <button
              onClick={confirm}
              className="px-8 py-3 rounded-xl bg-green-600 text-white font-bold shadow-lg hover:bg-green-500 border border-green-400"
            >
              CONFIRMAR ✅
            </button>
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;