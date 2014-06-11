var express = require('express');
var uuid = require('uuid');
var events = require("events");
var redis = require("redis");

var LOG_LENGTH = 2500;

module.exports.createServer = function(options) {
	return new Server(options);
};

function Server(options) {
	options.redis = options.redis || {};
	options.redis.host = options.redis.host || '127.0.0.1';
	options.redis.port = options.redis.port || 6379;
	this.options = options;
};

Server.prototype.getSession = function(req, res) {
	var sessionId = req.params.sessionId;
	var self = this;

	var options = req.query;
	options.start = options.start ? Number(options.start) : 0;
	options.end = options.end ? Number(options.end) : LOG_LENGTH;

	var formatItem = function(item) {
		//console.log(item)
		if ( typeof item === 'string')
			item = JSON.parse(item);
		if (options.format == 'json') {
			var str = JSON.stringify({
				ts : item.timestamp,
				channel : item.channel,
				source : item.source,
				msg : item.line
			}) + '\n';
		} else {
			var tsDate = new Date();
			tsDate.setTime(item.timestamp);
			var str = tsDate.toISOString() + ' ' + item.source + '[' + item.channel + ']: ' + item.line + '\n';
		}

		res.write(str);
	};

	this.redis.lrange('session:' + sessionId, options.start, options.end, function(err, results) {
		if (err) {
			return;
		}
		if (results.length == 0 && !options.tail) {
			res.writeHead(404);
			res.end();
			return;
		}

		res.writeHead(200, {
			'Content-Type' : 'text/plain'
		});
		
		results.reverse().forEach(formatItem);
		
		if (!options.tail) {
			return res.end();
		}

		req.connection.setTimeout(15 * 60 * 1000);

		self.subscription.on(sessionId, formatItem);

		res.once('end', function() {
			self.subscription.removeListener(sessionId, formatItem);
		}).once('error', function() {
			self.subscription.removeListener(sessionId, formatItem);
		});
	});
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

Server.prototype.setupSubscription = function() {
	var self = this;
	var conf = this.options.redis;
	this.redis = redis.createClient(conf.port, conf.host);
	this.subscriber = redis.createClient(conf.port, conf.host);

	if (conf.auth) {
		this.redis.auth(conf.auth);
		this.subscriber.auth(conf.auth);
	}

	this.subscription = new events.EventEmitter();

	this.subscriber.on("message", function(channel, message) {
		self.subscription.emit(channel, JSON.parse(message));
	});

	var on = this.subscription.on;
	var removeListener = this.subscription.removeListener;

	this.subscription.on = function(event, fn) {
		if (self.subscription.listeners(event).length === 0) {
			self.subscriber.subscribe(event);
		}
		on.call(self.subscription, event, fn);
	};
	this.subscription.removeListener = function(event, fn) {
		removeListener.call(self.subscription, event, fn);
		if (self.subscription.listeners(event).length === 0) {
			self.subscriber.unsubscribe(event);
		}
	};
};

Server.prototype.start = function() {
	this.registerServer();
	this.setupSubscription();
};

Server.prototype.stop = function() {

};

Server.prototype.logRegister = function(msg) {
	var self = this;
	var session = msg.id || uuid.v4();
	msg.tokens.forEach(function(token) {
		self.redis.set('token:' + token.id, JSON.stringify({
			id : token.id,
			channel : token.channel,
			source : token.source,
			session : session
		}));
	});
	return session;
};

