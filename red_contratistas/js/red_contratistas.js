//Canvas dimensions and margins
var width = 800,
    height = 800;

var margin = {
    top: 50,
    bottom: 50,
    left: 50,
    right: 50,
}


//Creation of a categorical color scale for the nodes according to their group membership (Requires d3 Chromatic library)
var color = d3.scaleOrdinal(d3.schemeDark2);
var colorGroup = ["entidad", "contratista"];
var numberFormat = d3.format(",d");

//Creation of the SVG canvas to draw in
var svgRedContratistas = d3.select("#red_contratistas")
						   .append("svg")
						   .attr("width", width)
						   .attr("height", height)
						   .append("g")
						   .attr("transform", "translate(" + margin.top + ", " + margin.left + ")");


//Redefining the effective drawing area
width = width - margin.left - margin.right;
height = height - margin.top - margin.bottom;

//Creation of the simulation parameters: Creation of the forces that will mandate the simulation
var forceSimulation = d3.forceSimulation()
						.force("collide", d3.forceCollide().radius(function(d) {return 5})) //Prevents nodes from overlapping
						.force("radial", d3.forceRadial(function(d) { return (d.group == "entidad") ? -30 : 200; })//.y(height/2).x(width/2)) //Sends contratistas to the outside
						.force("link", d3.forceLink().id(function(d) { return (d.id) })) //Provides link forces to the nodes connected between them
						.force("center", d3.forceCenter((width / 2), (height / 2)));


//Read the JSON formatted data
d3.json("datasets/red_contratistas.json", function(error, data) {
  if (error) throw error;

  //Variables containing nodes and edges
  var nodes = data.nodes;
  var edges = data.edges;

  //Creation of the size scale for the nodes
  var nodeSize = d3.scaleLinear().domain(d3.extent(nodes.map(function(d) { return +d.cuantiaContratos; })))
  							 	 .range([1,20])

  //Adding the nodes to the canvas

  var drawingNodes = svgRedContratistas.selectAll(".node")
  					   .data(nodes)
  					   .enter()
  					   .append("g")
  					   .filter(function(d){ if(d.cuantiaContratos > 2000000000){return this} });

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
//  	  			  .on("mouseover", mouseOver(.2))
//  	  			  .on("mouseout", mouseOut);


  	  drawingNodes.append("title")
  	  			  .text(function(d) { if(d.group == "contratista") {return "Nombre: " + d.name + "\n" + "Cuantía total acumulada devengada: " + numberFormat(d.cuantiaContratos) + "\n" + "Tipo: Contratista";} 
  	  									else {return "Nombre: " + d.name + "\n" + "Cuantía total acumulada otorgada: " + numberFormat(d.cuantiaContratos) + "\n" + "Tipo: Entidad contratante";} });			  

  //Carrying out the simulation
  forceSimulation.nodes(nodes).on("tick", ticked);
//  forceSimulation.force("link").links(edges);


  

  //Ticked function to establish the simulation behavior
	function ticked() {
		drawingNodes.attr("transform", positionNode);
        drawingLinks.attr("d", positionLink);

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

    //Function to draw links between entidades and contratistas
    function positionLink(d) {
        var offset = 30;

        var midpoint_x = (d.source.x + d.target.x) / 2;
        var midpoint_y = (d.source.y + d.target.y) / 2;

        var dx = (d.target.x - d.source.x);
        var dy = (d.target.y - d.source.y);

        var normalise = Math.sqrt((dx * dx) + (dy * dy));

        var offSetX = midpoint_x + offset*(dy/normalise);
        var offSetY = midpoint_y - offset*(dx/normalise);

        return "M" + d.source.x + "," + d.source.y +
            "S" + offSetX + "," + offSetY +
            " " + d.target.x + "," + d.target.y;
    }


   //Functions that define the drag actions
      function dragstarted(d) {
      if (!d3.event.active) forceSimulation.alphaTarget(0.2).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended(d) {
      if (!d3.event.active) forceSimulation.alphaTarget(0.03);
      d.fx = null;
      d.fy = null;
    }

   //Functions related to link placement
    
    //This function builds a dictionary of links and nodes
    var linkedByIndex = {};
    edges.forEach(function(d) {
        linkedByIndex[d.source + "," + d.target] = 1;
    });

    // check the dictionary to see if nodes are linked
    function isConnected(a, b) {
        return linkedByIndex[a.id + "," + b.id] || linkedByIndex[b.id + "," + a.id] || a.id === b.id;
    }
  
  //Fits a linear width scale for the links on mouseover
//  var min_width = 0.3,
//      max_width = 5,  
//      scale_converter = d3.scaleLinear().domain([d3.min(edges, function(d){return d.weight}),d3.max(edges, function(d){return d.weight})]).range([min_width,max_width]);
  
    // fade nodes on hover
    function mouseOver(opacity) {
        return function(d) {
            // check all other nodes to see if they're connected
            // to this one. if so, keep the opacity at 1, otherwise
            // fade
            drawingNode.style("stroke-opacity", function(o) { 
              thisOpacity = isConnected(d, o) ? 1 : opacity;
                return thisOpacity;
            });
            drawingNode.style("fill-opacity", function(o) {
                thisOpacity = isConnected(d, o) ? 1 : opacity;
                return thisOpacity;
            });
            // also style link accordingly
            drawingLinks.style("stroke-opacity", function(o) {
                return o.source === d || o.target === d ? 1 : opacity;
            });
           // drawingLinks.style("stroke", function(o){
           //     return o.source === d || o.target === d ? color(proteinType.indexOf(o.source.type)) : "#ddd";
           // });
            //drawingLinks.style("stroke-width", function(o){return scale_converter(o.weight)});          
        };
    }

    //Restore original colors and opacity after mouse out
        function mouseOut() {
            drawingNode.style("stroke-opacity", 1);
            drawingNode.style("fill-opacity", 1);
            drawingLinks.style("stroke-opacity", 1);
            drawingLinks.style("stroke", "#ddd");
          	drawingLinks.style("stroke-width", 1);
        }
      


});

