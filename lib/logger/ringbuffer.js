var events = require('events');
var EventEmitter = require('eventemitter2').EventEmitter2;
var util = require('util');

var RingBuffer = module.exports = function(capacity) {
	EventEmitter.call(this, {
		wildcard : false,
		newListener : false,
	});
	this.array = new Array(capacity);
	this.capacity = capacity;

	this.start = 0;
	this.end = -1;
	this.channel = 'channel';
	this.source = 'source';
};
//
// Inherit from `events.EventEmitter`.
//
util.inherits(RingBuffer, EventEmitter);

RingBuffer.prototype.add = function(item) {
	var np = (this.end + 1) % this.capacity;

	item.source = this.source;
	item.channel = this.channel;

	this.array[np] = item;

	if (this.end != -1 && np === this.start) {
		this.start = (this.start + 1) % this.capacity;
	}

	this.end = np;
	this.added(item);
};

RingBuffer.prototype.getAll = function() {
	if (this.end >= this.start) {
		return this.array.slice(this.start, this.end + 1);
	} else {
		var p1 = this.array.slice(this.start);
		var p2 = this.array.slice(0, this.start);
		return p1.concat(p2);
	}
};

RingBuffer.prototype.addChannel = function(channel) {
	this.channel = channel;
};

RingBuffer.prototype.addSource = function(source) {
	this.source = source;
};

