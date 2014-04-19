var punt = require('punt');
var raft = require('raft');
var ringBuffers = require('./ringbuffers');
var RingBuffer = require('./ringbuffer');

module.exports.createServer = function(options) {
	return new UDPServer(options);
};

function UDPServer(options) {
	this.options = options;
};

UDPServer.prototype.onMessage = function(msg) {
	var ts = msg.ts;
	var token = msg.token;
	var logmsg = msg.log;

	var rb = ringBuffers[token];

	if (!rb) {
		return;
	}

	var entry = {
		ts : +(ts),
		token : token,
		msg : logmsg
	};
	rb.add(entry);
};

UDPServer.prototype.start = function() {
	this.server = punt.bind(raft.common.ipAddress() + ':' + raft.config.get('logs:udp:port'));
	this.server.on('message', this.onMessage.bind(this));
};

UDPServer.prototype.stop = function() {
	this.server.sock.close();
};
