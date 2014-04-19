var express = require('express');
var RingBuffer = require('./ringbuffer');
var ringBuffers = require('./ringbuffers');
var CompositeRingBuffer = require('./session');
var raft = require('raft');

module.exports.createServer = function(options) {
	return new Server(options);
};

function Server(options) {
	this.options = options;
	this.sessions = [];

};

Server.prototype.registerEvents = function() {
	var self = this;
	raft.nats.subscribe('logger.register', function(msg, reply) {
		self.logRegister(msg, reply);
	});
};

Server.prototype.getSession = function(req, res) {
	var sessionId = req.params.sessionId;

	console.log('GET /sessions/' + sessionId);

	var options = req.query;
	options.num = options.num || Number.MAX_VALUE;

	var session = this.sessions[sessionId];

	if (!session) {
		res.writeHead(404);
		res.end();
		return;
	}

	res.writeHead(200, {
		'Content-Type' : 'text/plain'
	});

	var snapshot = session.getAll();

	var formatItem = function(item) {
		var tsDate = new Date();
		tsDate.setTime(item.ts);
		var str = tsDate.toISOString() + ' ' + item.source + '[' + item.channel + ']: ' + item.msg + '\n';
		return str;
	};

	var len = snapshot.length;

	snapshot.filter(function(item) {
		if (options.ps) {
			return options.ps === item.channel;
		}
		return true;
	}).filter(function(item) {
		if (options.source) {
			return options.source === item.source;
		}
		return true;
	}).forEach(function(item, i) {
		if (item && len - i <= options.num) {
			res.write(formatItem(item));
		}
	});

	if (!options.tail) {
		return res.end();
	}

	var produce = true;

	res.on('pause', function() {
		produce = false;
	}).on('resume', function() {
		produce = true;
	});

	var writeAdded = function(item) {
		if (produce) {
			res.write(formatItem(item));
		}
	};

	session.on('added', writeAdded);

	res.on('close', function() {
		console.log('ended');
	});

	res.on('end', function() {
		produce = false;
		session.removeListener('added', writeAdded);
		console.log('Client disconnected');
	});
};

Server.prototype.registerServer = function() {
	var app = express();
	var self = this;
	// respond
	app.get("/sessions/:sessionId", this.getSession.bind(this));

	app.listen(3003);
};

Server.prototype.start = function() {
	this.registerEvents();
	this.registerServer();
};

Server.prototype.stop = function() {

};

Server.prototype.logRegister = function(msg, reply) {

	if (msg.id && this.sessions[msg.id]) {
		var id = msg.id;
		var session = this.sessions[id];
	} else {
		var id = raft.common.uuid();
		var session = new CompositeRingBuffer(msg);
		this.sessions[id] = session;
	}

	session.add(msg.tokens);

	raft.nats.publish(reply, {
		id : id
	});
};

