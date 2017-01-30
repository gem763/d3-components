/*!
 * Core modules
 */

// D3 components
d3.components = {};

// Default plotting options
d3.defaultOptions = {
  id: 'chart',
  renderer: 'svg',
  responsive: true,
  width: 300,
  aspectRatio: 0.618034,
  color: '#1f77b4',
  colorScheme: d3.schemeCategory10,
  stroke: 'none',
  strokeWidth: 1,
  fontSize: 14,
  lineHeight: 20,
  title: {
    show: false,
    x: '50%',
    y: '1.6em',
    height: '2em',
    wrapText: true,
    wrapWidth: '90%',
    lineHeight: '2em',
    fontSize: '1.4em',
    fontWeight: 'bold',
    textAnchor: 'middle',
    text: ''
  },
  tooltip: {
    show: true,
    style: {
      display: 'none',
      boxSizing: 'border-box',
      position: 'absolute',
      pointerEvents: 'none',
      padding: '0.2em 0.6em',
      backgroundColor: '#fff',
      border: '1px solid #999',
      borderRadius: '0.2em',
      fontSize: '85%',
      opacity: 0.8
    }
  },
  legend: {
    symbol: {
      width: '1.294427em',
      height: '0.8em'
    },
    dx: '0.5em',
    transform: 'scale(0.85)',
    lineHeight: '1.6em',
    textColor: '#333',
    disabledTextColor: '#ccc',
    updateInPlace: true
  }
};

// Parse plotting data
d3.parseData = function (plot, data) {
  var component = d3.components[plot];
  var schema = component.schema || {};
  var hierarchy = schema.hierarchy;
  if (Array.isArray(data)) {
    // Normalize data structure
    data = data.filter(function (d) {
      return d !== null && d !== undefined;
    }).map(function (d, i) {
      if (Array.isArray(d)) {
        d = d.map(function (datum) {
          if (!datum.hasOwnProperty('series')) {
            datum.series = String(i);
          }
          return datum;
        });
        return d3.parseData(plot, d);
      }
      if (d3.type(d) !== 'object') {
        return {
          index: String(i),
          value: d
        };
      }
      return d;
    });

    // Set up field mapping
    if (schema.type === 'object') {
      var entries = schema.entries;
      data = data.map(function (d) {
        var keys = Object.keys(d);
        entries.forEach(function (entry) {
          var key = entry.key;
          var type = entry.type;
          var mapping = null;
          if (d.hasOwnProperty(key)) {
            if (key === hierarchy && type === 'array') {
              d[hierarchy] = d3.parseData(plot, d[hierarchy]);
            }
            keys.splice(keys.indexOf(key), 1);
            mapping = key;
          } else {
            var mappings = entry.mappings || [];
            mappings.some(function (m) {
              var i = keys.indexOf(m);
              if (i !== -1) {
                keys.splice(i, 1);
                mapping = m;
                return true;
              }
              return false;
            });
            if (mapping === null) {
              keys.some(function (k) {
                if (d3.type(d[k]) === type) {
                  mapping = k;
                  return true;
                }
                return false;
              });
            }
          }
          if (mapping) {
            var value = d[mapping];
            if (type === 'string') {
              value = String(value);
            } else if (type === 'number') {
              value = Number(value);
            } else if (type === 'date') {
              value = new Date(value);
            }
            d[key] = value;
          }
        });
        return d;
      });
    }
    return [].concat.apply([], data);
  }

  return d3.parseData(plot, [data])[0];
};

