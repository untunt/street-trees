let tracts;
let counts;
let popularSpcByCT;
let filtered;
let countMax;
let usingDensity = true;
let setColorMethod;

function highlightColorInSpecies(d, index, barsOnly=false) {
    if (index < 0) {
        return;
    }
    setColorInSpecies(d, true, barsOnly);
    setColorInOneSpecies(index, getSpeciesColor(index), barsOnly);
}

function setColorInSpecies(d, highlight=false, barsOnly=false) {
    for (i = -1; i < 10; i++) {
        color = getSpeciesColor(i);
        if (highlight) {
            color = d3.hsl(color);
            color.opacity = 0.2;
            color.s *= 0.5;
        }
        setColorInOneSpecies(i, color, barsOnly);
    }
}

function setColorInOneSpecies(index, color, barsOnly=false) {
    d3.select("#map").select("rect.species" + index)
        .attr("fill", color);
    if (!barsOnly) {
        d3.select("#map").selectAll("path.species" + index)
            .attr("fill", color);
    }
}

function setColorInBars(d, i, paths, highlight) {
    index = Number(paths[i].classList.value.substr(7));
    if (index < 0) {
        return;
    }
    setColorInSpecies(d, highlight, true);
    color = getSpeciesColor(index);
    if (highlight) {
        color = d3.color(color).brighter(0.5);
    }
    setColorInOneSpecies(index, color, true);
    paths[i].attributes.fill.value = color;
}

function setColor() {
    setColorMethod();
}

function setColorByCount() {
    max = d3.max(filtered, d => d.count);
    paths = d3.select("#map").selectAll("path.tract")._groups[0];
    paths.forEach(d => {
        row = filtered.find(e => e.boro_ct2010 == d.__data__.properties.boro_ct2010);
        if (row === undefined) {
            color = undefinedColor;
        } else {
            color = mapColor(row.count, max);
        }
        d.setAttribute("fill", color);
    });
}

function setColorByDensity() {
    max = d3.max(filtered.map(d => {
        tract = tracts.find(e => e.properties.boro_ct2010 == d.boro_ct2010);
        return d.count / parseFloat(tract.properties.shape_area);
    }));
    paths = d3.select("#map").selectAll("path.tract")._groups[0];
    paths.forEach(d => {
        row = filtered.find(e => e.boro_ct2010 == d.__data__.properties.boro_ct2010);
        if (row === undefined) {
            color = undefinedColor;
        } else {
            color = mapColor(row.count / parseFloat(d.__data__.properties.shape_area), max);
        }
        d.setAttribute("fill", color);
    });
}

function setColorByPercent() {
    alls = filterData();
    paths = d3.select("#map").selectAll("path.tract")._groups[0];
    paths.forEach(d => {
        row = filtered.find(e => e.boro_ct2010 == d.__data__.properties.boro_ct2010);
        all = alls.find(e => e.boro_ct2010 == d.__data__.properties.boro_ct2010);
        if (row === undefined) {
            color = undefinedColor;
        } else {
            color = mapColor(row.count / all.count, 1);
        }
        d.setAttribute("fill", color);
    });
}

function filterData(spc="all", street="all") {
    return counts.filter(e => e.spc_common == spc && e.street_suffix == street);
}

function loadData(dir) {
    return Promise.all([
        d3.json(`${dir}tracts.geo.json`),
        d3.csv(`${dir}num_by_spc&st.csv`, d => {
            d.count = parseInt(d.count);
            return d;
        }),
        d3.csv(`${dir}num_by_spc.csv`),
        d3.csv(`${dir}pop_by_ct.csv`),
        d3.csv(`${dir}pct_by_st.csv`, d => {
            d.percent = parseFloat(d.percent);
            return d;
        })
    ]).then(datasets => {
        i = 0;
        tracts = datasets[i++].features;
        counts = datasets[i++];
        numberBySpecies = datasets[i++];
        popularSpcByCT = datasets[i++];
        percentByStreets = datasets[i++];
    });
    counts.forEach((d, i) => counts[i].count = parseInt(d.count));
}

