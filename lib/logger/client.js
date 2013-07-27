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
var clc = require('cli-color');

var cache = {}
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var colors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan']
var fromColors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan']

function pad(n) {
	return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

function timestamp(t) {
	var d = new Date(t);
	return [[pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds()), (d.getTime() + "").substr(-4, 4)].join(':')].join(' ');
};

var Client = module.exports = function(options) {
	options = options || {}
	this.pull = axon.socket('pull')
	this.pull.on('close', function() {
		console.log('error connection closed')
	})
	this.pull.on('error', function(error) {
		console.log('error ', error)
	})
	this.pull.on('reconnect attempt', function() {
		console.log('error connection reconnect attempt')
	})
	this.pull.format('json');
	console.log(options)
	this.pull.connect(options.port || 3001, options.host || 'localhost')
	var self = this;
	this.streams = {}
	this.pull.on('message', function(msg) {
		var user = msg.user
		var uid = msg.uid
		var name = msg.name
		var from = msg.from
		var time = msg.time
		var line = msg.line
		if (!self.streams[uid]) {
			var color = colors.shift()
			colors.push(color)
			var stream = self.streams[uid] = {
				color : color,
				colors : {},
				timmer : 0
			}

		} else {
			var stream = self.streams[uid]
		}
		if (!cache[from]) {
			var c = fromColors.shift()
			fromColors.push(c)
			cache[from] = c
		}
		console.log(' * ' + clc.cyan(timestamp(time)) + '[' + clc[cache[from]](name) + '	]' + clc[stream.color](uid) + ':' + clc[cache[from]](from) + '	: ' + line)
	})
};
