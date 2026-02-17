import { useContext } from 'react';
import { WebsocketContext } from './WebsocketProvider';

export function useWebsocket() {
  const context = useContext(WebsocketContext);

  if (!context) {
    throw new Error('useWebsocket must be used within a WebsocketProvider');
  }

  return context;
}
