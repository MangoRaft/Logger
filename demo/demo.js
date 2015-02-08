var logging = require('../');
var fs = require('fs');
var humanize = require('humanize-number');
var id = '04552ebb-8138-f96a-6336-617acac27fc7';

var webServer = logging.WebServer.createServer({
	host : 'localhost',
	port : 3000
});
var udpServer = logging.UDPServer.createServer({
	host : 'localhost',
	port : 3000
});

webServer.start();

udpServer.start();

var logger = logging.Logger.createLogger({
	web : {
		host : 'localhost',
		port : 3000
	},
	udp : {
		host : 'localhost',
		port : 3000
	}
});

var workerLog = logger.create({
	source : 'app',
	channel : 'worker.1',
	session : id,
	bufferSize : 1
});
workerLog.start();

var i = 0;

workerLog.log('sadasd ');
workerLog.time('sadasd ');
setTimeout(function() {
	workerLog.log('sadasd ' + (i++));
	workerLog.timeEnd('sadasd ');
	workerLog.trace();
}, 1000);

setInterval(function() {
	workerLog.log('setInterval ' + (i++));

}, 1000)

var view = logging.View.createView({
	host : 'localhost',
	port : 3000,
	session : id
});

view.start();
view.on('data', function(data) {
	console.log(data);
});
