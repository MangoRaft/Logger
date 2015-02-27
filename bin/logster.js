#!/usr/bin/env node

var program = require('commander');
var http = require('http');
var fs = require('fs');
var cluster = require('cluster');
var logging = require('../');

program.version(require('../package.json').version);

var viewer = program.command('view');
viewer.description('View logs in teal-time.');

viewer.option('-a, --addr [HOST]', 'Bind to HOST address (default: 127.0.0.1)', '127.0.0.1');
viewer.option('-p, --port [PORT]', 'Use PORT (default: 5000)', 5000);
viewer.option('-S, --source [SOURCE]', 'Source to use (database)');
viewer.option('-c, --channel [CHANNEL]', 'Channel to use (redis.1)');
viewer.option('-e, --session [SESSION]', 'Session to use (default: SESSION)', 'SESSION');
viewer.option('-b, --backlog', 'Retrieve all logs from the server (default: false)');
viewer.option('-f, --file [FILE]', 'File to write to');
viewer.action(function(options) {
	var view = logging.View.createView({
		host : options.addr,
		port : options.port,
		session : options.session,
		backlog : options.backlog ? true : false
	});

	view.start();

	var filter = {

	};

	if (options.source) {
		filter.source = options.source;
	}
	if (options.channel) {
		filter.channel = options.channel;
	}

	var stream = view.filter(filter);
	if (options.file) {
		stream.pipe(fs.createWriteStream(options.file, {
			flags : 'a+',
			encoding : null,
			mode : 0666
		}));
	}
	stream.pipe(process.stdout);
});

var logger = program.command('log');
logger.description('Send logs to the server.');
logger.option('-a, --addr [HOST]', 'Bind to HOST address (default: 127.0.0.1)', '127.0.0.1');
logger.option('-p, --port [PORT]', 'Use PORT (default: 5000)', 5000);
logger.option('-A, --addr-udp [HOST-UDP]', 'Bind to HOST address (default: 127.0.0.1)', '127.0.0.1');
logger.option('-P, --port-udp [PORT-UDP]', 'Use PORT (default: 5001)', 5001);
logger.option('-S, --source [SOURCE]', 'Source to use (default: stdin)', 'stdin');
logger.option('-c, --channel [CHANNEL]', 'Channel to use (default: process.1)', 'process.1');
logger.option('-e, --session [SESSION]', 'session to use (default: SESSION)', 'SESSION');
logger.option('-b, --bufferSize [SIZE]', 'bufferSize to use (default: 100)', 100);
logger.option('-f, --flushInterval [SIZE]', 'Interval to flush the buffer (default: 5000ms)', 5000);
logger.action(function(options) {

	var filter = {
		source : options.source,
		channel : options.channel,
		session : options.session,
		bufferSize : Number(options.bufferSize),
		flushInterval : Number(options.flushInterval)
	};

	process.stdin.setEncoding('utf8');
	process.stdin.pipe(logging.Logger.createLogger({
		web : {
			host : options.addr,
			port : options.port
		},
		udp : {
			host : options.addrUdp,
			port : options.portUdp
		}
	}).create(filter));

});

var register = program.command('register');
register.description('Register a log session with the server.');

register.option('-a, --addr [HOST]', 'Bind to HOST address (default: 127.0.0.1)', '127.0.0.1');
register.option('-p, --port [PORT]', 'Use PORT (default: 5000)', 5000);
register.option('-e, --session [SESSION]', 'session to use (default: SESSION)', 'SESSION');
register.action(function(options) {
	var req = http.request({
		headers : {
			'Content-Type' : 'application/json'
		},
		hostname : options.addr,
		port : options.port,
		path : '/register',
		method : 'POST'
	}, function(res) {
		var data = [];
		res.on('data', function(chunk) {
			data.push(chunk.toString());
		});
		res.on('end', function() {
			console.log('your session id is: [' + JSON.parse(data.join('')).id + ']. Please save this for future use.');
		});
	});

	req.write(JSON.stringify({
		id : options.session,
		tokens : []
	}));
	req.end();

});

var server = program.command('server');
server.description('Run the log server.');

server.option('-a, --addr [HOST]', 'Bind to HOST address (default: 127.0.0.1)', '127.0.0.1');
server.option('-p, --port [PORT]', 'Use PORT (default: 5000)', 5000);
server.option('-p, --port-udp [PORT-UDP]', 'Use PORT (default: 5001)', 5001);
server.option('-A, --redis-addr [HOST]', 'Connect to redis HOST address (default: 127.0.0.1)', '127.0.0.1');
server.option('-P, --redis-port [PORT]', 'Connect to redis PORT (default: 6379)', 6379);
server.option('-o, --redis-auth [PASSWORD]', 'Use redis auth');
server.option('-w, --web', 'Start Web-Server', false);
server.option('-u, --udp', 'Start UDP-Server', false);
server.option('-c, --cluster', 'Start server as cluster', false);
server.option('-l, --limit', 'Limit logs stored (default: 2500)', 2500);
server.action(function(options) {

	var redis = {
		host : options.redisAddr,
		port : options.redisPort
	};

	if (options.redisAuth) {
		redis.auth = options.redisAuth;
	}

	if (options.cluster) {
		var numCPUs = require('os').cpus().length;
		if (cluster.isMaster) {
			for (var i = 0; i < numCPUs; i++)
				cluster.fork();

		} else {
			web();
			udp();
		}
	} else {
		web();
		udp();
	}

	function web() {
		if (options.web) {
			logging.WebServer.createServer({
				host : options.addr,
				port : options.port,
				redis : redis,
				limit : options.limit
			}).start();
		}
	}

	function udp() {
		if (options.udp) {
			logging.UDPServer.createServer({
				host : options.addr,
				port : options.portUdp,
				redis : redis
			}).start();
		}
	}

});

program.parse(process.argv);

if (!program.args.length) program.help();
