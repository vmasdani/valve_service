// Express and sqlite declaration
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

// Database initialization
let sched = new sqlite3.Database('./db/schedule.db', (err) => {
  if(err) {
    console.error(err.message);
  }
  console.log('Connected to schedule database.');
});
// Database initialization end

// Express app initialization
const app = express();
app.use(express.static(__dirname));
app.use(bodyParser.json());
const port = 80;

// mqtt connection
const host = 'mqtt://192.168.100.202';
const mqtt = require('mqtt');
const client = mqtt.connect(host);

client.on('connect', () => {
  console.log('Connected to MQTT broker!');
});

app.get('/', (req, res) => {
  res.sendFile('/index.html');
});

app.post('/sched', (req, res) => {
  console.log('Adding schedule...');
  const data = req.body;
  const hour = data.hour;
  const min = data.min;

  const query = `insert into sched values(null, ${hour}, ${min})`;

  sched.get(query, [], (err) => {
    if(err) {
      throw err;
    }
  });
  console.log(data);
  res.sendStatus(201);
});

app.get('/sched', (req, res) => {
  console.log('Adding schedule...');
  res.setHeader('Content-Type', 'application/json');

  const query = 'select * from sched';
  sched.all(query, [], (err, rows) => {
    if(err) {
      res.send(err);
    }
    res.send(JSON.stringify(rows));
  });
});

app.delete('/sched', (req, res) => {
  console.log('Deleting schedule...');
  const data = req.body;
  const query = `delete from sched where id=${data.id}`;

  console.log(data, query);

  sched.get(query, [], (err) => {
    if(err) {
      res.send(err);
      throw err;
    }
    else {
      res.sendStatus(204);
    }
  });
});

app.get('/length', (req, res) => {
  console.log('Getting length...');
  res.setHeader('Content-Type', 'application/json');

  const query = 'select * from length where id=1';
  sched.get(query, [], (err, rows) => {
    if(err) {
      res.send(err);
    }
    res.send(JSON.stringify(rows));
  });
});

app.put('/length', (req, res) => {
  console.log('Updating length...');
  const data = req.body;
  const mins = data.mins;
  const secs = data.secs;
  console.log({
    mins: mins,
    secs: secs,
  });

  const query = `update length set minute=${mins}, second=${secs} where id=1`;
  sched.get(query, [], (err) => {
    if(err) {
      throw err;
      res.send(err);
    }
    else {
      res.sendStatus(202);
    }
  })
});

// mqtt route
app.post('/control', (req, res) => {
  const data = req.body; 
  controlData = data.control;
  console.log('Control data:', controlData.toString());

  client.publish('control', controlData.toString());
});

// Start express app  
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

// Start database checking interval

// Time of detection, to prevent the same trigger on detected hour and minute.
let lastDetectedTime = {
  hour: 0,
  mins: 0,
};
let sameTime = false;

setInterval(() => {
  const offset = 7; // for UTC+0700
  const date = new Date(new Date().getTime()); 
  console.log(`[${date}] Checking database entry...`);

  const hour = date.getHours();
  const mins = date.getMinutes();

  // Check last detected time 
  if(lastDetectedTime.hour != hour || lastDetectedTime.mins != mins) {
    sameTime = false;
  }
  else {
    sameTime = true;
  }

  // update time
  lastDetectedTime.hour = hour;
  lastDetectedTime.mins = mins;

  const query = 'select * from sched';
  sched.all(query, [], (err, rows) => {
    if(err) {
      throw err;
    }

    // check if any of the hour matches
    let matchDetect = false;
    let scheduleArray = [];
    for(row of rows) {
      const dbHour = row.hour;
      const dbMin = row.minute;
      scheduleArray.push(`DB: ${dbHour}.${dbMin}, current: ${hour}.${mins}`);
      matchDetect = (dbHour === hour && dbMin === mins) ? true : false;
    }
    sameTime ? console.log('Still the same time.') : console.log('Time changed!');
    console.log(scheduleArray);
    matchDetect ? console.log('Match!') : console.log('No match!');

    // if detected and not in the same time anymore, send MQTT data.
    if(matchDetect && !sameTime) {
      // query the watering time from Database
      const query = 'select * from length where id=1';
      sched.get(query, [], (err, row) => {
        const minute = row.minute;
        const second = row.second;
        const totalSecs = minute * 60 + second;

        console.log(`Watering for ${minute} minute(s) and ${second} second(s), totaling ${totalSecs} second(s).`);

        const data = {
          length: totalSecs,
        };
        
        client.publish('schedule', JSON.stringify(data));
      });
    }
  });
}, 20000);
