import app from './server/app.js';
import { port } from './server/config.js';
import { initializeDatabase } from './server/database.js';

async function start() {
  await initializeDatabase();
  app.listen(port, () => console.log(`A Sketchy Business running on port ${port}`));
}

start().catch(error => {
  console.error(error);
  process.exit(1);
});
