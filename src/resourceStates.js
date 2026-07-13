import { CjsResource } from "./CjsResource.js";

export const CjsResourceState = CjsResource.State;

export function isTerminalResourceState(state) {
  return state === CjsResourceState.PREPARED
    || state === CjsResourceState.FAILED
    || state === CjsResourceState.UNLOADED
    || state === CjsResourceState.PURGED;
}
