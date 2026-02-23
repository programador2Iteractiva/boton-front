import { io } from 'socket.io-client';

// URL del servidor - Cambiar según tu configuración
const SERVER_URL = 'http://9.0.0.10:443';

class SocketService {
  constructor() {
    this.socket = null;
  }

  // Conectar al servidor con tipo y carril
  connect(type, lane = null) {
    if (this.socket?.connected) {
      console.log('Socket ya está conectado');
      return this.socket;
    }

    this.socket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket conectado:', this.socket.id);
      
      // Emitir join_room según el tipo
      const roomData = { type };
      if (type === 'tablet' && lane) {
        roomData.lane = lane;
      }
      
      console.log('📤 Emitiendo join_room:', roomData);
      this.socket.emit('join_room', roomData);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket desconectado');
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔥 Error de conexión:', error);
    });

    return this.socket;
  }

  // Emitir eventos
  emit(event, data) {
    if (!this.socket) {
      console.error('Socket no inicializado');
      return;
    }
    console.log(`📤 Emitiendo ${event}:`, data);
    this.socket.emit(event, data);
  }

  // Escuchar eventos
  on(event, callback) {
    if (!this.socket) {
      console.error('Socket no inicializado');
      return;
    }
    console.log(`👂 Escuchando evento: ${event}`);
    this.socket.on(event, (data) => {
      console.log(`📥 Evento recibido ${event}:`, data);
      callback(data);
    });
  }

  // Dejar de escuchar un evento específico
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Desconectar
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketService();
