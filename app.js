// Express and sqlite declaration
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

// Database initialization
let sched = new sqlite3.Database(__dirname + '/db/schedule.db', (err) => {
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
const host = 'mqtt://127.0.0.1';
const mqtt = require('mqtt');
const client = mqtt.connect(host);

client.on('connect', () => {
  console.log('Connected to MQTT broker!');
});

app.get('/', (req, res) => {
  res.sendFile('/index.html');
});

app.get('/dir', (req, res) => {
  res.send(__dirname);
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
  res.sendStatus(201);
});

// poweroff route
app.post('/poweroff', (req, res) => {
  client.publish('poweroff', '1');
  res.sendStatus(201);
});




// Start express app  
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
