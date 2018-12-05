let tracts;
let numberByCT;
let numberBySpecies;
loadData().then(showData);

function total(record) {
    return parseInt(record.Fair) + parseInt(record.Good) + parseInt(record.Poor);
}

function loadData() {
    return Promise.all([
        d3.json("data/tracts.geo.json"),
        d3.csv("data/num_by_ct.csv"),
        d3.csv("data/num_by_spc.csv")
    ]).then(datasets => {
        tracts = datasets[0];
        numberByCT = datasets[1];
        numberBySpecies = datasets[2];
    });
}
function showData() {
    //console.log(tracts.features[2])
    //console.log(numberBySpecies[2])
    
    let width = 600;
    let height = 400;
    let width_map = 800;
    let margin = {
        top: 10,
        bottom: 30,
        left: 100,
        right: 10
    };
    let bodyHeight = height - margin.top - margin.bottom;
    let bodyWidth = width - margin.left - margin.right;
    
    let green = "rgb(20, 108, 54)";
    let yellow = "rgb(244, 209, 102)";
    
    let container;
    let projection = d3.geoMercator();
    projection.scale(width_map * 100)
        .center([-73.98, 40.707])
        .translate([width_map / 2, width_map / 2]);
    let path = d3.geoPath(projection);
    
    container = d3.select("#density");
    container
        .attr("width", width_map)
        .attr("height", width_map)
    // Set an array of colors from yellow to green
    var color = d3.scaleLinear()
        .domain([0, 100])
        .range([yellow, green]);
    container.selectAll("path").data(tracts.features)
        .enter().append("path")
        .attr("d", path) // Use the path generator to draw each tract
        .attr("stroke", "#000")
        .attr("stroke-width", width_map / 2500)
        .attr("fill", (d, i) => {
            // Find the record of this tract
            numberByCTRow = numberByCT.find(e => e.boro_ct == d.properties.boro_ct2010);
            // If not found, leave it gray
            if (numberByCTRow === undefined) {
                return "#ddd";
            }
            number = total(numberByCTRow);
            density = number / parseFloat(d.properties.shape_area);
            // Set color accoring to the density. The max of density is 0.000265
            // A 0.75 exponent is set so that there will be more green (data near 1)
            return color(Math.floor(Math.pow(density / 0.000265, 0.75)  * 100));
        })
    
    container = d3.select("#species");
    container
        .attr("width", width)
        .attr("height", height)
    numberBySpecies.sort((a, b) => total(b) - total(a));
    // Display top 10 species only
    top10 = numberBySpecies.slice(0, 10);
    let xScale = d3.scaleLinear()
        .range([0, bodyWidth])
        // Max of count 
        .domain([0, total(top10[0])]);
    let yScale = d3.scaleBand()
        .range([0, bodyHeight])
        // Covert to a list of species
        .domain(top10.map(a => a.spc_common))
        .padding(0.2);
    container.append("g")
        .style("transform", `translate(${margin.left}px, ${margin.top}px)`)
        .selectAll(".bar")
        .data(top10)
        // Adding a rect tag for each species
        .enter().append("rect")
        .attr("height", yScale.bandwidth())
        .attr("y", d => yScale(d.spc_common))
        .attr("width", d => xScale(total(d)))
        .attr("fill", color(80))
    container.append("g")
        .style("transform", `translate(${margin.left}px, ${height - margin.bottom}px)`)
        .call(d3.axisBottom(xScale).ticks(5))
    container.append("g")
        .style("transform", `translate(${margin.left}px, ${margin.top}px)`)
        .call(d3.axisLeft(yScale))
}