let tracts;
let counts;
let popularSpcByCT;
let filtered;
let filteredMax;
let percentMax;
let usingDensity = true;
let setColors = [setColorByDensity, setColorByPercent, setColorByCount, setColorBySpecies];
let setColorIndex;
let buttonNames = ["Density", "Percent", "Count", "Popular Species"];

function setColor(something) {
    filteredMax = filterMax();
    setColors[setColorIndex](something);
}

function setSpcColorOfOneSpecies(index, color, barsOnly) {
    d3.select("#map").select("rect.species" + index)
        .attr("fill", color);
    if (!barsOnly) {
        d3.select("#map").selectAll("path.species" + index)
            .attr("fill", color);
    }
}

function hoverTract(i, paths, isMouseOn) {
    index = Number(paths[i].classList.value.substr(-1));
    if (setColorIndex != 3) {
        boroCt = paths[i].__data__.properties.boro_ct2010
        if (isMouseOn) {
            filtered = filterData(null, null, boroCt);
        } else {
            filtered = filterData();
        }
        drawTop10(true, isMouseOn);
        drawBars(false, true, isMouseOn);
        return;
    }
    if (index < 0) {
        return;
    }
    setColorBySpecies(-1, true);
    colorThis = getSpeciesColor(index);
    if (isMouseOn) {
        colorThis = d3.color(colorThis).brighter(0.5);
        setColorBySpecies(index, true);
        setSpcColorOfOneSpecies(index, colorThis, true);
    }
    paths[i].attributes.fill.value = colorThis;
}

function setButtonColor() {
    for (i = 0; i < 4; i++) {
        d3.select("#map").select("rect.button" + i)
            .attr("fill", undefinedColor);
        d3.select("#map").select("text.button" + i)
            .attr("fill", "inherit");
    }
    d3.select("#map").select("rect.button" + setColorIndex)
        .attr("fill", mapColor(90, 100));
    d3.select("#map").select("text.button" + setColorIndex)
        .attr("fill", "#eee");
}

function setButtonOverColor(className) {
    d3.select("#map").select("rect." + className)
        .attr("fill", "#aaa");
    d3.select("#map").select("text." + className)
        .attr("fill", "#eee");
}

function setColorMethod(index) {
    setColorIndex = index;
    setColor();
    setButtonColor();
    drawBars(true);
}

function setColorBySpecies(highlight=-1, barsOnly=false) {
    for (i = -1; i < 10; i++) {
        color = getSpeciesColor(i);
        if (highlight >= 0 && i != highlight) {
            color = d3.hsl(color);
            color.opacity = 0.2;
            color.s *= 0.5;
        }
        setSpcColorOfOneSpecies(i, color, barsOnly);
    }
}

function filterMax() {
    if (setColorIndex == 0) {
        return d3.max(filtered, d => {
            tract = tracts.find(e => e.properties.boro_ct2010 == d.boro_ct2010);
            return d.count / parseFloat(tract.properties.shape_area);
        });
    }
    if (setColorIndex == 1) {
        return 100;
    }
    if (setColorIndex == 2) {
        return d3.max(filtered, d => d.count)
    }
    return 0;
}

function setColorByCount() {
    paths = d3.select("#map").selectAll("path.tract")._groups[0];
    paths.forEach(d => {
        row = filtered.find(e => e.boro_ct2010 == d.__data__.properties.boro_ct2010);
        if (row === undefined) {
            color = undefinedColor;
        } else {
            color = mapColor(row.count, filteredMax);
        }
        d.setAttribute("fill", color);
    });
}

