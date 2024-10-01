const db = require('./db_config');

let sql = `CREATE TABLE IF NOT EXISTS reviews(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        body VARCHAR(1000),
        rating INTEGER
    );`;

db.run(sql, (err, result) => {
  if (err) throw err;
  console.log('Table created');
});

db.close();
