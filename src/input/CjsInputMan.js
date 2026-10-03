import { CjsSchema, meta } from "#schema";
import { Tr2MainWindow } from "./Tr2MainWindow.js";

/** Approved browser extension: queued shared camera/tool routing over Tr2MainWindow. */
export class CjsInputMan
{
  static Result = Object.freeze({ PASS: 0, HANDLED: 1, CONSUME: 2, CAPTURE: 3, RELEASE: 4 });
  _consumers = [];
  _queue = [];
  _owner = null;
  _pointer = null;
  _lastPointer = null;
  _generation = 0;
  _pumping = null;
  _attachment = null;
  maxQueuedMoves = 256;

  /** Installs exactly one raw input path. Borrowed adapters must have empty routing callbacks. */
  Attach({ target, window: hostWindow = globalThis.window, document: hostDocument = hostWindow?.document,
    mainWindow = null, getSize = () => ({ width: target.width, height: target.height }), preventDefault = true } = {})
  {
    this.Detach();
    if (!target) throw new TypeError("Input requires an explicit host target.");
    const adapter = mainWindow || new Tr2MainWindow();
    const callbacks = {
      onMouseDown: (_button, _x, _y, event) => this.#Pointer("pointerdown", event),
      onMouseUp: (_button, _x, _y, event) => this.#Pointer("pointerup", event),
      onMouseMove: (_x, _y, _dx, _dy, event) => this.#Pointer("pointermove", event),
      onMouseWheel: (_delta, event) => this.#Pointer("wheel", event),
      onKeyDown: (_key, _repeat, event) => this.#Key("keydown", event),
      onKeyUp: (_key, event) => this.#Key("keyup", event),
      onFocusChange: focused => { if (!focused) this.Cancel("focus-lost"); },
      onCompositionStart: () => this.Cancel("text-composition"),
      onPointerCancel: event =>
      {
        if (this._pointer === event.pointerId) this.Cancel("pointer-cancelled");
      }
    };
    for (const name of Object.keys(callbacks))
      if (adapter[name] !== null && adapter[name] !== undefined) throw new Error(`Input callback ${name} is already owned.`);
    this._attachment = { adapter, target, hostDocument, getSize, preventDefault, callbacks, owned: !mainWindow };
    for (const [name, callback] of Object.entries(callbacks)) adapter[name] = callback;
    if (!mainWindow) adapter.Attach({ target, window: hostWindow, document: hostDocument });
    return this;
  }

  /** Unregisters only callbacks owned by this manager; borrowed hosts remain attached. */
  Detach()
  {
    this.Cancel("detached");
    const attachment = this._attachment;
    this._attachment = null;
    if (!attachment) return;
    for (const [name, callback] of Object.entries(attachment.callbacks))
      if (attachment.adapter[name] === callback) attachment.adapter[name] = null;
    if (attachment.owned) attachment.adapter.Detach();
  }

  /** Adds an explicitly described consumer; higher priority receives unowned input first. */
  Register({ handle, cancel, preview = null, update = null, priority = 0 })
  {
    if (typeof handle !== "function" || typeof cancel !== "function") throw new TypeError("Input consumers require handle and cancel callbacks.");
    if (preview !== null && typeof preview !== "function" || update !== null && typeof update !== "function")
      throw new TypeError("Input preview and frame update callbacks must be functions or null.");
    const consumer = { handle, cancel, preview, update, priority };
    this._consumers.push(consumer);
    this._consumers.sort((a, b) => b.priority - a.priority);
    return consumer;
  }

  /** Cancels capture before removing its consumer. */
  Unregister(consumer)
  {
    if (this._owner === consumer) this.Cancel("consumer-removed");
    else consumer.cancel("consumer-removed");
    const index = this._consumers.indexOf(consumer);
    if (index >= 0) this._consumers.splice(index, 1);
  }

  /** Queues normalized host input; only adjacent pointer moves may be coalesced. */
  Enqueue(event)
  {
    const last = this._queue.at(-1);
    if (event.type === "pointermove" && last && last.type === "pointermove" && last.pointerId === event.pointerId)
    {
      this._queue[this._queue.length - 1] = { ...event, dx: last.dx + event.dx, dy: last.dy + event.dy };
      return;
    }
    if (event.type === "pointermove" && this._queue.length >= this.maxQueuedMoves) return;
    this._queue.push(event);
  }

