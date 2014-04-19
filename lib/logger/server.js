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
var axon = require('axon')
var clc = require('cli-color');
var raft = require('raft');

var cache = {}
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var colors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan']
var fromColors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan']

function pad(n) {
	return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

function timestamp(t) {
	var d = new Date(t);
	return [d.getDate(), months[d.getMonth()], [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds()), (d.getTime() + "").substr(-4, 4)].join(':')].join(' ');
};

var LogServer = module.exports = function(options) {
	this.pull = axon.socket('pull');
	this.pull.format('json');
	this.pull.on('message', this.onMessage.bind(this));
	this.pull.bind(options.logger.port);
	this.push = axon.socket('push');
	this.push.format('json');
	this.push.bind(options.view.port);
	this.logPath = options.logger.path;
	this.streams = {};
};

//
// Inherit from `events.EventEmitter`.
//
LogServer.prototype.onMessage = function(msg) {
	var user = msg.user
	var uid = msg.uid
	var name = msg.name
	var from = msg.from
	var time = msg.time
	var line = msg.line
	var self = this
	if (!this.streams[uid]) {
		var color = colors.shift();
		colors.push(color);
		var stream = this.streams[uid] = {
			file : fs.createWriteStream(this.logPath + '/' + user + '.' + name + '.log', {
				flags : 'a'
			}),
			color : color,
			colors : {},
			timmer : 0
		};

	} else {
		var stream = this.streams[uid];
	}
	clearTimeout(stream.timmer);
	if (!cache[from]) {
		var c = fromColors.shift();
		fromColors.push(c);
		cache[from] = c;
	}

	stream.file.write(' * ' + (timestamp(time)) + ' ' + (from) + '	[' + (uid) + ']: ' + line + '\n');
	console.log(' * ' + clc.cyan(timestamp(time)) + ' ' + clc[cache[from]](from) + '	[' + clc[stream.color](uid) + ']: ' + line)
	stream.timmer = setTimeout(function() {
		stream.file.destroy();
		delete self.streams[uid];
	}, 5 * 60 * 1000);
	this.push.send(msg)
};