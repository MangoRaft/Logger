/*
 *
 * (C) 2013, MangoRaft.
 *
 */
var uuid = require('uuid');
var http = require('http');
var Log = require('./log');

module.exports.createLogger = function(options) {
	return new Logger(options);
};

var Logger = function(options) {
	this.options = options;
	this.source = {};
	this.sessionId = null;
};

Logger.prototype.register = function(item, callback) {

	var options = {
		headers : {
			'Content-Type' : 'application/json'
		},
		hostname : this.options.web.host,
		port : this.options.web.port,
		path : '/register',
		method : 'POST'
	};

	var req = http.request(options, function(res) {
		var data = [];
		res.on('data', function(chunk) {
			data.push(chunk.toString());
		});
		res.on('end', function() {
			try {
				var json = JSON.parse(data.join(''));
			} catch(err) {
				return callback(err);
			}
			callback(null, json);
		});
	}).on('error', function() {

	});
	req.write(JSON.stringify(item));
	req.end();
};

Logger.prototype.create = function(options) {
	var self = this;
	var uid = uuid.v4();
	var item = {
		tokens : [{
			id : uid,
			channel : options.channel,
			source : options.source
		}]
	};
	if (options.session) {
		item.id = options.session;
	} else if (this.sessionId) {
		item.id = this.sessionId;
	}
	this.register(item, function(err, data) {
		if (err) {
			throw err;
		}
		self.sessionId = data.id;
	});

	var log = new Log({
		udp : this.options.udp,
		bufferSize : options.bufferSize,
		flushInterval : options.flushInterval
	});

	log.addSource(options.source).addChannel(options.channel).addToken(uid);

	this.source[options.source] = log;
	log.start()
	return log;
};