// Parse plotting options
d3.parseOptions = function (plot, options) {
  // Set default component options
  var component = d3.components[plot];
  options = d3.extend(component, options);

  // Set default plotting options
  var defaults = d3.defaultOptions;
  var id = options.id || defaults.id;
  var canvas = d3.select('#' + id);
  if (defaults.responsive && !options.hasOwnProperty('responsive')) {
    if (!options.hasOwnProperty('width')) {
      var width = parseInt(canvas.style('width')) || defaults.width;
      options.width = Math.round(width);
    }
    if (!options.hasOwnProperty('height')) {
      var aspectRatio = options.aspectRatio || defaults.aspectRatio;
      var height = parseInt(canvas.style('height')) || (options.width * aspectRatio);
      options.height = Math.round(height);
    }
    if (!options.hasOwnProperty('fontSize')) {
      options.fontSize = parseInt(canvas.style('font-size'));
    }
    if (!options.hasOwnProperty('lineHeight')) {
      options.lineHeight = parseInt(canvas.style('line-height'));
    }
  }
  options = d3.extend(defaults, options);

  // Set the margins
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;
  var margin = d3.extend({
    top: lineHeight,
    right: 2 * fontSize,
    bottom: 2 * lineHeight,
    left: 4 * fontSize
  }, options.margin);
  options.margin = margin;
  options.innerWidth = options.width - margin.left - margin.right;
  options.innerHeight = options.height - margin.top - margin.bottom;

  // Set the tooltip
  var chart = canvas.node();
  var tooltip = d3.extend({
    id: id + '-tooltip'
  }, options.tooltip);
  options.tooltip = tooltip;
  chart.style.position = 'relative';
  if (tooltip.show) {
    var tooltipId = tooltip.id;
    var tooltipStyle = tooltip.style;
    var tooltipNode = d3.select('#' + tooltipId).node();
    if (tooltipNode === null) {
      tooltipNode = document.createElement('div');
      tooltipNode.id = tooltipId;
      tooltipNode.className = 'tooltip';
      for (var key in tooltipStyle) {
        if (tooltipStyle.hasOwnProperty(key)) {
          tooltipNode.style[key] = tooltipStyle[key];
        }
      }
      if (chart.tagName === 'CANVAS') {
        chart.parentNode.insertBefore(tooltipNode, chart);
      } else {
        chart.appendChild(tooltipNode);
      }
    }
  }

  // Set the context
  options.chart = chart;
  if (chart.tagName === 'CANVAS') {
    options.renderer = 'canvas';
    canvas = chart;
  }
  if (options.renderer === 'canvas') {
    if (chart.tagName !== 'CANVAS') {
      canvas = document.createElement('canvas');
      chart.appendChild(canvas);
    }
    canvas.width = options.width;
    canvas.height = options.height;
    options.context = canvas.getContext('2d');
  } else {
    options.context = null;
  }

  // Parse option values
  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      options[key] = d3.parseValue(options[key], options);
    }
  }

  // Parse map config
  if (options.hasOwnProperty('map')) {
    var map = options.map || {};
    var name = map.name || 'world';
    options.map = d3.extend(d3.maps[name], map);
  }

  return options;
};

// Parse value within a context
d3.parseValue = function (value, context) {
  var type = d3.type(value);
  if (type === 'object') {
    for (var key in value) {
      if (value.hasOwnProperty(key)) {
        value[key] = d3.parseValue(value[key], context);
      }
    }
  } else if (type === 'string') {
    if (/^\-?\d+\.?\d*(px)$/.test(value)) {
      value = Number(value.replace('px', ''));
    } else if (/^\-?\d+\.?\d*(em)$/.test(value)) {
      if (context.hasOwnProperty('fontSize')) {
        value = Number(value.replace('em', '')) * context.fontSize;
      }
    } else if (/^\-?\d+\.?\d*\%$/.test(value)) {
      if (context.hasOwnProperty('width')) {
        value = Number(value.replace('%', '')) * context.width / 100;
      }
    } else if (/^(a|de)scending\(\w+\)$/.test(value)) {
      var parts = value.split(/\W/);
      var order = parts[0];
      var key = parts[1];
      value = function (a, b) {
        if (a.hasOwnProperty(key) && b.hasOwnProperty(key)) {
          return d3[order](a[key], b[key]);
        }
        if (a.data && b.data) {
          return d3[order](a.data[key], b.data[key]);
        }
        return 0;
      };
    }
  }
  return value;
};

// Get the type of a value
d3.type = function (value) {
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
};

// Combine two objects with deep copy
d3.extend = function (object1, object2) {
  var object = {};
  if (d3.type(object1) === 'object') {
    for (var key in object1) {
      if (object1.hasOwnProperty(key)) {
        var value = object1[key];
        if (d3.type(value) === 'object') {
          value = d3.extend(object[key], value);
        }
        object[key] = value;
      }
    }
  }
  if (d3.type(object2) === 'object') {
    for (var key in object2) {
      if (object2.hasOwnProperty(key)) {
        var value = object2[key];
        if (d3.type(value) === 'object') {
          value = d3.extend(object[key], value);
        }
        object[key] = value;
      }
    }
  }
  return object;
};

// Generate a translation transform
d3.translate = function (dx, dy) {
  return 'translate(' + dx + ',' + dy + ')';
};

// Generate the points of a regular polygon
d3.regularPolygon = function (n, r) {
  var theta = 2 * Math.PI / n;
  return d3.range(n).map(function (i) {
    var angle = theta * i;
    return [r * Math.sin(angle), -r * Math.cos(angle)];
  });
};

