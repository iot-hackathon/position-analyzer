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
  "org" : "9u1t2g",
  "id" : "1234567890",
  "auth-key" : "a-9u1t2g-szvmuadctz",
  "auth-token" : "kB95w6JdyKN9cku-1z"
};

var appClient = new client(config);
var type = "TableTennis";

appClient.connect();

/*
 * on "connect" initialization
 */
appClient.on("connect", function () {
  appClient.subscribeToDeviceEvents(type);
  //appClient.subscribeToDeviceStatus();
});

/*
 * captures the device events, aka. temperature readings, periodically and stores
 * them in the cloudant database.
 */
 var buffer = [];
 var currentlyInBuffer = [];
 // appClient.on("deviceEvent", function (deviceType, deviceId, eventType, format, payload, topic) {
 //   console.log("Data");
 // });
 appClient.on("deviceEvent", function (deviceType, deviceId, eventType, format, payload, topic) {




    console.log("Device Event from :: "+deviceType+" : "+deviceId+" of event "+eventType+" with payload : "+payload);


    if (payload) {
      var payloaddata = JSON.parse(payload);
      if (payloaddata && payloaddata.Time && payloaddata.Time.timestamp && payloaddata.Id && payloaddata.Id.microphoneId && payloaddata.Microphone && payloaddata.Microphone.stream) {

        // for(var time in currentlyInBuffer) {
        //   // console.log("Go through array: time: " + currentlyInBuffer[time]);
        //   // console.log("Timestamp: " + parseInt(payloaddata.Time.timestamp));
        //   if (parseInt(payloaddata.Time.timestamp) - (currentlyInBuffer[time] * 100) >= 1) {
        //     // console.log('Timed out');
        //     analysis(currentlyInBuffer[time]*100, buffer[time]);
        //     buffer.splice(time, 1);
        //     currentlyInBuffer.splice(time, 1);
        //   }
        // }




        var timestamp = parseInt(payloaddata.Time.timestamp);
        var micId = parseInt(payloaddata.Id.microphoneId);
        var amplitude = parseInt(payloaddata.Microphone.stream);
        var id = Math.floor(timestamp / 100);
        var indexOfTimeStamp = currentlyInBuffer.indexOf(id);

        var mic = []
        mic[micId] = amplitude;

        // console.log('buffer begin: ' + JSON.stringify(buffer));

        // if (indexOfTimeStamp <= -1) {
        //   if (currentlyInBuffer.indexOf(id - 1) > -1) {
        //     id = id - 1;
        //     indexOfTimeStamp = currentlyInBuffer.indexOf(id);
        //   }
        //   else if (currentlyInBuffer.indexOf(id + 1) > -1) {
        //     id = id + 1;
        //     indexOfTimeStamp = currentlyInBuffer.indexOf(id);
        //   }
        // }
        //
        // if (indexOfTimeStamp > -1) {
        //   buffer[indexOfTimeStamp][micId] = amplitude;
        //   if (buffer[indexOfTimeStamp].length >= 2) {
        //     // Go to analysis
        //     analysis(timestamp, buffer[indexOfTimeStamp]);
        //     // console.log("start analysis with: " + timestamp + ' and ' + buffer[indexOfTimeStamp]);
        //     buffer.splice(indexOfTimeStamp, 1);
        //     currentlyInBuffer.splice(indexOfTimeStamp, 1);
        //   }
        // }
        // else {
        //   // analysis(timestamp);
        //   if (buffer.length >= 2) {
        //     // Buffer full, delete first entry
        //     if (buffer[0].length >= 1) {
        //       timestamp = currentlyInBuffer[0] * 100;
        //       analysis(timestamp, buffer[0]);
        //     }
        //     buffer.splice(0, 1);
        //     currentlyInBuffer.splice(0, 1);
        //   }
        //   if (!buffer[0]) {
        //     index = 0;
        //   }
        //   else if (!buffer[1]) {
        //     index = 1;
        //   }
        //   else if (!buffer[2]) {
        //     index = 2;
        //   }
        //   else if (!buffer[3]) {
        //     index = 3;
        //   }
        //   else if (!buffer[4]) {
        //     index = 4;
        //   }
        //   else {
        //     index = 5;
        //   }
        //   currentlyInBuffer[index] = id;
        //   buffer[index] = [];
        //   buffer[index][micId] = amplitude;
        // }

        analysis(timestamp, mic);

        // console.log('buffer end: ' + JSON.stringify(buffer));
      }
    }

});

var count = 0;
function analysis(timestamp, micInput) {
  // console.log(micInput);
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
  if (leftOrRight === 'left' || leftOrRight === 'right') {
    options.json.leftOrRight = leftOrRight;

    // var tableSide = whichTableSide(micInput, leftOrRight);
    // if (tableSide) {
    //   options.json.tableField = tableSide;
    // }
  }

  count++;

  console.log('Output: ' + JSON.stringify(options.json));

  request(options, function(error, response, body) {
      if (error || response.statusCode != 200){
        // console.log("error sending to game sequence analyzer: " + response.statusCode);
      } else if(response){
        // console.log("Succeeded with: " + response.statusCode);
      }
  });
}

function isLeftOrRight(micInput) {
  var leftOrRight = 0;
  if (!micInput[0]) {
    micInput[0] = 0;
  }
  if (!micInput[1]) {
    micInput[1] = 0;
  }

  // console.log(micInput);

  // if (micInput[0] && micInput[1]) {
    if (micInput[0] > micInput[1]) {
      leftOrRight = 'left';
    }
    else {
      leftOrRight = 'right';
    }
  // }

  // if (micInput[2] && micInput[3]) {
  //   if (!leftOrRight) {
  //     if (micInput[2] > micInput[3]) {
  //       leftOrRight = 'left';
  //     }
  //     else {
  //       leftOrRight = 'right';
  //     }
  //   }
  //   else {
  //     if (micInput[2] > micInput[3] && leftOrRight === 'left') {
  //       leftOrRight = 'left';
  //     }
  //     else if (leftOrRight === 'right') {
  //       leftOrRight = 'right';
  //     }
  //     else {
  //       leftOrRight = 0;
  //     }
  //   }
  // }

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
    console.log("Device status from :: "+deviceType+" : "+deviceId+" with payload : "+payload);
});
