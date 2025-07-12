import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface WebSocketMessage {
  type: string;
  data?: any;
}

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  storeId?: number;
  role?: string;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Set<AuthenticatedWebSocket> = new Set();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: AuthenticatedWebSocket) => {
      console.log('New WebSocket connection');
      this.clients.add(ws);

      ws.on('message', (message: string) => {
        try {
          const data: WebSocketMessage = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'auth':
        ws.userId = message.data.userId;
        ws.storeId = message.data.storeId;
        ws.role = message.data.role;
        this.sendMessage(ws, { type: 'auth_success' });
        break;
      
      case 'ping':
        this.sendMessage(ws, { type: 'pong' });
        break;
      
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private sendMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public broadcastToAll(message: WebSocketMessage) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  public broadcastToStore(storeId: number, message: WebSocketMessage) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.storeId === storeId) {
        client.send(JSON.stringify(message));
      }
    });
  }

  public broadcastToAdmins(message: WebSocketMessage) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.role === 'admin') {
        client.send(JSON.stringify(message));
      }
    });
  }

  public notifyVehicleEntry(checkinData: any) {
    const message: WebSocketMessage = {
      type: 'vehicle_entry',
      data: checkinData
    };
    
    // Notify all admins
    this.broadcastToAdmins(message);
    
    // Notify operators at the same store
    this.broadcastToStore(checkinData.storeId, message);
  }

  public notifyVehicleExit(checkinData: any) {
    const message: WebSocketMessage = {
      type: 'vehicle_exit',
      data: checkinData
    };
    
    // Notify all admins
    this.broadcastToAdmins(message);
    
    // Notify operators at the same store
    this.broadcastToStore(checkinData.storeId, message);
  }

  public notifyStatusUpdate(updateData: any) {
    const message: WebSocketMessage = {
      type: 'status_update',
      data: updateData
    };
    
    this.broadcastToAll(message);
  }
}
