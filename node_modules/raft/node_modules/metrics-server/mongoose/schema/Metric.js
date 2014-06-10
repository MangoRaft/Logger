/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Metric = new Schema({
	time : {
		type : Date,
		required : true,
		'default' : Date.now
	},
	metric : Number,
	name : String,
	token : String
});

module.exports = mongoose.model('Metric', Metric);

module.exports.remove(function(){})
