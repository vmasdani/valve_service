const sqlite3 = require('sqlite3');
const mqtt = require('mqtt');

// Database initialization
let sched = new sqlite3.Database(__dirname + '/db/schedule.db', (err) => {
  if(err) {
    console.error(err.message);
  }
  console.log('Connected to schedule database.');
});
// Start database checking interval

// mqtt connection
const host = 'mqtt://127.0.0.1';
const client = mqtt.connect(host);

client.on('connect', () => {
  console.log('Connected to MQTT broker!');
});
  
// Time of detection, to prevent the same trigger on detected hour and minute.
let lastDetectedTime = {
  hour: 0,
  mins: 0,
};
let sameTime = false;

setInterval(() => {
  const offset = 7; // for UTC+0700
  const date = new Date(new Date().getTime()); 
  // console.log(`[${date}] Checking database entry...`);
  console.log(`Database polling...`);

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

  // const query = 'select * from sched';
  const query = `select * from sched where hour=? and minute=?`;
  sched.get(query, [hour, mins], (err, row) => {
    if(err) {
      throw err;
    }
    console.log('Result: ', row);

    if(row) {
      console.log('Schedule detected!');
      
      if(!sameTime) {
        const query = 'select * from length where id=?';
        sched.get(query, [1], (err, row) => {
          const minute = row.minute;
          const second = row.second;
          const totalSecs = minute * 60 + second;

          console.log(`Watering for ${minute} minute(s) and ${second} second(s), totaling ${totalSecs} second(s).`);

          const data = {
            length: totalSecs,
          };
          
          client.publish('schedule', JSON.stringify(data));
        }); //sched.get table=length
      }
    }
    else {
      console.log('Schedule not detected!');
    }
  }); // sched.get table=sched
}, 10000);
