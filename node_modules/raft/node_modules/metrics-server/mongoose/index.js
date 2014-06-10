/***
 * Node modules
 */

var events = require('events');
var util = require('util');
var path = require('path');
var fs = require('fs');

//
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 *
 */
var Mongoose = module.exports = {};

Mongoose.hasStart = false;
Mongoose.start = function(options) {
	if (Mongoose.hasStart) {
		return;
	}
	Mongoose.hasStart = true;

	var uri = 'mongodb://';

	if (options.username && options.password) {
		uri += options.username + ':' + options.password + '@';
	}

	uri += (options.host || 'localhost' ) + ':' + (options.port || '27017') + (options.path || '/data/db');

	console.log('Mongodb connecting [' + uri + ']');
	mongoose.connect(uri);

	mongoose.connection.once('open', function() {
		console.log('Mongodb open [' + uri + ']');
	});
	mongoose.connection.on('close', function() {
		console.log('Mongodb close [' + uri + ']');
		mongoose.connect(uri);
	});
	var files = fs.readdirSync(__dirname + '/schema');
	console.log('Mongodb laoding schemas [' + files.join(', ') + ']');

	for (var i = 0; i < files.length; i++) {
		var filePath = __dirname + '/schema/' + files[i];
		var fileName = files[i].split('.')[0];
		console.log('Mongodb laoding schema (' + fileName + ') - [' + path.basename(filePath) + ']');
		Mongoose[fileName] = require(filePath);
	};
};
