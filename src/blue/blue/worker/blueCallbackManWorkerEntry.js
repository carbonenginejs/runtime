// The default worker module of a `BlueCallbackMan` started with `Start`. It
// installs the callback host with no callbacks of its own: every entry names
// the module registered for it (`RegisterCallbackModule`), which the host
// imports the first time one of that module's callbacks runs. Imported outside
// a worker (a package-export check, a bundler), it installs nothing, as
// `CjsResManWorker` does.
import { BlueCallbackManWorker } from "./BlueCallbackManWorker.js";

if (typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope) BlueCallbackManWorker.install(globalThis);
