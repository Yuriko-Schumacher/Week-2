const margin = { t: 50, r: 50, b: 50, l: 50 };
const size = { w: 800, h: 800 };
const svg = d3.select("svg");

// defining a container group
// which will contain everything within the SVG
// we can transform it to make things everything zoomable
const containerG = svg.append("g").classed("container", true);
let mapData, popData, hexbinPopData;
let radiusScale, projection, hexbin, hexbinG;

svg.attr("width", size.w).attr("height", size.h);

let zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", zoomed);
svg.call(zoom);

Promise.all([
	d3.json("data/maps/us-states.geo.json"),
	d3.csv("data/us_county.csv"),
]).then(function (datasets) {
	mapData = datasets[0];
	popData = datasets[1];

	// --------- DRAW MAP ----------
	// creating a group for map paths
	let mapG = containerG.append("g").classed("map", true);

	// defining a projection that we will use
	projection = d3.geoAlbersUsa().fitSize([size.w, size.h], mapData);
	popData = popData.filter((d) => projection([d.long, d.lat]));

	// defining a geoPath function
	let path = d3.geoPath(projection);

	// adding county paths
	mapG.selectAll("path")
		.data(mapData.features)
		.enter()
		.append("path")
		.attr("d", function (d) {
			return path(d);
		});

	// --------- DRAW HEXBINS ----------

	// divide the data into bins
	popData.forEach((d) => {
		d.position = projection([d.long, d.lat]);
	});
	console.log(popData[0]);
	// divide the data into bins
	hexbinG = containerG.append("g").classed("hexbin", true);
	drawHexbins();
});

function drawHexbins(scale = 1) {
	// defining a hexbin function
	// that will create bins for us
	let hexbin = d3
		.hexbin()
		.size([size.w, size.h])
		.x((d) => d.position[0])
		.y((d) => d.position[1])
		.radius(20 / scale); // how many dots at the maximum

	// create the bins with the tabular/csv data
	let hexbinPopData = hexbin(popData);
	console.log(hexbinPopData[0]);

	// calculating mean population for each bin
	// so we can adjust the radius
	hexbinPopData.forEach((bucket) => {
		bucket.meanPop = d3.mean(bucket, (d) => +d.population);
		bucket.meanAge = d3.mean(bucket, (d) => +d.median_age);
	});
	console.log(hexbinPopData[0]);

	// create scale
	let sizeScale = d3
		.scaleSqrt()
		.domain(d3.extent(hexbinPopData, (d) => d.meanPop))
		.range([1, 20 / scale]); // doing this because we need to redefine the scales

	let colorScale = d3
		.scaleSequential()
		.domain(d3.extent(hexbinPopData, (d) => d.meanAge))
		.interpolator(d3.interpolatePlasma);

	// we need to make path to make hexiagon
	hexbinG
		.selectAll("path")
		.data(hexbinPopData)
		.join("path")
		.attr("transform", (d) => `translate(${d.x}, ${d.y})`)
		.attr("d", (d) => hexbin.hexagon(sizeScale(d.meanPop)))
		.style("fill", (d) => colorScale(d.meanAge));
}

function zoomed(event) {
	let transform = event.transform;
	containerG.attr("transform", transform);
	containerG.attr("stroke-width", 1 / transform.k);

	drawHexbins(transform.k);
}
