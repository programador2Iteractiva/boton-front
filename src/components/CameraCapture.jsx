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
    let isMounted = true; // Controla si el componente sigue en pantalla

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (isMounted) setError('Este navegador no soporta acceso a cámara.');
          return;
        }

        if (!window.isSecureContext) {
          if (isMounted) setError('La cámara requiere HTTPS (o localhost). Abre esta app en una URL segura.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        // Si el componente se desmontó mientras el usuario daba permisos, detenemos la cámara
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        currentStream = stream;

        if (videoRef.current) {
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.srcObject = stream;
          
          // Atrapar el AbortError que ocurre si el componente se desmonta rápido
          try {
            await videoRef.current.play();
          } catch (playError) {
            if (playError.name !== 'AbortError') {
              console.error('Error inesperado al reproducir video:', playError);
            }
          }
        }
      } catch (err) {
        if (!isMounted) return; // No actualizar estado si ya se desmontó
        
        console.error("Error acceso cámara:", err);
        if (err?.name === 'NotAllowedError') {
          setError('Permiso de cámara denegado. Habilítalo en la configuración de Chrome.');
          return;
        }
        if (err?.name === 'NotFoundError') {
          setError('No se encontró una cámara disponible en este dispositivo.');
          return;
        }
        if (err?.name === 'NotReadableError') {
          setError('La cámara está siendo usada por otra app. Cierra la otra app e intenta de nuevo.');
          return;
        }
        setError('No se pudo acceder a la cámara. Revisa permisos y HTTPS.');
      }
    };

    startCamera();

    // Limpieza al desmontar
    return () => {
      isMounted = false;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
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
    if (!ctx) return;
    
    // Paso A: Dibujar el video con efecto espejo
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.restore();

    // Paso B: Generar la imagen unificada sin marco
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `race_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);
      setPhoto({ file, previewUrl });
    }, 'image/jpeg', 0.90);
  };

  const retake = () => {
    if (photo?.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
    }
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
        if (!blob) return;
        const file = new File([blob], "debug_photo.jpg", { type: "image/jpeg" });
        setPhoto({ file, previewUrl: URL.createObjectURL(blob) });
    });
  };

  useEffect(() => {
    return () => {
      if (photo?.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    };
  }, [photo]);

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
    <div className="w-full h-full relative flex flex-col items-center justify-center bg-slate-900 p-2 overflow-hidden">
      
      {/* 🛠️ DEBUGGER */}
      {DEBUG_MODE && (
        <div className="absolute top-2 left-2 z-40 bg-black/80 p-2 rounded border border-yellow-500 text-xs text-yellow-500 flex flex-col gap-2">
            <strong className="text-white border-b border-gray-600 pb-1">🛠️ DEBUG</strong>
            <button onClick={debugSimulatePhoto} className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">📸 Simular</button>
            <button onClick={() => setError("Error Simulado")} className="bg-red-900 hover:bg-red-800 px-2 py-1 rounded text-white">⚠️ Error</button>
            <button onClick={retake} className="bg-blue-900 hover:bg-blue-800 px-2 py-1 rounded text-white">🔄 Reset</button>
            <div className="text-[10px] text-gray-400">Estado: {photo ? 'Listo' : 'Espera'}</div>
        </div>
      )}

      {/* CABECERA */}
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

      {/* VISOR */}
      <div className="relative w-full max-w-2xl aspect-video bg-black rounded-xl overflow-hidden shadow-lg border-2 border-slate-700">
        
        {!photo && (
          <>
            {/* Video en vivo normal */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
            />
            {/* Guía visual opcional (óvalo) */}
            <div className="absolute inset-0 border-2 border-white/20 m-4 rounded-full opacity-30 pointer-events-none" />
          </>
        )}

        {photo && (
          <img
            src={photo.previewUrl}
            alt="Preview"
            // Reincorporamos el transform para que la preview coincida con la cámara original
            className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
          />
        )}

        {flash && <div className="absolute inset-0 bg-white z-20 transition-opacity duration-150" />}
        
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