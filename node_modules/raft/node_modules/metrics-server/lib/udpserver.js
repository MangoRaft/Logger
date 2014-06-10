var util = require('util');
var events = require('events');

var punt = require('punt');
var raft = require('raft');
var mongoose = require('../mongoose');

module.exports.createServer = function(options) {
	return new UDPServer(options);
};

function UDPServer(options) {
	events.EventEmitter.call(this);
	this.options = options;
};
//
// Inherit from `events.EventEmitter`.
//
util.inherits(UDPServer, events.EventEmitter);

UDPServer.prototype.onMessage = function(msg) {

	var time = msg.time;
	var metric = msg.metric;
	var token = msg.token;
	var name = msg.name;

	var item = {
		time : time,
		metric : metric,
		token : token,
		name : name
	};

	new mongoose.Metric(item).save(function() {

	});
	this.emit('metric', item)
};

UDPServer.prototype.start = function() {
	mongoose.start(this.options.mongodb || {});
	this.server = punt.bind('127.0.0.1:4001');
	this.server.on('message', this.onMessage.bind(this));
};

UDPServer.prototype.stop = function() {
	this.server.sock.close();
};
