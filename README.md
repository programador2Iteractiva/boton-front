# 🍔 Sistema de Carreras McDonald's (React + Vite)

Frontend con dos vistas separadas por rutas:
- ` /pantalla ` para monitor/TV principal
- ` /tablet?lane=LEFT ` o ` /tablet?lane=RIGHT ` para cada tablet

## 🚀 Inicio rápido

1. Instala dependencias:
```bash
npm install
```

2. Verifica la URL del backend en `src/services/socketService.js`:
```js
const SERVER_URL = 'http://localhost:3000'
```

3. Levanta el frontend:
```bash
npm run dev
```

## 🌐 Uso por dispositivo

- Pantalla principal (PC/TV): `http://localhost:5173/pantalla`
- Tablet carril izquierdo: `http://<IP-PC>:5173/tablet?lane=LEFT`
- Tablet carril derecho: `http://<IP-PC>:5173/tablet?lane=RIGHT`

## 📱 Flujo de la tablet (máquina de estados)

Estados implementados:
1. `loop` (inicio)
2. `register`
3. `terms`
4. `photo`
5. `waiting`
6. `countdown`
7. `racing`
8. `result`

La tablet registra datos, sube foto simulada, emite `REGISTER_PLAYER` y espera eventos del servidor.

## 🔌 Socket.IO (frontend)

### Emite
- `join_room` (al conectar)
- `REGISTER_PLAYER`
- `REQUEST_START_RACE`

### Escucha
- `GOTO_START_SCREEN`
- `UPDATE_DISPLAY`
- `COUNTDOWN_START`
- `RACE_GO`
- `SHOW_RESULT`
- `RESET_SYSTEM`

## 🖥️ Pantalla principal

Renderiza vista dividida por carril (LEFT/RIGHT), con estados de:
- `idle`
- `registering`
- `lobby`
- `countdown`
- `racing`
- `result`

## 📝 Notas

- Esta versión **omite animaciones avanzadas**.
- La captura de cámara en `photo` está simulada para pruebas.
- Si quieres backend de ejemplo, revisa `SERVER_EXAMPLE.md`.
