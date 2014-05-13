var logging = require('./');
var humanize = require('humanize-number');
var id = '04552ebb-8138-f96a-6336-617acac27fc7';

var webServer = logging.WebServer.createServer({
	host : 'localhost',
	port : 3009
});
var udpServer = logging.UDPServer.createServer({
	host : 'localhost',
	port : 3009
});

webServer.start();

udpServer.start();

var logger = logging.Logger.createLogger({
	web : {
		host : 'localhost',
		port : 3009
	},
	udp : {
		host : 'localhost',
		port : 3009
	}
});

var workerLog = logger.create('app', 'worker.1', id);
var webLog1 = logger.create('app', 'web.1', id);
var webLog2 = logger.create('app', 'web.2', id);

var i = 0;

setInterval(function() {
	workerLog.log('sadasd ' + (i++));
	webLog1.log('sadasd ' + (i++));
	webLog2.log('sadasd ' + (i++));
}, 1000);

var view = logging.View.createView({
	host : 'localhost',
	port : 3009,
	session : id
});

view.start();

view.filter({
	
}).on('line', function(line) {
	console.log(line)
});