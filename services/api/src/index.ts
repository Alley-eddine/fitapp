import { createServer } from './server.js';
import { env } from './config/env.js';

const start = async () => {
  const server = await createServer();

  try {
    await server.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`API service running on port ${String(env.PORT)}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

void start();
