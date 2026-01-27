import { createServer } from './presentation/server.js';
import { env } from './infrastructure/config/env.js';

const start = async () => {
  const server = await createServer();

  try {
    await server.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`Auth service running on port ${String(env.PORT)}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

void start();
