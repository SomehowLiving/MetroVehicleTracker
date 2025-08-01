import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";

interface WebSocketMessage {
  type: string;
  data?: any;
}

export function useWebSocket() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      console.log("Connecting to WebSocket:", wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log("WebSocket connected successfully");
        setIsConnected(true);
        reconnectAttempts = 0;
        
        // Send authentication
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(
            JSON.stringify({
              type: "auth",
              data: {
                userId: user.id,
                storeId: user.storeId,
                role: user.role,
              },
            })
          );
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.current.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect if not a manual close
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
          setTimeout(connect, reconnectDelay);
        }
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close(1000, "Component unmounting");
      }
    };
  }, [user]);

  const sendMessage = (message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return { isConnected, lastMessage, sendMessage };
}






// import { useEffect, useRef, useState } from "react";
// import { useAuth } from "@/lib/auth";

// export function useWebSocket() {
//   const [isConnected, setIsConnected] = useState(false);
//   const [lastMessage, setLastMessage] = useState<any>(null);
//   const wsRef = useRef<WebSocket | null>(null);
//   const { user } = useAuth();

//   useEffect(() => {
//     if (!user) return;

//     // Construct WebSocket URL properly
//     const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
//     const host = window.location.host;
//     const wsUrl = `${protocol}//${host}/ws`;

//     console.log("Connecting to WebSocket:", wsUrl);

//     const ws = new WebSocket(wsUrl);
//     wsRef.current = ws;

//     ws.onopen = () => {
//       console.log("WebSocket connected");
//       setIsConnected(true);
//     };

//     ws.onmessage = (event) => {
//       try {
//         const message = JSON.parse(event.data);
//         setLastMessage(message);
//       } catch (error) {
//         console.error("Error parsing WebSocket message:", error);
//       }
//     };

//     ws.onclose = () => {
//       console.log("WebSocket disconnected");
//       setIsConnected(false);
//     };

//     ws.onerror = (error) => {
//       console.error("WebSocket error:", error);
//       setIsConnected(false);
//     };

//     return () => {
//       if (ws.readyState === WebSocket.OPEN) {
//         ws.close();
//       }
//     };
//   }, [user]);

//   return { isConnected, lastMessage };
// }

// interface WebSocketMessage {
//   type: string;
//   data?: any;
// }

// export function useWebSocket() {
//   const { user } = useAuth();
//   const [isConnected, setIsConnected] = useState(false);
//   const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
//   const ws = useRef<WebSocket | null>(null);

//   useEffect(() => {
//     if (!user) return;

//     // Fix WebSocket URL construction for both local and Replit deployment
//     const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
//     const host = window.location.host;
//     const wsUrl = `${protocol}//${host}/ws`;
    
//     console.log('Connecting to WebSocket:', wsUrl); // Debug log
//     ws.current = new WebSocket(wsUrl);

//     ws.current.onopen = () => {
//       setIsConnected(true);
//       // Authenticate the WebSocket connection
//       ws.current?.send(JSON.stringify({
//         type: 'auth',
//         data: {
//           userId: user.id,
//           storeId: user.storeId,
//           role: user.role
//         }
//       }));
//     };

//     ws.current.onmessage = (event) => {
//       try {
//         const message = JSON.parse(event.data);
//         setLastMessage(message);
//       } catch (error) {
//         console.error('Error parsing WebSocket message:', error);
//       }
//     };

//     ws.current.onclose = () => {
//       setIsConnected(false);
//     };

//     ws.current.onerror = (error) => {
//       console.error('WebSocket error:', error);
//       setIsConnected(false);
//     };

//     return () => {
//       ws.current?.close();
//     };
//   }, [user]);

//   const sendMessage = (message: WebSocketMessage) => {
//     if (ws.current && ws.current.readyState === WebSocket.OPEN) {
//       ws.current.send(JSON.stringify(message));
//     }
//   };

//   return { isConnected, lastMessage, sendMessage };
// }
