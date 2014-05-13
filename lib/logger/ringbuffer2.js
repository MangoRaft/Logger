var EventEmitter = require('eventemitter2').EventEmitter2;
var Stream = require('stream');
var util = require('util');

var RingBuffer = module.exports = function(capacity) {
	this.limit = capacity ? capacity : 100;
	this.writable = true;
	this.records = [];
	Stream.call(this);
};

util.inherits(RingBuffer, Stream);

RingBuffer.prototype.write = function(record) {
	if (!this.writable)
		throw (new Error('RingBuffer has been ended already'));

	record.source = this.source;
	record.channel = this.channel;

	this.emit('data', record);
	this.records.push(record);

	if (this.records.length > this.limit)
		this.records.shift();

	return (true);
};

RingBuffer.prototype.end = function() {
	if (arguments.length > 0)
		this.write.apply(this, Array.prototype.slice.call(arguments));
	this.writable = false;
};

RingBuffer.prototype.destroy = function() {
	this.writable = false;
	this.emit('close');
};

RingBuffer.prototype.destroySoon = function() {
	this.destroy();
};

RingBuffer.prototype.addChannel = function(channel) {
	this.channel = channel;
};

RingBuffer.prototype.addSource = function(source) {
	this.source = source;
};

RingBuffer.prototype.pipe = function(dest, options) {
	var source = this;

	function ondata(chunk) {
		if (dest.writable) {
			if (false === dest.write(options.format(chunk)) && source.pause) {
				source.pause();
			}
		}
	}


	source.on('data', ondata);

	function ondrain() {
		if (source.readable && source.resume) {
			source.resume();
		}
	}


	dest.on('drain', ondrain);

	// If the 'end' option is not supplied, dest.end() will be called when
	// source gets the 'end' or 'close' events.  Only dest.end() once.
	if (!dest._isStdio && (!options || options.end !== false)) {
		source.on('end', onend);
		source.on('close', onclose);
	}

	var didOnEnd = false;
	function onend() {
		if (didOnEnd)
			return;
		didOnEnd = true;

		dest.end();
	}

	function onclose() {
		if (didOnEnd)
			return;
		didOnEnd = true;

		if (util.isFunction(dest.destroy))
			dest.destroy();
	}

	// don't leave dangling pipes when there are errors.
	function onerror(er) {
		cleanup();
		if (EE.listenerCount(this, 'error') === 0) {
			throw er;
			// Unhandled stream error in pipe.
		}
	}


	source.on('error', onerror);
	dest.on('error', onerror);

	// remove all the event listeners that were added.
	function cleanup() {
		source.removeListener('data', ondata);
		dest.removeListener('drain', ondrain);

		source.removeListener('end', onend);
		source.removeListener('close', onclose);

		source.removeListener('error', onerror);
		dest.removeListener('error', onerror);

		source.removeListener('end', cleanup);
		source.removeListener('close', cleanup);

		dest.removeListener('close', cleanup);
	}


	source.on('end', cleanup);
	source.on('close', cleanup);

	dest.on('close', cleanup);

	dest.emit('pipe', source);

	// Allow for unix-like usage: A.pipe(B).pipe(C)
	return dest;
}; 