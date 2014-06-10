var express = require('express');
var uuid = require('uuid');
var CompositeRingBuffer = require('./session');

module.exports.createServer = function(options) {
	return new Server(options);
};

function Server(options) {
	this.options = options;
	this.sessions = [];

};

Server.prototype.getSession = function(req, res) {
	var sessionId = req.params.sessionId;

	console.log('GET /sessions/' + sessionId);

	var options = req.query;
	options.num = options.num ? Number(options.num) : 200;

	var session = this.sessions[sessionId];

	if (!session) {
		res.writeHead(404);
		res.end();
		return;
	}

	res.writeHead(200, {
		'Content-Type' : 'text/plain'
	});

	var snapshot = session.get(options);

	var formatItem = function(item) {
		if (options.format == 'json') {
			var str = JSON.stringify({
				ts : item.ts,
				channel : item.channel,
				source : item.source,
				msg : item.msg
			}) + '\n';
		} else {
			var tsDate = new Date();
			tsDate.setTime(item.ts);
			var str = tsDate.toISOString() + ' ' + item.source + '[' + item.channel + ']: ' + item.msg + '\n';
		}

		return str;
	};

	snapshot[0].forEach(function(item) {
		res.write(formatItem(item));
	});

	if (!options.tail) {
		return res.end();
	}

	function onRb(rb) {
		rb.pipe(res, {
			end : false,
			format : formatItem
		});
	}


	res.once('end', function() {
		session.removeListener('rb', onRb);
	});
	req.connection.setTimeout(15 * 60 * 1000);

	session.on('rb', onRb);

	snapshot[1].forEach(onRb);
};

Server.prototype.getSessions = function(req, res) {
	res.json({
		sessions : Object.keys(this.sessions)
	});
};
Server.prototype.registerSession = function(req, res) {
	res.json({
		id : this.logRegister(req.body)
	});
};

Server.prototype.registerServer = function() {
	var app = express();
	app.use(require('body-parser')());
	// respond
	app.get("/sessions/:sessionId", this.getSession.bind(this));
	app.get("/sessions", this.getSessions.bind(this));
	app.post("/register", this.registerSession.bind(this));

	app.listen(this.options.port, this.options.host);
};

Server.prototype.start = function() {
	this.registerServer();
};

Server.prototype.stop = function() {

};

Server.prototype.logRegister = function(msg) {
	if (msg.id && this.sessions[msg.id]) {
		var id = msg.id;
		var session = this.sessions[id];
	} else {
		var id = msg.id || uuid.v4();
		var session = new CompositeRingBuffer(msg);

		this.sessions[id] = session;
	}

	session.add(msg.tokens);

	return id
};

