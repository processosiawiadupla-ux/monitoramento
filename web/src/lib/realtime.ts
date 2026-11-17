import { io, type Socket } from 'socket.io-client';
import { getToken } from './api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3333';

export function conectarTempoReal(): Socket {
  return io(WS_URL, {
    auth: { token: getToken() },
    transports: ['websocket'],
  });
}
