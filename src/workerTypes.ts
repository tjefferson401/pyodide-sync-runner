
export enum WorkerMessageType {
    Output = 'output',
    Error = 'error',
    Finish = 'finish'
}


export enum MainMessageType {
    Run = 'run',
    Stop = 'stop',
    Test = 'test',
    ArrayBuffer = 'arrayBuffer',
    Interrupt = 'interrupt'
}