import express from 'express';
import next from 'next';
import { createServer } from 'http';
import { parse } from 'url';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);
  
  // Re-adding simple Socket.io implementation
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  server.use((req: any, res, next) => {
    req.io = io;
    next();
  });

  server.all(/.*/, (req, res) => {
    const parsedUrl = parse(req.url!, true);
    return handle(req, res, parsedUrl);
  });
  
  httpServer.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});
