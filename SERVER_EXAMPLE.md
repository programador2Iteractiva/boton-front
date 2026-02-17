# 🖥️ Servidor Socket.IO - Ejemplo de Implementación

Este es un ejemplo básico de servidor Node.js con Socket.IO para manejar los eventos del sistema de carreras.

## 📦 Instalación

```bash
npm init -y
npm install express socket.io cors
```

## 🚀 Código del Servidor

Crea un archivo `server.js`:

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Almacenar estado de los jugadores
const gameState = {
  leftPlayer: null,
  rightPlayer: null,
  raceInProgress: false
};

io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  // JOIN ROOM - Conexión inicial
  socket.on('join_room', (data) => {
    console.log('📥 join_room:', data);
    
    if (data.type === 'tablet') {
      socket.join(\`tablet_\${data.lane}\`);
      console.log(\`✅ Tablet \${data.lane} unido a su sala\`);
    } else if (data.type === 'display') {
      socket.join('display');
      console.log('✅ Display unido a su sala');
    }
  });

  // REGISTER_PLAYER - Registro completo del jugador
  socket.on('REGISTER_PLAYER', (data) => {
    console.log('📥 REGISTER_PLAYER:', data);
    
    const lane = data.lane;
    
    // Guardar jugador en estado
    if (lane === 'LEFT') {
      gameState.leftPlayer = data;
    } else {
      gameState.rightPlayer = data;
    }

    // Confirmar al tablet que se guardó
    io.to(\`tablet_\${lane}\`).emit('GOTO_START_SCREEN');
    
    // Actualizar display con la info del jugador
    io.to('display').emit('UPDATE_DISPLAY', {
      lane: lane,
      name: data.name,
      photo: data.photoUrl
    });
    
    console.log(\`✅ Jugador \${lane} registrado y display actualizado\`);
  });

  // REQUEST_START_RACE - Jugador presiona iniciar carrera
  socket.on('REQUEST_START_RACE', (data) => {
    console.log('📥 REQUEST_START_RACE:', data);
    
    const lane = data.lane;
    
    // Iniciar cuenta regresiva
    io.to(\`tablet_\${lane}\`).emit('COUNTDOWN_START', {
      lane: lane,
      seconds: 3
    });
    
    io.to('display').emit('COUNTDOWN_START', {
      lane: lane,
      seconds: 3
    });
    
    console.log(\`⏱️ Cuenta regresiva iniciada para \${lane}\`);
    
    // Después de 3 segundos, iniciar carrera
    setTimeout(() => {
      const startTime = Date.now();
      
      io.to(\`tablet_\${lane}\`).emit('RACE_GO', {
        lane: lane,
        startTime: startTime
      });
      
      io.to('display').emit('RACE_GO', {
        lane: lane,
        startTime: startTime
      });
      
      console.log(\`🏁 Carrera GO para \${lane}\`);
      
      // SIMULACIÓN: Después de 5-10 segundos mostrar resultado
      // En producción, esto vendría del Arduino/sensor
      const randomTime = 5000 + Math.random() * 5000;
      
      setTimeout(() => {
        const finalTime = Math.floor(randomTime);
        const isWinner = Math.random() > 0.5; // Random para pruebas
        
        io.to(\`tablet_\${lane}\`).emit('SHOW_RESULT', {
          lane: lane,
          time: finalTime,
          winner: isWinner
        });
        
        io.to('display').emit('SHOW_RESULT', {
          lane: lane,
          time: finalTime,
          winner: isWinner
        });
        
        console.log(\`🏆 Resultado para \${lane}: \${finalTime}ms, Ganador: \${isWinner}\`);
        
        // Después de 15 segundos, resetear sistema
        setTimeout(() => {
          io.emit('RESET_SYSTEM');
          console.log('🔄 Sistema reseteado');
          
          // Limpiar estado
          if (lane === 'LEFT') {
            gameState.leftPlayer = null;
          } else {
            gameState.rightPlayer = null;
          }
        }, 15000);
        
      }, randomTime);
      
    }, 3000);
  });

  // HARDWARE_FINISH - Cuando Arduino detecta golpe en el sensor
  // Este evento lo enviaría el hardware/backend cuando detecta el finish
  socket.on('HARDWARE_FINISH', (data) => {
    console.log('📥 HARDWARE_FINISH:', data);
    
    const { lane, time } = data;
    
    // Determinar ganador (el primero en llegar)
    let isWinner = false;
    if (lane === 'LEFT' && !gameState.rightPlayer?.finished) {
      isWinner = true;
    } else if (lane === 'RIGHT' && !gameState.leftPlayer?.finished) {
      isWinner = true;
    }
    
    io.to(\`tablet_\${lane}\`).emit('SHOW_RESULT', {
      lane: lane,
      time: time,
      winner: isWinner
    });
    
    io.to('display').emit('SHOW_RESULT', {
      lane: lane,
      time: time,
      winner: isWinner
    });
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

// API REST para subir fotos (ejemplo básico)
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/api/upload-photo', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ninguna foto' });
  }
  
  const photoUrl = \`/uploads/\${req.file.filename}\`;
  console.log('📸 Foto subida:', photoUrl);
  
  res.json({ photoUrl });
});

// Servir archivos estáticos (fotos subidas)
app.use('/uploads', express.static('uploads'));

// Estado del servidor
app.get('/api/status', (req, res) => {
  res.json({
    connected: io.sockets.sockets.size,
    gameState: gameState
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(\`🚀 Servidor corriendo en http://localhost:\${PORT}\`);
  console.log('📡 Socket.IO listo para conexiones');
});
```

## 🏃 Ejecutar servidor

```bash
node server.js
```

## 📝 Eventos Implementados

### Escucha (IN):
- `join_room` - Cliente se conecta y une a sala
- `REGISTER_PLAYER` - Recibe datos completos del jugador
- `REQUEST_START_RACE` - Jugador listo para iniciar
- `HARDWARE_FINISH` - (Para implementar) Sensor detecta llegada

### Emite (OUT):
- `GOTO_START_SCREEN` - Confirma registro guardado
- `UPDATE_DISPLAY` - Actualiza pantalla con jugador
- `COUNTDOWN_START` - Inicia cuenta 3,2,1
- `RACE_GO` - Carrera iniciada
- `SHOW_RESULT` - Muestra tiempo final
- `RESET_SYSTEM` - Resetea todo el sistema

## 🔧 Integración con Arduino

Para integrar con Arduino/sensores físicos:

```javascript
// Ejemplo con SerialPort (Node.js)
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const port = new SerialPort({ path: '/dev/ttyUSB0', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

parser.on('data', (data) => {
  // Ejemplo: "LEFT:5234" o "RIGHT:6891"
  const [lane, time] = data.split(':');
  
  if (lane && time) {
    io.emit('HARDWARE_FINISH', {
      lane: lane,
      time: parseInt(time)
    });
  }
});
```

## 📊 Logs

El servidor muestra logs en consola con emojis para fácil seguimiento:
- 🔌 Conexiones
- 📥 Eventos recibidos
- 📤 Eventos emitidos
- ✅ Confirmaciones
- ❌ Desconexiones
- 🏁 Eventos de carrera

## 🧪 Pruebas

1. Inicia el servidor: `node server.js`
2. Abre el frontend en 3 ventanas
3. Observa los logs del servidor en consola
4. Simula el flujo completo

---

**Nota**: Este es un servidor básico para pruebas. En producción, agregar:
- Base de datos para persistir jugadores
- Validaciones robustas
- Manejo de errores
- Autenticación
- Rate limiting
- Logging profesional