// Set an axis
d3.setAxis = function (scale, options) {
  var axis = d3.axisBottom(scale);
  var orient = options.orient;
  if (orient === 'top') {
    axis = d3.axisTop(scale);
  } else if (orient === 'left') {
    axis = d3.axisLeft(scale);
  } else if (orient === 'right') {
    axis = d3.axisRight(scale);
  }
  axis.ticks(options.ticks)
      .tickSizeInner(options.tickSizeInner)
      .tickSizeOuter(options.tickSizeOuter)
      .tickPadding(options.tickPadding);
  if (options.tickFormat !== '') {
    axis.tickFormat(d3.format(options.tickFormat));
  } else {
    axis.tickFormat('');
  }
  return axis;
};

// Create a plot
d3.createPlot = function (chart, options) {
  // Create the `svg` element
  var width = options.width;
  var height = options.height;
  var svg = d3.select(chart)
              .append('svg')
              .attr('class', options.type)
              .attr('width', width);

  // Set the title
  var titleHeight = 0;
  var title = options.title;
  if (title.show) {
    var t = svg.append('text')
               .attr('class', 'title')
               .attr('x', title.x)
               .attr('y', title.y)
               .attr('font-size', title.fontSize)
               .attr('font-weight', title.fontWeight)
               .attr('text-anchor', title.textAnchor)
               .text(title.text)
               .call(d3.wrapText, title);
    var lines = Math.ceil(t.node().getComputedTextLength() / title.wrapWidth);
    titleHeight = lines * title.lineHeight;
  }
  title.height = titleHeight;

  // Create the container
  var transform = d3.translate(width / 2, height / 2 + titleHeight);
  var g = svg.attr('height', height + titleHeight)
             .append('g')
             .attr('class', 'container')
             .attr('transform', transform)
             .attr('stroke', options.stroke)
             .attr('stroke-width', options.strokeWidth);

  return {
    svg: svg,
    container: g
  };
};

// Get the position relative to the SVG container
d3.getPosition = function (selection) {
    var node = d3.select(selection).node();
    var position = node.getBoundingClientRect();
    var svgPosition = getSVGPosition(node);

    // Get the SVG position
    function getSVGPosition(node) {
      if(node.parentElement.tagName === 'svg') {
        return node.parentElement.getBoundingClientRect();
      }
      return getSVGPosition(node.parentElement);
    }

    return {
        top: position.top - svgPosition.top,
        bottom: position.bottom - svgPosition.top,
        right: position.right - svgPosition.left,
        left: position.left - svgPosition.left,
        width: position.width,
        height: position.height
    };

};

// Set the tooltip
d3.setTooltip = function (chart, options) {
  if (options.show) {
    var tooltip = d3.select('#' + options.id);
    var lineHeight = parseInt(tooltip.style('line-height'));
    var hoverTarget = options.hoverTarget;
    var hoverEffect = options.hoverEffect;
    hoverTarget.on('mouseover', function (d) {
      var position = d3.mouse(chart);
      var left = position[0];
      var top = position[1];
      tooltip.attr('class', 'tooltip')
             .style('display', 'block')
             .html(options.html(d));
      if (isNaN(left) || isNaN(top)) {
        var offsetX = parseInt(tooltip.style('width')) / 2;
        var offsetY = parseInt(tooltip.style('height')) + lineHeight / 6;
        position = d3.getPosition(this);
        left = position.left + position.width / 2 - offsetX;
        top = position.top + position.height / 2 - offsetY;
      }
      tooltip.style('left', left + 'px')
             .style('top', top + 'px');
      if (hoverEffect === 'darker') {
        d3.select(this)
          .attr('fill', d3.color(d.color).darker());
      }
    })
    .on('mousemove', function (d) {
      var position = d3.mouse(chart);
      var offsetX = parseInt(tooltip.style('width')) / 2;
      var offsetY = parseInt(tooltip.style('height')) + lineHeight / 6;
      tooltip.style('left', (position[0] - offsetX) + 'px')
             .style('top', (position[1] - offsetY) + 'px');
    })
    .on('mouseout', function (d) {
      tooltip.style('display', 'none');
      if (hoverEffect === 'darker') {
        d3.select(this)
          .attr('fill', d.color);
      }
    });
  }
};

