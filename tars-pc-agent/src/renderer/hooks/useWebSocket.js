import { useState, useEffect, useRef } from 'react';

export const useWebSocket = (url) => {
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState({});
  const reconnectTimeout = useRef(null);

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
          setStatus('connected');
          setSocket(ws);
          console.log('WebSocket connected');
        };

        ws.onclose = () => {
          setStatus('disconnected');
          setSocket(null);
          
          // Reconnect after 3 seconds
          reconnectTimeout.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, 3000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case 'log':
                setLogs(prev => [...prev.slice(-99), data.data]);
                break;
              case 'metrics':
                setMetrics(data.data);
                break;
              case 'module_status':
                setMetrics(prev => ({
                  ...prev,
                  [data.module]: data.data
                }));
                break;
              case 'error':
                setLogs(prev => [...prev.slice(-99), {
                  level: 'error',
                  message: data.data.message,
                  timestamp: Date.now()
                }]);
                break;
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          setStatus('error');
          console.error('WebSocket error:', error);
        };

        return ws;
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        return null;
      }
    };

    const ws = connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [url]);

  return { socket, status, logs, metrics };
};