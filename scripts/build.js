/* Builds dist/technical-indicators.js (core + every indicator in one file) and, when esbuild is installed, dist/technical-indicators.min.js.
 *   npm install && npm run build */
var fileSystem = require("fs");
var path = require("path");

var sourceFolder = path.join(__dirname, "..", "src");
var distributionFolder = path.join(__dirname, "..", "dist");
var version = require("../package.json").version;
var banner = "/*! CanvasJS Technical Indicators v" + version + " | MIT | https://github.com/vishwas-r/canvasjs-technical-indicators */\n";
var indicatorFileNames = fileSystem.readdirSync(path.join(sourceFolder, "indicators")).sort();
var parts = [fileSystem.readFileSync(path.join(sourceFolder, "technical-indicators-core.js"), "utf8")];
var combinedCode = "";
var esbuild = null;

for(var i = 0; i < indicatorFileNames.length; i++) {
  parts.push(fileSystem.readFileSync(path.join(sourceFolder, "indicators", indicatorFileNames[i]), "utf8"));
}

combinedCode = parts.join("\n");
fileSystem.mkdirSync(distributionFolder, { recursive: true });
fileSystem.writeFileSync(path.join(distributionFolder, "technical-indicators.js"), banner + combinedCode);
console.log("dist/technical-indicators.js: core + " + indicatorFileNames.length + " indicators");

try {
  esbuild = require("esbuild");
  fileSystem.writeFileSync(path.join(distributionFolder, "technical-indicators.min.js"), banner + esbuild.transformSync(combinedCode, { minify: true, target: "es5" }).code);
  console.log("dist/technical-indicators.min.js written");
} catch(error) {
  console.log("Minified build skipped (" + error.message.split("\n")[0] + "). Run npm install first.");
}
