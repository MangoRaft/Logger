/*
 *
 * (C) 2013, MangoRaft.
 *
 */
var util = require('util');
var fs = require('fs');
var net = require('net');
var path = require('path');
var events = require('events');
var querystring = require('querystring');
var EventEmitter = require('eventemitter2').EventEmitter2;
var Stream = require('stream');
var http = require('http');
var readline = require('readline');

module.exports.createView = function(options) {
	return new View(options);
};

var View = function(options) {
	Stream.call(this);
	this.buffer = [];
	this.options = options;
	this.readable = true;
	this.writable = false;

};
/***
 * Make it an event
 */
util.inherits(View, Stream);

View.prototype.start = function() {
	var self = this;
	var filter = {
		format : 'json',
		num : 0,
		tail : true
	};

	this.request(filter, function(line) {
		self.emit('data', JSON.parse(line));
	});

};
View.prototype.request = function(filter, onLine) {
	var options = {
		hostname : this.options.host,
		port : this.options.port,
		path : '/sessions/' + this.options.session + '?' + querystring.stringify(filter),
		method : 'GET'
	};
	http.request(options, function(res) {
		readline.createInterface({
			input : res,
			output : process.stdout,
			terminal : false
		}).on('line', onLine);
	}).on('error', this.emit.bind(this, 'error')).end();
};

View.prototype.format = function(item) {
	return new Date(item.ts).toISOString() + ' ' + item.source + '[' + item.channel + ']: ' + item.msg;
};

View.prototype.filter = function(options) {
	var emitter = new EventEmitter({
		wildcard : false,
		newListener : false,
	});
	this.on('data', function(item) {
		if (options.channel && (options.channel !== item.channel)) {
			if (options.channel !== item.channel.split('.')[0]) {
				return;
			}
		}
		if (options.source && options.source !== item.source) {
			return;
		}
		emitter.emit('line', item);
	});
	return emitter;
};

