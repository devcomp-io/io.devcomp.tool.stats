
const PATH = require("path");
const FS = require("fs");
// TODO: Remove this odd path once dynamic code loading finds dependency properly.
const MONGODB = require(PATH.join(__dirname, "../../node_modules/mongodb"));


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



exports.app = function (req, res, next) {

	return ensureDBConnection(function (err, db) {
		if (err) return next(err);

		return db.listCollections(function(err, collections) {
			if (err) return next(err);

			var services = {};

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

					// Ignore some collections.
					if (
						m[2] === "statsd.bad"
					) {
						return;						
					}

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
				}
			});

			function respond(body) {
				res.writeHead(200, {
					"Content-Type": "application/json",
					"Content-Length": body.length
				});
			    return res.end(body);
			}

			return respond(JSON.stringify(services, null, 4));
		});
	});
}
