// NON-CARBON EXTENSION standing in for Trinity's own 2D UI layer. Carbon draws
// UI through Tr2Sprite2dScene into the same render target after the 3D scene;
// in a browser a 2D canvas composited over the 3D canvas gives the same layer,
// with fast native lines and text, without porting the sprite and font stack.
// ccpwgl's Tw2Device owned the same thing as its canvas2d (Tw2Device.js:717-778,
// 1043-1050, 1108-1111): sized with the 3D canvas, cleared each frame.
//
// Input is not this class's job: attach the input manager to this canvas (it
// is on top, so it receives the pointer) and let its consumers route.
import { CjsSchema, meta } from "#schema";
import { be, IBlueEvents } from "#blue";

/**
 * A 2D canvas pinned over a 3D canvas: same backing size, same CSS box,
 * cleared and redrawn on every Blue pump, and removed with its view.
 */
export class CjsOverlay2D extends IBlueEvents
{
  /** The overlay's own 2D canvas, inserted directly after the 3D canvas. */
  canvas = null;

  /** Its 2D rendering context. */
  context = null;

  /** Whether each frame starts from a cleared canvas, as ccpwgl's autoClearCanvas2dPerFrame. */
  autoClear = true;

  /** The 3D canvas it follows. */
  _target = null;

  /** Draw callbacks, called in order each frame with (context, overlay). */
  _drawers = [];

  /** The host ResizeObserver, when the platform has one. */
  _observer = null;

  /** Whether this overlay is registered for Blue ticks. */
  _ticking = false;

  /**
   * Creates the overlay canvas beside the 3D canvas.
   *
   * It registers for Blue ticks, so it draws after whatever registered
   * earlier, the device's render included: create it after the device.
   *
   * @param {object} options
   * @param {HTMLCanvasElement} options.canvas The 3D canvas to overlay.
   * @param {Document} [options.document] Document that owns it.
   * @param {boolean} [options.tick=true] Draw on every Blue pump; false leaves Render to the caller.
   */
  constructor({ canvas, document = canvas?.ownerDocument, tick = true } = {})
  {
    super();
    if (!canvas || !document) throw new TypeError("CjsOverlay2D requires the 3D canvas it overlays.");
    this._target = canvas;
    const overlay = this.canvas = document.createElement("canvas");
    overlay.className = "cjs-overlay-2d";
    overlay.tabIndex = 0;
    Object.assign(overlay.style, { position: "absolute", touchAction: "none", outline: "none" });
    canvas.insertAdjacentElement("afterend", overlay);
    this.context = overlay.getContext("2d");
    const Observer = document.defaultView?.ResizeObserver;
    if (Observer)
    {
      this._observer = new Observer(() => this.Sync());
      this._observer.observe(canvas);
    }
    this.Sync();
    if (tick)
    {
      be.os.RegisterForTicks(this, "CjsOverlay2D");
      this._ticking = true;
    }
  }

  /**
   * Matches the 3D canvas: backing-store size (so pointer and drawing
   * coordinates are the same pixels) and CSS box. Also called every frame,
   * because changing a canvas's width/height attributes fires no resize.
   *
   * @returns {boolean} Whether the backing size changed (which also clears it).
   */
  Sync()
  {
    const target = this._target, overlay = this.canvas, style = overlay.style;
    let resized = false;
    if (overlay.width !== target.width) { overlay.width = target.width; resized = true; }
    if (overlay.height !== target.height) { overlay.height = target.height; resized = true; }
    const box = {
      left: `${target.offsetLeft + target.clientLeft}px`,
      top: `${target.offsetTop + target.clientTop}px`,
      width: `${target.clientWidth}px`,
      height: `${target.clientHeight}px`
    };
    for (const key of [ "left", "top", "width", "height" ]) if (style[key] !== box[key]) style[key] = box[key];
    return resized;
  }

  /**
   * Adds a draw callback, called each frame with (context, overlay).
   *
   * @param {Function} draw Draw callback.
   * @returns {Function} The callback, for RemoveDrawer.
   */
  AddDrawer(draw)
  {
    if (typeof draw !== "function") throw new TypeError("CjsOverlay2D drawers are functions.");
    this._drawers.push(draw);
    return draw;
  }

  /**
   * Removes a draw callback.
   *
   * @param {Function} draw Draw callback.
   * @returns {boolean} Whether it was registered.
   */
  RemoveDrawer(draw)
  {
    const index = this._drawers.indexOf(draw);
    if (index < 0) return false;
    this._drawers.splice(index, 1);
    return true;
  }

  /** Follows the 3D canvas, clears, then runs every drawer in order. */
  Render()
  {
    const resized = this.Sync();
    if (this.autoClear && !resized) this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const draw of [ ...this._drawers ]) draw(this.context, this);
  }

  /** IBlueEvents: one Blue pump, after the device's 3D render. */
  OnTick(_realTime, _simTime, _cookie)
  {
    this.Render();
  }

  /** Stops ticking and observing, and removes the canvas. */
  Destroy()
  {
    if (this._ticking) be.os.UnregisterForTicks(this, "CjsOverlay2D");
    this._ticking = false;
    this._observer?.disconnect();
    this._observer = null;
    this._drawers.length = 0;
    this.canvas?.remove();
  }
}

CjsSchema.define(CjsOverlay2D, { className: "CjsOverlay2D",
  methods: Object.fromEntries([ "Sync", "AddDrawer", "RemoveDrawer", "Render", "OnTick", "Destroy" ].map(name => [ name, [ meta.ours ] ])) });
