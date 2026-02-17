import { useState, useEffect, useRef } from 'react';
import { useWebsocket } from '../context/useWebsocket';

const ENABLE_LOCAL_COUNTDOWN_FALLBACK = import.meta.env.DEV;
const ENABLE_DEBUG_NEXT_BUTTON = import.meta.env.DEV;
const STEP_SEQUENCE = ['loop', 'register', 'terms', 'photo', 'waiting', 'countdown', 'racing'];

function Tablet({ lane = 'LEFT' }) {
  const { isConnected, connectionState } = useWebsocket();
  const [step, setStep] = useState('loop');
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    name: '',
    cedula: '',
    email: '',
    termsAccepted: false,
    photoUrl: '',
    combo: ''
  });

  // Datos de la carrera
  const [countdown, setCountdown] = useState(null);
  const countdownIntervalRef = useRef(null);

  const clearCountdownInterval = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const startCountdown = (seconds) => {
    clearCountdownInterval();
    setStep('countdown');
    setCountdown(seconds);

    let count = seconds;
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearCountdownInterval();
        setCountdown(null);
        setStep('racing');
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      clearCountdownInterval();
    };
  }, []);

  // Handlers
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    console.log('📋 Datos del formulario:', formData);
    setStep('terms');
  };

  const handleTermsAccept = () => {
    if (!formData.termsAccepted) {
      alert('Debes aceptar los términos y condiciones');
      return;
    }
    setStep('photo');
  };

  const handlePhotoUpload = async () => {
    // Simulación de subida de foto
    const fakePhotoUrl = '/uploads/img_' + Date.now() + '.jpg';
    setFormData(prev => ({ ...prev, photoUrl: fakePhotoUrl }));
    console.log('📸 Foto subida (simulada):', fakePhotoUrl);
    handleFinishRegistration(fakePhotoUrl);
  };

  const handleFinishRegistration = (photoUrl = formData.photoUrl) => {
    // Emitir REGISTER_PLAYER con todos los datos
    const playerData = {
      ...formData,
      photoUrl,
      lane,
      timestamp: new Date().toISOString()
    };
    
    console.log('📋 Registro local para flujo inicial:', playerData);
    setStep('waiting');
  };

  const handleStartRace = () => {
    console.log('🏁 Solicitando inicio de carrera');
    if (ENABLE_LOCAL_COUNTDOWN_FALLBACK) {
      startCountdown(3);
    }
  };

  const handleDebugNextStep = () => {
    clearCountdownInterval();
    const currentIndex = STEP_SEQUENCE.indexOf(step);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % STEP_SEQUENCE.length : 0;
    const nextStep = STEP_SEQUENCE[nextIndex];

    if (nextStep !== 'countdown') {
      setCountdown(null);
    }

    setStep(nextStep);
  };

  // Renderizar vistas
  const renderView = () => {
    switch (step) {
      case 'loop':
        return (
          <div className="view-container text-center">
            <h1 className="text-4xl font-bold mb-6">Bienvenido</h1>
            <p className="text-xl mb-6">Tablet {lane} lista para registrar jugador</p>
            <button onClick={() => setStep('register')} className="btn-primary">
              Comenzar Registro
            </button>
          </div>
        );

      case 'register':
        return (
          <div className="view-container">
            <h1 className="text-3xl font-bold mb-6">Registro de Jugador</h1>
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block mb-2">Nombre:</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  className="w-full p-3 border rounded text-black"
                />
              </div>
              <div>
                <label className="block mb-2">Cédula:</label>
                <input
                  type="text"
                  name="cedula"
                  value={formData.cedula}
                  onChange={handleFormChange}
                  required
                  className="w-full p-3 border rounded text-black"
                />
              </div>
              <div>
                <label className="block mb-2">Email:</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                  className="w-full p-3 border rounded text-black"
                />
              </div>
              <button type="submit" className="btn-primary">
                Continuar
              </button>
            </form>
          </div>
        );

      case 'terms':
        return (
          <div className="view-container">
            <h1 className="text-3xl font-bold mb-6">Términos y Condiciones</h1>
            <div className="bg-gray-800 p-4 rounded mb-4 max-h-60 overflow-y-auto">
              <p>Texto legal de términos y condiciones...</p>
              <p>Lorem ipsum dolor sit amet...</p>
            </div>
            <label className="flex items-center mb-4">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleFormChange}
                className="mr-2"
              />
              <span>Acepto los términos y condiciones</span>
            </label>
            <button onClick={handleTermsAccept} className="btn-primary">
              Continuar
            </button>
          </div>
        );

      case 'photo':
        return (
          <div className="view-container">
            <h1 className="text-3xl font-bold mb-6">Toma tu Foto</h1>
            <div className="bg-gray-700 w-full h-64 mb-6 flex items-center justify-center rounded">
              [CÁMARA FRONTAL]
            </div>
            <p className="mb-4 text-sm">
              (En producción: capturar con cámara real y POST /api/upload-photo)
            </p>
            <button onClick={handlePhotoUpload} className="btn-primary">
              Capturar Foto
            </button>
          </div>
        );

      case 'waiting':
        return (
          <div className="view-container">
            <h1 className="text-5xl font-bold mb-8">Espera</h1>
            <p className="text-2xl mb-8">Registro completado. Presiona para iniciar carrera.</p>
            <button 
              onClick={handleStartRace}
              className="bg-green-500 text-white text-4xl font-bold py-8 px-16 rounded-lg hover:bg-green-600"
            >
              ¡INICIAR CARRERA!
            </button>
          </div>
        );

      case 'countdown':
        return (
          <div className="view-container">
            <div className="text-9xl font-bold">
              {countdown > 0 ? countdown : 'GO!'}
            </div>
          </div>
        );

      case 'racing':
        return (
          <div className="view-container">
            <h1 className="text-5xl font-bold mb-8">¡CORRE A LA META!</h1>
            <p className="text-xl">La carrera está en curso...</p>
            <p className="text-sm mt-4">(Esperando evento SHOW_RESULT del servidor)</p>
          </div>
        );

      default:
        return <div>Vista no encontrada</div>;
    }
  };

  return (
    <div className="tablet-container">
      <div className="status-bar">
        <span>TABLET {lane}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs">WS: {isConnected ? 'CONECTADO' : connectionState.toUpperCase()}</span>
          <span className="text-xs">Paso: {step.toUpperCase()}</span>
          {ENABLE_DEBUG_NEXT_BUTTON && (
            <button
              type="button"
              onClick={handleDebugNextStep}
              className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded"
            >
              DEBUG: SIGUIENTE
            </button>
          )}
        </div>
      </div>
      {renderView()}
    </div>
  );
}

export default Tablet;
