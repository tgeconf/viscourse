var margin = {top: 30, right: 120, bottom: 0, left: 120},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var hBar_x = d3.scaleLinear()
    .range([0, width]);

var barHeight = 20;

var hBar_color = d3.scaleOrdinal()
    .range(["steelblue", "#ccc"]);

var duration = 750,
    delay = 25;

var partition = d3.partition();//.size([400, 200]);
    // .value(function(d) { return d.size; });



var hBar_xAxis = d3.axisTop(hBar_x);

var hBar_svg = d3.select("#hBarContainer")
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

hBar_svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", up);

hBar_svg.append("g")
    .attr("class", "hBar_x axis");

hBar_svg.append("g")
    .attr("class", "y axis")
  .append("line")
    .attr("y1", "100%");

d3.json("data/readme.json", function(error, data) {
  if (error) throw error;

  //partition.nodes(root);
  var root = d3.hierarchy(data)
  root.sum(function(d) {
    return d.size;
  });
  partition(root);

  hBar_x.domain([0, root.value]).nice();
  down(root, 0);
});

function down(d, i) {
  if (!d.children || this.__transition__) return;
  var end = duration + d.children.length * delay;

  // Mark any currently-displayed bars as exiting.
  var exit = hBar_svg.selectAll(".enter")
      .attr("class", "exit");

  // Entering nodes immediately obscure the clicked-on bar, so hide it.
  exit.selectAll("rect").filter(function(p) { return p === d; })
      .style("fill-opacity", 1e-6);

  // Enter the new bars for the clicked-on data.
  // Per above, entering bars are immediately visible.
  var enter = bar(d)
      .attr("transform", stack(i))
      .style("opacity", 1);

  // Have the text fade-in, even though the bars are visible.
  // hBar_color the bars as parents; they will fade to children if appropriate.
  enter.select("text").style("fill-opacity", 1e-6);
  enter.select("rect").style("fill", hBar_color(true));

  // Update the hBar_x-scale domain.
  hBar_x.domain([0, d3.max(d.children, function(d) { return d.value; })]).nice();

  // Update the hBar_x-axis.
  hBar_svg.selectAll(".hBar_x.axis").transition()
      .duration(duration)
      .call(hBar_xAxis);

  // Transition entering bars to their new position.
  var enterTransition = enter.transition()
      .duration(duration)
      .delay(function(d, i) { return i * delay; })
      .attr("transform", function(d, i) { return "translate(0," + barHeight * i * 1.2 + ")"; });

  // Transition entering text.
  enterTransition.select("text")
      .style("fill-opacity", 1);

  // Transition entering rects to the new hBar_x-scale.
  enterTransition.select("rect")
      .attr("width", function(d) { return hBar_x(d.value); })
      .style("fill", function(d) { return hBar_color(!!d.children); });

  // Transition exiting bars to fade out.
  var exitTransition = exit.transition()
      .duration(duration)
      .style("opacity", 1e-6)
      .remove();

  // Transition exiting bars to the new hBar_x-scale.
  exitTransition.selectAll("rect")
      .attr("width", function(d) { return hBar_x(d.value); });

  // Rebind the current node to the background.
  hBar_svg.select(".background")
      .datum(d)
    .transition()
      .duration(end);

  d.index = i;
}

function up(d) {
  console.log(d);
  if (!d.parent || this.__transition__) return;
  var end = duration + d.children.length * delay;

  // Mark any currently-displayed bars as exiting.
  var exit = hBar_svg.selectAll(".enter")
      .attr("class", "exit");

  // Enter the new bars for the clicked-on data's parent.
  var enter = bar(d.parent)
      .attr("transform", function(d, i) { return "translate(0," + barHeight * i * 1.2 + ")"; })
      .style("opacity", 1e-6);

  // hBar_color the bars as appropriate.
  // Exiting nodes will obscure the parent bar, so hide it.
  enter.select("rect")
      .style("fill", function(d) { return hBar_color(!!d.children); })
    .filter(function(p) { return p === d; })
      .style("fill-opacity", 1e-6);

  // Update the hBar_x-scale domain.
  hBar_x.domain([0, d3.max(d.parent.children, function(d) { return d.value; })]).nice();

  // Update the hBar_x-axis.
  hBar_svg.selectAll(".hBar_x.axis").transition()
      .duration(duration)
      .call(hBar_xAxis);

  // Transition entering bars to fade in over the full duration.
  var enterTransition = enter.transition()
      .duration(end)
      .style("opacity", 1);

  // Transition entering rects to the new hBar_x-scale.
  // When the entering parent rect is done, make it visible!
  enterTransition.select("rect")
      .attr("width", function(d) { return hBar_x(d.value); })
      .each("end", function(tt) { 
        console.log(tt); console.log(d); 
        if (tt === d){
          console.log("equal"); 
          d3.select(this).style("fill-opacity", null);
        } 
      });

  // Transition exiting bars to the parent's position.
  var exitTransition = exit.selectAll("g").transition()
      .duration(duration)
      .delay(function(d, i) { return i * delay; })
      .attr("transform", stack(d.index));

  // Transition exiting text to fade out.
  exitTransition.select("text")
      .style("fill-opacity", 1e-6);

  // Transition exiting rects to the new scale and fade to parent hBar_color.
  exitTransition.select("rect")
      .attr("width", function(d) { return hBar_x(d.value); })
      .style("fill", hBar_color(true));

  // Remove exiting nodes when the last child has finished transitioning.
  exit.transition()
      .duration(end)
      .remove();

  // Rebind the current parent to the background.
  hBar_svg.select(".background")
      .datum(d.parent)
    .transition()
      .duration(end);
}

// Creates a set of bars for the given data node, at the specified index.
function bar(d) {
  var bar = hBar_svg.insert("g", ".y.axis")
      .attr("class", "enter")
      .attr("transform", "translate(0,5)")
    .selectAll("g")
      .data(d.children)
    .enter().append("g")
      .style("cursor", function(d) { return !d.children ? null : "pointer"; })
      .on("click", down);

  bar.append("text")
      .attr("x", -6)
      .attr("y", barHeight / 2)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d.data.name; });

  bar.append("rect")
      .attr("width", function(d) { return hBar_x(d.value); })
      .attr("height", barHeight);

  return bar;
}

// A stateful closure for stacking bars horizontally.
function stack(i) {
  var x0 = 0;
  return function(d) {
    var tx = "translate(" + x0 + "," + barHeight * i * 1.2 + ")";
    x0 += hBar_x(d.value);
    return tx;
  };
}