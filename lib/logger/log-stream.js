var fs = require('fs');

var net = require('net');
var http = require('http');

var events = require('events');
var __slice = [].slice
var LogHarvester = module.exports = function(nodeName) {

	this.nodeName = nodeName;
	this.server = {
		host : '0.0.0.0',
		port : 28777
	};
	this.delim = '\r\n';
	this._log = console;
	this.logStreams = [];
};

LogHarvester.prototype.run = function() {
	var _this = this;
	this._connect();
};

LogHarvester.prototype._connect = function() {
	var _this = this;
	this.socket = new net.Socket;
	this.socket.on('error', function(error) {
		_this._connected = false;
		_this._log.error("Unable to connect server, trying again...");
		return setTimeout((function() {
			return _this._connect();
		}), 2000);
	});
	this._log.info("Connecting to server...");
	return this.socket.connect(this.server.port, this.server.host, function() {
		_this._connected = true;
		return _this._announce();
	});
};

LogHarvester.prototype._sendLog = function(name, msg) {
	//this._log.log("Sending log: (" + name + ") " + msg);
	return this._send('+log', name, this.nodeName, 'info', msg);
};

LogHarvester.prototype._announce = function() {

	return this._send('+bind', 'node', this.nodeName);
};

LogHarvester.prototype.announce = function(snames) {

	this._log.info("Announcing: " + this.nodeName + " (" + snames + ")");
	this._send('+node', this.nodeName, snames);
};

LogHarvester.prototype._send = function() {
	var args, mtype;
	mtype = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
	return this.socket.write("" + mtype + "|" + (args.join('|')) + this.delim);
};
