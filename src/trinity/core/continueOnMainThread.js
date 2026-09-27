// Source: trinity/trinity/ContinueOnMainThread.h
// Source: trinity/trinity/ContinueOnMainThread.cpp
//
// Carbon's deferred-action queue. Callers enqueue work with
// ContinueOnMainThread and the frame drains it with ExecuteMainThreadActions,
// from TriDevice::OnTick (TriDevice.cpp:844) and from EveSpaceScene::Update
// after the asynchronous object pass (EveSpaceScene.cpp:584). JavaScript has a
// single thread, so the mutex has no equivalent; the deferral itself is kept
// because it is observable ordering: controller action Start/Stop and
// updateable Update run at the drain, not at the call that queued them.
//
// Module state mirrors the donor's anonymous namespace (ContinueOnMainThread.cpp:8-13).

/** `mainThreadActions` - actions queued since the last swap. */
let mainThreadActions = [];

/** `actionsToProcess` - the swapped-out batch currently being executed. */
let actionsToProcess = [];

/** `invocations` - reentrancy counter; a nested drain only requests another pass. */
let invocations = 0;

/**
 * Queues an action to run at the next ExecuteMainThreadActions
 * (`ContinueOnMainThread.cpp:14-18`). Always enqueues, even when called from
 * inside a drain.
 *
 * @param {Function} action The work to run.
 */
export function ContinueOnMainThread(action)
{
  mainThreadActions.push(action);
}

/**
 * Runs every queued action (`ContinueOnMainThread.cpp:20-52`).
 *
 * The donor's reentrancy shape is kept: a nested call increments the counter
 * and returns, which makes the outer loop swap and run one more batch. Actions
 * queued during a drain without a nested call wait for the next drain. If an
 * action throws, the rest of its batch is dropped and the counter reset, as
 * the donor's ON_BLOCK_EXIT does (`:29-32`); the exception propagates.
 */
export function ExecuteMainThreadActions()
{
  invocations++;
  if (invocations > 1)
  {
    return;
  }

  try
  {
    while (invocations > 0)
    {
      const swapped = actionsToProcess;
      actionsToProcess = mainThreadActions;
      mainThreadActions = swapped;
      for (const action of actionsToProcess)
      {
        action();
      }
      actionsToProcess.length = 0;
      invocations--;
    }
  }
  finally
  {
    invocations = 0;
    actionsToProcess.length = 0;
  }
}
