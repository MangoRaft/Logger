var logging = require('../');
var id = '04552ebb-8138-f96a-6336-617acac27fc7';


var logger = logging.Logger.createLogger({
	web : {
		host : 'localhost',
		port : 3009
	},
	udp : {
		host : 'localhost',
		port : 3009
	}
});

var workerLog = logger.create('app', 'worker.1', id);

function next() {
  var n = 100;
  while (n--) workerLog.log(id);
  setImmediate(next);
}

next();