function showData() {
    formalizeIntro();
    
    setColorMethod = setColorByDensity;
    container = d3.select("#map");
    width = container.node().getBoundingClientRect().width;
    height = container.node().getBoundingClientRect().height;
    margin = {
        top: 40,
        bottom: 10,
        left: 130,
        right: 10
    };
    bodyWidth = height * 0.5;
    bodyHeight = height * 0.4;
    drawTop10();
    drawMap();
    setColorInSpecies();
    
    margin = {
        top: height * 0.4,
        bottom: 10,
        left: height * 1.25,
        right: 200
    };
    bodyHeight = height - margin.top - margin.bottom;
    bodyWidth = bodyHeight / 2;
    drawStreetPlot();
    
    bodyHeight = 200;
    bodyWidth = 20;
    margin.top = 200;
    margin.right = 60;
    margin.left = width - margin.right - bodyWidth;
    rangeSize = bodyHeight;
    rangeArray = [...Array(bodyHeight).keys()];
    yScale = d3.scaleLinear()
        .range([0, bodyHeight])
        .domain([0, 62.38]);
    // Gradient bar (legend)
    container.append("g")
        .style("transform", `translate(${margin.left}px, ${margin.top}px)`)
        .selectAll(".bar")
        .data(rangeArray)
        .enter().append("rect")
        .attr("y", d => d)
        .attr("height", 1)
        .attr("width", bodyWidth)
        .attr("fill", d => colorRange(d, rangeSize));
    container.append("g")
        .style("transform", `translate(${margin.left + bodyWidth}px, ${margin.top}px)`)
        .call(d3.axisRight(yScale).ticks(5));
        // text label for the x axis
    container.append("text")
        .style("transform", `translate(${margin.left + bodyWidth * 2}px, ${margin.top + bodyHeight * 1.07}px)`)
        .text("%");
    container.append("text")
        .style("transform", `translate(${margin.left + bodyWidth}px, ${margin.top - bodyHeight * 0.07}px)`)
        .style("text-anchor", "middle")
        .text("Percent in Row");
    
    container = d3.select("#count");
    width = container.node().getBoundingClientRect().width;
    height = container.node().getBoundingClientRect().height;
    margin = {
        top: 10,
        bottom: 30,
        left: 70,
        right: 10
    };
    bodyHeight = height - margin.top - margin.bottom;
    bodyWidth = width - margin.left - margin.right;
    drawCountByBoro();
}

function drawTop10() {
    numberBySpecies.sort((a, b) => total(b) - total(a));
    // Display top 10 species only
    top10 = numberBySpecies.slice(0, 10);
    // Covert to a list of species
    top10Species = top10.map(a => a.spc_common);
    xScale = d3.scaleLinear()
        .range([0, bodyWidth])
        // Max of count 
        .domain([0, total(top10[0])]);
    yScale = d3.scaleBand()
        .range([0, bodyHeight])
        .domain(top10Species);
    container.append("g")
        .style("transform", `translate(${margin.left}px, ${margin.top}px)`)
        .selectAll(".bar")
        .data(top10)
        // Adding a rect tag for each species
        .enter().append("rect")
        .attr("height", yScale.bandwidth())
        .attr("y", d => yScale(d.spc_common))
        .attr("width", d => xScale(total(d)))
        .attr("class", (d, i) => "species" + i)
        .attr("onclick", (d, i) => `showIntro(${i})`)
        .attr("cursor", "pointer")
        // Register mouse over and out events
        .on("mouseover", (d, i) => {
            filtered = filterData(spc=d.spc_common);
            setColor();
        })//highlightColorInSpecies(d, i))
        .on("mouseout", d => {
            filtered = filterData();
            setColor();
        });
    container.append("g")
        .style("transform", `translate(${margin.left}px, ${margin.top}px)`)
        .call(d3.axisTop(xScale).ticks(5));
    container.append("g")
        .attr("class", "yScale")
        .style("transform", `translate(${margin.left}px, ${margin.top}px)`)
        .call(d3.axisLeft(yScale));
    container.select(".yScale").selectAll("text")
        .attr("onclick", (d, i) => `showIntro(${i})`)
        .attr("cursor", "pointer");
}

function drawMap() {
    projection = d3.geoMercator();
    projection.scale(height * 100)
        .center([-73.98, 40.707])
        .translate([height * 0.7, height * 0.5]);
    path = d3.geoPath(projection);
    
    container.selectAll("path").data(tracts)
        .enter().append("path")
        .attr("d", path) // Use the path generator to draw each tract
        .attr("stroke", strokeColor)
        .attr("stroke-width", height / 2500)
        .attr("class", d => {
            // Find the record of this tract
            popularSpcByCTRow = popularSpcByCT.find(e => e.boro_ct2010 == d.properties.boro_ct2010);
            if (popularSpcByCTRow === undefined) {
                index = -1;
            } else {
                index = getSpeciesIndex(popularSpcByCTRow.species, top10Species);
            }
            //console.log(index)
            return "tract species" + index;
        })
        .on("mouseover", (d, i, paths) => setColorInBars(d, i, paths, true))
        .on("mouseout", (d, i, paths) => setColorInBars(d, i, paths, false));
}

