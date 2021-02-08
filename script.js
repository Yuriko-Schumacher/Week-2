const margin = { t: 50, r: 50, b: 50, l: 50 };
const size = { w: 800, h: 800 };
const svg = d3.select("svg");

// defining a container group
// which will contain everything within the SVG
// we can transform it to make things everything zoomable
const containerG = svg.append("g").classed("container", true);
let mapData, popData, projection, bubblesG, radiusScale;

let zoom = d3
	.zoom()
	.scaleExtent([1, 8]) // how much to zoom scale 1 to 10?
	.on("zoom", zoomed);
svg.call(zoom); // zoom(svg); <-> .call() works on "this" function

svg.attr("width", size.w).attr("height", size.h);

Promise.all([
	d3.json("data/maps/us-states.geo.json"),
	d3.csv("data/us_county.csv"),
]).then(function (datasets) {
	mapData = datasets[0];
	popData = datasets[1];
	popData.forEach((d) => {
		d.population = +d.population;
	});

	// --------- DRAW MAP ----------
	// creating a group for map paths
	let mapG = containerG.append("g").classed("map", true);

	// defining a projection that we will use
	projection = d3.geoAlbersUsa().fitSize([size.w, size.h], mapData);
	popData = popData.filter((d) => projection([d.long, d.lat])); // get rid of invalid valued after passing into the projection function

	// defining a geoPath function
	let path = d3.geoPath(projection);
	console.log(path); // path... path generator

	// adding county paths
	mapG.selectAll("path")
		.data(mapData.features)
		.enter()
		.append("path")
		.attr("d", function (d) {
			return path(d);
		});

	// DRAW BUBBLES
	bubblesG = containerG.append("g").classed("bubbles", true);

	// we need two scales (x, y) and each circles radius
	radiusScale = d3
		.scaleSqrt()
		.domain(d3.extent(popData, (d) => +d.population))
		.range([1, 20]);

	drawBubbles();
});

function drawBubbles(zoomScale = 1) {
	// you can decide the first argument, second arguments, etc.
	let bubblesSelection = bubblesG.selectAll("circle").data(popData);

	bubblesSelection
		.join("circle")
		.attr("cx", 0)
		.attr("cy", 0)
		.attr("transform", function (d) {
			// translate(x, y)
			return `translate(${projection([d.long, d.lat])})`;
		})
		.attr("r", (d) => radiusScale(+d.population) / zoomScale);
}

// zoom functions becoms really long, so put it till the very end
function zoomed(event) {
	// scrolling and double clicks
	// console.log("zoomed", event); // event.transform: what is the scale of the change... k = the scale of the zoom right now
	// event.transform = { x: zoomin in x axis, y: zooming in the y axis, k: zooming in the both axes }

	// 2x
	containerG.attr("transform", event.transform); // calculate transform scale automatically. you can also pan the map too... the stroke also zooms in...
	containerG.attr("stroke-width", 1 / event.transform.k); // devide it by the scale of the zooming in
	drawBubbles(event.transform.k);
}
