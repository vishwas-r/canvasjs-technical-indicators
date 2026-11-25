var vm = require("vm"), fs = require("fs");
var path = require("path");
var useMinified = process.argv.indexOf("--min") !== -1;
var useDistribution = process.argv.indexOf("--dist") !== -1 || useMinified;
var base = path.join(__dirname, "..", useDistribution ? "dist" : "src") + path.sep;
var warnings = [];
var context = { console: { warn: function(message) { warnings.push(message); } } };
context.window = context;
vm.createContext(context);
function load(file) { vm.runInContext(fs.readFileSync(base + file, "utf8"), context, { filename: file }); }
if(useDistribution) {
  load(useMinified ? "technical-indicators.min.js" : "technical-indicators.js");
} else {
  load("technical-indicators-core.js");
  fs.readdirSync(base + "indicators").forEach(function(file) { load("indicators/" + file); });
}
console.log("Testing " + (useMinified ? "dist/technical-indicators.min.js" : (useDistribution ? "dist/technical-indicators.js" : "src/")));
var TI = context.TechnicalIndicators;
var failures = 0;
function check(name, condition, detail) { if(!condition) { failures++; } console.log((condition ? "ok   " : "FAIL ") + name + (detail ? "  " + detail : "")); }
function near(actual, expected, tolerance) { return Math.abs(actual - expected) <= (tolerance || 0.01); }

check("registered 9 types", TI.getRegisteredTypes().length === 9, TI.getRegisteredTypes().join(","));

var calc = TI.calculations;
var sma = calc.simpleMovingAverage([1, 2, 3, 4, 5], 3);
check("sma", sma[0] === null && sma[1] === null && sma[2] === 2 && sma[3] === 3 && sma[4] === 4, JSON.stringify(sma));
var ema = calc.exponentialSmoothing([1, 2, 3, 4, 5], 3, 0.5);
check("ema", ema[2] === 2 && ema[3] === 3 && ema[4] === 4, JSON.stringify(ema));

function candlesFromCloses(closes) {
  return closes.map(function(close, index) { return { x: index, y: [close, close + 1, close - 1, close], volume: 100 + index }; });
}
function stockChartFor(closes, indicators) {
  var dataPoints = candlesFromCloses(closes);
  var volumePoints = dataPoints.map(function(point) { return { x: point.x, y: point.volume }; });
  var chart = { options: { charts: [{ data: [{ type: "candlestick", dataPoints: dataPoints }] }, { data: [{ type: "column", dataPoints: volumePoints }] }], indicators: indicators }, renderCount: 0, render: function() { this.renderCount++; } };
  return chart;
}
var wilderCloses = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64];

var chart = stockChartFor(wilderCloses, [{ type: "rsi", period: 14 }]);
var set = TI.apply(chart);
var rsiPane = chart.options.charts[2];
var rsiPoints = rsiPane.data[0].dataPoints;
check("rsi pane added with height", chart.options.charts.length === 3 && rsiPane.height === 120);
check("rsi first value at index 14 is 70.4641 (independent Wilder calculation)", rsiPoints[0].x === 14 && near(rsiPoints[0].y, 70.4641, 0.001), String(rsiPoints[0].y));
check("rsi second value is 66.2496", near(rsiPoints[1].y, 66.2496, 0.001), String(rsiPoints[1].y));
check("rsi strip lines", rsiPane.axisY.stripLines.length === 2 && rsiPane.axisY.maximum === 100);
check("apply rendered once", chart.renderCount === 1);

var steadyChart = stockChartFor(new Array(61).join("10,").split(",").slice(0, 60).map(Number), [
  { type: "macd" }, { type: "bollinger", period: 5 }, { type: "atr", period: 5 }, { type: "obv", volumeChartIndex: 1, volumeSeriesIndex: 0 }, { type: "stochastic" }, { type: "vwap", reset: "none", volumeChartIndex: 1, volumeSeriesIndex: 0 }]);
var steadySet = TI.apply(steadyChart);
var macdPane = steadyChart.options.charts[2];
check("macd zero on flat series", macdPane.data[1].dataPoints.length > 0 && near(macdPane.data[1].dataPoints[0].y, 0, 1e-9) && macdPane.data[0].dataPoints[0].color === "#26A69A");
var bollingerSeries = steadyChart.options.charts[0].data[1];
check("bollinger rangeArea collapses on flat series", bollingerSeries.type === "rangeArea" && bollingerSeries.dataPoints[0].y[0] === 10 && bollingerSeries.dataPoints[0].y[1] === 10);
check("overlay series appended to price chart", steadyChart.options.charts[0].data.length === 4, String(steadyChart.options.charts[0].data.length));
check("atr is 2 on flat ranges", near(steadyChart.options.charts[3].data[0].dataPoints[0].y, 2));
check("stochastic 50 on zero range? high-low is 2 so close mid", near(steadyChart.options.charts[5].data[0].dataPoints[0].y, 50));
check("vwap is typical price 10", near(steadyChart.options.charts[0].data[3].dataPoints[0].y, 10));
check("obv flat series stays 0", steadyChart.options.charts[4].data[0].dataPoints[5].y === 0);

