
const STATSD = require("node-statsd");
const SPAWN = require('child_process').spawn;

require("io.pinf.server.www").for(module, __dirname, function(app, config, HELPERS) {

	var groups = [
		"cpu",
		"os",
		"paging",
		"net",
		"disk"
	];
	var statsdClients = {};
	groups.forEach(function (group) {
		statsdClients[group] = new STATSD.StatsD({
			host: '127.0.0.1',
			port: 8118,
			prefix: "io.devcomp.tool.stats_system." + group + "_"
		});
		statsdClients[group].socket.on('error', function (err) {
		  return console.error("Error in socket: ", err.stack);
		});
	});
	var proc = SPAWN('dstat', [
		'-a',
		'--nocolor'
	]);
	proc.stdout.on('data', function(data) {

		var values = data.toString().replace(/\|/g, "").replace(/\s+/g, " ").replace(/(^\s|\s$)/g, "").split(/\s/);

		if (values.length !== 14) return;

		function grabValue (format) {
			var val = values.pop();
			if (format === "bytes") {
				if (/B$/.test(val)) {
					val = val.replace(/B$/, "");
				} else
				if (/k$/.test(val)) {
					val = val.replace(/k$/, "") * 1000;
				}
			}
			return val;
		}

		statsdClients.os.gauge("csw", grabValue());
		statsdClients.os.gauge("int", grabValue());

		statsdClients.paging.gauge("out", grabValue());
		statsdClients.paging.gauge("in", grabValue());

		statsdClients.net.gauge("send", grabValue("bytes"));
		statsdClients.net.gauge("recv", grabValue("bytes"));

		statsdClients.disk.gauge("write", grabValue("bytes"));
		statsdClients.disk.gauge("read", grabValue("bytes"));

		statsdClients.cpu.gauge("siq", grabValue());
		statsdClients.cpu.gauge("hig", grabValue());
		statsdClients.cpu.gauge("wai", grabValue());
		statsdClients.cpu.gauge("idl", grabValue());
		statsdClients.cpu.gauge("sys", grabValue());
		statsdClients.cpu.gauge("usr", grabValue());
	});


/*
	// Generate some dev data.
	var client = new STATSD.StatsD({
		host: '127.0.0.1',
		port: 8118,
		prefix: 'io.devcomp.tool.stats_sample_'
	});
	client.socket.on('error', function (err) {
	  return console.error("Error in socket: ", err.stack);
	});
	function recordRequest() {
		client.increment('requests');
		client.timing('response.time', 20 + Math.floor(100 * Math.random()));
		client.timing('response.time2', 20 + Math.floor(100 * Math.random()) - 10);
		setTimeout(function() {
			recordRequest();
		}, Math.random() * 1000 );
	}
	recordRequest();
*/

});
