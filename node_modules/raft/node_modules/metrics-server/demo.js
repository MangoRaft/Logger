var usage = require('usage');

var udpServer = require('./lib/udpserver').createServer({
	host : '127.0.0.1',
	port : 4001,
	mongodb : {
		host : '127.0.0.1'
	}
});

var webServer = require('./lib/webserver').createServer({
	udp : udpServer,
	host : '127.0.0.1',
	port : 4002,
	mongodb : {
		host : '127.0.0.1'
	}
});

var memory = require('./lib/metric').createMetric({
	host : '127.0.0.1',
	port : 4001
});

var cpu = require('./lib/metric').createMetric({
	host : '127.0.0.1',
	port : 4001
});

memory.interval = cpu.interval = false;
memory.token = cpu.token = 'random-token';

memory.name = 'memory';
cpu.name = 'cpu';

var pid = process.pid;
setInterval(function() {

	usage.lookup(pid, {
		keepHistory : true
	}, function(err, result) {
		memory.cb(result.memory);
		cpu.cb(result.cpu);
	});
}, 1000);

webServer.start();
udpServer.start();
memory.start();
cpu.start();
