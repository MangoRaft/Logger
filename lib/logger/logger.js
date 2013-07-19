/*
 *
 * (C) 2013, MangoRaft.
 *
 */
var util = require('util')
var fs = require('fs')
var net = require('net')
var path = require('path');
var events = require('events')
var axon = require('axon');

var Logger = module.exports = function(options, uid, from, user, name) {
	this.uid = uid
	this.from = from
	this.user = user
	this.name = name
	this.buffer = []
	this.push = axon.socket('push')
	this.push.format('json');
	this.push.connect(options.port || 3000, options.host || 'localhost')
};

//
// Inherit from `events.EventEmitter`.
//
Logger.prototype.onData = function onData(data, from) {
	data = data.toString();
	if (data.indexOf('\n') > -1) {
		var line = this.buffer.join('');
		data = data.split('\n');
		line += data.shift();
		this.buffer = [];
		if (line.length > 0) {
			this.push.send({
				line : line,
				uid : this.uid,
				time : new Date(),
				from : from || this.from,
				user : this.user,
				name : this.name
			})
		}
		data = data.join('\n');
		if (data.length) {
			this.onData(data, from);
		}
	} else {
		this.buffer.push(data);
	}
}
Logger.prototype.log = function(from, uid, message) {
	this.push.send({
		line : message,
		uid : uid,
		time : new Date(),
		from : from,
		user : 'system',
		name : 'system'
	})
}
Logger.prototype.write = function(data, from) {
	this.onData(data, from)
}