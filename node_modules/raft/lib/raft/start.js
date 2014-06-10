/*
 *
 * (C) 2013, MangoRaft.
 *
 */
var nconf = require('nconf');
var Nats = require('raft-nats');
var raft = require('../../');
var config = require('./config');

var hasStarted = false;

module.exports = function(natsUrl) {
	if (hasStarted)
		return;
	hasStarted = true;
	raft.nats = new Nats(natsUrl);

	raft.once('config', function() {
		raft.emit('start');
	});
	setTimeout(function() {
		config.load();
	}, 1000);
};
