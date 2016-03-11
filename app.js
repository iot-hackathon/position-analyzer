/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');
var request = require('request');
// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});




// IoT client

var client = require("ibmiotf").IotfApplication;

var config = {
  "org" : "ez3mm3",
  "id" : "1234567890-mic",
  "auth-key" : "a-ez3mm3-a5bvjuc3m0",
  "auth-token" : "4cnN3wpdlvAcXq3c9t"
};

var appClient = new client(config);
var type = "Microphone";

appClient.connect();

/*
 * on "connect" initialization
 */
appClient.on("connect", function () {
  appClient.subscribeToDeviceEvents(type);
  appClient.subscribeToDeviceStatus();
});

/*
 * captures the device events, aka. temperature readings, periodically and stores
 * them in the cloudant database.
 */
 var buffer = [];
 var currentlyInBuffer = [];
 appClient.on("deviceEvent", function (deviceType, deviceId, eventType, format, payload, topic) {

    console.log("Device Event from :: "+deviceType+" : "+deviceId+" of event "+eventType+" with payload : "+payload);

    if (payload) {
      var payloaddata = JSON.parse(payload);
      if (payloaddata && payloaddata.Time && payloaddata.Time.timestamp && payloaddata.Id && payloaddata.Id.microphoneId && payloaddata.Microphone && payloaddata.Microphone.stream) {
        var timestamp = payloaddata.Time.timestamp;
        var micId = payloaddata.Id.microphoneId;
        var amplitude = payloaddata.Microphone.stream;

        var indexOfTimeStamp = currentlyInBuffer.indexOf([timestamp / 10]);

        if (indexOfTimeStamp > -1) {
          buffer[indexOfTimeStamp][micId] = amplitude;
          if (buffer[indexOfTimeStamp].length >= 4) {
            // Go to analysis
            analysis(timestamp, buffer[indexOfTimeStamp]);
            buffer.splice(indexOfTimeStamp, 1);
            currentlyInBuffer.splice(indexOfTimeStamp, 1);
          }
        }
        else {
          // analysis(timestamp);
          if (buffer.length >= 5) {
            // Buffer full, delete first entry
            if (buffer[0].length >= 3) {
              analysis(timestamp, buffer[0]);
            }
            buffer.splice(0, 1);
            currentlyInBuffer.splice(0, 1);
          }
          if (!buffer[0]) {
            index = 0;
          }
          else if (!buffer[1]) {
            index = 1;
          }
          else if (!buffer[2]) {
            index = 2;
          }
          else if (!buffer[3]) {
            index = 3;
          }
          else if (!buffer[4]) {
            index = 4;
          }
          else {
            index = 5;
          }
          currentlyInBuffer[index] = timestamp / 10;
          buffer[index] = [];
          buffer[index][micId] = amplitude;
        }
      }
    }
});

console.log(JSON.stringify(buffer));

var count = 0;
function analysis(timestamp, micInput) {
  //required for request
  var options = {
    uri: 'https://ttgs.mybluemix.net/hit',
    method: 'POST',
    'Content-Type': 'application/json',
    json: {
      "hitTime":timestamp,
      "seqCount":count,
      "sourceSensor":"mic"
    }
  };

  var leftOrRight = isLeftOrRight(micInput);
  if (leftOrRight !== 0) {
    options.json.leftOrRight = leftOrRight;

    var tableSide = whichTableSide(micInput, leftOrRight);
    if (tableSide) {
      options.json.tableField = tableSide;
    }
  }

  count++;

  console.log('Output: ' + JSON.stringify(options.json));

  request(options, function(error, response, body) {
      if (error || response.statusCode != 200){
        console.log("error sending to game sequence analyzer: " + response.statusCode);
      } else if(response){
        console.log("Succeeded with: " + response.statusCode);
      }
  });
}

function isLeftOrRight(micInput) {
  if (micInput[0] && micInput[1]) {
    if (micInput[0] > micInput[1]) {
      leftOrRight = 'left';
    }
    else {
      leftOrRight = 'right';
    }
  }

  if (micInput[2] && micInput[3]) {
    if (!leftOrRight) {
      if (micInput[2] > micInput[3]) {
        leftOrRight = 'left';
      }
      else {
        leftOrRight = 'right';
      }
    }
    else {
      if (micInput[2] > micInput[3] && leftOrRight === 'left') {
        leftOrRight = 'left';
      }
      else if (leftOrRight === 'right') {
        leftOrRight = 'right';
      }
      else {
        leftOrRight = 0;
      }
    }
  }

  return leftOrRight;
}

function whichTableSide(micInput, side) {
  var tableSide;
  var left;
  var right;

  if (side === 'left') {
    left = 0;
    right = 2;
  }
  else {
    left = 3;
    right = 1;
  }

  if (micInput[left] && micInput[right]) {
    if (micInput[left] > micInput[right]) {
      tableSide = left;
    }
    else {
      tableSide = right;
    }
  }
  return tableSide;
}

appClient.on("deviceStatus", function (deviceType, deviceId, payload, topic) {
    // console.log("Device status from :: "+deviceType+" : "+deviceId+" with payload : "+payload);
});
