//z#!/usr/bin/env node

var raft = require('raft');

raft.start();

raft.common.logo(function(err, logo){
	if(err){
		throw err
	}
	console.log('   * ');
	console.log('   * '+logo.split('\n').join('\n   * '));
	console.log('   * View logger for more infomation.');
});

var webServer = require('../lib/logger/webserver').createServer();
webServer.start();

var udpServer = require('../lib/logger/udpserver').createServer();
udpServer.start();

process.on('SIGTERM', function() {
	console.log('SIGTERM received shutting down gracefully');
	udpServer.stop();
	webServer.stop();
	console.log('Shutdown gracefully.');
}); 