import { useEffect, useRef, useState } from 'react'
import './App.css'
import { setupWorkerListener } from './reciever'
import { MainMessageType } from './workerTypes';

function App() {
  const [code, setCode] = useState(`for i in range(10):
  print(i)`)
  const workerRef = useRef<Worker | null>(null)
  const bufferRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (typeof Worker === 'undefined') {
      console.error('Web Workers are not supported in this environment.');
      return;
    }
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    bufferRef.current = new Uint8Array(new SharedArrayBuffer(1));
    worker.postMessage({
      type: MainMessageType.ArrayBuffer,
      data: { buffer: bufferRef.current }
    })
    workerRef.current = setupWorkerListener(worker);
    return () => {
      worker.terminate();
      workerRef.current = null;
    }
  }, [])


  const runCode = () => {
    if (workerRef.current && bufferRef.current) {
      bufferRef.current[0] = 0; // Reset the buffer before running new code
      workerRef.current.postMessage({
        type: MainMessageType.Run,
        data: { python: code }
      });
    } else {
      console.error('Worker is not initialized');
    }
  }


  const handleInterrupt = () => {
    if (workerRef.current && bufferRef.current) {
      bufferRef.current[0] = 2; // Set the buffer to indicate an interrupt
      // workerRef.current.postMessage({
      //   type: MainMessageType.Interrupt,
      //   data: { buffer: bufferRef.current }
      // });
    } else {
      console.error('Worker is not initialized');
    }
  }

  return (
    <>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Type your code here..."
        rows={20}
        style={{
          width: '400px',
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '16px',
          boxSizing: 'border-box',
        }}
      />
      <button onClick={runCode} style={{ marginTop: '10px', padding: '10px 20px', fontSize: '16px' }}>
        Run Code
      </button>
      <button onClick={handleInterrupt} style={{ marginTop: '10px', padding: '10px 20px', fontSize: '16px' }}>
        Interrupt Execution
      </button>
    </>
  )
}

export default App
