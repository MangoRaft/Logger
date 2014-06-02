var Duplex = require('stream').Duplex;
var util = require('util');
var readline = require('readline');
var Stream = require('stream').Stream;
var util = require('util');
var punt = require('punt');
var PassthroughStream = require('./passthrough-stream');

var Log = module.exports = function(options) {
	Duplex.call(this);
	var self = this;

	this.readable = this.writable = true;

	this.channel = null;
	this.source = null;

	this.token = null;

	this.bufferSize = options.bufferSize || 100;
	this.flushInterval = options.flushInterval || 5000;

	this.buffer = [];

	this.stream = new PassthroughStream({
		readable : true,
		writable : true
	});

	this.udp = punt.connect(options.udp.host + ':' + options.udp.port);

	readline.createInterface({
		input : this.stream,
		output : this.stream,
		terminal : false
	}).on('line', function(line) {
		this.buffer.push({
			ts : Date.now(),
			token : this.token,
			log : line
		});
		if (this.buffer.length >= this.bufferSize)
			this.flush();

	}.bind(this));
};

/***
 * Make it an event
 */
util.inherits(Log, Duplex);

/**
 *
 */

Log.prototype._send = function(msgs, fn) {
	this.udp.send(msgs);
};

Log.prototype.start = function() {
	var self = this;
	this.timer = setInterval(function() {

		if (self.buffer.length)
			self.flush();
	}, this.flushInterval);
};

Log.prototype.stop = function() {
	clearInterval(this.timer);
};

Log.prototype.flush = function(fn) {
	var msgs = this.buffer;
	this.buffer = [];
	this._send(msgs, fn);
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

Log.prototype.resume = Log.prototype.pause = function() {

};

Log.prototype.write = function(data) {
	this.stream.emit('data', data);
};

Log.prototype.end = function(str) {
	if (str) {
		this.write(str);
	}
};

Log.prototype.log = function(line) {
	this.write(line + '\n');
};
