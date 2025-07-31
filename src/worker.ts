// @ts-ignore
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.mjs";
import { MainMessageType, WorkerMessageType } from './workerTypes';

// Kick off the download/initialisation once per worker
const pyodideReady = loadPyodide();
let resumeFn;
// @ts-ignore
self.pauseHook = msg => new Promise((res: any) => {
  resumeFn = res;                         // save resolver for later
  console.log("Paused", msg);
  console.log(postMessage)
//   postMessage({type: "paused", detail: msg});
  resumeFn()
});



const STATE_TRACKING = `
import sys
from pyodide.ffi import run_sync
from js import pauseHook                  # injected above

_COUNTER, _EVERY = 0, 500                # yield every 500 lines

def _yield_to_js(msg=None):
    # Block until JS finishes its work.
    run_sync(pauseHook(msg))

def _tracer(frame, event, arg):
    global _COUNTER
    if event == "line":
        _COUNTER += 1
        if _COUNTER >= _EVERY:
            _COUNTER = 0
            _yield_to_js({"where": f"{frame.f_code.co_name}:{frame.f_lineno}"})
    return _tracer                        # keep tracing children

def enable_auto_pause(every=500):
    """Start yielding control to JS every *every* executed lines."""
    global _EVERY
    _EVERY = max(1, every)
    sys.settrace(_tracer)
`

const runProgram = async (python: string, stdoutCallback: (stdOut: string) => void = sendOutput, stderrCallback: (stdErr: string) => void = sendError) => {
    const pyodide = await pyodideReady;

    
    // set stdout and stderr callbacks
    pyodide.setStdout({
        batched: stdoutCallback,
    })

    pyodide.setStderr({
        batched: stderrCallback,
    });


    try {
        // Run the Python code
        await pyodide.runPythonAsync(STATE_TRACKING);
        await pyodide.runPythonAsync(python);
        // return the frames
        // const frames = pyodide.globals.get('FRAMES').toJs();
        // console.log(frames[4][2]);
 

        // console.log('Execution frames:', frames);
    } catch (error) {
        // Handle any errors that occur during execution
        if (error instanceof Error) {
            stderrCallback(error.message);
        } else {
            stderrCallback('An unknown error occurred');
        }
    }
    console.log("DONE")


}


const sendOutput = (output: string) => {
    self.postMessage({
        type: WorkerMessageType.Output,
        output
    });
}

const sendError = (error: string) => {
    self.postMessage({
        type: WorkerMessageType.Error,
        error
    });
}

self.onmessage = async (ev) => {
    const pyodide = await pyodideReady;
    const { type, data } = ev.data;
    switch (type) {
        case MainMessageType.Run: {
            const { python } = data;
            await runProgram(python);
            self.postMessage({
                type: WorkerMessageType.Finish
            });
            break;
        }
        case MainMessageType.Stop: {
            // Handle stop logic if needed
            break;
        }
        case MainMessageType.Test: {
            // Handle test logic if needed
            break;
        } 
        case MainMessageType.ArrayBuffer: {
            // Handle interrupt logic if needed
            const { buffer } = data;
            console.log('Received ArrayBuffer:', buffer);
            pyodide.setInterruptBuffer(buffer);

        }
    }
};

