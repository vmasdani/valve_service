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
