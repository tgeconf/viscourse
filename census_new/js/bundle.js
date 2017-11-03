var drawMapData;

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var d3_composite = require("d3-composite-projections");
var d3_geo = require("d3-geo");
var d3_request = require("d3-request");
var d3_selection = require("d3-selection");
var d3_transition = require("d3-transition");
var topojson = require("topojson");

drawMapData = function drawMap(data_path){
	var width = 960;
	var height = 600;
	//var color = d3.scaleOrdinal(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);
	var color = d3.scaleOrdinal(["#9fdaff", "#ef7070"]);
	var projection = d3_composite.geoAlbersUsa();

	var path = d3_geo.geoPath()
		.projection(projection);

	var svg = d3_selection.select("#mapContainer")
		.attr("width", width)
		.attr("height", height);

	var t = d3_transition.transition()
		.on("interrupt", function(d,i){
			console.info(i);
		});

	var divs = $("div.tooltips");

	if (divs.length === 0) {
	  var div = d3_selection.select("body")
	    .append("div")
	    .attr("class", "tooltips")
	    .style("opacity", 0);
	} else {
	  var div = d3_selection.select("div.tooltips");
	}

	var id_name_map = {
						0: null
				};

	var config2 = {};
			config2.state = "name";
			config2.population = "population";
			config2.counties = "counties";

	//prepare pie data
	var pie_data = {};
	var radius;
	d3_request.json("data/"+data_path+".json", function(error, stateSum){
		var maxPopulation = d3.max(stateSum, function(d){return d.population});
		var minPopulation = d3.min(stateSum, function(d){return d.population});
		radius = d3.scaleLinear().domain([minPopulation, maxPopulation]).range([5,15]);
		stateSum.forEach(function(d) {
				pie_data[d[config2.state]] = {};
				pie_data[d[config2.state]].population = d[config2.population];
				pie_data[d[config2.state]].counties = d[config2.counties];
		})
	});


	d3_request.tsv("data/us-state-names.tsv", function(error, names) {
		for (var i = 0; i < names.length; i++) {
			id_name_map[names[i].id] = names[i];
		}
	})


	d3_request.json("data/us.json", function(error, topojsonData) {
		var us = topojson.feature(topojsonData, topojsonData.objects.states);
	  var g = svg.append("g");
	  g.append("g")
	    .selectAll("path")
			.data(us.features)
			.enter()
			.append("path")
			.attr("d", path)
			.attr("class","region")
			.style("fill", "#eee")
			.style("stroke", "#fff")
			.style("stroke-width", "2px")
			.on("mouseover", function(d,i) {
			d3_selection.select(this)
				.transition(t)
				.style("fill", "#ccc");
			})
			.on("mouseout", function(d,i) {
			d3_selection.select(this).interrupt();
			d3_selection.select(this)
				.transition(t)
				.style("fill", "#eee");
			});

		svg.selectAll('.region')
			.append("path")
			.attr("d", path)
			.attr("centroid", function(d) {
				var centroid = path.centroid(d);

				if (pie_data[id_name_map[d.id].code]) {
	  			centroid[1] = centroid[1];
	  			pie_data[id_name_map[d.id].code].centroid = centroid;
				}
			});

		var pie = d3.pie()
		    .sort(null)
		    .value(function(d) { return d.occupationNum; });
		
		for(var state in pie_data){
			var pie_path = d3.arc()
			    .outerRadius(radius(pie_data[state].population))
			    .innerRadius(0);

			g_pie = g.append("g")
				.attr("class", "pie_container")
				.attr("transform", function(d){
					var centroid = pie_data[state].centroid;
					return "translate(" + centroid + ")";
				});

			//statistic for the occupation number of male and female in current job
			var maleFemaleOccupation = new Array();
			maleFemaleOccupation[0] = {};
			maleFemaleOccupation[0].gender = "male";
			maleFemaleOccupation[0].location = state;
			maleFemaleOccupation[0].population = pie_data[state].population;
			maleFemaleOccupation[0].occupationNum = 0;
			maleFemaleOccupation[0].addInfo = 0;
			maleFemaleOccupation[1] = {};
			maleFemaleOccupation[1].gender = "female";
			maleFemaleOccupation[1].location = state;
			maleFemaleOccupation[1].population = pie_data[state].population;
			maleFemaleOccupation[1].occupationNum = 0;
			maleFemaleOccupation[1].addInfo = 0;

			for(var i = 0; i < pie_data[state].counties.length; i++){
				maleFemaleOccupation[0].occupationNum += pie_data[state].counties[i].occupation[0].occupationNum;
				maleFemaleOccupation[0].addInfo += pie_data[state].counties[i].occupation[1].occupationNum;

				maleFemaleOccupation[1].occupationNum += pie_data[state].counties[i].occupation[1].occupationNum;
				maleFemaleOccupation[1].addInfo += pie_data[state].counties[i].occupation[0].occupationNum;
			}

			var arc = g_pie.selectAll(".arc")
					.data(pie(maleFemaleOccupation))
					.enter().append("g")
					.attr("class", "arc")
					.on("mouseover", function(d) {
						d3_selection.select(this)
							.style("opacity", "0.8");
						if(d.data.gender == "male"){
							document.getElementById("maleNum").innerHTML = d.data.occupationNum;
							document.getElementById("femaleNum").innerHTML = d.data.addInfo;
						}else{
							document.getElementById("maleNum").innerHTML = d.data.addInfo;
							document.getElementById("femaleNum").innerHTML = d.data.occupationNum;
						}
						document.getElementById("locationName").innerHTML = d.data.location;
						document.getElementById("population").innerHTML = d.data.population;
						document.getElementById("groupBarContainer").innerHTML = "";
						drawGroupBar(job, d.data.location);
					})
					.on("mouseout", function(d) {
						d3_selection.select(this)
							.style("opacity", "1");
					});
			maleFemaleOccupation.forEach(function(jobOccupation){
				arc.append("path")
					.attr("d", pie_path)
					.attr("fill", function(d){return color(d.data.gender)});
					//.attr("fill", color(jobOccupation.jobName));
			})
		}
		
		//opening animation
		openingAnimation(g);
	});

	function openingAnimation(inputG){
		var centroid = pie_data["NY"].centroid;

		var x = centroid[0];
	    var y = centroid[1];
	    var k = 3;

	    inputG.transition()
	      .duration(1000)
	      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
	      .style("stroke-width", 1.5 / k + "px");
	}
}

drawMapData("occu_architect");


},{"d3-composite-projections":5,"d3-geo":10,"d3-request":13,"d3-selection":14,"d3-transition":16,"topojson":17}],2:[function(require,module,exports){
// https://d3js.org/d3-array/ Version 1.0.1. Copyright 2016 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
}(this, function (exports) { 'use strict';

	function ascending(a, b) {
	return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
	}

	function bisector(compare) {
	if (compare.length === 1) compare = ascendingComparator(compare);
	return {
		left: function(a, x, lo, hi) {
		if (lo == null) lo = 0;
		if (hi == null) hi = a.length;
		while (lo < hi) {
			var mid = lo + hi >>> 1;
			if (compare(a[mid], x) < 0) lo = mid + 1;
			else hi = mid;
		}
		return lo;
		},
		right: function(a, x, lo, hi) {
		if (lo == null) lo = 0;
		if (hi == null) hi = a.length;
		while (lo < hi) {
			var mid = lo + hi >>> 1;
			if (compare(a[mid], x) > 0) hi = mid;
			else lo = mid + 1;
		}
		return lo;
		}
	};
	}

	function ascendingComparator(f) {
	return function(d, x) {
		return ascending(f(d), x);
	};
	}

	var ascendingBisect = bisector(ascending);
	var bisectRight = ascendingBisect.right;
	var bisectLeft = ascendingBisect.left;

	function descending(a, b) {
	return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
	}

	function number(x) {
	return x === null ? NaN : +x;
	}

	function variance(array, f) {
	var n = array.length,
		m = 0,
		a,
		d,
		s = 0,
		i = -1,
		j = 0;

	if (f == null) {
		while (++i < n) {
		if (!isNaN(a = number(array[i]))) {
			d = a - m;
			m += d / ++j;
			s += d * (a - m);
		}
		}
	}

	else {
		while (++i < n) {
		if (!isNaN(a = number(f(array[i], i, array)))) {
			d = a - m;
			m += d / ++j;
			s += d * (a - m);
		}
		}
	}

	if (j > 1) return s / (j - 1);
	}

	function deviation(array, f) {
	var v = variance(array, f);
	return v ? Math.sqrt(v) : v;
	}

	function extent(array, f) {
	var i = -1,
		n = array.length,
		a,
		b,
		c;

	if (f == null) {
		while (++i < n) if ((b = array[i]) != null && b >= b) { a = c = b; break; }
		while (++i < n) if ((b = array[i]) != null) {
		if (a > b) a = b;
		if (c < b) c = b;
		}
	}

	else {
		while (++i < n) if ((b = f(array[i], i, array)) != null && b >= b) { a = c = b; break; }
		while (++i < n) if ((b = f(array[i], i, array)) != null) {
		if (a > b) a = b;
		if (c < b) c = b;
		}
	}

	return [a, c];
	}

	var array = Array.prototype;

	var slice = array.slice;
	var map = array.map;

	function constant(x) {
	return function() {
		return x;
	};
	}

	function identity(x) {
	return x;
	}

	function range(start, stop, step) {
	start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

	var i = -1,
		n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
		range = new Array(n);

	while (++i < n) {
		range[i] = start + i * step;
	}

	return range;
	}

	var e10 = Math.sqrt(50);
	var e5 = Math.sqrt(10);
	var e2 = Math.sqrt(2);
	function ticks(start, stop, count) {
	var step = tickStep(start, stop, count);
	return range(
		Math.ceil(start / step) * step,
		Math.floor(stop / step) * step + step / 2, // inclusive
		step
	);
	}

	function tickStep(start, stop, count) {
	var step0 = Math.abs(stop - start) / Math.max(0, count),
		step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
		error = step0 / step1;
	if (error >= e10) step1 *= 10;
	else if (error >= e5) step1 *= 5;
	else if (error >= e2) step1 *= 2;
	return stop < start ? -step1 : step1;
	}

	function sturges(values) {
	return Math.ceil(Math.log(values.length) / Math.LN2) + 1;
	}

	function histogram() {
	var value = identity,
		domain = extent,
		threshold = sturges;

	function histogram(data) {
		var i,
			n = data.length,
			x,
			values = new Array(n);

		for (i = 0; i < n; ++i) {
		values[i] = value(data[i], i, data);
		}

		var xz = domain(values),
			x0 = xz[0],
			x1 = xz[1],
			tz = threshold(values, x0, x1);

		// Convert number of thresholds into uniform thresholds.
		if (!Array.isArray(tz)) tz = ticks(x0, x1, tz);

		// Remove any thresholds outside the domain.
		var m = tz.length;
		while (tz[0] <= x0) tz.shift(), --m;
		while (tz[m - 1] >= x1) tz.pop(), --m;

		var bins = new Array(m + 1),
			bin;

		// Initialize bins.
		for (i = 0; i <= m; ++i) {
		bin = bins[i] = [];
		bin.x0 = i > 0 ? tz[i - 1] : x0;
		bin.x1 = i < m ? tz[i] : x1;
		}

		// Assign data to bins by value, ignoring any outside the domain.
		for (i = 0; i < n; ++i) {
		x = values[i];
		if (x0 <= x && x <= x1) {
			bins[bisectRight(tz, x, 0, m)].push(data[i]);
		}
		}

		return bins;
	}

	histogram.value = function(_) {
		return arguments.length ? (value = typeof _ === "function" ? _ : constant(_), histogram) : value;
	};

	histogram.domain = function(_) {
		return arguments.length ? (domain = typeof _ === "function" ? _ : constant([_[0], _[1]]), histogram) : domain;
	};

	histogram.thresholds = function(_) {
		return arguments.length ? (threshold = typeof _ === "function" ? _ : Array.isArray(_) ? constant(slice.call(_)) : constant(_), histogram) : threshold;
	};

	return histogram;
	}

	function quantile(array, p, f) {
	if (f == null) f = number;
	if (!(n = array.length)) return;
	if ((p = +p) <= 0 || n < 2) return +f(array[0], 0, array);
	if (p >= 1) return +f(array[n - 1], n - 1, array);
	var n,
		h = (n - 1) * p,
		i = Math.floor(h),
		a = +f(array[i], i, array),
		b = +f(array[i + 1], i + 1, array);
	return a + (b - a) * (h - i);
	}

	function freedmanDiaconis(values, min, max) {
	values = map.call(values, number).sort(ascending);
	return Math.ceil((max - min) / (2 * (quantile(values, 0.75) - quantile(values, 0.25)) * Math.pow(values.length, -1 / 3)));
	}

	function scott(values, min, max) {
	return Math.ceil((max - min) / (3.5 * deviation(values) * Math.pow(values.length, -1 / 3)));
	}

	function max(array, f) {
	var i = -1,
		n = array.length,
		a,
		b;

	if (f == null) {
		while (++i < n) if ((b = array[i]) != null && b >= b) { a = b; break; }
		while (++i < n) if ((b = array[i]) != null && b > a) a = b;
	}

	else {
		while (++i < n) if ((b = f(array[i], i, array)) != null && b >= b) { a = b; break; }
		while (++i < n) if ((b = f(array[i], i, array)) != null && b > a) a = b;
	}

	return a;
	}

	function mean(array, f) {
	var s = 0,
		n = array.length,
		a,
		i = -1,
		j = n;

	if (f == null) {
		while (++i < n) if (!isNaN(a = number(array[i]))) s += a; else --j;
	}

	else {
		while (++i < n) if (!isNaN(a = number(f(array[i], i, array)))) s += a; else --j;
	}

	if (j) return s / j;
	}

	function median(array, f) {
	var numbers = [],
		n = array.length,
		a,
		i = -1;

	if (f == null) {
		while (++i < n) if (!isNaN(a = number(array[i]))) numbers.push(a);
	}

	else {
		while (++i < n) if (!isNaN(a = number(f(array[i], i, array)))) numbers.push(a);
	}

	return quantile(numbers.sort(ascending), 0.5);
	}

	function merge(arrays) {
	var n = arrays.length,
		m,
		i = -1,
		j = 0,
		merged,
		array;

	while (++i < n) j += arrays[i].length;
	merged = new Array(j);

	while (--n >= 0) {
		array = arrays[n];
		m = array.length;
		while (--m >= 0) {
		merged[--j] = array[m];
		}
	}

	return merged;
	}

	function min(array, f) {
	var i = -1,
		n = array.length,
		a,
		b;

	if (f == null) {
		while (++i < n) if ((b = array[i]) != null && b >= b) { a = b; break; }
		while (++i < n) if ((b = array[i]) != null && a > b) a = b;
	}

	else {
		while (++i < n) if ((b = f(array[i], i, array)) != null && b >= b) { a = b; break; }
		while (++i < n) if ((b = f(array[i], i, array)) != null && a > b) a = b;
	}

	return a;
	}

	function pairs(array) {
	var i = 0, n = array.length - 1, p = array[0], pairs = new Array(n < 0 ? 0 : n);
	while (i < n) pairs[i] = [p, p = array[++i]];
	return pairs;
	}

	function permute(array, indexes) {
	var i = indexes.length, permutes = new Array(i);
	while (i--) permutes[i] = array[indexes[i]];
	return permutes;
	}

	function scan(array, compare) {
	if (!(n = array.length)) return;
	var i = 0,
		n,
		j = 0,
		xi,
		xj = array[j];

	if (!compare) compare = ascending;

	while (++i < n) if (compare(xi = array[i], xj) < 0 || compare(xj, xj) !== 0) xj = xi, j = i;

	if (compare(xj, xj) === 0) return j;
	}

	function shuffle(array, i0, i1) {
	var m = (i1 == null ? array.length : i1) - (i0 = i0 == null ? 0 : +i0),
		t,
		i;

	while (m) {
		i = Math.random() * m-- | 0;
		t = array[m + i0];
		array[m + i0] = array[i + i0];
		array[i + i0] = t;
	}

	return array;
	}

	function sum(array, f) {
	var s = 0,
		n = array.length,
		a,
		i = -1;

	if (f == null) {
		while (++i < n) if (a = +array[i]) s += a; // Note: zero and null are equivalent.
	}

	else {
		while (++i < n) if (a = +f(array[i], i, array)) s += a;
	}

	return s;
	}

	function transpose(matrix) {
	if (!(n = matrix.length)) return [];
	for (var i = -1, m = min(matrix, length), transpose = new Array(m); ++i < m;) {
		for (var j = -1, n, row = transpose[i] = new Array(n); ++j < n;) {
		row[j] = matrix[j][i];
		}
	}
	return transpose;
	}

	function length(d) {
	return d.length;
	}

	function zip() {
	return transpose(arguments);
	}

	exports.bisect = bisectRight;
	exports.bisectRight = bisectRight;
	exports.bisectLeft = bisectLeft;
	exports.ascending = ascending;
	exports.bisector = bisector;
	exports.descending = descending;
	exports.deviation = deviation;
	exports.extent = extent;
	exports.histogram = histogram;
	exports.thresholdFreedmanDiaconis = freedmanDiaconis;
	exports.thresholdScott = scott;
	exports.thresholdSturges = sturges;
	exports.max = max;
	exports.mean = mean;
	exports.median = median;
	exports.merge = merge;
	exports.min = min;
	exports.pairs = pairs;
	exports.permute = permute;
	exports.quantile = quantile;
	exports.range = range;
	exports.scan = scan;
	exports.shuffle = shuffle;
	exports.sum = sum;
	exports.ticks = ticks;
	exports.tickStep = tickStep;
	exports.transpose = transpose;
	exports.variance = variance;
	exports.zip = zip;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
},{}],3:[function(require,module,exports){
// https://d3js.org/d3-collection/ Version 1.0.1. Copyright 2016 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
}(this, function (exports) { 'use strict';

	var prefix = "$";

	function Map() {}

	Map.prototype = map.prototype = {
	constructor: Map,
	has: function(key) {
		return (prefix + key) in this;
	},
	get: function(key) {
		return this[prefix + key];
	},
	set: function(key, value) {
		this[prefix + key] = value;
		return this;
	},
	remove: function(key) {
		var property = prefix + key;
		return property in this && delete this[property];
	},
	clear: function() {
		for (var property in this) if (property[0] === prefix) delete this[property];
	},
	keys: function() {
		var keys = [];
		for (var property in this) if (property[0] === prefix) keys.push(property.slice(1));
		return keys;
	},
	values: function() {
		var values = [];
		for (var property in this) if (property[0] === prefix) values.push(this[property]);
		return values;
	},
	entries: function() {
		var entries = [];
		for (var property in this) if (property[0] === prefix) entries.push({key: property.slice(1), value: this[property]});
		return entries;
	},
	size: function() {
		var size = 0;
		for (var property in this) if (property[0] === prefix) ++size;
		return size;
	},
	empty: function() {
		for (var property in this) if (property[0] === prefix) return false;
		return true;
	},
	each: function(f) {
		for (var property in this) if (property[0] === prefix) f(this[property], property.slice(1), this);
	}
	};

	function map(object, f) {
	var map = new Map;

	// Copy constructor.
	if (object instanceof Map) object.each(function(value, key) { map.set(key, value); });

	// Index array by numeric index or specified key function.
	else if (Array.isArray(object)) {
		var i = -1,
			n = object.length,
			o;

		if (f == null) while (++i < n) map.set(i, object[i]);
		else while (++i < n) map.set(f(o = object[i], i, object), o);
	}

	// Convert object to map.
	else if (object) for (var key in object) map.set(key, object[key]);

	return map;
	}

	function nest() {
	var keys = [],
		sortKeys = [],
		sortValues,
		rollup,
		nest;

	function apply(array, depth, createResult, setResult) {
		if (depth >= keys.length) return rollup != null
			? rollup(array) : (sortValues != null
			? array.sort(sortValues)
			: array);

		var i = -1,
			n = array.length,
			key = keys[depth++],
			keyValue,
			value,
			valuesByKey = map(),
			values,
			result = createResult();

		while (++i < n) {
		if (values = valuesByKey.get(keyValue = key(value = array[i]) + "")) {
			values.push(value);
		} else {
			valuesByKey.set(keyValue, [value]);
		}
		}

		valuesByKey.each(function(values, key) {
		setResult(result, key, apply(values, depth, createResult, setResult));
		});

		return result;
	}

	function entries(map, depth) {
		if (++depth > keys.length) return map;
		var array, sortKey = sortKeys[depth - 1];
		if (rollup != null && depth >= keys.length) array = map.entries();
		else array = [], map.each(function(v, k) { array.push({key: k, values: entries(v, depth)}); });
		return sortKey != null ? array.sort(function(a, b) { return sortKey(a.key, b.key); }) : array;
	}

	return nest = {
		object: function(array) { return apply(array, 0, createObject, setObject); },
		map: function(array) { return apply(array, 0, createMap, setMap); },
		entries: function(array) { return entries(apply(array, 0, createMap, setMap), 0); },
		key: function(d) { keys.push(d); return nest; },
		sortKeys: function(order) { sortKeys[keys.length - 1] = order; return nest; },
		sortValues: function(order) { sortValues = order; return nest; },
		rollup: function(f) { rollup = f; return nest; }
	};
	}

	function createObject() {
	return {};
	}

	function setObject(object, key, value) {
	object[key] = value;
	}

	function createMap() {
	return map();
	}

	function setMap(map, key, value) {
	map.set(key, value);
	}

	function Set() {}

	var proto = map.prototype;

	Set.prototype = set.prototype = {
	constructor: Set,
	has: proto.has,
	add: function(value) {
		value += "";
		this[prefix + value] = value;
		return this;
	},
	remove: proto.remove,
	clear: proto.clear,
	values: proto.keys,
	size: proto.size,
	empty: proto.empty,
	each: proto.each
	};

	function set(object, f) {
	var set = new Set;

	// Copy constructor.
	if (object instanceof Set) object.each(function(value) { set.add(value); });

	// Otherwise, assume it鈥檚 an array.
	else if (object) {
		var i = -1, n = object.length;
		if (f == null) while (++i < n) set.add(object[i]);
		else while (++i < n) set.add(f(object[i], i, object));
	}

	return set;
	}

	function keys(map) {
	var keys = [];
	for (var key in map) keys.push(key);
	return keys;
	}

	function values(map) {
	var values = [];
	for (var key in map) values.push(map[key]);
	return values;
	}

	function entries(map) {
	var entries = [];
	for (var key in map) entries.push({key: key, value: map[key]});
	return entries;
	}

	exports.nest = nest;
	exports.set = set;
	exports.map = map;
	exports.keys = keys;
	exports.values = values;
	exports.entries = entries;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
},{}],4:[function(require,module,exports){
// https://d3js.org/d3-color/ Version 1.0.1. Copyright 2016 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
}(this, function (exports) { 'use strict';

	function define(constructor, factory, prototype) {
	constructor.prototype = factory.prototype = prototype;
	prototype.constructor = constructor;
	}

	function extend(parent, definition) {
	var prototype = Object.create(parent.prototype);
	for (var key in definition) prototype[key] = definition[key];
	return prototype;
	}

	function Color() {}

	var darker = 0.7;
	var brighter = 1 / darker;

	var reHex3 = /^#([0-9a-f]{3})$/;
	var reHex6 = /^#([0-9a-f]{6})$/;
	var reRgbInteger = /^rgb\(\s*([-+]?\d+)\s*,\s*([-+]?\d+)\s*,\s*([-+]?\d+)\s*\)$/;
	var reRgbPercent = /^rgb\(\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*\)$/;
	var reRgbaInteger = /^rgba\(\s*([-+]?\d+)\s*,\s*([-+]?\d+)\s*,\s*([-+]?\d+)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*\)$/;
	var reRgbaPercent = /^rgba\(\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)\s*\)$/;
	var reHslPercent = /^hsl\(\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*\)$/;
	var reHslaPercent = /^hsla\(\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)\s*\)$/;
	var named = {
	aliceblue: 0xf0f8ff,
	antiquewhite: 0xfaebd7,
	aqua: 0x00ffff,
	aquamarine: 0x7fffd4,
	azure: 0xf0ffff,
	beige: 0xf5f5dc,
	bisque: 0xffe4c4,
	black: 0x000000,
	blanchedalmond: 0xffebcd,
	blue: 0x0000ff,
	blueviolet: 0x8a2be2,
	brown: 0xa52a2a,
	burlywood: 0xdeb887,
	cadetblue: 0x5f9ea0,
	chartreuse: 0x7fff00,
	chocolate: 0xd2691e,
	coral: 0xff7f50,
	cornflowerblue: 0x6495ed,
	cornsilk: 0xfff8dc,
	crimson: 0xdc143c,
	cyan: 0x00ffff,
	darkblue: 0x00008b,
	darkcyan: 0x008b8b,
	darkgoldenrod: 0xb8860b,
	darkgray: 0xa9a9a9,
	darkgreen: 0x006400,
	darkgrey: 0xa9a9a9,
	darkkhaki: 0xbdb76b,
	darkmagenta: 0x8b008b,
	darkolivegreen: 0x556b2f,
	darkorange: 0xff8c00,
	darkorchid: 0x9932cc,
	darkred: 0x8b0000,
	darksalmon: 0xe9967a,
	darkseagreen: 0x8fbc8f,
	darkslateblue: 0x483d8b,
	darkslategray: 0x2f4f4f,
	darkslategrey: 0x2f4f4f,
	darkturquoise: 0x00ced1,
	darkviolet: 0x9400d3,
	deeppink: 0xff1493,
	deepskyblue: 0x00bfff,
	dimgray: 0x696969,
	dimgrey: 0x696969,
	dodgerblue: 0x1e90ff,
	firebrick: 0xb22222,
	floralwhite: 0xfffaf0,
	forestgreen: 0x228b22,
	fuchsia: 0xff00ff,
	gainsboro: 0xdcdcdc,
	ghostwhite: 0xf8f8ff,
	gold: 0xffd700,
	goldenrod: 0xdaa520,
	gray: 0x808080,
	green: 0x008000,
	greenyellow: 0xadff2f,
	grey: 0x808080,
	honeydew: 0xf0fff0,
	hotpink: 0xff69b4,
	indianred: 0xcd5c5c,
	indigo: 0x4b0082,
	ivory: 0xfffff0,
	khaki: 0xf0e68c,
	lavender: 0xe6e6fa,
	lavenderblush: 0xfff0f5,
	lawngreen: 0x7cfc00,
	lemonchiffon: 0xfffacd,
	lightblue: 0xadd8e6,
	lightcoral: 0xf08080,
	lightcyan: 0xe0ffff,
	lightgoldenrodyellow: 0xfafad2,
	lightgray: 0xd3d3d3,
	lightgreen: 0x90ee90,
	lightgrey: 0xd3d3d3,
	lightpink: 0xffb6c1,
	lightsalmon: 0xffa07a,
	lightseagreen: 0x20b2aa,
	lightskyblue: 0x87cefa,
	lightslategray: 0x778899,
	lightslategrey: 0x778899,
	lightsteelblue: 0xb0c4de,
	lightyellow: 0xffffe0,
	lime: 0x00ff00,
	limegreen: 0x32cd32,
	linen: 0xfaf0e6,
	magenta: 0xff00ff,
	maroon: 0x800000,
	mediumaquamarine: 0x66cdaa,
	mediumblue: 0x0000cd,
	mediumorchid: 0xba55d3,
	mediumpurple: 0x9370db,
	mediumseagreen: 0x3cb371,
	mediumslateblue: 0x7b68ee,
	mediumspringgreen: 0x00fa9a,
	mediumturquoise: 0x48d1cc,
	mediumvioletred: 0xc71585,
	midnightblue: 0x191970,
	mintcream: 0xf5fffa,
	mistyrose: 0xffe4e1,
	moccasin: 0xffe4b5,
	navajowhite: 0xffdead,
	navy: 0x000080,
	oldlace: 0xfdf5e6,
	olive: 0x808000,
	olivedrab: 0x6b8e23,
	orange: 0xffa500,
	orangered: 0xff4500,
	orchid: 0xda70d6,
	palegoldenrod: 0xeee8aa,
	palegreen: 0x98fb98,
	paleturquoise: 0xafeeee,
	palevioletred: 0xdb7093,
	papayawhip: 0xffefd5,
	peachpuff: 0xffdab9,
	peru: 0xcd853f,
	pink: 0xffc0cb,
	plum: 0xdda0dd,
	powderblue: 0xb0e0e6,
	purple: 0x800080,
	rebeccapurple: 0x663399,
	red: 0xff0000,
	rosybrown: 0xbc8f8f,
	royalblue: 0x4169e1,
	saddlebrown: 0x8b4513,
	salmon: 0xfa8072,
	sandybrown: 0xf4a460,
	seagreen: 0x2e8b57,
	seashell: 0xfff5ee,
	sienna: 0xa0522d,
	silver: 0xc0c0c0,
	skyblue: 0x87ceeb,
	slateblue: 0x6a5acd,
	slategray: 0x708090,
	slategrey: 0x708090,
	snow: 0xfffafa,
	springgreen: 0x00ff7f,
	steelblue: 0x4682b4,
	tan: 0xd2b48c,
	teal: 0x008080,
	thistle: 0xd8bfd8,
	tomato: 0xff6347,
	turquoise: 0x40e0d0,
	violet: 0xee82ee,
	wheat: 0xf5deb3,
	white: 0xffffff,
	whitesmoke: 0xf5f5f5,
	yellow: 0xffff00,
	yellowgreen: 0x9acd32
	};

	define(Color, color, {
	displayable: function() {
		return this.rgb().displayable();
	},
	toString: function() {
		return this.rgb() + "";
	}
	});

	function color(format) {
	var m;
	format = (format + "").trim().toLowerCase();
	return (m = reHex3.exec(format)) ? (m = parseInt(m[1], 16), new Rgb((m >> 8 & 0xf) | (m >> 4 & 0x0f0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1)) // #f00
		: (m = reHex6.exec(format)) ? rgbn(parseInt(m[1], 16)) // #ff0000
		: (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
		: (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
		: (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
		: (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
		: (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
		: (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
		: named.hasOwnProperty(format) ? rgbn(named[format])
		: format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
		: null;
	}

	function rgbn(n) {
	return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
	}

	function rgba(r, g, b, a) {
	if (a <= 0) r = g = b = NaN;
	return new Rgb(r, g, b, a);
	}

	function rgbConvert(o) {
	if (!(o instanceof Color)) o = color(o);
	if (!o) return new Rgb;
	o = o.rgb();
	return new Rgb(o.r, o.g, o.b, o.opacity);
	}

	function rgb(r, g, b, opacity) {
	return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
	}

	function Rgb(r, g, b, opacity) {
	this.r = +r;
	this.g = +g;
	this.b = +b;
	this.opacity = +opacity;
	}

	define(Rgb, rgb, extend(Color, {
	brighter: function(k) {
		k = k == null ? brighter : Math.pow(brighter, k);
		return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
	},
	darker: function(k) {
		k = k == null ? darker : Math.pow(darker, k);
		return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
	},
	rgb: function() {
		return this;
	},
	displayable: function() {
		return (0 <= this.r && this.r <= 255)
			&& (0 <= this.g && this.g <= 255)
			&& (0 <= this.b && this.b <= 255)
			&& (0 <= this.opacity && this.opacity <= 1);
	},
	toString: function() {
		var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
		return (a === 1 ? "rgb(" : "rgba(")
			+ Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
			+ Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
			+ Math.max(0, Math.min(255, Math.round(this.b) || 0))
			+ (a === 1 ? ")" : ", " + a + ")");
	}
	}));

	function hsla(h, s, l, a) {
	if (a <= 0) h = s = l = NaN;
	else if (l <= 0 || l >= 1) h = s = NaN;
	else if (s <= 0) h = NaN;
	return new Hsl(h, s, l, a);
	}

	function hslConvert(o) {
	if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
	if (!(o instanceof Color)) o = color(o);
	if (!o) return new Hsl;
	if (o instanceof Hsl) return o;
	o = o.rgb();
	var r = o.r / 255,
		g = o.g / 255,
		b = o.b / 255,
		min = Math.min(r, g, b),
		max = Math.max(r, g, b),
		h = NaN,
		s = max - min,
		l = (max + min) / 2;
	if (s) {
		if (r === max) h = (g - b) / s + (g < b) * 6;
		else if (g === max) h = (b - r) / s + 2;
		else h = (r - g) / s + 4;
		s /= l < 0.5 ? max + min : 2 - max - min;
		h *= 60;
	} else {
		s = l > 0 && l < 1 ? 0 : h;
	}
	return new Hsl(h, s, l, o.opacity);
	}

	function hsl(h, s, l, opacity) {
	return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
	}

	function Hsl(h, s, l, opacity) {
	this.h = +h;
	this.s = +s;
	this.l = +l;
	this.opacity = +opacity;
	}

	define(Hsl, hsl, extend(Color, {
	brighter: function(k) {
		k = k == null ? brighter : Math.pow(brighter, k);
		return new Hsl(this.h, this.s, this.l * k, this.opacity);
	},
	darker: function(k) {
		k = k == null ? darker : Math.pow(darker, k);
		return new Hsl(this.h, this.s, this.l * k, this.opacity);
	},
	rgb: function() {
		var h = this.h % 360 + (this.h < 0) * 360,
			s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
			l = this.l,
			m2 = l + (l < 0.5 ? l : 1 - l) * s,
			m1 = 2 * l - m2;
		return new Rgb(
		hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
		hsl2rgb(h, m1, m2),
		hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
		this.opacity
		);
	},
	displayable: function() {
		return (0 <= this.s && this.s <= 1 || isNaN(this.s))
			&& (0 <= this.l && this.l <= 1)
			&& (0 <= this.opacity && this.opacity <= 1);
	}
	}));

	/* From FvD 13.37, CSS Color Module Level 3 */
	function hsl2rgb(h, m1, m2) {
	return (h < 60 ? m1 + (m2 - m1) * h / 60
		: h < 180 ? m2
		: h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
		: m1) * 255;
	}

	var deg2rad = Math.PI / 180;
	var rad2deg = 180 / Math.PI;

	var Kn = 18;
	var Xn = 0.950470;
	var Yn = 1;
	var Zn = 1.088830;
	var t0 = 4 / 29;
	var t1 = 6 / 29;
	var t2 = 3 * t1 * t1;
	var t3 = t1 * t1 * t1;
	function labConvert(o) {
	if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
	if (o instanceof Hcl) {
		var h = o.h * deg2rad;
		return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
	}
	if (!(o instanceof Rgb)) o = rgbConvert(o);
	var b = rgb2xyz(o.r),
		a = rgb2xyz(o.g),
		l = rgb2xyz(o.b),
		x = xyz2lab((0.4124564 * b + 0.3575761 * a + 0.1804375 * l) / Xn),
		y = xyz2lab((0.2126729 * b + 0.7151522 * a + 0.0721750 * l) / Yn),
		z = xyz2lab((0.0193339 * b + 0.1191920 * a + 0.9503041 * l) / Zn);
	return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
	}

	function lab(l, a, b, opacity) {
	return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity == null ? 1 : opacity);
	}

	function Lab(l, a, b, opacity) {
	this.l = +l;
	this.a = +a;
	this.b = +b;
	this.opacity = +opacity;
	}

	define(Lab, lab, extend(Color, {
	brighter: function(k) {
		return new Lab(this.l + Kn * (k == null ? 1 : k), this.a, this.b, this.opacity);
	},
	darker: function(k) {
		return new Lab(this.l - Kn * (k == null ? 1 : k), this.a, this.b, this.opacity);
	},
	rgb: function() {
		var y = (this.l + 16) / 116,
			x = isNaN(this.a) ? y : y + this.a / 500,
			z = isNaN(this.b) ? y : y - this.b / 200;
		y = Yn * lab2xyz(y);
		x = Xn * lab2xyz(x);
		z = Zn * lab2xyz(z);
		return new Rgb(
		xyz2rgb( 3.2404542 * x - 1.5371385 * y - 0.4985314 * z), // D65 -> sRGB
		xyz2rgb(-0.9692660 * x + 1.8760108 * y + 0.0415560 * z),
		xyz2rgb( 0.0556434 * x - 0.2040259 * y + 1.0572252 * z),
		this.opacity
		);
	}
	}));

	function xyz2lab(t) {
	return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
	}

	function lab2xyz(t) {
	return t > t1 ? t * t * t : t2 * (t - t0);
	}

	function xyz2rgb(x) {
	return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
	}

	function rgb2xyz(x) {
	return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
	}

	function hclConvert(o) {
	if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
	if (!(o instanceof Lab)) o = labConvert(o);
	var h = Math.atan2(o.b, o.a) * rad2deg;
	return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
	}

	function hcl(h, c, l, opacity) {
	return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
	}

	function Hcl(h, c, l, opacity) {
	this.h = +h;
	this.c = +c;
	this.l = +l;
	this.opacity = +opacity;
	}

	define(Hcl, hcl, extend(Color, {
	brighter: function(k) {
		return new Hcl(this.h, this.c, this.l + Kn * (k == null ? 1 : k), this.opacity);
	},
	darker: function(k) {
		return new Hcl(this.h, this.c, this.l - Kn * (k == null ? 1 : k), this.opacity);
	},
	rgb: function() {
		return labConvert(this).rgb();
	}
	}));

	var A = -0.14861;
	var B = +1.78277;
	var C = -0.29227;
	var D = -0.90649;
	var E = +1.97294;
	var ED = E * D;
	var EB = E * B;
	var BC_DA = B * C - D * A;
	function cubehelixConvert(o) {
	if (o instanceof Cubehelix) return new Cubehelix(o.h, o.s, o.l, o.opacity);
	if (!(o instanceof Rgb)) o = rgbConvert(o);
	var r = o.r / 255,
		g = o.g / 255,
		b = o.b / 255,
		l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB),
		bl = b - l,
		k = (E * (g - l) - C * bl) / D,
		s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)), // NaN if l=0 or l=1
		h = s ? Math.atan2(k, bl) * rad2deg - 120 : NaN;
	return new Cubehelix(h < 0 ? h + 360 : h, s, l, o.opacity);
	}

	function cubehelix(h, s, l, opacity) {
	return arguments.length === 1 ? cubehelixConvert(h) : new Cubehelix(h, s, l, opacity == null ? 1 : opacity);
	}

	function Cubehelix(h, s, l, opacity) {
	this.h = +h;
	this.s = +s;
	this.l = +l;
	this.opacity = +opacity;
	}

	define(Cubehelix, cubehelix, extend(Color, {
	brighter: function(k) {
		k = k == null ? brighter : Math.pow(brighter, k);
		return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
	},
	darker: function(k) {
		k = k == null ? darker : Math.pow(darker, k);
		return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
	},
	rgb: function() {
		var h = isNaN(this.h) ? 0 : (this.h + 120) * deg2rad,
			l = +this.l,
			a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
			cosh = Math.cos(h),
			sinh = Math.sin(h);
		return new Rgb(
		255 * (l + a * (A * cosh + B * sinh)),
		255 * (l + a * (C * cosh + D * sinh)),
		255 * (l + a * (E * cosh)),
		this.opacity
		);
	}
	}));

	exports.color = color;
	exports.rgb = rgb;
	exports.hsl = hsl;
	exports.lab = lab;
	exports.hcl = hcl;
	exports.cubehelix = cubehelix;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
},{}],5:[function(require,module,exports){
// http://geoexamples.com/d3-composite-projections/ Version 1.0.0. Copyright 2016 Roger Veciana i Rovira.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-geo'), require('d3-path')) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3-geo', 'd3-path'], factory) :
	(factory((global.d3 = global.d3 || {}),global.d3,global.d3));
}(this, function (exports,d3Geo,d3Path) { 'use strict';

	var epsilon = 1e-6;

	// The projections must have mutually exclusive clip regions on the sphere,
	// as this will avoid emitting interleaving lines and polygons.
	function multiplex(streams) {
	var n = streams.length;
	return {
		point: function(x, y) { var i = -1; while (++i < n) streams[i].point(x, y); },
		sphere: function() { var i = -1; while (++i < n) streams[i].sphere(); },
		lineStart: function() { var i = -1; while (++i < n) streams[i].lineStart(); },
		lineEnd: function() { var i = -1; while (++i < n) streams[i].lineEnd(); },
		polygonStart: function() { var i = -1; while (++i < n) streams[i].polygonStart(); },
		polygonEnd: function() { var i = -1; while (++i < n) streams[i].polygonEnd(); }
	};
	}

	// A composite projection for the United States, configured by default for
	// 960脳500. Also works quite well at 960脳600 with scale 1285. The set of
	// standard parallels for each region comes from USGS, which is published here:
	// http://egsc.usgs.gov/isb/pubs/MapProjections/projections.html#albers
	function albersUsa() {
	var cache,
		cacheStream,
		lower48 = d3Geo.geoAlbers(), lower48Point,
		alaska = d3Geo.geoConicEqualArea().rotate([154, 0]).center([-2, 58.5]).parallels([55, 65]), alaskaPoint, // EPSG:3338
		hawaii = d3Geo.geoConicEqualArea().rotate([157, 0]).center([-3, 19.9]).parallels([8, 18]), hawaiiPoint, // ESRI:102007
		point, pointStream = {point: function(x, y) { point = [x, y]; }};

	function albersUsa(coordinates) {
		var x = coordinates[0], y = coordinates[1];
		return point = null,
			(lower48Point.point(x, y), point)
			|| (alaskaPoint.point(x, y), point)
			|| (hawaiiPoint.point(x, y), point);
	}

	albersUsa.invert = function(coordinates) {
		var k = lower48.scale(),
			t = lower48.translate(),
			x = (coordinates[0] - t[0]) / k,
			y = (coordinates[1] - t[1]) / k;
		return (y >= 0.120 && y < 0.234 && x >= -0.425 && x < -0.214 ? alaska
			: y >= 0.166 && y < 0.234 && x >= -0.214 && x < -0.115 ? hawaii
			: lower48).invert(coordinates);
	};

	albersUsa.stream = function(stream) {
		return cache && cacheStream === stream ? cache : cache = multiplex([lower48.stream(cacheStream = stream), alaska.stream(stream), hawaii.stream(stream)]);
	};

	albersUsa.precision = function(_) {
		if (!arguments.length) return lower48.precision();
		lower48.precision(_), alaska.precision(_), hawaii.precision(_);
		return albersUsa;
	};

	albersUsa.scale = function(_) {
		if (!arguments.length) return lower48.scale();
		lower48.scale(_), alaska.scale(_ * 0.35), hawaii.scale(_);
		return albersUsa.translate(lower48.translate());
	};

	albersUsa.translate = function(_) {
		if (!arguments.length) return lower48.translate();
		var k = lower48.scale(), x = +_[0], y = +_[1];

		lower48Point = lower48
			.translate(_)
			.clipExtent([[x - 0.455 * k, y - 0.238 * k], [x + 0.455 * k, y + 0.238 * k]])
			.stream(pointStream);

		alaskaPoint = alaska
			.translate([x - 0.307 * k, y + 0.201 * k])
			.clipExtent([[x - 0.425 * k + epsilon, y + 0.120 * k + epsilon], [x - 0.214 * k - epsilon, y + 0.234 * k - epsilon]])
			.stream(pointStream);

		hawaiiPoint = hawaii
			.translate([x - 0.205 * k, y + 0.212 * k])
			.clipExtent([[x - 0.214 * k + epsilon, y + 0.166 * k + epsilon], [x - 0.115 * k - epsilon, y + 0.234 * k - epsilon]])
			.stream(pointStream);

		return albersUsa;
	};
	
	albersUsa.drawCompositionBorders = function(context) {
		var hawaii1 = lower48([-102.91, 26.3]);
		var hawaii2 = lower48([-104.0, 27.5]);
		var hawaii3 = lower48([-108.0, 29.1]);
		var hawaii4 = lower48([-110.0, 29.1]);

		var alaska1 = lower48([-110.0, 26.7]);
		var alaska2 = lower48([-112.8, 27.6]);
		var alaska3 = lower48([-114.3, 30.6]);
		var alaska4 = lower48([-119.3, 30.1]);

		context.moveTo(hawaii1[0], hawaii1[1]);
		context.lineTo(hawaii2[0], hawaii2[1]);
		context.lineTo(hawaii3[0], hawaii3[1]);
		context.lineTo(hawaii4[0], hawaii4[1]);

		context.moveTo(alaska1[0], alaska1[1]);
		context.lineTo(alaska2[0], alaska2[1]);
		context.lineTo(alaska3[0], alaska3[1]);
		context.lineTo(alaska4[0], alaska4[1]);

	};
	albersUsa.getCompositionBorders = function() {
		var context = d3Path.path();
		this.drawCompositionBorders(context);
		return context.toString();

	};


	return albersUsa.scale(1070);
	}

	// The projections must have mutually exclusive clip regions on the sphere,
	// as this will avoid emitting interleaving lines and polygons.
	function multiplex$1(streams) {
	var n = streams.length;
	return {
		point: function(x, y) { var i = -1; while (++i < n) streams[i].point(x, y); },
		sphere: function() { var i = -1; while (++i < n) streams[i].sphere(); },
		lineStart: function() { var i = -1; while (++i < n) streams[i].lineStart(); },
		lineEnd: function() { var i = -1; while (++i < n) streams[i].lineEnd(); },
		polygonStart: function() { var i = -1; while (++i < n) streams[i].polygonStart(); },
		polygonEnd: function() { var i = -1; while (++i < n) streams[i].polygonEnd(); }
	};
	}

	// A composite projection for the United States, configured by default for
	// 960脳500. Also works quite well at 960脳600 with scale 1285. The set of
	// standard parallels for each region comes from USGS, which is published here:
	// http://egsc.usgs.gov/isb/pubs/MapProjections/projections.html#albers
	function albersUsaTerritories() {
	var cache,
		cacheStream,
		lower48 = d3Geo.geoAlbers(), lower48Point,
		alaska = d3Geo.geoConicEqualArea().rotate([154, 0]).center([-2, 58.5]).parallels([55, 65]), alaskaPoint, // EPSG:3338
		hawaii = d3Geo.geoConicEqualArea().rotate([157, 0]).center([-3, 19.9]).parallels([8, 18]), hawaiiPoint, // ESRI:102007
		puertoRico = d3Geo.geoConicEqualArea().rotate([66, 0]).center([0, 18]).parallels([8, 18]), puertoRicoPoint, //Taken from https://bl.ocks.org/mbostock/5629120
		samoa = d3Geo.geoEquirectangular().rotate([173, 14]), samoaPoint, // EPSG:4169
		guam = d3Geo.geoEquirectangular().rotate([-145, -16.8]), guamPoint,
		point, pointStream = {point: function(x, y) { point = [x, y]; }};

		/*
		var puertoRicoBbox = [[-68.3, 19], [-63.9, 17]];
		var samoaBbox = [[-171, -14], [-168, -14.8]];
		var guamBbox = [[144, 20.8], [146.5, 12.7]];
		*/

	function albersUsa(coordinates) {
		var x = coordinates[0], y = coordinates[1];

		return point = null,
			(lower48Point.point(x, y), point) ||
			(alaskaPoint.point(x, y), point)	||
			(hawaiiPoint.point(x, y), point)	||
			(puertoRicoPoint.point(x, y), point) ||
			(samoaPoint.point(x, y), point)	 ||
			(guamPoint.point(x, y), point);
	}

	albersUsa.invert = function(coordinates) {

		var k = lower48.scale(),
			t = lower48.translate(),
			x = (coordinates[0] - t[0]) / k,
			y = (coordinates[1] - t[1]) / k;
			/*
			//How are the return values calculated:
			console.info("******");
			var c0 = puertoRico(puertoRicoBbox[0]);
			var x0 = (c0[0] - t[0]) / k;
			var y0 = (c0[1] - t[1]) / k;

			console.info("p0 puertoRico", x0 + ' - ' + y0);

			var c1 = puertoRico(puertoRicoBbox[1]);
			var x1 = (c1[0] - t[0]) / k;
			var y1 = (c1[1] - t[1]) / k;

			console.info("p1 puertoRico", x1 + ' - ' + y1);

			c0 = samoa(samoaBbox[0]);
			x0 = (c0[0] - t[0]) / k;
			y0 = (c0[1] - t[1]) / k;

			console.info("p0 samoa", x0 + ' - ' + y0);

			c1 = samoa(samoaBbox[1]);
			x1 = (c1[0] - t[0]) / k;
			y1 = (c1[1] - t[1]) / k;

			console.info("p1 samoa", x1 + ' - ' + y1);

			c0 = guam(guamBbox[0]);
			x0 = (c0[0] - t[0]) / k;
			y0 = (c0[1] - t[1]) / k;

			console.info("p0 guam", x0 + ' - ' + y0);

			c1 = guam(guamBbox[1]);
			x1 = (c1[0] - t[0]) / k;
			y1 = (c1[1] - t[1]) / k;

			console.info("p1 guam", x1 + ' - ' + y1);
			*/

		return (y >= 0.120 && y < 0.234 && x >= -0.425 && x < -0.214 ? alaska
			: y >= 0.166 && y < 0.234 && x >= -0.214 && x < -0.115 ? hawaii
			: y >= 0.2064 && y < 0.2413 && x >= 0.312 && x < 0.385 ? puertoRico
			: y >= 0.09 && y < 0.1197 && x >= -0.4243 && x < -0.3232 ? samoa
			: y >= -0.0518 && y < 0.0895 && x >= -0.4243 && x < -0.3824 ? guam
			: lower48).invert(coordinates);

	};

	albersUsa.stream = function(stream) {
		return cache && cacheStream === stream ? cache : cache = multiplex$1([lower48.stream(cacheStream = stream), alaska.stream(stream), hawaii.stream(stream), puertoRico.stream(stream), samoa.stream(stream), guam.stream(stream)]);
	};

	albersUsa.precision = function(_) {
		if (!arguments.length) {return lower48.precision();}
		lower48.precision(_);
		alaska.precision(_);
		hawaii.precision(_);
		puertoRico.precision(_);
		samoa.precision(_);
		guam.precision(_);
		return albersUsa;
	};

	albersUsa.scale = function(_) {
		if (!arguments.length) {return lower48.scale();}
		lower48.scale(_);
		alaska.scale(_ * 0.35);
		hawaii.scale(_);
		puertoRico.scale(_);
		samoa.scale(_* 2);
		guam.scale(_);
		return albersUsa.translate(lower48.translate());
	};

	albersUsa.translate = function(_) {
		if (!arguments.length) {return lower48.translate();}
		var k = lower48.scale(), x = +_[0], y = +_[1];

		/*
		var c0 = puertoRico.translate([x + 0.350 * k, y + 0.224 * k])(puertoRicoBbox[0]);
		var x0 = (x - c0[0]) / k;
		var y0 = (y - c0[1]) / k;

		var c1 = puertoRico.translate([x + 0.350 * k, y + 0.224 * k])(puertoRicoBbox[1]);
		var x1 = (x - c1[0]) / k;
		var y1 = (y - c1[1]) / k;

		console.info('puertoRico: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
		console.info('.clipExtent([[x '+
		 (x0<0?'+ ':'- ') + Math.abs(x0.toFixed(4))+
		 ' * k + epsilon, y '+
		 (y0<0?'+ ':'- ') + Math.abs(y0.toFixed(4))+
		 ' * k + epsilon],[x '+
		 (x1<0?'+ ':'- ') + Math.abs(x1.toFixed(4))+
		 ' * k - epsilon, y '+
		 (y1<0?'+ ':'- ') + Math.abs(y1.toFixed(4))+
		 ' * k - epsilon]])');

		c0 = samoa.translate([x - 0.492 * k, y + 0.09 * k])(samoaBbox[0]);
		x0 = (x - c0[0]) / k;
		y0 = (y - c0[1]) / k;

		c1 = samoa.translate([x - 0.492 * k, y + 0.09 * k])(samoaBbox[1]);
		x1 = (x - c1[0]) / k;
		y1 = (y - c1[1]) / k;

		 console.info('samoa: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
		 console.info('.clipExtent([[x '+
		(x0<0?'+ ':'- ') + Math.abs(x0.toFixed(4))+
		' * k + epsilon, y '+
		(y0<0?'+ ':'- ') + Math.abs(y0.toFixed(4))+
		' * k + epsilon],[x '+
		(x1<0?'+ ':'- ') + Math.abs(x1.toFixed(4))+
		' * k - epsilon, y '+
		(y1<0?'+ ':'- ') + Math.abs(y1.toFixed(4))+
		' * k - epsilon]])');

		c0 = guam.translate([x - 0.408 * k, y + 0.018 * k])(guamBbox[0]);
		x0 = (x - c0[0]) / k;
		y0 = (y - c0[1]) / k;

		c1 = guam.translate([x - 0.408 * k, y + 0.018 * k])(guamBbox[1]);
		x1 = (x - c1[0]) / k;
		y1 = (y - c1[1]) / k;

		 console.info('guam: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
		 console.info('.clipExtent([[x '+
		(x0<0?'+ ':'- ') + Math.abs(x0.toFixed(4))+
		' * k + epsilon, y '+
		(y0<0?'+ ':'- ') + Math.abs(y0.toFixed(4))+
		' * k + epsilon],[x '+
		(x1<0?'+ ':'- ') + Math.abs(x1.toFixed(4))+
		' * k - epsilon, y '+
		(y1<0?'+ ':'- ') + Math.abs(y1.toFixed(4))+
		' * k - epsilon]])');
		*/

		lower48Point = lower48
			.translate(_)
			.clipExtent([[x - 0.455 * k, y - 0.238 * k], [x + 0.455 * k, y + 0.238 * k]])
			.stream(pointStream);

		alaskaPoint = alaska
			.translate([x - 0.307 * k, y + 0.201 * k])
			.clipExtent([[x - 0.425 * k + epsilon, y + 0.120 * k + epsilon], [x - 0.214 * k - epsilon, y + 0.233 * k - epsilon]])
			.stream(pointStream);

		hawaiiPoint = hawaii
			.translate([x - 0.205 * k, y + 0.212 * k])
			.clipExtent([[x - 0.214 * k + epsilon, y + 0.166 * k + epsilon], [x - 0.115 * k - epsilon, y + 0.233 * k - epsilon]])
			.stream(pointStream);

		puertoRicoPoint = puertoRico
			.translate([x + 0.350 * k, y + 0.224 * k])
			.clipExtent([[x + 0.312 * k + epsilon, y + 0.2064 * k + epsilon],[x + 0.385 * k - epsilon, y + 0.233 * k - epsilon]])
			.stream(pointStream);

		samoaPoint = samoa
			.translate([x - 0.492 * k, y + 0.09 * k])
			.clipExtent([[x - 0.4243 * k + epsilon, y + 0.0903 * k + epsilon],[x - 0.3233 * k - epsilon, y + 0.1197 * k - epsilon]])
			.stream(pointStream);

		guamPoint = guam
			.translate([x - 0.408 * k, y + 0.018 * k])
			.clipExtent([[x - 0.4244 * k + epsilon, y - 0.0519 * k + epsilon],[x - 0.3824 * k - epsilon, y + 0.0895 * k - epsilon]])
			.stream(pointStream);


		return albersUsa;
	};

	albersUsa.drawCompositionBorders = function(context) {

		/*
		console.info("CLIP EXTENT hawaii: ", hawaii.clipExtent());
		console.info("UL BBOX:", lower48.invert([hawaii.clipExtent()[0][0], hawaii.clipExtent()[0][1]]));
		console.info("UR BBOX:", lower48.invert([hawaii.clipExtent()[1][0], hawaii.clipExtent()[0][1]]));
		console.info("LD BBOX:", lower48.invert([hawaii.clipExtent()[1][0], hawaii.clipExtent()[1][1]]));
		console.info("LL BBOX:", lower48.invert([hawaii.clipExtent()[0][0], hawaii.clipExtent()[1][1]]));

		console.info("CLIP EXTENT alaska: ", alaska.clipExtent());
		console.info("UL BBOX:", lower48.invert([alaska.clipExtent()[0][0], alaska.clipExtent()[0][1]]));
		console.info("UR BBOX:", lower48.invert([alaska.clipExtent()[1][0], alaska.clipExtent()[0][1]]));
		console.info("LD BBOX:", lower48.invert([alaska.clipExtent()[1][0], alaska.clipExtent()[1][1]]));
		console.info("LL BBOX:", lower48.invert([alaska.clipExtent()[0][0], alaska.clipExtent()[1][1]]));

		console.info("CLIP EXTENT puertoRico: ", puertoRico.clipExtent());
		console.info("UL BBOX:", lower48.invert([puertoRico.clipExtent()[0][0], puertoRico.clipExtent()[0][1]]));
		console.info("UR BBOX:", lower48.invert([puertoRico.clipExtent()[1][0], puertoRico.clipExtent()[0][1]]));
		console.info("LD BBOX:", lower48.invert([puertoRico.clipExtent()[1][0], puertoRico.clipExtent()[1][1]]));
		console.info("LL BBOX:", lower48.invert([puertoRico.clipExtent()[0][0], puertoRico.clipExtent()[1][1]]));

		console.info("CLIP EXTENT samoa: ", samoa.clipExtent());
		console.info("UL BBOX:", lower48.invert([samoa.clipExtent()[0][0], samoa.clipExtent()[0][1]]));
		console.info("UR BBOX:", lower48.invert([samoa.clipExtent()[1][0], samoa.clipExtent()[0][1]]));
		console.info("LD BBOX:", lower48.invert([samoa.clipExtent()[1][0], samoa.clipExtent()[1][1]]));
		console.info("LL BBOX:", lower48.invert([samoa.clipExtent()[0][0], samoa.clipExtent()[1][1]]));


		console.info("CLIP EXTENT guam: ", guam.clipExtent());
		console.info("UL BBOX:", lower48.invert([guam.clipExtent()[0][0], guam.clipExtent()[0][1]]));
		console.info("UR BBOX:", lower48.invert([guam.clipExtent()[1][0], guam.clipExtent()[0][1]]));
		console.info("LD BBOX:", lower48.invert([guam.clipExtent()[1][0], guam.clipExtent()[1][1]]));
		console.info("LL BBOX:", lower48.invert([guam.clipExtent()[0][0], guam.clipExtent()[1][1]]));
		*/

		var ulhawaii = lower48([-110.4641, 28.2805]);
		var urhawaii = lower48([-104.0597, 28.9528]);
		var ldhawaii = lower48([-103.7049, 25.1031]);
		var llhawaii = lower48([-109.8337, 24.4531]);

		var ulalaska = lower48([ -124.4745, 28.1407]);
		var uralaska = lower48([ -110.931, 30.8844]);
		var ldalaska = lower48([-109.8337, 24.4531]);
		var llalaska = lower48([-122.4628, 21.8562]);

		var ulpuertoRico = lower48([-76.8579, 25.1544]);
		var urpuertoRico = lower48([-72.429, 24.2097]);
		var ldpuertoRico = lower48([-72.8265, 22.7056]);
		var llpuertoRico = lower48([-77.1852, 23.6392]);


		var ulsamoa = lower48([-125.0093, 29.7791]);
		var ursamoa = lower48([-118.5193, 31.3262]);
		var ldsamoa = lower48([-118.064, 29.6912]);
		var llsamoa = lower48([-124.4369, 28.169]);

		var ulguam = lower48([-128.1314, 37.4582]);
		var urguam = lower48([-125.2132, 38.214]);
		var ldguam = lower48([-122.3616, 30.5115]);
		var llguam = lower48([-125.0315, 29.8211]);

		context.moveTo(ulhawaii[0], ulhawaii[1]);
		context.lineTo(urhawaii[0], urhawaii[1]);
		context.lineTo(ldhawaii[0], ldhawaii[1]);
		context.lineTo(ldhawaii[0], ldhawaii[1]);
		context.lineTo(llhawaii[0], llhawaii[1]);
		context.closePath();

		context.moveTo(ulalaska[0], ulalaska[1]);
		context.lineTo(uralaska[0], uralaska[1]);
		context.lineTo(ldalaska[0], ldalaska[1]);
		context.lineTo(ldalaska[0], ldalaska[1]);
		context.lineTo(llalaska[0], llalaska[1]);
		context.closePath();

		context.moveTo(ulpuertoRico[0], ulpuertoRico[1]);
		context.lineTo(urpuertoRico[0], urpuertoRico[1]);
		context.lineTo(ldpuertoRico[0], ldpuertoRico[1]);
		context.lineTo(ldpuertoRico[0], ldpuertoRico[1]);
		context.lineTo(llpuertoRico[0], llpuertoRico[1]);
		context.closePath();

		context.moveTo(ulsamoa[0], ulsamoa[1]);
		context.lineTo(ursamoa[0], ursamoa[1]);
		context.lineTo(ldsamoa[0], ldsamoa[1]);
		context.lineTo(ldsamoa[0], ldsamoa[1]);
		context.lineTo(llsamoa[0], llsamoa[1]);
		context.closePath();

		context.moveTo(ulguam[0], ulguam[1]);
		context.lineTo(urguam[0], urguam[1]);
		context.lineTo(ldguam[0], ldguam[1]);
		context.lineTo(ldguam[0], ldguam[1]);
		context.lineTo(llguam[0], llguam[1]);
		context.closePath();

	};
	albersUsa.getCompositionBorders = function() {
		var context = d3Path.path();
		this.drawCompositionBorders(context);
		return context.toString();

	};


	return albersUsa.scale(1070);
	}

	// The projections must have mutually exclusive clip regions on the sphere,
	// as this will avoid emitting interleaving lines and polygons.
	function multiplex$2(streams) {
	var n = streams.length;
	return {
		point: function(x, y) { var i = -1; while (++i < n) {streams[i].point(x, y); }},
		sphere: function() { var i = -1; while (++i < n) {streams[i].sphere(); }},
		lineStart: function() { var i = -1; while (++i < n) {streams[i].lineStart(); }},
		lineEnd: function() { var i = -1; while (++i < n) {streams[i].lineEnd(); }},
		polygonStart: function() { var i = -1; while (++i < n) {streams[i].polygonStart(); }},
		polygonEnd: function() { var i = -1; while (++i < n) {streams[i].polygonEnd(); }}
	};
	}

	// A composite projection for Spain, configured by default for 960脳500.
	function conicConformalSpain() {
	var cache,
		cacheStream,

		iberianPeninsule = d3Geo.geoConicConformal().rotate([5, -38.6]).parallels([0,60]), iberianPeninsulePoint,
		canaryIslands = d3Geo.geoConicConformal().rotate([5, -38.6]).parallels([0,60]), canaryIslandsPoint,

		point, pointStream = {point: function(x, y) { point = [x, y]; }};

		/*
		var iberianPeninsuleBbox = [[-11, 46], [4, 35]];
		var canaryIslandsBbox = [[-19.0, 28.85], [-12.7, 28.1]];
		*/

	function conicConformalSpain(coordinates) {
		var x = coordinates[0], y = coordinates[1];
		return point = null,
			(iberianPeninsulePoint.point(x, y), point) ||
			(canaryIslandsPoint.point(x, y), point);
	}

	conicConformalSpain.invert = function(coordinates) {
		var k = iberianPeninsule.scale(),
			t = iberianPeninsule.translate(),
			x = (coordinates[0] - t[0]) / k,
			y = (coordinates[1] - t[1]) / k;
			/*
			//How are the return values calculated:
			var c0 = canaryIslands(canaryIslandsBbox[0]);
			var x0 = (c0[0] - t[0]) / k;
			var y0 = (c0[1] - t[1]) / k;

			console.info("p0 canary islands", x0 + ' - ' + y0);


			var c1 = canaryIslands(canaryIslandsBbox[1]);
			var x1 = (c1[0] - t[0]) / k;
			var y1 = (c1[1] - t[1]) / k;

			console.info("p1 canary islands", x1 + ' - ' + y1);
			*/
			return (y >= 0.05346 && y< 0.0897 && x >= -0.13388 && x < -0.0322 ? canaryIslands
				: iberianPeninsule).invert(coordinates);
	};

	conicConformalSpain.stream = function(stream) {
		return cache && cacheStream === stream ? cache : cache = multiplex$2([iberianPeninsule.stream(cacheStream = stream), canaryIslands.stream(stream)]);
	};

	conicConformalSpain.precision = function(_) {
		if (!arguments.length) {return iberianPeninsule.precision();}
		iberianPeninsule.precision(_);
		canaryIslands.precision(_);
		return conicConformalSpain;
	};

	conicConformalSpain.scale = function(_) {
		if (!arguments.length) {return iberianPeninsule.scale();}
		iberianPeninsule.scale(_);
		canaryIslands.scale(_);
		return conicConformalSpain.translate(iberianPeninsule.translate());
	};

	conicConformalSpain.translate = function(_) {
		if (!arguments.length) {return iberianPeninsule.translate();}
		var k = iberianPeninsule.scale(), x = +_[0], y = +_[1];
		/*
		var c0 = iberianPeninsule(iberianPeninsuleBbox[0]);
	 var x0 = (x - c0[0]) / k;
	 var y0 = (y - c0[1]) / k;

	 var c1 = iberianPeninsule(iberianPeninsuleBbox[1]);
	 var x1 = (x - c1[0]) / k;
	 var y1 = (y - c1[1]) / k;

	 console.info('Iberian Peninsula: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);

	 c0 = canaryIslands.translate([x + 0.1 * k, y - 0.094 * k])(canaryIslandsBbox[0]);
	 x0 = (x - c0[0]) / k;
	 y0 = (y - c0[1]) / k;

	 c1 = canaryIslands.translate([x + 0.1 * k, y - 0.094 * k])(canaryIslandsBbox[1]);
	 x1 = (x - c1[0]) / k;
	 y1 = (y - c1[1]) / k;

	 console.info('Canry Islands: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
	 */
		iberianPeninsulePoint = iberianPeninsule
			.translate(_)
			.clipExtent([[x - 0.06857 * k, y - 0.1288 * k],[x + 0.13249 * k, y + 0.05292 * k]])
			.stream(pointStream);

		canaryIslandsPoint = canaryIslands
			.translate([x + 0.1 * k, y - 0.094 * k])
			.clipExtent([[x - 0.1331 * k + epsilon, y + 0.053457 * k + epsilon],[x	- 0.0354 * k - epsilon, y + 0.08969 * k - epsilon]])
			.stream(pointStream);

		return conicConformalSpain;
	};

	conicConformalSpain.drawCompositionBorders = function(context) {
		/*
		console.info("CLIP EXTENT: ", canaryIslands.clipExtent());
		console.info("UL BBOX:", iberianPeninsule.invert([canaryIslands.clipExtent()[0][0], canaryIslands.clipExtent()[0][1]]));
		console.info("UR BBOX:", iberianPeninsule.invert([canaryIslands.clipExtent()[1][0], canaryIslands.clipExtent()[0][1]]));
		console.info("LD BBOX:", iberianPeninsule.invert([canaryIslands.clipExtent()[1][0], canaryIslands.clipExtent()[1][1]]));
		*/

		var ulCanaryIslands = iberianPeninsule([-14.0346750522884, 34.96500729877966]);
		var urCanaryIslands = iberianPeninsule([-7.4208899681602025, 35.53698899616862]);
		var ldCanaryIslands = iberianPeninsule([-7.314827535125545, 33.54359498636456]);

		context.moveTo(ulCanaryIslands[0], ulCanaryIslands[1]);
		context.lineTo(urCanaryIslands[0], urCanaryIslands[1]);
		context.lineTo(ldCanaryIslands[0], ldCanaryIslands[1]);
	};
	conicConformalSpain.getCompositionBorders = function() {
		var context = d3Path.path();
		this.drawCompositionBorders(context);
		return context.toString();
	};

	return conicConformalSpain.scale(2700);
	}

	// The projections must have mutually exclusive clip regions on the sphere,
	// as this will avoid emitting interleaving lines and polygons.
	function multiplex$3(streams) {
	var n = streams.length;
	return {
		point: function(x, y) { var i = -1; while (++i < n) {streams[i].point(x, y); }},
		sphere: function() { var i = -1; while (++i < n) {streams[i].sphere(); }},
		lineStart: function() { var i = -1; while (++i < n) {streams[i].lineStart(); }},
		lineEnd: function() { var i = -1; while (++i < n) {streams[i].lineEnd(); }},
		polygonStart: function() { var i = -1; while (++i < n) {streams[i].polygonStart(); }},
		polygonEnd: function() { var i = -1; while (++i < n) {streams[i].polygonEnd(); }}
	};
	}

	// A composite projection for Portugal, configured by default for 960脳500.
	function conicConformalPortugal() {
	var cache,
		cacheStream,
		iberianPeninsule = d3Geo.geoConicConformal().rotate([10, -39.3]).parallels([0, 60]), iberianPeninsulePoint,
		madeira = d3Geo.geoConicConformal().rotate([17, -32.7]).parallels([0, 60]), madeiraPoint,
		azores = d3Geo.geoConicConformal().rotate([27.8, -38.6]).parallels([0, 60]), azoresPoint,

		point, pointStream = {point: function(x, y) { point = [x, y]; }};

		/*
		var iberianPeninsuleBbox = [[-11, 46], [4, 34]];
		var madeiraBbox = [[-17.85, 33.6], [-16, 32.02]];
		var azoresBbox = [[-32, 40.529], [-23.98, 35.75]];
		*/


	function conicConformalPortugal(coordinates) {
		var x = coordinates[0], y = coordinates[1];
		return point = null,
			(iberianPeninsulePoint.point(x, y), point) ||
			(madeiraPoint.point(x, y), point) ||
			(azoresPoint.point(x, y), point);
	}

	conicConformalPortugal.invert = function(coordinates) {
		var k = iberianPeninsule.scale(),
			t = iberianPeninsule.translate(),
			x = (coordinates[0] - t[0]) / k,
			y = (coordinates[1] - t[1]) / k;

			/*
			//How are the return values calculated:
			console.info("******");
			var c0 = madeira(madeiraBbox[0]);
			var x0 = (c0[0] - t[0]) / k;
			var y0 = (c0[1] - t[1]) / k;

			console.info("p0 madeira", x0 + ' - ' + y0);

			var c1 = madeira(madeiraBbox[1]);
			var x1 = (c1[0] - t[0]) / k;
			var y1 = (c1[1] - t[1]) / k;

			console.info("p1 madeira", x1 + ' - ' + y1);

			c0 = azores(azoresBbox[0]);
			x0 = (c0[0] - t[0]) / k;
			y0 = (c0[1] - t[1]) / k;

			console.info("p0 azores", x0 + ' - ' + y0);

			c1 = azores(azoresBbox[1]);
			x1 = (c1[0] - t[0]) / k;
			y1 = (c1[1] - t[1]) / k;

			console.info("p1 azores", x1 + ' - ' + y1);
			*/

			return (y >= 0.0093 && y< 0.03678 && x >= -0.03875 && x < -0.0116 ? madeira
				: y >= -0.0412 && y< 0.0091 && x >= -0.07782 && x < -0.01166 ? azores
				: iberianPeninsule).invert(coordinates);
	};

	conicConformalPortugal.stream = function(stream) {
		return cache && cacheStream === stream ? cache : cache = multiplex$3([iberianPeninsule.stream(cacheStream = stream), madeira.stream(stream), azores.stream(stream)]);
	};

	conicConformalPortugal.precision = function(_) {
		if (!arguments.length) {return iberianPeninsule.precision();}
		iberianPeninsule.precision(_);
		madeira.precision(_);
		azores.precision(_);
		return conicConformalPortugal;
	};

	conicConformalPortugal.scale = function(_) {
		if (!arguments.length) {return iberianPeninsule.scale();}
		iberianPeninsule.scale(_);
		madeira.scale(_);
		azores.scale(_ * 0.6);
		return conicConformalPortugal.translate(iberianPeninsule.translate());
	};

	conicConformalPortugal.translate = function(_) {
		if (!arguments.length) {return iberianPeninsule.translate();}
		var k = iberianPeninsule.scale(), x = +_[0], y = +_[1];
		/*
		var c0 = iberianPeninsule(iberianPeninsuleBbox[0]);
	 var x0 = (x - c0[0]) / k;
	 var y0 = (y - c0[1]) / k;

	 var c1 = iberianPeninsule(iberianPeninsuleBbox[1]);
	 var x1 = (x - c1[0]) / k;
	 var y1 = (y - c1[1]) / k;

	 console.info('Iberian Peninsula: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
	 console.info('.clipExtent([[x '+
		(x0<0?'+ ':'- ') + Math.abs(x0.toFixed(4))+
		' * k, y '+
		(y0<0?'+ ':'- ') + Math.abs(y0.toFixed(4))+
		' * k],[x '+
		(x1<0?'+ ':'- ') + Math.abs(x1.toFixed(4))+
		' * k, y '+
		(y1<0?'+ ':'- ') + Math.abs(y1.toFixed(4))+
		' * k]])');

	 c0 = madeira.translate([x - 0.0265 * k, y + 0.025 * k])(madeiraBbox[0]);
	 x0 = (x - c0[0]) / k;
	 y0 = (y - c0[1]) / k;

	 c1 = madeira.translate([x - 0.0265 * k, y + 0.025 * k])(madeiraBbox[1]);
	 x1 = (x - c1[0]) / k;
	 y1 = (y - c1[1]) / k;

	 console.info('Madeira: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
	 console.info('.clipExtent([[x '+
		(x0<0?'+ ':'- ') + Math.abs(x0.toFixed(4))+
		' * k + epsilon, y '+
		(y0<0?'+ ':'- ') + Math.abs(y0.toFixed(4))+
		' * k + epsilon],[x '+
		(x1<0?'+ ':'- ') + Math.abs(x1.toFixed(4))+
		' * k - epsilon, y '+
		(y1<0?'+ ':'- ') + Math.abs(y1.toFixed(4))+
		' * k - epsilon]])');

		c0 = azores.translate([x - 0.045 * k, y + -0.02 * k])(azoresBbox[0]);
		x0 = (x - c0[0]) / k;
		y0 = (y - c0[1]) / k;

		c1 = azores.translate([x - 0.045 * k, y + -0.02 * k])(azoresBbox[1]);
		x1 = (x - c1[0]) / k;
		y1 = (y - c1[1]) / k;

		console.info('Azores: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
		console.info('.clipExtent([[x '+
		 (x0<0?'+ ':'- ') + Math.abs(x0.toFixed(4))+
		 ' * k + epsilon, y '+
		 (y0<0?'+ ':'- ') + Math.abs(y0.toFixed(4))+
		 ' * k + epsilon],[x '+
		 (x1<0?'+ ':'- ') + Math.abs(x1.toFixed(4))+
		 ' * k - epsilon, y '+
		 (y1<0?'+ ':'- ') + Math.abs(y1.toFixed(4))+
		 ' * k - epsilon]])');
		 */
		iberianPeninsulePoint = iberianPeninsule
			.translate(_)
			.clipExtent([[x - 0.0115 * k, y - 0.1138 * k],[x +0.2105 * k, y +0.0673 * k]])
			.stream(pointStream);


		madeiraPoint = madeira
			.translate([x - 0.0265 * k, y + 0.025 * k])
			.clipExtent([[x - 0.0388 * k + epsilon, y + 0.0093 * k + epsilon],[x - 0.0116 * k - epsilon, y + 0.0368 * k - epsilon]])
			.stream(pointStream);

		azoresPoint = azores
			.translate([x - 0.045 * k, y + -0.02 * k])
			.clipExtent([[x - 0.0778 * k + epsilon, y - 0.0413 * k + epsilon],[x - 0.0117 * k - epsilon, y + 0.0091 * k - epsilon]])
			.stream(pointStream);

		return conicConformalPortugal;
	};

	conicConformalPortugal.drawCompositionBorders = function(context) {
		/*
		console.info("CLIP EXTENT MADEIRA: ", madeira.clipExtent());
		console.info("UL BBOX:", iberianPeninsule.invert([madeira.clipExtent()[0][0], madeira.clipExtent()[0][1]]));
		console.info("UR BBOX:", iberianPeninsule.invert([madeira.clipExtent()[1][0], madeira.clipExtent()[0][1]]));
		console.info("LD BBOX:", iberianPeninsule.invert([madeira.clipExtent()[1][0], madeira.clipExtent()[1][1]]));
		console.info("LL BBOX:", iberianPeninsule.invert([madeira.clipExtent()[0][0], madeira.clipExtent()[1][1]]));

		console.info("CLIP EXTENT AZORES: ", azores.clipExtent());
		console.info("UL BBOX:", iberianPeninsule.invert([azores.clipExtent()[0][0], azores.clipExtent()[0][1]]));
		console.info("UR BBOX:", iberianPeninsule.invert([azores.clipExtent()[1][0], azores.clipExtent()[0][1]]));
		console.info("LD BBOX:", iberianPeninsule.invert([azores.clipExtent()[1][0], azores.clipExtent()[1][1]]));
		console.info("LL BBOX:", iberianPeninsule.invert([azores.clipExtent()[0][0], azores.clipExtent()[1][1]]));
		*/

		var ulmadeira = iberianPeninsule([-12.8351, 38.7113]);
		var urmadeira = iberianPeninsule([-10.8482, 38.7633]);
		var ldmadeira = iberianPeninsule([-10.8181, 37.2072]);
		var llmadeira = iberianPeninsule([-12.7345, 37.1573]);

		var ulazores = iberianPeninsule([-16.0753, 41.4436]);
		var urazores = iberianPeninsule([-10.9168, 41.6861]);
		var ldazores = iberianPeninsule([-10.8557, 38.7747]);
		var llazores = iberianPeninsule([-15.6728, 38.5505]);

		context.moveTo(ulmadeira[0], ulmadeira[1]);
		context.lineTo(urmadeira[0], urmadeira[1]);
		context.lineTo(ldmadeira[0], ldmadeira[1]);
		context.lineTo(ldmadeira[0], ldmadeira[1]);
		context.lineTo(llmadeira[0], llmadeira[1]);
		context.closePath();

		context.moveTo(ulazores[0], ulazores[1]);
		context.lineTo(urazores[0], urazores[1]);
		context.lineTo(ldazores[0], ldazores[1]);
		context.lineTo(ldazores[0], ldazores[1]);
		context.lineTo(llazores[0], llazores[1]);
		context.closePath();

	};
	conicConformalPortugal.getCompositionBorders = function() {
		var context = d3Path.path();
		this.drawCompositionBorders(context);
		return context.toString();
	};

	return conicConformalPortugal.scale(4200);
	}

	// The projections must have mutually exclusive clip regions on the sphere,
	// as this will avoid emitting interleaving lines and polygons.
	function multiplex$4(streams) {
	var n = streams.length;
	return {
		point: function(x, y) { var i = -1; while (++i < n) {streams[i].point(x, y); }},
		sphere: function() { var i = -1; while (++i < n) {streams[i].sphere(); }},
		lineStart: function() { var i = -1; while (++i < n) {streams[i].lineStart(); }},
		lineEnd: function() { var i = -1; while (++i < n) {streams[i].lineEnd(); }},
		polygonStart: function() { var i = -1; while (++i < n) {streams[i].polygonStart(); }},
		polygonEnd: function() { var i = -1; while (++i < n) {streams[i].polygonEnd(); }}
	};
	}

	// A composite projection for Ecuador, configured by default for 960脳500.
	function mercatorEcuador() {
	var cache,
		cacheStream,

		mainland = d3Geo.geoMercator().rotate([80, 1.5]), mainlandPoint,
		galapagos = d3Geo.geoMercator().rotate([90.73, 1]), galapagosPoint,

		point, pointStream = {point: function(x, y) { point = [x, y]; }};

		/*
		var mainlandBbox = [[-81.5, 2.7], [-70.0, -6.0]];
		var galapagosBbox = [[-92.2, 0.58], [-88.8, -1.8]];
		*/

	function mercatorEcuador(coordinates) {
		var x = coordinates[0], y = coordinates[1];
		return point = null,
			(mainlandPoint.point(x, y), point) ||
			(galapagosPoint.point(x, y), point);
	}

	mercatorEcuador.invert = function(coordinates) {
		var k = mainland.scale(),
			t = mainland.translate(),
			x = (coordinates[0] - t[0]) / k,
			y = (coordinates[1] - t[1]) / k;
			/*
			//How are the return values calculated:
			var c0 = galapagos(galapagosBbox[0]);
			var x0 = (c0[0] - t[0]) / k;
			var y0 = (c0[1] - t[1]) / k;

			console.info("p0 galapagos", x0 + ' - ' + y0);


			var c1 = galapagos(galapagosBbox[1]);
			var x1 = (c1[0] - t[0]) / k;
			var y1 = (c1[1] - t[1]) / k;

			console.info("p1 galapagos", x1 + ' - ' + y1);
			*/
			return (y >= -0.0676 && y< -0.026 && x >= -0.0857 && x < -0.0263 ? galapagos
				: mainland).invert(coordinates);
	};

	mercatorEcuador.stream = function(stream) {
		return cache && cacheStream === stream ? cache : cache = multiplex$4([mainland.stream(cacheStream = stream), galapagos.stream(stream)]);
	};

	mercatorEcuador.precision = function(_) {
		if (!arguments.length) {return mainland.precision();}
		mainland.precision(_);
		galapagos.precision(_);
		return mercatorEcuador;
	};

	mercatorEcuador.scale = function(_) {
		if (!arguments.length) {return mainland.scale();}
		mainland.scale(_);
		galapagos.scale(_);
		return mercatorEcuador.translate(mainland.translate());
	};

	mercatorEcuador.translate = function(_) {
		if (!arguments.length) {return mainland.translate();}
		var k = mainland.scale(), x = +_[0], y = +_[1];
		/*
		var c0 = mainland(mainlandBbox[0]);
	 var x0 = (x - c0[0]) / k;
	 var y0 = (y - c0[1]) / k;

	 var c1 = mainland(mainlandBbox[1]);
	 var x1 = (x - c1[0]) / k;
	 var y1 = (y - c1[1]) / k;

	 console.info('mainland: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
	 console.info('.clipExtent([[x '+
		(x0<0?'+ ':'- ') + Math.abs(x0.toFixed(4))+
		' * k, y '+
		(y0<0?'+ ':'- ') + Math.abs(y0.toFixed(4))+
		' * k],[x '+
		(x1<0?'+ ':'- ') + Math.abs(x1.toFixed(4))+
		' * k, y '+
		(y1<0?'+ ':'- ') + Math.abs(y1.toFixed(4))+
		' * k]])');

	 c0 = galapagos.translate([x - 0.06 * k, y - 0.04 * k])(galapagosBbox[0]);
	 x0 = (x - c0[0]) / k;
	 y0 = (y - c0[1]) / k;

	 c1 = galapagos.translate([x - 0.06 * k, y - 0.04 * k])(galapagosBbox[1]);
	 x1 = (x - c1[0]) / k;
	 y1 = (y - c1[1]) / k;

	 console.info('galapagos: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
	 console.info('.clipExtent([[x '+
		(x0<0?'+ ':'- ') + Math.abs(x0.toFixed(4))+
		' * k + epsilon, y '+
		(y0<0?'+ ':'- ') + Math.abs(y0.toFixed(4))+
		' * k + epsilon],[x '+
		(x1<0?'+ ':'- ') + Math.abs(x1.toFixed(4))+
		' * k - epsilon, y '+
		(y1<0?'+ ':'- ') + Math.abs(y1.toFixed(4))+
		' * k - epsilon]])');*/

		mainlandPoint = mainland
			.translate(_)
			.clipExtent([[x - 0.0262 * k, y - 0.0734 * k],[x + 0.1741 * k, y + 0.079 * k]])
			.stream(pointStream);

		galapagosPoint = galapagos
			.translate([x - 0.06 * k, y - 0.04 * k])
			.clipExtent([[x - 0.0857 * k + epsilon, y - 0.0676 * k + epsilon],[x - 0.0263 * k - epsilon, y - 0.026 * k - epsilon]])
			.stream(pointStream);

		return mercatorEcuador;
	};

	mercatorEcuador.drawCompositionBorders = function(context) {
		/*
		console.info("CLIP EXTENT: ", galapagos.clipExtent());
		console.info("UL BBOX:", mainland.invert([galapagos.clipExtent()[0][0], galapagos.clipExtent()[0][1]]));
		console.info("UR BBOX:", mainland.invert([galapagos.clipExtent()[1][0], galapagos.clipExtent()[0][1]]));
		console.info("LD BBOX:", mainland.invert([galapagos.clipExtent()[1][0], galapagos.clipExtent()[1][1]]));
		console.info("LL BBOX:", mainland.invert([galapagos.clipExtent()[0][0], galapagos.clipExtent()[1][1]]));
		*/

		var ulgalapagos = mainland([-84.9032, 2.3757]);
		var urgalapagos = mainland([-81.5047, 2.3708]);
		var ldgalapagos = mainland([-81.5063, -0.01]);
		var llgalapagos = mainland([-84.9086, -0.005]);

		context.moveTo(ulgalapagos[0], ulgalapagos[1]);
		context.lineTo(urgalapagos[0], urgalapagos[1]);
		context.lineTo(ldgalapagos[0], ldgalapagos[1]);
		context.lineTo(llgalapagos[0], llgalapagos[1]);
		context.closePath();

	};
	mercatorEcuador.getCompositionBorders = function() {
		var context = d3Path.path();
		this.drawCompositionBorders(context);
		return context.toString();
	};

	return mercatorEcuador.scale(3500);
	}

	// The projections must have mutually exclusive clip regions on the sphere,
	// as this will avoid emitting interleaving lines and polygons.
	function multiplex$5(streams) {
	var n = streams.length;
	return {
		point: function(x, y) { var i = -1; while (++i < n) {streams[i].point(x, y); }},
		sphere: function() { var i = -1; while (++i < n) {streams[i].sphere(); }},
		lineStart: function() { var i = -1; while (++i < n) {streams[i].lineStart(); }},
		lineEnd: function() { var i = -1; while (++i < n) {streams[i].lineEnd(); }},
		polygonStart: function() { var i = -1; while (++i < n) {streams[i].polygonStart(); }},
		polygonEnd: function() { var i = -1; while (++i < n) {streams[i].polygonEnd(); }}
	};
	}

	// A composite projection for Chile, configured by default for 960脳500.
	function transverseMercatorChile() {
	var cache,
		cacheStream,
		mainland = d3Geo.geoTransverseMercator().rotate([72, 37]), mainlandPoint,
		antarctic = d3Geo.geoStereographic().rotate([72, 0]), antarcticPoint,
		juanFernandez = d3Geo.geoMercator().rotate([80, 33.5]), juanFernandezPoint,
		pascua = d3Geo.geoMercator().rotate([110, 25]), pascuaPoint,

		point, pointStream = {point: function(x, y) { point = [x, y]; }};

		/*
		var mainlandBbox = [[-75.5, -15.0], [-32, -49.0]];
		var antarcticBbox = [[-91.0, -60.0], [-43.0, -90.0]];
		var juanFernandezBbox = [[-81.0, -33.0], [-78.5, -34.0]];
		var pascuaBbox = [[-110, -26.6], [-108.7, -27.5]];
		*/

	function transverseMercatorChile(coordinates) {
		var x = coordinates[0], y = coordinates[1];
		return point = null,
			(mainlandPoint.point(x, y), point) ||
			(antarcticPoint.point(x, y), point) ||
			(juanFernandezPoint.point(x, y), point) ||
			(pascuaPoint.point(x, y), point);
	}

	transverseMercatorChile.invert = function(coordinates) {
		var k = mainland.scale(),
			t = mainland.translate(),
			x = (coordinates[0] - t[0]) / k,
			y = (coordinates[1] - t[1]) / k;

			/*
			//How are the return values calculated:
			console.info("******");
			var c0 = antarctic(antarcticBbox[0]);
			var x0 = (c0[0] - t[0]) / k;
			var y0 = (c0[1] - t[1]) / k;

			console.info("p0 antarctic", x0 + ' - ' + y0);

			var c1 = antarctic(antarcticBbox[1]);
			var x1 = (c1[0] - t[0]) / k;
			var y1 = (c1[1] - t[1]) / k;

			console.info("p1 antarctic", x1 + ' - ' + y1);

			c0 = juanFernandez(juanFernandezBbox[0]);
			x0 = (c0[0] - t[0]) / k;
			y0 = (c0[1] - t[1]) / k;

			console.info("p0 juanFernandez", x0 + ' - ' + y0);

			c1 = juanFernandez(juanFernandezBbox[1]);
			x1 = (c1[0] - t[0]) / k;
			y1 = (c1[1] - t[1]) / k;

			console.info("p1 juanFernandez", x1 + ' - ' + y1);

			c0 = pascua(pascuaBbox[0]);
			x0 = (c0[0] - t[0]) / k;
			y0 = (c0[1] - t[1]) / k;

			console.info("p0 pascua", x0 + ' - ' + y0);

			c1 = pascua(pascuaBbox[1]);
			x1 = (c1[0] - t[0]) / k;
			y1 = (c1[1] - t[1]) / k;

			console.info("p1 pascua", x1 + ' - ' + y1);
			*/

			return (y >= 0.2582 && y< 0.32 && x >= -0.1036 && x < -0.087 ? antarctic
				: y >= -0.01298 && y< 0.0133 && x >= -0.11396 && x < -0.05944 ? juanFernandez
				: y >= 0.01539 && y< 0.03911 && x >= -0.089 && x < -0.0588 ? pascua
				: mainland).invert(coordinates);
	};

	transverseMercatorChile.stream = function(stream) {
		return cache && cacheStream === stream ? cache : cache = multiplex$5([mainland.stream(cacheStream = stream), antarctic.stream(stream), juanFernandez.stream(stream), pascua.stream(stream)]);
	};

	transverseMercatorChile.precision = function(_) {
		if (!arguments.length) {return mainland.precision();}
		mainland.precision(_);
		antarctic.precision(_);
		juanFernandez.precision(_);
		pascua.precision(_);
		return transverseMercatorChile;
	};

	transverseMercatorChile.scale = function(_) {
		if (!arguments.length) {return mainland.scale();}
		mainland.scale(_);
		antarctic.scale(_ * 0.15);
		juanFernandez.scale(_ * 1.5);
		pascua.scale(_ * 1.5);
		return transverseMercatorChile.translate(mainland.translate());
	};

	transverseMercatorChile.translate = function(_) {
		if (!arguments.length) {return mainland.translate();}
		var k = mainland.scale(), x = +_[0], y = +_[1];

		/*
		var c0 = mainland(mainlandBbox[0]);
	 var x0 = (x - c0[0]) / k;
	 var y0 = (y - c0[1]) / k;

	 var c1 = mainland(mainlandBbox[1]);
	 var x1 = (x - c1[0]) / k;
	 var y1 = (y - c1[1]) / k;

	 console.info('Mainland: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
	 console.info('.clipExtent([[x '+
		(x0<0?'+ ':'- ') + Math.abs(x0.toFixed(4))+
		' * k, y '+
		(y0<0?'+ ':'- ') + Math.abs(y0.toFixed(4))+
		' * k],[x '+
		(x1<0?'+ ':'- ') + Math.abs(x1.toFixed(4))+
		' * k, y '+
		(y1<0?'+ ':'- ') + Math.abs(y1.toFixed(4))+
		' * k]])');

	 c0 = antarctic.translate([x - 0.1 * k, y + 0.17 * k])(antarcticBbox[0]);
	 x0 = (x - c0[0]) / k;
	 y0 = (y - c0[1]) / k;

	 c1 = antarctic.translate([x - 0.1 * k, y + 0.17 * k])(antarcticBbox[1]);
	 x1 = (x - c1[0]) / k;
	 y1 = (y - c1[1]) / k;

	 console.info('antarctic: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
	 console.info('Doesn t work due to -90 latitude!' + '.clipExtent([[x '+
		(x0<0?'+ ':'- ') + Math.abs(x0.toFixed(4))+
		' * k + epsilon, y '+
		(y0<0?'+ ':'- ') + Math.abs(y0.toFixed(4))+
		' * k + epsilon],[x '+
		(x1<0?'+ ':'- ') + Math.abs(x1.toFixed(4))+
		' * k - epsilon, y '+
		(y1<0?'+ ':'- ') + Math.abs(y1.toFixed(4))+
		' * k - epsilon]])');

		c0 = juanFernandez.translate([x - 0.092 * k, y -0 * k])(juanFernandezBbox[0]);
		x0 = (x - c0[0]) / k;
		y0 = (y - c0[1]) / k;

		c1 = juanFernandez.translate([x - 0.092 * k, y -0 * k])(juanFernandezBbox[1]);
		x1 = (x - c1[0]) / k;
		y1 = (y - c1[1]) / k;

		console.info('juanFernandez: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
		console.info('.clipExtent([[x '+
		 (x0<0?'+ ':'- ') + Math.abs(x0.toFixed(4))+
		 ' * k + epsilon, y '+
		 (y0<0?'+ ':'- ') + Math.abs(y0.toFixed(4))+
		 ' * k + epsilon],[x '+
		 (x1<0?'+ ':'- ') + Math.abs(x1.toFixed(4))+
		 ' * k - epsilon, y '+
		 (y1<0?'+ ':'- ') + Math.abs(y1.toFixed(4))+
		 ' * k - epsilon]])');

		 c0 = pascua.translate([x - 0.089 * k, y -0.0265 * k])(pascuaBbox[0]);
		 x0 = (x - c0[0]) / k;
		 y0 = (y - c0[1]) / k;

		 c1 = pascua.translate([x - 0.089 * k, y -0.0265 * k])(pascuaBbox[1]);
		 x1 = (x - c1[0]) / k;
		 y1 = (y - c1[1]) / k;

		 console.info('pascua: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
		 console.info('.clipExtent([[x '+
		(x0<0?'+ ':'- ') + Math.abs(x0.toFixed(4))+
		' * k + epsilon, y '+
		(y0<0?'+ ':'- ') + Math.abs(y0.toFixed(4))+
		' * k + epsilon],[x '+
		(x1<0?'+ ':'- ') + Math.abs(x1.toFixed(4))+
		' * k - epsilon, y '+
		(y1<0?'+ ':'- ') + Math.abs(y1.toFixed(4))+
		' * k - epsilon]])');
		*/
		mainlandPoint = mainland
			.translate(_)
			.clipExtent([[x - 0.059 * k, y - 0.3835 * k],[x + 0.4498 * k, y + 0.3375 * k]])
			.stream(pointStream);

		antarcticPoint = antarctic
			.translate([x - 0.087 * k, y + 0.17 * k])
			.clipExtent([[x - 0.1166 * k + epsilon, y + 0.2582 * k + epsilon],[x - 0.06 * k - epsilon, y + 0.32 * k - epsilon]])
			.stream(pointStream);

		juanFernandezPoint = juanFernandez
			.translate([x - 0.092 * k, y - 0 * k])
			.clipExtent([[x - 0.114 * k + epsilon, y - 0.013 * k + epsilon],[x - 0.0594 * k - epsilon, y + 0.0133 * k - epsilon]])
			.stream(pointStream);

		pascuaPoint = pascua
			.translate([x - 0.089 * k, y - 0.0265 * k])
			.clipExtent([[x - 0.089 * k + epsilon, y + 0.0154 * k + epsilon],[x - 0.0588 * k - epsilon, y + 0.0391 * k - epsilon]])
			.stream(pointStream);

		return transverseMercatorChile;
	};

	transverseMercatorChile.drawCompositionBorders = function(context) {
		/*
		console.info("CLIP EXTENT antarctic: ", antarctic.clipExtent());
		console.info("UL BBOX:", mainland.invert([antarctic.clipExtent()[0][0], antarctic.clipExtent()[0][1]]));
		console.info("UR BBOX:", mainland.invert([antarctic.clipExtent()[1][0], antarctic.clipExtent()[0][1]]));
		console.info("LD BBOX:", mainland.invert([antarctic.clipExtent()[1][0], antarctic.clipExtent()[1][1]]));
		console.info("LL BBOX:", mainland.invert([antarctic.clipExtent()[0][0], antarctic.clipExtent()[1][1]]));

		console.info("CLIP EXTENT juanFernandez: ", juanFernandez.clipExtent());
		console.info("UL BBOX:", mainland.invert([juanFernandez.clipExtent()[0][0], juanFernandez.clipExtent()[0][1]]));
		console.info("UR BBOX:", mainland.invert([juanFernandez.clipExtent()[1][0], juanFernandez.clipExtent()[0][1]]));
		console.info("LD BBOX:", mainland.invert([juanFernandez.clipExtent()[1][0], juanFernandez.clipExtent()[1][1]]));
		console.info("LL BBOX:", mainland.invert([juanFernandez.clipExtent()[0][0], juanFernandez.clipExtent()[1][1]]));

		console.info("CLIP EXTENT pascua: ", pascua.clipExtent());
		console.info("UL BBOX:", mainland.invert([pascua.clipExtent()[0][0], pascua.clipExtent()[0][1]]));
		console.info("UR BBOX:", mainland.invert([pascua.clipExtent()[1][0], pascua.clipExtent()[0][1]]));
		console.info("LD BBOX:", mainland.invert([pascua.clipExtent()[1][0], pascua.clipExtent()[1][1]]));
		console.info("LL BBOX:", mainland.invert([pascua.clipExtent()[0][0], pascua.clipExtent()[1][1]]));
		*/

		var ulantarctic = mainland([-82.6999, -51.3043]);
		var urantarctic = mainland([-77.5442, -51.6631]);
		var ldantarctic = mainland([-78.0254, -55.1860]);
		var llantarctic = mainland([-83.6106, -54.7785]);

		var uljuanFernandez = mainland([-80.0638, -35.9840]);
		var urjuanFernandez = mainland([-76.2153, -36.1811]);
		var ldjuanFernandez = mainland([-76.2994, -37.6839]);
		var lljuanFernandez = mainland([-80.2231, -37.4757]);

		var ulpascua = mainland([-78.442, -37.706]);
		var urpascua = mainland([-76.263, -37.8054]);
		var ldpascua = mainland([-76.344, -39.1595]);
		var llpascua = mainland([-78.5638, -39.0559]);

		context.moveTo(ulantarctic[0], ulantarctic[1]);
		context.lineTo(urantarctic[0], urantarctic[1]);
		context.lineTo(ldantarctic[0], ldantarctic[1]);
		context.lineTo(ldantarctic[0], ldantarctic[1]);
		context.lineTo(llantarctic[0], llantarctic[1]);
		context.closePath();

		context.moveTo(uljuanFernandez[0], uljuanFernandez[1]);
		context.lineTo(urjuanFernandez[0], urjuanFernandez[1]);
		context.lineTo(ldjuanFernandez[0], ldjuanFernandez[1]);
		context.lineTo(ldjuanFernandez[0], ldjuanFernandez[1]);
		context.lineTo(lljuanFernandez[0], lljuanFernandez[1]);
		context.closePath();

		context.moveTo(ulpascua[0], ulpascua[1]);
		context.lineTo(urpascua[0], urpascua[1]);
		context.lineTo(ldpascua[0], ldpascua[1]);
		context.lineTo(ldpascua[0], ldpascua[1]);
		context.lineTo(llpascua[0], llpascua[1]);
		context.closePath();


	};
	transverseMercatorChile.getCompositionBorders = function() {
		var context = d3Path.path();
		this.drawCompositionBorders(context);
		return context.toString();
	};

	return transverseMercatorChile.scale(700);
	}

	// The projections must have mutually exclusive clip regions on the sphere,
	// as this will avoid emitting interleaving lines and polygons.
	function multiplex$6(streams) {
	var n = streams.length;
	return {
		point: function(x, y) { var i = -1; while (++i < n) {streams[i].point(x, y); }},
		sphere: function() { var i = -1; while (++i < n) {streams[i].sphere(); }},
		lineStart: function() { var i = -1; while (++i < n) {streams[i].lineStart(); }},
		lineEnd: function() { var i = -1; while (++i < n) {streams[i].lineEnd(); }},
		polygonStart: function() { var i = -1; while (++i < n) {streams[i].polygonStart(); }},
		polygonEnd: function() { var i = -1; while (++i < n) {streams[i].polygonEnd(); }}
	};
	}

	// A composite projection for Portugal, configured by default for 960脳500.
	function conicEquidistantJapan() {
	var cache,
		cacheStream,
		mainland = d3Geo.geoConicEquidistant().rotate([-136, -22]).parallels([40, 34]), mainlandPoint, //gis.stackexchange.com/a/73135
		hokkaido = d3Geo.geoConicEquidistant().rotate([-146, -26]).parallels([40, 34]), hokkaidoPoint,
		okinawa = d3Geo.geoConicEquidistant().rotate([-126, -19]).parallels([40, 34]), okinawaPoint,

		point, pointStream = {point: function(x, y) { point = [x, y]; }};

		/*
		var mainlandBbox = [[126.0, 41.606], [142.97, 29.97]];
		var hokkaidoBbox = [[138.7, 45.61], [146.2, 41.2]];
		var okinawaBbox = [[122.6, 29.0], [130, 23.7]];
		*/


	function conicEquidistantJapan(coordinates) {
		var x = coordinates[0], y = coordinates[1];
		return point = null,
			(mainlandPoint.point(x, y), point) ||
			(hokkaidoPoint.point(x, y), point) ||
			(okinawaPoint.point(x, y), point);
	}

	conicEquidistantJapan.invert = function(coordinates) {
		var k = mainland.scale(),
			t = mainland.translate(),
			x = (coordinates[0] - t[0]) / k,
			y = (coordinates[1] - t[1]) / k;

			/*
			//How are the return values calculated:
			console.info("******");
			var c0 = hokkaido(hokkaidoBbox[0]);
			var x0 = (c0[0] - t[0]) / k;
			var y0 = (c0[1] - t[1]) / k;

			console.info("p0 hokkaido", x0 + ' - ' + y0);

			var c1 = hokkaido(hokkaidoBbox[1]);
			var x1 = (c1[0] - t[0]) / k;
			var y1 = (c1[1] - t[1]) / k;

			console.info("p1 hokkaido", x1 + ' - ' + y1);

			c0 = okinawa(okinawaBbox[0]);
			x0 = (c0[0] - t[0]) / k;
			y0 = (c0[1] - t[1]) / k;

			console.info("p0 okinawa", x0 + ' - ' + y0);

			c1 = okinawa(okinawaBbox[1]);
			x1 = (c1[0] - t[0]) / k;
			y1 = (c1[1] - t[1]) / k;

			console.info("p1 okinawa", x1 + ' - ' + y1);
			*/

			return (y >= -0.10925 && y< -0.02701 && x >= -0.135 && x < -0.0397 ? hokkaido
				: y >= 0.04713 && y< 0.11138 && x >= -0.03986 && x < 0.051 ? okinawa
				: mainland).invert(coordinates);

	};

	conicEquidistantJapan.stream = function(stream) {
		return cache && cacheStream === stream ? cache : cache = multiplex$6([mainland.stream(cacheStream = stream), hokkaido.stream(stream), okinawa.stream(stream)]);
	};

	conicEquidistantJapan.precision = function(_) {
		if (!arguments.length) {return mainland.precision();}
		mainland.precision(_);
		hokkaido.precision(_);
		okinawa.precision(_);
		return conicEquidistantJapan;
	};

	conicEquidistantJapan.scale = function(_) {
		if (!arguments.length) {return mainland.scale();}
		mainland.scale(_);
		hokkaido.scale(_);
		okinawa.scale(_ * 0.7);
		return conicEquidistantJapan.translate(mainland.translate());
	};

	conicEquidistantJapan.translate = function(_) {
		if (!arguments.length) {return mainland.translate();}
		var k = mainland.scale(), x = +_[0], y = +_[1];

		/*
		var c0 = mainland(mainlandBbox[0]);
	 var x0 = (x - c0[0]) / k;
	 var y0 = (y - c0[1]) / k;

	 var c1 = mainland(mainlandBbox[1]);
	 var x1 = (x - c1[0]) / k;
	 var y1 = (y - c1[1]) / k;

	 console.info('Main: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
	 console.info('.clipExtent([[x '+
		(x0<0?'+ ':'- ') + Math.abs(x0.toFixed(4))+
		' * k, y '+
		(y0<0?'+ ':'- ') + Math.abs(y0.toFixed(4))+
		' * k],[x '+
		(x1<0?'+ ':'- ') + Math.abs(x1.toFixed(4))+
		' * k, y '+
		(y1<0?'+ ':'- ') + Math.abs(y1.toFixed(4))+
		' * k]])');

	 c0 = hokkaido.translate([x - 0.0425 * k, y - 0.005 * k])(hokkaidoBbox[0]);
	 x0 = (x - c0[0]) / k;
	 y0 = (y - c0[1]) / k;

	 c1 = hokkaido.translate([x - 0.0425 * k, y - 0.005 * k])(hokkaidoBbox[1]);
	 x1 = (x - c1[0]) / k;
	 y1 = (y - c1[1]) / k;

	 console.info('hokkaido: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
	 console.info('.clipExtent([[x '+
		(x0<0?'+ ':'- ') + Math.abs(x0.toFixed(4))+
		' * k + epsilon, y '+
		(y0<0?'+ ':'- ') + Math.abs(y0.toFixed(4))+
		' * k + epsilon],[x '+
		(x1<0?'+ ':'- ') + Math.abs(x1.toFixed(4))+
		' * k - epsilon, y '+
		(y1<0?'+ ':'- ') + Math.abs(y1.toFixed(4))+
		' * k - epsilon]])');

		c0 = okinawa.translate([x - 0 * k, y + 0 * k])(okinawaBbox[0]);
		x0 = (x - c0[0]) / k;
		y0 = (y - c0[1]) / k;

		c1 = okinawa.translate([x - 0 * k, y + 0 * k])(okinawaBbox[1]);
		x1 = (x - c1[0]) / k;
		y1 = (y - c1[1]) / k;

		console.info('okinawa: p0: ' + x0 + ', ' + y0 + ' , p1: ' + x1 + ' - ' + y1);
		console.info('.clipExtent([[x '+
		 (x0<0?'+ ':'- ') + Math.abs(x0.toFixed(4))+
		 ' * k + epsilon, y '+
		 (y0<0?'+ ':'- ') + Math.abs(y0.toFixed(4))+
		 ' * k + epsilon],[x '+
		 (x1<0?'+ ':'- ') + Math.abs(x1.toFixed(4))+
		 ' * k - epsilon, y '+
		 (y1<0?'+ ':'- ') + Math.abs(y1.toFixed(4))+
		 ' * k - epsilon]])');
		 */

		mainlandPoint = mainland
			.translate(_)
			.clipExtent([[x - 0.1352 * k, y - 0.1091 * k],[x + 0.117 * k, y + 0.098 * k]])
			.stream(pointStream);


		hokkaidoPoint = hokkaido
			.translate([x - 0.0425 * k, y - 0.005 * k])
			.clipExtent([[x - 0.135 * k + epsilon, y - 0.1093 * k + epsilon],[x - 0.0397 * k - epsilon, y - 0.027 * k - epsilon]])
			.stream(pointStream);

		okinawaPoint = okinawa
			.translate(_)
			.clipExtent([[x - 0.0399 * k + epsilon, y + 0.0471 * k + epsilon],[x + 0.051 * k - epsilon, y + 0.1114 * k - epsilon]])
			.stream(pointStream);

		return conicEquidistantJapan;
	};

	conicEquidistantJapan.drawCompositionBorders = function(context) {
		/*
		console.info("CLIP EXTENT hokkaido: ", hokkaido.clipExtent());
		console.info("UL BBOX:", mainland.invert([hokkaido.clipExtent()[0][0], hokkaido.clipExtent()[0][1]]));
		console.info("UR BBOX:", mainland.invert([hokkaido.clipExtent()[1][0], hokkaido.clipExtent()[0][1]]));
		console.info("LD BBOX:", mainland.invert([hokkaido.clipExtent()[1][0], hokkaido.clipExtent()[1][1]]));
		console.info("LL BBOX:", mainland.invert([hokkaido.clipExtent()[0][0], hokkaido.clipExtent()[1][1]]));
		*/

		var ulhokkaido = mainland([ 126.01320483689143, 41.621090310215585 ]);
		var urhokkaido = mainland([ 133.04304387025903, 42.15087523707186 ]);
		var ldhokkaido = mainland([ 133.3021766080688, 37.43975444725098 ]);
		var llhokkaido = mainland([ 126.87889168628224, 36.95488945159779 ]);

		var llokinawa = mainland([132.9, 29.8]);
		var lmokinawa = mainland([134, 33]);
		var lrokinawa = mainland([139.3, 33.2]);
		var llrokinawa = mainland([139.16, 30.5]);


		context.moveTo(ulhokkaido[0], ulhokkaido[1]);
		context.lineTo(urhokkaido[0], urhokkaido[1]);
		context.lineTo(ldhokkaido[0], ldhokkaido[1]);
		context.lineTo(llhokkaido[0], llhokkaido[1]);
		context.closePath();

		context.moveTo(llokinawa[0], llokinawa[1]);
		context.lineTo(lmokinawa[0], lmokinawa[1]);
		context.lineTo(lrokinawa[0], lrokinawa[1]);
		context.lineTo(llrokinawa[0], llrokinawa[1]);

	};
	conicEquidistantJapan.getCompositionBorders = function() {
		var context = d3Path.path();
		this.drawCompositionBorders(context);
		return context.toString();
	};

	return conicEquidistantJapan.scale(2200);
	}

	// The projections must have mutually exclusive clip regions on the sphere,
	// as this will avoid emitting interleaving lines and polygons.
	function multiplex$7(streams) {
	var n = streams.length;
	return {
		point: function(x, y) { var i = -1; while (++i < n) {streams[i].point(x, y); }},
		sphere: function() { var i = -1; while (++i < n) {streams[i].sphere(); }},
		lineStart: function() { var i = -1; while (++i < n) {streams[i].lineStart(); }},
		lineEnd: function() { var i = -1; while (++i < n) {streams[i].lineEnd(); }},
		polygonStart: function() { var i = -1; while (++i < n) {streams[i].polygonStart(); }},
		polygonEnd: function() { var i = -1; while (++i < n) {streams[i].polygonEnd(); }}
	};
	}

	// A composite projection for Portugal, configured by default for 960脳500.
	function conicConformalFrance() {
	var cache,
		cacheStream,
		europe = d3Geo.geoConicConformal().rotate([-3, -46.2]).parallels([0, 60]), europePoint,
		guyane = d3Geo.geoMercator().center([-53.2, 3.9]), guyanePoint,
		martinique = d3Geo.geoMercator().center([-61.03, 14.67]), martiniquePoint,
		guadeloupe = d3Geo.geoMercator().center([-61.46, 16.14]), guadeloupePoint,
		saintBarthlemy = d3Geo.geoMercator().center([-62.85, 17.92]), saintBarthlemyPoint,
		stPierreMichelon = d3Geo.geoMercator().center([-56.23, 46.93]), stPierreMichelonPoint,
		mayotte = d3Geo.geoMercator().center([45.16, -12.8]), mayottePoint,
		reunion = d3Geo.geoMercator().center([55.52, -21.13]), reunionPoint,
		nouvelleCaledonie = d3Geo.geoMercator().center([165.8, -21.07]), nouvelleCaledoniePoint,
		wallisFutuna = d3Geo.geoMercator().center([-178.1, -14.3]), wallisFutunaPoint,
		polynesie = d3Geo.geoMercator().center([-150.55, -17.11]), polynesiePoint,
		polynesie2 = d3Geo.geoMercator().center([-150.55, -17.11]), polynesie2Point,
		point, pointStream = {point: function(x, y) { point = [x, y]; }};

		/*
		var europeBbox = [[-6.5, 51], [10, 41]];
		var guyaneBbox = [[-54.5, 6.29], [-50.9, 1.48]];
		*/


	function conicConformalFrance(coordinates) {
		var x = coordinates[0], y = coordinates[1];
		return point = null,
			(europePoint.point(x, y), point) ||
			(guyanePoint.point(x, y), point) ||
			(martiniquePoint.point(x, y), point) ||
			(guadeloupePoint.point(x, y), point) ||
			(saintBarthlemyPoint.point(x, y), point) ||
			(stPierreMichelonPoint.point(x, y), point) ||
			(mayottePoint.point(x, y), point) ||
			(reunionPoint.point(x, y), point) ||
			(nouvelleCaledoniePoint.point(x, y), point) ||
			(wallisFutunaPoint.point(x, y), point) ||
			(polynesiePoint.point(x, y), point) ||
			(polynesie2Point.point(x, y), point);
	}

	conicConformalFrance.invert = function(coordinates) {
		var k = europe.scale(),
			t = europe.translate(),
			x = (coordinates[0] - t[0]) / k,
			y = (coordinates[1] - t[1]) / k;

			return (y >= 0.029 && y< 0.0864 && x >= -0.14 && x < -0.0996 ? guyane
				: y >= 0 && y< 0.029 && x >= -0.14 && x < -0.0996 ? martinique
				: y >= -0.032 && y< 0 && x >= -0.14 && x < -0.0996 ? guadeloupe
				: y >= -0.052 && y< -0.032 && x >= -0.14 && x < -0.0996 ? saintBarthlemy
				: y >= -0.076 && y< 0.052 && x >= -0.14 && x < -0.0996 ? stPierreMichelon
				: y >= -0.076 && y< -0.052 && x >= 0.0967 && x < 0.1371 ? mayotte
				: y >= -0.052 && y< -0.02 && x >= 0.0967 && x < 0.1371 ? reunion
				: y >= -0.02 && y< 0.012 && x >= 0.0967 && x < 0.1371 ? nouvelleCaledonie
				: y >= 0.012 && y< 0.033 && x >= 0.0967 && x < 0.1371 ? wallisFutuna
				: y >= 0.033 && y< 0.0864 && x >= 0.0967 && x < 0.1371 ? polynesie
				: europe).invert(coordinates);
	};

	conicConformalFrance.stream = function(stream) {
		return cache && cacheStream === stream ? cache : cache = multiplex$7([europe.stream(cacheStream = stream), guyane.stream(stream), martinique.stream(stream), guadeloupe.stream(stream), saintBarthlemy.stream(stream), stPierreMichelon.stream(stream), mayotte.stream(stream), reunion.stream(stream), nouvelleCaledonie.stream(stream), wallisFutuna.stream(stream), polynesie.stream(stream), polynesie2.stream(stream)]);
	};

	conicConformalFrance.precision = function(_) {
		if (!arguments.length) {return europe.precision();}
		europe.precision(_);
		guyane.precision(_);
		martinique.precision(_);
		guadeloupe.precision(_);
		saintBarthlemy.precision(_);
		stPierreMichelon.precision(_);
		mayotte.precision(_);
		reunion.precision(_);
		nouvelleCaledonie.precision(_);
		wallisFutuna.precision(_);
		polynesie.precision(_);
		polynesie2.precision(_);
		return conicConformalFrance;
	};

	conicConformalFrance.scale = function(_) {
		if (!arguments.length) {return europe.scale();}
		europe.scale(_);
		guyane.scale(_ * 0.6);
		martinique.scale(_ * 1.6);
		guadeloupe.scale(_ * 1.4);
		saintBarthlemy.scale(_ * 5);
		stPierreMichelon.scale(_ * 1.3);
		mayotte.scale(_ * 1.6);
		reunion.scale(_ * 1.2);
		nouvelleCaledonie.scale(_ * 0.3);
		wallisFutuna.scale(_ * 2.7);
		polynesie.scale(_ * 0.5);
		polynesie2.scale(_ * 0.06);
		return conicConformalFrance.translate(europe.translate());
	};

	conicConformalFrance.translate = function(_) {
		if (!arguments.length) {return europe.translate();}
		var k = europe.scale(), x = +_[0], y = +_[1];

		europePoint = europe
			.translate(_)
			.clipExtent([[x - 0.0996 * k, y - 0.0908 * k],[x + 0.0967 * k, y + 0.0864 * k]])
			.stream(pointStream);


		guyanePoint = guyane
			.translate([x - 0.12 * k, y + 0.0575 * k])
			.clipExtent([[x - 0.14 * k + epsilon, y + 0.029 * k + epsilon],[x - 0.0996 * k - epsilon, y + 0.0864 * k - epsilon]])
			.stream(pointStream);

		martiniquePoint = martinique
			.translate([x - 0.12 * k, y + 0.013 * k])
			.clipExtent([[x - 0.14 * k + epsilon, y + 0 * k + epsilon],[x - 0.0996 * k - epsilon, y + 0.029 * k - epsilon]])
			.stream(pointStream);

		guadeloupePoint = guadeloupe
			.translate([x - 0.12 * k, y -0.014 * k])
			.clipExtent([[x - 0.14 * k + epsilon, y - 0.032 * k + epsilon],[x - 0.0996 * k - epsilon, y + 0 * k - epsilon]])
			.stream(pointStream);

		saintBarthlemyPoint = saintBarthlemy
			.translate([x - 0.12 * k, y - 0.044 * k])
			.clipExtent([[x - 0.14 * k + epsilon, y - 0.052 * k + epsilon],[x - 0.0996 * k - epsilon, y - 0.032 * k - epsilon]])
			.stream(pointStream);

		stPierreMichelonPoint = stPierreMichelon
			.translate([x - 0.12 * k, y - 0.065 * k])
			.clipExtent([[x - 0.14 * k + epsilon, y - 0.076 * k + epsilon],[x - 0.0996 * k - epsilon, y - 0.052 * k - epsilon]])
			.stream(pointStream);

		mayottePoint = mayotte
			.translate([x + 0.117 * k, y - 0.064 * k])
			.clipExtent([[x + 0.0967 * k + epsilon, y - 0.076 * k + epsilon],[x + 0.1371 * k - epsilon, y - 0.052 * k - epsilon]])
			.stream(pointStream);

		reunionPoint = reunion
			.translate([x + 0.116 * k, y - 0.0355 * k])
			.clipExtent([[x + 0.0967 * k + epsilon, y - 0.052 * k + epsilon],[x + 0.1371 * k - epsilon, y - 0.02 * k - epsilon]])
			.stream(pointStream);

		nouvelleCaledoniePoint = nouvelleCaledonie
			.translate([x + 0.116 * k, y - 0.0048 * k])
			.clipExtent([[x + 0.0967 * k + epsilon, y - 0.02 * k + epsilon],[x + 0.1371 * k - epsilon, y + 0.012 * k - epsilon]])
			.stream(pointStream);

		wallisFutunaPoint = wallisFutuna
			.translate([x + 0.116 * k, y + 0.022 * k])
			.clipExtent([[x + 0.0967 * k + epsilon, y + 0.012 * k + epsilon],[x + 0.1371 * k - epsilon, y + 0.033 * k - epsilon]])
			.stream(pointStream);

		polynesie2Point = polynesie2
			.translate([x + 0.11 * k, y + 0.045 * k])
			.clipExtent([[x + 0.0967 * k + epsilon, y + 0.033 * k + epsilon],[x + 0.1371 * k - epsilon, y	+ 0.06 * k - epsilon]])
			.stream(pointStream);

		polynesiePoint = polynesie
			.translate([x + 0.115 * k, y + 0.075 * k])
			.clipExtent([[x + 0.0967 * k + epsilon, y + 0.06 * k + epsilon],[x + 0.1371 * k - epsilon, y	+ 0.0864 * k - epsilon]])
			.stream(pointStream);



		return conicConformalFrance;
	};

	conicConformalFrance.drawCompositionBorders = function(context) {

		/*
		console.log("var ul, ur, ld, ll;");
		var projs = [guyane, martinique, guadeloupe, saintBarthlemy, stPierreMichelon, mayotte, reunion, nouvelleCaledonie, wallisFutuna, polynesie, polynesie2];
		for (var i in projs){
		var ul = europe.invert([projs[i].clipExtent()[0][0], projs[i].clipExtent()[0][1]]);
		var ur = europe.invert([projs[i].clipExtent()[1][0], projs[i].clipExtent()[0][1]]);
		var ld = europe.invert([projs[i].clipExtent()[1][0], projs[i].clipExtent()[1][1]]);
		var ll = europe.invert([projs[i].clipExtent()[0][0], projs[i].clipExtent()[1][1]]);

		console.log("ul = europe(["+ul+"]);");
		console.log("ur = europe(["+ur+"]);");
		console.log("ld = europe(["+ld+"]);");
		console.log("ll = europe(["+ll+"]);");

		console.log("context.moveTo(ul[0], ul[1]);");
		console.log("context.lineTo(ur[0], ur[1]);");
		console.log("context.lineTo(ld[0], ld[1]);");
		console.log("context.lineTo(ll[0], ll[1]);");
		console.log("context.closePath();");

		}*/

		var ul, ur, ld, ll;
		ul = europe([-7.938886725111036,43.7219460918835]);
		ur = europe([-4.832080896458295,44.12930268549372]);
		ld = europe([-4.205299743793263,40.98096346967365]);
		ll = europe([-7.071796453126152,40.610037319181444]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([-8.42751373617692,45.32889452553031]);
		ur = europe([-5.18599305777107,45.7566442062976]);
		ld = europe([-4.832080905154431,44.129302726751426]);
		ll = europe([-7.938886737126192,43.72194613263854]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([-9.012656899657046,47.127733821030176]);
		ur = europe([-5.6105244772793155,47.579777861410626]);
		ld = europe([-5.185993067168585,45.756644248170346]);
		ll = europe([-8.427513749141811,45.32889456686326]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([-9.405747558985553,48.26506375557457]);
		ur = europe([-5.896175018439575,48.733352850851624]);
		ld = europe([-5.610524487556043,47.57977790393761]);
		ll = europe([-9.012656913808351,47.127733862971255]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([-9.908436061346974,49.642448789505856]);
		ur = europe([-6.262026716233124,50.131426841787174]);
		ld = europe([-5.896175029331232,48.73335289377258]);
		ll = europe([-9.40574757396393,48.26506379787767]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([11.996907706504462,50.16039028163579]);
		ur = europe([15.649907879773343,49.68279246765253]);
		ld = europe([15.156712840526632,48.30371557625831]);
		ll = europe([11.64122661754411,48.761078240546816]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([11.641226606955788,48.7610781975889]);
		ur = europe([15.156712825832164,48.30371553390465]);
		ld = europe([14.549932166241172,46.4866532486199]);
		ll = europe([11.204443787952183,46.91899233914248]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([11.204443778297161,46.918992296823646]);
		ur = europe([14.549932152815039,46.486653206856396]);
		ld = europe([13.994409796764009,44.695833444323256]);
		ll = europe([10.805306599253848,45.105133870684924]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([10.805306590412085,45.10513382903308]);
		ur = europe([13.99440978444733,44.695833403183606]);
		ld = europe([13.654633799024392,43.53552468558152]);
		ll = europe([10.561516803980956,43.930671459798624]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();

		ul = europe([10.561516795617383,43.93067141859757]);
		ur = europe([13.654633787361952,43.5355246448671]);
		ld = europe([12.867691604239901,40.640701985019405]);
		ll = europe([9.997809515987688,41.00288343254471]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();

		ul = europe([10.8,42.4]);
		ur = europe([12.8,42.13]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);

	};
	conicConformalFrance.getCompositionBorders = function() {
		var context = d3Path.path();
		this.drawCompositionBorders(context);
		return context.toString();
	};

	return conicConformalFrance.scale(2700);
	}

	// The projections must have mutually exclusive clip regions on the sphere,
	// as this will avoid emitting interleaving lines and polygons.
	function multiplex$8(streams) {
	var n = streams.length;
	return {
		point: function(x, y) { var i = -1; while (++i < n) {streams[i].point(x, y); }},
		sphere: function() { var i = -1; while (++i < n) {streams[i].sphere(); }},
		lineStart: function() { var i = -1; while (++i < n) {streams[i].lineStart(); }},
		lineEnd: function() { var i = -1; while (++i < n) {streams[i].lineEnd(); }},
		polygonStart: function() { var i = -1; while (++i < n) {streams[i].polygonStart(); }},
		polygonEnd: function() { var i = -1; while (++i < n) {streams[i].polygonEnd(); }}
	};
	}

	// A composite projection for Portugal, configured by default for 960脳500.
	function conicConformalEurope() {
	var cache,
		cacheStream,
		europe = d3Geo.geoConicConformal().rotate([-10, -53]).parallels([0, 60]), europePoint,
		guadeloupe = d3Geo.geoMercator().center([-61.46, 16.14]), guadeloupePoint,
		guyane = d3Geo.geoMercator().center([-53.2, 3.9]), guyanePoint,
		azores = d3Geo.geoConicConformal().rotate([27.8, -38.9]).parallels([0, 60]), azoresPoint,
		azores2 = d3Geo.geoConicConformal().rotate([25.43, -37.398]).parallels([0, 60]), azores2Point,
		azores3 = d3Geo.geoConicConformal().rotate([31.17, -39.539]).parallels([0, 60]), azores3Point,
		madeira = d3Geo.geoConicConformal().rotate([17, -32.7]).parallels([0, 60]), madeiraPoint,
		canaryIslands = d3Geo.geoConicConformal().rotate([16, -28.5]).parallels([0,60]), canaryIslandsPoint,
		martinique = d3Geo.geoMercator().center([-61.03, 14.67]), martiniquePoint,
		mayotte = d3Geo.geoMercator().center([45.16, -12.8]), mayottePoint,
		reunion = d3Geo.geoMercator().center([55.52, -21.13]), reunionPoint,
		malta = d3Geo.geoConicConformal().rotate([-14.4, -35.95]).parallels([0, 60]), maltaPoint,
					
		
		
		
		
		point, pointStream = {point: function(x, y) { point = [x, y]; }};

		/*
		var europeBbox = [[-6.5, 51], [10, 41]];
		var guyaneBbox = [[-54.5, 6.29], [-50.9, 1.48]];
		*/


	function conicConformalEurope(coordinates) {
		var x = coordinates[0], y = coordinates[1];
		return point = null,
			(europePoint.point(x, y), point) ||
			(guyanePoint.point(x, y), point) ||
			(martiniquePoint.point(x, y), point) ||
			(guadeloupePoint.point(x, y), point) ||
			(canaryIslandsPoint.point(x, y), point) ||
			(madeiraPoint.point(x, y), point) ||
			(mayottePoint.point(x, y), point) ||
			(reunionPoint.point(x, y), point) ||
			(maltaPoint.point(x, y), point) ||
			(azoresPoint.point(x, y), point) ||
			(azores2Point.point(x, y), point) ||
			(azores3Point.point(x, y), point);
	}

	conicConformalEurope.invert = function(coordinates) {
		var k = europe.scale(),
			t = europe.translate(),
			x = (coordinates[0] - (t[0] + 0.08 * k)) / k,
			y = (coordinates[1] - t[1]) / k;

			return (y >= -0.31 && y< -0.24 && x >= 0.14 && x < 0.24 ? guadeloupe
				: y >= -0.24 && y< -0.17 && x >= 0.14 && x < 0.24 ? guyane
				: y >= -0.17 && y< -0.12 && x >= 0.21 && x < 0.24 ? azores2
				: y >= -0.17 && y< -0.14 && x >= 0.14 && x < 0.165 ? azores3
				: y >= -0.17 && y< -0.1 && x >= 0.14 && x < 0.24 ? azores
				: y >= -0.1 && y< -0.03 && x >= 0.14 && x < 0.24 ? madeira
				: y >= -0.03 && y< 0.04 && x >= 0.14 && x < 0.24 ? canaryIslands
				: y >= -0.31 && y< -0.24 && x >= 0.24 && x < 0.34 ? martinique
				: y >= -0.24 && y< -0.17 && x >= 0.24 && x < 0.34 ? mayotte
				: y >= -0.17 && y< -0.1 && x >= 0.24 && x < 0.34 ? reunion
				: y >= -0.1 && y< -0.03 && x >= 0.24 && x < 0.34 ? malta
				: europe).invert(coordinates);

	};

	conicConformalEurope.stream = function(stream) {
		return cache && cacheStream === stream ? cache : cache = multiplex$8([europe.stream(cacheStream = stream), guyane.stream(stream), martinique.stream(stream), guadeloupe.stream(stream), canaryIslands.stream(stream), madeira.stream(stream), mayotte.stream(stream), reunion.stream(stream), malta.stream(stream), azores.stream(stream), azores2.stream(stream), azores3.stream(stream)]);
	};

	conicConformalEurope.precision = function(_) {
		if (!arguments.length) {return europe.precision();}
		europe.precision(_);
		guyane.precision(_);
		martinique.precision(_);
		guadeloupe.precision(_);
		canaryIslands.precision(_);
		madeira.precision(_);
		mayotte.precision(_);
		reunion.precision(_);
		malta.precision(_);

		azores.precision(_);
		azores2.precision(_);
		azores3.precision(_);
		return conicConformalEurope;
	};

	conicConformalEurope.scale = function(_) {
		if (!arguments.length) {return europe.scale();}
		europe.scale(_);
		guadeloupe.scale(_ * 3);
		guyane.scale(_ * 0.8);
		martinique.scale(_ * 3.5);
		reunion.scale(_ * 2.7);
		azores.scale(_ * 2);
		azores2.scale(_ * 2);
		azores3.scale(_ * 2);
		madeira.scale(_ * 3);
		canaryIslands.scale(_);
	 
		mayotte.scale(_ * 5.5);
		malta.scale(_ * 6);
		
		
		
		return conicConformalEurope.translate(europe.translate());
	};

	conicConformalEurope.translate = function(_) {
		if (!arguments.length) {return europe.translate();}
		var k = europe.scale(), x = +_[0], y = +_[1];

		europePoint = europe
			.translate([x - 0.08 * k, y])
			.clipExtent([[x - 0.51 * k, y - 0.33 * k],[x + 0.5 * k, y + 0.33 * k]])
			.stream(pointStream);
		
		guadeloupePoint = guadeloupe
			.translate([x + 0.19 * k, y - 0.275 * k])
			.clipExtent([[x + 0.14 * k + epsilon, y - 0.31 * k + epsilon],[x + 0.24 * k - epsilon, y - 0.24 * k - epsilon]])
			.stream(pointStream);

		guyanePoint = guyane
			.translate([x + 0.19 * k, y - 0.205 * k])
			.clipExtent([[x + 0.14 * k + epsilon, y - 0.24 * k + epsilon],[x + 0.24 * k - epsilon, y - 0.17 * k - epsilon]])
			.stream(pointStream);

		azoresPoint = azores
			.translate([x + 0.19 * k, y - 0.135 * k])
			.clipExtent([[x + 0.14 * k + epsilon, y - 0.17 * k + epsilon],[x + 0.24 * k - epsilon, y - 0.1 * k - epsilon]])
			.stream(pointStream);

		azores2Point = azores2
			.translate([x + 0.225 * k, y - 0.147 * k])
			.clipExtent([[x + 0.21 * k + epsilon, y - 0.17 * k + epsilon],[x + 0.24 * k - epsilon, y - 0.12 * k - epsilon]])
			.stream(pointStream);

		azores3Point = azores3
			.translate([x + 0.153 * k, y - 0.15 * k])
			.clipExtent([[x + 0.14 * k + epsilon, y - 0.17 * k + epsilon],[x + 0.165 * k - epsilon, y - 0.14 * k - epsilon]])
			.stream(pointStream);		

		madeiraPoint = madeira
			.translate([x + 0.19 * k, y - 0.065 * k])
			.clipExtent([[x + 0.14 * k + epsilon, y - 0.1 * k + epsilon],[x + 0.24 * k - epsilon, y - 0.03 * k - epsilon]])
			.stream(pointStream);

		canaryIslandsPoint = canaryIslands
			.translate([x + 0.19 * k, y + 0.005 * k])
			.clipExtent([[x + 0.14 * k + epsilon, y - 0.03 * k + epsilon],[x + 0.24 * k - epsilon, y + 0.04 * k - epsilon]])
			.stream(pointStream);

		martiniquePoint = martinique
			.translate([x + 0.29 * k, y - 0.275 * k])
			.clipExtent([[x + 0.24 * k + epsilon, y - 0.31 * k + epsilon],[x + 0.34 * k - epsilon, y - 0.24 * k - epsilon]])
			.stream(pointStream);

		mayottePoint = mayotte		
			.translate([x + 0.29 * k, y - 0.205 * k])
			.clipExtent([[x + 0.24 * k + epsilon, y - 0.24 * k + epsilon],[x + 0.34 * k - epsilon, y - 0.17 * k - epsilon]])
			.stream(pointStream);

		reunionPoint = reunion
			.translate([x + 0.29 * k, y - 0.135 * k])
			.clipExtent([[x + 0.24 * k + epsilon, y - 0.17 * k + epsilon],[x + 0.34 * k - epsilon, y - 0.1 * k - epsilon]])
			.stream(pointStream);
	 
		maltaPoint = malta
			.translate([x + 0.29 * k, y - 0.065 * k])
			.clipExtent([[x + 0.24 * k + epsilon, y - 0.1 * k + epsilon],[x + 0.34 * k - epsilon, y - 0.03 * k - epsilon]])
			.stream(pointStream);
		


		return conicConformalEurope;
	};

	conicConformalEurope.drawCompositionBorders = function(context) {

		/*
		console.log("var ul, ur, ld, ll;");
		var projs = [guyane, martinique, guadeloupe, canaryIslands, madeira, mayotte, reunion, malta, azores, azores2, azores3];
		for (var i in projs){
		var ul = europe.invert([projs[i].clipExtent()[0][0], projs[i].clipExtent()[0][1]]);
		var ur = europe.invert([projs[i].clipExtent()[1][0], projs[i].clipExtent()[0][1]]);
		var ld = europe.invert([projs[i].clipExtent()[1][0], projs[i].clipExtent()[1][1]]);
		var ll = europe.invert([projs[i].clipExtent()[0][0], projs[i].clipExtent()[1][1]]);

		console.log("ul = europe(["+ul+"]);");
		console.log("ur = europe(["+ur+"]);");
		console.log("ld = europe(["+ld+"]);");
		console.log("ll = europe(["+ll+"]);");

		console.log("context.moveTo(ul[0], ul[1]);");
		console.log("context.lineTo(ur[0], ur[1]);");
		console.log("context.lineTo(ld[0], ld[1]);");
		console.log("context.lineTo(ll[0], ll[1]);");
		console.log("context.closePath();");

		}*/

		var ul, ur, ld, ll;
		ul = europe([42.45755610828648,63.343658547914934]);
		ur = europe([52.65837266667029,59.35045080290929]);
		ld = europe([47.19754502247785,56.12653496548117]);
		ll = europe([37.673034273363044,59.61638268506111]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([59.41110754003403,62.35069727399336]);
		ur = europe([66.75050228640794,57.11797303636038]);
		ld = europe([60.236065725110436,54.63331433818992]);
		ll = europe([52.65837313153311,59.350450804599355]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([48.81091130080243,66.93353402634641]);
		ur = europe([59.41110730654679,62.35069740653086]);
		ld = europe([52.6583728974441,59.3504509222445]);
		ll = europe([42.45755631675751,63.34365868805821]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([31.054198418446475,52.1080673766184]);
		ur = europe([39.09869284884117,49.400700047190554]);
		ld = europe([36.0580811499175,46.02944174908498]);
		ll = europe([28.690508588835726,48.433126979386415]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([33.977877745912025,55.849945501331]);
		ur = europe([42.75328432167726,52.78455122462353]);
		ld = europe([39.09869297540224,49.400700176148625]);
		ll = europe([31.05419851807008,52.10806751810923]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([52.658372900759296,59.35045068526415]);
		ur = europe([60.23606549583304,54.63331423800264]);
		ld = europe([54.6756370953122,51.892298789399455]);
		ll = europe([47.19754524788189,56.126534861222794]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([47.19754506082455,56.126534735591456]);
		ur = europe([54.675636900123514,51.892298681337095]);
		ld = europe([49.94448648951486,48.98775484983285]);
		ll = europe([42.75328468716108,52.78455126060818]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([42.75328453416769,52.78455113209101]);
		ur = europe([49.94448632339758,48.98775473706457]);
		ld = europe([45.912339990394315,45.99361784987003]);
		ll = europe([39.09869317356607,49.40070009378711]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([37.673034114296634,59.61638254183119]);
		ur = europe([47.197544835420544,56.126534839849846]);
		ld = europe([42.75328447467064,52.78455135314068]);
		ll = europe([33.977877870363905,55.849945644671145]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([44.56748486446032,57.26489367845818]);
		ld = europe([43.9335791193588,53.746540942601726]);
		ll = europe([43,56]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();
		ul = europe([37.673034114296634,59.61638254183119]);
		ur = europe([40.25902691953466,58.83002044222639]);
		ld = europe([38.458270492742024,57.26232178028002]);
		ll = europe([35.97754948030156,58.00266637992386]);
		context.moveTo(ul[0], ul[1]);
		context.lineTo(ur[0], ur[1]);
		context.lineTo(ld[0], ld[1]);
		context.lineTo(ll[0], ll[1]);
		context.closePath();

		

	};
	conicConformalEurope.getCompositionBorders = function() {
		var context = d3Path.path();
		this.drawCompositionBorders(context);
		return context.toString();
	};

	return conicConformalEurope.scale(750);
	}

	exports.geoAlbersUsa = albersUsa;
	exports.geoAlbersUsaTerritories = albersUsaTerritories;
	exports.geoConicConformalSpain = conicConformalSpain;
	exports.geoConicConformalPortugal = conicConformalPortugal;
	exports.geoMercatorEcuador = mercatorEcuador;
	exports.geoTransverseMercatorChile = transverseMercatorChile;
	exports.geoConicEquidistantJapan = conicEquidistantJapan;
	exports.geoConicConformalFrance = conicConformalFrance;
	exports.geoConicConformalEurope = conicConformalEurope;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
},{"d3-geo":6,"d3-path":12}],6:[function(require,module,exports){
// https://d3js.org/d3-geo/ Version 1.2.4. Copyright 2016 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-array')) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3-array'], factory) :
	(factory((global.d3 = global.d3 || {}),global.d3));
}(this, (function (exports,d3Array) { 'use strict';

// Adds floating point numbers with twice the normal precision.
// Reference: J. R. Shewchuk, Adaptive Precision Floating-Point Arithmetic and
// Fast Robust Geometric Predicates, Discrete & Computational Geometry 18(3)
// 305鈥�363 (1997).
// Code adapted from GeographicLib by Charles F. F. Karney,
// http://geographiclib.sourceforge.net/

function adder() {
	return new Adder;
}

function Adder() {
	this.reset();
}

Adder.prototype = {
	constructor: Adder,
	reset: function() {
	this.s = // rounded value
	this.t = 0; // exact error
	},
	add: function(y) {
	add(temp, y, this.t);
	add(this, temp.s, this.s);
	if (this.s) this.t += temp.t;
	else this.s = temp.t;
	},
	valueOf: function() {
	return this.s;
	}
};

var temp = new Adder;

function add(adder, a, b) {
	var x = adder.s = a + b,
		bv = x - a,
		av = x - bv;
	adder.t = (a - av) + (b - bv);
}

var epsilon = 1e-6;
var epsilon2 = 1e-12;
var pi = Math.PI;
var halfPi = pi / 2;
var quarterPi = pi / 4;
var tau = pi * 2;

var degrees = 180 / pi;
var radians = pi / 180;

var abs = Math.abs;
var atan = Math.atan;
var atan2 = Math.atan2;
var cos = Math.cos;
var ceil = Math.ceil;
var exp = Math.exp;
var log = Math.log;
var pow = Math.pow;
var sin = Math.sin;
var sign = Math.sign || function(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; };
var sqrt = Math.sqrt;
var tan = Math.tan;

function acos(x) {
	return x > 1 ? 0 : x < -1 ? pi : Math.acos(x);
}

function asin(x) {
	return x > 1 ? halfPi : x < -1 ? -halfPi : Math.asin(x);
}

function haversin(x) {
	return (x = sin(x / 2)) * x;
}

function noop() {}

function streamGeometry(geometry, stream) {
	if (geometry && streamGeometryType.hasOwnProperty(geometry.type)) {
	streamGeometryType[geometry.type](geometry, stream);
	}
}

var streamObjectType = {
	Feature: function(feature, stream) {
	streamGeometry(feature.geometry, stream);
	},
	FeatureCollection: function(object, stream) {
	var features = object.features, i = -1, n = features.length;
	while (++i < n) streamGeometry(features[i].geometry, stream);
	}
};

var streamGeometryType = {
	Sphere: function(object, stream) {
	stream.sphere();
	},
	Point: function(object, stream) {
	object = object.coordinates;
	stream.point(object[0], object[1], object[2]);
	},
	MultiPoint: function(object, stream) {
	var coordinates = object.coordinates, i = -1, n = coordinates.length;
	while (++i < n) object = coordinates[i], stream.point(object[0], object[1], object[2]);
	},
	LineString: function(object, stream) {
	streamLine(object.coordinates, stream, 0);
	},
	MultiLineString: function(object, stream) {
	var coordinates = object.coordinates, i = -1, n = coordinates.length;
	while (++i < n) streamLine(coordinates[i], stream, 0);
	},
	Polygon: function(object, stream) {
	streamPolygon(object.coordinates, stream);
	},
	MultiPolygon: function(object, stream) {
	var coordinates = object.coordinates, i = -1, n = coordinates.length;
	while (++i < n) streamPolygon(coordinates[i], stream);
	},
	GeometryCollection: function(object, stream) {
	var geometries = object.geometries, i = -1, n = geometries.length;
	while (++i < n) streamGeometry(geometries[i], stream);
	}
};

function streamLine(coordinates, stream, closed) {
	var i = -1, n = coordinates.length - closed, coordinate;
	stream.lineStart();
	while (++i < n) coordinate = coordinates[i], stream.point(coordinate[0], coordinate[1], coordinate[2]);
	stream.lineEnd();
}

function streamPolygon(coordinates, stream) {
	var i = -1, n = coordinates.length;
	stream.polygonStart();
	while (++i < n) streamLine(coordinates[i], stream, 1);
	stream.polygonEnd();
}

function geoStream(object, stream) {
	if (object && streamObjectType.hasOwnProperty(object.type)) {
	streamObjectType[object.type](object, stream);
	} else {
	streamGeometry(object, stream);
	}
}

var areaRingSum = adder();

var areaSum = adder();
var lambda00;
var phi00;
var lambda0;
var cosPhi0;
var sinPhi0;
var areaStream = {
	point: noop,
	lineStart: noop,
	lineEnd: noop,
	polygonStart: function() {
	areaRingSum.reset();
	areaStream.lineStart = areaRingStart;
	areaStream.lineEnd = areaRingEnd;
	},
	polygonEnd: function() {
	var areaRing = +areaRingSum;
	areaSum.add(areaRing < 0 ? tau + areaRing : areaRing);
	this.lineStart = this.lineEnd = this.point = noop;
	},
	sphere: function() {
	areaSum.add(tau);
	}
};

function areaRingStart() {
	areaStream.point = areaPointFirst;
}

function areaRingEnd() {
	areaPoint(lambda00, phi00);
}

function areaPointFirst(lambda, phi) {
	areaStream.point = areaPoint;
	lambda00 = lambda, phi00 = phi;
	lambda *= radians, phi *= radians;
	lambda0 = lambda, cosPhi0 = cos(phi = phi / 2 + quarterPi), sinPhi0 = sin(phi);
}

function areaPoint(lambda, phi) {
	lambda *= radians, phi *= radians;
	phi = phi / 2 + quarterPi; // half the angular distance from south pole

	// Spherical excess E for a spherical triangle with vertices: south pole,
	// previous point, current point.	Uses a formula derived from Cagnoli鈥檚
	// theorem.	See Todhunter, Spherical Trig. (1871), Sec. 103, Eq. (2).
	var dLambda = lambda - lambda0,
		sdLambda = dLambda >= 0 ? 1 : -1,
		adLambda = sdLambda * dLambda,
		cosPhi = cos(phi),
		sinPhi = sin(phi),
		k = sinPhi0 * sinPhi,
		u = cosPhi0 * cosPhi + k * cos(adLambda),
		v = k * sdLambda * sin(adLambda);
	areaRingSum.add(atan2(v, u));

	// Advance the previous points.
	lambda0 = lambda, cosPhi0 = cosPhi, sinPhi0 = sinPhi;
}

function area(object) {
	areaSum.reset();
	geoStream(object, areaStream);
	return areaSum * 2;
}

function spherical(cartesian) {
	return [atan2(cartesian[1], cartesian[0]), asin(cartesian[2])];
}

function cartesian(spherical) {
	var lambda = spherical[0], phi = spherical[1], cosPhi = cos(phi);
	return [cosPhi * cos(lambda), cosPhi * sin(lambda), sin(phi)];
}

function cartesianDot(a, b) {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cartesianCross(a, b) {
	return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

// TODO return a
function cartesianAddInPlace(a, b) {
	a[0] += b[0], a[1] += b[1], a[2] += b[2];
}

function cartesianScale(vector, k) {
	return [vector[0] * k, vector[1] * k, vector[2] * k];
}

// TODO return d
function cartesianNormalizeInPlace(d) {
	var l = sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
	d[0] /= l, d[1] /= l, d[2] /= l;
}

var lambda0$1;
var phi0;
var lambda1;
var phi1;
var lambda2;
var lambda00$1;
var phi00$1;
var p0;
var deltaSum = adder();
var ranges;
var range$1;
var boundsStream = {
	point: boundsPoint,
	lineStart: boundsLineStart,
	lineEnd: boundsLineEnd,
	polygonStart: function() {
	boundsStream.point = boundsRingPoint;
	boundsStream.lineStart = boundsRingStart;
	boundsStream.lineEnd = boundsRingEnd;
	deltaSum.reset();
	areaStream.polygonStart();
	},
	polygonEnd: function() {
	areaStream.polygonEnd();
	boundsStream.point = boundsPoint;
	boundsStream.lineStart = boundsLineStart;
	boundsStream.lineEnd = boundsLineEnd;
	if (areaRingSum < 0) lambda0$1 = -(lambda1 = 180), phi0 = -(phi1 = 90);
	else if (deltaSum > epsilon) phi1 = 90;
	else if (deltaSum < -epsilon) phi0 = -90;
	range$1[0] = lambda0$1, range$1[1] = lambda1;
	}
};

function boundsPoint(lambda, phi) {
	ranges.push(range$1 = [lambda0$1 = lambda, lambda1 = lambda]);
	if (phi < phi0) phi0 = phi;
	if (phi > phi1) phi1 = phi;
}

function linePoint(lambda, phi) {
	var p = cartesian([lambda * radians, phi * radians]);
	if (p0) {
	var normal = cartesianCross(p0, p),
		equatorial = [normal[1], -normal[0], 0],
		inflection = cartesianCross(equatorial, normal);
	cartesianNormalizeInPlace(inflection);
	inflection = spherical(inflection);
	var delta = lambda - lambda2,
		sign = delta > 0 ? 1 : -1,
		lambdai = inflection[0] * degrees * sign,
		phii,
		antimeridian = abs(delta) > 180;
	if (antimeridian ^ (sign * lambda2 < lambdai && lambdai < sign * lambda)) {
		phii = inflection[1] * degrees;
		if (phii > phi1) phi1 = phii;
	} else if (lambdai = (lambdai + 360) % 360 - 180, antimeridian ^ (sign * lambda2 < lambdai && lambdai < sign * lambda)) {
		phii = -inflection[1] * degrees;
		if (phii < phi0) phi0 = phii;
	} else {
		if (phi < phi0) phi0 = phi;
		if (phi > phi1) phi1 = phi;
	}
	if (antimeridian) {
		if (lambda < lambda2) {
		if (angle(lambda0$1, lambda) > angle(lambda0$1, lambda1)) lambda1 = lambda;
		} else {
		if (angle(lambda, lambda1) > angle(lambda0$1, lambda1)) lambda0$1 = lambda;
		}
	} else {
		if (lambda1 >= lambda0$1) {
		if (lambda < lambda0$1) lambda0$1 = lambda;
		if (lambda > lambda1) lambda1 = lambda;
		} else {
		if (lambda > lambda2) {
			if (angle(lambda0$1, lambda) > angle(lambda0$1, lambda1)) lambda1 = lambda;
		} else {
			if (angle(lambda, lambda1) > angle(lambda0$1, lambda1)) lambda0$1 = lambda;
		}
		}
	}
	} else {
	boundsPoint(lambda, phi);
	}
	p0 = p, lambda2 = lambda;
}

function boundsLineStart() {
	boundsStream.point = linePoint;
}

function boundsLineEnd() {
	range$1[0] = lambda0$1, range$1[1] = lambda1;
	boundsStream.point = boundsPoint;
	p0 = null;
}

function boundsRingPoint(lambda, phi) {
	if (p0) {
	var delta = lambda - lambda2;
	deltaSum.add(abs(delta) > 180 ? delta + (delta > 0 ? 360 : -360) : delta);
	} else {
	lambda00$1 = lambda, phi00$1 = phi;
	}
	areaStream.point(lambda, phi);
	linePoint(lambda, phi);
}

function boundsRingStart() {
	areaStream.lineStart();
}

function boundsRingEnd() {
	boundsRingPoint(lambda00$1, phi00$1);
	areaStream.lineEnd();
	if (abs(deltaSum) > epsilon) lambda0$1 = -(lambda1 = 180);
	range$1[0] = lambda0$1, range$1[1] = lambda1;
	p0 = null;
}

// Finds the left-right distance between two longitudes.
// This is almost the same as (lambda1 - lambda0 + 360掳) % 360掳, except that we want
// the distance between 卤180掳 to be 360掳.
function angle(lambda0, lambda1) {
	return (lambda1 -= lambda0) < 0 ? lambda1 + 360 : lambda1;
}

function rangeCompare(a, b) {
	return a[0] - b[0];
}

function rangeContains(range, x) {
	return range[0] <= range[1] ? range[0] <= x && x <= range[1] : x < range[0] || range[1] < x;
}

function bounds(feature) {
	var i, n, a, b, merged, deltaMax, delta;

	phi1 = lambda1 = -(lambda0$1 = phi0 = Infinity);
	ranges = [];
	geoStream(feature, boundsStream);

	// First, sort ranges by their minimum longitudes.
	if (n = ranges.length) {
	ranges.sort(rangeCompare);

	// Then, merge any ranges that overlap.
	for (i = 1, a = ranges[0], merged = [a]; i < n; ++i) {
		b = ranges[i];
		if (rangeContains(a, b[0]) || rangeContains(a, b[1])) {
		if (angle(a[0], b[1]) > angle(a[0], a[1])) a[1] = b[1];
		if (angle(b[0], a[1]) > angle(a[0], a[1])) a[0] = b[0];
		} else {
		merged.push(a = b);
		}
	}

	// Finally, find the largest gap between the merged ranges.
	// The final bounding box will be the inverse of this gap.
	for (deltaMax = -Infinity, n = merged.length - 1, i = 0, a = merged[n]; i <= n; a = b, ++i) {
		b = merged[i];
		if ((delta = angle(a[1], b[0])) > deltaMax) deltaMax = delta, lambda0$1 = b[0], lambda1 = a[1];
	}
	}

	ranges = range$1 = null;

	return lambda0$1 === Infinity || phi0 === Infinity
		? [[NaN, NaN], [NaN, NaN]]
		: [[lambda0$1, phi0], [lambda1, phi1]];
}

var W0;
var W1;
var X0;
var Y0;
var Z0;
var X1;
var Y1;
var Z1;
var X2;
var Y2;
var Z2;
var lambda00$2;
var phi00$2;
var x0;
var y0;
var z0;
// previous point

var centroidStream = {
	sphere: noop,
	point: centroidPoint,
	lineStart: centroidLineStart,
	lineEnd: centroidLineEnd,
	polygonStart: function() {
	centroidStream.lineStart = centroidRingStart;
	centroidStream.lineEnd = centroidRingEnd;
	},
	polygonEnd: function() {
	centroidStream.lineStart = centroidLineStart;
	centroidStream.lineEnd = centroidLineEnd;
	}
};

// Arithmetic mean of Cartesian vectors.
function centroidPoint(lambda, phi) {
	lambda *= radians, phi *= radians;
	var cosPhi = cos(phi);
	centroidPointCartesian(cosPhi * cos(lambda), cosPhi * sin(lambda), sin(phi));
}

function centroidPointCartesian(x, y, z) {
	++W0;
	X0 += (x - X0) / W0;
	Y0 += (y - Y0) / W0;
	Z0 += (z - Z0) / W0;
}

function centroidLineStart() {
	centroidStream.point = centroidLinePointFirst;
}

function centroidLinePointFirst(lambda, phi) {
	lambda *= radians, phi *= radians;
	var cosPhi = cos(phi);
	x0 = cosPhi * cos(lambda);
	y0 = cosPhi * sin(lambda);
	z0 = sin(phi);
	centroidStream.point = centroidLinePoint;
	centroidPointCartesian(x0, y0, z0);
}

function centroidLinePoint(lambda, phi) {
	lambda *= radians, phi *= radians;
	var cosPhi = cos(phi),
		x = cosPhi * cos(lambda),
		y = cosPhi * sin(lambda),
		z = sin(phi),
		w = atan2(sqrt((w = y0 * z - z0 * y) * w + (w = z0 * x - x0 * z) * w + (w = x0 * y - y0 * x) * w), x0 * x + y0 * y + z0 * z);
	W1 += w;
	X1 += w * (x0 + (x0 = x));
	Y1 += w * (y0 + (y0 = y));
	Z1 += w * (z0 + (z0 = z));
	centroidPointCartesian(x0, y0, z0);
}

function centroidLineEnd() {
	centroidStream.point = centroidPoint;
}

// See J. E. Brock, The Inertia Tensor for a Spherical Triangle,
// J. Applied Mechanics 42, 239 (1975).
function centroidRingStart() {
	centroidStream.point = centroidRingPointFirst;
}

function centroidRingEnd() {
	centroidRingPoint(lambda00$2, phi00$2);
	centroidStream.point = centroidPoint;
}

function centroidRingPointFirst(lambda, phi) {
	lambda00$2 = lambda, phi00$2 = phi;
	lambda *= radians, phi *= radians;
	centroidStream.point = centroidRingPoint;
	var cosPhi = cos(phi);
	x0 = cosPhi * cos(lambda);
	y0 = cosPhi * sin(lambda);
	z0 = sin(phi);
	centroidPointCartesian(x0, y0, z0);
}

function centroidRingPoint(lambda, phi) {
	lambda *= radians, phi *= radians;
	var cosPhi = cos(phi),
		x = cosPhi * cos(lambda),
		y = cosPhi * sin(lambda),
		z = sin(phi),
		cx = y0 * z - z0 * y,
		cy = z0 * x - x0 * z,
		cz = x0 * y - y0 * x,
		m = sqrt(cx * cx + cy * cy + cz * cz),
		u = x0 * x + y0 * y + z0 * z,
		v = m && -acos(u) / m, // area weight
		w = atan2(m, u); // line weight
	X2 += v * cx;
	Y2 += v * cy;
	Z2 += v * cz;
	W1 += w;
	X1 += w * (x0 + (x0 = x));
	Y1 += w * (y0 + (y0 = y));
	Z1 += w * (z0 + (z0 = z));
	centroidPointCartesian(x0, y0, z0);
}

function centroid(object) {
	W0 = W1 =
	X0 = Y0 = Z0 =
	X1 = Y1 = Z1 =
	X2 = Y2 = Z2 = 0;
	geoStream(object, centroidStream);

	var x = X2,
		y = Y2,
		z = Z2,
		m = x * x + y * y + z * z;

	// If the area-weighted ccentroid is undefined, fall back to length-weighted ccentroid.
	if (m < epsilon2) {
	x = X1, y = Y1, z = Z1;
	// If the feature has zero length, fall back to arithmetic mean of point vectors.
	if (W1 < epsilon) x = X0, y = Y0, z = Z0;
	m = x * x + y * y + z * z;
	// If the feature still has an undefined ccentroid, then return.
	if (m < epsilon2) return [NaN, NaN];
	}

	return [atan2(y, x) * degrees, asin(z / sqrt(m)) * degrees];
}

function constant(x) {
	return function() {
	return x;
	};
}

function compose(a, b) {

	function compose(x, y) {
	return x = a(x, y), b(x[0], x[1]);
	}

	if (a.invert && b.invert) compose.invert = function(x, y) {
	return x = b.invert(x, y), x && a.invert(x[0], x[1]);
	};

	return compose;
}

function rotationIdentity(lambda, phi) {
	return [lambda > pi ? lambda - tau : lambda < -pi ? lambda + tau : lambda, phi];
}

rotationIdentity.invert = rotationIdentity;

function rotateRadians(deltaLambda, deltaPhi, deltaGamma) {
	return (deltaLambda %= tau) ? (deltaPhi || deltaGamma ? compose(rotationLambda(deltaLambda), rotationPhiGamma(deltaPhi, deltaGamma))
	: rotationLambda(deltaLambda))
	: (deltaPhi || deltaGamma ? rotationPhiGamma(deltaPhi, deltaGamma)
	: rotationIdentity);
}

function forwardRotationLambda(deltaLambda) {
	return function(lambda, phi) {
	return lambda += deltaLambda, [lambda > pi ? lambda - tau : lambda < -pi ? lambda + tau : lambda, phi];
	};
}

function rotationLambda(deltaLambda) {
	var rotation = forwardRotationLambda(deltaLambda);
	rotation.invert = forwardRotationLambda(-deltaLambda);
	return rotation;
}

function rotationPhiGamma(deltaPhi, deltaGamma) {
	var cosDeltaPhi = cos(deltaPhi),
		sinDeltaPhi = sin(deltaPhi),
		cosDeltaGamma = cos(deltaGamma),
		sinDeltaGamma = sin(deltaGamma);

	function rotation(lambda, phi) {
	var cosPhi = cos(phi),
		x = cos(lambda) * cosPhi,
		y = sin(lambda) * cosPhi,
		z = sin(phi),
		k = z * cosDeltaPhi + x * sinDeltaPhi;
	return [
		atan2(y * cosDeltaGamma - k * sinDeltaGamma, x * cosDeltaPhi - z * sinDeltaPhi),
		asin(k * cosDeltaGamma + y * sinDeltaGamma)
	];
	}

	rotation.invert = function(lambda, phi) {
	var cosPhi = cos(phi),
		x = cos(lambda) * cosPhi,
		y = sin(lambda) * cosPhi,
		z = sin(phi),
		k = z * cosDeltaGamma - y * sinDeltaGamma;
	return [
		atan2(y * cosDeltaGamma + z * sinDeltaGamma, x * cosDeltaPhi + k * sinDeltaPhi),
		asin(k * cosDeltaPhi - x * sinDeltaPhi)
	];
	};

	return rotation;
}

function rotation(rotate) {
	rotate = rotateRadians(rotate[0] * radians, rotate[1] * radians, rotate.length > 2 ? rotate[2] * radians : 0);

	function forward(coordinates) {
	coordinates = rotate(coordinates[0] * radians, coordinates[1] * radians);
	return coordinates[0] *= degrees, coordinates[1] *= degrees, coordinates;
	}

	forward.invert = function(coordinates) {
	coordinates = rotate.invert(coordinates[0] * radians, coordinates[1] * radians);
	return coordinates[0] *= degrees, coordinates[1] *= degrees, coordinates;
	};

	return forward;
}

// Generates a circle centered at [0掳, 0掳], with a given radius and precision.
function circleStream(stream, radius, delta, direction, t0, t1) {
	if (!delta) return;
	var cosRadius = cos(radius),
		sinRadius = sin(radius),
		step = direction * delta;
	if (t0 == null) {
	t0 = radius + direction * tau;
	t1 = radius - step / 2;
	} else {
	t0 = circleRadius(cosRadius, t0);
	t1 = circleRadius(cosRadius, t1);
	if (direction > 0 ? t0 < t1 : t0 > t1) t0 += direction * tau;
	}
	for (var point, t = t0; direction > 0 ? t > t1 : t < t1; t -= step) {
	point = spherical([cosRadius, -sinRadius * cos(t), -sinRadius * sin(t)]);
	stream.point(point[0], point[1]);
	}
}

// Returns the signed angle of a cartesian point relative to [cosRadius, 0, 0].
function circleRadius(cosRadius, point) {
	point = cartesian(point), point[0] -= cosRadius;
	cartesianNormalizeInPlace(point);
	var radius = acos(-point[1]);
	return ((-point[2] < 0 ? -radius : radius) + tau - epsilon) % tau;
}

function circle() {
	var center = constant([0, 0]),
		radius = constant(90),
		precision = constant(6),
		ring,
		rotate,
		stream = {point: point};

	function point(x, y) {
	ring.push(x = rotate(x, y));
	x[0] *= degrees, x[1] *= degrees;
	}

	function circle() {
	var c = center.apply(this, arguments),
		r = radius.apply(this, arguments) * radians,
		p = precision.apply(this, arguments) * radians;
	ring = [];
	rotate = rotateRadians(-c[0] * radians, -c[1] * radians, 0).invert;
	circleStream(stream, r, p, 1);
	c = {type: "Polygon", coordinates: [ring]};
	ring = rotate = null;
	return c;
	}

	circle.center = function(_) {
	return arguments.length ? (center = typeof _ === "function" ? _ : constant([+_[0], +_[1]]), circle) : center;
	};

	circle.radius = function(_) {
	return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), circle) : radius;
	};

	circle.precision = function(_) {
	return arguments.length ? (precision = typeof _ === "function" ? _ : constant(+_), circle) : precision;
	};

	return circle;
}

function clipBuffer() {
	var lines = [],
		line;
	return {
	point: function(x, y) {
		line.push([x, y]);
	},
	lineStart: function() {
		lines.push(line = []);
	},
	lineEnd: noop,
	rejoin: function() {
		if (lines.length > 1) lines.push(lines.pop().concat(lines.shift()));
	},
	result: function() {
		var result = lines;
		lines = [];
		line = null;
		return result;
	}
	};
}

function clipLine(a, b, x0, y0, x1, y1) {
	var ax = a[0],
		ay = a[1],
		bx = b[0],
		by = b[1],
		t0 = 0,
		t1 = 1,
		dx = bx - ax,
		dy = by - ay,
		r;

	r = x0 - ax;
	if (!dx && r > 0) return;
	r /= dx;
	if (dx < 0) {
	if (r < t0) return;
	if (r < t1) t1 = r;
	} else if (dx > 0) {
	if (r > t1) return;
	if (r > t0) t0 = r;
	}

	r = x1 - ax;
	if (!dx && r < 0) return;
	r /= dx;
	if (dx < 0) {
	if (r > t1) return;
	if (r > t0) t0 = r;
	} else if (dx > 0) {
	if (r < t0) return;
	if (r < t1) t1 = r;
	}

	r = y0 - ay;
	if (!dy && r > 0) return;
	r /= dy;
	if (dy < 0) {
	if (r < t0) return;
	if (r < t1) t1 = r;
	} else if (dy > 0) {
	if (r > t1) return;
	if (r > t0) t0 = r;
	}

	r = y1 - ay;
	if (!dy && r < 0) return;
	r /= dy;
	if (dy < 0) {
	if (r > t1) return;
	if (r > t0) t0 = r;
	} else if (dy > 0) {
	if (r < t0) return;
	if (r < t1) t1 = r;
	}

	if (t0 > 0) a[0] = ax + t0 * dx, a[1] = ay + t0 * dy;
	if (t1 < 1) b[0] = ax + t1 * dx, b[1] = ay + t1 * dy;
	return true;
}

function pointEqual(a, b) {
	return abs(a[0] - b[0]) < epsilon && abs(a[1] - b[1]) < epsilon;
}

function Intersection(point, points, other, entry) {
	this.x = point;
	this.z = points;
	this.o = other; // another intersection
	this.e = entry; // is an entry?
	this.v = false; // visited
	this.n = this.p = null; // next & previous
}

// A generalized polygon clipping algorithm: given a polygon that has been cut
// into its visible line segments, and rejoins the segments by interpolating
// along the clip edge.
function clipPolygon(segments, compareIntersection, startInside, interpolate, stream) {
	var subject = [],
		clip = [],
		i,
		n;

	segments.forEach(function(segment) {
	if ((n = segment.length - 1) <= 0) return;
	var n, p0 = segment[0], p1 = segment[n], x;

	// If the first and last points of a segment are coincident, then treat as a
	// closed ring. TODO if all rings are closed, then the winding order of the
	// exterior ring should be checked.
	if (pointEqual(p0, p1)) {
		stream.lineStart();
		for (i = 0; i < n; ++i) stream.point((p0 = segment[i])[0], p0[1]);
		stream.lineEnd();
		return;
	}

	subject.push(x = new Intersection(p0, segment, null, true));
	clip.push(x.o = new Intersection(p0, null, x, false));
	subject.push(x = new Intersection(p1, segment, null, false));
	clip.push(x.o = new Intersection(p1, null, x, true));
	});

	if (!subject.length) return;

	clip.sort(compareIntersection);
	link(subject);
	link(clip);

	for (i = 0, n = clip.length; i < n; ++i) {
	clip[i].e = startInside = !startInside;
	}

	var start = subject[0],
		points,
		point;

	while (1) {
	// Find first unvisited intersection.
	var current = start,
		isSubject = true;
	while (current.v) if ((current = current.n) === start) return;
	points = current.z;
	stream.lineStart();
	do {
		current.v = current.o.v = true;
		if (current.e) {
		if (isSubject) {
			for (i = 0, n = points.length; i < n; ++i) stream.point((point = points[i])[0], point[1]);
		} else {
			interpolate(current.x, current.n.x, 1, stream);
		}
		current = current.n;
		} else {
		if (isSubject) {
			points = current.p.z;
			for (i = points.length - 1; i >= 0; --i) stream.point((point = points[i])[0], point[1]);
		} else {
			interpolate(current.x, current.p.x, -1, stream);
		}
		current = current.p;
		}
		current = current.o;
		points = current.z;
		isSubject = !isSubject;
	} while (!current.v);
	stream.lineEnd();
	}
}

function link(array) {
	if (!(n = array.length)) return;
	var n,
		i = 0,
		a = array[0],
		b;
	while (++i < n) {
	a.n = b = array[i];
	b.p = a;
	a = b;
	}
	a.n = b = array[0];
	b.p = a;
}

var clipMax = 1e9;
var clipMin = -clipMax;
// TODO Use d3-polygon鈥檚 polygonContains here for the ring check?
// TODO Eliminate duplicate buffering in clipBuffer and polygon.push?

function clipExtent(x0, y0, x1, y1) {

	function visible(x, y) {
	return x0 <= x && x <= x1 && y0 <= y && y <= y1;
	}

	function interpolate(from, to, direction, stream) {
	var a = 0, a1 = 0;
	if (from == null
		|| (a = corner(from, direction)) !== (a1 = corner(to, direction))
		|| comparePoint(from, to) < 0 ^ direction > 0) {
		do stream.point(a === 0 || a === 3 ? x0 : x1, a > 1 ? y1 : y0);
		while ((a = (a + direction + 4) % 4) !== a1);
	} else {
		stream.point(to[0], to[1]);
	}
	}

	function corner(p, direction) {
	return abs(p[0] - x0) < epsilon ? direction > 0 ? 0 : 3
		: abs(p[0] - x1) < epsilon ? direction > 0 ? 2 : 1
		: abs(p[1] - y0) < epsilon ? direction > 0 ? 1 : 0
		: direction > 0 ? 3 : 2; // abs(p[1] - y1) < epsilon
	}

	function compareIntersection(a, b) {
	return comparePoint(a.x, b.x);
	}

	function comparePoint(a, b) {
	var ca = corner(a, 1),
		cb = corner(b, 1);
	return ca !== cb ? ca - cb
		: ca === 0 ? b[1] - a[1]
		: ca === 1 ? a[0] - b[0]
		: ca === 2 ? a[1] - b[1]
		: b[0] - a[0];
	}

	return function(stream) {
	var activeStream = stream,
		bufferStream = clipBuffer(),
		segments,
		polygon,
		ring,
		x__, y__, v__, // first point
		x_, y_, v_, // previous point
		first,
		clean;

	var clipStream = {
		point: point,
		lineStart: lineStart,
		lineEnd: lineEnd,
		polygonStart: polygonStart,
		polygonEnd: polygonEnd
	};

	function point(x, y) {
		if (visible(x, y)) activeStream.point(x, y);
	}

	function polygonInside() {
		var winding = 0;

		for (var i = 0, n = polygon.length; i < n; ++i) {
		for (var ring = polygon[i], j = 1, m = ring.length, point = ring[0], a0, a1, b0 = point[0], b1 = point[1]; j < m; ++j) {
			a0 = b0, a1 = b1, point = ring[j], b0 = point[0], b1 = point[1];
			if (a1 <= y1) { if (b1 > y1 && (b0 - a0) * (y1 - a1) > (b1 - a1) * (x0 - a0)) ++winding; }
			else { if (b1 <= y1 && (b0 - a0) * (y1 - a1) < (b1 - a1) * (x0 - a0)) --winding; }
		}
		}

		return winding;
	}

	// Buffer geometry within a polygon and then clip it en masse.
	function polygonStart() {
		activeStream = bufferStream, segments = [], polygon = [], clean = true;
	}

	function polygonEnd() {
		var startInside = polygonInside(),
			cleanInside = clean && startInside,
			visible = (segments = d3Array.merge(segments)).length;
		if (cleanInside || visible) {
		stream.polygonStart();
		if (cleanInside) {
			stream.lineStart();
			interpolate(null, null, 1, stream);
			stream.lineEnd();
		}
		if (visible) {
			clipPolygon(segments, compareIntersection, startInside, interpolate, stream);
		}
		stream.polygonEnd();
		}
		activeStream = stream, segments = polygon = ring = null;
	}

	function lineStart() {
		clipStream.point = linePoint;
		if (polygon) polygon.push(ring = []);
		first = true;
		v_ = false;
		x_ = y_ = NaN;
	}

	// TODO rather than special-case polygons, simply handle them separately.
	// Ideally, coincident intersection points should be jittered to avoid
	// clipping issues.
	function lineEnd() {
		if (segments) {
		linePoint(x__, y__);
		if (v__ && v_) bufferStream.rejoin();
		segments.push(bufferStream.result());
		}
		clipStream.point = point;
		if (v_) activeStream.lineEnd();
	}

	function linePoint(x, y) {
		var v = visible(x, y);
		if (polygon) ring.push([x, y]);
		if (first) {
		x__ = x, y__ = y, v__ = v;
		first = false;
		if (v) {
			activeStream.lineStart();
			activeStream.point(x, y);
		}
		} else {
		if (v && v_) activeStream.point(x, y);
		else {
			var a = [x_ = Math.max(clipMin, Math.min(clipMax, x_)), y_ = Math.max(clipMin, Math.min(clipMax, y_))],
				b = [x = Math.max(clipMin, Math.min(clipMax, x)), y = Math.max(clipMin, Math.min(clipMax, y))];
			if (clipLine(a, b, x0, y0, x1, y1)) {
			if (!v_) {
				activeStream.lineStart();
				activeStream.point(a[0], a[1]);
			}
			activeStream.point(b[0], b[1]);
			if (!v) activeStream.lineEnd();
			clean = false;
			} else if (v) {
			activeStream.lineStart();
			activeStream.point(x, y);
			clean = false;
			}
		}
		}
		x_ = x, y_ = y, v_ = v;
	}

	return clipStream;
	};
}

function extent() {
	var x0 = 0,
		y0 = 0,
		x1 = 960,
		y1 = 500,
		cache,
		cacheStream,
		clip;

	return clip = {
	stream: function(stream) {
		return cache && cacheStream === stream ? cache : cache = clipExtent(x0, y0, x1, y1)(cacheStream = stream);
	},
	extent: function(_) {
		return arguments.length ? (x0 = +_[0][0], y0 = +_[0][1], x1 = +_[1][0], y1 = +_[1][1], cache = cacheStream = null, clip) : [[x0, y0], [x1, y1]];
	}
	};
}

var lengthSum = adder();
var lambda0$2;
var sinPhi0$1;
var cosPhi0$1;
var lengthStream = {
	sphere: noop,
	point: noop,
	lineStart: lengthLineStart,
	lineEnd: noop,
	polygonStart: noop,
	polygonEnd: noop
};

function lengthLineStart() {
	lengthStream.point = lengthPointFirst;
	lengthStream.lineEnd = lengthLineEnd;
}

function lengthLineEnd() {
	lengthStream.point = lengthStream.lineEnd = noop;
}

function lengthPointFirst(lambda, phi) {
	lambda *= radians, phi *= radians;
	lambda0$2 = lambda, sinPhi0$1 = sin(phi), cosPhi0$1 = cos(phi);
	lengthStream.point = lengthPoint;
}

function lengthPoint(lambda, phi) {
	lambda *= radians, phi *= radians;
	var sinPhi = sin(phi),
		cosPhi = cos(phi),
		delta = abs(lambda - lambda0$2),
		cosDelta = cos(delta),
		sinDelta = sin(delta),
		x = cosPhi * sinDelta,
		y = cosPhi0$1 * sinPhi - sinPhi0$1 * cosPhi * cosDelta,
		z = sinPhi0$1 * sinPhi + cosPhi0$1 * cosPhi * cosDelta;
	lengthSum.add(atan2(sqrt(x * x + y * y), z));
	lambda0$2 = lambda, sinPhi0$1 = sinPhi, cosPhi0$1 = cosPhi;
}

function length(object) {
	lengthSum.reset();
	geoStream(object, lengthStream);
	return +lengthSum;
}

var coordinates = [null, null];
var object = {type: "LineString", coordinates: coordinates};
function distance(a, b) {
	coordinates[0] = a;
	coordinates[1] = b;
	return length(object);
}

function graticuleX(y0, y1, dy) {
	var y = d3Array.range(y0, y1 - epsilon, dy).concat(y1);
	return function(x) { return y.map(function(y) { return [x, y]; }); };
}

function graticuleY(x0, x1, dx) {
	var x = d3Array.range(x0, x1 - epsilon, dx).concat(x1);
	return function(y) { return x.map(function(x) { return [x, y]; }); };
}

function graticule() {
	var x1, x0, X1, X0,
		y1, y0, Y1, Y0,
		dx = 10, dy = dx, DX = 90, DY = 360,
		x, y, X, Y,
		precision = 2.5;

	function graticule() {
	return {type: "MultiLineString", coordinates: lines()};
	}

	function lines() {
	return d3Array.range(ceil(X0 / DX) * DX, X1, DX).map(X)
		.concat(d3Array.range(ceil(Y0 / DY) * DY, Y1, DY).map(Y))
		.concat(d3Array.range(ceil(x0 / dx) * dx, x1, dx).filter(function(x) { return abs(x % DX) > epsilon; }).map(x))
		.concat(d3Array.range(ceil(y0 / dy) * dy, y1, dy).filter(function(y) { return abs(y % DY) > epsilon; }).map(y));
	}

	graticule.lines = function() {
	return lines().map(function(coordinates) { return {type: "LineString", coordinates: coordinates}; });
	};

	graticule.outline = function() {
	return {
		type: "Polygon",
		coordinates: [
		X(X0).concat(
		Y(Y1).slice(1),
		X(X1).reverse().slice(1),
		Y(Y0).reverse().slice(1))
		]
	};
	};

	graticule.extent = function(_) {
	if (!arguments.length) return graticule.extentMinor();
	return graticule.extentMajor(_).extentMinor(_);
	};

	graticule.extentMajor = function(_) {
	if (!arguments.length) return [[X0, Y0], [X1, Y1]];
	X0 = +_[0][0], X1 = +_[1][0];
	Y0 = +_[0][1], Y1 = +_[1][1];
	if (X0 > X1) _ = X0, X0 = X1, X1 = _;
	if (Y0 > Y1) _ = Y0, Y0 = Y1, Y1 = _;
	return graticule.precision(precision);
	};

	graticule.extentMinor = function(_) {
	if (!arguments.length) return [[x0, y0], [x1, y1]];
	x0 = +_[0][0], x1 = +_[1][0];
	y0 = +_[0][1], y1 = +_[1][1];
	if (x0 > x1) _ = x0, x0 = x1, x1 = _;
	if (y0 > y1) _ = y0, y0 = y1, y1 = _;
	return graticule.precision(precision);
	};

	graticule.step = function(_) {
	if (!arguments.length) return graticule.stepMinor();
	return graticule.stepMajor(_).stepMinor(_);
	};

	graticule.stepMajor = function(_) {
	if (!arguments.length) return [DX, DY];
	DX = +_[0], DY = +_[1];
	return graticule;
	};

	graticule.stepMinor = function(_) {
	if (!arguments.length) return [dx, dy];
	dx = +_[0], dy = +_[1];
	return graticule;
	};

	graticule.precision = function(_) {
	if (!arguments.length) return precision;
	precision = +_;
	x = graticuleX(y0, y1, 90);
	y = graticuleY(x0, x1, precision);
	X = graticuleX(Y0, Y1, 90);
	Y = graticuleY(X0, X1, precision);
	return graticule;
	};

	return graticule
		.extentMajor([[-180, -90 + epsilon], [180, 90 - epsilon]])
		.extentMinor([[-180, -80 - epsilon], [180, 80 + epsilon]]);
}

function interpolate(a, b) {
	var x0 = a[0] * radians,
		y0 = a[1] * radians,
		x1 = b[0] * radians,
		y1 = b[1] * radians,
		cy0 = cos(y0),
		sy0 = sin(y0),
		cy1 = cos(y1),
		sy1 = sin(y1),
		kx0 = cy0 * cos(x0),
		ky0 = cy0 * sin(x0),
		kx1 = cy1 * cos(x1),
		ky1 = cy1 * sin(x1),
		d = 2 * asin(sqrt(haversin(y1 - y0) + cy0 * cy1 * haversin(x1 - x0))),
		k = sin(d);

	var interpolate = d ? function(t) {
	var B = sin(t *= d) / k,
		A = sin(d - t) / k,
		x = A * kx0 + B * kx1,
		y = A * ky0 + B * ky1,
		z = A * sy0 + B * sy1;
	return [
		atan2(y, x) * degrees,
		atan2(z, sqrt(x * x + y * y)) * degrees
	];
	} : function() {
	return [x0 * degrees, y0 * degrees];
	};

	interpolate.distance = d;

	return interpolate;
}

function identity(x) {
	return x;
}

var areaSum$1 = adder();
var areaRingSum$1 = adder();
var x00;
var y00;
var x0$1;
var y0$1;
var areaStream$1 = {
	point: noop,
	lineStart: noop,
	lineEnd: noop,
	polygonStart: function() {
	areaStream$1.lineStart = areaRingStart$1;
	areaStream$1.lineEnd = areaRingEnd$1;
	},
	polygonEnd: function() {
	areaStream$1.lineStart = areaStream$1.lineEnd = areaStream$1.point = noop;
	areaSum$1.add(abs(areaRingSum$1));
	areaRingSum$1.reset();
	},
	result: function() {
	var area = areaSum$1 / 2;
	areaSum$1.reset();
	return area;
	}
};

function areaRingStart$1() {
	areaStream$1.point = areaPointFirst$1;
}

function areaPointFirst$1(x, y) {
	areaStream$1.point = areaPoint$1;
	x00 = x0$1 = x, y00 = y0$1 = y;
}

function areaPoint$1(x, y) {
	areaRingSum$1.add(y0$1 * x - x0$1 * y);
	x0$1 = x, y0$1 = y;
}

function areaRingEnd$1() {
	areaPoint$1(x00, y00);
}

var x0$2 = Infinity;
var y0$2 = x0$2;
var x1 = -x0$2;
var y1 = x1;
var boundsStream$1 = {
	point: boundsPoint$1,
	lineStart: noop,
	lineEnd: noop,
	polygonStart: noop,
	polygonEnd: noop,
	result: function() {
	var bounds = [[x0$2, y0$2], [x1, y1]];
	x1 = y1 = -(y0$2 = x0$2 = Infinity);
	return bounds;
	}
};

function boundsPoint$1(x, y) {
	if (x < x0$2) x0$2 = x;
	if (x > x1) x1 = x;
	if (y < y0$2) y0$2 = y;
	if (y > y1) y1 = y;
}

var X0$1 = 0;
var Y0$1 = 0;
var Z0$1 = 0;
var X1$1 = 0;
var Y1$1 = 0;
var Z1$1 = 0;
var X2$1 = 0;
var Y2$1 = 0;
var Z2$1 = 0;
var x00$1;
var y00$1;
var x0$3;
var y0$3;
var centroidStream$1 = {
	point: centroidPoint$1,
	lineStart: centroidLineStart$1,
	lineEnd: centroidLineEnd$1,
	polygonStart: function() {
	centroidStream$1.lineStart = centroidRingStart$1;
	centroidStream$1.lineEnd = centroidRingEnd$1;
	},
	polygonEnd: function() {
	centroidStream$1.point = centroidPoint$1;
	centroidStream$1.lineStart = centroidLineStart$1;
	centroidStream$1.lineEnd = centroidLineEnd$1;
	},
	result: function() {
	var centroid = Z2$1 ? [X2$1 / Z2$1, Y2$1 / Z2$1]
		: Z1$1 ? [X1$1 / Z1$1, Y1$1 / Z1$1]
		: Z0$1 ? [X0$1 / Z0$1, Y0$1 / Z0$1]
		: [NaN, NaN];
	X0$1 = Y0$1 = Z0$1 =
	X1$1 = Y1$1 = Z1$1 =
	X2$1 = Y2$1 = Z2$1 = 0;
	return centroid;
	}
};

function centroidPoint$1(x, y) {
	X0$1 += x;
	Y0$1 += y;
	++Z0$1;
}

function centroidLineStart$1() {
	centroidStream$1.point = centroidPointFirstLine;
}

function centroidPointFirstLine(x, y) {
	centroidStream$1.point = centroidPointLine;
	centroidPoint$1(x0$3 = x, y0$3 = y);
}

function centroidPointLine(x, y) {
	var dx = x - x0$3, dy = y - y0$3, z = sqrt(dx * dx + dy * dy);
	X1$1 += z * (x0$3 + x) / 2;
	Y1$1 += z * (y0$3 + y) / 2;
	Z1$1 += z;
	centroidPoint$1(x0$3 = x, y0$3 = y);
}

function centroidLineEnd$1() {
	centroidStream$1.point = centroidPoint$1;
}

function centroidRingStart$1() {
	centroidStream$1.point = centroidPointFirstRing;
}

function centroidRingEnd$1() {
	centroidPointRing(x00$1, y00$1);
}

function centroidPointFirstRing(x, y) {
	centroidStream$1.point = centroidPointRing;
	centroidPoint$1(x00$1 = x0$3 = x, y00$1 = y0$3 = y);
}

function centroidPointRing(x, y) {
	var dx = x - x0$3,
		dy = y - y0$3,
		z = sqrt(dx * dx + dy * dy);

	X1$1 += z * (x0$3 + x) / 2;
	Y1$1 += z * (y0$3 + y) / 2;
	Z1$1 += z;

	z = y0$3 * x - x0$3 * y;
	X2$1 += z * (x0$3 + x);
	Y2$1 += z * (y0$3 + y);
	Z2$1 += z * 3;
	centroidPoint$1(x0$3 = x, y0$3 = y);
}

function PathContext(context) {
	this._context = context;
}

PathContext.prototype = {
	_radius: 4.5,
	pointRadius: function(_) {
	return this._radius = _, this;
	},
	polygonStart: function() {
	this._line = 0;
	},
	polygonEnd: function() {
	this._line = NaN;
	},
	lineStart: function() {
	this._point = 0;
	},
	lineEnd: function() {
	if (this._line === 0) this._context.closePath();
	this._point = NaN;
	},
	point: function(x, y) {
	switch (this._point) {
		case 0: {
		this._context.moveTo(x, y);
		this._point = 1;
		break;
		}
		case 1: {
		this._context.lineTo(x, y);
		break;
		}
		default: {
		this._context.moveTo(x + this._radius, y);
		this._context.arc(x, y, this._radius, 0, tau);
		break;
		}
	}
	},
	result: noop
};

function PathString() {
	this._string = [];
}

PathString.prototype = {
	_circle: circle$1(4.5),
	pointRadius: function(_) {
	return this._circle = circle$1(_), this;
	},
	polygonStart: function() {
	this._line = 0;
	},
	polygonEnd: function() {
	this._line = NaN;
	},
	lineStart: function() {
	this._point = 0;
	},
	lineEnd: function() {
	if (this._line === 0) this._string.push("Z");
	this._point = NaN;
	},
	point: function(x, y) {
	switch (this._point) {
		case 0: {
		this._string.push("M", x, ",", y);
		this._point = 1;
		break;
		}
		case 1: {
		this._string.push("L", x, ",", y);
		break;
		}
		default: {
		this._string.push("M", x, ",", y, this._circle);
		break;
		}
	}
	},
	result: function() {
	if (this._string.length) {
		var result = this._string.join("");
		this._string = [];
		return result;
	}
	}
};

function circle$1(radius) {
	return "m0," + radius
		+ "a" + radius + "," + radius + " 0 1,1 0," + -2 * radius
		+ "a" + radius + "," + radius + " 0 1,1 0," + 2 * radius
		+ "z";
}

function index() {
	var pointRadius = 4.5,
		projection,
		projectionStream,
		context,
		contextStream;

	function path(object) {
	if (object) {
		if (typeof pointRadius === "function") contextStream.pointRadius(+pointRadius.apply(this, arguments));
		geoStream(object, projectionStream(contextStream));
	}
	return contextStream.result();
	}

	path.area = function(object) {
	geoStream(object, projectionStream(areaStream$1));
	return areaStream$1.result();
	};

	path.bounds = function(object) {
	geoStream(object, projectionStream(boundsStream$1));
	return boundsStream$1.result();
	};

	path.centroid = function(object) {
	geoStream(object, projectionStream(centroidStream$1));
	return centroidStream$1.result();
	};

	path.projection = function(_) {
	return arguments.length ? (projectionStream = (projection = _) == null ? identity : _.stream, path) : projection;
	};

	path.context = function(_) {
	if (!arguments.length) return context;
	contextStream = (context = _) == null ? new PathString : new PathContext(_);
	if (typeof pointRadius !== "function") contextStream.pointRadius(pointRadius);
	return path;
	};

	path.pointRadius = function(_) {
	if (!arguments.length) return pointRadius;
	pointRadius = typeof _ === "function" ? _ : (contextStream.pointRadius(+_), +_);
	return path;
	};

	return path.projection(null).context(null);
}

var sum = adder();

function polygonContains(polygon, point) {
	var lambda = point[0],
		phi = point[1],
		normal = [sin(lambda), -cos(lambda), 0],
		angle = 0,
		winding = 0;

	sum.reset();

	for (var i = 0, n = polygon.length; i < n; ++i) {
	if (!(m = (ring = polygon[i]).length)) continue;
	var ring,
		m,
		point0 = ring[m - 1],
		lambda0 = point0[0],
		phi0 = point0[1] / 2 + quarterPi,
		sinPhi0 = sin(phi0),
		cosPhi0 = cos(phi0);

	for (var j = 0; j < m; ++j, lambda0 = lambda1, sinPhi0 = sinPhi1, cosPhi0 = cosPhi1, point0 = point1) {
		var point1 = ring[j],
			lambda1 = point1[0],
			phi1 = point1[1] / 2 + quarterPi,
			sinPhi1 = sin(phi1),
			cosPhi1 = cos(phi1),
			delta = lambda1 - lambda0,
			sign = delta >= 0 ? 1 : -1,
			absDelta = sign * delta,
			antimeridian = absDelta > pi,
			k = sinPhi0 * sinPhi1;

		sum.add(atan2(k * sign * sin(absDelta), cosPhi0 * cosPhi1 + k * cos(absDelta)));
		angle += antimeridian ? delta + sign * tau : delta;

		// Are the longitudes either side of the point鈥檚 meridian (lambda),
		// and are the latitudes smaller than the parallel (phi)?
		if (antimeridian ^ lambda0 >= lambda ^ lambda1 >= lambda) {
		var arc = cartesianCross(cartesian(point0), cartesian(point1));
		cartesianNormalizeInPlace(arc);
		var intersection = cartesianCross(normal, arc);
		cartesianNormalizeInPlace(intersection);
		var phiArc = (antimeridian ^ delta >= 0 ? -1 : 1) * asin(intersection[2]);
		if (phi > phiArc || phi === phiArc && (arc[0] || arc[1])) {
			winding += antimeridian ^ delta >= 0 ? 1 : -1;
		}
		}
	}
	}

	// First, determine whether the South pole is inside or outside:
	//
	// It is inside if:
	// * the polygon winds around it in a clockwise direction.
	// * the polygon does not (cumulatively) wind around it, but has a negative
	//	 (counter-clockwise) area.
	//
	// Second, count the (signed) number of times a segment crosses a lambda
	// from the point to the South pole.	If it is zero, then the point is the
	// same side as the South pole.

	return (angle < -epsilon || angle < epsilon && sum < -epsilon) ^ (winding & 1);
}

function clip(pointVisible, clipLine, interpolate, start) {
	return function(rotate, sink) {
	var line = clipLine(sink),
		rotatedStart = rotate.invert(start[0], start[1]),
		ringBuffer = clipBuffer(),
		ringSink = clipLine(ringBuffer),
		polygonStarted = false,
		polygon,
		segments,
		ring;

	var clip = {
		point: point,
		lineStart: lineStart,
		lineEnd: lineEnd,
		polygonStart: function() {
		clip.point = pointRing;
		clip.lineStart = ringStart;
		clip.lineEnd = ringEnd;
		segments = [];
		polygon = [];
		},
		polygonEnd: function() {
		clip.point = point;
		clip.lineStart = lineStart;
		clip.lineEnd = lineEnd;
		segments = d3Array.merge(segments);
		var startInside = polygonContains(polygon, rotatedStart);
		if (segments.length) {
			if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
			clipPolygon(segments, compareIntersection, startInside, interpolate, sink);
		} else if (startInside) {
			if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
			sink.lineStart();
			interpolate(null, null, 1, sink);
			sink.lineEnd();
		}
		if (polygonStarted) sink.polygonEnd(), polygonStarted = false;
		segments = polygon = null;
		},
		sphere: function() {
		sink.polygonStart();
		sink.lineStart();
		interpolate(null, null, 1, sink);
		sink.lineEnd();
		sink.polygonEnd();
		}
	};

	function point(lambda, phi) {
		var point = rotate(lambda, phi);
		if (pointVisible(lambda = point[0], phi = point[1])) sink.point(lambda, phi);
	}

	function pointLine(lambda, phi) {
		var point = rotate(lambda, phi);
		line.point(point[0], point[1]);
	}

	function lineStart() {
		clip.point = pointLine;
		line.lineStart();
	}

	function lineEnd() {
		clip.point = point;
		line.lineEnd();
	}

	function pointRing(lambda, phi) {
		ring.push([lambda, phi]);
		var point = rotate(lambda, phi);
		ringSink.point(point[0], point[1]);
	}

	function ringStart() {
		ringSink.lineStart();
		ring = [];
	}

	function ringEnd() {
		pointRing(ring[0][0], ring[0][1]);
		ringSink.lineEnd();

		var clean = ringSink.clean(),
			ringSegments = ringBuffer.result(),
			i, n = ringSegments.length, m,
			segment,
			point;

		ring.pop();
		polygon.push(ring);
		ring = null;

		if (!n) return;

		// No intersections.
		if (clean & 1) {
		segment = ringSegments[0];
		if ((m = segment.length - 1) > 0) {
			if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
			sink.lineStart();
			for (i = 0; i < m; ++i) sink.point((point = segment[i])[0], point[1]);
			sink.lineEnd();
		}
		return;
		}

		// Rejoin connected segments.
		// TODO reuse ringBuffer.rejoin()?
		if (n > 1 && clean & 2) ringSegments.push(ringSegments.pop().concat(ringSegments.shift()));

		segments.push(ringSegments.filter(validSegment));
	}

	return clip;
	};
}

function validSegment(segment) {
	return segment.length > 1;
}

// Intersections are sorted along the clip edge. For both antimeridian cutting
// and circle clipping, the same comparison is used.
function compareIntersection(a, b) {
	return ((a = a.x)[0] < 0 ? a[1] - halfPi - epsilon : halfPi - a[1])
		 - ((b = b.x)[0] < 0 ? b[1] - halfPi - epsilon : halfPi - b[1]);
}

var clipAntimeridian = clip(
	function() { return true; },
	clipAntimeridianLine,
	clipAntimeridianInterpolate,
	[-pi, -halfPi]
);

// Takes a line and cuts into visible segments. Return values: 0 - there were
// intersections or the line was empty; 1 - no intersections; 2 - there were
// intersections, and the first and last segments should be rejoined.
function clipAntimeridianLine(stream) {
	var lambda0 = NaN,
		phi0 = NaN,
		sign0 = NaN,
		clean; // no intersections

	return {
	lineStart: function() {
		stream.lineStart();
		clean = 1;
	},
	point: function(lambda1, phi1) {
		var sign1 = lambda1 > 0 ? pi : -pi,
			delta = abs(lambda1 - lambda0);
		if (abs(delta - pi) < epsilon) { // line crosses a pole
		stream.point(lambda0, phi0 = (phi0 + phi1) / 2 > 0 ? halfPi : -halfPi);
		stream.point(sign0, phi0);
		stream.lineEnd();
		stream.lineStart();
		stream.point(sign1, phi0);
		stream.point(lambda1, phi0);
		clean = 0;
		} else if (sign0 !== sign1 && delta >= pi) { // line crosses antimeridian
		if (abs(lambda0 - sign0) < epsilon) lambda0 -= sign0 * epsilon; // handle degeneracies
		if (abs(lambda1 - sign1) < epsilon) lambda1 -= sign1 * epsilon;
		phi0 = clipAntimeridianIntersect(lambda0, phi0, lambda1, phi1);
		stream.point(sign0, phi0);
		stream.lineEnd();
		stream.lineStart();
		stream.point(sign1, phi0);
		clean = 0;
		}
		stream.point(lambda0 = lambda1, phi0 = phi1);
		sign0 = sign1;
	},
	lineEnd: function() {
		stream.lineEnd();
		lambda0 = phi0 = NaN;
	},
	clean: function() {
		return 2 - clean; // if intersections, rejoin first and last segments
	}
	};
}

function clipAntimeridianIntersect(lambda0, phi0, lambda1, phi1) {
	var cosPhi0,
		cosPhi1,
		sinLambda0Lambda1 = sin(lambda0 - lambda1);
	return abs(sinLambda0Lambda1) > epsilon
		? atan((sin(phi0) * (cosPhi1 = cos(phi1)) * sin(lambda1)
			- sin(phi1) * (cosPhi0 = cos(phi0)) * sin(lambda0))
			/ (cosPhi0 * cosPhi1 * sinLambda0Lambda1))
		: (phi0 + phi1) / 2;
}

function clipAntimeridianInterpolate(from, to, direction, stream) {
	var phi;
	if (from == null) {
	phi = direction * halfPi;
	stream.point(-pi, phi);
	stream.point(0, phi);
	stream.point(pi, phi);
	stream.point(pi, 0);
	stream.point(pi, -phi);
	stream.point(0, -phi);
	stream.point(-pi, -phi);
	stream.point(-pi, 0);
	stream.point(-pi, phi);
	} else if (abs(from[0] - to[0]) > epsilon) {
	var lambda = from[0] < to[0] ? pi : -pi;
	phi = direction * lambda / 2;
	stream.point(-lambda, phi);
	stream.point(0, phi);
	stream.point(lambda, phi);
	} else {
	stream.point(to[0], to[1]);
	}
}

function clipCircle(radius, delta) {
	var cr = cos(radius),
		smallRadius = cr > 0,
		notHemisphere = abs(cr) > epsilon; // TODO optimise for this common case

	function interpolate(from, to, direction, stream) {
	circleStream(stream, radius, delta, direction, from, to);
	}

	function visible(lambda, phi) {
	return cos(lambda) * cos(phi) > cr;
	}

	// Takes a line and cuts into visible segments. Return values used for polygon
	// clipping: 0 - there were intersections or the line was empty; 1 - no
	// intersections 2 - there were intersections, and the first and last segments
	// should be rejoined.
	function clipLine(stream) {
	var point0, // previous point
		c0, // code for previous point
		v0, // visibility of previous point
		v00, // visibility of first point
		clean; // no intersections
	return {
		lineStart: function() {
		v00 = v0 = false;
		clean = 1;
		},
		point: function(lambda, phi) {
		var point1 = [lambda, phi],
			point2,
			v = visible(lambda, phi),
			c = smallRadius
				? v ? 0 : code(lambda, phi)
				: v ? code(lambda + (lambda < 0 ? pi : -pi), phi) : 0;
		if (!point0 && (v00 = v0 = v)) stream.lineStart();
		// Handle degeneracies.
		// TODO ignore if not clipping polygons.
		if (v !== v0) {
			point2 = intersect(point0, point1);
			if (pointEqual(point0, point2) || pointEqual(point1, point2)) {
			point1[0] += epsilon;
			point1[1] += epsilon;
			v = visible(point1[0], point1[1]);
			}
		}
		if (v !== v0) {
			clean = 0;
			if (v) {
			// outside going in
			stream.lineStart();
			point2 = intersect(point1, point0);
			stream.point(point2[0], point2[1]);
			} else {
			// inside going out
			point2 = intersect(point0, point1);
			stream.point(point2[0], point2[1]);
			stream.lineEnd();
			}
			point0 = point2;
		} else if (notHemisphere && point0 && smallRadius ^ v) {
			var t;
			// If the codes for two points are different, or are both zero,
			// and there this segment intersects with the small circle.
			if (!(c & c0) && (t = intersect(point1, point0, true))) {
			clean = 0;
			if (smallRadius) {
				stream.lineStart();
				stream.point(t[0][0], t[0][1]);
				stream.point(t[1][0], t[1][1]);
				stream.lineEnd();
			} else {
				stream.point(t[1][0], t[1][1]);
				stream.lineEnd();
				stream.lineStart();
				stream.point(t[0][0], t[0][1]);
			}
			}
		}
		if (v && (!point0 || !pointEqual(point0, point1))) {
			stream.point(point1[0], point1[1]);
		}
		point0 = point1, v0 = v, c0 = c;
		},
		lineEnd: function() {
		if (v0) stream.lineEnd();
		point0 = null;
		},
		// Rejoin first and last segments if there were intersections and the first
		// and last points were visible.
		clean: function() {
		return clean | ((v00 && v0) << 1);
		}
	};
	}

	// Intersects the great circle between a and b with the clip circle.
	function intersect(a, b, two) {
	var pa = cartesian(a),
		pb = cartesian(b);

	// We have two planes, n1.p = d1 and n2.p = d2.
	// Find intersection line p(t) = c1 n1 + c2 n2 + t (n1 猕� n2).
	var n1 = [1, 0, 0], // normal
		n2 = cartesianCross(pa, pb),
		n2n2 = cartesianDot(n2, n2),
		n1n2 = n2[0], // cartesianDot(n1, n2),
		determinant = n2n2 - n1n2 * n1n2;

	// Two polar points.
	if (!determinant) return !two && a;

	var c1 =	cr * n2n2 / determinant,
		c2 = -cr * n1n2 / determinant,
		n1xn2 = cartesianCross(n1, n2),
		A = cartesianScale(n1, c1),
		B = cartesianScale(n2, c2);
	cartesianAddInPlace(A, B);

	// Solve |p(t)|^2 = 1.
	var u = n1xn2,
		w = cartesianDot(A, u),
		uu = cartesianDot(u, u),
		t2 = w * w - uu * (cartesianDot(A, A) - 1);

	if (t2 < 0) return;

	var t = sqrt(t2),
		q = cartesianScale(u, (-w - t) / uu);
	cartesianAddInPlace(q, A);
	q = spherical(q);

	if (!two) return q;

	// Two intersection points.
	var lambda0 = a[0],
		lambda1 = b[0],
		phi0 = a[1],
		phi1 = b[1],
		z;

	if (lambda1 < lambda0) z = lambda0, lambda0 = lambda1, lambda1 = z;

	var delta = lambda1 - lambda0,
		polar = abs(delta - pi) < epsilon,
		meridian = polar || delta < epsilon;

	if (!polar && phi1 < phi0) z = phi0, phi0 = phi1, phi1 = z;

	// Check that the first point is between a and b.
	if (meridian
		? polar
			? phi0 + phi1 > 0 ^ q[1] < (abs(q[0] - lambda0) < epsilon ? phi0 : phi1)
			: phi0 <= q[1] && q[1] <= phi1
		: delta > pi ^ (lambda0 <= q[0] && q[0] <= lambda1)) {
		var q1 = cartesianScale(u, (-w + t) / uu);
		cartesianAddInPlace(q1, A);
		return [q, spherical(q1)];
	}
	}

	// Generates a 4-bit vector representing the location of a point relative to
	// the small circle's bounding box.
	function code(lambda, phi) {
	var r = smallRadius ? radius : pi - radius,
		code = 0;
	if (lambda < -r) code |= 1; // left
	else if (lambda > r) code |= 2; // right
	if (phi < -r) code |= 4; // below
	else if (phi > r) code |= 8; // above
	return code;
	}

	return clip(visible, clipLine, interpolate, smallRadius ? [0, -radius] : [-pi, radius - pi]);
}

function transform(prototype) {
	return {
	stream: transform$1(prototype)
	};
}

function transform$1(prototype) {
	function T() {}
	var p = T.prototype = Object.create(Transform.prototype);
	for (var k in prototype) p[k] = prototype[k];
	return function(stream) {
	var t = new T;
	t.stream = stream;
	return t;
	};
}

function Transform() {}

Transform.prototype = {
	point: function(x, y) { this.stream.point(x, y); },
	sphere: function() { this.stream.sphere(); },
	lineStart: function() { this.stream.lineStart(); },
	lineEnd: function() { this.stream.lineEnd(); },
	polygonStart: function() { this.stream.polygonStart(); },
	polygonEnd: function() { this.stream.polygonEnd(); }
};

function fit(project, extent, object) {
	var w = extent[1][0] - extent[0][0],
		h = extent[1][1] - extent[0][1],
		clip = project.clipExtent && project.clipExtent();

	project
		.scale(150)
		.translate([0, 0]);

	if (clip != null) project.clipExtent(null);

	geoStream(object, project.stream(boundsStream$1));

	var b = boundsStream$1.result(),
		k = Math.min(w / (b[1][0] - b[0][0]), h / (b[1][1] - b[0][1])),
		x = +extent[0][0] + (w - k * (b[1][0] + b[0][0])) / 2,
		y = +extent[0][1] + (h - k * (b[1][1] + b[0][1])) / 2;

	if (clip != null) project.clipExtent(clip);

	return project
		.scale(k * 150)
		.translate([x, y]);
}

function fitSize(project) {
	return function(size, object) {
	return fit(project, [[0, 0], size], object);
	};
}

function fitExtent(project) {
	return function(extent, object) {
	return fit(project, extent, object);
	};
}

var maxDepth = 16;
var cosMinDistance = cos(30 * radians);
// cos(minimum angular distance)

function resample(project, delta2) {
	return +delta2 ? resample$1(project, delta2) : resampleNone(project);
}

function resampleNone(project) {
	return transform$1({
	point: function(x, y) {
		x = project(x, y);
		this.stream.point(x[0], x[1]);
	}
	});
}

function resample$1(project, delta2) {

	function resampleLineTo(x0, y0, lambda0, a0, b0, c0, x1, y1, lambda1, a1, b1, c1, depth, stream) {
	var dx = x1 - x0,
		dy = y1 - y0,
		d2 = dx * dx + dy * dy;
	if (d2 > 4 * delta2 && depth--) {
		var a = a0 + a1,
			b = b0 + b1,
			c = c0 + c1,
			m = sqrt(a * a + b * b + c * c),
			phi2 = asin(c /= m),
			lambda2 = abs(abs(c) - 1) < epsilon || abs(lambda0 - lambda1) < epsilon ? (lambda0 + lambda1) / 2 : atan2(b, a),
			p = project(lambda2, phi2),
			x2 = p[0],
			y2 = p[1],
			dx2 = x2 - x0,
			dy2 = y2 - y0,
			dz = dy * dx2 - dx * dy2;
		if (dz * dz / d2 > delta2 // perpendicular projected distance
			|| abs((dx * dx2 + dy * dy2) / d2 - 0.5) > 0.3 // midpoint close to an end
			|| a0 * a1 + b0 * b1 + c0 * c1 < cosMinDistance) { // angular distance
		resampleLineTo(x0, y0, lambda0, a0, b0, c0, x2, y2, lambda2, a /= m, b /= m, c, depth, stream);
		stream.point(x2, y2);
		resampleLineTo(x2, y2, lambda2, a, b, c, x1, y1, lambda1, a1, b1, c1, depth, stream);
		}
	}
	}
	return function(stream) {
	var lambda00, x00, y00, a00, b00, c00, // first point
		lambda0, x0, y0, a0, b0, c0; // previous point

	var resampleStream = {
		point: point,
		lineStart: lineStart,
		lineEnd: lineEnd,
		polygonStart: function() { stream.polygonStart(); resampleStream.lineStart = ringStart; },
		polygonEnd: function() { stream.polygonEnd(); resampleStream.lineStart = lineStart; }
	};

	function point(x, y) {
		x = project(x, y);
		stream.point(x[0], x[1]);
	}

	function lineStart() {
		x0 = NaN;
		resampleStream.point = linePoint;
		stream.lineStart();
	}

	function linePoint(lambda, phi) {
		var c = cartesian([lambda, phi]), p = project(lambda, phi);
		resampleLineTo(x0, y0, lambda0, a0, b0, c0, x0 = p[0], y0 = p[1], lambda0 = lambda, a0 = c[0], b0 = c[1], c0 = c[2], maxDepth, stream);
		stream.point(x0, y0);
	}

	function lineEnd() {
		resampleStream.point = point;
		stream.lineEnd();
	}

	function ringStart() {
		lineStart();
		resampleStream.point = ringPoint;
		resampleStream.lineEnd = ringEnd;
	}

	function ringPoint(lambda, phi) {
		linePoint(lambda00 = lambda, phi), x00 = x0, y00 = y0, a00 = a0, b00 = b0, c00 = c0;
		resampleStream.point = linePoint;
	}

	function ringEnd() {
		resampleLineTo(x0, y0, lambda0, a0, b0, c0, x00, y00, lambda00, a00, b00, c00, maxDepth, stream);
		resampleStream.lineEnd = lineEnd;
		lineEnd();
	}

	return resampleStream;
	};
}

var transformRadians = transform$1({
	point: function(x, y) {
	this.stream.point(x * radians, y * radians);
	}
});

function projection(project) {
	return projectionMutator(function() { return project; })();
}

function projectionMutator(projectAt) {
	var project,
		k = 150, // scale
		x = 480, y = 250, // translate
		dx, dy, lambda = 0, phi = 0, // center
		deltaLambda = 0, deltaPhi = 0, deltaGamma = 0, rotate, projectRotate, // rotate
		theta = null, preclip = clipAntimeridian, // clip angle
		x0 = null, y0, x1, y1, postclip = identity, // clip extent
		delta2 = 0.5, projectResample = resample(projectTransform, delta2), // precision
		cache,
		cacheStream;

	function projection(point) {
	point = projectRotate(point[0] * radians, point[1] * radians);
	return [point[0] * k + dx, dy - point[1] * k];
	}

	function invert(point) {
	point = projectRotate.invert((point[0] - dx) / k, (dy - point[1]) / k);
	return point && [point[0] * degrees, point[1] * degrees];
	}

	function projectTransform(x, y) {
	return x = project(x, y), [x[0] * k + dx, dy - x[1] * k];
	}

	projection.stream = function(stream) {
	return cache && cacheStream === stream ? cache : cache = transformRadians(preclip(rotate, projectResample(postclip(cacheStream = stream))));
	};

	projection.clipAngle = function(_) {
	return arguments.length ? (preclip = +_ ? clipCircle(theta = _ * radians, 6 * radians) : (theta = null, clipAntimeridian), reset()) : theta * degrees;
	};

	projection.clipExtent = function(_) {
	return arguments.length ? (postclip = _ == null ? (x0 = y0 = x1 = y1 = null, identity) : clipExtent(x0 = +_[0][0], y0 = +_[0][1], x1 = +_[1][0], y1 = +_[1][1]), reset()) : x0 == null ? null : [[x0, y0], [x1, y1]];
	};

	projection.scale = function(_) {
	return arguments.length ? (k = +_, recenter()) : k;
	};

	projection.translate = function(_) {
	return arguments.length ? (x = +_[0], y = +_[1], recenter()) : [x, y];
	};

	projection.center = function(_) {
	return arguments.length ? (lambda = _[0] % 360 * radians, phi = _[1] % 360 * radians, recenter()) : [lambda * degrees, phi * degrees];
	};

	projection.rotate = function(_) {
	return arguments.length ? (deltaLambda = _[0] % 360 * radians, deltaPhi = _[1] % 360 * radians, deltaGamma = _.length > 2 ? _[2] % 360 * radians : 0, recenter()) : [deltaLambda * degrees, deltaPhi * degrees, deltaGamma * degrees];
	};

	projection.precision = function(_) {
	return arguments.length ? (projectResample = resample(projectTransform, delta2 = _ * _), reset()) : sqrt(delta2);
	};

	projection.fitExtent = fitExtent(projection);

	projection.fitSize = fitSize(projection);

	function recenter() {
	projectRotate = compose(rotate = rotateRadians(deltaLambda, deltaPhi, deltaGamma), project);
	var center = project(lambda, phi);
	dx = x - center[0] * k;
	dy = y + center[1] * k;
	return reset();
	}

	function reset() {
	cache = cacheStream = null;
	return projection;
	}

	return function() {
	project = projectAt.apply(this, arguments);
	projection.invert = project.invert && invert;
	return recenter();
	};
}

function conicProjection(projectAt) {
	var phi0 = 0,
		phi1 = pi / 3,
		m = projectionMutator(projectAt),
		p = m(phi0, phi1);

	p.parallels = function(_) {
	return arguments.length ? m(phi0 = _[0] * radians, phi1 = _[1] * radians) : [phi0 * degrees, phi1 * degrees];
	};

	return p;
}

function conicEqualAreaRaw(y0, y1) {
	var sy0 = sin(y0),
		n = (sy0 + sin(y1)) / 2,
		c = 1 + sy0 * (2 * n - sy0),
		r0 = sqrt(c) / n;

	function project(x, y) {
	var r = sqrt(c - 2 * n * sin(y)) / n;
	return [r * sin(x *= n), r0 - r * cos(x)];
	}

	project.invert = function(x, y) {
	var r0y = r0 - y;
	return [atan2(x, r0y) / n, asin((c - (x * x + r0y * r0y) * n * n) / (2 * n))];
	};

	return project;
}

function conicEqualArea() {
	return conicProjection(conicEqualAreaRaw)
		.scale(155.424)
		.center([0, 33.6442]);
}

function albers() {
	return conicEqualArea()
		.parallels([29.5, 45.5])
		.scale(1070)
		.translate([480, 250])
		.rotate([96, 0])
		.center([-0.6, 38.7]);
}

// The projections must have mutually exclusive clip regions on the sphere,
// as this will avoid emitting interleaving lines and polygons.
function multiplex(streams) {
	var n = streams.length;
	return {
	point: function(x, y) { var i = -1; while (++i < n) streams[i].point(x, y); },
	sphere: function() { var i = -1; while (++i < n) streams[i].sphere(); },
	lineStart: function() { var i = -1; while (++i < n) streams[i].lineStart(); },
	lineEnd: function() { var i = -1; while (++i < n) streams[i].lineEnd(); },
	polygonStart: function() { var i = -1; while (++i < n) streams[i].polygonStart(); },
	polygonEnd: function() { var i = -1; while (++i < n) streams[i].polygonEnd(); }
	};
}

// A composite projection for the United States, configured by default for
// 960脳500. The projection also works quite well at 960脳600 if you change the
// scale to 1285 and adjust the translate accordingly. The set of standard
// parallels for each region comes from USGS, which is published here:
// http://egsc.usgs.gov/isb/pubs/MapProjections/projections.html#albers
function albersUsa() {
	var cache,
		cacheStream,
		lower48 = albers(), lower48Point,
		alaska = conicEqualArea().rotate([154, 0]).center([-2, 58.5]).parallels([55, 65]), alaskaPoint, // EPSG:3338
		hawaii = conicEqualArea().rotate([157, 0]).center([-3, 19.9]).parallels([8, 18]), hawaiiPoint, // ESRI:102007
		point, pointStream = {point: function(x, y) { point = [x, y]; }};

	function albersUsa(coordinates) {
	var x = coordinates[0], y = coordinates[1];
	return point = null,
		(lower48Point.point(x, y), point)
		|| (alaskaPoint.point(x, y), point)
		|| (hawaiiPoint.point(x, y), point);
	}

	albersUsa.invert = function(coordinates) {
	var k = lower48.scale(),
		t = lower48.translate(),
		x = (coordinates[0] - t[0]) / k,
		y = (coordinates[1] - t[1]) / k;
	return (y >= 0.120 && y < 0.234 && x >= -0.425 && x < -0.214 ? alaska
		: y >= 0.166 && y < 0.234 && x >= -0.214 && x < -0.115 ? hawaii
		: lower48).invert(coordinates);
	};

	albersUsa.stream = function(stream) {
	return cache && cacheStream === stream ? cache : cache = multiplex([lower48.stream(cacheStream = stream), alaska.stream(stream), hawaii.stream(stream)]);
	};

	albersUsa.precision = function(_) {
	if (!arguments.length) return lower48.precision();
	lower48.precision(_), alaska.precision(_), hawaii.precision(_);
	return albersUsa;
	};

	albersUsa.scale = function(_) {
	if (!arguments.length) return lower48.scale();
	lower48.scale(_), alaska.scale(_ * 0.35), hawaii.scale(_);
	return albersUsa.translate(lower48.translate());
	};

	albersUsa.translate = function(_) {
	if (!arguments.length) return lower48.translate();
	var k = lower48.scale(), x = +_[0], y = +_[1];

	lower48Point = lower48
		.translate(_)
		.clipExtent([[x - 0.455 * k, y - 0.238 * k], [x + 0.455 * k, y + 0.238 * k]])
		.stream(pointStream);

	alaskaPoint = alaska
		.translate([x - 0.307 * k, y + 0.201 * k])
		.clipExtent([[x - 0.425 * k + epsilon, y + 0.120 * k + epsilon], [x - 0.214 * k - epsilon, y + 0.234 * k - epsilon]])
		.stream(pointStream);

	hawaiiPoint = hawaii
		.translate([x - 0.205 * k, y + 0.212 * k])
		.clipExtent([[x - 0.214 * k + epsilon, y + 0.166 * k + epsilon], [x - 0.115 * k - epsilon, y + 0.234 * k - epsilon]])
		.stream(pointStream);

	return albersUsa;
	};

	albersUsa.fitExtent = fitExtent(albersUsa);

	albersUsa.fitSize = fitSize(albersUsa);

	return albersUsa.scale(1070);
}

function azimuthalRaw(scale) {
	return function(x, y) {
	var cx = cos(x),
		cy = cos(y),
		k = scale(cx * cy);
	return [
		k * cy * sin(x),
		k * sin(y)
	];
	}
}

function azimuthalInvert(angle) {
	return function(x, y) {
	var z = sqrt(x * x + y * y),
		c = angle(z),
		sc = sin(c),
		cc = cos(c);
	return [
		atan2(x * sc, z * cc),
		asin(z && y * sc / z)
	];
	}
}

var azimuthalEqualAreaRaw = azimuthalRaw(function(cxcy) {
	return sqrt(2 / (1 + cxcy));
});

azimuthalEqualAreaRaw.invert = azimuthalInvert(function(z) {
	return 2 * asin(z / 2);
});

function azimuthalEqualArea() {
	return projection(azimuthalEqualAreaRaw)
		.scale(124.75)
		.clipAngle(180 - 1e-3);
}

var azimuthalEquidistantRaw = azimuthalRaw(function(c) {
	return (c = acos(c)) && c / sin(c);
});

azimuthalEquidistantRaw.invert = azimuthalInvert(function(z) {
	return z;
});

function azimuthalEquidistant() {
	return projection(azimuthalEquidistantRaw)
		.scale(79.4188)
		.clipAngle(180 - 1e-3);
}

function mercatorRaw(lambda, phi) {
	return [lambda, log(tan((halfPi + phi) / 2))];
}

mercatorRaw.invert = function(x, y) {
	return [x, 2 * atan(exp(y)) - halfPi];
};

function mercator() {
	return mercatorProjection(mercatorRaw)
		.scale(961 / tau);
}

function mercatorProjection(project) {
	var m = projection(project),
		scale = m.scale,
		translate = m.translate,
		clipExtent = m.clipExtent,
		clipAuto;

	m.scale = function(_) {
	return arguments.length ? (scale(_), clipAuto && m.clipExtent(null), m) : scale();
	};

	m.translate = function(_) {
	return arguments.length ? (translate(_), clipAuto && m.clipExtent(null), m) : translate();
	};

	m.clipExtent = function(_) {
	if (!arguments.length) return clipAuto ? null : clipExtent();
	if (clipAuto = _ == null) {
		var k = pi * scale(),
			t = translate();
		_ = [[t[0] - k, t[1] - k], [t[0] + k, t[1] + k]];
	}
	clipExtent(_);
	return m;
	};

	return m.clipExtent(null);
}

function tany(y) {
	return tan((halfPi + y) / 2);
}

function conicConformalRaw(y0, y1) {
	var cy0 = cos(y0),
		n = y0 === y1 ? sin(y0) : log(cy0 / cos(y1)) / log(tany(y1) / tany(y0)),
		f = cy0 * pow(tany(y0), n) / n;

	if (!n) return mercatorRaw;

	function project(x, y) {
	if (f > 0) { if (y < -halfPi + epsilon) y = -halfPi + epsilon; }
	else { if (y > halfPi - epsilon) y = halfPi - epsilon; }
	var r = f / pow(tany(y), n);
	return [r * sin(n * x), f - r * cos(n * x)];
	}

	project.invert = function(x, y) {
	var fy = f - y, r = sign(n) * sqrt(x * x + fy * fy);
	return [atan2(x, fy) / n, 2 * atan(pow(f / r, 1 / n)) - halfPi];
	};

	return project;
}

function conicConformal() {
	return conicProjection(conicConformalRaw)
		.scale(109.5)
		.parallels([30, 30]);
}

function equirectangularRaw(lambda, phi) {
	return [lambda, phi];
}

equirectangularRaw.invert = equirectangularRaw;

function equirectangular() {
	return projection(equirectangularRaw)
		.scale(152.63);
}

function conicEquidistantRaw(y0, y1) {
	var cy0 = cos(y0),
		n = y0 === y1 ? sin(y0) : (cy0 - cos(y1)) / (y1 - y0),
		g = cy0 / n + y0;

	if (abs(n) < epsilon) return equirectangularRaw;

	function project(x, y) {
	var gy = g - y, nx = n * x;
	return [gy * sin(nx), g - gy * cos(nx)];
	}

	project.invert = function(x, y) {
	var gy = g - y;
	return [atan2(x, gy) / n, g - sign(n) * sqrt(x * x + gy * gy)];
	};

	return project;
}

function conicEquidistant() {
	return conicProjection(conicEquidistantRaw)
		.scale(131.154)
		.center([0, 13.9389]);
}

function gnomonicRaw(x, y) {
	var cy = cos(y), k = cos(x) * cy;
	return [cy * sin(x) / k, sin(y) / k];
}

gnomonicRaw.invert = azimuthalInvert(atan);

function gnomonic() {
	return projection(gnomonicRaw)
		.scale(144.049)
		.clipAngle(60);
}

function orthographicRaw(x, y) {
	return [cos(y) * sin(x), sin(y)];
}

orthographicRaw.invert = azimuthalInvert(asin);

function orthographic() {
	return projection(orthographicRaw)
		.scale(249.5)
		.clipAngle(90 + epsilon);
}

function stereographicRaw(x, y) {
	var cy = cos(y), k = 1 + cos(x) * cy;
	return [cy * sin(x) / k, sin(y) / k];
}

stereographicRaw.invert = azimuthalInvert(function(z) {
	return 2 * atan(z);
});

function stereographic() {
	return projection(stereographicRaw)
		.scale(250)
		.clipAngle(142);
}

function transverseMercatorRaw(lambda, phi) {
	return [log(tan((halfPi + phi) / 2)), -lambda];
}

transverseMercatorRaw.invert = function(x, y) {
	return [-y, 2 * atan(exp(x)) - halfPi];
};

function transverseMercator() {
	var m = mercatorProjection(transverseMercatorRaw),
		center = m.center,
		rotate = m.rotate;

	m.center = function(_) {
	return arguments.length ? center([-_[1], _[0]]) : (_ = center(), [_[1], -_[0]]);
	};

	m.rotate = function(_) {
	return arguments.length ? rotate([_[0], _[1], _.length > 2 ? _[2] + 90 : 90]) : (_ = rotate(), [_[0], _[1], _[2] - 90]);
	};

	return rotate([0, 0, 90])
		.scale(159.155);
}

exports.geoArea = area;
exports.geoBounds = bounds;
exports.geoCentroid = centroid;
exports.geoCircle = circle;
exports.geoClipExtent = extent;
exports.geoDistance = distance;
exports.geoGraticule = graticule;
exports.geoInterpolate = interpolate;
exports.geoLength = length;
exports.geoPath = index;
exports.geoAlbers = albers;
exports.geoAlbersUsa = albersUsa;
exports.geoAzimuthalEqualArea = azimuthalEqualArea;
exports.geoAzimuthalEqualAreaRaw = azimuthalEqualAreaRaw;
exports.geoAzimuthalEquidistant = azimuthalEquidistant;
exports.geoAzimuthalEquidistantRaw = azimuthalEquidistantRaw;
exports.geoConicConformal = conicConformal;
exports.geoConicConformalRaw = conicConformalRaw;
exports.geoConicEqualArea = conicEqualArea;
exports.geoConicEqualAreaRaw = conicEqualAreaRaw;
exports.geoConicEquidistant = conicEquidistant;
exports.geoConicEquidistantRaw = conicEquidistantRaw;
exports.geoEquirectangular = equirectangular;
exports.geoEquirectangularRaw = equirectangularRaw;
exports.geoGnomonic = gnomonic;
exports.geoGnomonicRaw = gnomonicRaw;
exports.geoProjection = projection;
exports.geoProjectionMutator = projectionMutator;
exports.geoMercator = mercator;
exports.geoMercatorRaw = mercatorRaw;
exports.geoOrthographic = orthographic;
exports.geoOrthographicRaw = orthographicRaw;
exports.geoStereographic = stereographic;
exports.geoStereographicRaw = stereographicRaw;
exports.geoTransverseMercator = transverseMercator;
exports.geoTransverseMercatorRaw = transverseMercatorRaw;
exports.geoRotation = rotation;
exports.geoStream = geoStream;
exports.geoTransform = transform;

Object.defineProperty(exports, '__esModule', { value: true });

})));
},{"d3-array":2}],7:[function(require,module,exports){
// https://d3js.org/d3-dispatch/ Version 1.0.1. Copyright 2016 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
}(this, function (exports) { 'use strict';

	var noop = {value: function() {}};

	function dispatch() {
	for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
		if (!(t = arguments[i] + "") || (t in _)) throw new Error("illegal type: " + t);
		_[t] = [];
	}
	return new Dispatch(_);
	}

	function Dispatch(_) {
	this._ = _;
	}

	function parseTypenames(typenames, types) {
	return typenames.trim().split(/^|\s+/).map(function(t) {
		var name = "", i = t.indexOf(".");
		if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
		if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
		return {type: t, name: name};
	});
	}

	Dispatch.prototype = dispatch.prototype = {
	constructor: Dispatch,
	on: function(typename, callback) {
		var _ = this._,
			T = parseTypenames(typename + "", _),
			t,
			i = -1,
			n = T.length;

		// If no callback was specified, return the callback of the given type and name.
		if (arguments.length < 2) {
		while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
		return;
		}

		// If a type was specified, set the callback for the given type and name.
		// Otherwise, if a null callback was specified, remove callbacks of the given name.
		if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
		while (++i < n) {
		if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
		else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
		}

		return this;
	},
	copy: function() {
		var copy = {}, _ = this._;
		for (var t in _) copy[t] = _[t].slice();
		return new Dispatch(copy);
	},
	call: function(type, that) {
		if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
		if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
		for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
	},
	apply: function(type, that, args) {
		if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
		for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
	}
	};

	function get(type, name) {
	for (var i = 0, n = type.length, c; i < n; ++i) {
		if ((c = type[i]).name === name) {
		return c.value;
		}
	}
	}

	function set(type, name, callback) {
	for (var i = 0, n = type.length; i < n; ++i) {
		if (type[i].name === name) {
		type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
		break;
		}
	}
	if (callback != null) type.push({name: name, value: callback});
	return type;
	}

	exports.dispatch = dispatch;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
},{}],8:[function(require,module,exports){
// https://d3js.org/d3-dsv/ Version 1.0.3. Copyright 2016 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
}(this, (function (exports) { 'use strict';

function objectConverter(columns) {
	return new Function("d", "return {" + columns.map(function(name, i) {
	return JSON.stringify(name) + ": d[" + i + "]";
	}).join(",") + "}");
}

function customConverter(columns, f) {
	var object = objectConverter(columns);
	return function(row, i) {
	return f(object(row), i, columns);
	};
}

// Compute unique columns in order of discovery.
function inferColumns(rows) {
	var columnSet = Object.create(null),
		columns = [];

	rows.forEach(function(row) {
	for (var column in row) {
		if (!(column in columnSet)) {
		columns.push(columnSet[column] = column);
		}
	}
	});

	return columns;
}

function dsv(delimiter) {
	var reFormat = new RegExp("[\"" + delimiter + "\n]"),
		delimiterCode = delimiter.charCodeAt(0);

	function parse(text, f) {
	var convert, columns, rows = parseRows(text, function(row, i) {
		if (convert) return convert(row, i - 1);
		columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
	});
	rows.columns = columns;
	return rows;
	}

	function parseRows(text, f) {
	var EOL = {}, // sentinel value for end-of-line
		EOF = {}, // sentinel value for end-of-file
		rows = [], // output rows
		N = text.length,
		I = 0, // current character index
		n = 0, // the current line number
		t, // the current token
		eol; // is the current token followed by EOL?

	function token() {
		if (I >= N) return EOF; // special case: end of file
		if (eol) return eol = false, EOL; // special case: end of line

		// special case: quotes
		var j = I, c;
		if (text.charCodeAt(j) === 34) {
		var i = j;
		while (i++ < N) {
			if (text.charCodeAt(i) === 34) {
			if (text.charCodeAt(i + 1) !== 34) break;
			++i;
			}
		}
		I = i + 2;
		c = text.charCodeAt(i + 1);
		if (c === 13) {
			eol = true;
			if (text.charCodeAt(i + 2) === 10) ++I;
		} else if (c === 10) {
			eol = true;
		}
		return text.slice(j + 1, i).replace(/""/g, "\"");
		}

		// common case: find next delimiter or newline
		while (I < N) {
		var k = 1;
		c = text.charCodeAt(I++);
		if (c === 10) eol = true; // \n
		else if (c === 13) { eol = true; if (text.charCodeAt(I) === 10) ++I, ++k; } // \r|\r\n
		else if (c !== delimiterCode) continue;
		return text.slice(j, I - k);
		}

		// special case: last token before EOF
		return text.slice(j);
	}

	while ((t = token()) !== EOF) {
		var a = [];
		while (t !== EOL && t !== EOF) {
		a.push(t);
		t = token();
		}
		if (f && (a = f(a, n++)) == null) continue;
		rows.push(a);
	}

	return rows;
	}

	function format(rows, columns) {
	if (columns == null) columns = inferColumns(rows);
	return [columns.map(formatValue).join(delimiter)].concat(rows.map(function(row) {
		return columns.map(function(column) {
		return formatValue(row[column]);
		}).join(delimiter);
	})).join("\n");
	}

	function formatRows(rows) {
	return rows.map(formatRow).join("\n");
	}

	function formatRow(row) {
	return row.map(formatValue).join(delimiter);
	}

	function formatValue(text) {
	return text == null ? ""
		: reFormat.test(text += "") ? "\"" + text.replace(/\"/g, "\"\"") + "\""
		: text;
	}

	return {
	parse: parse,
	parseRows: parseRows,
	format: format,
	formatRows: formatRows
	};
}

var csv = dsv(",");

var csvParse = csv.parse;
var csvParseRows = csv.parseRows;
var csvFormat = csv.format;
var csvFormatRows = csv.formatRows;

var tsv = dsv("\t");

var tsvParse = tsv.parse;
var tsvParseRows = tsv.parseRows;
var tsvFormat = tsv.format;
var tsvFormatRows = tsv.formatRows;

exports.dsvFormat = dsv;
exports.csvParse = csvParse;
exports.csvParseRows = csvParseRows;
exports.csvFormat = csvFormat;
exports.csvFormatRows = csvFormatRows;
exports.tsvParse = tsvParse;
exports.tsvParseRows = tsvParseRows;
exports.tsvFormat = tsvFormat;
exports.tsvFormatRows = tsvFormatRows;

Object.defineProperty(exports, '__esModule', { value: true });

})));
},{}],9:[function(require,module,exports){
// https://d3js.org/d3-ease/ Version 1.0.1. Copyright 2016 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
}(this, function (exports) { 'use strict';

	function linear(t) {
	return +t;
	}

	function quadIn(t) {
	return t * t;
	}

	function quadOut(t) {
	return t * (2 - t);
	}

	function quadInOut(t) {
	return ((t *= 2) <= 1 ? t * t : --t * (2 - t) + 1) / 2;
	}

	function cubicIn(t) {
	return t * t * t;
	}

	function cubicOut(t) {
	return --t * t * t + 1;
	}

	function cubicInOut(t) {
	return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
	}

	var exponent = 3;

	var polyIn = (function custom(e) {
	e = +e;

	function polyIn(t) {
		return Math.pow(t, e);
	}

	polyIn.exponent = custom;

	return polyIn;
	})(exponent);

	var polyOut = (function custom(e) {
	e = +e;

	function polyOut(t) {
		return 1 - Math.pow(1 - t, e);
	}

	polyOut.exponent = custom;

	return polyOut;
	})(exponent);

	var polyInOut = (function custom(e) {
	e = +e;

	function polyInOut(t) {
		return ((t *= 2) <= 1 ? Math.pow(t, e) : 2 - Math.pow(2 - t, e)) / 2;
	}

	polyInOut.exponent = custom;

	return polyInOut;
	})(exponent);

	var pi = Math.PI;
	var halfPi = pi / 2;
	function sinIn(t) {
	return 1 - Math.cos(t * halfPi);
	}

	function sinOut(t) {
	return Math.sin(t * halfPi);
	}

	function sinInOut(t) {
	return (1 - Math.cos(pi * t)) / 2;
	}

	function expIn(t) {
	return Math.pow(2, 10 * t - 10);
	}

	function expOut(t) {
	return 1 - Math.pow(2, -10 * t);
	}

	function expInOut(t) {
	return ((t *= 2) <= 1 ? Math.pow(2, 10 * t - 10) : 2 - Math.pow(2, 10 - 10 * t)) / 2;
	}

	function circleIn(t) {
	return 1 - Math.sqrt(1 - t * t);
	}

	function circleOut(t) {
	return Math.sqrt(1 - --t * t);
	}

	function circleInOut(t) {
	return ((t *= 2) <= 1 ? 1 - Math.sqrt(1 - t * t) : Math.sqrt(1 - (t -= 2) * t) + 1) / 2;
	}

	var b1 = 4 / 11;
	var b2 = 6 / 11;
	var b3 = 8 / 11;
	var b4 = 3 / 4;
	var b5 = 9 / 11;
	var b6 = 10 / 11;
	var b7 = 15 / 16;
	var b8 = 21 / 22;
	var b9 = 63 / 64;
	var b0 = 1 / b1 / b1;
	function bounceIn(t) {
	return 1 - bounceOut(1 - t);
	}

	function bounceOut(t) {
	return (t = +t) < b1 ? b0 * t * t : t < b3 ? b0 * (t -= b2) * t + b4 : t < b6 ? b0 * (t -= b5) * t + b7 : b0 * (t -= b8) * t + b9;
	}

	function bounceInOut(t) {
	return ((t *= 2) <= 1 ? 1 - bounceOut(1 - t) : bounceOut(t - 1) + 1) / 2;
	}

	var overshoot = 1.70158;

	var backIn = (function custom(s) {
	s = +s;

	function backIn(t) {
		return t * t * ((s + 1) * t - s);
	}

	backIn.overshoot = custom;

	return backIn;
	})(overshoot);

	var backOut = (function custom(s) {
	s = +s;

	function backOut(t) {
		return --t * t * ((s + 1) * t + s) + 1;
	}

	backOut.overshoot = custom;

	return backOut;
	})(overshoot);

	var backInOut = (function custom(s) {
	s = +s;

	function backInOut(t) {
		return ((t *= 2) < 1 ? t * t * ((s + 1) * t - s) : (t -= 2) * t * ((s + 1) * t + s) + 2) / 2;
	}

	backInOut.overshoot = custom;

	return backInOut;
	})(overshoot);

	var tau = 2 * Math.PI;
	var amplitude = 1;
	var period = 0.3;
	var elasticIn = (function custom(a, p) {
	var s = Math.asin(1 / (a = Math.max(1, a))) * (p /= tau);

	function elasticIn(t) {
		return a * Math.pow(2, 10 * --t) * Math.sin((s - t) / p);
	}

	elasticIn.amplitude = function(a) { return custom(a, p * tau); };
	elasticIn.period = function(p) { return custom(a, p); };

	return elasticIn;
	})(amplitude, period);

	var elasticOut = (function custom(a, p) {
	var s = Math.asin(1 / (a = Math.max(1, a))) * (p /= tau);

	function elasticOut(t) {
		return 1 - a * Math.pow(2, -10 * (t = +t)) * Math.sin((t + s) / p);
	}

	elasticOut.amplitude = function(a) { return custom(a, p * tau); };
	elasticOut.period = function(p) { return custom(a, p); };

	return elasticOut;
	})(amplitude, period);

	var elasticInOut = (function custom(a, p) {
	var s = Math.asin(1 / (a = Math.max(1, a))) * (p /= tau);

	function elasticInOut(t) {
		return ((t = t * 2 - 1) < 0
			? a * Math.pow(2, 10 * t) * Math.sin((s - t) / p)
			: 2 - a * Math.pow(2, -10 * t) * Math.sin((s + t) / p)) / 2;
	}

	elasticInOut.amplitude = function(a) { return custom(a, p * tau); };
	elasticInOut.period = function(p) { return custom(a, p); };

	return elasticInOut;
	})(amplitude, period);

	exports.easeLinear = linear;
	exports.easeQuad = quadInOut;
	exports.easeQuadIn = quadIn;
	exports.easeQuadOut = quadOut;
	exports.easeQuadInOut = quadInOut;
	exports.easeCubic = cubicInOut;
	exports.easeCubicIn = cubicIn;
	exports.easeCubicOut = cubicOut;
	exports.easeCubicInOut = cubicInOut;
	exports.easePoly = polyInOut;
	exports.easePolyIn = polyIn;
	exports.easePolyOut = polyOut;
	exports.easePolyInOut = polyInOut;
	exports.easeSin = sinInOut;
	exports.easeSinIn = sinIn;
	exports.easeSinOut = sinOut;
	exports.easeSinInOut = sinInOut;
	exports.easeExp = expInOut;
	exports.easeExpIn = expIn;
	exports.easeExpOut = expOut;
	exports.easeExpInOut = expInOut;
	exports.easeCircle = circleInOut;
	exports.easeCircleIn = circleIn;
	exports.easeCircleOut = circleOut;
	exports.easeCircleInOut = circleInOut;
	exports.easeBounce = bounceOut;
	exports.easeBounceIn = bounceIn;
	exports.easeBounceOut = bounceOut;
	exports.easeBounceInOut = bounceInOut;
	exports.easeBack = backInOut;
	exports.easeBackIn = backIn;
	exports.easeBackOut = backOut;
	exports.easeBackInOut = backInOut;
	exports.easeElastic = elasticOut;
	exports.easeElasticIn = elasticIn;
	exports.easeElasticOut = elasticOut;
	exports.easeElasticInOut = elasticInOut;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
},{}],10:[function(require,module,exports){
// https://d3js.org/d3-geo/ Version 1.2.5. Copyright 2016 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-array')) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3-array'], factory) :
	(factory((global.d3 = global.d3 || {}),global.d3));
}(this, (function (exports,d3Array) { 'use strict';

// Adds floating point numbers with twice the normal precision.
// Reference: J. R. Shewchuk, Adaptive Precision Floating-Point Arithmetic and
// Fast Robust Geometric Predicates, Discrete & Computational Geometry 18(3)
// 305鈥�363 (1997).
// Code adapted from GeographicLib by Charles F. F. Karney,
// http://geographiclib.sourceforge.net/

var adder = function() {
	return new Adder;
}

function Adder() {
	this.reset();
}

Adder.prototype = {
	constructor: Adder,
	reset: function() {
	this.s = // rounded value
	this.t = 0; // exact error
	},
	add: function(y) {
	add(temp, y, this.t);
	add(this, temp.s, this.s);
	if (this.s) this.t += temp.t;
	else this.s = temp.t;
	},
	valueOf: function() {
	return this.s;
	}
};

var temp = new Adder;

function add(adder, a, b) {
	var x = adder.s = a + b,
		bv = x - a,
		av = x - bv;
	adder.t = (a - av) + (b - bv);
}

var epsilon = 1e-6;
var epsilon2 = 1e-12;
var pi = Math.PI;
var halfPi = pi / 2;
var quarterPi = pi / 4;
var tau = pi * 2;

var degrees = 180 / pi;
var radians = pi / 180;

var abs = Math.abs;
var atan = Math.atan;
var atan2 = Math.atan2;
var cos = Math.cos;
var ceil = Math.ceil;
var exp = Math.exp;

var log = Math.log;
var pow = Math.pow;
var sin = Math.sin;
var sign = Math.sign || function(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; };
var sqrt = Math.sqrt;
var tan = Math.tan;

function acos(x) {
	return x > 1 ? 0 : x < -1 ? pi : Math.acos(x);
}

function asin(x) {
	return x > 1 ? halfPi : x < -1 ? -halfPi : Math.asin(x);
}

function haversin(x) {
	return (x = sin(x / 2)) * x;
}

function noop() {}

function streamGeometry(geometry, stream) {
	if (geometry && streamGeometryType.hasOwnProperty(geometry.type)) {
	streamGeometryType[geometry.type](geometry, stream);
	}
}

var streamObjectType = {
	Feature: function(feature, stream) {
	streamGeometry(feature.geometry, stream);
	},
	FeatureCollection: function(object, stream) {
	var features = object.features, i = -1, n = features.length;
	while (++i < n) streamGeometry(features[i].geometry, stream);
	}
};

var streamGeometryType = {
	Sphere: function(object, stream) {
	stream.sphere();
	},
	Point: function(object, stream) {
	object = object.coordinates;
	stream.point(object[0], object[1], object[2]);
	},
	MultiPoint: function(object, stream) {
	var coordinates = object.coordinates, i = -1, n = coordinates.length;
	while (++i < n) object = coordinates[i], stream.point(object[0], object[1], object[2]);
	},
	LineString: function(object, stream) {
	streamLine(object.coordinates, stream, 0);
	},
	MultiLineString: function(object, stream) {
	var coordinates = object.coordinates, i = -1, n = coordinates.length;
	while (++i < n) streamLine(coordinates[i], stream, 0);
	},
	Polygon: function(object, stream) {
	streamPolygon(object.coordinates, stream);
	},
	MultiPolygon: function(object, stream) {
	var coordinates = object.coordinates, i = -1, n = coordinates.length;
	while (++i < n) streamPolygon(coordinates[i], stream);
	},
	GeometryCollection: function(object, stream) {
	var geometries = object.geometries, i = -1, n = geometries.length;
	while (++i < n) streamGeometry(geometries[i], stream);
	}
};

function streamLine(coordinates, stream, closed) {
	var i = -1, n = coordinates.length - closed, coordinate;
	stream.lineStart();
	while (++i < n) coordinate = coordinates[i], stream.point(coordinate[0], coordinate[1], coordinate[2]);
	stream.lineEnd();
}

function streamPolygon(coordinates, stream) {
	var i = -1, n = coordinates.length;
	stream.polygonStart();
	while (++i < n) streamLine(coordinates[i], stream, 1);
	stream.polygonEnd();
}

var geoStream = function(object, stream) {
	if (object && streamObjectType.hasOwnProperty(object.type)) {
	streamObjectType[object.type](object, stream);
	} else {
	streamGeometry(object, stream);
	}
}

var areaRingSum = adder();

var areaSum = adder();
var lambda00;
var phi00;
var lambda0;
var cosPhi0;
var sinPhi0;

var areaStream = {
	point: noop,
	lineStart: noop,
	lineEnd: noop,
	polygonStart: function() {
	areaRingSum.reset();
	areaStream.lineStart = areaRingStart;
	areaStream.lineEnd = areaRingEnd;
	},
	polygonEnd: function() {
	var areaRing = +areaRingSum;
	areaSum.add(areaRing < 0 ? tau + areaRing : areaRing);
	this.lineStart = this.lineEnd = this.point = noop;
	},
	sphere: function() {
	areaSum.add(tau);
	}
};

function areaRingStart() {
	areaStream.point = areaPointFirst;
}

function areaRingEnd() {
	areaPoint(lambda00, phi00);
}

function areaPointFirst(lambda, phi) {
	areaStream.point = areaPoint;
	lambda00 = lambda, phi00 = phi;
	lambda *= radians, phi *= radians;
	lambda0 = lambda, cosPhi0 = cos(phi = phi / 2 + quarterPi), sinPhi0 = sin(phi);
}

function areaPoint(lambda, phi) {
	lambda *= radians, phi *= radians;
	phi = phi / 2 + quarterPi; // half the angular distance from south pole

	// Spherical excess E for a spherical triangle with vertices: south pole,
	// previous point, current point.	Uses a formula derived from Cagnoli鈥檚
	// theorem.	See Todhunter, Spherical Trig. (1871), Sec. 103, Eq. (2).
	var dLambda = lambda - lambda0,
		sdLambda = dLambda >= 0 ? 1 : -1,
		adLambda = sdLambda * dLambda,
		cosPhi = cos(phi),
		sinPhi = sin(phi),
		k = sinPhi0 * sinPhi,
		u = cosPhi0 * cosPhi + k * cos(adLambda),
		v = k * sdLambda * sin(adLambda);
	areaRingSum.add(atan2(v, u));

	// Advance the previous points.
	lambda0 = lambda, cosPhi0 = cosPhi, sinPhi0 = sinPhi;
}

var area = function(object) {
	areaSum.reset();
	geoStream(object, areaStream);
	return areaSum * 2;
}

function spherical(cartesian) {
	return [atan2(cartesian[1], cartesian[0]), asin(cartesian[2])];
}

function cartesian(spherical) {
	var lambda = spherical[0], phi = spherical[1], cosPhi = cos(phi);
	return [cosPhi * cos(lambda), cosPhi * sin(lambda), sin(phi)];
}

function cartesianDot(a, b) {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cartesianCross(a, b) {
	return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

// TODO return a
function cartesianAddInPlace(a, b) {
	a[0] += b[0], a[1] += b[1], a[2] += b[2];
}

function cartesianScale(vector, k) {
	return [vector[0] * k, vector[1] * k, vector[2] * k];
}

// TODO return d
function cartesianNormalizeInPlace(d) {
	var l = sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
	d[0] /= l, d[1] /= l, d[2] /= l;
}

var lambda0$1;
var phi0;
var lambda1;
var phi1;
var lambda2;
var lambda00$1;
var phi00$1;
var p0;
var deltaSum = adder();
var ranges;
var range$1;

var boundsStream = {
	point: boundsPoint,
	lineStart: boundsLineStart,
	lineEnd: boundsLineEnd,
	polygonStart: function() {
	boundsStream.point = boundsRingPoint;
	boundsStream.lineStart = boundsRingStart;
	boundsStream.lineEnd = boundsRingEnd;
	deltaSum.reset();
	areaStream.polygonStart();
	},
	polygonEnd: function() {
	areaStream.polygonEnd();
	boundsStream.point = boundsPoint;
	boundsStream.lineStart = boundsLineStart;
	boundsStream.lineEnd = boundsLineEnd;
	if (areaRingSum < 0) lambda0$1 = -(lambda1 = 180), phi0 = -(phi1 = 90);
	else if (deltaSum > epsilon) phi1 = 90;
	else if (deltaSum < -epsilon) phi0 = -90;
	range$1[0] = lambda0$1, range$1[1] = lambda1;
	}
};

function boundsPoint(lambda, phi) {
	ranges.push(range$1 = [lambda0$1 = lambda, lambda1 = lambda]);
	if (phi < phi0) phi0 = phi;
	if (phi > phi1) phi1 = phi;
}

function linePoint(lambda, phi) {
	var p = cartesian([lambda * radians, phi * radians]);
	if (p0) {
	var normal = cartesianCross(p0, p),
		equatorial = [normal[1], -normal[0], 0],
		inflection = cartesianCross(equatorial, normal);
	cartesianNormalizeInPlace(inflection);
	inflection = spherical(inflection);
	var delta = lambda - lambda2,
		sign$$1 = delta > 0 ? 1 : -1,
		lambdai = inflection[0] * degrees * sign$$1,
		phii,
		antimeridian = abs(delta) > 180;
	if (antimeridian ^ (sign$$1 * lambda2 < lambdai && lambdai < sign$$1 * lambda)) {
		phii = inflection[1] * degrees;
		if (phii > phi1) phi1 = phii;
	} else if (lambdai = (lambdai + 360) % 360 - 180, antimeridian ^ (sign$$1 * lambda2 < lambdai && lambdai < sign$$1 * lambda)) {
		phii = -inflection[1] * degrees;
		if (phii < phi0) phi0 = phii;
	} else {
		if (phi < phi0) phi0 = phi;
		if (phi > phi1) phi1 = phi;
	}
	if (antimeridian) {
		if (lambda < lambda2) {
		if (angle(lambda0$1, lambda) > angle(lambda0$1, lambda1)) lambda1 = lambda;
		} else {
		if (angle(lambda, lambda1) > angle(lambda0$1, lambda1)) lambda0$1 = lambda;
		}
	} else {
		if (lambda1 >= lambda0$1) {
		if (lambda < lambda0$1) lambda0$1 = lambda;
		if (lambda > lambda1) lambda1 = lambda;
		} else {
		if (lambda > lambda2) {
			if (angle(lambda0$1, lambda) > angle(lambda0$1, lambda1)) lambda1 = lambda;
		} else {
			if (angle(lambda, lambda1) > angle(lambda0$1, lambda1)) lambda0$1 = lambda;
		}
		}
	}
	} else {
	boundsPoint(lambda, phi);
	}
	p0 = p, lambda2 = lambda;
}

function boundsLineStart() {
	boundsStream.point = linePoint;
}

function boundsLineEnd() {
	range$1[0] = lambda0$1, range$1[1] = lambda1;
	boundsStream.point = boundsPoint;
	p0 = null;
}

function boundsRingPoint(lambda, phi) {
	if (p0) {
	var delta = lambda - lambda2;
	deltaSum.add(abs(delta) > 180 ? delta + (delta > 0 ? 360 : -360) : delta);
	} else {
	lambda00$1 = lambda, phi00$1 = phi;
	}
	areaStream.point(lambda, phi);
	linePoint(lambda, phi);
}

function boundsRingStart() {
	areaStream.lineStart();
}

function boundsRingEnd() {
	boundsRingPoint(lambda00$1, phi00$1);
	areaStream.lineEnd();
	if (abs(deltaSum) > epsilon) lambda0$1 = -(lambda1 = 180);
	range$1[0] = lambda0$1, range$1[1] = lambda1;
	p0 = null;
}

// Finds the left-right distance between two longitudes.
// This is almost the same as (lambda1 - lambda0 + 360掳) % 360掳, except that we want
// the distance between 卤180掳 to be 360掳.
function angle(lambda0, lambda1) {
	return (lambda1 -= lambda0) < 0 ? lambda1 + 360 : lambda1;
}

function rangeCompare(a, b) {
	return a[0] - b[0];
}

function rangeContains(range$$1, x) {
	return range$$1[0] <= range$$1[1] ? range$$1[0] <= x && x <= range$$1[1] : x < range$$1[0] || range$$1[1] < x;
}

var bounds = function(feature) {
	var i, n, a, b, merged, deltaMax, delta;

	phi1 = lambda1 = -(lambda0$1 = phi0 = Infinity);
	ranges = [];
	geoStream(feature, boundsStream);

	// First, sort ranges by their minimum longitudes.
	if (n = ranges.length) {
	ranges.sort(rangeCompare);

	// Then, merge any ranges that overlap.
	for (i = 1, a = ranges[0], merged = [a]; i < n; ++i) {
		b = ranges[i];
		if (rangeContains(a, b[0]) || rangeContains(a, b[1])) {
		if (angle(a[0], b[1]) > angle(a[0], a[1])) a[1] = b[1];
		if (angle(b[0], a[1]) > angle(a[0], a[1])) a[0] = b[0];
		} else {
		merged.push(a = b);
		}
	}

	// Finally, find the largest gap between the merged ranges.
	// The final bounding box will be the inverse of this gap.
	for (deltaMax = -Infinity, n = merged.length - 1, i = 0, a = merged[n]; i <= n; a = b, ++i) {
		b = merged[i];
		if ((delta = angle(a[1], b[0])) > deltaMax) deltaMax = delta, lambda0$1 = b[0], lambda1 = a[1];
	}
	}

	ranges = range$1 = null;

	return lambda0$1 === Infinity || phi0 === Infinity
		? [[NaN, NaN], [NaN, NaN]]
		: [[lambda0$1, phi0], [lambda1, phi1]];
}

var W0;
var W1;
var X0;
var Y0;
var Z0;
var X1;
var Y1;
var Z1;
var X2;
var Y2;
var Z2;
var lambda00$2;
var phi00$2;
var x0;
var y0;
var z0; // previous point

var centroidStream = {
	sphere: noop,
	point: centroidPoint,
	lineStart: centroidLineStart,
	lineEnd: centroidLineEnd,
	polygonStart: function() {
	centroidStream.lineStart = centroidRingStart;
	centroidStream.lineEnd = centroidRingEnd;
	},
	polygonEnd: function() {
	centroidStream.lineStart = centroidLineStart;
	centroidStream.lineEnd = centroidLineEnd;
	}
};

// Arithmetic mean of Cartesian vectors.
function centroidPoint(lambda, phi) {
	lambda *= radians, phi *= radians;
	var cosPhi = cos(phi);
	centroidPointCartesian(cosPhi * cos(lambda), cosPhi * sin(lambda), sin(phi));
}

function centroidPointCartesian(x, y, z) {
	++W0;
	X0 += (x - X0) / W0;
	Y0 += (y - Y0) / W0;
	Z0 += (z - Z0) / W0;
}

function centroidLineStart() {
	centroidStream.point = centroidLinePointFirst;
}

function centroidLinePointFirst(lambda, phi) {
	lambda *= radians, phi *= radians;
	var cosPhi = cos(phi);
	x0 = cosPhi * cos(lambda);
	y0 = cosPhi * sin(lambda);
	z0 = sin(phi);
	centroidStream.point = centroidLinePoint;
	centroidPointCartesian(x0, y0, z0);
}

function centroidLinePoint(lambda, phi) {
	lambda *= radians, phi *= radians;
	var cosPhi = cos(phi),
		x = cosPhi * cos(lambda),
		y = cosPhi * sin(lambda),
		z = sin(phi),
		w = atan2(sqrt((w = y0 * z - z0 * y) * w + (w = z0 * x - x0 * z) * w + (w = x0 * y - y0 * x) * w), x0 * x + y0 * y + z0 * z);
	W1 += w;
	X1 += w * (x0 + (x0 = x));
	Y1 += w * (y0 + (y0 = y));
	Z1 += w * (z0 + (z0 = z));
	centroidPointCartesian(x0, y0, z0);
}

function centroidLineEnd() {
	centroidStream.point = centroidPoint;
}

// See J. E. Brock, The Inertia Tensor for a Spherical Triangle,
// J. Applied Mechanics 42, 239 (1975).
function centroidRingStart() {
	centroidStream.point = centroidRingPointFirst;
}

function centroidRingEnd() {
	centroidRingPoint(lambda00$2, phi00$2);
	centroidStream.point = centroidPoint;
}

function centroidRingPointFirst(lambda, phi) {
	lambda00$2 = lambda, phi00$2 = phi;
	lambda *= radians, phi *= radians;
	centroidStream.point = centroidRingPoint;
	var cosPhi = cos(phi);
	x0 = cosPhi * cos(lambda);
	y0 = cosPhi * sin(lambda);
	z0 = sin(phi);
	centroidPointCartesian(x0, y0, z0);
}

function centroidRingPoint(lambda, phi) {
	lambda *= radians, phi *= radians;
	var cosPhi = cos(phi),
		x = cosPhi * cos(lambda),
		y = cosPhi * sin(lambda),
		z = sin(phi),
		cx = y0 * z - z0 * y,
		cy = z0 * x - x0 * z,
		cz = x0 * y - y0 * x,
		m = sqrt(cx * cx + cy * cy + cz * cz),
		u = x0 * x + y0 * y + z0 * z,
		v = m && -acos(u) / m, // area weight
		w = atan2(m, u); // line weight
	X2 += v * cx;
	Y2 += v * cy;
	Z2 += v * cz;
	W1 += w;
	X1 += w * (x0 + (x0 = x));
	Y1 += w * (y0 + (y0 = y));
	Z1 += w * (z0 + (z0 = z));
	centroidPointCartesian(x0, y0, z0);
}

var centroid = function(object) {
	W0 = W1 =
	X0 = Y0 = Z0 =
	X1 = Y1 = Z1 =
	X2 = Y2 = Z2 = 0;
	geoStream(object, centroidStream);

	var x = X2,
		y = Y2,
		z = Z2,
		m = x * x + y * y + z * z;

	// If the area-weighted ccentroid is undefined, fall back to length-weighted ccentroid.
	if (m < epsilon2) {
	x = X1, y = Y1, z = Z1;
	// If the feature has zero length, fall back to arithmetic mean of point vectors.
	if (W1 < epsilon) x = X0, y = Y0, z = Z0;
	m = x * x + y * y + z * z;
	// If the feature still has an undefined ccentroid, then return.
	if (m < epsilon2) return [NaN, NaN];
	}

	return [atan2(y, x) * degrees, asin(z / sqrt(m)) * degrees];
}

var constant = function(x) {
	return function() {
	return x;
	};
}

var compose = function(a, b) {

	function compose(x, y) {
	return x = a(x, y), b(x[0], x[1]);
	}

	if (a.invert && b.invert) compose.invert = function(x, y) {
	return x = b.invert(x, y), x && a.invert(x[0], x[1]);
	};

	return compose;
}

function rotationIdentity(lambda, phi) {
	return [lambda > pi ? lambda - tau : lambda < -pi ? lambda + tau : lambda, phi];
}

rotationIdentity.invert = rotationIdentity;

function rotateRadians(deltaLambda, deltaPhi, deltaGamma) {
	return (deltaLambda %= tau) ? (deltaPhi || deltaGamma ? compose(rotationLambda(deltaLambda), rotationPhiGamma(deltaPhi, deltaGamma))
	: rotationLambda(deltaLambda))
	: (deltaPhi || deltaGamma ? rotationPhiGamma(deltaPhi, deltaGamma)
	: rotationIdentity);
}

function forwardRotationLambda(deltaLambda) {
	return function(lambda, phi) {
	return lambda += deltaLambda, [lambda > pi ? lambda - tau : lambda < -pi ? lambda + tau : lambda, phi];
	};
}

function rotationLambda(deltaLambda) {
	var rotation = forwardRotationLambda(deltaLambda);
	rotation.invert = forwardRotationLambda(-deltaLambda);
	return rotation;
}

function rotationPhiGamma(deltaPhi, deltaGamma) {
	var cosDeltaPhi = cos(deltaPhi),
		sinDeltaPhi = sin(deltaPhi),
		cosDeltaGamma = cos(deltaGamma),
		sinDeltaGamma = sin(deltaGamma);

	function rotation(lambda, phi) {
	var cosPhi = cos(phi),
		x = cos(lambda) * cosPhi,
		y = sin(lambda) * cosPhi,
		z = sin(phi),
		k = z * cosDeltaPhi + x * sinDeltaPhi;
	return [
		atan2(y * cosDeltaGamma - k * sinDeltaGamma, x * cosDeltaPhi - z * sinDeltaPhi),
		asin(k * cosDeltaGamma + y * sinDeltaGamma)
	];
	}

	rotation.invert = function(lambda, phi) {
	var cosPhi = cos(phi),
		x = cos(lambda) * cosPhi,
		y = sin(lambda) * cosPhi,
		z = sin(phi),
		k = z * cosDeltaGamma - y * sinDeltaGamma;
	return [
		atan2(y * cosDeltaGamma + z * sinDeltaGamma, x * cosDeltaPhi + k * sinDeltaPhi),
		asin(k * cosDeltaPhi - x * sinDeltaPhi)
	];
	};

	return rotation;
}

var rotation = function(rotate) {
	rotate = rotateRadians(rotate[0] * radians, rotate[1] * radians, rotate.length > 2 ? rotate[2] * radians : 0);

	function forward(coordinates) {
	coordinates = rotate(coordinates[0] * radians, coordinates[1] * radians);
	return coordinates[0] *= degrees, coordinates[1] *= degrees, coordinates;
	}

	forward.invert = function(coordinates) {
	coordinates = rotate.invert(coordinates[0] * radians, coordinates[1] * radians);
	return coordinates[0] *= degrees, coordinates[1] *= degrees, coordinates;
	};

	return forward;
}

// Generates a circle centered at [0掳, 0掳], with a given radius and precision.
function circleStream(stream, radius, delta, direction, t0, t1) {
	if (!delta) return;
	var cosRadius = cos(radius),
		sinRadius = sin(radius),
		step = direction * delta;
	if (t0 == null) {
	t0 = radius + direction * tau;
	t1 = radius - step / 2;
	} else {
	t0 = circleRadius(cosRadius, t0);
	t1 = circleRadius(cosRadius, t1);
	if (direction > 0 ? t0 < t1 : t0 > t1) t0 += direction * tau;
	}
	for (var point, t = t0; direction > 0 ? t > t1 : t < t1; t -= step) {
	point = spherical([cosRadius, -sinRadius * cos(t), -sinRadius * sin(t)]);
	stream.point(point[0], point[1]);
	}
}

// Returns the signed angle of a cartesian point relative to [cosRadius, 0, 0].
function circleRadius(cosRadius, point) {
	point = cartesian(point), point[0] -= cosRadius;
	cartesianNormalizeInPlace(point);
	var radius = acos(-point[1]);
	return ((-point[2] < 0 ? -radius : radius) + tau - epsilon) % tau;
}

var circle = function() {
	var center = constant([0, 0]),
		radius = constant(90),
		precision = constant(6),
		ring,
		rotate,
		stream = {point: point};

	function point(x, y) {
	ring.push(x = rotate(x, y));
	x[0] *= degrees, x[1] *= degrees;
	}

	function circle() {
	var c = center.apply(this, arguments),
		r = radius.apply(this, arguments) * radians,
		p = precision.apply(this, arguments) * radians;
	ring = [];
	rotate = rotateRadians(-c[0] * radians, -c[1] * radians, 0).invert;
	circleStream(stream, r, p, 1);
	c = {type: "Polygon", coordinates: [ring]};
	ring = rotate = null;
	return c;
	}

	circle.center = function(_) {
	return arguments.length ? (center = typeof _ === "function" ? _ : constant([+_[0], +_[1]]), circle) : center;
	};

	circle.radius = function(_) {
	return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), circle) : radius;
	};

	circle.precision = function(_) {
	return arguments.length ? (precision = typeof _ === "function" ? _ : constant(+_), circle) : precision;
	};

	return circle;
}

var clipBuffer = function() {
	var lines = [],
		line;
	return {
	point: function(x, y) {
		line.push([x, y]);
	},
	lineStart: function() {
		lines.push(line = []);
	},
	lineEnd: noop,
	rejoin: function() {
		if (lines.length > 1) lines.push(lines.pop().concat(lines.shift()));
	},
	result: function() {
		var result = lines;
		lines = [];
		line = null;
		return result;
	}
	};
}

var clipLine = function(a, b, x0, y0, x1, y1) {
	var ax = a[0],
		ay = a[1],
		bx = b[0],
		by = b[1],
		t0 = 0,
		t1 = 1,
		dx = bx - ax,
		dy = by - ay,
		r;

	r = x0 - ax;
	if (!dx && r > 0) return;
	r /= dx;
	if (dx < 0) {
	if (r < t0) return;
	if (r < t1) t1 = r;
	} else if (dx > 0) {
	if (r > t1) return;
	if (r > t0) t0 = r;
	}

	r = x1 - ax;
	if (!dx && r < 0) return;
	r /= dx;
	if (dx < 0) {
	if (r > t1) return;
	if (r > t0) t0 = r;
	} else if (dx > 0) {
	if (r < t0) return;
	if (r < t1) t1 = r;
	}

	r = y0 - ay;
	if (!dy && r > 0) return;
	r /= dy;
	if (dy < 0) {
	if (r < t0) return;
	if (r < t1) t1 = r;
	} else if (dy > 0) {
	if (r > t1) return;
	if (r > t0) t0 = r;
	}

	r = y1 - ay;
	if (!dy && r < 0) return;
	r /= dy;
	if (dy < 0) {
	if (r > t1) return;
	if (r > t0) t0 = r;
	} else if (dy > 0) {
	if (r < t0) return;
	if (r < t1) t1 = r;
	}

	if (t0 > 0) a[0] = ax + t0 * dx, a[1] = ay + t0 * dy;
	if (t1 < 1) b[0] = ax + t1 * dx, b[1] = ay + t1 * dy;
	return true;
}

var pointEqual = function(a, b) {
	return abs(a[0] - b[0]) < epsilon && abs(a[1] - b[1]) < epsilon;
}

function Intersection(point, points, other, entry) {
	this.x = point;
	this.z = points;
	this.o = other; // another intersection
	this.e = entry; // is an entry?
	this.v = false; // visited
	this.n = this.p = null; // next & previous
}

// A generalized polygon clipping algorithm: given a polygon that has been cut
// into its visible line segments, and rejoins the segments by interpolating
// along the clip edge.
var clipPolygon = function(segments, compareIntersection, startInside, interpolate, stream) {
	var subject = [],
		clip = [],
		i,
		n;

	segments.forEach(function(segment) {
	if ((n = segment.length - 1) <= 0) return;
	var n, p0 = segment[0], p1 = segment[n], x;

	// If the first and last points of a segment are coincident, then treat as a
	// closed ring. TODO if all rings are closed, then the winding order of the
	// exterior ring should be checked.
	if (pointEqual(p0, p1)) {
		stream.lineStart();
		for (i = 0; i < n; ++i) stream.point((p0 = segment[i])[0], p0[1]);
		stream.lineEnd();
		return;
	}

	subject.push(x = new Intersection(p0, segment, null, true));
	clip.push(x.o = new Intersection(p0, null, x, false));
	subject.push(x = new Intersection(p1, segment, null, false));
	clip.push(x.o = new Intersection(p1, null, x, true));
	});

	if (!subject.length) return;

	clip.sort(compareIntersection);
	link(subject);
	link(clip);

	for (i = 0, n = clip.length; i < n; ++i) {
	clip[i].e = startInside = !startInside;
	}

	var start = subject[0],
		points,
		point;

	while (1) {
	// Find first unvisited intersection.
	var current = start,
		isSubject = true;
	while (current.v) if ((current = current.n) === start) return;
	points = current.z;
	stream.lineStart();
	do {
		current.v = current.o.v = true;
		if (current.e) {
		if (isSubject) {
			for (i = 0, n = points.length; i < n; ++i) stream.point((point = points[i])[0], point[1]);
		} else {
			interpolate(current.x, current.n.x, 1, stream);
		}
		current = current.n;
		} else {
		if (isSubject) {
			points = current.p.z;
			for (i = points.length - 1; i >= 0; --i) stream.point((point = points[i])[0], point[1]);
		} else {
			interpolate(current.x, current.p.x, -1, stream);
		}
		current = current.p;
		}
		current = current.o;
		points = current.z;
		isSubject = !isSubject;
	} while (!current.v);
	stream.lineEnd();
	}
}

function link(array) {
	if (!(n = array.length)) return;
	var n,
		i = 0,
		a = array[0],
		b;
	while (++i < n) {
	a.n = b = array[i];
	b.p = a;
	a = b;
	}
	a.n = b = array[0];
	b.p = a;
}

var clipMax = 1e9;
var clipMin = -clipMax;

// TODO Use d3-polygon鈥檚 polygonContains here for the ring check?
// TODO Eliminate duplicate buffering in clipBuffer and polygon.push?

function clipExtent(x0, y0, x1, y1) {

	function visible(x, y) {
	return x0 <= x && x <= x1 && y0 <= y && y <= y1;
	}

	function interpolate(from, to, direction, stream) {
	var a = 0, a1 = 0;
	if (from == null
		|| (a = corner(from, direction)) !== (a1 = corner(to, direction))
		|| comparePoint(from, to) < 0 ^ direction > 0) {
		do stream.point(a === 0 || a === 3 ? x0 : x1, a > 1 ? y1 : y0);
		while ((a = (a + direction + 4) % 4) !== a1);
	} else {
		stream.point(to[0], to[1]);
	}
	}

	function corner(p, direction) {
	return abs(p[0] - x0) < epsilon ? direction > 0 ? 0 : 3
		: abs(p[0] - x1) < epsilon ? direction > 0 ? 2 : 1
		: abs(p[1] - y0) < epsilon ? direction > 0 ? 1 : 0
		: direction > 0 ? 3 : 2; // abs(p[1] - y1) < epsilon
	}

	function compareIntersection(a, b) {
	return comparePoint(a.x, b.x);
	}

	function comparePoint(a, b) {
	var ca = corner(a, 1),
		cb = corner(b, 1);
	return ca !== cb ? ca - cb
		: ca === 0 ? b[1] - a[1]
		: ca === 1 ? a[0] - b[0]
		: ca === 2 ? a[1] - b[1]
		: b[0] - a[0];
	}

	return function(stream) {
	var activeStream = stream,
		bufferStream = clipBuffer(),
		segments,
		polygon,
		ring,
		x__, y__, v__, // first point
		x_, y_, v_, // previous point
		first,
		clean;

	var clipStream = {
		point: point,
		lineStart: lineStart,
		lineEnd: lineEnd,
		polygonStart: polygonStart,
		polygonEnd: polygonEnd
	};

	function point(x, y) {
		if (visible(x, y)) activeStream.point(x, y);
	}

	function polygonInside() {
		var winding = 0;

		for (var i = 0, n = polygon.length; i < n; ++i) {
		for (var ring = polygon[i], j = 1, m = ring.length, point = ring[0], a0, a1, b0 = point[0], b1 = point[1]; j < m; ++j) {
			a0 = b0, a1 = b1, point = ring[j], b0 = point[0], b1 = point[1];
			if (a1 <= y1) { if (b1 > y1 && (b0 - a0) * (y1 - a1) > (b1 - a1) * (x0 - a0)) ++winding; }
			else { if (b1 <= y1 && (b0 - a0) * (y1 - a1) < (b1 - a1) * (x0 - a0)) --winding; }
		}
		}

		return winding;
	}

	// Buffer geometry within a polygon and then clip it en masse.
	function polygonStart() {
		activeStream = bufferStream, segments = [], polygon = [], clean = true;
	}

	function polygonEnd() {
		var startInside = polygonInside(),
			cleanInside = clean && startInside,
			visible = (segments = d3Array.merge(segments)).length;
		if (cleanInside || visible) {
		stream.polygonStart();
		if (cleanInside) {
			stream.lineStart();
			interpolate(null, null, 1, stream);
			stream.lineEnd();
		}
		if (visible) {
			clipPolygon(segments, compareIntersection, startInside, interpolate, stream);
		}
		stream.polygonEnd();
		}
		activeStream = stream, segments = polygon = ring = null;
	}

	function lineStart() {
		clipStream.point = linePoint;
		if (polygon) polygon.push(ring = []);
		first = true;
		v_ = false;
		x_ = y_ = NaN;
	}

	// TODO rather than special-case polygons, simply handle them separately.
	// Ideally, coincident intersection points should be jittered to avoid
	// clipping issues.
	function lineEnd() {
		if (segments) {
		linePoint(x__, y__);
		if (v__ && v_) bufferStream.rejoin();
		segments.push(bufferStream.result());
		}
		clipStream.point = point;
		if (v_) activeStream.lineEnd();
	}

	function linePoint(x, y) {
		var v = visible(x, y);
		if (polygon) ring.push([x, y]);
		if (first) {
		x__ = x, y__ = y, v__ = v;
		first = false;
		if (v) {
			activeStream.lineStart();
			activeStream.point(x, y);
		}
		} else {
		if (v && v_) activeStream.point(x, y);
		else {
			var a = [x_ = Math.max(clipMin, Math.min(clipMax, x_)), y_ = Math.max(clipMin, Math.min(clipMax, y_))],
				b = [x = Math.max(clipMin, Math.min(clipMax, x)), y = Math.max(clipMin, Math.min(clipMax, y))];
			if (clipLine(a, b, x0, y0, x1, y1)) {
			if (!v_) {
				activeStream.lineStart();
				activeStream.point(a[0], a[1]);
			}
			activeStream.point(b[0], b[1]);
			if (!v) activeStream.lineEnd();
			clean = false;
			} else if (v) {
			activeStream.lineStart();
			activeStream.point(x, y);
			clean = false;
			}
		}
		}
		x_ = x, y_ = y, v_ = v;
	}

	return clipStream;
	};
}

var extent = function() {
	var x0 = 0,
		y0 = 0,
		x1 = 960,
		y1 = 500,
		cache,
		cacheStream,
		clip;

	return clip = {
	stream: function(stream) {
		return cache && cacheStream === stream ? cache : cache = clipExtent(x0, y0, x1, y1)(cacheStream = stream);
	},
	extent: function(_) {
		return arguments.length ? (x0 = +_[0][0], y0 = +_[0][1], x1 = +_[1][0], y1 = +_[1][1], cache = cacheStream = null, clip) : [[x0, y0], [x1, y1]];
	}
	};
}

var lengthSum = adder();
var lambda0$2;
var sinPhi0$1;
var cosPhi0$1;

var lengthStream = {
	sphere: noop,
	point: noop,
	lineStart: lengthLineStart,
	lineEnd: noop,
	polygonStart: noop,
	polygonEnd: noop
};

function lengthLineStart() {
	lengthStream.point = lengthPointFirst;
	lengthStream.lineEnd = lengthLineEnd;
}

function lengthLineEnd() {
	lengthStream.point = lengthStream.lineEnd = noop;
}

function lengthPointFirst(lambda, phi) {
	lambda *= radians, phi *= radians;
	lambda0$2 = lambda, sinPhi0$1 = sin(phi), cosPhi0$1 = cos(phi);
	lengthStream.point = lengthPoint;
}

function lengthPoint(lambda, phi) {
	lambda *= radians, phi *= radians;
	var sinPhi = sin(phi),
		cosPhi = cos(phi),
		delta = abs(lambda - lambda0$2),
		cosDelta = cos(delta),
		sinDelta = sin(delta),
		x = cosPhi * sinDelta,
		y = cosPhi0$1 * sinPhi - sinPhi0$1 * cosPhi * cosDelta,
		z = sinPhi0$1 * sinPhi + cosPhi0$1 * cosPhi * cosDelta;
	lengthSum.add(atan2(sqrt(x * x + y * y), z));
	lambda0$2 = lambda, sinPhi0$1 = sinPhi, cosPhi0$1 = cosPhi;
}

var length = function(object) {
	lengthSum.reset();
	geoStream(object, lengthStream);
	return +lengthSum;
}

var coordinates = [null, null];
var object = {type: "LineString", coordinates: coordinates};

var distance = function(a, b) {
	coordinates[0] = a;
	coordinates[1] = b;
	return length(object);
}

function graticuleX(y0, y1, dy) {
	var y = d3Array.range(y0, y1 - epsilon, dy).concat(y1);
	return function(x) { return y.map(function(y) { return [x, y]; }); };
}

function graticuleY(x0, x1, dx) {
	var x = d3Array.range(x0, x1 - epsilon, dx).concat(x1);
	return function(y) { return x.map(function(x) { return [x, y]; }); };
}

var graticule = function() {
	var x1, x0, X1, X0,
		y1, y0, Y1, Y0,
		dx = 10, dy = dx, DX = 90, DY = 360,
		x, y, X, Y,
		precision = 2.5;

	function graticule() {
	return {type: "MultiLineString", coordinates: lines()};
	}

	function lines() {
	return d3Array.range(ceil(X0 / DX) * DX, X1, DX).map(X)
		.concat(d3Array.range(ceil(Y0 / DY) * DY, Y1, DY).map(Y))
		.concat(d3Array.range(ceil(x0 / dx) * dx, x1, dx).filter(function(x) { return abs(x % DX) > epsilon; }).map(x))
		.concat(d3Array.range(ceil(y0 / dy) * dy, y1, dy).filter(function(y) { return abs(y % DY) > epsilon; }).map(y));
	}

	graticule.lines = function() {
	return lines().map(function(coordinates) { return {type: "LineString", coordinates: coordinates}; });
	};

	graticule.outline = function() {
	return {
		type: "Polygon",
		coordinates: [
		X(X0).concat(
		Y(Y1).slice(1),
		X(X1).reverse().slice(1),
		Y(Y0).reverse().slice(1))
		]
	};
	};

	graticule.extent = function(_) {
	if (!arguments.length) return graticule.extentMinor();
	return graticule.extentMajor(_).extentMinor(_);
	};

	graticule.extentMajor = function(_) {
	if (!arguments.length) return [[X0, Y0], [X1, Y1]];
	X0 = +_[0][0], X1 = +_[1][0];
	Y0 = +_[0][1], Y1 = +_[1][1];
	if (X0 > X1) _ = X0, X0 = X1, X1 = _;
	if (Y0 > Y1) _ = Y0, Y0 = Y1, Y1 = _;
	return graticule.precision(precision);
	};

	graticule.extentMinor = function(_) {
	if (!arguments.length) return [[x0, y0], [x1, y1]];
	x0 = +_[0][0], x1 = +_[1][0];
	y0 = +_[0][1], y1 = +_[1][1];
	if (x0 > x1) _ = x0, x0 = x1, x1 = _;
	if (y0 > y1) _ = y0, y0 = y1, y1 = _;
	return graticule.precision(precision);
	};

	graticule.step = function(_) {
	if (!arguments.length) return graticule.stepMinor();
	return graticule.stepMajor(_).stepMinor(_);
	};

	graticule.stepMajor = function(_) {
	if (!arguments.length) return [DX, DY];
	DX = +_[0], DY = +_[1];
	return graticule;
	};

	graticule.stepMinor = function(_) {
	if (!arguments.length) return [dx, dy];
	dx = +_[0], dy = +_[1];
	return graticule;
	};

	graticule.precision = function(_) {
	if (!arguments.length) return precision;
	precision = +_;
	x = graticuleX(y0, y1, 90);
	y = graticuleY(x0, x1, precision);
	X = graticuleX(Y0, Y1, 90);
	Y = graticuleY(X0, X1, precision);
	return graticule;
	};

	return graticule
		.extentMajor([[-180, -90 + epsilon], [180, 90 - epsilon]])
		.extentMinor([[-180, -80 - epsilon], [180, 80 + epsilon]]);
}

var interpolate = function(a, b) {
	var x0 = a[0] * radians,
		y0 = a[1] * radians,
		x1 = b[0] * radians,
		y1 = b[1] * radians,
		cy0 = cos(y0),
		sy0 = sin(y0),
		cy1 = cos(y1),
		sy1 = sin(y1),
		kx0 = cy0 * cos(x0),
		ky0 = cy0 * sin(x0),
		kx1 = cy1 * cos(x1),
		ky1 = cy1 * sin(x1),
		d = 2 * asin(sqrt(haversin(y1 - y0) + cy0 * cy1 * haversin(x1 - x0))),
		k = sin(d);

	var interpolate = d ? function(t) {
	var B = sin(t *= d) / k,
		A = sin(d - t) / k,
		x = A * kx0 + B * kx1,
		y = A * ky0 + B * ky1,
		z = A * sy0 + B * sy1;
	return [
		atan2(y, x) * degrees,
		atan2(z, sqrt(x * x + y * y)) * degrees
	];
	} : function() {
	return [x0 * degrees, y0 * degrees];
	};

	interpolate.distance = d;

	return interpolate;
}

var identity = function(x) {
	return x;
}

var areaSum$1 = adder();
var areaRingSum$1 = adder();
var x00;
var y00;
var x0$1;
var y0$1;

var areaStream$1 = {
	point: noop,
	lineStart: noop,
	lineEnd: noop,
	polygonStart: function() {
	areaStream$1.lineStart = areaRingStart$1;
	areaStream$1.lineEnd = areaRingEnd$1;
	},
	polygonEnd: function() {
	areaStream$1.lineStart = areaStream$1.lineEnd = areaStream$1.point = noop;
	areaSum$1.add(abs(areaRingSum$1));
	areaRingSum$1.reset();
	},
	result: function() {
	var area = areaSum$1 / 2;
	areaSum$1.reset();
	return area;
	}
};

function areaRingStart$1() {
	areaStream$1.point = areaPointFirst$1;
}

function areaPointFirst$1(x, y) {
	areaStream$1.point = areaPoint$1;
	x00 = x0$1 = x, y00 = y0$1 = y;
}

function areaPoint$1(x, y) {
	areaRingSum$1.add(y0$1 * x - x0$1 * y);
	x0$1 = x, y0$1 = y;
}

function areaRingEnd$1() {
	areaPoint$1(x00, y00);
}

var x0$2 = Infinity;
var y0$2 = x0$2;
var x1 = -x0$2;
var y1 = x1;

var boundsStream$1 = {
	point: boundsPoint$1,
	lineStart: noop,
	lineEnd: noop,
	polygonStart: noop,
	polygonEnd: noop,
	result: function() {
	var bounds = [[x0$2, y0$2], [x1, y1]];
	x1 = y1 = -(y0$2 = x0$2 = Infinity);
	return bounds;
	}
};

function boundsPoint$1(x, y) {
	if (x < x0$2) x0$2 = x;
	if (x > x1) x1 = x;
	if (y < y0$2) y0$2 = y;
	if (y > y1) y1 = y;
}

// TODO Enforce positive area for exterior, negative area for interior?

var X0$1 = 0;
var Y0$1 = 0;
var Z0$1 = 0;
var X1$1 = 0;
var Y1$1 = 0;
var Z1$1 = 0;
var X2$1 = 0;
var Y2$1 = 0;
var Z2$1 = 0;
var x00$1;
var y00$1;
var x0$3;
var y0$3;

var centroidStream$1 = {
	point: centroidPoint$1,
	lineStart: centroidLineStart$1,
	lineEnd: centroidLineEnd$1,
	polygonStart: function() {
	centroidStream$1.lineStart = centroidRingStart$1;
	centroidStream$1.lineEnd = centroidRingEnd$1;
	},
	polygonEnd: function() {
	centroidStream$1.point = centroidPoint$1;
	centroidStream$1.lineStart = centroidLineStart$1;
	centroidStream$1.lineEnd = centroidLineEnd$1;
	},
	result: function() {
	var centroid = Z2$1 ? [X2$1 / Z2$1, Y2$1 / Z2$1]
		: Z1$1 ? [X1$1 / Z1$1, Y1$1 / Z1$1]
		: Z0$1 ? [X0$1 / Z0$1, Y0$1 / Z0$1]
		: [NaN, NaN];
	X0$1 = Y0$1 = Z0$1 =
	X1$1 = Y1$1 = Z1$1 =
	X2$1 = Y2$1 = Z2$1 = 0;
	return centroid;
	}
};

function centroidPoint$1(x, y) {
	X0$1 += x;
	Y0$1 += y;
	++Z0$1;
}

function centroidLineStart$1() {
	centroidStream$1.point = centroidPointFirstLine;
}

function centroidPointFirstLine(x, y) {
	centroidStream$1.point = centroidPointLine;
	centroidPoint$1(x0$3 = x, y0$3 = y);
}

function centroidPointLine(x, y) {
	var dx = x - x0$3, dy = y - y0$3, z = sqrt(dx * dx + dy * dy);
	X1$1 += z * (x0$3 + x) / 2;
	Y1$1 += z * (y0$3 + y) / 2;
	Z1$1 += z;
	centroidPoint$1(x0$3 = x, y0$3 = y);
}

function centroidLineEnd$1() {
	centroidStream$1.point = centroidPoint$1;
}

function centroidRingStart$1() {
	centroidStream$1.point = centroidPointFirstRing;
}

function centroidRingEnd$1() {
	centroidPointRing(x00$1, y00$1);
}

function centroidPointFirstRing(x, y) {
	centroidStream$1.point = centroidPointRing;
	centroidPoint$1(x00$1 = x0$3 = x, y00$1 = y0$3 = y);
}

function centroidPointRing(x, y) {
	var dx = x - x0$3,
		dy = y - y0$3,
		z = sqrt(dx * dx + dy * dy);

	X1$1 += z * (x0$3 + x) / 2;
	Y1$1 += z * (y0$3 + y) / 2;
	Z1$1 += z;

	z = y0$3 * x - x0$3 * y;
	X2$1 += z * (x0$3 + x);
	Y2$1 += z * (y0$3 + y);
	Z2$1 += z * 3;
	centroidPoint$1(x0$3 = x, y0$3 = y);
}

function PathContext(context) {
	this._context = context;
}

PathContext.prototype = {
	_radius: 4.5,
	pointRadius: function(_) {
	return this._radius = _, this;
	},
	polygonStart: function() {
	this._line = 0;
	},
	polygonEnd: function() {
	this._line = NaN;
	},
	lineStart: function() {
	this._point = 0;
	},
	lineEnd: function() {
	if (this._line === 0) this._context.closePath();
	this._point = NaN;
	},
	point: function(x, y) {
	switch (this._point) {
		case 0: {
		this._context.moveTo(x, y);
		this._point = 1;
		break;
		}
		case 1: {
		this._context.lineTo(x, y);
		break;
		}
		default: {
		this._context.moveTo(x + this._radius, y);
		this._context.arc(x, y, this._radius, 0, tau);
		break;
		}
	}
	},
	result: noop
};

function PathString() {
	this._string = [];
}

PathString.prototype = {
	_circle: circle$1(4.5),
	pointRadius: function(_) {
	return this._circle = circle$1(_), this;
	},
	polygonStart: function() {
	this._line = 0;
	},
	polygonEnd: function() {
	this._line = NaN;
	},
	lineStart: function() {
	this._point = 0;
	},
	lineEnd: function() {
	if (this._line === 0) this._string.push("Z");
	this._point = NaN;
	},
	point: function(x, y) {
	switch (this._point) {
		case 0: {
		this._string.push("M", x, ",", y);
		this._point = 1;
		break;
		}
		case 1: {
		this._string.push("L", x, ",", y);
		break;
		}
		default: {
		this._string.push("M", x, ",", y, this._circle);
		break;
		}
	}
	},
	result: function() {
	if (this._string.length) {
		var result = this._string.join("");
		this._string = [];
		return result;
	}
	}
};

function circle$1(radius) {
	return "m0," + radius
		+ "a" + radius + "," + radius + " 0 1,1 0," + -2 * radius
		+ "a" + radius + "," + radius + " 0 1,1 0," + 2 * radius
		+ "z";
}

var index = function() {
	var pointRadius = 4.5,
		projection,
		projectionStream,
		context,
		contextStream;

	function path(object) {
	if (object) {
		if (typeof pointRadius === "function") contextStream.pointRadius(+pointRadius.apply(this, arguments));
		geoStream(object, projectionStream(contextStream));
	}
	return contextStream.result();
	}

	path.area = function(object) {
	geoStream(object, projectionStream(areaStream$1));
	return areaStream$1.result();
	};

	path.bounds = function(object) {
	geoStream(object, projectionStream(boundsStream$1));
	return boundsStream$1.result();
	};

	path.centroid = function(object) {
	geoStream(object, projectionStream(centroidStream$1));
	return centroidStream$1.result();
	};

	path.projection = function(_) {
	return arguments.length ? (projectionStream = (projection = _) == null ? identity : _.stream, path) : projection;
	};

	path.context = function(_) {
	if (!arguments.length) return context;
	contextStream = (context = _) == null ? new PathString : new PathContext(_);
	if (typeof pointRadius !== "function") contextStream.pointRadius(pointRadius);
	return path;
	};

	path.pointRadius = function(_) {
	if (!arguments.length) return pointRadius;
	pointRadius = typeof _ === "function" ? _ : (contextStream.pointRadius(+_), +_);
	return path;
	};

	return path.projection(null).context(null);
}

var sum = adder();

var polygonContains = function(polygon, point) {
	var lambda = point[0],
		phi = point[1],
		normal = [sin(lambda), -cos(lambda), 0],
		angle = 0,
		winding = 0;

	sum.reset();

	for (var i = 0, n = polygon.length; i < n; ++i) {
	if (!(m = (ring = polygon[i]).length)) continue;
	var ring,
		m,
		point0 = ring[m - 1],
		lambda0 = point0[0],
		phi0 = point0[1] / 2 + quarterPi,
		sinPhi0 = sin(phi0),
		cosPhi0 = cos(phi0);

	for (var j = 0; j < m; ++j, lambda0 = lambda1, sinPhi0 = sinPhi1, cosPhi0 = cosPhi1, point0 = point1) {
		var point1 = ring[j],
			lambda1 = point1[0],
			phi1 = point1[1] / 2 + quarterPi,
			sinPhi1 = sin(phi1),
			cosPhi1 = cos(phi1),
			delta = lambda1 - lambda0,
			sign$$1 = delta >= 0 ? 1 : -1,
			absDelta = sign$$1 * delta,
			antimeridian = absDelta > pi,
			k = sinPhi0 * sinPhi1;

		sum.add(atan2(k * sign$$1 * sin(absDelta), cosPhi0 * cosPhi1 + k * cos(absDelta)));
		angle += antimeridian ? delta + sign$$1 * tau : delta;

		// Are the longitudes either side of the point鈥檚 meridian (lambda),
		// and are the latitudes smaller than the parallel (phi)?
		if (antimeridian ^ lambda0 >= lambda ^ lambda1 >= lambda) {
		var arc = cartesianCross(cartesian(point0), cartesian(point1));
		cartesianNormalizeInPlace(arc);
		var intersection = cartesianCross(normal, arc);
		cartesianNormalizeInPlace(intersection);
		var phiArc = (antimeridian ^ delta >= 0 ? -1 : 1) * asin(intersection[2]);
		if (phi > phiArc || phi === phiArc && (arc[0] || arc[1])) {
			winding += antimeridian ^ delta >= 0 ? 1 : -1;
		}
		}
	}
	}

	// First, determine whether the South pole is inside or outside:
	//
	// It is inside if:
	// * the polygon winds around it in a clockwise direction.
	// * the polygon does not (cumulatively) wind around it, but has a negative
	//	 (counter-clockwise) area.
	//
	// Second, count the (signed) number of times a segment crosses a lambda
	// from the point to the South pole.	If it is zero, then the point is the
	// same side as the South pole.

	return (angle < -epsilon || angle < epsilon && sum < -epsilon) ^ (winding & 1);
}

var clip = function(pointVisible, clipLine, interpolate, start) {
	return function(rotate, sink) {
	var line = clipLine(sink),
		rotatedStart = rotate.invert(start[0], start[1]),
		ringBuffer = clipBuffer(),
		ringSink = clipLine(ringBuffer),
		polygonStarted = false,
		polygon,
		segments,
		ring;

	var clip = {
		point: point,
		lineStart: lineStart,
		lineEnd: lineEnd,
		polygonStart: function() {
		clip.point = pointRing;
		clip.lineStart = ringStart;
		clip.lineEnd = ringEnd;
		segments = [];
		polygon = [];
		},
		polygonEnd: function() {
		clip.point = point;
		clip.lineStart = lineStart;
		clip.lineEnd = lineEnd;
		segments = d3Array.merge(segments);
		var startInside = polygonContains(polygon, rotatedStart);
		if (segments.length) {
			if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
			clipPolygon(segments, compareIntersection, startInside, interpolate, sink);
		} else if (startInside) {
			if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
			sink.lineStart();
			interpolate(null, null, 1, sink);
			sink.lineEnd();
		}
		if (polygonStarted) sink.polygonEnd(), polygonStarted = false;
		segments = polygon = null;
		},
		sphere: function() {
		sink.polygonStart();
		sink.lineStart();
		interpolate(null, null, 1, sink);
		sink.lineEnd();
		sink.polygonEnd();
		}
	};

	function point(lambda, phi) {
		var point = rotate(lambda, phi);
		if (pointVisible(lambda = point[0], phi = point[1])) sink.point(lambda, phi);
	}

	function pointLine(lambda, phi) {
		var point = rotate(lambda, phi);
		line.point(point[0], point[1]);
	}

	function lineStart() {
		clip.point = pointLine;
		line.lineStart();
	}

	function lineEnd() {
		clip.point = point;
		line.lineEnd();
	}

	function pointRing(lambda, phi) {
		ring.push([lambda, phi]);
		var point = rotate(lambda, phi);
		ringSink.point(point[0], point[1]);
	}

	function ringStart() {
		ringSink.lineStart();
		ring = [];
	}

	function ringEnd() {
		pointRing(ring[0][0], ring[0][1]);
		ringSink.lineEnd();

		var clean = ringSink.clean(),
			ringSegments = ringBuffer.result(),
			i, n = ringSegments.length, m,
			segment,
			point;

		ring.pop();
		polygon.push(ring);
		ring = null;

		if (!n) return;

		// No intersections.
		if (clean & 1) {
		segment = ringSegments[0];
		if ((m = segment.length - 1) > 0) {
			if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
			sink.lineStart();
			for (i = 0; i < m; ++i) sink.point((point = segment[i])[0], point[1]);
			sink.lineEnd();
		}
		return;
		}

		// Rejoin connected segments.
		// TODO reuse ringBuffer.rejoin()?
		if (n > 1 && clean & 2) ringSegments.push(ringSegments.pop().concat(ringSegments.shift()));

		segments.push(ringSegments.filter(validSegment));
	}

	return clip;
	};
}

function validSegment(segment) {
	return segment.length > 1;
}

// Intersections are sorted along the clip edge. For both antimeridian cutting
// and circle clipping, the same comparison is used.
function compareIntersection(a, b) {
	return ((a = a.x)[0] < 0 ? a[1] - halfPi - epsilon : halfPi - a[1])
		 - ((b = b.x)[0] < 0 ? b[1] - halfPi - epsilon : halfPi - b[1]);
}

var clipAntimeridian = clip(
	function() { return true; },
	clipAntimeridianLine,
	clipAntimeridianInterpolate,
	[-pi, -halfPi]
);

// Takes a line and cuts into visible segments. Return values: 0 - there were
// intersections or the line was empty; 1 - no intersections; 2 - there were
// intersections, and the first and last segments should be rejoined.
function clipAntimeridianLine(stream) {
	var lambda0 = NaN,
		phi0 = NaN,
		sign0 = NaN,
		clean; // no intersections

	return {
	lineStart: function() {
		stream.lineStart();
		clean = 1;
	},
	point: function(lambda1, phi1) {
		var sign1 = lambda1 > 0 ? pi : -pi,
			delta = abs(lambda1 - lambda0);
		if (abs(delta - pi) < epsilon) { // line crosses a pole
		stream.point(lambda0, phi0 = (phi0 + phi1) / 2 > 0 ? halfPi : -halfPi);
		stream.point(sign0, phi0);
		stream.lineEnd();
		stream.lineStart();
		stream.point(sign1, phi0);
		stream.point(lambda1, phi0);
		clean = 0;
		} else if (sign0 !== sign1 && delta >= pi) { // line crosses antimeridian
		if (abs(lambda0 - sign0) < epsilon) lambda0 -= sign0 * epsilon; // handle degeneracies
		if (abs(lambda1 - sign1) < epsilon) lambda1 -= sign1 * epsilon;
		phi0 = clipAntimeridianIntersect(lambda0, phi0, lambda1, phi1);
		stream.point(sign0, phi0);
		stream.lineEnd();
		stream.lineStart();
		stream.point(sign1, phi0);
		clean = 0;
		}
		stream.point(lambda0 = lambda1, phi0 = phi1);
		sign0 = sign1;
	},
	lineEnd: function() {
		stream.lineEnd();
		lambda0 = phi0 = NaN;
	},
	clean: function() {
		return 2 - clean; // if intersections, rejoin first and last segments
	}
	};
}

function clipAntimeridianIntersect(lambda0, phi0, lambda1, phi1) {
	var cosPhi0,
		cosPhi1,
		sinLambda0Lambda1 = sin(lambda0 - lambda1);
	return abs(sinLambda0Lambda1) > epsilon
		? atan((sin(phi0) * (cosPhi1 = cos(phi1)) * sin(lambda1)
			- sin(phi1) * (cosPhi0 = cos(phi0)) * sin(lambda0))
			/ (cosPhi0 * cosPhi1 * sinLambda0Lambda1))
		: (phi0 + phi1) / 2;
}

function clipAntimeridianInterpolate(from, to, direction, stream) {
	var phi;
	if (from == null) {
	phi = direction * halfPi;
	stream.point(-pi, phi);
	stream.point(0, phi);
	stream.point(pi, phi);
	stream.point(pi, 0);
	stream.point(pi, -phi);
	stream.point(0, -phi);
	stream.point(-pi, -phi);
	stream.point(-pi, 0);
	stream.point(-pi, phi);
	} else if (abs(from[0] - to[0]) > epsilon) {
	var lambda = from[0] < to[0] ? pi : -pi;
	phi = direction * lambda / 2;
	stream.point(-lambda, phi);
	stream.point(0, phi);
	stream.point(lambda, phi);
	} else {
	stream.point(to[0], to[1]);
	}
}

var clipCircle = function(radius, delta) {
	var cr = cos(radius),
		smallRadius = cr > 0,
		notHemisphere = abs(cr) > epsilon; // TODO optimise for this common case

	function interpolate(from, to, direction, stream) {
	circleStream(stream, radius, delta, direction, from, to);
	}

	function visible(lambda, phi) {
	return cos(lambda) * cos(phi) > cr;
	}

	// Takes a line and cuts into visible segments. Return values used for polygon
	// clipping: 0 - there were intersections or the line was empty; 1 - no
	// intersections 2 - there were intersections, and the first and last segments
	// should be rejoined.
	function clipLine(stream) {
	var point0, // previous point
		c0, // code for previous point
		v0, // visibility of previous point
		v00, // visibility of first point
		clean; // no intersections
	return {
		lineStart: function() {
		v00 = v0 = false;
		clean = 1;
		},
		point: function(lambda, phi) {
		var point1 = [lambda, phi],
			point2,
			v = visible(lambda, phi),
			c = smallRadius
				? v ? 0 : code(lambda, phi)
				: v ? code(lambda + (lambda < 0 ? pi : -pi), phi) : 0;
		if (!point0 && (v00 = v0 = v)) stream.lineStart();
		// Handle degeneracies.
		// TODO ignore if not clipping polygons.
		if (v !== v0) {
			point2 = intersect(point0, point1);
			if (pointEqual(point0, point2) || pointEqual(point1, point2)) {
			point1[0] += epsilon;
			point1[1] += epsilon;
			v = visible(point1[0], point1[1]);
			}
		}
		if (v !== v0) {
			clean = 0;
			if (v) {
			// outside going in
			stream.lineStart();
			point2 = intersect(point1, point0);
			stream.point(point2[0], point2[1]);
			} else {
			// inside going out
			point2 = intersect(point0, point1);
			stream.point(point2[0], point2[1]);
			stream.lineEnd();
			}
			point0 = point2;
		} else if (notHemisphere && point0 && smallRadius ^ v) {
			var t;
			// If the codes for two points are different, or are both zero,
			// and there this segment intersects with the small circle.
			if (!(c & c0) && (t = intersect(point1, point0, true))) {
			clean = 0;
			if (smallRadius) {
				stream.lineStart();
				stream.point(t[0][0], t[0][1]);
				stream.point(t[1][0], t[1][1]);
				stream.lineEnd();
			} else {
				stream.point(t[1][0], t[1][1]);
				stream.lineEnd();
				stream.lineStart();
				stream.point(t[0][0], t[0][1]);
			}
			}
		}
		if (v && (!point0 || !pointEqual(point0, point1))) {
			stream.point(point1[0], point1[1]);
		}
		point0 = point1, v0 = v, c0 = c;
		},
		lineEnd: function() {
		if (v0) stream.lineEnd();
		point0 = null;
		},
		// Rejoin first and last segments if there were intersections and the first
		// and last points were visible.
		clean: function() {
		return clean | ((v00 && v0) << 1);
		}
	};
	}

	// Intersects the great circle between a and b with the clip circle.
	function intersect(a, b, two) {
	var pa = cartesian(a),
		pb = cartesian(b);

	// We have two planes, n1.p = d1 and n2.p = d2.
	// Find intersection line p(t) = c1 n1 + c2 n2 + t (n1 猕� n2).
	var n1 = [1, 0, 0], // normal
		n2 = cartesianCross(pa, pb),
		n2n2 = cartesianDot(n2, n2),
		n1n2 = n2[0], // cartesianDot(n1, n2),
		determinant = n2n2 - n1n2 * n1n2;

	// Two polar points.
	if (!determinant) return !two && a;

	var c1 =	cr * n2n2 / determinant,
		c2 = -cr * n1n2 / determinant,
		n1xn2 = cartesianCross(n1, n2),
		A = cartesianScale(n1, c1),
		B = cartesianScale(n2, c2);
	cartesianAddInPlace(A, B);

	// Solve |p(t)|^2 = 1.
	var u = n1xn2,
		w = cartesianDot(A, u),
		uu = cartesianDot(u, u),
		t2 = w * w - uu * (cartesianDot(A, A) - 1);

	if (t2 < 0) return;

	var t = sqrt(t2),
		q = cartesianScale(u, (-w - t) / uu);
	cartesianAddInPlace(q, A);
	q = spherical(q);

	if (!two) return q;

	// Two intersection points.
	var lambda0 = a[0],
		lambda1 = b[0],
		phi0 = a[1],
		phi1 = b[1],
		z;

	if (lambda1 < lambda0) z = lambda0, lambda0 = lambda1, lambda1 = z;

	var delta = lambda1 - lambda0,
		polar = abs(delta - pi) < epsilon,
		meridian = polar || delta < epsilon;

	if (!polar && phi1 < phi0) z = phi0, phi0 = phi1, phi1 = z;

	// Check that the first point is between a and b.
	if (meridian
		? polar
			? phi0 + phi1 > 0 ^ q[1] < (abs(q[0] - lambda0) < epsilon ? phi0 : phi1)
			: phi0 <= q[1] && q[1] <= phi1
		: delta > pi ^ (lambda0 <= q[0] && q[0] <= lambda1)) {
		var q1 = cartesianScale(u, (-w + t) / uu);
		cartesianAddInPlace(q1, A);
		return [q, spherical(q1)];
	}
	}

	// Generates a 4-bit vector representing the location of a point relative to
	// the small circle's bounding box.
	function code(lambda, phi) {
	var r = smallRadius ? radius : pi - radius,
		code = 0;
	if (lambda < -r) code |= 1; // left
	else if (lambda > r) code |= 2; // right
	if (phi < -r) code |= 4; // below
	else if (phi > r) code |= 8; // above
	return code;
	}

	return clip(visible, clipLine, interpolate, smallRadius ? [0, -radius] : [-pi, radius - pi]);
}

var transform = function(prototype) {
	return {
	stream: transform$1(prototype)
	};
}

function transform$1(prototype) {
	function T() {}
	var p = T.prototype = Object.create(Transform.prototype);
	for (var k in prototype) p[k] = prototype[k];
	return function(stream) {
	var t = new T;
	t.stream = stream;
	return t;
	};
}

function Transform() {}

Transform.prototype = {
	point: function(x, y) { this.stream.point(x, y); },
	sphere: function() { this.stream.sphere(); },
	lineStart: function() { this.stream.lineStart(); },
	lineEnd: function() { this.stream.lineEnd(); },
	polygonStart: function() { this.stream.polygonStart(); },
	polygonEnd: function() { this.stream.polygonEnd(); }
};

function fit(project, extent, object) {
	var w = extent[1][0] - extent[0][0],
		h = extent[1][1] - extent[0][1],
		clip = project.clipExtent && project.clipExtent();

	project
		.scale(150)
		.translate([0, 0]);

	if (clip != null) project.clipExtent(null);

	geoStream(object, project.stream(boundsStream$1));

	var b = boundsStream$1.result(),
		k = Math.min(w / (b[1][0] - b[0][0]), h / (b[1][1] - b[0][1])),
		x = +extent[0][0] + (w - k * (b[1][0] + b[0][0])) / 2,
		y = +extent[0][1] + (h - k * (b[1][1] + b[0][1])) / 2;

	if (clip != null) project.clipExtent(clip);

	return project
		.scale(k * 150)
		.translate([x, y]);
}

function fitSize(project) {
	return function(size, object) {
	return fit(project, [[0, 0], size], object);
	};
}

function fitExtent(project) {
	return function(extent, object) {
	return fit(project, extent, object);
	};
}

var maxDepth = 16;
var cosMinDistance = cos(30 * radians); // cos(minimum angular distance)

var resample = function(project, delta2) {
	return +delta2 ? resample$1(project, delta2) : resampleNone(project);
}

function resampleNone(project) {
	return transform$1({
	point: function(x, y) {
		x = project(x, y);
		this.stream.point(x[0], x[1]);
	}
	});
}

function resample$1(project, delta2) {

	function resampleLineTo(x0, y0, lambda0, a0, b0, c0, x1, y1, lambda1, a1, b1, c1, depth, stream) {
	var dx = x1 - x0,
		dy = y1 - y0,
		d2 = dx * dx + dy * dy;
	if (d2 > 4 * delta2 && depth--) {
		var a = a0 + a1,
			b = b0 + b1,
			c = c0 + c1,
			m = sqrt(a * a + b * b + c * c),
			phi2 = asin(c /= m),
			lambda2 = abs(abs(c) - 1) < epsilon || abs(lambda0 - lambda1) < epsilon ? (lambda0 + lambda1) / 2 : atan2(b, a),
			p = project(lambda2, phi2),
			x2 = p[0],
			y2 = p[1],
			dx2 = x2 - x0,
			dy2 = y2 - y0,
			dz = dy * dx2 - dx * dy2;
		if (dz * dz / d2 > delta2 // perpendicular projected distance
			|| abs((dx * dx2 + dy * dy2) / d2 - 0.5) > 0.3 // midpoint close to an end
			|| a0 * a1 + b0 * b1 + c0 * c1 < cosMinDistance) { // angular distance
		resampleLineTo(x0, y0, lambda0, a0, b0, c0, x2, y2, lambda2, a /= m, b /= m, c, depth, stream);
		stream.point(x2, y2);
		resampleLineTo(x2, y2, lambda2, a, b, c, x1, y1, lambda1, a1, b1, c1, depth, stream);
		}
	}
	}
	return function(stream) {
	var lambda00, x00, y00, a00, b00, c00, // first point
		lambda0, x0, y0, a0, b0, c0; // previous point

	var resampleStream = {
		point: point,
		lineStart: lineStart,
		lineEnd: lineEnd,
		polygonStart: function() { stream.polygonStart(); resampleStream.lineStart = ringStart; },
		polygonEnd: function() { stream.polygonEnd(); resampleStream.lineStart = lineStart; }
	};

	function point(x, y) {
		x = project(x, y);
		stream.point(x[0], x[1]);
	}

	function lineStart() {
		x0 = NaN;
		resampleStream.point = linePoint;
		stream.lineStart();
	}

	function linePoint(lambda, phi) {
		var c = cartesian([lambda, phi]), p = project(lambda, phi);
		resampleLineTo(x0, y0, lambda0, a0, b0, c0, x0 = p[0], y0 = p[1], lambda0 = lambda, a0 = c[0], b0 = c[1], c0 = c[2], maxDepth, stream);
		stream.point(x0, y0);
	}

	function lineEnd() {
		resampleStream.point = point;
		stream.lineEnd();
	}

	function ringStart() {
		lineStart();
		resampleStream.point = ringPoint;
		resampleStream.lineEnd = ringEnd;
	}

	function ringPoint(lambda, phi) {
		linePoint(lambda00 = lambda, phi), x00 = x0, y00 = y0, a00 = a0, b00 = b0, c00 = c0;
		resampleStream.point = linePoint;
	}

	function ringEnd() {
		resampleLineTo(x0, y0, lambda0, a0, b0, c0, x00, y00, lambda00, a00, b00, c00, maxDepth, stream);
		resampleStream.lineEnd = lineEnd;
		lineEnd();
	}

	return resampleStream;
	};
}

var transformRadians = transform$1({
	point: function(x, y) {
	this.stream.point(x * radians, y * radians);
	}
});

function projection(project) {
	return projectionMutator(function() { return project; })();
}

function projectionMutator(projectAt) {
	var project,
		k = 150, // scale
		x = 480, y = 250, // translate
		dx, dy, lambda = 0, phi = 0, // center
		deltaLambda = 0, deltaPhi = 0, deltaGamma = 0, rotate, projectRotate, // rotate
		theta = null, preclip = clipAntimeridian, // clip angle
		x0 = null, y0, x1, y1, postclip = identity, // clip extent
		delta2 = 0.5, projectResample = resample(projectTransform, delta2), // precision
		cache,
		cacheStream;

	function projection(point) {
	point = projectRotate(point[0] * radians, point[1] * radians);
	return [point[0] * k + dx, dy - point[1] * k];
	}

	function invert(point) {
	point = projectRotate.invert((point[0] - dx) / k, (dy - point[1]) / k);
	return point && [point[0] * degrees, point[1] * degrees];
	}

	function projectTransform(x, y) {
	return x = project(x, y), [x[0] * k + dx, dy - x[1] * k];
	}

	projection.stream = function(stream) {
	return cache && cacheStream === stream ? cache : cache = transformRadians(preclip(rotate, projectResample(postclip(cacheStream = stream))));
	};

	projection.clipAngle = function(_) {
	return arguments.length ? (preclip = +_ ? clipCircle(theta = _ * radians, 6 * radians) : (theta = null, clipAntimeridian), reset()) : theta * degrees;
	};

	projection.clipExtent = function(_) {
	return arguments.length ? (postclip = _ == null ? (x0 = y0 = x1 = y1 = null, identity) : clipExtent(x0 = +_[0][0], y0 = +_[0][1], x1 = +_[1][0], y1 = +_[1][1]), reset()) : x0 == null ? null : [[x0, y0], [x1, y1]];
	};

	projection.scale = function(_) {
	return arguments.length ? (k = +_, recenter()) : k;
	};

	projection.translate = function(_) {
	return arguments.length ? (x = +_[0], y = +_[1], recenter()) : [x, y];
	};

	projection.center = function(_) {
	return arguments.length ? (lambda = _[0] % 360 * radians, phi = _[1] % 360 * radians, recenter()) : [lambda * degrees, phi * degrees];
	};

	projection.rotate = function(_) {
	return arguments.length ? (deltaLambda = _[0] % 360 * radians, deltaPhi = _[1] % 360 * radians, deltaGamma = _.length > 2 ? _[2] % 360 * radians : 0, recenter()) : [deltaLambda * degrees, deltaPhi * degrees, deltaGamma * degrees];
	};

	projection.precision = function(_) {
	return arguments.length ? (projectResample = resample(projectTransform, delta2 = _ * _), reset()) : sqrt(delta2);
	};

	projection.fitExtent = fitExtent(projection);

	projection.fitSize = fitSize(projection);

	function recenter() {
	projectRotate = compose(rotate = rotateRadians(deltaLambda, deltaPhi, deltaGamma), project);
	var center = project(lambda, phi);
	dx = x - center[0] * k;
	dy = y + center[1] * k;
	return reset();
	}

	function reset() {
	cache = cacheStream = null;
	return projection;
	}

	return function() {
	project = projectAt.apply(this, arguments);
	projection.invert = project.invert && invert;
	return recenter();
	};
}

function conicProjection(projectAt) {
	var phi0 = 0,
		phi1 = pi / 3,
		m = projectionMutator(projectAt),
		p = m(phi0, phi1);

	p.parallels = function(_) {
	return arguments.length ? m(phi0 = _[0] * radians, phi1 = _[1] * radians) : [phi0 * degrees, phi1 * degrees];
	};

	return p;
}

function conicEqualAreaRaw(y0, y1) {
	var sy0 = sin(y0),
		n = (sy0 + sin(y1)) / 2,
		c = 1 + sy0 * (2 * n - sy0),
		r0 = sqrt(c) / n;

	function project(x, y) {
	var r = sqrt(c - 2 * n * sin(y)) / n;
	return [r * sin(x *= n), r0 - r * cos(x)];
	}

	project.invert = function(x, y) {
	var r0y = r0 - y;
	return [atan2(x, r0y) / n, asin((c - (x * x + r0y * r0y) * n * n) / (2 * n))];
	};

	return project;
}

var conicEqualArea = function() {
	return conicProjection(conicEqualAreaRaw)
		.scale(155.424)
		.center([0, 33.6442]);
}

var albers = function() {
	return conicEqualArea()
		.parallels([29.5, 45.5])
		.scale(1070)
		.translate([480, 250])
		.rotate([96, 0])
		.center([-0.6, 38.7]);
}

// The projections must have mutually exclusive clip regions on the sphere,
// as this will avoid emitting interleaving lines and polygons.
function multiplex(streams) {
	var n = streams.length;
	return {
	point: function(x, y) { var i = -1; while (++i < n) streams[i].point(x, y); },
	sphere: function() { var i = -1; while (++i < n) streams[i].sphere(); },
	lineStart: function() { var i = -1; while (++i < n) streams[i].lineStart(); },
	lineEnd: function() { var i = -1; while (++i < n) streams[i].lineEnd(); },
	polygonStart: function() { var i = -1; while (++i < n) streams[i].polygonStart(); },
	polygonEnd: function() { var i = -1; while (++i < n) streams[i].polygonEnd(); }
	};
}

// A composite projection for the United States, configured by default for
// 960脳500. The projection also works quite well at 960脳600 if you change the
// scale to 1285 and adjust the translate accordingly. The set of standard
// parallels for each region comes from USGS, which is published here:
// http://egsc.usgs.gov/isb/pubs/MapProjections/projections.html#albers
var albersUsa = function() {
	var cache,
		cacheStream,
		lower48 = albers(), lower48Point,
		alaska = conicEqualArea().rotate([154, 0]).center([-2, 58.5]).parallels([55, 65]), alaskaPoint, // EPSG:3338
		hawaii = conicEqualArea().rotate([157, 0]).center([-3, 19.9]).parallels([8, 18]), hawaiiPoint, // ESRI:102007
		point, pointStream = {point: function(x, y) { point = [x, y]; }};

	function albersUsa(coordinates) {
	var x = coordinates[0], y = coordinates[1];
	return point = null,
		(lower48Point.point(x, y), point)
		|| (alaskaPoint.point(x, y), point)
		|| (hawaiiPoint.point(x, y), point);
	}

	albersUsa.invert = function(coordinates) {
	var k = lower48.scale(),
		t = lower48.translate(),
		x = (coordinates[0] - t[0]) / k,
		y = (coordinates[1] - t[1]) / k;
	return (y >= 0.120 && y < 0.234 && x >= -0.425 && x < -0.214 ? alaska
		: y >= 0.166 && y < 0.234 && x >= -0.214 && x < -0.115 ? hawaii
		: lower48).invert(coordinates);
	};

	albersUsa.stream = function(stream) {
	return cache && cacheStream === stream ? cache : cache = multiplex([lower48.stream(cacheStream = stream), alaska.stream(stream), hawaii.stream(stream)]);
	};

	albersUsa.precision = function(_) {
	if (!arguments.length) return lower48.precision();
	lower48.precision(_), alaska.precision(_), hawaii.precision(_);
	return reset();
	};

	albersUsa.scale = function(_) {
	if (!arguments.length) return lower48.scale();
	lower48.scale(_), alaska.scale(_ * 0.35), hawaii.scale(_);
	return albersUsa.translate(lower48.translate());
	};

	albersUsa.translate = function(_) {
	if (!arguments.length) return lower48.translate();
	var k = lower48.scale(), x = +_[0], y = +_[1];

	lower48Point = lower48
		.translate(_)
		.clipExtent([[x - 0.455 * k, y - 0.238 * k], [x + 0.455 * k, y + 0.238 * k]])
		.stream(pointStream);

	alaskaPoint = alaska
		.translate([x - 0.307 * k, y + 0.201 * k])
		.clipExtent([[x - 0.425 * k + epsilon, y + 0.120 * k + epsilon], [x - 0.214 * k - epsilon, y + 0.234 * k - epsilon]])
		.stream(pointStream);

	hawaiiPoint = hawaii
		.translate([x - 0.205 * k, y + 0.212 * k])
		.clipExtent([[x - 0.214 * k + epsilon, y + 0.166 * k + epsilon], [x - 0.115 * k - epsilon, y + 0.234 * k - epsilon]])
		.stream(pointStream);

	return reset();
	};

	albersUsa.fitExtent = fitExtent(albersUsa);

	albersUsa.fitSize = fitSize(albersUsa);

	function reset() {
	cache = cacheStream = null;
	return albersUsa;
	}

	return albersUsa.scale(1070);
}

function azimuthalRaw(scale) {
	return function(x, y) {
	var cx = cos(x),
		cy = cos(y),
		k = scale(cx * cy);
	return [
		k * cy * sin(x),
		k * sin(y)
	];
	}
}

function azimuthalInvert(angle) {
	return function(x, y) {
	var z = sqrt(x * x + y * y),
		c = angle(z),
		sc = sin(c),
		cc = cos(c);
	return [
		atan2(x * sc, z * cc),
		asin(z && y * sc / z)
	];
	}
}

var azimuthalEqualAreaRaw = azimuthalRaw(function(cxcy) {
	return sqrt(2 / (1 + cxcy));
});

azimuthalEqualAreaRaw.invert = azimuthalInvert(function(z) {
	return 2 * asin(z / 2);
});

var azimuthalEqualArea = function() {
	return projection(azimuthalEqualAreaRaw)
		.scale(124.75)
		.clipAngle(180 - 1e-3);
}

var azimuthalEquidistantRaw = azimuthalRaw(function(c) {
	return (c = acos(c)) && c / sin(c);
});

azimuthalEquidistantRaw.invert = azimuthalInvert(function(z) {
	return z;
});

var azimuthalEquidistant = function() {
	return projection(azimuthalEquidistantRaw)
		.scale(79.4188)
		.clipAngle(180 - 1e-3);
}

function mercatorRaw(lambda, phi) {
	return [lambda, log(tan((halfPi + phi) / 2))];
}

mercatorRaw.invert = function(x, y) {
	return [x, 2 * atan(exp(y)) - halfPi];
};

var mercator = function() {
	return mercatorProjection(mercatorRaw)
		.scale(961 / tau);
}

function mercatorProjection(project) {
	var m = projection(project),
		scale = m.scale,
		translate = m.translate,
		clipExtent = m.clipExtent,
		clipAuto;

	m.scale = function(_) {
	return arguments.length ? (scale(_), clipAuto && m.clipExtent(null), m) : scale();
	};

	m.translate = function(_) {
	return arguments.length ? (translate(_), clipAuto && m.clipExtent(null), m) : translate();
	};

	m.clipExtent = function(_) {
	if (!arguments.length) return clipAuto ? null : clipExtent();
	if (clipAuto = _ == null) {
		var k = pi * scale(),
			t = translate();
		_ = [[t[0] - k, t[1] - k], [t[0] + k, t[1] + k]];
	}
	clipExtent(_);
	return m;
	};

	return m.clipExtent(null);
}

function tany(y) {
	return tan((halfPi + y) / 2);
}

function conicConformalRaw(y0, y1) {
	var cy0 = cos(y0),
		n = y0 === y1 ? sin(y0) : log(cy0 / cos(y1)) / log(tany(y1) / tany(y0)),
		f = cy0 * pow(tany(y0), n) / n;

	if (!n) return mercatorRaw;

	function project(x, y) {
	if (f > 0) { if (y < -halfPi + epsilon) y = -halfPi + epsilon; }
	else { if (y > halfPi - epsilon) y = halfPi - epsilon; }
	var r = f / pow(tany(y), n);
	return [r * sin(n * x), f - r * cos(n * x)];
	}

	project.invert = function(x, y) {
	var fy = f - y, r = sign(n) * sqrt(x * x + fy * fy);
	return [atan2(x, fy) / n, 2 * atan(pow(f / r, 1 / n)) - halfPi];
	};

	return project;
}

var conicConformal = function() {
	return conicProjection(conicConformalRaw)
		.scale(109.5)
		.parallels([30, 30]);
}

function equirectangularRaw(lambda, phi) {
	return [lambda, phi];
}

equirectangularRaw.invert = equirectangularRaw;

var equirectangular = function() {
	return projection(equirectangularRaw)
		.scale(152.63);
}

function conicEquidistantRaw(y0, y1) {
	var cy0 = cos(y0),
		n = y0 === y1 ? sin(y0) : (cy0 - cos(y1)) / (y1 - y0),
		g = cy0 / n + y0;

	if (abs(n) < epsilon) return equirectangularRaw;

	function project(x, y) {
	var gy = g - y, nx = n * x;
	return [gy * sin(nx), g - gy * cos(nx)];
	}

	project.invert = function(x, y) {
	var gy = g - y;
	return [atan2(x, gy) / n, g - sign(n) * sqrt(x * x + gy * gy)];
	};

	return project;
}

var conicEquidistant = function() {
	return conicProjection(conicEquidistantRaw)
		.scale(131.154)
		.center([0, 13.9389]);
}

function gnomonicRaw(x, y) {
	var cy = cos(y), k = cos(x) * cy;
	return [cy * sin(x) / k, sin(y) / k];
}

gnomonicRaw.invert = azimuthalInvert(atan);

var gnomonic = function() {
	return projection(gnomonicRaw)
		.scale(144.049)
		.clipAngle(60);
}

function orthographicRaw(x, y) {
	return [cos(y) * sin(x), sin(y)];
}

orthographicRaw.invert = azimuthalInvert(asin);

var orthographic = function() {
	return projection(orthographicRaw)
		.scale(249.5)
		.clipAngle(90 + epsilon);
}

function stereographicRaw(x, y) {
	var cy = cos(y), k = 1 + cos(x) * cy;
	return [cy * sin(x) / k, sin(y) / k];
}

stereographicRaw.invert = azimuthalInvert(function(z) {
	return 2 * atan(z);
});

var stereographic = function() {
	return projection(stereographicRaw)
		.scale(250)
		.clipAngle(142);
}

function transverseMercatorRaw(lambda, phi) {
	return [log(tan((halfPi + phi) / 2)), -lambda];
}

transverseMercatorRaw.invert = function(x, y) {
	return [-y, 2 * atan(exp(x)) - halfPi];
};

var transverseMercator = function() {
	var m = mercatorProjection(transverseMercatorRaw),
		center = m.center,
		rotate = m.rotate;

	m.center = function(_) {
	return arguments.length ? center([-_[1], _[0]]) : (_ = center(), [_[1], -_[0]]);
	};

	m.rotate = function(_) {
	return arguments.length ? rotate([_[0], _[1], _.length > 2 ? _[2] + 90 : 90]) : (_ = rotate(), [_[0], _[1], _[2] - 90]);
	};

	return rotate([0, 0, 90])
		.scale(159.155);
}

exports.geoArea = area;
exports.geoBounds = bounds;
exports.geoCentroid = centroid;
exports.geoCircle = circle;
exports.geoClipExtent = extent;
exports.geoDistance = distance;
exports.geoGraticule = graticule;
exports.geoInterpolate = interpolate;
exports.geoLength = length;
exports.geoPath = index;
exports.geoAlbers = albers;
exports.geoAlbersUsa = albersUsa;
exports.geoAzimuthalEqualArea = azimuthalEqualArea;
exports.geoAzimuthalEqualAreaRaw = azimuthalEqualAreaRaw;
exports.geoAzimuthalEquidistant = azimuthalEquidistant;
exports.geoAzimuthalEquidistantRaw = azimuthalEquidistantRaw;
exports.geoConicConformal = conicConformal;
exports.geoConicConformalRaw = conicConformalRaw;
exports.geoConicEqualArea = conicEqualArea;
exports.geoConicEqualAreaRaw = conicEqualAreaRaw;
exports.geoConicEquidistant = conicEquidistant;
exports.geoConicEquidistantRaw = conicEquidistantRaw;
exports.geoEquirectangular = equirectangular;
exports.geoEquirectangularRaw = equirectangularRaw;
exports.geoGnomonic = gnomonic;
exports.geoGnomonicRaw = gnomonicRaw;
exports.geoProjection = projection;
exports.geoProjectionMutator = projectionMutator;
exports.geoMercator = mercator;
exports.geoMercatorRaw = mercatorRaw;
exports.geoOrthographic = orthographic;
exports.geoOrthographicRaw = orthographicRaw;
exports.geoStereographic = stereographic;
exports.geoStereographicRaw = stereographicRaw;
exports.geoTransverseMercator = transverseMercator;
exports.geoTransverseMercatorRaw = transverseMercatorRaw;
exports.geoRotation = rotation;
exports.geoStream = geoStream;
exports.geoTransform = transform;

Object.defineProperty(exports, '__esModule', { value: true });

})));

},{"d3-array":2}],11:[function(require,module,exports){
// https://d3js.org/d3-interpolate/ Version 1.1.1. Copyright 2016 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-color')) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3-color'], factory) :
	(factory((global.d3 = global.d3 || {}),global.d3));
}(this, function (exports,d3Color) { 'use strict';

	function basis(t1, v0, v1, v2, v3) {
	var t2 = t1 * t1, t3 = t2 * t1;
	return ((1 - 3 * t1 + 3 * t2 - t3) * v0
		+ (4 - 6 * t2 + 3 * t3) * v1
		+ (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2
		+ t3 * v3) / 6;
	}

	function basis$1(values) {
	var n = values.length - 1;
	return function(t) {
		var i = t <= 0 ? (t = 0) : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n),
			v1 = values[i],
			v2 = values[i + 1],
			v0 = i > 0 ? values[i - 1] : 2 * v1 - v2,
			v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
		return basis((t - i / n) * n, v0, v1, v2, v3);
	};
	}

	function basisClosed(values) {
	var n = values.length;
	return function(t) {
		var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n),
			v0 = values[(i + n - 1) % n],
			v1 = values[i % n],
			v2 = values[(i + 1) % n],
			v3 = values[(i + 2) % n];
		return basis((t - i / n) * n, v0, v1, v2, v3);
	};
	}

	function constant(x) {
	return function() {
		return x;
	};
	}

	function linear(a, d) {
	return function(t) {
		return a + t * d;
	};
	}

	function exponential(a, b, y) {
	return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
		return Math.pow(a + t * b, y);
	};
	}

	function hue(a, b) {
	var d = b - a;
	return d ? linear(a, d > 180 || d < -180 ? d - 360 * Math.round(d / 360) : d) : constant(isNaN(a) ? b : a);
	}

	function gamma(y) {
	return (y = +y) === 1 ? nogamma : function(a, b) {
		return b - a ? exponential(a, b, y) : constant(isNaN(a) ? b : a);
	};
	}

	function nogamma(a, b) {
	var d = b - a;
	return d ? linear(a, d) : constant(isNaN(a) ? b : a);
	}

	var rgb$1 = (function rgbGamma(y) {
	var color = gamma(y);

	function rgb(start, end) {
		var r = color((start = d3Color.rgb(start)).r, (end = d3Color.rgb(end)).r),
			g = color(start.g, end.g),
			b = color(start.b, end.b),
			opacity = color(start.opacity, end.opacity);
		return function(t) {
		start.r = r(t);
		start.g = g(t);
		start.b = b(t);
		start.opacity = opacity(t);
		return start + "";
		};
	}

	rgb.gamma = rgbGamma;

	return rgb;
	})(1);

	function rgbSpline(spline) {
	return function(colors) {
		var n = colors.length,
			r = new Array(n),
			g = new Array(n),
			b = new Array(n),
			i, color;
		for (i = 0; i < n; ++i) {
		color = d3Color.rgb(colors[i]);
		r[i] = color.r || 0;
		g[i] = color.g || 0;
		b[i] = color.b || 0;
		}
		r = spline(r);
		g = spline(g);
		b = spline(b);
		color.opacity = 1;
		return function(t) {
		color.r = r(t);
		color.g = g(t);
		color.b = b(t);
		return color + "";
		};
	};
	}

	var rgbBasis = rgbSpline(basis$1);
	var rgbBasisClosed = rgbSpline(basisClosed);

	function array(a, b) {
	var nb = b ? b.length : 0,
		na = a ? Math.min(nb, a.length) : 0,
		x = new Array(nb),
		c = new Array(nb),
		i;

	for (i = 0; i < na; ++i) x[i] = value(a[i], b[i]);
	for (; i < nb; ++i) c[i] = b[i];

	return function(t) {
		for (i = 0; i < na; ++i) c[i] = x[i](t);
		return c;
	};
	}

	function date(a, b) {
	var d = new Date;
	return a = +a, b -= a, function(t) {
		return d.setTime(a + b * t), d;
	};
	}

	function number(a, b) {
	return a = +a, b -= a, function(t) {
		return a + b * t;
	};
	}

	function object(a, b) {
	var i = {},
		c = {},
		k;

	if (a === null || typeof a !== "object") a = {};
	if (b === null || typeof b !== "object") b = {};

	for (k in b) {
		if (k in a) {
		i[k] = value(a[k], b[k]);
		} else {
		c[k] = b[k];
		}
	}

	return function(t) {
		for (k in i) c[k] = i[k](t);
		return c;
	};
	}

	var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
	var reB = new RegExp(reA.source, "g");
	function zero(b) {
	return function() {
		return b;
	};
	}

	function one(b) {
	return function(t) {
		return b(t) + "";
	};
	}

	function string(a, b) {
	var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
		am, // current match in a
		bm, // current match in b
		bs, // string preceding current number in b, if any
		i = -1, // index in s
		s = [], // string constants and placeholders
		q = []; // number interpolators

	// Coerce inputs to strings.
	a = a + "", b = b + "";

	// Interpolate pairs of numbers in a & b.
	while ((am = reA.exec(a))
		&& (bm = reB.exec(b))) {
		if ((bs = bm.index) > bi) { // a string precedes the next number in b
		bs = b.slice(bi, bs);
		if (s[i]) s[i] += bs; // coalesce with previous string
		else s[++i] = bs;
		}
		if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
		if (s[i]) s[i] += bm; // coalesce with previous string
		else s[++i] = bm;
		} else { // interpolate non-matching numbers
		s[++i] = null;
		q.push({i: i, x: number(am, bm)});
		}
		bi = reB.lastIndex;
	}

	// Add remains of b.
	if (bi < b.length) {
		bs = b.slice(bi);
		if (s[i]) s[i] += bs; // coalesce with previous string
		else s[++i] = bs;
	}

	// Special optimization for only a single match.
	// Otherwise, interpolate each of the numbers and rejoin the string.
	return s.length < 2 ? (q[0]
		? one(q[0].x)
		: zero(b))
		: (b = q.length, function(t) {
			for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
			return s.join("");
			});
	}

	function value(a, b) {
	var t = typeof b, c;
	return b == null || t === "boolean" ? constant(b)
		: (t === "number" ? number
		: t === "string" ? ((c = d3Color.color(b)) ? (b = c, rgb$1) : string)
		: b instanceof d3Color.color ? rgb$1
		: b instanceof Date ? date
		: Array.isArray(b) ? array
		: isNaN(b) ? object
		: number)(a, b);
	}

	function round(a, b) {
	return a = +a, b -= a, function(t) {
		return Math.round(a + b * t);
	};
	}

	var degrees = 180 / Math.PI;

	var identity = {
	translateX: 0,
	translateY: 0,
	rotate: 0,
	skewX: 0,
	scaleX: 1,
	scaleY: 1
	};

	function decompose(a, b, c, d, e, f) {
	var scaleX, scaleY, skewX;
	if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
	if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
	if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
	if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
	return {
		translateX: e,
		translateY: f,
		rotate: Math.atan2(b, a) * degrees,
		skewX: Math.atan(skewX) * degrees,
		scaleX: scaleX,
		scaleY: scaleY
	};
	}

	var cssNode;
	var cssRoot;
	var cssView;
	var svgNode;
	function parseCss(value) {
	if (value === "none") return identity;
	if (!cssNode) cssNode = document.createElement("DIV"), cssRoot = document.documentElement, cssView = document.defaultView;
	cssNode.style.transform = value;
	value = cssView.getComputedStyle(cssRoot.appendChild(cssNode), null).getPropertyValue("transform");
	cssRoot.removeChild(cssNode);
	value = value.slice(7, -1).split(",");
	return decompose(+value[0], +value[1], +value[2], +value[3], +value[4], +value[5]);
	}

	function parseSvg(value) {
	if (value == null) return identity;
	if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
	svgNode.setAttribute("transform", value);
	if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
	value = value.matrix;
	return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
	}

	function interpolateTransform(parse, pxComma, pxParen, degParen) {

	function pop(s) {
		return s.length ? s.pop() + " " : "";
	}

	function translate(xa, ya, xb, yb, s, q) {
		if (xa !== xb || ya !== yb) {
		var i = s.push("translate(", null, pxComma, null, pxParen);
		q.push({i: i - 4, x: number(xa, xb)}, {i: i - 2, x: number(ya, yb)});
		} else if (xb || yb) {
		s.push("translate(" + xb + pxComma + yb + pxParen);
		}
	}

	function rotate(a, b, s, q) {
		if (a !== b) {
		if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
		q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: number(a, b)});
		} else if (b) {
		s.push(pop(s) + "rotate(" + b + degParen);
		}
	}

	function skewX(a, b, s, q) {
		if (a !== b) {
		q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: number(a, b)});
		} else if (b) {
		s.push(pop(s) + "skewX(" + b + degParen);
		}
	}

	function scale(xa, ya, xb, yb, s, q) {
		if (xa !== xb || ya !== yb) {
		var i = s.push(pop(s) + "scale(", null, ",", null, ")");
		q.push({i: i - 4, x: number(xa, xb)}, {i: i - 2, x: number(ya, yb)});
		} else if (xb !== 1 || yb !== 1) {
		s.push(pop(s) + "scale(" + xb + "," + yb + ")");
		}
	}

	return function(a, b) {
		var s = [], // string constants and placeholders
			q = []; // number interpolators
		a = parse(a), b = parse(b);
		translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
		rotate(a.rotate, b.rotate, s, q);
		skewX(a.skewX, b.skewX, s, q);
		scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
		a = b = null; // gc
		return function(t) {
		var i = -1, n = q.length, o;
		while (++i < n) s[(o = q[i]).i] = o.x(t);
		return s.join("");
		};
	};
	}

	var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
	var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

	var rho = Math.SQRT2;
	var rho2 = 2;
	var rho4 = 4;
	var epsilon2 = 1e-12;
	function cosh(x) {
	return ((x = Math.exp(x)) + 1 / x) / 2;
	}

	function sinh(x) {
	return ((x = Math.exp(x)) - 1 / x) / 2;
	}

	function tanh(x) {
	return ((x = Math.exp(2 * x)) - 1) / (x + 1);
	}

	// p0 = [ux0, uy0, w0]
	// p1 = [ux1, uy1, w1]
	function zoom(p0, p1) {
	var ux0 = p0[0], uy0 = p0[1], w0 = p0[2],
		ux1 = p1[0], uy1 = p1[1], w1 = p1[2],
		dx = ux1 - ux0,
		dy = uy1 - uy0,
		d2 = dx * dx + dy * dy,
		i,
		S;

	// Special case for u0 鈮� u1.
	if (d2 < epsilon2) {
		S = Math.log(w1 / w0) / rho;
		i = function(t) {
		return [
			ux0 + t * dx,
			uy0 + t * dy,
			w0 * Math.exp(rho * t * S)
		];
		}
	}

	// General case.
	else {
		var d1 = Math.sqrt(d2),
			b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1),
			b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1),
			r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0),
			r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
		S = (r1 - r0) / rho;
		i = function(t) {
		var s = t * S,
			coshr0 = cosh(r0),
			u = w0 / (rho2 * d1) * (coshr0 * tanh(rho * s + r0) - sinh(r0));
		return [
			ux0 + u * dx,
			uy0 + u * dy,
			w0 * coshr0 / cosh(rho * s + r0)
		];
		}
	}

	i.duration = S * 1000;

	return i;
	}

	function hsl$1(hue) {
	return function(start, end) {
		var h = hue((start = d3Color.hsl(start)).h, (end = d3Color.hsl(end)).h),
			s = nogamma(start.s, end.s),
			l = nogamma(start.l, end.l),
			opacity = nogamma(start.opacity, end.opacity);
		return function(t) {
		start.h = h(t);
		start.s = s(t);
		start.l = l(t);
		start.opacity = opacity(t);
		return start + "";
		};
	}
	}

	var hsl$2 = hsl$1(hue);
	var hslLong = hsl$1(nogamma);

	function lab$1(start, end) {
	var l = nogamma((start = d3Color.lab(start)).l, (end = d3Color.lab(end)).l),
		a = nogamma(start.a, end.a),
		b = nogamma(start.b, end.b),
		opacity = nogamma(start.opacity, end.opacity);
	return function(t) {
		start.l = l(t);
		start.a = a(t);
		start.b = b(t);
		start.opacity = opacity(t);
		return start + "";
	};
	}

	function hcl$1(hue) {
	return function(start, end) {
		var h = hue((start = d3Color.hcl(start)).h, (end = d3Color.hcl(end)).h),
			c = nogamma(start.c, end.c),
			l = nogamma(start.l, end.l),
			opacity = nogamma(start.opacity, end.opacity);
		return function(t) {
		start.h = h(t);
		start.c = c(t);
		start.l = l(t);
		start.opacity = opacity(t);
		return start + "";
		};
	}
	}

	var hcl$2 = hcl$1(hue);
	var hclLong = hcl$1(nogamma);

	function cubehelix$1(hue) {
	return (function cubehelixGamma(y) {
		y = +y;

		function cubehelix(start, end) {
		var h = hue((start = d3Color.cubehelix(start)).h, (end = d3Color.cubehelix(end)).h),
			s = nogamma(start.s, end.s),
			l = nogamma(start.l, end.l),
			opacity = nogamma(start.opacity, end.opacity);
		return function(t) {
			start.h = h(t);
			start.s = s(t);
			start.l = l(Math.pow(t, y));
			start.opacity = opacity(t);
			return start + "";
		};
		}

		cubehelix.gamma = cubehelixGamma;

		return cubehelix;
	})(1);
	}

	var cubehelix$2 = cubehelix$1(hue);
	var cubehelixLong = cubehelix$1(nogamma);

	function quantize(interpolator, n) {
	var samples = new Array(n);
	for (var i = 0; i < n; ++i) samples[i] = interpolator(i / (n - 1));
	return samples;
	}

	exports.interpolate = value;
	exports.interpolateArray = array;
	exports.interpolateBasis = basis$1;
	exports.interpolateBasisClosed = basisClosed;
	exports.interpolateDate = date;
	exports.interpolateNumber = number;
	exports.interpolateObject = object;
	exports.interpolateRound = round;
	exports.interpolateString = string;
	exports.interpolateTransformCss = interpolateTransformCss;
	exports.interpolateTransformSvg = interpolateTransformSvg;
	exports.interpolateZoom = zoom;
	exports.interpolateRgb = rgb$1;
	exports.interpolateRgbBasis = rgbBasis;
	exports.interpolateRgbBasisClosed = rgbBasisClosed;
	exports.interpolateHsl = hsl$2;
	exports.interpolateHslLong = hslLong;
	exports.interpolateLab = lab$1;
	exports.interpolateHcl = hcl$2;
	exports.interpolateHclLong = hclLong;
	exports.interpolateCubehelix = cubehelix$2;
	exports.interpolateCubehelixLong = cubehelixLong;
	exports.quantize = quantize;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
},{"d3-color":4}],12:[function(require,module,exports){
// https://d3js.org/d3-path/ Version 1.0.2. Copyright 2016 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
}(this, (function (exports) { 'use strict';

var pi = Math.PI;
var tau = 2 * pi;
var epsilon = 1e-6;
var tauEpsilon = tau - epsilon;

function Path() {
	this._x0 = this._y0 = // start of current subpath
	this._x1 = this._y1 = null; // end of current subpath
	this._ = [];
}

function path() {
	return new Path;
}

Path.prototype = path.prototype = {
	constructor: Path,
	moveTo: function(x, y) {
	this._.push("M", this._x0 = this._x1 = +x, ",", this._y0 = this._y1 = +y);
	},
	closePath: function() {
	if (this._x1 !== null) {
		this._x1 = this._x0, this._y1 = this._y0;
		this._.push("Z");
	}
	},
	lineTo: function(x, y) {
	this._.push("L", this._x1 = +x, ",", this._y1 = +y);
	},
	quadraticCurveTo: function(x1, y1, x, y) {
	this._.push("Q", +x1, ",", +y1, ",", this._x1 = +x, ",", this._y1 = +y);
	},
	bezierCurveTo: function(x1, y1, x2, y2, x, y) {
	this._.push("C", +x1, ",", +y1, ",", +x2, ",", +y2, ",", this._x1 = +x, ",", this._y1 = +y);
	},
	arcTo: function(x1, y1, x2, y2, r) {
	x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
	var x0 = this._x1,
		y0 = this._y1,
		x21 = x2 - x1,
		y21 = y2 - y1,
		x01 = x0 - x1,
		y01 = y0 - y1,
		l01_2 = x01 * x01 + y01 * y01;

	// Is the radius negative? Error.
	if (r < 0) throw new Error("negative radius: " + r);

	// Is this path empty? Move to (x1,y1).
	if (this._x1 === null) {
		this._.push(
		"M", this._x1 = x1, ",", this._y1 = y1
		);
	}

	// Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
	else if (!(l01_2 > epsilon)) {}

	// Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
	// Equivalently, is (x1,y1) coincident with (x2,y2)?
	// Or, is the radius zero? Line to (x1,y1).
	else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
		this._.push(
		"L", this._x1 = x1, ",", this._y1 = y1
		);
	}

	// Otherwise, draw an arc!
	else {
		var x20 = x2 - x0,
			y20 = y2 - y0,
			l21_2 = x21 * x21 + y21 * y21,
			l20_2 = x20 * x20 + y20 * y20,
			l21 = Math.sqrt(l21_2),
			l01 = Math.sqrt(l01_2),
			l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
			t01 = l / l01,
			t21 = l / l21;

		// If the start tangent is not coincident with (x0,y0), line to.
		if (Math.abs(t01 - 1) > epsilon) {
		this._.push(
			"L", x1 + t01 * x01, ",", y1 + t01 * y01
		);
		}

		this._.push(
		"A", r, ",", r, ",0,0,", +(y01 * x20 > x01 * y20), ",", this._x1 = x1 + t21 * x21, ",", this._y1 = y1 + t21 * y21
		);
	}
	},
	arc: function(x, y, r, a0, a1, ccw) {
	x = +x, y = +y, r = +r;
	var dx = r * Math.cos(a0),
		dy = r * Math.sin(a0),
		x0 = x + dx,
		y0 = y + dy,
		cw = 1 ^ ccw,
		da = ccw ? a0 - a1 : a1 - a0;

	// Is the radius negative? Error.
	if (r < 0) throw new Error("negative radius: " + r);

	// Is this path empty? Move to (x0,y0).
	if (this._x1 === null) {
		this._.push(
		"M", x0, ",", y0
		);
	}

	// Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
	else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
		this._.push(
		"L", x0, ",", y0
		);
	}

	// Is this arc empty? We鈥檙e done.
	if (!r) return;

	// Is this a complete circle? Draw two arcs to complete the circle.
	if (da > tauEpsilon) {
		this._.push(
		"A", r, ",", r, ",0,1,", cw, ",", x - dx, ",", y - dy,
		"A", r, ",", r, ",0,1,", cw, ",", this._x1 = x0, ",", this._y1 = y0
		);
	}

	// Otherwise, draw an arc!
	else {
		if (da < 0) da = da % tau + tau;
		this._.push(
		"A", r, ",", r, ",0,", +(da >= pi), ",", cw, ",", this._x1 = x + r * Math.cos(a1), ",", this._y1 = y + r * Math.sin(a1)
		);
	}
	},
	rect: function(x, y, w, h) {
	this._.push("M", this._x0 = this._x1 = +x, ",", this._y0 = this._y1 = +y, "h", +w, "v", +h, "h", -w, "Z");
	},
	toString: function() {
	return this._.join("");
	}
};

exports.path = path;

Object.defineProperty(exports, '__esModule', { value: true });

})));
},{}],13:[function(require,module,exports){
// https://d3js.org/d3-request/ Version 1.0.2. Copyright 2016 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-collection'), require('d3-dispatch'), require('d3-dsv')) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3-collection', 'd3-dispatch', 'd3-dsv'], factory) :
	(factory((global.d3 = global.d3 || {}),global.d3,global.d3,global.d3));
}(this, function (exports,d3Collection,d3Dispatch,d3Dsv) { 'use strict';

	function request(url, callback) {
	var request,
		event = d3Dispatch.dispatch("beforesend", "progress", "load", "error"),
		mimeType,
		headers = d3Collection.map(),
		xhr = new XMLHttpRequest,
		user = null,
		password = null,
		response,
		responseType,
		timeout = 0;

	// If IE does not support CORS, use XDomainRequest.
	if (typeof XDomainRequest !== "undefined"
		&& !("withCredentials" in xhr)
		&& /^(http(s)?:)?\/\//.test(url)) xhr = new XDomainRequest;

	"onload" in xhr
		? xhr.onload = xhr.onerror = xhr.ontimeout = respond
		: xhr.onreadystatechange = function(o) { xhr.readyState > 3 && respond(o); };

	function respond(o) {
		var status = xhr.status, result;
		if (!status && hasResponse(xhr)
			|| status >= 200 && status < 300
			|| status === 304) {
		if (response) {
			try {
			result = response.call(request, xhr);
			} catch (e) {
			event.call("error", request, e);
			return;
			}
		} else {
			result = xhr;
		}
		event.call("load", request, result);
		} else {
		event.call("error", request, o);
		}
	}

	xhr.onprogress = function(e) {
		event.call("progress", request, e);
	};

	request = {
		header: function(name, value) {
		name = (name + "").toLowerCase();
		if (arguments.length < 2) return headers.get(name);
		if (value == null) headers.remove(name);
		else headers.set(name, value + "");
		return request;
		},

		// If mimeType is non-null and no Accept header is set, a default is used.
		mimeType: function(value) {
		if (!arguments.length) return mimeType;
		mimeType = value == null ? null : value + "";
		return request;
		},

		// Specifies what type the response value should take;
		// for instance, arraybuffer, blob, document, or text.
		responseType: function(value) {
		if (!arguments.length) return responseType;
		responseType = value;
		return request;
		},

		timeout: function(value) {
		if (!arguments.length) return timeout;
		timeout = +value;
		return request;
		},

		user: function(value) {
		return arguments.length < 1 ? user : (user = value == null ? null : value + "", request);
		},

		password: function(value) {
		return arguments.length < 1 ? password : (password = value == null ? null : value + "", request);
		},

		// Specify how to convert the response content to a specific type;
		// changes the callback value on "load" events.
		response: function(value) {
		response = value;
		return request;
		},

		// Alias for send("GET", 鈥�).
		get: function(data, callback) {
		return request.send("GET", data, callback);
		},

		// Alias for send("POST", 鈥�).
		post: function(data, callback) {
		return request.send("POST", data, callback);
		},

		// If callback is non-null, it will be used for error and load events.
		send: function(method, data, callback) {
		xhr.open(method, url, true, user, password);
		if (mimeType != null && !headers.has("accept")) headers.set("accept", mimeType + ",*/*");
		if (xhr.setRequestHeader) headers.each(function(value, name) { xhr.setRequestHeader(name, value); });
		if (mimeType != null && xhr.overrideMimeType) xhr.overrideMimeType(mimeType);
		if (responseType != null) xhr.responseType = responseType;
		if (timeout > 0) xhr.timeout = timeout;
		if (callback == null && typeof data === "function") callback = data, data = null;
		if (callback != null && callback.length === 1) callback = fixCallback(callback);
		if (callback != null) request.on("error", callback).on("load", function(xhr) { callback(null, xhr); });
		event.call("beforesend", request, xhr);
		xhr.send(data == null ? null : data);
		return request;
		},

		abort: function() {
		xhr.abort();
		return request;
		},

		on: function() {
		var value = event.on.apply(event, arguments);
		return value === event ? request : value;
		}
	};

	if (callback != null) {
		if (typeof callback !== "function") throw new Error("invalid callback: " + callback);
		return request.get(callback);
	}

	return request;
	}

	function fixCallback(callback) {
	return function(error, xhr) {
		callback(error == null ? xhr : null);
	};
	}

	function hasResponse(xhr) {
	var type = xhr.responseType;
	return type && type !== "text"
		? xhr.response // null on error
		: xhr.responseText; // "" on error
	}

	function type(defaultMimeType, response) {
	return function(url, callback) {
		var r = request(url).mimeType(defaultMimeType).response(response);
		if (callback != null) {
		if (typeof callback !== "function") throw new Error("invalid callback: " + callback);
		return r.get(callback);
		}
		return r;
	};
	}

	var html = type("text/html", function(xhr) {
	return document.createRange().createContextualFragment(xhr.responseText);
	});

	var json = type("application/json", function(xhr) {
	return JSON.parse(xhr.responseText);
	});

	var text = type("text/plain", function(xhr) {
	return xhr.responseText;
	});

	var xml = type("application/xml", function(xhr) {
	var xml = xhr.responseXML;
	if (!xml) throw new Error("parse error");
	return xml;
	});

	function dsv(defaultMimeType, parse) {
	return function(url, row, callback) {
		if (arguments.length < 3) callback = row, row = null;
		var r = request(url).mimeType(defaultMimeType);
		r.row = function(_) { return arguments.length ? r.response(responseOf(parse, row = _)) : row; };
		r.row(row);
		return callback ? r.get(callback) : r;
	};
	}

	function responseOf(parse, row) {
	return function(request) {
		return parse(request.responseText, row);
	};
	}

	var csv = dsv("text/csv", d3Dsv.csvParse);

	var tsv = dsv("text/tab-separated-values", d3Dsv.tsvParse);

	exports.request = request;
	exports.html = html;
	exports.json = json;
	exports.text = text;
	exports.xml = xml;
	exports.csv = csv;
	exports.tsv = tsv;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
},{"d3-collection":3,"d3-dispatch":7,"d3-dsv":8}],14:[function(require,module,exports){
// https://d3js.org/d3-selection/ Version 1.0.2. Copyright 2016 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
}(this, function (exports) { 'use strict';

	var xhtml = "http://www.w3.org/1999/xhtml";

	var namespaces = {
	svg: "http://www.w3.org/2000/svg",
	xhtml: xhtml,
	xlink: "http://www.w3.org/1999/xlink",
	xml: "http://www.w3.org/XML/1998/namespace",
	xmlns: "http://www.w3.org/2000/xmlns/"
	};

	function namespace(name) {
	var prefix = name += "", i = prefix.indexOf(":");
	if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
	return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name;
	}

	function creatorInherit(name) {
	return function() {
		var document = this.ownerDocument,
			uri = this.namespaceURI;
		return uri === xhtml && document.documentElement.namespaceURI === xhtml
			? document.createElement(name)
			: document.createElementNS(uri, name);
	};
	}

	function creatorFixed(fullname) {
	return function() {
		return this.ownerDocument.createElementNS(fullname.space, fullname.local);
	};
	}

	function creator(name) {
	var fullname = namespace(name);
	return (fullname.local
		? creatorFixed
		: creatorInherit)(fullname);
	}

	var nextId = 0;

	function local() {
	return new Local;
	}

	function Local() {
	this._ = "@" + (++nextId).toString(36);
	}

	Local.prototype = local.prototype = {
	constructor: Local,
	get: function(node) {
		var id = this._;
		while (!(id in node)) if (!(node = node.parentNode)) return;
		return node[id];
	},
	set: function(node, value) {
		return node[this._] = value;
	},
	remove: function(node) {
		return this._ in node && delete node[this._];
	},
	toString: function() {
		return this._;
	}
	};

	var matcher = function(selector) {
	return function() {
		return this.matches(selector);
	};
	};

	if (typeof document !== "undefined") {
	var element = document.documentElement;
	if (!element.matches) {
		var vendorMatches = element.webkitMatchesSelector
			|| element.msMatchesSelector
			|| element.mozMatchesSelector
			|| element.oMatchesSelector;
		matcher = function(selector) {
		return function() {
			return vendorMatches.call(this, selector);
		};
		};
	}
	}

	var matcher$1 = matcher;

	var filterEvents = {};

	exports.event = null;

	if (typeof document !== "undefined") {
	var element$1 = document.documentElement;
	if (!("onmouseenter" in element$1)) {
		filterEvents = {mouseenter: "mouseover", mouseleave: "mouseout"};
	}
	}

	function filterContextListener(listener, index, group) {
	listener = contextListener(listener, index, group);
	return function(event) {
		var related = event.relatedTarget;
		if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
		listener.call(this, event);
		}
	};
	}

	function contextListener(listener, index, group) {
	return function(event1) {
		var event0 = exports.event; // Events can be reentrant (e.g., focus).
		exports.event = event1;
		try {
		listener.call(this, this.__data__, index, group);
		} finally {
		exports.event = event0;
		}
	};
	}

	function parseTypenames(typenames) {
	return typenames.trim().split(/^|\s+/).map(function(t) {
		var name = "", i = t.indexOf(".");
		if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
		return {type: t, name: name};
	});
	}

	function onRemove(typename) {
	return function() {
		var on = this.__on;
		if (!on) return;
		for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
		if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
			this.removeEventListener(o.type, o.listener, o.capture);
		} else {
			on[++i] = o;
		}
		}
		if (++i) on.length = i;
		else delete this.__on;
	};
	}

	function onAdd(typename, value, capture) {
	var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener;
	return function(d, i, group) {
		var on = this.__on, o, listener = wrap(value, i, group);
		if (on) for (var j = 0, m = on.length; j < m; ++j) {
		if ((o = on[j]).type === typename.type && o.name === typename.name) {
			this.removeEventListener(o.type, o.listener, o.capture);
			this.addEventListener(o.type, o.listener = listener, o.capture = capture);
			o.value = value;
			return;
		}
		}
		this.addEventListener(typename.type, listener, capture);
		o = {type: typename.type, name: typename.name, value: value, listener: listener, capture: capture};
		if (!on) this.__on = [o];
		else on.push(o);
	};
	}

	function selection_on(typename, value, capture) {
	var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;

	if (arguments.length < 2) {
		var on = this.node().__on;
		if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
		for (i = 0, o = on[j]; i < n; ++i) {
			if ((t = typenames[i]).type === o.type && t.name === o.name) {
			return o.value;
			}
		}
		}
		return;
	}

	on = value ? onAdd : onRemove;
	if (capture == null) capture = false;
	for (i = 0; i < n; ++i) this.each(on(typenames[i], value, capture));
	return this;
	}

	function customEvent(event1, listener, that, args) {
	var event0 = exports.event;
	event1.sourceEvent = exports.event;
	exports.event = event1;
	try {
		return listener.apply(that, args);
	} finally {
		exports.event = event0;
	}
	}

	function sourceEvent() {
	var current = exports.event, source;
	while (source = current.sourceEvent) current = source;
	return current;
	}

	function point(node, event) {
	var svg = node.ownerSVGElement || node;

	if (svg.createSVGPoint) {
		var point = svg.createSVGPoint();
		point.x = event.clientX, point.y = event.clientY;
		point = point.matrixTransform(node.getScreenCTM().inverse());
		return [point.x, point.y];
	}

	var rect = node.getBoundingClientRect();
	return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
	}

	function mouse(node) {
	var event = sourceEvent();
	if (event.changedTouches) event = event.changedTouches[0];
	return point(node, event);
	}

	function none() {}

	function selector(selector) {
	return selector == null ? none : function() {
		return this.querySelector(selector);
	};
	}

	function selection_select(select) {
	if (typeof select !== "function") select = selector(select);

	for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
		for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
		if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
			if ("__data__" in node) subnode.__data__ = node.__data__;
			subgroup[i] = subnode;
		}
		}
	}

	return new Selection(subgroups, this._parents);
	}

	function empty() {
	return [];
	}

	function selectorAll(selector) {
	return selector == null ? empty : function() {
		return this.querySelectorAll(selector);
	};
	}

	function selection_selectAll(select) {
	if (typeof select !== "function") select = selectorAll(select);

	for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
		for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
		if (node = group[i]) {
			subgroups.push(select.call(node, node.__data__, i, group));
			parents.push(node);
		}
		}
	}

	return new Selection(subgroups, parents);
	}

	function selection_filter(match) {
	if (typeof match !== "function") match = matcher$1(match);

	for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
		for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
		if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
			subgroup.push(node);
		}
		}
	}

	return new Selection(subgroups, this._parents);
	}

	function sparse(update) {
	return new Array(update.length);
	}

	function selection_enter() {
	return new Selection(this._enter || this._groups.map(sparse), this._parents);
	}

	function EnterNode(parent, datum) {
	this.ownerDocument = parent.ownerDocument;
	this.namespaceURI = parent.namespaceURI;
	this._next = null;
	this._parent = parent;
	this.__data__ = datum;
	}

	EnterNode.prototype = {
	constructor: EnterNode,
	appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
	insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
	querySelector: function(selector) { return this._parent.querySelector(selector); },
	querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
	};

	function constant(x) {
	return function() {
		return x;
	};
	}

	var keyPrefix = "$"; // Protect against keys like 鈥淿_proto__鈥�.

	function bindIndex(parent, group, enter, update, exit, data) {
	var i = 0,
		node,
		groupLength = group.length,
		dataLength = data.length;

	// Put any non-null nodes that fit into update.
	// Put any null nodes into enter.
	// Put any remaining data into enter.
	for (; i < dataLength; ++i) {
		if (node = group[i]) {
		node.__data__ = data[i];
		update[i] = node;
		} else {
		enter[i] = new EnterNode(parent, data[i]);
		}
	}

	// Put any non-null nodes that don鈥檛 fit into exit.
	for (; i < groupLength; ++i) {
		if (node = group[i]) {
		exit[i] = node;
		}
	}
	}

	function bindKey(parent, group, enter, update, exit, data, key) {
	var i,
		node,
		nodeByKeyValue = {},
		groupLength = group.length,
		dataLength = data.length,
		keyValues = new Array(groupLength),
		keyValue;

	// Compute the key for each node.
	// If multiple nodes have the same key, the duplicates are added to exit.
	for (i = 0; i < groupLength; ++i) {
		if (node = group[i]) {
		keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);
		if (keyValue in nodeByKeyValue) {
			exit[i] = node;
		} else {
			nodeByKeyValue[keyValue] = node;
		}
		}
	}

	// Compute the key for each datum.
	// If there a node associated with this key, join and add it to update.
	// If there is not (or the key is a duplicate), add it to enter.
	for (i = 0; i < dataLength; ++i) {
		keyValue = keyPrefix + key.call(parent, data[i], i, data);
		if (node = nodeByKeyValue[keyValue]) {
		update[i] = node;
		node.__data__ = data[i];
		nodeByKeyValue[keyValue] = null;
		} else {
		enter[i] = new EnterNode(parent, data[i]);
		}
	}

	// Add any remaining nodes that were not bound to data to exit.
	for (i = 0; i < groupLength; ++i) {
		if ((node = group[i]) && (nodeByKeyValue[keyValues[i]] === node)) {
		exit[i] = node;
		}
	}
	}

	function selection_data(value, key) {
	if (!value) {
		data = new Array(this.size()), j = -1;
		this.each(function(d) { data[++j] = d; });
		return data;
	}

	var bind = key ? bindKey : bindIndex,
		parents = this._parents,
		groups = this._groups;

	if (typeof value !== "function") value = constant(value);

	for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
		var parent = parents[j],
			group = groups[j],
			groupLength = group.length,
			data = value.call(parent, parent && parent.__data__, j, parents),
			dataLength = data.length,
			enterGroup = enter[j] = new Array(dataLength),
			updateGroup = update[j] = new Array(dataLength),
			exitGroup = exit[j] = new Array(groupLength);

		bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

		// Now connect the enter nodes to their following update node, such that
		// appendChild can insert the materialized enter node before this node,
		// rather than at the end of the parent node.
		for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
		if (previous = enterGroup[i0]) {
			if (i0 >= i1) i1 = i0 + 1;
			while (!(next = updateGroup[i1]) && ++i1 < dataLength);
			previous._next = next || null;
		}
		}
	}

	update = new Selection(update, parents);
	update._enter = enter;
	update._exit = exit;
	return update;
	}

	function selection_exit() {
	return new Selection(this._exit || this._groups.map(sparse), this._parents);
	}

	function selection_merge(selection) {

	for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
		for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
		if (node = group0[i] || group1[i]) {
			merge[i] = node;
		}
		}
	}

	for (; j < m0; ++j) {
		merges[j] = groups0[j];
	}

	return new Selection(merges, this._parents);
	}

	function selection_order() {

	for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
		for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
		if (node = group[i]) {
			if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
			next = node;
		}
		}
	}

	return this;
	}

	function selection_sort(compare) {
	if (!compare) compare = ascending;

	function compareNode(a, b) {
		return a && b ? compare(a.__data__, b.__data__) : !a - !b;
	}

	for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
		for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
		if (node = group[i]) {
			sortgroup[i] = node;
		}
		}
		sortgroup.sort(compareNode);
	}

	return new Selection(sortgroups, this._parents).order();
	}

	function ascending(a, b) {
	return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
	}

	function selection_call() {
	var callback = arguments[0];
	arguments[0] = this;
	callback.apply(null, arguments);
	return this;
	}

	function selection_nodes() {
	var nodes = new Array(this.size()), i = -1;
	this.each(function() { nodes[++i] = this; });
	return nodes;
	}

	function selection_node() {

	for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
		for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
		var node = group[i];
		if (node) return node;
		}
	}

	return null;
	}

	function selection_size() {
	var size = 0;
	this.each(function() { ++size; });
	return size;
	}

	function selection_empty() {
	return !this.node();
	}

	function selection_each(callback) {

	for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
		for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
		if (node = group[i]) callback.call(node, node.__data__, i, group);
		}
	}

	return this;
	}

	function attrRemove(name) {
	return function() {
		this.removeAttribute(name);
	};
	}

	function attrRemoveNS(fullname) {
	return function() {
		this.removeAttributeNS(fullname.space, fullname.local);
	};
	}

	function attrConstant(name, value) {
	return function() {
		this.setAttribute(name, value);
	};
	}

	function attrConstantNS(fullname, value) {
	return function() {
		this.setAttributeNS(fullname.space, fullname.local, value);
	};
	}

	function attrFunction(name, value) {
	return function() {
		var v = value.apply(this, arguments);
		if (v == null) this.removeAttribute(name);
		else this.setAttribute(name, v);
	};
	}

	function attrFunctionNS(fullname, value) {
	return function() {
		var v = value.apply(this, arguments);
		if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
		else this.setAttributeNS(fullname.space, fullname.local, v);
	};
	}

	function selection_attr(name, value) {
	var fullname = namespace(name);

	if (arguments.length < 2) {
		var node = this.node();
		return fullname.local
			? node.getAttributeNS(fullname.space, fullname.local)
			: node.getAttribute(fullname);
	}

	return this.each((value == null
		? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
		? (fullname.local ? attrFunctionNS : attrFunction)
		: (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
	}

	function defaultView(node) {
	return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
		|| (node.document && node) // node is a Window
		|| node.defaultView; // node is a Document
	}

	function styleRemove(name) {
	return function() {
		this.style.removeProperty(name);
	};
	}

	function styleConstant(name, value, priority) {
	return function() {
		this.style.setProperty(name, value, priority);
	};
	}

	function styleFunction(name, value, priority) {
	return function() {
		var v = value.apply(this, arguments);
		if (v == null) this.style.removeProperty(name);
		else this.style.setProperty(name, v, priority);
	};
	}

	function selection_style(name, value, priority) {
	var node;
	return arguments.length > 1
		? this.each((value == null
				? styleRemove : typeof value === "function"
				? styleFunction
				: styleConstant)(name, value, priority == null ? "" : priority))
		: defaultView(node = this.node())
			.getComputedStyle(node, null)
			.getPropertyValue(name);
	}

	function propertyRemove(name) {
	return function() {
		delete this[name];
	};
	}

	function propertyConstant(name, value) {
	return function() {
		this[name] = value;
	};
	}

	function propertyFunction(name, value) {
	return function() {
		var v = value.apply(this, arguments);
		if (v == null) delete this[name];
		else this[name] = v;
	};
	}

	function selection_property(name, value) {
	return arguments.length > 1
		? this.each((value == null
			? propertyRemove : typeof value === "function"
			? propertyFunction
			: propertyConstant)(name, value))
		: this.node()[name];
	}

	function classArray(string) {
	return string.trim().split(/^|\s+/);
	}

	function classList(node) {
	return node.classList || new ClassList(node);
	}

	function ClassList(node) {
	this._node = node;
	this._names = classArray(node.getAttribute("class") || "");
	}

	ClassList.prototype = {
	add: function(name) {
		var i = this._names.indexOf(name);
		if (i < 0) {
		this._names.push(name);
		this._node.setAttribute("class", this._names.join(" "));
		}
	},
	remove: function(name) {
		var i = this._names.indexOf(name);
		if (i >= 0) {
		this._names.splice(i, 1);
		this._node.setAttribute("class", this._names.join(" "));
		}
	},
	contains: function(name) {
		return this._names.indexOf(name) >= 0;
	}
	};

	function classedAdd(node, names) {
	var list = classList(node), i = -1, n = names.length;
	while (++i < n) list.add(names[i]);
	}

	function classedRemove(node, names) {
	var list = classList(node), i = -1, n = names.length;
	while (++i < n) list.remove(names[i]);
	}

	function classedTrue(names) {
	return function() {
		classedAdd(this, names);
	};
	}

	function classedFalse(names) {
	return function() {
		classedRemove(this, names);
	};
	}

	function classedFunction(names, value) {
	return function() {
		(value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
	};
	}

	function selection_classed(name, value) {
	var names = classArray(name + "");

	if (arguments.length < 2) {
		var list = classList(this.node()), i = -1, n = names.length;
		while (++i < n) if (!list.contains(names[i])) return false;
		return true;
	}

	return this.each((typeof value === "function"
		? classedFunction : value
		? classedTrue
		: classedFalse)(names, value));
	}

	function textRemove() {
	this.textContent = "";
	}

	function textConstant(value) {
	return function() {
		this.textContent = value;
	};
	}

	function textFunction(value) {
	return function() {
		var v = value.apply(this, arguments);
		this.textContent = v == null ? "" : v;
	};
	}

	function selection_text(value) {
	return arguments.length
		? this.each(value == null
			? textRemove : (typeof value === "function"
			? textFunction
			: textConstant)(value))
		: this.node().textContent;
	}

	function htmlRemove() {
	this.innerHTML = "";
	}

	function htmlConstant(value) {
	return function() {
		this.innerHTML = value;
	};
	}

	function htmlFunction(value) {
	return function() {
		var v = value.apply(this, arguments);
		this.innerHTML = v == null ? "" : v;
	};
	}

	function selection_html(value) {
	return arguments.length
		? this.each(value == null
			? htmlRemove : (typeof value === "function"
			? htmlFunction
			: htmlConstant)(value))
		: this.node().innerHTML;
	}

	function raise() {
	if (this.nextSibling) this.parentNode.appendChild(this);
	}

	function selection_raise() {
	return this.each(raise);
	}

	function lower() {
	if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
	}

	function selection_lower() {
	return this.each(lower);
	}

	function selection_append(name) {
	var create = typeof name === "function" ? name : creator(name);
	return this.select(function() {
		return this.appendChild(create.apply(this, arguments));
	});
	}

	function constantNull() {
	return null;
	}

	function selection_insert(name, before) {
	var create = typeof name === "function" ? name : creator(name),
		select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
	return this.select(function() {
		return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
	});
	}

	function remove() {
	var parent = this.parentNode;
	if (parent) parent.removeChild(this);
	}

	function selection_remove() {
	return this.each(remove);
	}

	function selection_datum(value) {
	return arguments.length
		? this.property("__data__", value)
		: this.node().__data__;
	}

	function dispatchEvent(node, type, params) {
	var window = defaultView(node),
		event = window.CustomEvent;

	if (event) {
		event = new event(type, params);
	} else {
		event = window.document.createEvent("Event");
		if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
		else event.initEvent(type, false, false);
	}

	node.dispatchEvent(event);
	}

	function dispatchConstant(type, params) {
	return function() {
		return dispatchEvent(this, type, params);
	};
	}

	function dispatchFunction(type, params) {
	return function() {
		return dispatchEvent(this, type, params.apply(this, arguments));
	};
	}

	function selection_dispatch(type, params) {
	return this.each((typeof params === "function"
		? dispatchFunction
		: dispatchConstant)(type, params));
	}

	var root = [null];

	function Selection(groups, parents) {
	this._groups = groups;
	this._parents = parents;
	}

	function selection() {
	return new Selection([[document.documentElement]], root);
	}

	Selection.prototype = selection.prototype = {
	constructor: Selection,
	select: selection_select,
	selectAll: selection_selectAll,
	filter: selection_filter,
	data: selection_data,
	enter: selection_enter,
	exit: selection_exit,
	merge: selection_merge,
	order: selection_order,
	sort: selection_sort,
	call: selection_call,
	nodes: selection_nodes,
	node: selection_node,
	size: selection_size,
	empty: selection_empty,
	each: selection_each,
	attr: selection_attr,
	style: selection_style,
	property: selection_property,
	classed: selection_classed,
	text: selection_text,
	html: selection_html,
	raise: selection_raise,
	lower: selection_lower,
	append: selection_append,
	insert: selection_insert,
	remove: selection_remove,
	datum: selection_datum,
	on: selection_on,
	dispatch: selection_dispatch
	};

	function select(selector) {
	return typeof selector === "string"
		? new Selection([[document.querySelector(selector)]], [document.documentElement])
		: new Selection([[selector]], root);
	}

	function selectAll(selector) {
	return typeof selector === "string"
		? new Selection([document.querySelectorAll(selector)], [document.documentElement])
		: new Selection([selector == null ? [] : selector], root);
	}

	function touch(node, touches, identifier) {
	if (arguments.length < 3) identifier = touches, touches = sourceEvent().changedTouches;

	for (var i = 0, n = touches ? touches.length : 0, touch; i < n; ++i) {
		if ((touch = touches[i]).identifier === identifier) {
		return point(node, touch);
		}
	}

	return null;
	}

	function touches(node, touches) {
	if (touches == null) touches = sourceEvent().touches;

	for (var i = 0, n = touches ? touches.length : 0, points = new Array(n); i < n; ++i) {
		points[i] = point(node, touches[i]);
	}

	return points;
	}

	exports.creator = creator;
	exports.local = local;
	exports.matcher = matcher$1;
	exports.mouse = mouse;
	exports.namespace = namespace;
	exports.namespaces = namespaces;
	exports.select = select;
	exports.selectAll = selectAll;
	exports.selection = selection;
	exports.selector = selector;
	exports.selectorAll = selectorAll;
	exports.touch = touch;
	exports.touches = touches;
	exports.window = defaultView;
	exports.customEvent = customEvent;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
},{}],15:[function(require,module,exports){
// https://d3js.org/d3-timer/ Version 1.0.3. Copyright 2016 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
}(this, (function (exports) { 'use strict';

var frame = 0;
var timeout = 0;
var interval = 0;
var pokeDelay = 1000;
var taskHead;
var taskTail;
var clockLast = 0;
var clockNow = 0;
var clockSkew = 0;
var clock = typeof performance === "object" && performance.now ? performance : Date;
var setFrame = typeof requestAnimationFrame === "function" ? requestAnimationFrame : function(f) { setTimeout(f, 17); };
function now() {
	return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
}

function clearNow() {
	clockNow = 0;
}

function Timer() {
	this._call =
	this._time =
	this._next = null;
}

Timer.prototype = timer.prototype = {
	constructor: Timer,
	restart: function(callback, delay, time) {
	if (typeof callback !== "function") throw new TypeError("callback is not a function");
	time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
	if (!this._next && taskTail !== this) {
		if (taskTail) taskTail._next = this;
		else taskHead = this;
		taskTail = this;
	}
	this._call = callback;
	this._time = time;
	sleep();
	},
	stop: function() {
	if (this._call) {
		this._call = null;
		this._time = Infinity;
		sleep();
	}
	}
};

function timer(callback, delay, time) {
	var t = new Timer;
	t.restart(callback, delay, time);
	return t;
}

function timerFlush() {
	now(); // Get the current time, if not already set.
	++frame; // Pretend we鈥檝e set an alarm, if we haven鈥檛 already.
	var t = taskHead, e;
	while (t) {
	if ((e = clockNow - t._time) >= 0) t._call.call(null, e);
	t = t._next;
	}
	--frame;
}

function wake() {
	clockNow = (clockLast = clock.now()) + clockSkew;
	frame = timeout = 0;
	try {
	timerFlush();
	} finally {
	frame = 0;
	nap();
	clockNow = 0;
	}
}

function poke() {
	var now = clock.now(), delay = now - clockLast;
	if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
}

function nap() {
	var t0, t1 = taskHead, t2, time = Infinity;
	while (t1) {
	if (t1._call) {
		if (time > t1._time) time = t1._time;
		t0 = t1, t1 = t1._next;
	} else {
		t2 = t1._next, t1._next = null;
		t1 = t0 ? t0._next = t2 : taskHead = t2;
	}
	}
	taskTail = t0;
	sleep(time);
}

function sleep(time) {
	if (frame) return; // Soonest alarm already set, or will be.
	if (timeout) timeout = clearTimeout(timeout);
	var delay = time - clockNow;
	if (delay > 24) {
	if (time < Infinity) timeout = setTimeout(wake, delay);
	if (interval) interval = clearInterval(interval);
	} else {
	if (!interval) interval = setInterval(poke, pokeDelay);
	frame = 1, setFrame(wake);
	}
}

function timeout$1(callback, delay, time) {
	var t = new Timer;
	delay = delay == null ? 0 : +delay;
	t.restart(function(elapsed) {
	t.stop();
	callback(elapsed + delay);
	}, delay, time);
	return t;
}

function interval$1(callback, delay, time) {
	var t = new Timer, total = delay;
	if (delay == null) return t.restart(callback, delay, time), t;
	delay = +delay, time = time == null ? now() : +time;
	t.restart(function tick(elapsed) {
	elapsed += total;
	t.restart(tick, total += delay, time);
	callback(elapsed);
	}, delay, time);
	return t;
}

exports.now = now;
exports.timer = timer;
exports.timerFlush = timerFlush;
exports.timeout = timeout$1;
exports.interval = interval$1;

Object.defineProperty(exports, '__esModule', { value: true });

})));
},{}],16:[function(require,module,exports){
// https://d3js.org/d3-transition/ Version 1.0.2. Copyright 2016 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-selection'), require('d3-dispatch'), require('d3-timer'), require('d3-interpolate'), require('d3-color'), require('d3-ease')) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3-selection', 'd3-dispatch', 'd3-timer', 'd3-interpolate', 'd3-color', 'd3-ease'], factory) :
	(factory((global.d3 = global.d3 || {}),global.d3,global.d3,global.d3,global.d3,global.d3,global.d3));
}(this, (function (exports,d3Selection,d3Dispatch,d3Timer,d3Interpolate,d3Color,d3Ease) { 'use strict';

var emptyOn = d3Dispatch.dispatch("start", "end", "interrupt");
var emptyTween = [];

var CREATED = 0;
var SCHEDULED = 1;
var STARTING = 2;
var STARTED = 3;
var RUNNING = 4;
var ENDING = 5;
var ENDED = 6;

function schedule(node, name, id, index, group, timing) {
	var schedules = node.__transition;
	if (!schedules) node.__transition = {};
	else if (id in schedules) return;
	create(node, id, {
	name: name,
	index: index, // For context during callback.
	group: group, // For context during callback.
	on: emptyOn,
	tween: emptyTween,
	time: timing.time,
	delay: timing.delay,
	duration: timing.duration,
	ease: timing.ease,
	timer: null,
	state: CREATED
	});
}

function init(node, id) {
	var schedule = node.__transition;
	if (!schedule || !(schedule = schedule[id]) || schedule.state > CREATED) throw new Error("too late");
	return schedule;
}

function set(node, id) {
	var schedule = node.__transition;
	if (!schedule || !(schedule = schedule[id]) || schedule.state > STARTING) throw new Error("too late");
	return schedule;
}

function get(node, id) {
	var schedule = node.__transition;
	if (!schedule || !(schedule = schedule[id])) throw new Error("too late");
	return schedule;
}

function create(node, id, self) {
	var schedules = node.__transition,
		tween;

	// Initialize the self timer when the transition is created.
	// Note the actual delay is not known until the first callback!
	schedules[id] = self;
	self.timer = d3Timer.timer(schedule, 0, self.time);

	function schedule(elapsed) {
	self.state = SCHEDULED;
	self.timer.restart(start, self.delay, self.time);

	// If the elapsed delay is less than our first sleep, start immediately.
	if (self.delay <= elapsed) start(elapsed - self.delay);
	}

	function start(elapsed) {
	var i, j, n, o;

	// If the state is not SCHEDULED, then we previously errored on start.
	if (self.state !== SCHEDULED) return stop();

	for (i in schedules) {
		o = schedules[i];
		if (o.name !== self.name) continue;

		// While this element already has a starting transition during this frame,
		// defer starting an interrupting transition until that transition has a
		// chance to tick (and possibly end); see d3/d3-transition#54!
		if (o.state === STARTED) return d3Timer.timeout(start);

		// Interrupt the active transition, if any.
		// Dispatch the interrupt event.
		if (o.state === RUNNING) {
		o.state = ENDED;
		o.timer.stop();
		o.on.call("interrupt", node, node.__data__, o.index, o.group);
		delete schedules[i];
		}

		// Cancel any pre-empted transitions. No interrupt event is dispatched
		// because the cancelled transitions never started. Note that this also
		// removes this transition from the pending list!
		else if (+i < id) {
		o.state = ENDED;
		o.timer.stop();
		delete schedules[i];
		}
	}

	// Defer the first tick to end of the current frame; see d3/d3#1576.
	// Note the transition may be canceled after start and before the first tick!
	// Note this must be scheduled before the start event; see d3/d3-transition#16!
	// Assuming this is successful, subsequent callbacks go straight to tick.
	d3Timer.timeout(function() {
		if (self.state === STARTED) {
		self.state = RUNNING;
		self.timer.restart(tick, self.delay, self.time);
		tick(elapsed);
		}
	});

	// Dispatch the start event.
	// Note this must be done before the tween are initialized.
	self.state = STARTING;
	self.on.call("start", node, node.__data__, self.index, self.group);
	if (self.state !== STARTING) return; // interrupted
	self.state = STARTED;

	// Initialize the tween, deleting null tween.
	tween = new Array(n = self.tween.length);
	for (i = 0, j = -1; i < n; ++i) {
		if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
		tween[++j] = o;
		}
	}
	tween.length = j + 1;
	}

	function tick(elapsed) {
	var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
		i = -1,
		n = tween.length;

	while (++i < n) {
		tween[i].call(null, t);
	}

	// Dispatch the end event.
	if (self.state === ENDING) {
		self.on.call("end", node, node.__data__, self.index, self.group);
		stop();
	}
	}

	function stop() {
	self.state = ENDED;
	self.timer.stop();
	delete schedules[id];
	for (var i in schedules) return; // eslint-disable-line no-unused-vars
	delete node.__transition;
	}
}

function interrupt(node, name) {
	var schedules = node.__transition,
		schedule,
		active,
		empty = true,
		i;

	if (!schedules) return;

	name = name == null ? null : name + "";

	for (i in schedules) {
	if ((schedule = schedules[i]).name !== name) { empty = false; continue; }
	active = schedule.state === STARTED;
	schedule.state = ENDED;
	schedule.timer.stop();
	if (active) schedule.on.call("interrupt", node, node.__data__, schedule.index, schedule.group);
	delete schedules[i];
	}

	if (empty) delete node.__transition;
}

function selection_interrupt(name) {
	return this.each(function() {
	interrupt(this, name);
	});
}

function tweenRemove(id, name) {
	var tween0, tween1;
	return function() {
	var schedule = set(this, id),
		tween = schedule.tween;

	// If this node shared tween with the previous node,
	// just assign the updated shared tween and we鈥檙e done!
	// Otherwise, copy-on-write.
	if (tween !== tween0) {
		tween1 = tween0 = tween;
		for (var i = 0, n = tween1.length; i < n; ++i) {
		if (tween1[i].name === name) {
			tween1 = tween1.slice();
			tween1.splice(i, 1);
			break;
		}
		}
	}

	schedule.tween = tween1;
	};
}

function tweenFunction(id, name, value) {
	var tween0, tween1;
	if (typeof value !== "function") throw new Error;
	return function() {
	var schedule = set(this, id),
		tween = schedule.tween;

	// If this node shared tween with the previous node,
	// just assign the updated shared tween and we鈥檙e done!
	// Otherwise, copy-on-write.
	if (tween !== tween0) {
		tween1 = (tween0 = tween).slice();
		for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
		if (tween1[i].name === name) {
			tween1[i] = t;
			break;
		}
		}
		if (i === n) tween1.push(t);
	}

	schedule.tween = tween1;
	};
}

function transition_tween(name, value) {
	var id = this._id;

	name += "";

	if (arguments.length < 2) {
	var tween = get(this.node(), id).tween;
	for (var i = 0, n = tween.length, t; i < n; ++i) {
		if ((t = tween[i]).name === name) {
		return t.value;
		}
	}
	return null;
	}

	return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
}

function tweenValue(transition, name, value) {
	var id = transition._id;

	transition.each(function() {
	var schedule = set(this, id);
	(schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
	});

	return function(node) {
	return get(node, id).value[name];
	};
}

function interpolate(a, b) {
	var c;
	return (typeof b === "number" ? d3Interpolate.interpolateNumber
		: b instanceof d3Color.color ? d3Interpolate.interpolateRgb
		: (c = d3Color.color(b)) ? (b = c, d3Interpolate.interpolateRgb)
		: d3Interpolate.interpolateString)(a, b);
}

function attrRemove(name) {
	return function() {
	this.removeAttribute(name);
	};
}

function attrRemoveNS(fullname) {
	return function() {
	this.removeAttributeNS(fullname.space, fullname.local);
	};
}

function attrConstant(name, interpolate, value1) {
	var value00,
		interpolate0;
	return function() {
	var value0 = this.getAttribute(name);
	return value0 === value1 ? null
		: value0 === value00 ? interpolate0
		: interpolate0 = interpolate(value00 = value0, value1);
	};
}

function attrConstantNS(fullname, interpolate, value1) {
	var value00,
		interpolate0;
	return function() {
	var value0 = this.getAttributeNS(fullname.space, fullname.local);
	return value0 === value1 ? null
		: value0 === value00 ? interpolate0
		: interpolate0 = interpolate(value00 = value0, value1);
	};
}

function attrFunction(name, interpolate, value) {
	var value00,
		value10,
		interpolate0;
	return function() {
	var value0, value1 = value(this);
	if (value1 == null) return void this.removeAttribute(name);
	value0 = this.getAttribute(name);
	return value0 === value1 ? null
		: value0 === value00 && value1 === value10 ? interpolate0
		: interpolate0 = interpolate(value00 = value0, value10 = value1);
	};
}

function attrFunctionNS(fullname, interpolate, value) {
	var value00,
		value10,
		interpolate0;
	return function() {
	var value0, value1 = value(this);
	if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
	value0 = this.getAttributeNS(fullname.space, fullname.local);
	return value0 === value1 ? null
		: value0 === value00 && value1 === value10 ? interpolate0
		: interpolate0 = interpolate(value00 = value0, value10 = value1);
	};
}

function transition_attr(name, value) {
	var fullname = d3Selection.namespace(name), i = fullname === "transform" ? d3Interpolate.interpolateTransformSvg : interpolate;
	return this.attrTween(name, typeof value === "function"
		? (fullname.local ? attrFunctionNS : attrFunction)(fullname, i, tweenValue(this, "attr." + name, value))
		: value == null ? (fullname.local ? attrRemoveNS : attrRemove)(fullname)
		: (fullname.local ? attrConstantNS : attrConstant)(fullname, i, value));
}

function attrTweenNS(fullname, value) {
	function tween() {
	var node = this, i = value.apply(node, arguments);
	return i && function(t) {
		node.setAttributeNS(fullname.space, fullname.local, i(t));
	};
	}
	tween._value = value;
	return tween;
}

function attrTween(name, value) {
	function tween() {
	var node = this, i = value.apply(node, arguments);
	return i && function(t) {
		node.setAttribute(name, i(t));
	};
	}
	tween._value = value;
	return tween;
}

function transition_attrTween(name, value) {
	var key = "attr." + name;
	if (arguments.length < 2) return (key = this.tween(key)) && key._value;
	if (value == null) return this.tween(key, null);
	if (typeof value !== "function") throw new Error;
	var fullname = d3Selection.namespace(name);
	return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
}

function delayFunction(id, value) {
	return function() {
	init(this, id).delay = +value.apply(this, arguments);
	};
}

function delayConstant(id, value) {
	return value = +value, function() {
	init(this, id).delay = value;
	};
}

function transition_delay(value) {
	var id = this._id;

	return arguments.length
		? this.each((typeof value === "function"
			? delayFunction
			: delayConstant)(id, value))
		: get(this.node(), id).delay;
}

function durationFunction(id, value) {
	return function() {
	set(this, id).duration = +value.apply(this, arguments);
	};
}

function durationConstant(id, value) {
	return value = +value, function() {
	set(this, id).duration = value;
	};
}

function transition_duration(value) {
	var id = this._id;

	return arguments.length
		? this.each((typeof value === "function"
			? durationFunction
			: durationConstant)(id, value))
		: get(this.node(), id).duration;
}

function easeConstant(id, value) {
	if (typeof value !== "function") throw new Error;
	return function() {
	set(this, id).ease = value;
	};
}

function transition_ease(value) {
	var id = this._id;

	return arguments.length
		? this.each(easeConstant(id, value))
		: get(this.node(), id).ease;
}

function transition_filter(match) {
	if (typeof match !== "function") match = d3Selection.matcher(match);

	for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
	for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
		if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
		subgroup.push(node);
		}
	}
	}

	return new Transition(subgroups, this._parents, this._name, this._id);
}

function transition_merge(transition) {
	if (transition._id !== this._id) throw new Error;

	for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
	for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
		if (node = group0[i] || group1[i]) {
		merge[i] = node;
		}
	}
	}

	for (; j < m0; ++j) {
	merges[j] = groups0[j];
	}

	return new Transition(merges, this._parents, this._name, this._id);
}

function start(name) {
	return (name + "").trim().split(/^|\s+/).every(function(t) {
	var i = t.indexOf(".");
	if (i >= 0) t = t.slice(0, i);
	return !t || t === "start";
	});
}

function onFunction(id, name, listener) {
	var on0, on1, sit = start(name) ? init : set;
	return function() {
	var schedule = sit(this, id),
		on = schedule.on;

	// If this node shared a dispatch with the previous node,
	// just assign the updated shared dispatch and we鈥檙e done!
	// Otherwise, copy-on-write.
	if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

	schedule.on = on1;
	};
}

function transition_on(name, listener) {
	var id = this._id;

	return arguments.length < 2
		? get(this.node(), id).on.on(name)
		: this.each(onFunction(id, name, listener));
}

function removeFunction(id) {
	return function() {
	var parent = this.parentNode;
	for (var i in this.__transition) if (+i !== id) return;
	if (parent) parent.removeChild(this);
	};
}

function transition_remove() {
	return this.on("end.remove", removeFunction(this._id));
}

function transition_select(select) {
	var name = this._name,
		id = this._id;

	if (typeof select !== "function") select = d3Selection.selector(select);

	for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
	for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
		if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
		if ("__data__" in node) subnode.__data__ = node.__data__;
		subgroup[i] = subnode;
		schedule(subgroup[i], name, id, i, subgroup, get(node, id));
		}
	}
	}

	return new Transition(subgroups, this._parents, name, id);
}

function transition_selectAll(select) {
	var name = this._name,
		id = this._id;

	if (typeof select !== "function") select = d3Selection.selectorAll(select);

	for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
	for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
		if (node = group[i]) {
		for (var children = select.call(node, node.__data__, i, group), child, inherit = get(node, id), k = 0, l = children.length; k < l; ++k) {
			if (child = children[k]) {
			schedule(child, name, id, k, children, inherit);
			}
		}
		subgroups.push(children);
		parents.push(node);
		}
	}
	}

	return new Transition(subgroups, parents, name, id);
}

var Selection = d3Selection.selection.prototype.constructor;

function transition_selection() {
	return new Selection(this._groups, this._parents);
}

function styleRemove(name, interpolate) {
	var value00,
		value10,
		interpolate0;
	return function() {
	var style = d3Selection.window(this).getComputedStyle(this, null),
		value0 = style.getPropertyValue(name),
		value1 = (this.style.removeProperty(name), style.getPropertyValue(name));
	return value0 === value1 ? null
		: value0 === value00 && value1 === value10 ? interpolate0
		: interpolate0 = interpolate(value00 = value0, value10 = value1);
	};
}

function styleRemoveEnd(name) {
	return function() {
	this.style.removeProperty(name);
	};
}

function styleConstant(name, interpolate, value1) {
	var value00,
		interpolate0;
	return function() {
	var value0 = d3Selection.window(this).getComputedStyle(this, null).getPropertyValue(name);
	return value0 === value1 ? null
		: value0 === value00 ? interpolate0
		: interpolate0 = interpolate(value00 = value0, value1);
	};
}

function styleFunction(name, interpolate, value) {
	var value00,
		value10,
		interpolate0;
	return function() {
	var style = d3Selection.window(this).getComputedStyle(this, null),
		value0 = style.getPropertyValue(name),
		value1 = value(this);
	if (value1 == null) value1 = (this.style.removeProperty(name), style.getPropertyValue(name));
	return value0 === value1 ? null
		: value0 === value00 && value1 === value10 ? interpolate0
		: interpolate0 = interpolate(value00 = value0, value10 = value1);
	};
}

function transition_style(name, value, priority) {
	var i = (name += "") === "transform" ? d3Interpolate.interpolateTransformCss : interpolate;
	return value == null ? this
			.styleTween(name, styleRemove(name, i))
			.on("end.style." + name, styleRemoveEnd(name))
		: this.styleTween(name, typeof value === "function"
			? styleFunction(name, i, tweenValue(this, "style." + name, value))
			: styleConstant(name, i, value), priority);
}

function styleTween(name, value, priority) {
	function tween() {
	var node = this, i = value.apply(node, arguments);
	return i && function(t) {
		node.style.setProperty(name, i(t), priority);
	};
	}
	tween._value = value;
	return tween;
}

function transition_styleTween(name, value, priority) {
	var key = "style." + (name += "");
	if (arguments.length < 2) return (key = this.tween(key)) && key._value;
	if (value == null) return this.tween(key, null);
	if (typeof value !== "function") throw new Error;
	return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
}

function textConstant(value) {
	return function() {
	this.textContent = value;
	};
}

function textFunction(value) {
	return function() {
	var value1 = value(this);
	this.textContent = value1 == null ? "" : value1;
	};
}

function transition_text(value) {
	return this.tween("text", typeof value === "function"
		? textFunction(tweenValue(this, "text", value))
		: textConstant(value == null ? "" : value + ""));
}

function transition_transition() {
	var name = this._name,
		id0 = this._id,
		id1 = newId();

	for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
	for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
		if (node = group[i]) {
		var inherit = get(node, id0);
		schedule(node, name, id1, i, group, {
			time: inherit.time + inherit.delay + inherit.duration,
			delay: 0,
			duration: inherit.duration,
			ease: inherit.ease
		});
		}
	}
	}

	return new Transition(groups, this._parents, name, id1);
}

var id = 0;

function Transition(groups, parents, name, id) {
	this._groups = groups;
	this._parents = parents;
	this._name = name;
	this._id = id;
}

function transition(name) {
	return d3Selection.selection().transition(name);
}

function newId() {
	return ++id;
}

var selection_prototype = d3Selection.selection.prototype;

Transition.prototype = transition.prototype = {
	constructor: Transition,
	select: transition_select,
	selectAll: transition_selectAll,
	filter: transition_filter,
	merge: transition_merge,
	selection: transition_selection,
	transition: transition_transition,
	call: selection_prototype.call,
	nodes: selection_prototype.nodes,
	node: selection_prototype.node,
	size: selection_prototype.size,
	empty: selection_prototype.empty,
	each: selection_prototype.each,
	on: transition_on,
	attr: transition_attr,
	attrTween: transition_attrTween,
	style: transition_style,
	styleTween: transition_styleTween,
	text: transition_text,
	remove: transition_remove,
	tween: transition_tween,
	delay: transition_delay,
	duration: transition_duration,
	ease: transition_ease
};

var defaultTiming = {
	time: null, // Set on use.
	delay: 0,
	duration: 250,
	ease: d3Ease.easeCubicInOut
};

function inherit(node, id) {
	var timing;
	while (!(timing = node.__transition) || !(timing = timing[id])) {
	if (!(node = node.parentNode)) {
		return defaultTiming.time = d3Timer.now(), defaultTiming;
	}
	}
	return timing;
}

function selection_transition(name) {
	var id,
		timing;

	if (name instanceof Transition) {
	id = name._id, name = name._name;
	} else {
	id = newId(), (timing = defaultTiming).time = d3Timer.now(), name = name == null ? null : name + "";
	}

	for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
	for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
		if (node = group[i]) {
		schedule(node, name, id, i, group, timing || inherit(node, id));
		}
	}
	}

	return new Transition(groups, this._parents, name, id);
}

d3Selection.selection.prototype.interrupt = selection_interrupt;
d3Selection.selection.prototype.transition = selection_transition;

var root = [null];

function active(node, name) {
	var schedules = node.__transition,
		schedule,
		i;

	if (schedules) {
	name = name == null ? null : name + "";
	for (i in schedules) {
		if ((schedule = schedules[i]).state > SCHEDULED && schedule.name === name) {
		return new Transition([[node]], root, name, +i);
		}
	}
	}

	return null;
}

exports.transition = transition;
exports.active = active;
exports.interrupt = interrupt;

Object.defineProperty(exports, '__esModule', { value: true });

})));
},{"d3-color":4,"d3-dispatch":7,"d3-ease":9,"d3-interpolate":11,"d3-selection":14,"d3-timer":15}],17:[function(require,module,exports){
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.topojson = global.topojson || {})));
}(this, (function (exports) { 'use strict';

function noop() {}

function transformAbsolute(transform) {
	if (!transform) return noop;
	var x0,
		y0,
		kx = transform.scale[0],
		ky = transform.scale[1],
		dx = transform.translate[0],
		dy = transform.translate[1];
	return function(point, i) {
	if (!i) x0 = y0 = 0;
	point[0] = (x0 += point[0]) * kx + dx;
	point[1] = (y0 += point[1]) * ky + dy;
	};
}

function transformRelative(transform) {
	if (!transform) return noop;
	var x0,
		y0,
		kx = transform.scale[0],
		ky = transform.scale[1],
		dx = transform.translate[0],
		dy = transform.translate[1];
	return function(point, i) {
	if (!i) x0 = y0 = 0;
	var x1 = Math.round((point[0] - dx) / kx),
		y1 = Math.round((point[1] - dy) / ky);
	point[0] = x1 - x0;
	point[1] = y1 - y0;
	x0 = x1;
	y0 = y1;
	};
}

function reverse(array, n) {
	var t, j = array.length, i = j - n;
	while (i < --j) t = array[i], array[i++] = array[j], array[j] = t;
}

function bisect(a, x) {
	var lo = 0, hi = a.length;
	while (lo < hi) {
	var mid = lo + hi >>> 1;
	if (a[mid] < x) lo = mid + 1;
	else hi = mid;
	}
	return lo;
}

function feature(topology, o) {
	return o.type === "GeometryCollection" ? {
	type: "FeatureCollection",
	features: o.geometries.map(function(o) { return feature$1(topology, o); })
	} : feature$1(topology, o);
}

function feature$1(topology, o) {
	var f = {
	type: "Feature",
	id: o.id,
	properties: o.properties || {},
	geometry: object(topology, o)
	};
	if (o.id == null) delete f.id;
	return f;
}

function object(topology, o) {
	var absolute = transformAbsolute(topology.transform),
		arcs = topology.arcs;

	function arc(i, points) {
	if (points.length) points.pop();
	for (var a = arcs[i < 0 ? ~i : i], k = 0, n = a.length, p; k < n; ++k) {
		points.push(p = a[k].slice());
		absolute(p, k);
	}
	if (i < 0) reverse(points, n);
	}

	function point(p) {
	p = p.slice();
	absolute(p, 0);
	return p;
	}

	function line(arcs) {
	var points = [];
	for (var i = 0, n = arcs.length; i < n; ++i) arc(arcs[i], points);
	if (points.length < 2) points.push(points[0].slice());
	return points;
	}

	function ring(arcs) {
	var points = line(arcs);
	while (points.length < 4) points.push(points[0].slice());
	return points;
	}

	function polygon(arcs) {
	return arcs.map(ring);
	}

	function geometry(o) {
	var t = o.type;
	return t === "GeometryCollection" ? {type: t, geometries: o.geometries.map(geometry)}
		: t in geometryType ? {type: t, coordinates: geometryType[t](o)}
		: null;
	}

	var geometryType = {
	Point: function(o) { return point(o.coordinates); },
	MultiPoint: function(o) { return o.coordinates.map(point); },
	LineString: function(o) { return line(o.arcs); },
	MultiLineString: function(o) { return o.arcs.map(line); },
	Polygon: function(o) { return polygon(o.arcs); },
	MultiPolygon: function(o) { return o.arcs.map(polygon); }
	};

	return geometry(o);
}

function stitchArcs(topology, arcs) {
	var stitchedArcs = {},
		fragmentByStart = {},
		fragmentByEnd = {},
		fragments = [],
		emptyIndex = -1;

	// Stitch empty arcs first, since they may be subsumed by other arcs.
	arcs.forEach(function(i, j) {
	var arc = topology.arcs[i < 0 ? ~i : i], t;
	if (arc.length < 3 && !arc[1][0] && !arc[1][1]) {
		t = arcs[++emptyIndex], arcs[emptyIndex] = i, arcs[j] = t;
	}
	});

	arcs.forEach(function(i) {
	var e = ends(i),
		start = e[0],
		end = e[1],
		f, g;

	if (f = fragmentByEnd[start]) {
		delete fragmentByEnd[f.end];
		f.push(i);
		f.end = end;
		if (g = fragmentByStart[end]) {
		delete fragmentByStart[g.start];
		var fg = g === f ? f : f.concat(g);
		fragmentByStart[fg.start = f.start] = fragmentByEnd[fg.end = g.end] = fg;
		} else {
		fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
		}
	} else if (f = fragmentByStart[end]) {
		delete fragmentByStart[f.start];
		f.unshift(i);
		f.start = start;
		if (g = fragmentByEnd[start]) {
		delete fragmentByEnd[g.end];
		var gf = g === f ? f : g.concat(f);
		fragmentByStart[gf.start = g.start] = fragmentByEnd[gf.end = f.end] = gf;
		} else {
		fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
		}
	} else {
		f = [i];
		fragmentByStart[f.start = start] = fragmentByEnd[f.end = end] = f;
	}
	});

	function ends(i) {
	var arc = topology.arcs[i < 0 ? ~i : i], p0 = arc[0], p1;
	if (topology.transform) p1 = [0, 0], arc.forEach(function(dp) { p1[0] += dp[0], p1[1] += dp[1]; });
	else p1 = arc[arc.length - 1];
	return i < 0 ? [p1, p0] : [p0, p1];
	}

	function flush(fragmentByEnd, fragmentByStart) {
	for (var k in fragmentByEnd) {
		var f = fragmentByEnd[k];
		delete fragmentByStart[f.start];
		delete f.start;
		delete f.end;
		f.forEach(function(i) { stitchedArcs[i < 0 ? ~i : i] = 1; });
		fragments.push(f);
	}
	}

	flush(fragmentByEnd, fragmentByStart);
	flush(fragmentByStart, fragmentByEnd);
	arcs.forEach(function(i) { if (!stitchedArcs[i < 0 ? ~i : i]) fragments.push([i]); });

	return fragments;
}

function mesh(topology) {
	return object(topology, meshArcs.apply(this, arguments));
}

function meshArcs(topology, o, filter) {
	var arcs = [];

	function arc(i) {
	var j = i < 0 ? ~i : i;
	(geomsByArc[j] || (geomsByArc[j] = [])).push({i: i, g: geom});
	}

	function line(arcs) {
	arcs.forEach(arc);
	}

	function polygon(arcs) {
	arcs.forEach(line);
	}

	function geometry(o) {
	if (o.type === "GeometryCollection") o.geometries.forEach(geometry);
	else if (o.type in geometryType) geom = o, geometryType[o.type](o.arcs);
	}

	if (arguments.length > 1) {
	var geomsByArc = [],
		geom;

	var geometryType = {
		LineString: line,
		MultiLineString: polygon,
		Polygon: polygon,
		MultiPolygon: function(arcs) { arcs.forEach(polygon); }
	};

	geometry(o);

	geomsByArc.forEach(arguments.length < 3
		? function(geoms) { arcs.push(geoms[0].i); }
		: function(geoms) { if (filter(geoms[0].g, geoms[geoms.length - 1].g)) arcs.push(geoms[0].i); });
	} else {
	for (var i = 0, n = topology.arcs.length; i < n; ++i) arcs.push(i);
	}

	return {type: "MultiLineString", arcs: stitchArcs(topology, arcs)};
}

function cartesianTriangleArea(triangle) {
	var a = triangle[0], b = triangle[1], c = triangle[2];
	return Math.abs((a[0] - c[0]) * (b[1] - a[1]) - (a[0] - b[0]) * (c[1] - a[1]));
}

function ring(ring) {
	var i = -1,
		n = ring.length,
		a,
		b = ring[n - 1],
		area = 0;

	while (++i < n) {
	a = b;
	b = ring[i];
	area += a[0] * b[1] - a[1] * b[0];
	}

	return area / 2;
}

function merge(topology) {
	return object(topology, mergeArcs.apply(this, arguments));
}

function mergeArcs(topology, objects) {
	var polygonsByArc = {},
		polygons = [],
		components = [];

	objects.forEach(function(o) {
	if (o.type === "Polygon") register(o.arcs);
	else if (o.type === "MultiPolygon") o.arcs.forEach(register);
	});

	function register(polygon) {
	polygon.forEach(function(ring$$) {
		ring$$.forEach(function(arc) {
		(polygonsByArc[arc = arc < 0 ? ~arc : arc] || (polygonsByArc[arc] = [])).push(polygon);
		});
	});
	polygons.push(polygon);
	}

	function area(ring$$) {
	return Math.abs(ring(object(topology, {type: "Polygon", arcs: [ring$$]}).coordinates[0]));
	}

	polygons.forEach(function(polygon) {
	if (!polygon._) {
		var component = [],
			neighbors = [polygon];
		polygon._ = 1;
		components.push(component);
		while (polygon = neighbors.pop()) {
		component.push(polygon);
		polygon.forEach(function(ring$$) {
			ring$$.forEach(function(arc) {
			polygonsByArc[arc < 0 ? ~arc : arc].forEach(function(polygon) {
				if (!polygon._) {
				polygon._ = 1;
				neighbors.push(polygon);
				}
			});
			});
		});
		}
	}
	});

	polygons.forEach(function(polygon) {
	delete polygon._;
	});

	return {
	type: "MultiPolygon",
	arcs: components.map(function(polygons) {
		var arcs = [], n;

		// Extract the exterior (unique) arcs.
		polygons.forEach(function(polygon) {
		polygon.forEach(function(ring$$) {
			ring$$.forEach(function(arc) {
			if (polygonsByArc[arc < 0 ? ~arc : arc].length < 2) {
				arcs.push(arc);
			}
			});
		});
		});

		// Stitch the arcs into one or more rings.
		arcs = stitchArcs(topology, arcs);

		// If more than one ring is returned,
		// at most one of these rings can be the exterior;
		// choose the one with the greatest absolute area.
		if ((n = arcs.length) > 1) {
		for (var i = 1, k = area(arcs[0]), ki, t; i < n; ++i) {
			if ((ki = area(arcs[i])) > k) {
			t = arcs[0], arcs[0] = arcs[i], arcs[i] = t, k = ki;
			}
		}
		}

		return arcs;
	})
	};
}

function neighbors(objects) {
	var indexesByArc = {}, // arc index -> array of object indexes
		neighbors = objects.map(function() { return []; });

	function line(arcs, i) {
	arcs.forEach(function(a) {
		if (a < 0) a = ~a;
		var o = indexesByArc[a];
		if (o) o.push(i);
		else indexesByArc[a] = [i];
	});
	}

	function polygon(arcs, i) {
	arcs.forEach(function(arc) { line(arc, i); });
	}

	function geometry(o, i) {
	if (o.type === "GeometryCollection") o.geometries.forEach(function(o) { geometry(o, i); });
	else if (o.type in geometryType) geometryType[o.type](o.arcs, i);
	}

	var geometryType = {
	LineString: line,
	MultiLineString: polygon,
	Polygon: polygon,
	MultiPolygon: function(arcs, i) { arcs.forEach(function(arc) { polygon(arc, i); }); }
	};

	objects.forEach(geometry);

	for (var i in indexesByArc) {
	for (var indexes = indexesByArc[i], m = indexes.length, j = 0; j < m; ++j) {
		for (var k = j + 1; k < m; ++k) {
		var ij = indexes[j], ik = indexes[k], n;
		if ((n = neighbors[ij])[i = bisect(n, ik)] !== ik) n.splice(i, 0, ik);
		if ((n = neighbors[ik])[i = bisect(n, ij)] !== ij) n.splice(i, 0, ij);
		}
	}
	}

	return neighbors;
}

function compareArea(a, b) {
	return a[1][2] - b[1][2];
}

function minAreaHeap() {
	var heap = {},
		array = [],
		size = 0;

	heap.push = function(object) {
	up(array[object._ = size] = object, size++);
	return size;
	};

	heap.pop = function() {
	if (size <= 0) return;
	var removed = array[0], object;
	if (--size > 0) object = array[size], down(array[object._ = 0] = object, 0);
	return removed;
	};

	heap.remove = function(removed) {
	var i = removed._, object;
	if (array[i] !== removed) return; // invalid request
	if (i !== --size) object = array[size], (compareArea(object, removed) < 0 ? up : down)(array[object._ = i] = object, i);
	return i;
	};

	function up(object, i) {
	while (i > 0) {
		var j = ((i + 1) >> 1) - 1,
			parent = array[j];
		if (compareArea(object, parent) >= 0) break;
		array[parent._ = i] = parent;
		array[object._ = i = j] = object;
	}
	}

	function down(object, i) {
	while (true) {
		var r = (i + 1) << 1,
			l = r - 1,
			j = i,
			child = array[j];
		if (l < size && compareArea(array[l], child) < 0) child = array[j = l];
		if (r < size && compareArea(array[r], child) < 0) child = array[j = r];
		if (j === i) break;
		array[child._ = i] = child;
		array[object._ = i = j] = object;
	}
	}

	return heap;
}

function presimplify(topology, triangleArea) {
	var absolute = transformAbsolute(topology.transform),
		relative = transformRelative(topology.transform),
		heap = minAreaHeap();

	if (!triangleArea) triangleArea = cartesianTriangleArea;

	topology.arcs.forEach(function(arc) {
	var triangles = [],
		maxArea = 0,
		triangle,
		i,
		n,
		p;

	// To store each point鈥檚 effective area, we create a new array rather than
	// extending the passed-in point to workaround a Chrome/V8 bug (getting
	// stuck in smi mode). For midpoints, the initial effective area of
	// Infinity will be computed in the next step.
	for (i = 0, n = arc.length; i < n; ++i) {
		p = arc[i];
		absolute(arc[i] = [p[0], p[1], Infinity], i);
	}

	for (i = 1, n = arc.length - 1; i < n; ++i) {
		triangle = arc.slice(i - 1, i + 2);
		triangle[1][2] = triangleArea(triangle);
		triangles.push(triangle);
		heap.push(triangle);
	}

	for (i = 0, n = triangles.length; i < n; ++i) {
		triangle = triangles[i];
		triangle.previous = triangles[i - 1];
		triangle.next = triangles[i + 1];
	}

	while (triangle = heap.pop()) {
		var previous = triangle.previous,
			next = triangle.next;

		// If the area of the current point is less than that of the previous point
		// to be eliminated, use the latter's area instead. This ensures that the
		// current point cannot be eliminated without eliminating previously-
		// eliminated points.
		if (triangle[1][2] < maxArea) triangle[1][2] = maxArea;
		else maxArea = triangle[1][2];

		if (previous) {
		previous.next = next;
		previous[2] = triangle[2];
		update(previous);
		}

		if (next) {
		next.previous = previous;
		next[0] = triangle[0];
		update(next);
		}
	}

	arc.forEach(relative);
	});

	function update(triangle) {
	heap.remove(triangle);
	triangle[1][2] = triangleArea(triangle);
	heap.push(triangle);
	}

	return topology;
}

var version = "1.6.27";

exports.version = version;
exports.mesh = mesh;
exports.meshArcs = meshArcs;
exports.merge = merge;
exports.mergeArcs = mergeArcs;
exports.feature = feature;
exports.neighbors = neighbors;
exports.presimplify = presimplify;

Object.defineProperty(exports, '__esModule', { value: true });

})));
},{}]},{},[1]);