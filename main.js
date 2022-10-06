window.onload = init;

function init() {
	// These metrics are just for the purpose of the interface and actual values are tested for in the handleTIFF function
	// const geoURL = 'data/nclimgrid-daily-20220101.tif';
	const geoBound = [
		-124.70833333241457, 24.541666665598125, -67.00000254405026,
		49.3750012726343
	];

	const map = new ol.Map({
		view: new ol.View({
			center: [-50868082.00499239, 4706347.515686587],
			zoom: 3
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

	map.on('click', function (e) {
		let coordinates = e.coordinate;
		let projStart = OSMLayer.getSource().getProjection().getCode();
		let projFinish = 'WGS84';
		let newCoordinates = proj4(projStart, projFinish).forward(coordinates);

		logCoordinates(newCoordinates);
	});

	function logCoordinates(coordinates = []) {
		const xInput = document.getElementById('lat');
		const yInput = document.getElementById('lon');
		if (
			coordinates[0] >= geoBound[0] &&
			coordinates[0] <= geoBound[2] &&
			coordinates[1] >= geoBound[1] &&
			coordinates[1] <= geoBound[3]
		) {
			xInput.value = coordinates[0];
			yInput.value = coordinates[1];
		} else {
			alert('The point you selected is out of range of the dataset');
		}
	}

	function setForm() {
		const prodButton = document.getElementById('prod');
		const testButton = document.getElementById('test');
		const dateField = document.getElementById('dateField');
		const fileField = document.getElementById('fileField');
		testButton.addEventListener('click', () => {
			handleToggle();
		});
		prodButton.addEventListener('click', () => {
			handleToggle();
		});
		function handleToggle() {
			let hide = testButton.checked ? true : false;
			dateField.style.display = testButton.checked ? 'none' : 'block';
			fileField.style.display = prodButton.checked ? 'none' : 'block';
		}
		handleToggle();
	}

	function grabForm() {
		const submitPixel = document.getElementById('submitPixel');
		const submitBbox = document.getElementById('submitBbox');
		const xInput = document.getElementById('lat');
		const yInput = document.getElementById('lon');
		const dateInput = document.getElementById('date');
		submitPixel.addEventListener('click', e => {
			e.preventDefault();
			let type = document.getElementById('prod').checked ? 'prod' : 'test';
			let coordinates = [xInput.value, yInput.value];
			let geoURL = buildUrl(dateInput.value, type);
			e.target.textContent = '...';
			e.target.disabled = true;
			handleTIFFpixel(geoURL, coordinates, type);
			e.target.textContent = 'Pixel';
			e.target.disabled = false;
		});
		submitBbox.addEventListener('click', e => {
			e.preventDefault();
			let type = document.getElementById('prod').checked ? 'prod' : 'test';
			let coordinates = [xInput.value, yInput.value];
			let geoURL = buildUrl(dateInput.value, type);
			e.target.textContent = '...';
			e.target.disabled = true;
			handleTIFFbbox(geoURL, coordinates, type);
			e.target.textContent = 'BBox';
			e.target.disabled = false;
		});
	}

	(function grabForm2() {
		const xInput = document.getElementById('lat');
		const yInput = document.getElementById('lon');
		const submit = document.getElementById('submit');
		const file = 'last30-byte8-deflate1';
		submit.addEventListener('click', e => {
			e.preventDefault();
			let coordinates = [xInput.value, yInput.value];
			let geoURL = buildUrl(null, 'test', file);
			e.target.textContent = '...';
			e.target.disabled = true;
			handleTIFFbbox(geoURL, coordinates, 'test');
			e.target.textContent = 'Graph Data';
			e.target.disabled = false;
		});
	})();

	async function handleTIFFbbox(geoUrl = '', coordinates = [], type) {
		const startTime = performance.now();
		const tiff = await GeoTIFF.fromUrl(geoUrl);

		const xCord = Math.round(coordinates[0] * 100) / 100;
		const yCord = Math.round(coordinates[1] * 100) / 100;

		const pool = new GeoTIFF.Pool();
		if (type === 'prod') {
			const [precip, tmin, tmax, tave] = await tiff.readRasters({
				bbox: [xCord, yCord, xCord + 0.1, yCord + 0.1],
				resX: 0.1,
				resY: 0.1,
				interleave: true,
				pool
			});
			let endTime = performance.now();
			updateSidebar(
				{ precip: precip, tmin: tmin, tmax: tmax, tave: tave },
				endTime - startTime
			);
		} else {
			const data = await tiff.readRasters({
				bbox: [xCord, yCord, xCord + 0.1, yCord + 0.1],
				resX: 0.1,
				resY: 0.1,
				interleave: true,
				pool
			});
			let endTime = performance.now();
			updateSidebar({ data: data }, endTime - startTime);
			makeGraph(data, 'temp', 'tempGraph', false);
			makeGraph(data, 'precip', 'precipGraph', false);
		}
	}

	async function handleTIFFpixel(geoUrl = '', coordinates = [], type) {
		const startTime = performance.now();

		const tiff = await GeoTIFF.fromUrl(geoUrl);

		const width = 1385;
		const height = 596;
		const bbox = [
			-124.70833333241457, 24.541666665598125, -67.00000254405026,
			49.3750012726343
		];
		const xPixel = Math.floor(
			Math.abs(((coordinates[0] - bbox[0]) / (bbox[2] - bbox[0])) * width)
		);
		const yPixel = Math.floor(
			Math.abs(((coordinates[1] - bbox[1]) / (bbox[3] - bbox[1])) * height)
		);

		const pool = new GeoTIFF.Pool();
		if (type === 'prod') {
			const [precip, tmin, tmax, tave] = await tiff.readRasters({
				window: [xPixel, yPixel, xPixel + 1, yPixel + 1],
				interleave: true,
				pool
			});
			let endTime = performance.now();
			updateSidebar(
				{ precip: precip, tmin: tmin, tmax: tmax, tave: tave },
				endTime - startTime
			);
		} else {
			const data = await tiff.readRasters({
				window: [xPixel, yPixel, xPixel + 1, yPixel + 1],
				interleave: true,
				pool
			});
			let endTime = performance.now();
			updateSidebar({ data: data }, endTime - startTime);
			const graphButton = document.getElementById('graphButton');
			graphButton.addEventListener('click', () => {
				makeGraph(data, 'temp', false);
			});
		}
	}

	function buildUrl(date, type, file = null) {
		if (type === 'prod') {
			let urlBase =
				'https://storage.googleapis.com/noaa-ncei-nclimgrid-daily/cog';
			const year = date.substr(0, 4);
			const month = date.substr(5, 2);
			const day = date.substr(8, 2);
			return `${urlBase}/${year}/nclimgrid-daily-${year}${month}${day}.tif`;
		} else {
			let urlBase =
				'https://storage.googleapis.com/noaa-ncei-nclimgrid-daily/cog/testing/nclimgrid';
			file = file ?? document.getElementById('file').value;
			return `${urlBase}-${file}.tif`;
		}
	}

	function updateSidebar(data = {}, time) {
		for (const prop in data) {
			if (data.hasOwnProperty(prop)) {
				let el = document.getElementById(`${prop}`);
				if (el) {
					if (prop === 'data') {
						el.textContent = JSON.stringify(data);
					} else {
						el.innerText = data[prop].toFixed(2);
					}
				}
			}
		}
		document.getElementById('time').textContent = time.toFixed(2) + ' ms';
	}

	function makeGraph(rawData, prop, destination, doAnimate) {
		const margin = { top: 10, right: 10, bottom: 20, left: 20 };
		const div = document.getElementById(destination);
		console.log(div);
		let width = div.clientWidth - margin.left - margin.right;
		let height = div.clientHeight - margin.top - margin.bottom;
		console.log(width, height);
		const svg = d3
			.select(div)
			.append('svg')
			.attr('width', width + margin.left + margin.right)
			.attr('height', height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		//transform data
		let data = handleData(rawData, ['precip', 'temp']);
		console.log(data);
		// add x axis
		let x = d3.scaleLinear().domain([0, 30]).range([0, width]);
		svg
			.append('g')
			.attr('transform', 'translate(0,' + height + ')')
			.call(d3.axisBottom(x));

		// add y axis
		let y = d3.scaleLinear().domain(ydomain()).range([height, 0]);
		svg.append('g').call(d3.axisLeft(y));

		function ydomain() {
			if (prop === 'precip') {
				let max = d3.max(data.precip, function (d) {
					return d[1];
				});
				return [0, max * 1.5];
			} else if (prop === 'temp') {
				return [0, 120];
			}
		}
		// console.log(data.temp);
		// console.log(prop);
		// console.log(data[prop]);

		// append the line
		svg
			.append('path')
			.datum(data[prop])
			.attr('fill', 'none')
			.attr('stroke', 'steelblue')
			.attr('stroke-width', 1.5)
			.attr(
				'd',
				d3
					.line()
					.x(function (d) {
						return x(d[0]);
					})
					.y(function (d) {
						return y(d[1]);
					})
			);
	}

	function handleData(data, params = []) {
		let processed = {};
		params.forEach(param => {
			processed[param] = [];
			for (
				i = params.indexOf(param), j = 0;
				i < data.length;
				i = i + params.length, j++
			) {
				processed[param].push([j, parseFloat(data[i])]);
			}
		});
		return processed;
	}

	function preventRender() {
		const go = document.getElementById('go');
		const fileInput = document.getElementById('file');
		const renderInput = document.getElementById('render');
		let file =
			'https://storage.googleapis.com/noaa-ncei-nclimgrid-daily/cog/testing/nclimgrid-last30-byte8-deflate1.tif';

		go.addEventListener('click', e => {
			e.preventDefault();
			go.href = `render.html?render=${renderInput.value}&file=${file}`;
			window.open(go.href, '_blank');
		});
	}
}
