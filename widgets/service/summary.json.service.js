
const PATH = require("path");
const FS = require("fs");
// TODO: Remove this odd path once dynamic code loading finds dependency properly.
const MONGODB = require(PATH.join(__dirname, "../../node_modules/mongodb"));
const WAITFOR = require(PATH.join(__dirname, "../../node_modules/waitfor"));


var pioConfig = JSON.parse(FS.readFileSync(PATH.join(__dirname, "../../../.pio.json"), "utf8"));


function ensureDBConnection(callback) {
	if (ensureDBConnection.db) {
		return callback(null, ensureDBConnection.db);
	}
	return MONGODB.MongoClient.connect('mongodb://127.0.0.1:27017/statsd', function(err, db) {
		if (err) return callback(err);
		ensureDBConnection.db = db;
		return callback(null, ensureDBConnection.db);
	});
}



function getCollectionsForService (serviceId, callback) {
	if (!getCollectionsForService.collections) {
		getCollectionsForService.collections = {};
	}
	if (getCollectionsForService.collections[serviceId]) {
		return callback(null, getCollectionsForService.collections[serviceId]);
	}

	return ensureDBConnection(function (err, db) {
		if (err) return callback(err);

		return db.listCollections(function(err, collections) {
			if (err) return callback(err);

			var services = {};

			var waitfor = WAITFOR.parallel(function (err) {
				if (err) return callback(err);
				return callback(null, services[serviceId]);
			});

			collections.forEach(function (collection) {
				var m = collection.name.match(/^statsd\.([^\.]+)\.([^_]+)(?:_(.+?))?_([^_]+)_(\d+)$/);
				if (
					m &&
					m[1] &&
					m[2] &&
					m[3] &&
					m[4] &&
					m[5]
				) {

					if (m[2] === serviceId) {

						if (!services[m[2]]) {
							services[m[2]] = {
								id: m[2],
								groups: {}
							};
						}
						if (!services[m[2]].groups[m[3]]) {
							services[m[2]].groups[m[3]] = {
								metrics: {}
							};
						}
						if (!services[m[2]].groups[m[3]].metrics[m[4]]) {
							services[m[2]].groups[m[3]].metrics[m[4]] = {
								ns: collection.name,
								interval: m[5],
								type: m[1].replace(/s$/, "")
							};
						}

						waitfor(function (done) {
							return db.collection(collection.name.replace(/^statsd\./, ""), function(err, col) {
								if (err) return done(err);

								services[m[2]].groups[m[3]].metrics[m[4]].collection = col;

								return done();
							});
						});
					}
				}
			});

			return waitfor();
		});
	});
}

exports.app = function (req, res, next) {

	return getCollectionsForService(req.query.serviceId, function (err, service) {
		if (err) return next(err);

		var summary = {};

		var waitfor = WAITFOR.serial(function (err) {
			if (err) {
				console.error(err.stack);
				return next(err);
			}

			function respond(body) {
				res.writeHead(200, {
					"Content-Type": "application/json",
					"Content-Length": body.length,
	                "Cache-Control": "max-age=10"  // seconds
				});
			    return res.end(body);
			}

			return respond(JSON.stringify(summary, null, 4));
		});

		for (var groupId in service.groups) {

			console.log("groupId", groupId);

			summary[groupId] = {};

			for (var metricId in service.groups[groupId].metrics) {

				console.log("metricId", metricId);

				waitfor(groupId, metricId, function (groupId, metricId, done) {

					console.log("process", "groupId", groupId, "metricId", metricId);

					var metric = service.groups[groupId].metrics[metricId];

					summary[groupId][metricId] = {
						type: metric.type
					};

					if (metric.type === "counter") {

						return metric.collection.find({
							time: {
								$gt: Math.floor(Date.now()/1000 - 60 * 5)
							}
						}).sort({
							time: -1
						}).toArray(function(err, samples) {
							if (err) return done(err);

							summary[groupId][metricId].values = samples.map(function(sample) {
								return [
									sample.time,
									sample.count
								];
							});

							return done();
						});
 
					} else
					if (metric.type === "timer") {

						return metric.collection.find({
							time: {
								$gt: Math.floor(Date.now()/1000 - 60 * 5)
							}
						}).sort({
							time: -1
						}).toArray(function(err, samples) {
							if (err) return done(err);

							summary[groupId][metricId].values = samples.map(function(sample) {
								if (!sample.durations || sample.durations.length === 0) {
									return null;
								}
								return [
									sample.time,
									sample.durations
								];
							}).filter(function (val) {
								return !!val;
							});

							return done();
						});
					} else
					if (metric.type === "gauge") {

						return metric.collection.find({
							time: {
								$gt: Math.floor(Date.now()/1000 - 60 * 5)
							}
						}).sort({
							time: -1
						}).toArray(function(err, samples) {
							if (err) return done(err);
							summary[groupId][metricId].values = samples.map(function(sample) {
								if (!sample.gauge) {
									return null;
								}
								return [
									sample.time,
									sample.gauge
								];
							}).filter(function (val) {
								return !!val;
							});
							return done();
						});

					} else {
						console.error("Warning: Unknown metric type", metric.type);
						return done();
					}
				});
			}
		}

		return waitfor();
	});
}
