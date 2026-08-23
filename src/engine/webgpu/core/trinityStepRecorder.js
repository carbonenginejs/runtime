function fail(message)
{
  const error = new Error(`CjsWebgpuTrinityStepRecorder: ${message}`);
  error.code = "CJS_WEBGPU_TRINITY_STEP_INVALID";
  throw error;
}

function snapshotIntent(intent)
{
  if (!intent || typeof intent !== "object" || Array.isArray(intent))
  {
    fail("TakeIntents must return intent objects");
  }

  const snapshot = {};
  for (const [ key, value ] of Object.entries(intent))
  {
    if (Array.isArray(value))
    {
      snapshot[key] = Object.freeze(value.slice());
    }
    else if (ArrayBuffer.isView(value) && typeof value.length === "number")
    {
      snapshot[key] = Object.freeze(Array.from(value));
    }
    else
    {
      snapshot[key] = value;
    }
  }
  return Object.freeze(snapshot);
}

/**
 * Internal synchronous recorder for the duck-typed
 * `Tr2RenderContext.SetStepExecutor(...)` contract.
 *
 * It preserves ordered intent segments while render jobs run, including
 * re-entrant nested jobs. WebGPU preparation and encoding intentionally happen
 * later, after the synchronous Trinity run has returned.
 */
export class CjsWebgpuTrinityStepRecorder
{
  #context = null;

  #stack = [];

  #segments = [];

  #segmentCursor = 0;

  /** Creates an empty recorder that binds to its first render context. */
  constructor()
  {
  }

  /**
   * Flushes intents recorded outside a step, or the remaining intents of the
   * current step, into one immutable ordered segment.
   */
  Flush(context)
  {
    this.#BindContext(context);
    return this.#Drain();
  }

  /**
   * Delegates step setup to `BeginExecute` and snapshots setup intents before
   * the step starts executing.
   */
  BeginStep(step, realTime, simTime, job, context)
  {
    this.#BindContext(context);
    this.#Drain();

    const entry = {
      step: step ?? null,
      job: job ?? null,
      realTime,
      simTime,
      phase: "begin"
    };
    this.#stack.push(entry);

    let result;
    let error = null;
    try
    {
      result = step?.BeginExecute?.(context);
    }
    catch (caught)
    {
      error = caught;
    }
    try
    {
      this.#Drain();
    }
    catch (caught)
    {
      if (!error) error = caught;
    }

    if (error)
    {
      this.#stack.pop();
      throw error;
    }
    entry.phase = "execute";
    return result;
  }

  /**
   * Delegates to the step's synchronous `Execute` method and snapshots every
   * intent it emits. Nested jobs may re-enter this recorder while it runs.
   */
  ExecuteStep(step, realTime, simTime, job, context)
  {
    const entry = this.#RequireTop(step, job, context);
    entry.realTime = realTime;
    entry.simTime = simTime;
    entry.phase = "execute";

    let result;
    let error = null;
    try
    {
      result = step?.Execute?.(realTime, simTime, context);
    }
    catch (caught)
    {
      error = caught;
    }
    try
    {
      this.#Drain();
    }
    catch (caught)
    {
      if (!error) error = caught;
    }
    if (error) throw error;
    return result;
  }

  /**
   * Delegates step teardown to `EndExecute`, snapshots its intents, and closes
   * the active nesting level even when teardown throws.
   */
  EndStep(step, realTime, simTime, job, context)
  {
    const entry = this.#RequireTop(step, job, context);
    entry.realTime = realTime;
    entry.simTime = simTime;
    entry.phase = "end";

    let result;
    let error = null;
    try
    {
      result = step?.EndExecute?.(context);
    }
    catch (caught)
    {
      error = caught;
    }
    try
    {
      this.#Drain();
    }
    catch (caught)
    {
      if (!error) error = caught;
    }
    this.#stack.pop();
    if (error) throw error;
    return result;
  }

  /** Returns every recorded segment without advancing the take cursor. */
  GetSegments()
  {
    return this.#segments.slice();
  }

  /** Returns untaken segments without advancing the take cursor. */
  PeekSegments()
  {
    return this.#segments.slice(this.#segmentCursor);
  }

  /** Returns untaken segments exactly once and advances the take cursor. */
  TakeSegments()
  {
    const segments = this.#segments.slice(this.#segmentCursor);
    this.#segmentCursor = this.#segments.length;
    return segments;
  }

  /** Clears recorded segments after every nested step has closed. */
  ClearSegments()
  {
    if (this.#stack.length) fail("cannot clear segments while a step is active");
    this.#segments.length = 0;
    this.#segmentCursor = 0;
  }

  /** Binds this recorder to one intent-producing render context. */
  #BindContext(context)
  {
    if (!context || typeof context.TakeIntents !== "function")
    {
      fail("context requires TakeIntents");
    }
    if (this.#context && this.#context !== context)
    {
      fail("recorder is already bound to another context");
    }
    this.#context = context;
  }

  /** Returns the active entry after validating balanced step lifecycle calls. */
  #RequireTop(step, job, context)
  {
    this.#BindContext(context);
    const entry = this.#stack.at(-1);
    if (!entry || entry.step !== (step ?? null) || entry.job !== (job ?? null))
    {
      fail("step lifecycle is unbalanced");
    }
    return entry;
  }

  /** Snapshots the context's pending intents into one immutable segment. */
  #Drain()
  {
    const intents = this.#context.TakeIntents();
    if (!Array.isArray(intents)) fail("context TakeIntents must return an array");
    if (!intents.length) return null;

    const entry = this.#stack.at(-1) ?? null;
    const segment = Object.freeze({
      step: entry?.step ?? null,
      job: entry?.job ?? null,
      realTime: entry?.realTime ?? null,
      simTime: entry?.simTime ?? null,
      phase: entry?.phase ?? "setup",
      intents: Object.freeze(intents.map(snapshotIntent))
    });
    this.#segments.push(segment);
    return segment;
  }
}
