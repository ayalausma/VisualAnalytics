//Canvas dimensions and margins
var width = 800,
    height = 800;

var margin = {
    top: 50,
    bottom: 50,
    left: 50,
    right: 50,
}

var linkOpacity = 0.1;

//Redefining the effective drawing area
width = width - margin.left - margin.right;
height = height - margin.top - margin.bottom;

//Creation of a categorical color scale for the nodes according to their group membership (Requires d3 Chromatic library)
var color = d3.scaleOrdinal(d3.schemeDark2);
var colorGroup = ["entidad", "contratista"];
var numberFormat = d3.format(",d");

//Creation of the SVG canvas to draw in
var svgRedContratistas = d3.select("#red_contratistas")
						               .append("svg")
						               .attr("width", width)
						               .attr("height", height)
						               .append("g");

//Creation of the simulation parameters: Creation of the forces that will mandate the simulation
var forceSimulation = d3.forceSimulation()
						.force("collide", d3.forceCollide().radius(function(d) {return (d.group == "entidad") ? 15 : 3;})) //Prevents nodes from overlapping
						.force("radial", d3.forceRadial(function(d) { return (d.group == "entidad") ? -40 : 300; }).y(height/2).x(width/2)) //Sends contratistas to the outside
						.force("link", d3.forceLink().id(function(d) { return (d.id) }).strength(0.001)) //Provides link forces to the nodes connected between them
            .force("center", d3.forceCenter((width / 2), (height / 2)));


//Read the JSON formatted data
d3.json("datasets/red_contratistas.json", function(error, data) {
  if (error) throw error;

  //Variables containing nodes and edges
  var nodes = data.nodes;
  var edges = data.links;

  //Creation of the links of the simulation
  var drawingLinks = svgRedContratistas.selectAll(".link")
                       .data(edges)
                       .enter()
                       .append("path")
                       .attr("class", "line")
                       .attr("id", function (d, i) { return i; })
                       .attr("fill", "#615")
                       .attr("stroke-width", 1)
                       .attr("opacity", linkOpacity)
                       .filter(function (d) {if(d.CuantiaContrato > 10000000000) {return this};});


  //Creation of the size scale for the nodes
  var nodeSize = d3.scaleLinear().domain(d3.extent(nodes.map(function(d) { return +d.cuantiaContratos; })))
  							 	 .range([2,40])

  console.log(nodeSize);

  //Adding the nodes to the canvas
  var drawingNodes = svgRedContratistas.selectAll(".node")
  					                           .data(nodes)
  					                           .enter()
  					                           .append("g");

  	  drawingNodes.append("circle")
  	  			      .attr("class","node")
  	  			      .attr("id", function(d) {return d.id})
  	  			      .attr("r", function(d) {return nodeSize(d.cuantiaContratos)})
  	  			      .attr("fill", function(d) {return color(colorGroup.indexOf(d.group))})
  	  			      .attr("stroke", "#fff")
  	  			      .call(d3.drag()
  	  			  	   .on("start", dragstarted)
  	  			  	   .on("drag", dragged)
  	  			  	   .on("end", dragended))
                  .on("mouseover", mouseOver(0.2))
                  .on("mouseout", mouseOut);

  	  drawingNodes.append("title")
  	  			      .text(function(d) { if(d.group == "contratista") {return "Nombre: " + d.name + "\n" + "Cuantía total acumulada devengada: " + numberFormat(d.cuantiaContratos) + "\n" + "Tipo: Contratista";} 
  	  									else {return "Nombre: " + d.name + "\n" + "Cuantía total acumulada otorgada: " + numberFormat(d.cuantiaContratos) + "\n" + "Tipo: Entidad contratante";} });			  

  //Carrying out the simulation
  forceSimulation.nodes(nodes).on("tick", ticked);
  forceSimulation.force("link").links(edges);

  //Ticked function to establish the simulation behavior
	function ticked() {
    drawingLinks.attr("d", positionLink)
		drawingNodes.attr("transform", positionNode);
	}
  
  //Builds a dictionary of nodes that are linked
    var linkedByIndex = {};
    edges.forEach(function(d) {
        linkedByIndex[d.source.name + "," + d.target.name] = 1;
    });
    
   //Check the dictionary to see if nodes are linked
    function isConnected(a, b) {
        return linkedByIndex[a.name + "," + b.name] || linkedByIndex[b.name + "," + a.name] || a.name === b.name;
    }

  function positionLink(d) {
      var offset = 2;

      var midpoint_x = (d.source.x + d.target.x) / 2;
      var midpoint_y = (d.source.y + d.target.y) / 2;

      var dx = (d.target.x - d.source.x);
      var dy = (d.target.y - d.source.y);

      var normalise = Math.sqrt((dx * dx) + (dy * dy));

      var offSetX = midpoint_x + offset*(dx/normalise);
      var offSetY = midpoint_y - offset*(dy/normalise);

      return "M" + d.source.x + "," + d.source.y +
          "S" + offSetX + "," + offSetY +
          " " + d.target.x + "," + d.target.y;
  }

  //Function to define the node position within the boundaries of the SVG canvas
    function positionNode(d) {          
      	if (d.x < 0) {
            d.x = 0
        };
        if (d.y < 0) {
            d.y = 0
        };
        if (d.x > width) {
            d.x = width
        };
        if (d.y > height) {
            d.y = height
        };
   
        return "translate(" + d.x + "," + d.y + ")";
    }

   //Functions that define the drag actions
      function dragstarted(d) {
      if (!d3.event.active) forceSimulation.alphaTarget(0).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended(d) {
      if (!d3.event.active) forceSimulation.alphaTarget(0.1);
      d.fx = null;
      d.fy = null;
    }
  
        // fade nodes on hover
        function mouseOver(opacity) {
            return function(d) {
                // check all other nodes to see if they're connected
                // to this one. if so, keep the opacity at 1, otherwise
                // fade
                drawingNodes.style("stroke-opacity", function(o) { 
                  thisOpacity = isConnected(d, o) ? 1 : opacity;
                    return thisOpacity;
                });
                drawingNodes.style("fill-opacity", function(o) {
                    thisOpacity = isConnected(d, o) ? 1 : opacity;
                    return thisOpacity;
                }); 
            
                drawingNodes.append("text")
                            .filter(function(o) { connected = isConnected(d,o); if(connected == true) return this;})
                            .attr("class", "nodeLabel")
                            .attr("x", function(o) { connected = isConnected(d,o); if(connected == true) return o.x; })
                            .attr("y", function(o) { connected = isConnected(d,o); if(connected == true) return o.y; })
                            .text(function(o) { return o.name });

                // also style link accordingly
                drawingLinks.style("opacity", function(o) {
                    return o.source === d || o.target === d ? 1 : 0;
                });

                drawingLinks.style("stroke", function(o){
                    return o.source === d || o.target === d ? "#615" : "#000";
                }); 

            };
        }

    //Restore original colors and opacity after mouse out
        function mouseOut() {
            drawingNodes.style("stroke-opacity", 1);
            drawingNodes.style("fill-opacity", 1);
            drawingNodes.selectAll("text.nodeLabel").remove();
            drawingLinks.style("opacity", linkOpacity);
            drawingLinks.style("stroke", "#615");
            drawingLinks.style("stroke-width", 1);
            tooltip.style("opacity", 0)
        }
      


});

