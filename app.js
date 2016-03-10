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
 var count = 0;
appClient.on("deviceEvent", function (deviceType, deviceId, eventType, format, payload, topic) {

    console.log("Device Event from :: "+deviceType+" : "+deviceId+" of event "+eventType+" with payload : "+payload);
    var payloaddata = JSON.parse(payload);
    console.log("Payload Date = "+payloaddata.Microphone.stream);

    //required for request
    var options = {
      uri: 'https://ttgs.mybluemix.net/hit',
      method: 'POST',
      json: {
        "hittime":payloaddata.Microphone.hittime,
        "seqCount":count,
        "sourceSensor":"mic"
      }
    };

    request(options, function(error, response, body){
        if (error || response.statusCode != 200){
          console.log("error sending to game sequence analyzer");
        } else if(response){
          console.log("Succeeded with: " + response.statusCode);
          count++;
        }
    });

});

appClient.on("deviceStatus", function (deviceType, deviceId, payload, topic) {
    console.log("Device status from :: "+deviceType+" : "+deviceId+" with payload : "+payload);
});