var risingChart = stockChartFor([1, 2, 3, 4, 5], [{ type: "obv", volumeChartIndex: 1, volumeSeriesIndex: 0 }]);
TI.apply(risingChart);
check("obv accumulates volume", risingChart.options.charts[2].data[0].dataPoints[4].y === 101 + 102 + 103 + 104, String(risingChart.options.charts[2].data[0].dataPoints[4].y));

steadySet.update();
check("update recalculates without adding series", steadyChart.options.charts.length === 6 && steadyChart.options.charts[0].data.length === 4);
check("remove pane", steadySet.remove("macd") === true && steadyChart.options.charts.length === 5);
steadySet.destroy();
check("destroy restores options", steadyChart.options.charts.length === 2 && steadyChart.options.charts[0].data.length === 1);

var plainChart = { options: { data: [{ type: "candlestick", dataPoints: candlesFromCloses(wilderCloses) }], indicators: [{ type: "sma", period: 5 }, { type: "rsi" }, { type: "bollinger" }, { type: "nonsense" }, { type: "ema", period: 0 }] }, render: function() {} };
TI.apply(plainChart);
check("plain chart gets overlays only", plainChart.options.data.length === 1 + 1 + 2, String(plainChart.options.data.length));
check("warning for pane indicator in Chart", warnings.indexOf("TechnicalIndicators: rsi is supported only in StockChart") !== -1, warnings.join(" | "));
check("warning for unknown type", warnings.join("|").indexOf("Unknown indicator") !== -1);
check("warning for invalid period", warnings.join("|").indexOf("period must be a whole number") !== -1);

var lineOnly = { options: { data: [{ type: "line", dataPoints: wilderCloses.map(function(value, index) { return { x: index, y: value }; }) }], indicators: [{ type: "vwap" }, { type: "sma", period: 3 }] }, render: function() {} };
TI.apply(lineOnly);
check("ohlc-only indicator warns on line data, sma still works", warnings.join("|").indexOf("vwap needs candlestick or OHLC data") !== -1 && lineOnly.options.data.length === 2);

var preprocessed = TI.options({ data: [{ type: "candlestick", dataPoints: candlesFromCloses(wilderCloses) }], indicators: [{ type: "sma", period: 5 }] });
check("options() adds series without a chart", preprocessed.data.length === 2 && preprocessed.data[1].dataPoints.length === 16);

// automatic mode
var renderCalls = 0;
function FakeChart(options) { this.options = options; }
FakeChart.prototype.render = function() { renderCalls++; };
var namespace = { Chart: FakeChart };
TI.enable(namespace);
TI.enable(namespace);
var automaticChart = new FakeChart({ data: [{ type: "candlestick", dataPoints: candlesFromCloses(wilderCloses) }], indicators: [{ type: "sma", period: 5 }] });
automaticChart.render();
check("enable: first render adds series", automaticChart.options.data.length === 2 && renderCalls === 1);
automaticChart.options.data[0].dataPoints.push({ x: 20, y: [46, 47, 45, 46.5] });
automaticChart.render();
check("enable: render recalculates when data changed", automaticChart.options.data[1].dataPoints.length === 17 && automaticChart.options.data.length === 2);
TI.disable();
var plainRender = new FakeChart({ indicators: [{ type: "sma" }], data: [{ dataPoints: [] }] });
plainRender.render();
check("disable restores render", plainRender.technicalIndicators === undefined);

// README example: a custom indicator in 15 lines
TI.register({
  type: "donchian",
  name: "Donchian Channel",
  placement: "overlay",
  requiresOhlc: true,
  requiresVolume: false,
  defaults: { period: 20 },
  integerParameters: ["period"],
  calculate: function(candles, parameters) {
    var calculations = TI.calculations;
    return {
      upperBand: calculations.rollingExtreme(calculations.extractValues(candles, "high"), parameters.period, true),
      lowerBand: calculations.rollingExtreme(calculations.extractValues(candles, "low"), parameters.period, false)
    };
  },
  series: [
    { type: "rangeArea", outputs: ["upperBand", "lowerBand"], colorIndex: 0, label: function(parameters) { return "Donchian (" + parameters.period + ")"; } }
  ]
});
var donchianChart = { options: { data: [{ type: "candlestick", dataPoints: candlesFromCloses(wilderCloses) }], indicators: [{ type: "donchian", period: 5 }] }, render: function() {} };
TI.apply(donchianChart);
var donchianPoint = donchianChart.options.data[1].dataPoints[0];
check("custom indicator from the README works", donchianChart.options.data[1].type === "rangeArea" && donchianChart.options.data[1].name === "Donchian (5)" && donchianPoint.y[1] > donchianPoint.y[0], JSON.stringify(donchianPoint));
check("undefined option keeps the default period", (function() { var chartWithUndefined = { options: { data: [{ dataPoints: candlesFromCloses(wilderCloses) }], indicators: [{ type: "sma", period: undefined }] }, render: function() {} }; TI.apply(chartWithUndefined); return chartWithUndefined.options.data[1].name === "SMA (20)"; })());
console.log(failures === 0 ? "ALL PASSED" : failures + " FAILED");
process.exit(failures === 0 ? 0 : 1);
