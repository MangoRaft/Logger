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

module.exports.createLogger = function(options) {
	return new Logger(options);
};

var Log = function(options) {
	this.buf = [];
	this.channel = null;
	this.source = null;
	this.token = null;
	this.udp = punt.connect(options.host + ':' + options.port);
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

Log.prototype.log = function(line) {
	if (line == '') {
		return
	}
	var item = {
		ts : Date.now(),
		token : this.token,
		log : line
	};
	console.log([line])

	this.udp.send(item);

};

var Logger = function(options) {
	this.options = options;
	this.source = {};
	this.sessionId = null;
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

	raft.nats.subscribe(uid, function(msg, reply) {
		self.sessionId = msg.id;
		console.log(msg)
	});

	raft.nats.publish('logger.register', item, uid);
	var log = new Log(this.options);

	log.addSource(source).addChannel(channel).addToken(uid);

	this.source[source] = log;

	return log;
};

