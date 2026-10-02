// Node transport adapter; execution and transfer lists use the production worker.
import { parentPort } from "node:worker_threads";
import { CjsResManWorker } from "../../../npm/dist/global/blue/worker/CjsResManWorker.js";
// Node's default test discovery also imports fixture files on the main thread.
if (parentPort)
{
  const scope = { postMessage: (message, transfer) => parentPort.postMessage(message, transfer) };
  CjsResManWorker.install(scope);
  parentPort.on("message", data => scope.onmessage({ data }));
}
