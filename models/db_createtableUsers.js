const db = require('./db_config');

let sql = `CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(256),
        email VARCHAR(256),
        password VARCHAR(256)
    );`;

db.run(sql, (err, result) => {
  if (err) throw err;
  console.log('Table created');
});

db.close();
