import { useState, useEffect, useRef } from 'react';
import { useWebsocket } from '../context/useWebsocket';

const ENABLE_DISPLAY_DEBUG = import.meta.env.DEV;
const DISPLAY_STATES = ['idle', 'registering', 'lobby', 'countdown', 'racing', 'result'];

function RaceTimer({ time }) {
  return <div className="text-8xl font-bold font-mono timer">{formatTime(time)}</div>;
}

function Display() {
  const { isConnected, connectionState, activeClients, subscribe } = useWebsocket();
  // Estados para carril izquierdo y derecho
  const [leftPlayer, setLeftPlayer] = useState({
    state: 'idle', // idle, lobby, countdown, racing, result
    name: '',
    photo: '',
    time: 0,
    winner: false,
    countdownValue: null
  });

  const [rightPlayer, setRightPlayer] = useState({
    state: 'idle',
    name: '',
    photo: '',
    time: 0,
    winner: false,
    countdownValue: null
  });

  const [raceStartTime, setRaceStartTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const countdownTimerRef = useRef(null);

  const resetDisplayState = () => {
    setLeftPlayer({
      state: 'idle',
      name: '',
      photo: '',
      time: 0,
      winner: false,
      countdownValue: null
    });
    setRightPlayer({
      state: 'idle',
      name: '',
      photo: '',
      time: 0,
      winner: false,
      countdownValue: null
    });
    setRaceStartTime(null);
    setCurrentTime(0);
  };

  // Escuchar eventos del servidor
  useEffect(() => {
    const handleServerMessage = (message) => {
      console.log('📨 Display recibió:', message);

      // Si es actualización de info del jugador
      if (message.type === 'update_player_info') {
        console.log(`🎯 Actualizando jugador ${message.player}:`, message);
        
        // Determinar si es jugador LEFT (1) o RIGHT (2)
        const lane = message.player === 1 ? 'LEFT' : 'RIGHT';
        const setter = message.player === 1 ? setLeftPlayer : setRightPlayer;
        
        setter(prev => ({
          ...prev,
          name: message.name || prev.name,
          photo: message.photoUrl || prev.photo,
          state: prev.state === 'idle' ? 'lobby' : prev.state
        }));
      }

      // Si el servidor inicia el conteo para la pantalla
      if (message.type === 'start_countdown') {
        console.log('⏱️ Display: start_countdown recibido', message);
        const seconds = message.seconds || 3;

        // Cancelar cualquier timer previo
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }

        // Poner ambos jugadores en estado countdown con valor inicial
        setLeftPlayer(prev => ({ ...prev, state: 'countdown', countdownValue: seconds }));
        setRightPlayer(prev => ({ ...prev, state: 'countdown', countdownValue: seconds }));

        // Iniciar temporizador que decrementa cada segundo
        let remaining = seconds;
        countdownTimerRef.current = setInterval(() => {
          remaining -= 1;
          setLeftPlayer(prev => ({ ...prev, countdownValue: remaining }));
          setRightPlayer(prev => ({ ...prev, countdownValue: remaining }));

          if (remaining <= 0) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
            // Pasar a racing y arrancar el cronómetro
            setLeftPlayer(prev => ({ ...prev, state: 'racing', countdownValue: null }));
            setRightPlayer(prev => ({ ...prev, state: 'racing', countdownValue: null }));
            setRaceStartTime(Date.now());
          }
        }, 1000);
      }
    };

    // Suscribirse a mensajes del socket
    const unsubscribe = subscribe(handleServerMessage);
    
    return unsubscribe;
  }, [subscribe]);

  // Actualizar cronómetro durante la carrera
  useEffect(() => {
    if (!raceStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - raceStartTime;
      setCurrentTime(elapsed);
    }, 10); // Actualizar cada 10ms

    return () => clearInterval(interval);
  }, [raceStartTime]);

  // Limpiar timer de countdown al desmontar
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, []);

  // Helper para actualizar estado de un carril
  const updatePlayerState = (lane, updates) => {
    const setter = lane === 'LEFT' ? setLeftPlayer : setRightPlayer;
    setter(prev => ({ ...prev, ...updates }));
  };

  const getSampleName = (lane) => (lane === 'LEFT' ? 'Jugador LEFT' : 'Jugador RIGHT');

  const applyDebugState = (lane, targetState) => {
    const currentPlayer = lane === 'LEFT' ? leftPlayer : rightPlayer;
    const updates = { state: targetState };

    if (targetState === 'idle' || targetState === 'registering') {
      updates.name = '';
      updates.photo = '';
      updates.winner = false;
      updates.time = 0;
      updates.countdownValue = null;
    }

    if (targetState === 'lobby') {
      updates.name = currentPlayer.name || getSampleName(lane);
      updates.photo = '';
      updates.winner = false;
      updates.time = 0;
      updates.countdownValue = null;
    }

    if (targetState === 'countdown') {
      updates.name = currentPlayer.name || getSampleName(lane);
      updates.countdownValue = 3;
      updates.winner = false;
      updates.time = 0;
    }

    if (targetState === 'racing') {
      updates.name = currentPlayer.name || getSampleName(lane);
      updates.countdownValue = null;
      updates.winner = false;
      updates.time = 0;
      setRaceStartTime(Date.now());
    }

    if (targetState === 'result') {
      updates.name = currentPlayer.name || getSampleName(lane);
      updates.countdownValue = null;
      updates.time = 4200 + Math.floor(Math.random() * 3000);
      updates.winner = lane === 'LEFT';
      setRaceStartTime(null);
      setCurrentTime(0);
    }

    updatePlayerState(lane, updates);
  };

  const handleDebugNextState = (lane) => {
    const player = lane === 'LEFT' ? leftPlayer : rightPlayer;
    const currentIndex = DISPLAY_STATES.indexOf(player.state);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % DISPLAY_STATES.length : 0;
    applyDebugState(lane, DISPLAY_STATES[nextIndex]);
  };

  const handleDebugPreset = (preset) => {
    if (preset === 'reset') {
      resetDisplayState();
      return;
    }

    if (preset === 'countdown') {
      applyDebugState('LEFT', 'countdown');
      applyDebugState('RIGHT', 'countdown');
      return;
    }

    if (preset === 'racing') {
      applyDebugState('LEFT', 'racing');
      applyDebugState('RIGHT', 'racing');
      return;
    }

    if (preset === 'result') {
      applyDebugState('LEFT', 'result');
      applyDebugState('RIGHT', 'result');
    }
  };

  // Renderizar un carril
  const renderLane = (player, laneName) => {
    switch (player.state) {
      case 'idle':
        return (
          <div className="lane-idle">
            <div className="text-4xl">
              🏁 ESPERANDO JUGADOR {laneName} 🏁
            </div>
            <p className="text-xl mt-4">Tabla de mejores tiempos</p>
          </div>
        );

      case 'registering':
        return (
          <div className="lane-registering">
            <div className="text-3xl">
              ⏳ Jugador preparándose...
            </div>
          </div>
        );

      case 'lobby':
        return (
          <div className="lane-lobby">
            <div className="photo-placeholder">
              {player.photo ? (
                <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-8xl">👤</div>
              )}
            </div>
            <h2 className="text-4xl font-bold mt-6">{player.name}</h2>
            <p className="text-xl mt-2">Carril {laneName}</p>
          </div>
        );

      case 'countdown':
        return (
          <div className="lane-countdown">
            <div className="photo-placeholder">
              {player.photo ? (
                <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-8xl">👤</div>
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-9xl font-bold countdown-number">
                {player.countdownValue > 0 ? player.countdownValue : '¡GO!'}
              </div>
            </div>
          </div>
        );

      case 'racing':
        return (
          <div className="lane-racing flex flex-col items-center">
            <div className="photo-placeholder w-40 h-40 mb-4 rounded-full overflow-hidden border-4 border-slate-700">
              {player.photo ? (
                <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">👤</div>
              )}
            </div>
            <RaceTimer time={currentTime} />
            <p className="text-2xl mt-4">🏃‍♂️ CORRIENDO...</p>
            <p className="text-xl mt-2">{player.name}</p>
          </div>
        );

      case 'result':
        return (
          <div className={`lane-result ${player.winner ? 'winner' : ''}`}>
            {player.winner && (
              <div className="text-6xl mb-4">
                🎉 🏆 ¡GANADOR! 🏆 🎉
              </div>
            )}
            <RaceTimer time={player.time} />
            <p className="text-3xl mt-6">{player.name}</p>
          </div>
        );

      default:
        return <div>Estado desconocido</div>;
    }
  };

  return (
    <div className="display-container">
      <div className="display-header">
        <h1 className="text-4xl font-bold">🍔 CARRERA McDONALD'S 🍔</h1>
      </div>

      {ENABLE_DISPLAY_DEBUG && (
        <div className="bg-black border-t border-b border-yellow-500 p-3 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => handleDebugNextState('LEFT')} className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded">
            DEBUG LEFT: SIGUIENTE
          </button>
          <button type="button" onClick={() => handleDebugNextState('RIGHT')} className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded">
            DEBUG RIGHT: SIGUIENTE
          </button>
          <button type="button" onClick={() => handleDebugPreset('countdown')} className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded">
            DEBUG: COUNTDOWN
          </button>
          <button type="button" onClick={() => handleDebugPreset('racing')} className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded">
            DEBUG: RACING
          </button>
          <button type="button" onClick={() => handleDebugPreset('result')} className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded">
            DEBUG: RESULT
          </button>
          <button type="button" onClick={() => handleDebugPreset('reset')} className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded">
            DEBUG: RESET
          </button>
        </div>
      )}
      
      <div className="display-split">
        <div className="lane left-lane">
          <div className="lane-label">CARRIL IZQUIERDO</div>
          {renderLane(leftPlayer, 'LEFT')}
        </div>
        
        <div className="divider"></div>
        
        <div className="lane right-lane">
          <div className="lane-label">CARRIL DERECHO</div>
          {renderLane(rightPlayer, 'RIGHT')}
        </div>
      </div>

      <div className="display-footer">
        <p className="text-sm">Estado: LEFT={leftPlayer.state} | RIGHT={rightPlayer.state}</p>
        <p className="text-sm">WS: {isConnected ? 'CONECTADO' : connectionState.toUpperCase()}</p>
        {activeClients && (
          <p className="text-xs mt-1">
            Clientes activos: T1={activeClients.tablet1} | T2={activeClients.tablet2} | PANTALLA={activeClients.pantalla}
          </p>
        )}
      </div>
    </div>
  );
}

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(2, '0')}`;
}

export default Display;
