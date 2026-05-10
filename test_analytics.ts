import { pool } from './server/db/index';

async function testAnalytics() {
  try {
    console.log("Testing overview query...");
    const overviewRes = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'resident' AND status = 'approved') as verified_residents,
        (SELECT COUNT(*) FROM users WHERE role = 'tanod') as total_tanods,
        (SELECT COUNT(*) FROM alerts WHERE status IN ('pending', 'active', 'responding')) as active_alerts
    `);
    console.log("Overview:", overviewRes.rows[0]);

    console.log("Testing byType query...");
    const byTypeRes = await pool.query(`
      SELECT type, COUNT(*) as count 
      FROM alerts 
      GROUP BY type 
      ORDER BY count DESC
    `);
    console.log("By Type:", byTypeRes.rows);

    console.log("Testing history query...");
    const historyRes = await pool.query(`
      SELECT 
        DATE(created_at) as day, 
        COUNT(*) as count 
      FROM alerts 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY day 
      ORDER BY day ASC
    `);
    console.log("History:", historyRes.rows);

    process.exit(0);
  } catch (err) {
    console.error("ANALYTICS ERROR:", err);
    process.exit(1);
  }
}

testAnalytics();
