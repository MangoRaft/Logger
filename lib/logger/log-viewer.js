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
var PassthroughStream = require('./passthrough-stream');
var WebSocket = require('ws');

module.exports.createView = function(options) {
	return new View(options);
};

var View = function(options) {
	Stream.call(this);
	this.buffer = [];
	this.options = options;
	this.readable = true;
	this.writable = false;
	this.closed = false;
	this.res = null;
	this._ws = null;

};
/***
 * Make it an event
 */
util.inherits(View, Stream);

View.prototype.start = function() {
	var self = this;
	var filter = {
		format : 'json',
		start : -1,
		end : this.options.backlog ? 2500 : 0,
		tail : true
	};
	if (this.options.ws) {
		this.ws(filter);
	} else {
		this.request(filter);
	}

};
View.prototype.end = function() {

	this.closed = true;
	if (this.res) {
		this.res.destroy();
		this.res = null;
	}
	if (this._ws) {
		this._ws.close();
		this._ws = null;
	}

};
View.prototype.ws = function(filter) {
	var self = this;
	filter.session = this.options.session;
	this._ws = new WebSocket('ws://' + this.options.host + ':' + this.options.port + '/?' + querystring.stringify(filter));
	this._ws.on('open', function() {

	});
	this._ws.on('message', function(line) {
		self.emit('data', JSON.parse(line));
	});

};
View.prototype.request = function(filter) {
	var self = this;
	var options = {
		hostname : this.options.host,
		port : this.options.port,
		path : '/sessions/' + this.options.session + '?' + querystring.stringify(filter),
		method : 'GET'
	};
	http.request(options, function(res) {
		self.res = res;
		res.on('end', function() {
			self.res = null;
			if (self.options.reconnect && !this.closed) {
				self.start();
				self.emit('reconnect');
			} else {
				self.emit('end');
			}
		});
		readline.createInterface({
			input : res,
			output : process.stdout,
			terminal : false
		}).on('line', function(line) {
			if (!this.closed)
				self.emit('data', JSON.parse(line));
		});
	}).on('error', this.emit.bind(this, 'error')).end();
};

View.prototype.format = function(item) {
	return new Date(item.ts).toISOString() + ' ' + item.source + '[' + item.channel + ']: ' + item.msg;
};

View.prototype.filter = function(options) {

	options = options || {};
	var stream = new PassthroughStream();
	this.on('data', function(item) {
		if (options.channel && (options.channel !== item.channel)) {
			if (options.channel !== item.channel.split('.')[0]) {
				return;
			}
		}
		if (options.source && options.source !== item.source) {
			return;
		}
		var format = this.format(item);

		stream.emit('json', item);
		stream.emit('line', format);
		stream.emit('data', format + '\n');
	});
	return stream;
};

