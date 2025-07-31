import { WorkerMessageType } from './workerTypes';



// recieve messages from webworker in file worker.mts

const recieveMessage = (ev: MessageEvent) => {
    const { type, output, error } = ev.data;
    switch (type) {
        case WorkerMessageType.Output:
            console.log('Output:', output);
            break;
        case WorkerMessageType.Error:
            console.error('Error:', error);
            break;
        case WorkerMessageType.Finish:
            console.log('Execution finished');
            break;
        default:
            console.warn('Unknown message type:', type);
    }
}



export const setupWorkerListener = (worker: Worker) : Worker | null => {
    if (typeof Worker === 'undefined') {
        console.error('Web Workers are not supported in this environment.');
        return null;
    }

    worker.onmessage = recieveMessage;

    return worker;
}

