if (window.__TAURI__) {
	var { invoke } = window.__TAURI__.tauri;
	// Import event module and use listen function
	var { emit, listen } = window.__TAURI__.event;
  }
  
  async function fild_upload() {
	if (window.__TAURI__) {
	  await invoke("file_upload");
	}
  }

  async function play_arrangement() {  
	if (window.__TAURI__) {
	  await invoke("play_arrangement");
	}
  }
  
  let line_microseconds = 0;
  let last_line_time = Date.now();

  console.log("MIDI player loaded")

  export function midi_player() {
	// Get body element
	const body = document.querySelector("body");
	console.log(body);
	// Create a new div inside the body with the class widget-container
	const widget_container = document.createElement("div");
	widget_container.classList.add("widget-container");
	body.appendChild(widget_container);
	// Create a new tag to label the widget
	const widget_label = document.createElement("h2");
	widget_label.innerHTML = "Midi Player";
	widget_container.appendChild(widget_label);
	// Create a new div inside the body with the class widget
	const widget = document.createElement("div");
	widget.classList.add("midi_player");
	widget_container.appendChild(widget);
	// Create a button inside of the midi_player widget
	const button = document.createElement("button");
	button.innerHTML = "Upload Midi File";
	widget.appendChild(button);
	// On button click, open file dialog
	button.addEventListener("click", () => {
	  fild_upload();
	});

	//Create a progress bar inside of the midi_player widget
	const progress_bar = document.createElement("progress");
	// progress_bar.classList.add("progress_bar");
	// Add value and max attributes to the progress bar
	progress_bar.setAttribute("value", "0");
	progress_bar.setAttribute("max", "100");
	// Add id
	progress_bar.setAttribute("id", "progress_bar");
	// Set width of progress bar to 100%
	progress_bar.style.width = "100%";
	// Add innerHTML
	progress_bar.innerHTML = "0%";
	widget.appendChild(progress_bar);

	if (window.__TAURI__) {
		listen("midi_file_data", (event) => {
			// Get the midi_player widget
			const midi_player_widget = document.querySelector(".midi_player");
			// Create a new p tag inside of the midi_player widget
			const midi_player_text = document.createElement("p");
			midi_player_text.innerHTML = event.payload;
			console.log(event.payload)
			line_microseconds = event.payload;
			midi_player_widget.appendChild(midi_player_text);

			// Create a new svg inside the midi_player widget
			const svg_container = document.createElement("div");
			svg_container.classList.add("svg-container");
			svg_container.innerHTML = `
				<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
				<rect width="100%" height="100%" fill="#000" />
				</svg>
			`;
			// build_svg_piano_roll(svg_container);

			// Build a carret div inside of the svg_container
			const carret = document.createElement("div");
			carret.classList.add("carret");
			svg_container.appendChild(carret);
			midi_player_widget.appendChild(svg_container);
			// console.log(event.payload);

			setInterval(function () {
				let carret = document.querySelector(".carret");
				// Get difference from now to last line time
				const difference = Date.now() - last_line_time;
				// Log difference as seconds
				// console.log(difference / 1000);
				// Calculate microseconds per line to milliseconds per line
				const milliseconds_per_line = line_microseconds / 1000;
				// Calculate how far the carret should be moved
				const carret_move = difference / milliseconds_per_line * 100;
				// console.log(carret_move)
				// Move the carret
				carret.style.left = carret_move + "%";
			}, 40);
		})

		listen("update_progress_bar", (event) => {
			// Get the progress bar
			const progress_bar = document.querySelector("#progress_bar");
			// Update the progress bar
			progress_bar.setAttribute("value", event.payload);
			progress_bar.innerHTML = event.payload + "%";
		})

		listen("call_the_rust_function", () => {
			play_arrangement();
		})

		listen("update_current_line", (event) => {
			last_line_time = Date.now();
			// console.log(Date.now());

			// Get the svg container
			const svg_container = document.querySelector(".svg-container");
			// svg_container.innerHTML = `
			// 	<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
			// 	<rect width="100%" height="100%" fill="#000" />
			// 	</svg>
			// `;
			// Delete the svg from svg container
			svg_container.removeChild(svg_container.querySelector("svg"));
			// Build a new svg
			svg_container.innerHTML += `
				<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
				<rect width="100%" height="100%" fill="#000" />
				</svg>
			`;
			build_svg_piano_roll(svg_container, event.payload);
		})
	  }
  }

  function build_svg_piano_roll(svg_container, notes) {
	// Get the svg element
	const svg = svg_container.querySelector("svg");
	// variable for the namespace 
	const svgns = "http://www.w3.org/2000/svg";
	const rect_width = 40;
	const rect_height = 8;
	const grid_rows = 49;
	const grid_columns = 16;

	// Set the svg width and height
	svg.setAttributeNS(null, "width", grid_columns * rect_width);
	svg.setAttributeNS(null, "height", grid_rows * rect_height);
	// Set the svg viewbox
	svg.setAttributeNS(null, "viewBox", `0 0 ${grid_columns * rect_width} ${grid_rows * rect_height}`);
	// Create new rects in a loop
	for (let i = 0; i < grid_rows; i++) {
		for (let j = 0; j < grid_columns; j++) {
			// Create a new rect
			const rect = document.createElementNS(svgns, "rect");
			// Set the rect attributes
			rect.setAttributeNS(null, "x", j * rect_width);
			rect.setAttributeNS(null, "y", i * rect_height);
			rect.setAttributeNS(null, "width", rect_width);
			rect.setAttributeNS(null, "height", rect_height);
			rect.setAttributeNS(null, "stroke", "black");
			rect.setAttributeNS(null, "stroke-width", "1");
			
			// Calculate if row is odd or even
			rect.setAttributeNS(null, "fill", "hsl(354, 80%, 46%)");
			if (i % 2 == 0) {
				rect.setAttributeNS(null, "fill", "hsl(0, 64%, 40%)");
			}

			// Check if current row is a multiple of 4 and set stroke-width to 2
			if (j % 4 == 0) {
				rect.setAttributeNS(null, "stroke", "black");
				rect.setAttributeNS(null, "stroke-width", "2");
				rect.setAttributeNS(null, "stroke-dasharray", "0,50,150");
				// Move x position of rect to the right by 2
				rect.setAttributeNS(null, "x", j * rect_width + 2);
				// Move y position of rect down by 0.5
				rect.setAttributeNS(null, "y", i * rect_height + 0.5);
			}

			// Add the rect to the svg element
			svg.appendChild(rect);
		}
	}

	// Create a new rect for each note
	for (let i = 0; i < notes.length; i++) {
		// console.log(notes[i]);
		// Create a new rect
		// console.log(line_microseconds)
		// console.log(notes[i].start_time)
		if (!isNaN(notes[i].start_time / line_microseconds)) {
			const rect = document.createElementNS(svgns, "rect");

			// Calculate Y of a note if notes start at 36 and end at 84
			const note_y = 49 - (notes[i].note - 36);

			// Set the rect attributes
			rect.setAttributeNS(null, "x", notes[i].start_time / line_microseconds * grid_columns * rect_width);
			rect.setAttributeNS(null, "y", note_y * rect_height);
			rect.setAttributeNS(null, "width", (notes[i].end_time - notes[i].start_time)/ line_microseconds * rect_width);
			rect.setAttributeNS(null, "height", rect_height);
			rect.setAttributeNS(null, "fill", "yellow");
			rect.setAttributeNS(null, "stroke", "black");
			rect.setAttributeNS(null, "stroke-width", "1");
			console.log("hi")

			// Add the rect to the svg element
			svg.appendChild(rect);
		}
	}
  }