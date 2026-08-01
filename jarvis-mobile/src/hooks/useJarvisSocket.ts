import { useEffect, useRef, useState, useCallback } from 'react';

interface Message {
  type: string;
  payload: any;
  timestamp: number;
}

interface UseJarvisSocketOptions {
  url: string;
  secret: string;
  onMessage?: (msg: Message) => void;
  onStatusChange?: (status: 'connected' | 'disconnected' | 'connecting') => void;
}

interface UseJarvisSocketReturn {
  connected: boolean;
  sendMessage: (type: string, payload: any) => void;
  messages: Message[];
  reconnect: () => void;
}

export function useJarvisSocket({
  url,
  secret,
  onMessage,
  onStatusChange,
}: UseJarvisSocketOptions): UseJarvisSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);

  onMessageRef.current = onMessage;
  onStatusChangeRef.current = onStatusChange;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    onStatusChangeRef.current?.('connecting');

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setConnected(true);
        onStatusChangeRef.current?.('connected');
        ws.send(JSON.stringify({ type: 'auth', secret }));
      };

      ws.onmessage = (event) => {
        try {
          const msg: Message = JSON.parse(event.data);
          setMessages((prev) => [...prev.slice(-99), msg]);
          onMessageRef.current?.(msg);
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
        onStatusChangeRef.current?.('disconnected');
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [url, secret]);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
  }, []);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected, sendMessage, messages, reconnect };
}