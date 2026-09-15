import { createServer } from 'node:http';
import nextEnv from '@next/env';
import next from 'next';

// Populate process.env from .env* before anything reads it.
nextEnv.loadEnvConfig(process.cwd());

const { connectDB } = await import('./src/lib/db.js');
const { initSocketServer } = await import('./src/server/socket/index.js');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = Number(process.env.PORT) || 4000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const start = async () => {
  await connectDB();
  await app.prepare();

  const httpServer = createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error('[next] request failed', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
  });

  initSocketServer(httpServer);

  httpServer.listen(port, () => {
    console.log(`> SCIS Connect ready on http://${hostname}:${port}`);
  });
};

start().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