// Set the legend
d3.setLegend = function (container, options) {
  if (options.show) {
    var symbol = options.symbol;
    var symbolWidth = Math.round(symbol.width);
    var symbolHeight = Math.round(symbol.height);
    var textColor = options.textColor;
    var disabledTextColor = options.disabledTextColor;
    var lineHeight = options.lineHeight;
    var item = container.append('g')
                        .attr('class', 'legend')
                        .attr('transform', options.translation)
                        .attr('cursor', 'pointer')
                        .selectAll('.legend-item')
                        .data(options.bindingData)
                        .enter()
                        .append('g')
                        .attr('class', function (d) {
                          d.disabled = d.disabled || d.data.disabled;
                          return 'legend-item' + (d.disabled ? ' disabled' : '');
                        })
                        .attr('transform', options.transform);

    item.append('rect')
        .attr('width', symbolWidth)
        .attr('height', symbolHeight)
        .attr('x', 0)
        .attr('y', function (d, i) {
          return lineHeight * (i + 1) - symbolHeight;
        })
        .attr('fill', function (d) {
          return d.disabled ? disabledTextColor : d.color;
        });

    item.append('text')
        .text(options.text)
        .attr('x', symbolWidth)
        .attr('y', function (d, i) {
          return lineHeight * (i + 1);
        })
        .attr('dx', options.dx)
        .attr('fill', function (d) {
          return d.disabled ? disabledTextColor : textColor;
        });

    item.on('click', options.onclick);
  }
};

// Wrap long labels: http://bl.ocks.org/mbostock/7555321
d3.wrapText = function (selection, options) {
  if (options.wrapText) {
    var wrapWidth = options.wrapWidth;
    var lineHeight = options.lineHeight;
    selection.each(function () {
      var label = d3.select(this);
      var words = label.text().split(/\s+/).reverse();
      if (words.length > 1) {
        var x = label.attr('x');
        var y = label.attr('y');
        var dy = parseFloat(label.attr('dy'));
        var tspan = label.text(null).append('tspan');
        var word = words.pop();
        var lineNumber = 0;
        var line = [];
        while (word) {
          line.push(word);
          tspan.text(line.join(' '));
          if (tspan.node().getComputedTextLength() > wrapWidth) {
            line.pop();
            tspan.text(line.join(' '));
            line = [word];
            lineNumber += 1;
            tspan = label.append('tspan')
                         .attr('x', x)
                         .attr('dy', lineHeight)
                         .text(word);
          }
          word = words.pop();
        }
        if (options.verticalAlign) {
          var align = options.verticalAlign;
          var factor = 0;
          if (align === 'middle') {
            factor = 1 / 2;
          } else if (align === 'bottom') {
            factor = 1;
          }
          label.attr('y', y - lineNumber * lineHeight * factor);
        }
      }
    });
  }
};

// Trigger an action
d3.triggerAction = function (selection, options) {
  var nodes = selection.nodes() || [];
  var name = options.event || options;
  var event = null;
  try {
    event = new Event(name);
  } catch (error) {
    event = document.createEvent('SVGEvents');
    event.initEvent(name, true, true);
  }
  if (d3.type(options) === 'object') {
    var delay = options.delay || 0;
    var length = nodes.length;
    if (length && options.carousel) {
      var interval = options.interval || 2000;
      var limit = options.limit || length;
      var randomize = options.randomize;
      var infinite = options.infinite;
      var index = 0;
      var count = 0;
      var timer = d3.timer(function (elapsed) {
        if (elapsed > interval * count) {
          count += 1;
          nodes[index].dispatchEvent(event);
          if (randomize === true) {
            index = Math.floor(Math.random() * length);
          } else {
            index = (index + 1) % length;
          }
        }
        if (infinite !== true && count >= limit) {
          timer.stop();
        }
      }, delay);
    } else {
      d3.timeout(function () {
        nodes.forEach(function (node) {
          node.dispatchEvent(event);
        });
      }, delay);
    }
  } else {
    nodes.forEach(function (node) {
      node.dispatchEvent(event);
    });
  }
};

// Parse geo data
d3.parseGeoData = function (map, options) {
  var data = map.data;
  var key = map.key || 'id';
  var features = [];
  var neighbors = [];
  var type = d3.type(data);
  if (type === 'object') {
    if (data.hasOwnProperty('features')) {
      features = data.features;
    } else if (window.topojson) {
      if (map.object) {
        var object = data.objects[map.object];
        features = topojson.feature(data, object).features;
        if (options.neighbors) {
          neighbors = topojson.neighbors(object.geometries);
        }
      }
    }
  }
  return {
    features: features.map(function (feature, index) {
      if (!feature.hasOwnProperty(key)) {
        feature[key] = String(feature[key] || feature.properties[key] || index);
      }
      return feature;
    }),
    neighbors: neighbors
  };
};

// Built-in map data
d3.maps = {
  world: {
    center: [0, 0],
    scale: 0.25
  },
  china: {
    center: [103.3886, 35.5636],
    scale: 1.0
  }
};