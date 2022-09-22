(function render() {
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);
	const render = urlParams.get('render');
	const file = urlParams.get('file');

	const geoBound = [
		-124.70833333241457, 24.541666665598125, -67.00000254405026,
		49.3750012726343
	];

	function displayTime(string, time) {
		const timescale = document.getElementById('timescale');
		let p = document.createElement('p');
		p.textContent = `${string}: ${time.toFixed(2)}ms`;
		timescale.appendChild(p);
	}

	let mapTimeStart = performance.now();
	const map = new ol.Map({
		view: new ol.View({
			center: [-50868082.00499239, 4706347.515686587],
			zoom: 4
		}),
		target: 'map',
		keyboardEventTarget: document
	});
	const OSMLayer = new ol.layer.Tile({
		source: new ol.source.OSM(),
		visible: true,
		zIndex: 0,
		title: 'OSMLayer'
	});
	map.addLayer(OSMLayer);
	let mapTimeEnd = performance.now();
	displayTime('Map Init', mapTimeEnd - mapTimeStart);

	let layerTimeStart = performance.now();
	if (render === 'olLayer') {
		console.log('open layer layer');
		let geoSource = new ol.source.GeoTIFF({
			sources: [{ url: file }]
		});
		let geoLayer = new ol.layer.WebGLTile({
			source: geoSource,
			visible: true,
			title: 'geoLayer'
		});
		map.addLayer(geoLayer);
		map.setView(geoSource.getView());
	} else if (render === 'plotty') {
		console.log('plottyjs');
	}
	let layerTimeEnd = performance.now();
	displayTime('Layer Init', layerTimeEnd - layerTimeStart);
	map.on('rendercomplete', () => {
		let renderTimeEnd = performance.now();
		displayTime('Render', renderTimeEnd - mapTimeStart);
	});
})();
