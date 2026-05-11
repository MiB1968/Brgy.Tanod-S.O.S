import { pool } from './src/server/db/index.js';
import jwt from 'jsonwebtoken';
import { config } from './src/server/config/index.js';

async function main() {
  const token = jwt.sign({ id: 'some-id', email: 'test@local.loc', role: 'admin' }, config.jwtSecret);
  const res = await fetch('http://localhost:3000/api/sync?path=system_broadcasts', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("STATUS:", res.status);
  console.log("BODY:", await res.text());
  process.exit(0);
}
main();
