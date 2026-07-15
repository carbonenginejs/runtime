import { CjsResource as _CjsResource } from './CjsResource.js';

const CjsResourceState = _CjsResource.State;
function isTerminalResourceState(state) {
  return state === CjsResourceState.PREPARED || state === CjsResourceState.FAILED || state === CjsResourceState.UNLOADED || state === CjsResourceState.PURGED;
}

export { CjsResourceState, isTerminalResourceState };
//# sourceMappingURL=resourceStates.js.map
