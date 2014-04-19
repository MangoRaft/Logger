var raft = require('raft');
var punt = require('punt');
var http = require('http');
var Logger = require('./lib/logger/logger');

process.configPath = process.argv[2];

raft.start();

var logger = Logger.createLogger({
	host : raft.common.ipAddress(),
	port : 3000
});
var log = logger.create('test.1', 'app');



