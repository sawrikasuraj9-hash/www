import { startServer } from './src/server/appServer';

startServer().catch((err) => {
  console.error('Fatal Server Error:', err);
  process.exit(1);
});
