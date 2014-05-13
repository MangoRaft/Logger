/*
 *
 * (C) 2013, MangoRaft.
 *
 */
var util = require('util');
var fs = require('fs');
var net = require('net');
var path = require('path');
var raft = require('raft');
var events = require('events');
var punt = require('punt');
var Stream = require('stream');
var http = require('http');

module.exports.createLogger = function(options) {
	return new Logger(options);
};

var Log = function(options) {
	Stream.call(this);
	this.buffer = [];

	this.readable = this.writable = true;
	this.buf = [];
	this.channel = null;
	this.source = null;
	this.token = null;
	this.udp = punt.connect(options.host + ':' + options.port);
};

/***
 * Make it an event
 */
util.inherits(Log, Stream);

/**
 *
 */
Log.prototype.end = function(str) {
	if (str) {
		this.write(str);
	}
};
Log.prototype.addSource = function(source) {
	this.source = source;
	return this;
};

Log.prototype.addChannel = function(channel) {
	this.channel = channel;
	return this;
};

Log.prototype.addToken = function(token) {
	this.token = token;
	return this;
};

Log.prototype.write = function(line) {
	var self = this
	var str = line.toString();
	if (str.indexOf('\n') > -1) {

		var message = this.buffer.join('');
		var data = str.split('\n');
		message += data.shift();

		this.buffer = [];
		this.udp.send({
			ts : Date.now(),
			token : self.token,
			log : message
		});

		data = data.join('\n');

		if (data.length) {
			this.write(data);
		}
	} else {
		this.buffer.push(str);
	}

};

Log.prototype.log = function(line) {
	var str = line.toString();
	this.write(str + '\n');
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
			callback(null, JSON.parse(data.join('')));
		});
	}).on('error', callback);
	req.write(JSON.stringify(item));
	req.end();
};

Logger.prototype.create = function(source, channel, sessionId) {
	var self = this;
	var uid = raft.common.uuid();
	var item = {
		tokens : [{
			id : uid,
			channel : channel,
			source : source
		}]
	};
	if (sessionId) {
		item.id = sessionId;
	} else if (this.sessionId) {
		item.id = this.sessionId;
	}

	this.register(item, function(err, data) {
		if (err) {
			throw err;
		}
		self.sessionId = data.id;
	});

	var log = new Log(this.options.udp);

	log.addSource(source).addChannel(channel).addToken(uid);

	this.source[source] = log;

	return log;
};

