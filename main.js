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

	(function grabForm() {
		const buttonBbox = document.getElementById('submitBbox');
		// const buttonPixel = document.getElementById('submitPixel');
		const xInput = document.getElementById('lat');
		const yInput = document.getElementById('lon');
		const dateInput = document.getElementById('date');
		buttonBbox.addEventListener('click', e => {
			e.preventDefault();
			let coordinates = [xInput.value, yInput.value];
			let geoURL = buildUrl(dateInput.value);
			e.target.textContent = '...';
			e.target.disabled = true;
			handleTIFFbbox(geoURL, coordinates);
			e.target.textContent = 'RUN';
			e.target.disabled = false;
		});
		// buttonPixel.addEventListener('click', e => {
		// 	e.preventDefault();
		// 	let coordinates = [xInput.value, yInput.value];
		// 	let geoURL = buildUrl(dateInput.value);
		// 	e.target.textContent = '...';
		// 	e.target.disabled = true;
		// 	handleTIFFpixel(geoURL, coordinates);
		// 	e.target.textContent = 'RUN';
		// 	e.target.disabled = false;
		// });
	})();

	async function handleTIFFbbox(geoUrl = '', coordinates = [], date) {
		const startTime = performance.now();

		const tiff = await GeoTIFF.fromUrl(geoUrl);
		// const image = await tiff.getImage();
		// const width = image.getWidth();
		// const height = image.getHeight();
		// const bbox = image.getBoundingBox();
		// const bbox = [
		// 	-124.70833333241457, 24.541666665598125, -67.00000254405026,
		// 	49.3750012726343
		// ];
		// const bboxHeight = bbox[3] - bbox[1];
		// const bboxWidth = bbox[2] - bbox[0];
		// const xPixel = Math.floor(((coordinates[0] - bbox[0]) / bboxWidth) * width);
		// const yPixel = Math.floor(
		// 	((coordinates[1] - bbox[1]) / bboxHeight) * height
		// );
		// console.log(xPixel, yPixel);
		// const data = await tiff.readRasters({
		// 	window: [xPixel, yPixel, xPixel + 1, yPixel + 1]
		// });
		const xCord = Math.round(coordinates[0] * 100) / 100;
		const yCord = Math.round(coordinates[1] * 100) / 100;

		const [precip, tmin, tmax, tave] = await tiff.readRasters({
			bbox: [xCord, yCord, xCord + 0.1, yCord + 0.1],
			resX: 0.1,
			resY: 0.1
		});

		const endTime = performance.now();

		updateSidebar(
			{ precip: precip, tmin: tmin, tmax: tmax, tave: tave },
			endTime - startTime
		);
	}

	async function handleTIFFpixel(geoUrl = '', coordinates = []) {
		const startTime = performance.now();

		const tiff = await GeoTIFF.fromUrl(geoUrl);
		const image = await tiff.getImage();

		const width = image.getWidth();
		const height = image.getHeight();
		const bbox = image.getBoundingBox();
		const xPixel = Math.floor(
			((coordinates[0] - bbox[0]) / (bbox[2] - bbox[0])) * width
		);
		const yPixel = Math.floor(
			((coordinates[1] - bbox[1]) / (bbox[3] - bbox[1])) * height
		);

		console.log(xPixel, yPixel);
		const [precip, tmin, tmax, tave] = await image.readRasters({
			window: [xPixel, yPixel, xPixel + 1, yPixel + 1]
		});

		const endTime = performance.now();

		updateSidebar(
			{ precip: precip, tmin: tmin, tmax: tmax, tave: tave },
			endTime - startTime
		);
	}

	function buildUrl(date) {
		const urlBase =
			'https://storage.googleapis.com/noaa-ncei-nclimgrid-daily/cog';
		console.log(date);
		const year = date.substr(0, 4);
		const month = date.substr(5, 2);
		const day = date.substr(8, 2);
		return `${urlBase}/${year}/nclimgrid-daily-${year}${month}${day}.tif`;
	}

	function updateSidebar(data = {}, time) {
		for (const prop in data) {
			if (data.hasOwnProperty(prop)) {
				let el = document.getElementById(`${prop}`);
				el.innerText = data[prop][0].toFixed(2);
			}
		}
		document.getElementById('time').textContent = time.toFixed(2) + ' ms';
	}
}
