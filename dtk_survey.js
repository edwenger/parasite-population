// TODO: access timesteps range from survey JSON?  in this case it is 365.

// TODO: get day from input file name?  in this case it is Day830 where t=0 is Jan 1st, 2010.
var DateZero = new Date(2015, 1, 1);
DateZero.setDate(DateZero.getDate() + 645);
var dateFormat = d3.time.format("%d %b '%y");

// Various accessors that specify the four dimensions of data to visualize.
function x(d)      { return d.parasites; }
function y(d)      { return d.gametocytes; }
function radius(d) { return d.infectiousness; }
function key(d)    { return d.name; }

function color(d) {
    if (d.fever > 38.5) { return d.fever - 37; }
    else if (d.rdt == 0) { return -1; }
    else if (d.gametocytes == 0) { return -2; }
    else { return 0; }
}

// Chart dimensions.
var margin = {top: 24, right: 129.5, bottom: 25, left: 75},
    width  = 650 - margin.right, //note dangling x-axis tick labels
    height = 500 - margin.top - margin.bottom;

// Various scales. These domains make assumptions of data, naturally.
var xScale = d3.scale.log().clamp(true).domain([1e-3, 8e5]).range([0, width]),//.nice(),
    yScale = d3.scale.log().clamp(true).domain([1e-2, 1e4]).range([height, 0]).nice(),
    radiusScale = d3.scale.sqrt().domain([0, 1]).range([3, 8]);

// Colormap for prevalence points
var colorScale = d3.scale.quantize()
                         .domain([-1, 3])
                         .range(colorbrewer.OrRd[9]);

// The x & y axes.
var xAxis = d3.svg.axis().orient("bottom").scale(xScale).ticks(5, d3.format(",0.1f")),
    yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(5, d3.format(",0.1f"));

// Create the SVG container and set the origin.
var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Create the SVG container for the date counter
var svgdate = d3.select("#date").append("svg")
    .attr("width", 360)
    .attr("height", 75)
  .append("g");

// Add the x-axis.
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

// Add the y-axis.
svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

// Add an x-axis label.
svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height - 6)
    .text("asexual parasite density (1/uL)");

// Add a y-axis label.
svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", 6)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text("gametocyte density (1/uL)");

// Add the year label; the value is set on transition.
var label = svgdate.append("text")
    .attr("class", "year label")
    .attr("text-anchor", "end")
    .attr("y", 75-24)
    .attr("x", 360)
    .text(dateFormat(DateZero));

// Load the data.
//var scenario = 'perfect_MSAT';
//var scenario = 'perfect_health_seeking';
var scenario = 'baseline';

d3.json("dtk/output/" + scenario + "/MalariaSurveyJSONAnalyzer_Day_645_0.json", function (survey) {

    // Add a dot per nation. Initialize the data at t=0, and set the colors.
    var shapes = svg.append("g")
        .attr("class", "shapes")
      .selectAll(".shape")
        .data(interpolateData(0))
      .enter()

    .append("circle")
        // .filter(function(d){ return d.age > 5})
        .attr("class", "shape")
        .style("fill", function (d) { return colorScale(color(d)); })
        .style("opacity", 0.5)

    // .append("rect")
    //     .filter(function(d){ return d.age <= 5})
    //     .attr("class", "shape")
    //     .style("fill", function (d) { return colorScale(color(d)); })
    //     .style("opacity", 0.5)

    .call(position)
        .sort(order);

    // Add a title.
    shapes.append("title")
        .text(function(d) { return d.name; });

    // Add an overlay for the year label.
    var box = label.node().getBBox();
    var overlay = svgdate.append("rect")
          .attr("class", "overlay")
          .attr("x", box.x)
          .attr("y", box.y)
          .attr("width", box.width)
          .attr("height", box.height)
          .on("mouseover", enableInteraction);

    // Start a transition that interpolates the data based on year.
    svg.transition()
        .duration(100000)
        .ease("linear")
        .tween("year", tweenYear)
        .each("end", enableInteraction);

    // Positions the dots based on data.
    function position(shape) {

        // if circle
        shape.attr("cx", function(d) { return xScale(x(d)); })
            .attr("cy", function(d) { return yScale(y(d)); })
            .attr("r", function (d) { return radiusScale(radius(d)); })

            // if rect
            .attr("x", function(d) { return xScale(x(d)); })
            .attr("y", function(d) { return yScale(y(d)); })
            .attr("height", function (d) { return radiusScale(radius(d)); })
            .attr("width", function (d) { return radiusScale(radius(d)); })

            .style("fill", function (d) { return colorScale(color(d)); });
    }

    // Defines a sort order so that the smallest dots are drawn on top.
    function order(a, b) {
        return radius(b) - radius(a);
    }

    // After the transition finishes, you can mouseover to change the year.
    function enableInteraction() {
        var yearScale = d3.scale.linear()
            .domain([0, 365-2])
            .range([box.x + 10, box.x + box.width - 10])
            .clamp(true);

        // Cancel the current transition, if any.
        svg.transition().duration(0);

        overlay
            .on("mouseover", mouseover)
            .on("mouseout",  mouseout )
            .on("mousemove", mousemove)
            .on("touchmove", mousemove);

        function mouseover() {
            label.classed("active", true);
        }

        function mouseout() {
            label.classed("active", false);
        }

        function mousemove() {
            displayYear(yearScale.invert(d3.mouse(this)[0]));
        }

        // TODO: restart the current transition on mouseclick?
    }

    // Tweens the entire chart by first tweening the year, and then the data.
    // For the interpolated data, the dots and label are redrawn.
    function tweenYear() {
        var year = d3.interpolateNumber(0, 365-2);
        return function(t) { displayYear(year(t)); };
    }

    // Updates the display to show the specified year.
    function displayYear(year) {
        shapes.data(interpolateData(year), key).call(position).sort(order);
        var tmpDate = new Date(DateZero.getTime());
        tmpDate.setDate(tmpDate.getDate() + year);
        label.text(dateFormat(tmpDate));
    }

    // Interpolates the dataset for the given (fractional) year.
    function interpolateData(year) {
        return survey.patient_array.map(function (d) {
            return {
                name: 'Patient #' + d.id,
                age: Math.floor(d.initial_age/ 365),
                parasites: interpolateValues2(d.true_asexual_parasites, year, true),
                gametocytes: interpolateValues2(d.true_gametocytes, year, true),
                infectiousness: interpolateValues2(d.infectiousness, year, false),
                fever: interpolateValues2(d.temps, year, false),
                rdt: interpolateValues2(d.rdt, year, true)
            };
        });
    }

    // Finds (and possibly interpolates) the value for the specified year.
    function interpolateValues(values, year) {
        var i = Math.floor(year);

        if (i >= values.length) {
            return 0;
        }

        var a = values[i];

        if (i > 0) {
            var b = values[i - 1],
                dt = (year - i);
            return a * (1 - dt) + b * dt;
        }
        return a;
    }

    // Same as above but skipping odd days to avoid epileptic seizures
    function interpolateValues2(values, year, isLog) {
        var i = Math.floor(year);
        if ((i % 2) !=0 ) {
            i -= 1;
        }

        if (i >= values.length) {
            return 0;
        }

        var a = values[i];

        if (i > 1) {
            var b = values[i-2],
                dt = (year - i) / 2.0;
            if (isLog) { return Math.exp(Math.log(a) * dt + Math.log(b) * (1 - dt)); } // log-log plot
            else { return a * (dt) + b * (1 - dt); }
        }
        return a;
    }
});
