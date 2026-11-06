const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: '123', database: 'reconshield' });
c.connect()
  .then(async () => {
    try {
      const r = await c.query("select tablename from pg_tables where schemaname='public'");
      console.log(r.rows.map(x => x.tablename));
    } catch (e) {
      console.log('ERR', e.code);
    }
  })
  .finally(() => c.end());