function setColorByDensity() {
    paths = d3.select("#map").selectAll("path.tract")._groups[0];
    paths.forEach(d => {
        row = filtered.find(e => e.boro_ct2010 == d.__data__.properties.boro_ct2010);
        if (row === undefined) {
            color = undefinedColor;
        } else {
            color = mapColor(row.count / parseFloat(d.__data__.properties.shape_area), filteredMax);
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

function filterData(spc="all", street="all", boroCt=null) {
    result = counts;
    if (spc != null) {
        result = result.filter(e => e.spc_common == spc);
    }
    if (street != null) {
        result = result.filter(e => e.street_suffix == street);
    }
    if (boroCt != null) {
        result = result.filter(e => e.boro_ct2010 == boroCt);
    }
    return result;
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
    
    width = null;
    height = null;
    margin = null;
    bodyWidth = null;
    bodyHeight = null;
    
    filtered = filterData();
    setColorIndex = 0;
    container = d3.select("#map");
    setMarginSpecies();
    
    numberBySpecies.sort((a, b) => total(b) - total(a));
    // Display top 10 species only. Covert to a list of species
    top10Species = numberBySpecies.slice(0, 10).map(a => a.spc_common);
    drawTop10();
    drawMap();
    setColor();
    
    setMarginStreet();
    drawStreetPlot();
    
    drawBars();
    drawButtons();
    setButtonColor();
    
    container = d3.select("#count");
    width = 600;
    height = 400;
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

function setMarginSpecies() {
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
}

function setMarginStreet() {
    width = container.node().getBoundingClientRect().width;
    height = container.node().getBoundingClientRect().height;
    margin = {
        top: 130,
        bottom: 120,
        left: height * 1.25,
        right: 200
    };
    bodyHeight = (height - margin.top) * 0.75;
    bodyWidth = bodyHeight / 2;
}

function drawTop10(redraw=false, isMouseOn=false) {
    if (redraw) {
        container = d3.select("#map")
        d3.select("#map").selectAll("g.top10").remove();
        setMarginSpecies();
    }
    top10Count = [];
    if (isMouseOn) {
        temp = filtered;
    } else {
        temp = filterData(null, "all");
    }
    for (i = 0; i < 10; i++) {
        top10Count.push(d3.sum(temp.filter(e => e.spc_common == top10Species[i]).map(e => e.count)));
    }
    xScale = d3.scaleLinear()
        .range([0, bodyWidth])
        // Max of count 
        .domain([0, d3.max(top10Count)]);
    yScale = d3.scaleBand()
        .range([0, bodyHeight])
        .domain(top10Species);
    container.append("g")
        .attr("class", "top10")
        .style("transform", `translate(${margin.left}px, ${margin.top}px)`)
        .selectAll(".bar")
        .data(top10Count)
        // Adding a rect tag for each species
        .enter().append("rect")
        .attr("height", yScale.bandwidth())
        .attr("y", (d, i) => yScale(top10Species[i]))
        .attr("width", d => xScale(d))
        .attr("class", (d, i) => "species" + i)
        // Register mouse over and out events
        .on("mouseover", (d, i) => {
            filtered = filterData(top10Species[i]);
            setColorBySpecies(i, true);
            setColor(i);
            drawBars(true, false, true);
        })
        .on("mouseout", d => {
            filtered = filterData();
            setColorBySpecies(-1, true);
            setColor(-1);
            drawBars(true, false, false);
        });
    setColorBySpecies(-1, true);
    container.append("g")
        .attr("class", "top10")
        .style("transform", `translate(${margin.left}px, ${margin.top}px)`)
        .call(d3.axisTop(xScale).ticks(5));
    container.append("g")
        .attr("class", "yScale top10")
        .style("transform", `translate(${margin.left}px, ${margin.top}px)`)
        .call(d3.axisLeft(yScale));
    container.select(".yScale").selectAll("text")
        .attr("class", "a-anchor")
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
            return "tract species" + index;
        })
        .on("mouseover", (d, i, paths) => hoverTract(i, paths, true))
        .on("mouseout", (d, i, paths) => hoverTract(i, paths, false));
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
        .attr("fill", d => mapColor(d.percent, percentMax))
        .attr("stroke", d => mapColor(d.percent, percentMax))
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

function drawBars(redraw1=false, redraw2=false, isMouseOn=false) {
    if (setColorIndex == 3) {
        return;
    }
    /*    container.selectAll(".bar1")._groups[0][0].style = "visibility: hidden";
        container.selectAll(".bar1-text").remove();
        container.selectAll(".bar2-text").remove();
        return;
    }
    if (container.selectAll(".bar1")._groups[0].length > 0) {
        container.selectAll(".bar1")._groups[0][0].style = "visibility: visible";
    }*/
    
    // Gradient bars (legends)
    barWidth = 20;
    barLength = parseInt(height * 0.3);
    barArray = [...Array(barLength).keys()];
    legendNames = ["Trees / 1,000 ft²", "%", "Trees", ""]
    
    setMarginSpecies();
    max = filterMax();
    if (setColorIndex == 0) {
        max *= 1000;
    }
    yScale = d3.scaleLinear()
        .range([0, barLength])
        .domain([0, max]);
    if (redraw1) {
        container.selectAll(".bar1-text").remove();
    } else if (!redraw2) {
        container.append("g")
            .style("transform", `translate(${margin.top * 2}px, ${height - margin.bottom * 6 - barLength}px)`)
            .attr("class", "bar1")
            .selectAll()
            .data(barArray)
            .enter().append("rect")
            .attr("y", d => d)
            .attr("height", 1)
            .attr("width", barWidth)
            .attr("fill", d => mapColor(d, barLength));
    }
    if (redraw1 || (!redraw1 && !redraw2)) {
        container.append("text")
            .style("transform", `translate(${margin.top * 2}px, ${height - margin.bottom * 6 - barLength - 20}px)`)
            .attr("class", "bar1-text")
            .style("text-anchor", "middle")
            .text(buttonNames[setColorIndex]);
        container.append("g")
            .style("transform", `translate(${margin.top * 2}px, ${height - margin.bottom * 6 - barLength}px)`)
            .attr("class", "bar1-text")
            .call(d3.axisLeft(yScale).ticks(5));
        container.append("text")
            .style("transform", `translate(${margin.top * 2}px, ${height - margin.bottom * 6 + 20}px)`)
            .attr("class", "bar1-text")
            .style("text-anchor", "middle")
            .text(legendNames[setColorIndex]);
    }
    
    setMarginStreet();
    xScale = d3.scaleLinear()
        .range([0, barLength])
        .domain([0, percentMax]);
    if (redraw2) {
        container.selectAll(".bar2-text").remove();
    } else if (!redraw1) {
        container.append("g")
            .style("transform", `translate(${margin.left}px, ${height - margin.bottom}px)`)
            .selectAll()
            .data(barArray)
            .enter().append("rect")
            .attr("x", d => d)
            .attr("width", 1)
            .attr("height", barWidth)
            .attr("fill", d => mapColor(d, barLength));
        container.append("text")
            .style("transform", `translate(${margin.left + barLength + 10}px, ${height - margin.bottom + barWidth + 20}px)`)
            .text("%");
        container.append("text")
            .attr("class", "bar2")
            .style("transform", `translate(${margin.left + barLength / 2 + 5}px, ${height - margin.bottom + barWidth + 40}px)`)
            .style("text-anchor", "middle")
            .text("Percent of Species in each Street Suffix (in each Row)");
        container.append("text")
            .style("transform", `translate(${width}px, 20px)`)
            .style("text-anchor", "end")
            .text("Does different kind of streets prefer different tree species?");
    }
    if (redraw2 || (!redraw1 && !redraw2)) {
        container.append("g")
            .style("transform", `translate(${margin.left}px, ${height - margin.bottom + barWidth}px)`)
            .attr("class", "bar2-text")
            .call(d3.axisBottom(xScale).ticks(5));
    }
}

function drawButtons() {
    x = width * 0.33;
    y = height - 50;
    pace = 70;
    container.append("text")
        .style("transform", `translate(${x}px, ${y}px)`)
        .style("text-anchor", "middle")
        .text("Color by:");
    for (i = 0; i < 4; i++) {
        x += pace;
        container.append("rect")
            .attr("class", "button" + i)
            .attr("y", y - 15)
            .attr("height", 22)
            .attr("x", x - pace * 0.4)
            .attr("width", pace * 0.8)
            .attr("fill", undefinedColor)
            .attr("onclick", `setColorMethod(${i})`)
            .on("mouseover", (d, e, f) => setButtonOverColor(f[0].classList.value))
            .on("mouseout", setButtonColor);
        if (i == 3) {
            x += pace * 0.4;
        }
        container.append("text")
            .attr("class", "button" + i)
            .style("transform", `translate(${x}px, ${y}px)`)
            .style("text-anchor", "middle")
            .attr("onclick", `setColorMethod(${i})`)
            .attr("cursor", "pointer")
            .text(buttonNames[i])
            .on("mouseover", (d, e, f) => setButtonOverColor(f[0].classList.value))
            .on("mouseout", setButtonColor);
        if (i != 1) {
            container.append("text")
                .attr("class", "a-anchor")
                .style("transform", `translate(${x}px, ${y + 30}px)`)
                .style("text-anchor", "middle")
                .attr("onclick", `showIntro2(${i})`)
                .attr("cursor", "pointer")
                .text("View Intro");
        }
    }
    d3.select("rect.button3").attr("width", pace * 1.6);
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
        .attr("fill", mapColor(90, 100));
    container.append("g")
        .style("transform", `translate(${margin.left}px, ${height - margin.bottom}px)`)
        .call(d3.axisBottom(xScale).ticks(5));
    container.append("g")
        .style("transform", `translate(${margin.left}px, ${margin.top}px)`)
        .call(d3.axisLeft(yScale));
    // Insert the sum into HTML
    document.getElementById("sum").innerHTML = d3.sum(boroCount).toLocaleString();
}