function drawButtons() {
    
}

function drawStreetPlot() {
    streetSuffixes = percentByStreets.map(d => d["suffix"]);
    // Get unique
    streetSuffixes.filter((d, i, s) => s.indexOf(d) === i);
    xScale = d3.scaleBand()
        .range([0, bodyWidth])
        .domain(top10Species);
    yScale = d3.scaleBand()
        .range([0, bodyHeight])
        .domain(streetSuffixes);
    percentMax = d3.max(percentByStreets, d => parseFloat(d.percent))
    container.append("g")
        .style("transform", `translate(${margin.left}px, ${margin.top}px)`)
        .selectAll(".bar")
        .data(percentByStreets)
        .enter().append("rect")
        .attr("y", d => yScale(d.suffix))
        .attr("height", yScale.bandwidth())
        .attr("x", d => xScale(d.spc_common))
        .attr("width", xScale.bandwidth())
        .attr("fill", d => colorRange(mapColor(d.percent, percentMax)))
        .attr("stroke", d => colorRange(mapColor(d.percent, percentMax)))
        .attr("stroke-width", 0.5);
    container.append("g")
        .style("transform", `translate(${margin.left}px, ${margin.top}px)`)
        .call(d3.axisTop(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .attr("dx", "0.2em")
        .attr("dy", "-0.2em")
        .style("text-anchor", "start");
    container.append("g")
        .style("transform", `translate(${margin.left + bodyWidth}px, ${margin.top}px)`)
        .call(d3.axisRight(yScale));
}

function drawCountByBoro() {
    boroName = ["0", "Manhattan", "Bronx", "Brooklyn", "Queens", "Staten Island"];
    boroCount = [0, 0, 0, 0, 0, 0];
    filtered = filterData();
    filtered.forEach(a => {
        // The first digit is borough numeric code
        boroCount[a.boro_ct2010[0]] += a.count;
    });
    xScale = d3.scaleBand()
        .range([0, bodyWidth])
        .domain(boroName.slice(1))
        .padding(0.1);
    yScale = d3.scaleLinear()
        .range([bodyHeight, 0])
        .domain([0, d3.max(boroCount)]);
    container.append("g")
        .style("transform", `translate(${margin.left}px, ${margin.top}px)`)
        .selectAll(".bar")
        .data(boroCount.slice(1))
        // Adding a rect tag for each borough
        .enter().append("rect")
        .attr("y", d => yScale(d))
        .attr("height", d => yScale(0) - yScale(d))
        .attr("x", (d, i) => xScale(boroName[i + 1]))
        .attr("width", xScale.bandwidth())
        .attr("fill", colorRange(90));
    container.append("g")
        .style("transform", `translate(${margin.left}px, ${height - margin.bottom}px)`)
        .call(d3.axisBottom(xScale).ticks(5));
    container.append("g")
        .style("transform", `translate(${margin.left}px, ${margin.top}px)`)
        .call(d3.axisLeft(yScale));
    // Insert the sum into HTML
    document.getElementById("sum").innerHTML = d3.sum(boroCount).toLocaleString();
}

function formalizeIntro() {
    // Formalize each line in species intro
    titles = ["Binomial Name", "Name in Chinese", null, "Date", "Tree ID", "Address", "Trunk Diameter"]
    for (i = 0; i < 10; i++) {
        d = document.getElementById("species" + i);
        ps = d.getElementsByTagName("p");
        if (ps.length < titles.length) {
            continue;
        }
        newItem = document.createElement("span");
        newItem.innerHTML = `<a href="#map" class="back-to">Back to <span class="figure-number">Figure 3</span></a>`;
        d.insertBefore(newItem, ps[0]);
        ps[4].innerHTML = `<a href="https://tree-map.nycgovparks.org/#treeinfo-${ps[4].innerHTML}" title="view this tree in NYC Street Tree Map" target="_blank">${ps[4].innerHTML}</a>`
        titles.forEach((title, j) => {
            if (title) {
                ps[j].innerHTML = "<strong>" + title + ":</strong> " + ps[j].innerHTML;
            }
        });
        ps[6].innerHTML = `${ps[6].innerHTML} inches`;
    }
    hideIntro();
}
