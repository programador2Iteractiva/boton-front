import { Link, Navigate, Route, Routes } from 'react-router-dom'
import Tablet from './components/Tablet'
import Display from './components/Display'
import { WebsocketProvider } from './context/WebsocketProvider'
import './App.css'

function ClientSocketRoute({ clientType, name, children }) {
  return (
    <WebsocketProvider clientType={clientType} name={name}>
      {children}
    </WebsocketProvider>
  )
}

function Home() {
  return (
    <div className="home-container">
      <h1 className="text-5xl font-bold mb-6">🍔 Sistema de Carreras McDonald's</h1>
      <p className="text-xl mb-8">Accede por rutas según el dispositivo:</p>

      <div className="route-grid">
        <Link to="/pantalla" className="route-card display-card">
          🖥️ /pantalla
        </Link>

        <Link to="/tablet1" className="route-card tablet-card">
          📱 /tablet1
        </Link>

        <Link to="/tablet2" className="route-card tablet-card">
          📱 /tablet2
        </Link>
      </div>

      <div className="mt-8 text-sm text-gray-300">
        <p>Servidor WebSocket esperado en ws://localhost:3000</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/pantalla"
        element={(
          <ClientSocketRoute clientType="pantalla" name="Pantalla Principal">
            <Display />
          </ClientSocketRoute>
        )}
      />
      <Route
        path="/tablet1"
        element={(
          <ClientSocketRoute clientType="tablet1" name="Tablet Registro P1">
            <Tablet lane="LEFT" />
          </ClientSocketRoute>
        )}
      />
      <Route
        path="/tablet2"
        element={(
          <ClientSocketRoute clientType="tablet2" name="Tablet Registro P2">
            <Tablet lane="RIGHT" />
          </ClientSocketRoute>
        )}
      />
      <Route path="/tablet" element={<Navigate to="/tablet1" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
