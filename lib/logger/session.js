var events = require('events');
var util = require('util');
var ringBuffers = require('./ringbuffers');
var RingBuffer = require('./ringbuffer');

var CompositeRingBuffer = module.exports = function() {
	events.EventEmitter.call(this);
	this.rbs = [];
};
//
// Inherit from `events.EventEmitter`.
//
util.inherits(CompositeRingBuffer, events.EventEmitter);

CompositeRingBuffer.prototype.add = function(tokens) {
	var self = this;
	tokens.forEach(function(token) {
		if (!ringBuffers[token.id]) {
			ringBuffers[token.id] = new RingBuffer(500);
		}

		var rb = ringBuffers[token.id];

		rb.addChannel(token.channel);
		rb.addSource(token.source);

		rb.on('added', function(item) {
			self.emit('added', item);
		});
		self.rbs.push(rb);
	});
};

CompositeRingBuffer.prototype.getAll = function(tokens) {
	var output = [];

	this.rbs.forEach(function(rb) {
		rb.getAll().forEach(function(item) {
			output.push(item)
		});
	});

	return output.sort(function(entry1, entry2) {
		return entry1.ts > entry2.ts ? 1 : -1;
	});
};
