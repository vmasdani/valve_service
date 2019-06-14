// Express and sqlite declaration
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

// Database initialization
let sched = new sqlite3.Database('./db/schedule.db', (err) => {
  if(err) {
    console.error(err.message);
  }
  console.log('Connected to schedule database.');
});

let waterlength = new sqlite3.Database('./db/waterlength.db', (err) => {
  if(err) {
    console.error(err.message);
  }
  console.log('Connedted to waterlength database');
});
// Database initialization end

// Express app initialization
const app = express();
const port = 3000;

/*
waterlength.all(`select * from length`, [], (err, rows) => {
  console.log('waterlength data: ', rows);
});

sched.all(`select * from sched`, [], (err, rows) => {
  console.log('schedule data: ', rows);
});
*/
app.get('/', (req, res) => {
  res.send('Hello warudo');
});

// Start express app  
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

// Start database checking interval
setInterval(() => {
  const offset = 7; // for UTC+0700
  const date = new Date(new Date().getTime()); 
  console.log(`[${date}] Checking database entry...`);

  const hour = date.getHours();
  const mins = date.getMinutes();

  const query = 'select * from sched';
  sched.all(query, [], (err, rows) => {
    if(err) {
      throw err;
    }
    for(row of rows) {
      console.log(row);
    }
  });
}, 20000);
