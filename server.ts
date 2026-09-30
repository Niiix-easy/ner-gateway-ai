import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Attach io to request for API access
  server.use((req: any, res, next) => {
    req.io = io;
    next();
  });

  // Webhook Route in Express to handle WebSocket broadcast
  server.post('/api/webhooks', express.json(), (req: any, res) => {
    const body = req.body;
    console.log('Webhook Received:', body);
    
    const { provider, type, data } = body;
    
    // Broadcast notification to all clients
    req.io.emit('activity', {
      id: `act_${Date.now()}`,
      provider,
      type,
      data,
      timestamp: new Date().toISOString(),
      status: 'success'
    });

    res.json({ received: true });
  });

  // Specific providers
  ['mercadopago', 'stripe', 'pagbank'].forEach(provider => {
    server.post(`/api/webhooks/${provider}`, express.json(), (req: any, res) => {
      const body = req.body;
      console.log(`${provider} Webhook Received:`, body);
      
      req.io.emit('activity', {
        id: `act_${Date.now()}`,
        provider,
        type: 'payment.success',
        data: body,
        timestamp: new Date().toISOString(),
        status: 'success'
      });

      res.json({ received: true });
    });
  });

  server.all('*', (req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  httpServer.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});
