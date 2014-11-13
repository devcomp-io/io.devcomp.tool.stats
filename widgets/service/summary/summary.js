
define([
	'./summary/d3.v3.4.13.min.js',
	'./summary/dimple.v2.1.1.js'
], function() {

	return function() {
		var self = this;

		return self.hook(
			{
				"htm": "./" + self.widget.id + ".htm"
			},
			{},
			[
				{
					resources: [ "htm" ],
					handler: function(_htm) {

						return self.setHTM(_htm).then(function (tag) {

							function renderGraph(node, data) {
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
								myChart.addMeasureAxis("y", "Requests");
								var s = myChart.addSeries("Event", dimple.plot.area);
								s.lineWeight = 1;
								s.barGap = 0.05;
								myChart.addLegend(width-legendWidth, plotMargin.top, legendWidth, height-plotMargin.top-plotMargin.bottom, "left");
								myChart.draw();
							}

							renderGraph($("DIV.graph", tag), [
							    {
							        "Time": "100",
							        "Requests": "20",
							        "Event": "requests.ok"
							    },
							    {
							        "Time": "100",
							        "Requests": "10",
							        "Event": "requests.fail"
							    },
							    {
							        "Time": "110",
							        "Requests": "30",
							        "Event": "requests.ok"
							    },
							    {
							        "Time": "110",
							        "Requests": "25",
							        "Event": "requests.fail"        
							    },
							    {
							        "Time": "120",
							        "Requests": "60",
							        "Event": "requests.ok"
							    },
							    {
							        "Time": "120",
							        "Requests": "45",
							        "Event": "requests.fail"        
							    }
							]);
						});
					}
				}
			]
		);
	};
});
