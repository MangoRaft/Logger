#!/usr/bin/env node




var log = require('../')


var server = new log.Server({
	dir : process.cwd(),
	pull : {
		port : 3000
	},
	push : {
		port : 3001
	}
})
console.log('Log server running')
