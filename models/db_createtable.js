const db = require('./db_config');

let sql = `CREATE TABLE IF NOT EXISTS campgrounds(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(64),
        location VARCHAR(256),
        image VARCHAR(1000),
        price INTEGER,
        description TEXT
    );`;

db.run(sql, (err, result) => {
  if (err) throw err;
  console.log('Table created');
});

db.close();
