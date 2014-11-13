
const STATSD = require("node-statsd");
const MONGODB = require('mongodb');


require("io.pinf.server.www").for(module, __dirname, function(app, config, HELPERS) {


	var db = null;
	MONGODB.MongoClient.connect('mongodb://127.0.0.1:27017/statsd', function(err, _db) {
		console.log("err", err.stack);
		throw err;
		db = _db;
	});

	app.get("/api/values/:ns", function (req, res, next) {
//'counters.io.devcomp.tool.stats_sample_requests_15'
		return db.collection(req.params[ns]).find({
			time: {
				$gt: (Date.now()/1000 - 60 * 5)
			}
		}).sort({
			time: -1
		}).toArray(function(err, samples) {

console.log("samples", samples);

			var counts = samples.map(function(sample) {
				return [
					sample.time,
					sample.count
				];
			});

console.log("counts", counts);

		});
	/*
		var responseTimeCollection = db.collection('timers.io.devcomp.tool.stats_sample_response.time_15');

	responseTimeCollection.find({}).sort( { time: -1 } ).limit( 4 ).toArray(function(err, docs) {

		console.log("responseTimeCollection", 'timers.io.devcomp.tool.stats_sample_response.time_15');
	    console.dir(docs)
	});
	*/

	});



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
		setTimeout(function() {
			recordRequest();
		}, Math.random() * 1000 );
	}
	recordRequest();

});

