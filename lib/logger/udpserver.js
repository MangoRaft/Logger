var punt = require('punt');
var ringBuffers = require('./ringbuffers');
var RingBuffer = require('./ringbuffer');

module.exports.createServer = function(options) {
	return new UDPServer(options);
};

function UDPServer(options) {
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
	var rb = ringBuffers[msg.token];

	if (!rb) {
		return;
	}

	rb.write({
		ts : +(msg.ts),
		token : msg.token,
		msg : msg.log
	});
};

UDPServer.prototype.start = function() {
	this.server = punt.bind(this.options.host + ':' + this.options.port);
	this.server.on('message', this.onMessage.bind(this));
};

UDPServer.prototype.stop = function() {
	this.server.sock.close();
};
