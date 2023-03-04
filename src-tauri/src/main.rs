// Dissables the console window on windows when not in debug mode
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use rodio::OutputStream;
use rodio::source::Source;
use rodio::Sink;
// use midir::MidiInput;
use midir::{MidiInput, MidiInputConnection};
// Import synth module
mod synth;

use std::sync::{Arc, Mutex};
use tauri::{Manager, Window, Wry};
use serde::{Serialize, Deserialize};

#[derive(Default)]
struct MidiState {
  pub input: Mutex<Option<MidiInputConnection<()>>>,
}

struct SinkState {
  sink: Sink,
}

#[derive(Clone, Serialize, Deserialize)]
struct MidiMessage {
  message: Vec<u8>,
}

#[tauri::command]
fn open_midi_connection(
  midi_state: tauri::State<'_, MidiState>,
  window: Window<Wry>,
//   input_idx: usize,
) {
  let handle = Arc::new(window).clone();
  let midi_in = MidiInput::new("Musikkboks");
  match midi_in {
    Ok(midi_in) => {
      let midi_in_ports = midi_in.ports();
      let port = midi_in_ports.get(0);
      match port {
        Some(port) => {
            // Print the name of the port
            println!("Port: {}", midi_in.port_name(port).unwrap());
          let midi_in_conn = midi_in.connect(
            port,
            "midir",
            move |_, message, _| {
                println!("Message: {:?}", message);
                handle
                .emit_and_trigger(
                  "midi_message",
                  MidiMessage {
                    message: message.to_vec(),
                  },
                )
                .map_err(|e| {
                  println!("Error sending midi message: {}", e);
                })
                .ok();
            },
            (),
          );
          match midi_in_conn {
            Ok(midi_in_conn) => {
              midi_state.input.lock().unwrap().replace(midi_in_conn);
            }
            Err(e) => {
              println!("Error: {}", e);
            }
          }
        }
        None => {
          println!("No port found at index {}", 0);
        }
      }
    }
    Err(e) => println!("Error: {}", e),
  }
}

fn main() {
    // Get an output stream handle to the default physical sound device
    let (_stream, stream_handle) = OutputStream::try_default().unwrap();
    let sink = Sink::try_new(&stream_handle).unwrap();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_midi_connection])
        .manage(MidiState::default())
        .manage(SinkState { sink })
        .setup(|app| {
            let handle = app.handle();
            // let sink = &handle.state::<SinkState>().sink;
            // sink.append(synth::Synth::square_wave(220.0).amplify(0.1));

            let _id = app.listen_global("midi_message", move |event| {
                let sink = &handle.state::<SinkState>().sink;

                // Deserialize the payload
                let message = serde_json::from_str::<MidiMessage>(event.payload().unwrap()).unwrap();
                let message = message.message;

                let hz = 440.0 * 2.0_f32.powf((message[1] as f32 - 69.0) / 12.0);
                let pressure = message[2] as f32 / 127.0;

                if message[0] == 144 { // 144 is the event for note on
                    sink.stop();
                    sink.append(synth::Synth::square_wave(hz).amplify(pressure));
                    println!("hz: {}", hz);
                    // stream_handle.play_raw(synth::Synth::square_wave(hz).amplify(0.1)).unwrap();
                }
                if message[0] == 128 { // 128 is the event for note off
                    sink.stop();
                    println!("Stop");
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
