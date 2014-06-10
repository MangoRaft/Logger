var punt = require('punt');

module.exports.createMetric = function(options) {
	return new Metric(options);
};

var Metric = function(options) {
	this.options = options;
};

Metric.prototype = {
	interval : 500, // ms
	name : '',
	token : '',
	initialData : {},
	start : function() {

		if (this.interval)
			this.job = setInterval(this.run.bind(this, this.cb.bind(this)), this.interval);
		this.udp = punt.connect(this.options.host + ':' + this.options.port);
	},
	stop : function() {
		if (this.interval)
			clearInterval(this.job);
	},
	cb : function(metric) {
		this.udp.send({
			time : Date.now(),
			token : this.token,
			name : this.name,
			metric : metric
		});
	}
};

