var punt = require('punt');
var redis = require("redis");

var LOG_LENGTH = 2500;

module.exports.createServer = function(options) {
	return new UDPServer(options);
};

function UDPServer(options) {
	options.redis = options.redis || {};
	options.redis.host = options.redis.host || '127.0.0.1';
	options.redis.port = options.redis.port || 6379;
	options.limit = options.limit || LOG_LENGTH;
	this.options = options;
};

UDPServer.prototype.onMessage = function(msg) {
	if (Array.isArray(msg)) {
		for (var i = 0, j = msg.length; i < j; i++) {
			this.writeToRing(msg[i]);
		};
	} else {
		this.writeToRing(msg);
	}
};

UDPServer.prototype.writeToRing = function(msg) {

	var self = this;
	this.redis.get('token:' + msg.token, function(err, result) {
		if (err)
			return;
		if (!result)
			return;
			
		result = JSON.parse(result);
		
		var output = JSON.stringify({
			channel : result.channel,
			source : result.source,
			timestamp : +(msg.ts),
			line : msg.log,
			token : msg.token
		});
		
		self.redis.lpush('session:' + result.session, output, function(err) {
			if (err) 
				return;
			self.redis.ltrim('session:' + result.session, 0, self.options.limit, function() {
				if (err) 
					return;
				self.subscription.publish(result.session, output);
			});
		});

	});
};

UDPServer.prototype.start = function() {
	var self = this;
	var conf = this.options.redis;
	this.redis = redis.createClient(conf.port, conf.host);
	this.subscription = redis.createClient(conf.port, conf.host);

	if (this.options.redis.auth) {
		this.redis.auth(this.options.redis.auth);
		this.subscription.auth(this.options.redis.auth);
	}

	this.redis.on('error', function(err) {

	});
	this.subscription.on('error', function(err) {

	});

	this.server = punt.bind(this.options.host + ':' + this.options.port);
	this.server.on('message', this.onMessage.bind(this));
};

UDPServer.prototype.stop = function() {
	this.server.sock.close();
	this.redis.quit();
	this.subscription.quit();
};
