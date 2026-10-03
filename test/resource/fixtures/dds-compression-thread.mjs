// CPU-only Node transport adapter for the production compression worker.
import { parentPort } from "node:worker_threads";
import { installCompressionWorker } from "../../../npm/dist/resource/formats/dds/compressionWorker.js";
if (parentPort)
{
    installCompressionWorker({
        postMessage: (message, transfer) => parentPort.postMessage(message, transfer),
        addEventListener: (type, callback) => parentPort.on(type, data => callback({ data })),
        removeEventListener() {}
    });
}
