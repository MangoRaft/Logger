var express = require('express');
var uuid = require('uuid');
var events = require("events");
var redis = require("redis");
var async = require('async');
var url = require('url');
var WebSocketServer = require('ws').Server

var LOG_LENGTH = 2500;

module.exports.createServer = function(options) {
	return new Server(options);
};

function Server(options) {
	options.redis = options.redis || {};
	options.redis.host = options.redis.host || '127.0.0.1';
	options.redis.port = options.redis.port || 6379;
	options.limit = options.limit || LOG_LENGTH;
	this.options = options;
};

Server.prototype.registerServer = function() {
	this.server = require('http').createServer();
	this.ws = new WebSocketServer({
		server : this.server
	});
	var app = express();
	app.use(require('body-parser')());
	// respond
	app.get("/sessions/:sessionId", this.getSession.bind(this));
	app.get("/sessions", this.getSessions.bind(this));
	app.get("/sessions-info/:sessionId", this.getSessionsInfo.bind(this));
	app.get("/tokens", this.getTokens.bind(this));
	app.post("/register", this.logRegister.bind(this));
	//websocket
	this.getSessionWS();
	this.server.on('request', app);
	this.server.listen(this.options.port, this.options.host);
};

Server.prototype.getSessionWS = function() {
	var self = this;
	this.ws.on('connection', function connection(ws) {
		var location = url.parse(ws.upgradeReq.url, true);
		var sessionId = location.query.session;

		var options = location.query;
		options.start = options.start ? Number(options.start) : 0;
		options.end = options.end ? Number(options.end) : this.options.limit;

		self.redis.lrange('session:' + sessionId, options.start, options.end, function(err, results) {
			if (err) {
				return;
			}
			if (results.length == 0 && !options.tail) {
				ws.close();
				return;
			}
			var formatItem = function(item) {
				var line = self.formatItem(item, options);
				ws.send(line);
			};
			results.reverse().forEach(formatItem);

			if (!options.tail) {
				return ws.close();
			}

			self.subscription.on(sessionId, formatItem);

			function remove() {
				self.subscription.removeListener(sessionId, formatItem);
			}


			ws.once('close', remove).once('error', remove);
		});
	});
};
Server.prototype.formatItem = function(item, options) {
	item = JSON.parse(item);

	if (options.channel && (options.channel !== item.channel)) {
		if (options.channel !== item.channel.split('.')[0]) {
			return;
		}
	}
	if (options.source && options.source !== item.source) {
		return;
	}

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

	return str;
};
Server.prototype.getSession = function(req, res) {
	var sessionId = req.params.sessionId;
	var self = this;

	var options = req.query;
	options.start = options.start ? Number(options.start) : 0;
	options.end = options.end ? Number(options.end) : this.options.limit;

	this.redis.lrange('session:' + sessionId, options.start, options.end, function(err, results) {
		if (err) {
			return;
		}
		if (results.length == 0 && !options.tail) {
			res.writeHead(404);
			res.end();
			return;
		}
		var formatItem = function(item) {
			var line = self.formatItem(item, options);
			res.write(line);
		};

		res.writeHead(200, {
			'Content-Type' : 'text/plain'
		});

		results.reverse().forEach(formatItem);

		if (!options.tail) {
			return res.end();
		}

		req.connection.setTimeout(15 * 60 * 1000);

		self.subscription.on(sessionId, formatItem);

		function remove() {
			self.subscription.removeListener(sessionId, formatItem);
		}


		res.once('end', remove).once('error', remove);
	});
};

Server.prototype.getSessions = function(req, res) {

	this.redis.keys('session:*', function(err, results) {
		res.json({
			error : err,
			results : results
		});
	});

};

Server.prototype.getSessionsInfo = function(req, res) {

	var sessionId = req.params.sessionId;
	var self = this;

	this.redis.keys('token:*', function(err, result) {
		if (err)
			return;
		async.parallel(result.map(function(key) {
			return function(cb) {
				self.redis.get(key, function(err, result) {
					if (err)
						cd(err)
					else {
						var json = JSON.parse(result)
						if (json.session = sessionId) {

							cb(null, json)
						} else {
							cb()
						}

					}
				});
			};
		}), function(err, results) {
			res.json({
				err : err,
				results : results
			});
		});
	});

};

Server.prototype.getTokens = function(req, res) {

	this.redis.keys('token:*', function(err, results) {
		res.json({
			error : err,
			results : results
		});
	});

};

Server.prototype.registerSession = function(req, res) {

};

Server.prototype.logRegister = function(req, res) {
	var self = this;
	var session = req.body.id || uuid.v4();
	var token = req.body.tokens[0];
	this.redis.keys('token:*', function(err, results) {
		function loop() {
			var tok = results.shift();
			if (!tok) {
				token.id = uuid.v4();

				return self.redis.set('token:' + token.id, JSON.stringify({
					id : token.id,
					channel : token.channel,
					source : token.source,
					session : session
				}), function(err) {
					if (err)
						throw err
					res.json({
						token : token.id,
						session : session
					});
				});

			}

			self.redis.get(tok, function(err, result) {
				if (err)
					return loop();
				var json = JSON.parse(result);
				if (token.channel == json.channel && token.source == json.source && token.session == json.session) {
					return res.json({
						token : json.id,
						session : session
					});
				} else {
					loop();
				}

			});
		}

		loop()
	});
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
		self.subscription.emit(channel, message);
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
	this.server.close();
	this.redis.quit();
	this.subscriber.quit();
};

