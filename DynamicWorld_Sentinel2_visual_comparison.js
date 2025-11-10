// ---------------------------
// Define the Area of Interest
// ---------------------------
var aoi = geometry; // Import a geometry manually from shapefile or draw on map

// ---------------------------
// Define Time Range
// ---------------------------
var START = ee.Date('2021-04-02');
var END = START.advance(2, 'day');

// ---------------------------
// Build Filters
// ---------------------------
var colFilter = ee.Filter.and(
  ee.Filter.bounds(aoi),
  ee.Filter.date(START, END)
);

// ---------------------------
// Load Dynamic World & Sentinel-2 Collections
// ---------------------------
var dwCol = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filter(colFilter);
var s2Col = ee.ImageCollection('COPERNICUS/S2_HARMONIZED').filter(colFilter);

// ---------------------------
// Link DW with corresponding S2
// ---------------------------
var linkedCol = dwCol.linkCollection(s2Col, s2Col.first().bandNames());
var linkedImg = ee.Image(linkedCol.first());

// ---------------------------
// Visualization setup
// ---------------------------
var CLASS_NAMES = [
  'water', 'trees', 'grass', 'flooded_vegetation', 'crops',
  'shrub_and_scrub', 'built', 'bare', 'snow_and_ice'
];

var VIS_PALETTE = [
  '419bdf', '397d49', '88b053', '7a87c6', 'e49635',
  'dfc35a', 'c4281b', 'a59b8f', 'b39fe1'
];

// Create RGB visualization of DW label
var dwRgb = linkedImg.select('label')
  .visualize({min: 0, max: 8, palette: VIS_PALETTE})
  .divide(255);

// Find the most likely class probability
var top1Prob = linkedImg.select(CLASS_NAMES).reduce(ee.Reducer.max());

// Create a hillshade based on that probability
var top1ProbHillshade = ee.Terrain.hillshade(top1Prob.multiply(100)).divide(255);

// Multiply RGB with hillshade for textured visualization
var dwRgbHillshade = dwRgb.multiply(top1ProbHillshade);

// ---------------------------
// Display on Map
// ---------------------------
Map.centerObject(aoi, 12);
Map.addLayer(linkedImg, {min: 0, max: 3000, bands: ['B4', 'B3', 'B2']}, 'Sentinel-2 (True Color)');
Map.addLayer(dwRgbHillshade, {min: 0, max: 0.65}, 'Dynamic World (Label + Hillshade)');

// ---------------------------
// EXPORT SECTION
// ---------------------------

// Option 1: Export the visualization (RGB hillshade)
/*
Export.image.toDrive({
  image: dwRgbHillshade,
  description: 'DynamicWorld_LabelHillshade_2021_04_02',
  folder: 'EarthEngine_Exports',
  region: aoi,
  scale: 10, // Sentinel-2 native resolution
  crs: 'EPSG:4326',
  maxPixels: 1e13
});
/*

// Option 2: (Alternative) Export the raw label band (integer classes)
// Uncomment if you prefer the classification layer itself instead of visualization
/*
Export.image.toDrive({
  image: linkedImg.select('label'),
  description: 'DynamicWorld_LabelRaw_2021_04_02',
  folder: 'EarthEngine_Exports',
  region: aoi,
  scale: 10,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});
*/


///// PART 2
// Example: Side-by-side comparison using ui.SplitPanel

// Define two map panels
var leftMap = ui.Map();
var rightMap = ui.Map();

// Link the two maps (zoom and pan together)
var linker = ui.Map.Linker([leftMap, rightMap]);

// Add layers to each map
leftMap.addLayer(s2Col.first(), {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000}, 'Sentinel-2');
rightMap.addLayer(dwRgbHillshade, {min: 0, max: 0.65}, 'Dynamic World');

// Add labels
leftMap.setControlVisibility({all: true});
rightMap.setControlVisibility({all: true});

// Create a SplitPanel with the two maps
var splitPanel = ui.SplitPanel({
  firstPanel: leftMap,
  secondPanel: rightMap,
  orientation: 'horizontal',
  wipe: true // allows sliding effect
});

// Add the SplitPanel to the main UI
ui.root.clear();
ui.root.add(splitPanel);

// Center both maps on your AOI
leftMap.centerObject(aoi, 12);
