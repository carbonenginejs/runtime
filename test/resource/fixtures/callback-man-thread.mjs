// CPU-only Node transport adapter for BeCallbackMan's default worker entry:
// the generic callback host, which imports each registered callback module the
// first time one of its callbacks runs.
import { parentPort } from "node:worker_threads";
import { BlueCallbackManWorker } from "../../../npm/dist/global/blue/worker/BlueCallbackManWorker.js";
if (parentPort)
{
    BlueCallbackManWorker.install({
        postMessage: (message, transfer) => parentPort.postMessage(message, transfer),
        addEventListener: (type, callback) => parentPort.on(type, data => callback({ data })),
        removeEventListener() {}
    });
}
