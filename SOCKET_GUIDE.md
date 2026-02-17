# 🍔 Sistema de Carreras McDonald's - Frontend

Sistema de pruebas para sockets con tablets y pantalla de visualización.

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar servidor
Edita `src/services/socketService.js` y cambia la URL del servidor:
```javascript
const SERVER_URL = 'http://localhost:3000'; // Tu servidor aquí
```

### 3. Iniciar aplicación
```bash
npm run dev
```

## 📱 Modos de Operación

Al iniciar la aplicación, verás 3 opciones:

### 1. **TABLET IZQUIERDA** (Carril LEFT)
Abre en tablet/navegador del jugador izquierdo.

### 2. **TABLET DERECHA** (Carril RIGHT)
Abre en tablet/navegador del jugador derecho.

### 3. **PANTALLA GIGANTE** (Display)
Abre en el PC servidor conectado por HDMI a la pantalla grande.

## 🔌 Eventos Socket - TABLET

### Emite al conectar:
```javascript
{
  "type": "tablet",
  "lane": "LEFT" // o "RIGHT"
}
```

### Emite durante el flujo:
- **REGISTER_PLAYER**: Envía datos completos del registro
- **REQUEST_START_RACE**: Jugador listo para correr

### Escucha:
- **GOTO_START_SCREEN**: Avanzar a vista Ready
- **COUNTDOWN_START**: Iniciar cuenta regresiva 3,2,1
- **RACE_GO**: Carrera iniciada
- **SHOW_RESULT**: Mostrar tiempo y resultado
- **RESET_SYSTEM**: Volver a inicio

## 🖥️ Eventos Socket - DISPLAY

### Emite al conectar:
```javascript
{
  "type": "display"
}
```

### Escucha:
- **PLAYER_REGISTERING**: (Opcional) Jugador preparándose
- **UPDATE_DISPLAY**: Mostrar foto y nombre del jugador
- **COUNTDOWN_START**: Iniciar cuenta regresiva visual
- **RACE_GO**: Iniciar cronómetro
- **SHOW_RESULT**: Mostrar resultado con o sin confeti
- **RESET_SYSTEM**: Reset a estado inicial

## 📋 Flujo de Vistas - TABLET

1. **Vista 1**: Formulario (Nombre, Cédula, Email)
2. **Vista 2**: Términos y Condiciones
3. **Vista 3**: Cámara (simulada - en producción usar POST /api/upload-photo)
4. **Vista 4**: Selección de Combo
5. **Vista 5**: Confirmación y botón FINALIZAR REGISTRO
6. **Vista 6**: Ready - Botón INICIAR CARRERA
7. **Vista 7**: Carrera en vivo (bloqueada)
8. **Vista 8**: Resultados

## 🎮 Estados - DISPLAY

- **A: Standby (idle)**: Esperando jugadores
- **B: Lobby**: Mostrando foto y nombre
- **C: Countdown**: Cuenta regresiva 3,2,1
- **D: Racing**: Cronómetro activo
- **E: Results**: Tiempo final + animación ganador

## 🛠️ Estructura del Proyecto

```
src/
├── services/
│   └── socketService.js      # Servicio de Socket.IO
├── components/
│   ├── Tablet.jsx            # Componente Tablet (8 vistas)
│   └── Display.jsx           # Componente Pantalla Grande
├── App.jsx                   # Selector de modo
└── App.css                   # Estilos completos
```

## 🧪 Pruebas

### Probar con 3 ventanas del navegador:

1. **Ventana 1**: Seleccionar "TABLET IZQUIERDA"
2. **Ventana 2**: Seleccionar "TABLET DERECHA"
3. **Ventana 3**: Seleccionar "PANTALLA GIGANTE"

Abre la consola del navegador (F12) en cada ventana para ver los logs de los eventos socket.

## 📡 Servidor (Referencia)

El servidor debe implementar los siguientes eventos socket.io:

```javascript
// Escuchar
socket.on('join_room', (data) => {})
socket.on('REGISTER_PLAYER', (data) => {})
socket.on('REQUEST_START_RACE', (data) => {})

// Emitir
io.to(room).emit('GOTO_START_SCREEN')
io.to(room).emit('UPDATE_DISPLAY', {lane, name, photo})
io.to(room).emit('COUNTDOWN_START', {lane, seconds: 3})
io.to(room).emit('RACE_GO', {startTime, lane})
io.to(room).emit('SHOW_RESULT', {lane, time, winner})
io.to(room).emit('RESET_SYSTEM')
```

Ver `SERVER_EXAMPLE.md` para implementación completa del servidor.

## 🎨 Personalización

Colores McDonald's usados:
- Rojo: `#DA291C`
- Amarillo: `#FFC627`
- Dorado: `#FF9D00`

## 📝 Notas

- La Vista 3 (Cámara) está simulada. En producción usar API real.
- Los logs de socket se muestran en la consola del navegador.
- El cronómetro muestra milisegundos en formato 00:00:00.
- Sistema diseñado para pruebas, expandir según necesidades.

## 🐛 Debug

Para verificar conexiones socket, abre la consola (F12) y busca:
- ✅ Socket conectado
- 📤 Emitiendo [evento]
- 📥 Evento recibido [evento]
- ❌ Socket desconectado
- 🔥 Error de conexión

---

**Desarrollado para pruebas de integración socket McDonald's Racing Game** 🏁
