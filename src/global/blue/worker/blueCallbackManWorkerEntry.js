// The default worker module of a `BlueCallbackMan` started with `Start`. It
// installs the callback host with no callbacks of its own: every entry names
// the module registered for it (`RegisterCallbackModule`), which the host
// imports the first time one of that module's callbacks runs.
import { BlueCallbackManWorker } from "./BlueCallbackManWorker.js";

BlueCallbackManWorker.install(globalThis);
