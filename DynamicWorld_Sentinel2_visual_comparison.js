// script: split visualization of Dynamic World (hillshade effect) and Sentinel-2

// after you paste this script in google earth engine, add a geometry/shapefile and set your desired date. Then run it.
// for any query; contact at sarmadmaharofficial@gmail.com
// ---- Youtube: https://www.youtube.com/@sarmad-mahar ----

// date window
var START = ee.Date('2021-04-02');
var END = START.advance(2, 'day');

// area of interest
var aoi = geometry;
var colFilter = ee.Filter.and(ee.Filter.bounds(aoi), ee.Filter.date(START, END));

// load datasets
var dwCol = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filter(colFilter);
var s2Col = ee.ImageCollection('COPERNICUS/S2_HARMONIZED').filter(colFilter);

// color palette
var VIS_PALETTE = [
  '419bdf', '397d49', '88b053', '7a87c6', 'e49635',
  'dfc35a', 'c4281b', 'a59b8f', 'b39fe1'
];

// link collections
var linkedCol = dwCol.linkCollection(s2Col, s2Col.first().bandNames());
var linkedImg = ee.Image(linkedCol.first());

// visualize DW label
var dwRgb = linkedImg.select('label')
  .visualize({min: 0, max: 8, palette: VIS_PALETTE})
  .divide(255);

// class names
var CLASS_NAMES = [
  'water', 'trees', 'grass', 'flooded_vegetation', 'crops',
  'shrub_and_scrub', 'built', 'bare', 'snow_and_ice'
];

// hillshade enhancement
var top1Prob = linkedImg.select(CLASS_NAMES).reduce(ee.Reducer.max());
var top1ProbHillshade = ee.Terrain.hillshade(top1Prob.multiply(100)).divide(255);
var dwRgbHillshade = dwRgb.multiply(top1ProbHillshade);

// split maps
var leftMap = ui.Map();
var rightMap = ui.Map();
ui.Map.Linker([leftMap, rightMap]);

// add layers
leftMap.addLayer(s2Col.first(), {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000}, 'Sentinel-2');
rightMap.addLayer(dwRgbHillshade, {min: 0, max: 0.65}, 'Dynamic World');

// map controls
leftMap.setControlVisibility({all: true});
rightMap.setControlVisibility({all: true});

// build split panel
var splitPanel = ui.SplitPanel({
  firstPanel: leftMap,
  secondPanel: rightMap,
  orientation: 'horizontal',
  wipe: true
});

// render output
ui.root.clear();
ui.root.add(splitPanel);

// center maps
leftMap.centerObject(aoi, 12);
rightMap.centerObject(aoi, 12);
