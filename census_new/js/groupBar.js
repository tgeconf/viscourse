function drawGroupBar(data_path, level){
	var n = 2,// The number of genders.
	m = 11; // The number of values per series.
	// The xz array has m elements, representing the x-values shared by all series.
	// The yz array has n elements, representing the y-values of each of the n series.
	// Each yz[i] is an array of m non-negative numbers representing a y-value for xz[i].
	// The y01z array has the same structure as yz, but with stacked [y₀, y₁] instead of y.


	d3.json("data/"+data_path+".json", function(error, data){
		if(error) throw error;
			console.log(data);

		// var xz = d3.range(m);
		var xz;
		if(level == "state"){
			xz = ["CT", "DE", "MA", "MD", "ME", "NH", "NJ", "NY", "PA", "RI", "VT"];
		}else{
			xz = new Array();
			for(var i = 0; i < data.length; i++){
				if(data[i].name == level){
					for(var j = 0; j < data[i].counties.length; j++){
						var name = data[i].counties[j].name.substring(0, data[i].counties[j].name.indexOf("County"));
						console.log(name);
						xz.push(name);
					}
				}
			}
		}
		var yz = new Array(n);
		yz[0] = new Array();
		yz[1] = new Array();

		if(level == "state"){
			data.forEach(function(d, i){
				d.counties.forEach(function(county){
					if(isNaN(yz[0][i]) || typeof(yz[0][i]) == "undefined")
						yz[0][i] = county.occupation[0].occupationNum;
					else
						yz[0][i] += county.occupation[0].occupationNum;

					if(isNaN(yz[1][i]) || typeof(yz[1][i]) == "undefined")
						yz[1][i] = county.occupation[1].occupationNum;
					else
						yz[1][i] += county.occupation[1].occupationNum;
				})
			})
		}else{
			for(var i = 0; i < data.length; i++){
				if(data[i].name == level){
					console.log(data[i]);
					for(var j = 0; j < data[i].counties.length; j++){
						var county = data[i].counties[j];

						if(isNaN(yz[0][j]) || typeof(yz[0][j]) == "undefined")
							yz[0][j] = county.occupation[0].occupationNum;
						else
							yz[0][j] += county.occupation[0].occupationNum;

						if(isNaN(yz[1][j]) || typeof(yz[1][j]) == "undefined")
							yz[1][j] = county.occupation[1].occupationNum;
						else
							yz[1][j] += county.occupation[1].occupationNum;
					}
					break;
				}
			}
			console.log(yz);
		}

		var y01z = d3.stack().keys(d3.range(n))(d3.transpose(yz));
		var yMax = d3.max(yz, function(y) { return d3.max(y); });
		var y1Max = d3.max(y01z, function(y) { return d3.max(y, function(d) { return d[1]; }); });

		var svg = d3.select("#groupBarContainer"),
		margin = {
			top: 40,
			right: 10,
			bottom: 20,
			left: 10
		},
		width = +svg.attr("width") - margin.left - margin.right,
		height = +svg.attr("height") - margin.top - margin.bottom,
		groupBar_g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var x = d3.scaleBand().domain(xz).rangeRound([0, width]).padding(0.08);

		var y = d3.scaleLinear().domain([0, y1Max]).range([height, 0]);

		var color = d3.scaleOrdinal().domain(d3.range(n)).range(["#9fdaff", "#ef7070"]);

		var series = groupBar_g.selectAll(".series")
						.data(y01z).enter().append("g")
						.attr("fill", function(d, i) {
							return color(i);
						});

		var rect = series.selectAll("rect").data(function(d) {
					return d;
				}).enter().append("rect").attr("x", function(d, i) {
					return x(xz[i]);
				}).attr("y", height).attr("width", x.bandwidth()).attr("height", 0);

		rect.transition()
			.delay(function(d, i) {
				return i * 10;
			})
			.attr("y", function(d) {
				return y(d[1]);
			})
			.attr("height", function(d) {
				return y(d[0]) - y(d[1]);
			});

		groupBar_g.append("g").attr("class", "axis axis--x").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x).tickSize(0).tickPadding(6));

		d3.selectAll("input").on("change", changed);

		var timeout = d3.timeout(function() {
			d3.select("input[value=\"grouped\"]").property("checked", true).dispatch("change");
		}, 1000);


		function changed() {
			timeout.stop();
			if (this.value === "grouped") transitionGrouped();
			else transitionStacked();
		}

		function transitionGrouped() {
			y.domain([0, yMax]);

			rect.transition().duration(500).delay(function(d, i) {
				return i * 10;
			}).attr("x",
			function(d, i) {
				return x(xz[i]) + x.bandwidth() / n * this.parentNode.__data__.key;
			}).attr("width", x.bandwidth() / n).transition().attr("y",
			function(d) {
				return y(d[1] - d[0]);
			}).attr("height",
			function(d) {
				return y(0) - y(d[1] - d[0]);
			});
		}

		function transitionStacked() {
			y.domain([0, y1Max]);

			rect.transition().duration(500).delay(function(d, i) {
				return i * 10;
			}).attr("y",
			function(d) {
				return y(d[1]);
			}).attr("height",
			function(d) {
				return y(d[0]) - y(d[1]);
			}).transition().attr("x",
			function(d, i) {
				return x(xz[i]);
			}).attr("width", x.bandwidth());
		}

	})
}

drawGroupBar("occu_architect", "state");