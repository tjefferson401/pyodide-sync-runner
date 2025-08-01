// @ts-ignore
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.mjs";
// @ts-ignore
import type { PyodideInterface } from "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.mjs";
import { PREFIX } from "./setup";

// Type the self object to include the pauseHook

self.interruptFlag = false; // Flag to indicate if an interrupt has been requested
self.pyodideReady = loadPyodide();

declare global {
    interface Window {
        resumeFn: ((value?: unknown) => void) | null;
        pauseHook: (msg: any) => Promise<any>;
        interruptFlag: boolean;
        pyodideReady: Promise<PyodideInterface>;
        getInput: (prompt: string) => Promise<string>;
    }
}

self.resumeFn = null; // Resolver for the pause hook

self.pauseHook = (msg: any) => new Promise(async (res: any) => {
    self.resumeFn = res; // save resolver for later
    const { where, prompt } = msg;
    console.log("Paused at:", where);
    if (self.interruptFlag) {
        console.log("Execution interrupted");
        self.interruptFlag = false; // Reset the interrupt flag
        // set SHOULD_INTERRUPT to true in the Python code
        self.pyodideReady.then(pyodide => {
            pyodide.runPythonAsync(`SHOULD_INTERRUPT = True`);
        });
    } else if (where == "input") {
        console.log("Waiting for input:", prompt);
        // Wait for the input from the user
        const input = await self.getInput(prompt);
        // Send the input back to the Python code
        const pyodide = await self.pyodideReady;
        console.log("Input received:", input);
        pyodide.runPythonAsync(`INPUT_VAR = '${input}'`);
        console.log("Input received:", input);
        console.log("Resuming execution");
    }
    console.log("Resuming execution");
    res(); // Resolve immediately if no interrupt is requested

})



export async function getPyodide(): Promise<PyodideInterface> {
    if (!self.pyodideReady) {
        throw new Error("Pyodide is not ready");
    }
    return await self.pyodideReady;
}



export async function runPython(python: string, onEnd: (steps: any) => void, onInput: (prompt:string) => Promise<string>, stdoutCallback: (stdOut: string) => void= console.log, stderrCallback: (stdErr: string) => void = console.log): Promise<void> {
    const pyodide = await getPyodide();
    self.getInput = onInput; // Set the input handler

    // Set stdout and stderr callbacks
    pyodide.setStdout({
        batched: stdoutCallback,
    });

    pyodide.setStderr({
        batched: stderrCallback,
    });

    try {
        // Run the Python code
        console.log("Running Python code");
        await pyodide.runPythonAsync(PREFIX);
        console.log("Running student code");
        await pyodide.runPythonAsync(python);
        console.log("Python code executed successfully");
        // get STEPS from Python
        const steps = pyodide.globals.get('STEPS').toJs();
        console.log("Steps retrieved:", steps);


        onEnd(steps); 
    } catch (error) {
        // Handle any errors that occur during execution
        if (error instanceof Error) {
            stderrCallback(error.message);
        } else {
            stderrCallback('An unknown error occurred');
        }
        const steps = pyodide.globals.get('STEPS').toJs();

        onEnd(steps); 
    }
}


export function interruptExecution(): void {
    if (self.resumeFn) {
        self.interruptFlag = true; // Set the interrupt flag
        self.resumeFn(); // Resolve the pause hook to interrupt execution
        self.resumeFn = null; // Clear the resolver
    } else {
        console.error('No execution in progress to interrupt');
    }
}


