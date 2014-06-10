var Nats = require('../')

var nats = new Nats({})
nats.subscribe('router.worker.stats', function(msg, reply, subject) {
	console.log('Msg received on [router.worker.stats] : ', msg);
});
nats.subscribe('dea.*', function(msg, reply, subject) {
	console.log('Msg received on [router.worker.stats] : ', msg);
});
