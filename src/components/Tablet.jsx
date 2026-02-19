import { useState, useEffect, useRef } from 'react';
import { useWebsocket } from '../context/useWebsocket';
import { sendRegisterData } from '../services/registerService';
import CameraCapture from './CameraCapture';

const ENABLE_LOCAL_COUNTDOWN_FALLBACK = import.meta.env.DEV;
const ENABLE_DEBUG_NEXT_BUTTON = import.meta.env.DEV;
const STEP_SEQUENCE = ['loop', 'register', 'terms', 'photo', 'waiting', 'countdown', 'racing'];

function Tablet({ lane = 'LEFT' }) {
  // Determinar número de jugador según lane
  const currentPlayer = lane === 'LEFT' ? 1 : 2;
  
  const { isConnected, connectionState, subscribe } = useWebsocket();
  const [step, setStep] = useState('loop');
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    name: '',
    cedula: '',
    email: '',
    termsAccepted: false,
    photoFile: null,
    photoUrl: '',
    combo: ''
  });

  // Información del jugador recibida del servidor
  const [playerInfo, setPlayerInfo] = useState({
    player: null,
    name: '',
    photoUrl: '',
    registered: false
  });

  // Indicador de espera cuando este tablet se registró primero
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  // Datos de la carrera
  const [countdown, setCountdown] = useState(null);
  const countdownIntervalRef = useRef(null);
  const stepRef = useRef('loop');
  const countdownRef = useRef(null);

  const clearCountdownInterval = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // Escuchar eventos del servidor
  useEffect(() => {
    const handleServerMessage = (message) => {
      console.log('📨 Mensaje del servidor:', message);

      // Si es actualización de info del jugador
      if (message.type === 'update_player_info') {
        console.log(`🎯 Jugador ${message.player} actualizado`);

        // Si el mensaje es para nuestro jugador, guardar la información
        if (message.player === currentPlayer) {
          console.log(`✅ Actualizando info del jugador ${currentPlayer}:`, message);
          setPlayerInfo({
            player: message.player,
            name: message.name || formData.name,
            photoUrl: message.photoUrl,
            registered: true
          });
        }
      }

      // Si el servidor indica que debemos esperar al oponente
      if (message.type === 'waiting_for_opponent') {
        // Solo procesar si el mensaje explícitamente indica este jugador
        if (message.player === currentPlayer) {
          // Si ya estamos en conteo o en carrera, ignorar este evento (leer desde refs)
          if (stepRef.current === 'countdown' || stepRef.current === 'racing' || countdownRef.current) {
            console.log('⏳ Ignorando waiting_for_opponent: ya en conteo o carrera', { step: stepRef.current, countdown: countdownRef.current });
          } else {
            console.log('⏳ Recibido waiting_for_opponent para este jugador');
            setWaitingForOpponent(true);
            setStep('waiting');
            setPlayerInfo(prev => ({ ...prev, registered: true }));
          }
        } else {
          console.log('⏳ waiting_for_opponent ignorado (no para este jugador)', message);
        }
      }

      // Si el servidor indica iniciar el conteo para ambos
      if (message.type === 'start_countdown') {
        console.log('⏱️ Recibido start_countdown', message);
        setWaitingForOpponent(false);
        const seconds = message.seconds || 3;
        startCountdown(seconds);
      }
    };

    // Suscribirse a mensajes del socket (no re-suscribir por step/countdown para evitar perder eventos)
    const unsubscribe = subscribe(handleServerMessage);

    return unsubscribe;
  }, [currentPlayer, formData.name, subscribe]);

  // Mantener refs sincronizados con el estado actual para que el handler pueda leer valores actualizados
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    countdownRef.current = countdown;
  }, [countdown]);

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

  const handlePhotoCapture = async (photoFile) => {
    // Foto capturada por cámara
    console.log('📸 Foto capturada:', photoFile.name);
    setFormData(prev => ({ ...prev, photoFile }));
    await handleFinishRegistration(null, photoFile);
  };

  const handleFinishRegistration = async (photoUrl = formData.photoUrl, photoFile = formData.photoFile) => {
    // Emitir REGISTER_PLAYER con todos los datos
    const playerData = {
      ...formData,
      photoUrl,
      lane,
      timestamp: new Date().toISOString()
    };

    try {
      const registerResponse = await sendRegisterData({
        userData: {
          name: formData.name,
          email: formData.email,
          player: lane === 'LEFT' ? 1 : 2
        },
        termsAccepted: formData.termsAccepted,
        photoFile,
        lane: lane
      });

      console.log('✅ Respuesta /api/registro:', registerResponse);
      // Marcar localmente como registrado (el servidor enviará los eventos de socket)
      setPlayerInfo(prev => ({ ...prev, registered: true, photoUrl: photoUrl || prev.photoUrl, name: formData.name }));
    } catch (error) {
      console.error('❌ Error enviando /api/registro:', error);
      alert('No se pudo completar el registro. Intenta nuevamente.');
      return;
    }
    
    console.log('📋 Registro local para flujo inicial:', playerData);
    // Solo cambiar a 'waiting' si no se ha iniciado ya un conteo (usar refs si están disponibles)
    const currentStep = stepRef.current || step;
    const currentCountdown = countdownRef.current || countdown;
    if (currentStep === 'countdown' || currentStep === 'racing' || currentCountdown) {
      console.log('⚠️ Conteo ya iniciado, no cambiar a waiting', { step: currentStep, countdown: currentCountdown });
    } else {
      setStep('waiting');
    }
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
        return <CameraCapture onCapture={handlePhotoCapture} />;

      case 'waiting':
        return (
          <div className="view-container">
              <h1 className="text-5xl font-bold mb-8">Espera</h1>

              {/* Mostrar foto del jugador si está disponible */}
              {playerInfo.registered && playerInfo.photoUrl && (
                <div className="mb-8">
                  <img 
                    src={playerInfo.photoUrl} 
                    alt={`Foto de ${playerInfo.name}`}
                    className="w-64 h-64 object-cover rounded-lg border-4 border-yellow-400 mx-auto"
                  />
                  <p className="text-center mt-4 text-xl text-gray-300">
                    ✅ {playerInfo.name || 'Jugador'} registrado
                  </p>
                </div>
              )}

              {/* Mostrar siempre la pantalla de espera del oponente (no interactiva) */}
              <>
                <p className="text-2xl mb-8">Esperando al oponente...</p>
                <div className="loader w-32 h-32 mx-auto mb-4" />
              </>
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
