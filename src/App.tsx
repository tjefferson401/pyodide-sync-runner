import { useEffect, useRef, useState } from 'react'
import './App.css'
import { runPython, interruptExecution } from './pyodideClient'
import { Editor } from '@monaco-editor/react'

function App() {
  const [code, setCode] = useState(`print("dfdf")
i = input("HI!")  
print(i)`)
  const [codeIsRunning, setCodeIsRunning] = useState(false)
  const [outputBuffer, setOutputBuffer] = useState<string[]>([])
  const inputPromiseRef = useRef<{ promise: Promise<string>, resolve: (value: string) => void } | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [steps, setSteps] = useState<any[]>([])


  useEffect(() => {
    // set initial input promise
    let resolveFunc = (value: string) => {};
    // Returns object with promise member and resolve member
    
    inputPromiseRef.current = {
      promise: new Promise(function (resolve, reject) {
        resolveFunc = resolve;
      }),
      resolve: resolveFunc,
    };

  }, [])


  const handleStdout = (stdOut: string) => {
    setOutputBuffer((prev) => {
      const newStdout = [...prev, stdOut];
      if (newStdout.length > 2000) {
        newStdout.shift(); // Keep the buffer size manageable
      }
      return newStdout;
    })
    console.log('stdout:', stdOut)

  }


  const handleInput = async (prompt: string): Promise<string> => {
    // add prompt to output buffer
    handleStdout(prompt);
    const input = await inputPromiseRef.current?.promise; // Wait for the input promise to resolve
    console.log('Input received:', input);
    setInputValue(''); 
    inputPromiseRef.current = {
      promise: new Promise((resolve) => {
        inputPromiseRef.current!.resolve = resolve;
      }),
      resolve: inputPromiseRef.current!.resolve,
    }
    console.log('Input received:', input);
    if(input === undefined) return ''; 
    return input;
  }


  const inputOnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent the default behavior of the Enter key
      inputPromiseRef.current?.resolve(
        inputValue
      ); // Resolve the input promise with the input value

    }
  }


  const runCode = () => {
    if (codeIsRunning) {
      handleInterrupt();
      return;
    }
    runPython(code, onEnd, handleInput, handleStdout, handleStdout)
    setCodeIsRunning(true)
  }


  const onEnd = (steps: any[]) => {
    setCodeIsRunning(false)
    setSteps(steps);
    console.log('Execution finished with steps:', steps);
  }


  const handleInterrupt = () => {
    interruptExecution();
  }

  return (
    <div style={{
      display: 'flex',
    }}>
      <div style={{ width: '50%', margin: '0 auto' }}>
          <button onClick={runCode} style={{ marginTop: '10px', padding: '10px 20px', fontSize: '32px' }}>
            {
              codeIsRunning ? '🛑': '🏃' 
            }
        </button>
        <Editor
          height="400px"
          defaultLanguage="python"
          defaultValue={code}
          onChange={(value) => setCode(value || '')}
          options={{
            fontSize: 16,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
          }}
        />
        <div style={{ padding: '10px', backgroundColor: '#000', borderRadius: '5px' }}>
          <h3>Output:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', minHeight: "300px", maxHeight: '300px', overflowY: 'auto'}}>
            {outputBuffer.join('\n')}
          </pre>
          <input 
            type="text"
            value={inputValue}
            style={{
              color: "black"
            }}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={inputOnKeyDown}
          />
        </div>
      </div>
      <div style={{ width: '50%', margin: '0 auto', color: "black", maxHeight: "100vh", overflowY: "auto" }}>
        <ul>
          {steps.slice(
            steps.length - 10, steps.length
          ).map((step, index) => (
            <li key={index}>
              <strong>Function:</strong> {step[0]}, <strong>Line:</strong> {step[1]}, <strong>Locals:</strong> {JSON.stringify(step[2])}
            </li>
          ))}
        </ul>
      </div>

    </div>
  )
}

export default App