  /** Drains at the host's chosen frame boundary; asynchronous handle picks serialize input. */
  Update(dt = 0)
  {
    if (this._pumping) return this._pumping;
    this._pumping = this.#Drain().then(() =>
    {
      const boundedDt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0;
      for (const consumer of [...this._consumers])
        if (consumer.update && (!this._owner || this._owner === consumer)) consumer.update(boundedDt);
    }).finally(() => { this._pumping = null; });
    return this._pumping;
  }

  /** Cancels pending and captured interactions synchronously, including an outstanding pick. */
  Cancel(reason = "cancelled")
  {
    this._generation++;
    this._queue.length = 0;
    this._owner = null;
    const pointer = this._pointer;
    this._pointer = null;
    this._lastPointer = null;
    for (const consumer of [...this._consumers]) consumer.cancel(reason);
    const target = this._attachment?.target;
    if (target && pointer !== null && target.hasPointerCapture?.(pointer)) target.releasePointerCapture(pointer);
  }

  /** Releases host listeners and all registered consumers. */
  Destroy()
  {
    this.Detach();
    this._consumers.length = 0;
  }

  /** The browser default/capture policy is synchronous; scene mutation stays queued. */
  #Pointer(type, event)
  {
    const { target, hostDocument, getSize, preventDefault } = this._attachment;
    if (hostDocument?.hidden || event.defaultPrevented) return;
    if ((type === "pointerdown" || type === "wheel") && (event.ctrlKey || event.altKey || event.metaKey)) return;
    if (type === "wheel" && hostDocument?.activeElement !== target && !target.contains?.(hostDocument?.activeElement)) return;
    if (type !== "wheel" && this._pointer !== null && event.pointerId !== this._pointer) return;
    const bounds = target.getBoundingClientRect(), size = getSize();
    if (!bounds.width || !bounds.height || !size.width || !size.height) return;
    if (preventDefault) event.preventDefault();
    if (type === "pointerdown")
    {
      this._pointer = event.pointerId;
      target.setPointerCapture?.(event.pointerId);
      target.focus?.({ preventScroll: true });
    }
    const sx = size.width / bounds.width, sy = size.height / bounds.height;
    const previous = this._lastPointer;
    const dx = type !== "pointerdown" && previous?.id === event.pointerId ? event.clientX - previous.x : 0;
    const dy = type !== "pointerdown" && previous?.id === event.pointerId ? event.clientY - previous.y : 0;
    if (type !== "wheel") this._lastPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    const wheel = (event.deltaY || 0) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1);
    this.Enqueue({ type, pointerId: event.pointerId, button: event.button, buttons: event.buttons,
      x: (event.clientX - bounds.left) * sx, y: (event.clientY - bounds.top) * sy,
      dx: dx * sx, dy: dy * sy, wheel, code: event.code,
      shift: !!event.shiftKey, ctrl: !!event.ctrlKey, alt: !!event.altKey, meta: !!event.metaKey });
    // A normal pointer-up is queued, not cancelled by the browser's automatic
    // lostpointercapture. Its consumer still receives every preceding move.
    if (type === "pointerup")
    {
      this._pointer = null;
      this._lastPointer = null;
      if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
    }
  }

  /** Shortcuts only apply to the focused host and never intercept editable controls. */
  #Key(type, event)
  {
    const { target, hostDocument } = this._attachment;
    const active = hostDocument?.activeElement;
    if (event.defaultPrevented || event.isComposing) return;
    if (event.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName || "")) return;
    if (active !== target && !target.contains?.(active)) return;
    if (type === "keydown" && event.code === "Escape")
    {
      event.preventDefault();
      this.Cancel("escape");
      return;
    }
    const normalized = { type, code: event.code, repeat: !!event.repeat, shift: !!event.shiftKey,
      ctrl: !!event.ctrlKey, alt: !!event.altKey, meta: !!event.metaKey };
    for (const consumer of this._consumers)
    {
      if (consumer.preview && consumer.preview(normalized))
      {
        event.preventDefault();
        break;
      }
    }
    this.Enqueue(normalized);
  }

  /** Capture is exclusive; stale asynchronous answers cannot reclaim it after cancellation. */
  async #Drain()
  {
    while (this._queue.length)
    {
      const event = this._queue.shift(), generation = this._generation;
      const pointerEvent = event.type.startsWith("pointer") || event.type === "wheel";
      const consumers = this._owner && pointerEvent ? [this._owner] : [...this._consumers];
      for (const consumer of consumers)
      {
        if (!this._consumers.includes(consumer)) continue;
        let result;
        try { result = await consumer.handle(event); }
        catch (error) { this.Cancel("input-error"); throw error; }
        if (generation !== this._generation || !this._consumers.includes(consumer)) break;
        if (result === CjsInputMan.Result.CAPTURE) this._owner = consumer;
        if (result === CjsInputMan.Result.RELEASE || event.type === "pointerup") this._owner = null;
        if (result >= CjsInputMan.Result.CONSUME || pointerEvent && this._owner) break;
      }
    }
  }
}

CjsSchema.define(CjsInputMan, { className: "CjsInputMan",
  methods: Object.fromEntries(["Attach", "Detach", "Register", "Unregister", "Enqueue", "Update", "Cancel", "Destroy"].map(name => [name, [meta.ours]])) });
