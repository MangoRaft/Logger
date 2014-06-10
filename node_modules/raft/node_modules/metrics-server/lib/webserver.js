var fs = require('fs');
var express = require('express');
var socketio = require('socket.io');
var raft = require('raft');
var mongoose = require('../mongoose');

module.exports.createServer = function(options) {
	return new Server(options);
};

function Server(options) {
	this.options = options;

};

Server.prototype.registerServer = function() {
	var app = this.app = express();
	var self = this;
	// respond
	var server = require('http').createServer(app);

	if (this.options.udp) {
		this.registerUdpServer(server);
	}

	app.get("/metric/:token", this.getMetric.bind(this));
	app.get("/metric/:token/count", this.getMetricCount.bind(this));
	server.listen(this.options.port, this.options.host);
};

Server.prototype.getMetricCount = function(req, res) {
	var token = req.params.token;

	var from = req.query.from;
	var to = req.query.to;
	var name = req.query.name;

	var query = {
		token : token
	};

	if (name) {
		query.name = name;
	}

	if (from) {
		query.time = {
			"$gte" : new Date(from)
		};
		if (to) {
			query.time['$lt'] = new Date(to);
		}
	}

	mongoose.Metric.count(query, function(err, count) {
		res.json({
			count : count
		});
	});

};

Server.prototype.getMetric = function(req, res) {

	var token = req.params.token;

	var from = req.query.from;
	var to = req.query.to;
	var name = req.query.name;

	var limit = req.query.limit || 1000;

	if (limit > 10000) {
		limit = 10000;
	}

	var query = {
		token : token
	};

	if (name) {
		query.name = name;
	}

	if (from) {
		query.time = {
			"$gte" : new Date(from)
		};
		if (to) {
			query.time['$lt'] = new Date(to);
		}
	}

	mongoose.Metric.find(query).sort({
		'time' : -1
	}).limit(limit).exec(function(err, metrics) {
		if (err) {
			return cb(err);
		}

		var _metrics = {};

		metrics.forEach(function(metric) {
			_metrics[metric.name] = _metrics[metric.name] || [];

			_metrics[metric.name].push({
				time : metric.time,
				metric : metric.metric
			});
		});

		res.json(_metrics);
	});

};
Server.prototype.registerUdpServer = function(server) {

	var udp = this.options.udp;

	var io = this.io = socketio.listen(server);
	io.set('log level', 1);
	io.sockets.on('connection', function(socket) {
		socket.on('room', function(room) {
			socket.join(room);
		});
	});
	udp.on('metric', function(metric) {
		io.sockets['in'](metric.token).volatile.emit('metric', metric);
	});
};
Server.prototype.start = function() {
	mongoose.start(this.options.mongodb || {});
	this.registerServer();
};

Server.prototype.stop = function() {

};

