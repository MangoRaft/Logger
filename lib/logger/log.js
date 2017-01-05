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

	this._times = {};
	this.started = false;

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
	this.udp.send(msgs, fn);
};

Log.prototype.start = function() {
	var self = this;
	if (!this.started) {
		this.started = true;
		this.timer = setInterval(function() {
			if (self.buffer.length)
				self.flush();
		}, this.flushInterval);
	}
};

Log.prototype.stop = function(fn) {
	clearInterval(this.timer);
	this.flush(fn);
};

Log.prototype.flush = function(fn) {

	if (!this.token) {
		return fn && fn();
	}

	var self = this;
	var msgs = this.buffer;
	this.buffer = [];
	this._send(msgs.map(function(item) {
		item.token = self.token;
		return item;
	}), fn);

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
	this.flush();

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

Log.prototype.log = function() {
	this.write(util.format.apply(this, arguments) + '\n');
};

Log.prototype.info = Log.prototype.log;

Log.prototype.warn = function() {
	this.write(util.format.apply(this, arguments) + '\n');
};

Log.prototype.error = Log.prototype.warn;

Log.prototype.dir = function(object, options) {
	this.write(util.inspect(object, util._extend({
		customInspect : false
	}, options)) + '\n');
};

Log.prototype.time = function(label) {
	this._times[label] = Date.now();
};

Log.prototype.timeEnd = function(label) {
	var time = this._times[label];
	if (!time) {
		throw new Error('No such label: ' + label);
	}
	var duration = Date.now() - time;
	this.log('%s: %dms', label, duration);
};

Log.prototype.trace = function() {
	// TODO probably can to do this better with V8's debug object once that is
	// exposed.
	var err = new Error;
	err.name = 'Trace';
	err.message = util.format.apply(this, arguments);
	Error.captureStackTrace(err, arguments.callee);
	this.error(err.stack);
};

