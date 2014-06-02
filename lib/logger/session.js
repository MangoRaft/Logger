var events = require('events');
var util = require('util');
var ringBuffers = require('./ringbuffers');
var RingBuffer = require('./ringbuffer2');
var EventEmitter = require('eventemitter2').EventEmitter2;

var CompositeRingBuffer = module.exports = function(config) {
	EventEmitter.call(this, {
		wildcard : false,
		newListener : false,
	});
	this.rbs = [];
};
//
// Inherit from `events.EventEmitter`.
//
util.inherits(CompositeRingBuffer, EventEmitter);

CompositeRingBuffer.prototype.add = function(tokens) {
	var self = this;
	tokens.forEach(function(token) {
		if (!ringBuffers[token.id]) {
			ringBuffers[token.id] = new RingBuffer(2500);
		}

		var rb = ringBuffers[token.id];

		rb.addChannel(token.channel);
		rb.addSource(token.source);

		rb.on('data', function(item) {
			self.emit('added', item);
		});
		self.rbs.push(rb);
	});
};

CompositeRingBuffer.prototype.get = function(options) {
	var output = [];
	var rbs = [];

	this.rbs.forEach(function(rb) {
		if (options.channel && (options.channel !== rb.channel)) {
			if (options.channel !== rb.channel.split('.')[0]) {
				return;
			}
		}
		if (options.source && rb.source !== options.source) {
			return;
		}
		rbs.push(rb);
		output = output.concat(rb.records);
	});

	output = output.sort(function(entry1, entry2) {
		return entry1.ts > entry2.ts ? 1 : -1;
	});

	if (options.num) {
		if (output.length > options.num) {
			output = output.splice(output.length - options.num, output.length);
		}
	}

	return [output, rbs];
};
