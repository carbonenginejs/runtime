import { parentPort } from "node:worker_threads";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { CjsStorage, CjsIndexedDBStorage } from "../../../src/resource/storage/index.js";

const storage = new CjsStorage({ namespace: "worker", backend: new CjsIndexedDBStorage({ indexedDB: new IDBFactory(), keyRange: IDBKeyRange }) });
await storage.Write("artifacts", "shader", { bytes: new Uint8Array([3, 1, 4]), id: 9007199254740993n });
const result = await storage.Read("artifacts", "shader");
await storage.Close();
parentPort.postMessage(result, [result.value.bytes.buffer]);
