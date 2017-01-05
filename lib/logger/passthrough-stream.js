var Stream = require('stream').Stream;
var util = require('util');

module.exports = PassthroughStream;
function PassthroughStream() {
	this.writable = true;
	this.readable = true;
}

util.inherits(PassthroughStream, Stream);


PassthroughStream.prototype.write = function(data) {
	this.emit('data', data);
};

PassthroughStream.prototype.end = function() {
	this.emit('end');
};

PassthroughStream.prototype.resume = function() {
	this.emit('resume');
};

PassthroughStream.prototype.destroy = function() {
	this.emit('close');
};