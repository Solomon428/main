import { Client } from 'pg';
(async () => {
  const client = new Client({
    user: 'creditorflow',
    host: 'localhost',
    database: 'creditorflow',
    password: 'creditorflow123',
    port: 15432,
  });
  try {
    await client.connect();
    console.log('DB connected');
    const r1 = await client.query('SELECT 1 as test');
    console.log(
      `Test query result: ${r1.rows[0].test}`
    );
    const r2 = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const count = parseInt(r2.rows[0].count, 10);
    console.log(`Public table count: ${count}`);
    if (count >= 1) {
      console.log(`Database has ${count} public tables. DB test passed.`);
      process.exit(0);
    } else {
      console.error(`No public tables found in database.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('DB test failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
