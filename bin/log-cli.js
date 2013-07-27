#!/usr/bin/env node

var log = require('../')
var cli = new log.Client({host:process.argv[2],port:process.argv[3]})
