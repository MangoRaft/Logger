var cluster = require('cluster');
var http = require('http');

var logging = require('../');

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