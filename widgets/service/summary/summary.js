
define([
	'./summary/d3.v3.4.13.min.js',
	'./summary/dimple.v2.1.1.js'
], function() {

	return function() {
		var self = this;

		var tagContentConfig = JSON.parse(self.tagContent);

		var dataUrl = self.config.serviceBaseUri + "/io.devcomp.tool.stats/service/summary.json";
		dataUrl += "?serviceId=" + tagContentConfig.id;

		return self.hook(
			{
				"htm": "./" + self.widget.id + ".htm"
			},
			{
				"data": dataUrl
			},
			[
				{
					resources: [ "htm" ],
					streams: [ "data" ],
					handler: function(_htm, _data) {

						_data.on("data", function(summary) {

							return self.setHTM(_htm, {
								groups: summary
							}).then(function (tag) {

								function renderGraph(node, data) {

									// TODO: Better libraries for rendering complex stats?
									//       * http://code.shutterstock.com/rickshaw/
									//       * http://dc-js.github.io/dc.js/

									var width = node.width();
									var height = node.height();

									var legendWidth = 100;
									var plotMargin = {
										left: 50,
										top: 10,
										right: 20,
										bottom: 40
									};

								    var svg = dimple.newSvg(node[0], width, height);
									var myChart = new dimple.chart(svg, data);
									myChart.setBounds(plotMargin.left, plotMargin.top, width-legendWidth-plotMargin.left-plotMargin.right, height-plotMargin.top-plotMargin.bottom);
									var x = myChart.addCategoryAxis("x", ["Time"]);
									x.addOrderRule("Time", true);
									myChart.addMeasureAxis("y", "Counts");
									var s = myChart.addSeries("Event", dimple.plot.area);									
									s.lineWeight = 1;
									s.barGap = 0.05;
									myChart.addLegend(width-legendWidth, plotMargin.top, legendWidth, height-plotMargin.top-plotMargin.bottom, "left");
									myChart.draw();
								}

								var data = {};

								for (var groupId in summary) {

									data[groupId] = [];

									for (var metricId in summary[groupId]) {
										if (summary[groupId][metricId].type === "counter") {
											data[groupId] = data[groupId].concat(summary[groupId][metricId].values.map(function (value) {
												return {
											        "Time": value[0],
											        "Counts": value[1],
											        "Event": metricId
											    };												
											}));
										} else
										if (summary[groupId][metricId].type === "timer") {
											data[groupId] = data[groupId].concat(summary[groupId][metricId].values.map(function (value) {
												if (value[1] && value[1].length > 0) {
													// Average the value.
													var count = 0;
													value[1].forEach(function (val) {
														count += val;
													});
													count = Math.floor(count/value[1].length);												
													return {
												        "Time": value[0],
												        "Counts": count,
												        "Event": metricId
												    };
												}
												return null;
											}).filter(function (val) {
												return !!val;
											}));
										} else
										if (summary[groupId][metricId].type === "gauge") {
											data[groupId] = data[groupId].concat(summary[groupId][metricId].values.map(function (value) {
												return {
											        "Time": value[0],
											        "Counts": value[1],
											        "Event": metricId
											    };
											}));
										} else {
											console.error("Warning: metric type '" + summary[groupId][metricId].type + "' not supported!");
										}
									}

									data[groupId].reverse();
								}

								$("DIV.stats-graph", tag).each(function () {
									return renderGraph($(this), data[$(this).parent().attr("groupId")]);
								});
							});
						});
					}
				}
			]
		);
	};
});
