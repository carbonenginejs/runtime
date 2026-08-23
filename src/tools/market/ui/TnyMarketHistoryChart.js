import { buildHistoryChart, formatISK, formatQuantity } from "../marketModel.js";

const SVG = "http://www.w3.org/2000/svg";

/**
 * Used only until the host has a measurable size.
 *
 * The geometry was always built at exactly this, and the SVG scaled it to fit —
 * which, with the default `preserveAspectRatio`, means a host of any other
 * shape got the plot letterboxed inside it rather than filled. In a wide short
 * bar that left the chart a small centred rectangle with empty space either
 * side, looking like a chart that would not grow.
 *
 * So the model is built at the host's own aspect instead, and the viewBox
 * follows it. Nothing is scaled and nothing is stretched: the type stays the
 * size it was authored at, and the plot uses the room it has.
 */
const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 360;

/**
 * The fall, and the rise.
 *
 * Picking another card replaces one history with another, and swapping the
 * paths in one frame reads as a glitch rather than as new data — the eye has
 * nothing to follow and cannot tell a redraw from a rendering fault.
 *
 * So the old line drops to the baseline and the new one grows out of it. The
 * fall eases *in*, because it is a collapse and a collapse accelerates; the
 * rise eases *out*, because it is arriving and an arrival settles. The fall is
 * the shorter of the two: it is carrying no information, and every millisecond
 * of it is a millisecond the reader waits.
 */
const COLLAPSE_MS = 160;
const GROW_MS = 320;

/** How far the red and cyan channels separate at full collapse. */
const ABERRATION_PX = 9;

/**
 * The empty plot: what it says, and how many rules it keeps.
 *
 * Unlabelled, because with no prices there is no scale to label them with.
 * They are the shape of a chart rather than a reading, which is what makes an
 * empty one look like an answer instead of a panel that failed to load.
 */
const EMPTY_TEXT = "NO PRICE HISTORY FOR THIS RANGE";
const EMPTY_RULES = 4;
const SCRAMBLE_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&/<>*+=";
const SCRAMBLE_SETTLE_MS = 260;
const SCRAMBLE_STAGGER_MS = 22;

/**
 * Lightweight SVG price-history renderer. It consumes the market window's
 * normalized history records and owns no source or transport behavior.
 */
export class TnyMarketHistoryChart
{

    #history = [];

    #frame = null;

    #progress = 1;

    #hide = null;

    /**
     * @param {HTMLElement} container
     * @param {Object} [options]
     * @param {Boolean} [options.volume] - draw the daily volume bars
     */
    constructor(container, { volume = true } = {})
    {
        // Optional rather than removed. The bars belong in the standalone
        // window, which is a faithful in-game market and is where somebody
        // reading an order book wants to see how much moved. In a strip beside
        // a catalog they are a second series competing with the one line the
        // strip exists to show.
        this.volume = volume;
        this.element = document.createElement("div");
        this.element.className = "market-chart";

        this.svg = document.createElementNS(SVG, "svg");
        this.svg.setAttribute("viewBox", `0 0 ${DEFAULT_WIDTH} ${DEFAULT_HEIGHT}`);
        this.svg.setAttribute("role", "img");
        this.svg.setAttribute("aria-label", "Regional price and volume history");

        this.tooltip = document.createElement("div");
        this.tooltip.className = "market-chart-tooltip";
        this.tooltip.hidden = true;
        this.element.append(this.svg, this.tooltip);
        container.appendChild(this.element);

        this.svg.addEventListener("pointermove", event => this.#Point(event));

        // Four ways to stop pointing at it, because `pointerleave` alone only
        // covers the one where the pointer walks out of the box. It does not
        // fire when the window loses focus, when the page is hidden — switching
        // browser tab with the cursor over the plot left the tooltip up, which
        // is how this was noticed — or when a gesture is cancelled out from
        // under the element. All four mean the same thing here.
        this.svg.addEventListener("pointerleave", () => this.HideTooltip());
        this.svg.addEventListener("pointercancel", () => this.HideTooltip());
        this.#hide = () => this.HideTooltip();
        window.addEventListener("blur", this.#hide);
        document.addEventListener("visibilitychange", this.#hide);

        // Redrawn on resize rather than rescaled, because the geometry is built
        // for a shape: stretching it would distort the axis type, and leaving it
        // would restore the letterboxing the moment the window changed.
        if (typeof ResizeObserver === "function")
        {
            this.observer = new ResizeObserver(() => this.#Redraw());
            this.observer.observe(container);
        }
    }

    /**
     * Replaces the plotted history, growing the new line out of the baseline.
     *
     * The grow starts from flat *at the new data's own x positions*, which is
     * what makes this possible at all: two histories rarely have the same
     * number of days, so there is no sensible frame-by-frame morph from one
     * shape to the other. Both ends of each animation share their x values with
     * the shape they belong to, and only the heights move.
     */
    Show(history)
    {
        this.#history = history ?? [];
        this.#Redraw();
        this.#Animate(0, 1, GROW_MS, EaseOut);
    }

    /**
     * Pulls the legs out from under the current line.
     *
     * Called when a new selection starts rather than when its data arrives, so
     * the bar answers the click immediately and the wait is filled by something
     * that means "this is going". A chart with nothing plotted has nothing to
     * collapse and says so by doing nothing.
     */
    Collapse()
    {
        if (!this.model?.points?.length) return;

        this.HideTooltip();
        this.#Animate(this.#progress, 0, COLLAPSE_MS, EaseIn);
    }

    /** Releases the resize observation for a dynamically owned chart. */
    Destroy()
    {
        this.observer?.disconnect();
        this.observer = null;
        // Document-level listeners outlive the element they were added for, so
        // a chart that is thrown away without this leaves two callbacks holding
        // it alive for as long as the page lasts.
        if (this.#hide)
        {
            window.removeEventListener("blur", this.#hide);
            document.removeEventListener("visibilitychange", this.#hide);
            this.#hide = null;
        }
        this.#StopAnimation();
        this.element.remove();
    }

    /**
     * Drives both paths between flat and drawn.
     *
     * One loop, cancelled on entry: a reader clicking down the grid faster than
     * the animation runs would otherwise have two loops writing the same two
     * attributes, and whichever frame landed last would win.
     */
    #Animate(from, to, duration, ease)
    {
        this.#StopAnimation();

        if (!this.averageEl || Reduced())
        {
            this.#SetProgress(to);
            return;
        }

        // Synchronously, before the first frame. `requestAnimationFrame` does
        // not run until after the browser has had a chance to paint, so without
        // this the full shape flashes for one frame before the grow starts from
        // flat — which is the glitch the animation exists to remove.
        this.#SetProgress(from);

        const started = performance.now();

        const step = now =>
        {
            const elapsed = Math.min(1, (now - started) / duration);

            this.#SetProgress(from + (to - from) * ease(elapsed));

            if (elapsed < 1) this.#frame = requestAnimationFrame(step);
            else this.#frame = null;
        };

        this.#frame = requestAnimationFrame(step);
    }

    /** Cancels the active chart animation before a replacement draw. */
    #StopAnimation()
    {
        if (this.#frame === null) return;

        cancelAnimationFrame(this.#frame);
        this.#frame = null;
    }

    /**
     * Rewrites both paths at `progress`, where 0 is flat on the baseline and 1
     * is the plotted shape.
     *
     * The strings are rebuilt rather than the element transformed: a `scaleY`
     * would thin the line as it flattened and thicken it as it rose, because a
     * stroke scales with its geometry. Rebuilding the `d` moves only the
     * points, which is what is actually happening.
     */
    #SetProgress(progress)
    {
        this.#progress = progress;

        if (!this.averageEl || !this.model?.points?.length) return;

        const base = this.baseline;
        const at = value => base + (value - base) * progress;
        // One record draws a flat line across the plot rather than nothing.
        //
        // A single point is `M x,y` — a moveto with no segment after it, which
        // has no geometry and paints nothing at all, so a type that has traded
        // exactly once looked like a type that had failed to load. Spanning the
        // width says what is actually known: one price, no trend. The dot and
        // the tooltip still sit on the real date, so the line is a reading of
        // the level and the point is the reading of the day.
        const points = this.model.points.length === 1
            ? [
                { ...this.model.points[0], x: this.model.margin.left },
                { ...this.model.points[0], x: this.model.width - this.model.margin.right }
            ]
            : this.model.points;
        const average = points.map((point, index) =>
            `${index ? "L" : "M"}${Round(point.x)},${Round(at(point.averageY))}`).join(" ");
        const high = points.map((point, index) =>
            `${index ? "L" : "M"}${Round(point.x)},${Round(at(point.highY))}`).join(" ");
        const low = points.slice().reverse()
            .map(point => `L${Round(point.x)},${Round(at(point.lowY))}`).join(" ");

        this.averageEl.setAttribute("d", average);
        this.bandEl.setAttribute("d", `${high} ${low} Z`);
        this.#Aberration(average, progress);
    }

    /**
     * The plot with nothing in it, and a message that resolves out of noise.
     *
     * The frame stays up. A component with no trades is not a component with no
     * chart, and clearing the whole panel made the bar look like it had failed
     * to load rather than like it had an answer — "nothing sold" *is* the
     * answer, and it is a common one for unreleased and newly listed material.
     *
     * The rules are drawn at fixed fractions rather than from `yTicks`, which
     * is empty here: with no prices there is no scale, so they carry no values
     * and are not labelled. They are the shape of a chart, which is what makes
     * the emptiness read as a reading rather than as a blank.
     *
     * The message decodes and shears with the same two effects the rest of the
     * page uses, driven by one progress value — the aberration is strongest
     * while the letters are still churning and gone once they settle.
     */
    #DrawEmpty(boxWidth, boxHeight)
    {
        const { margin } = this.model;
        const top = margin.top;
        const bottom = boxHeight - margin.bottom;

        for (let step = 0; step <= EMPTY_RULES; step++)
        {
            const y = top + (bottom - top) * (step / EMPTY_RULES);

            this.svg.appendChild(createElement("line", {
                x1: margin.left,
                x2: boxWidth - margin.right,
                y1: y,
                y2: y,
                class: "market-chart-grid"
            }));
        }

        const position = {
            x: boxWidth / 2,
            y: (top + bottom) / 2,
            "text-anchor": "middle"
        };

        // Three copies, the ghosts first so the readable one is on top. SVG text
        // takes no pseudo-elements, so the chromatic split cannot be borrowed
        // from the stylesheet the way the hero's is — it is three real nodes.
        this.emptyRed = createElement("text", { ...position, class: "market-chart-empty ghost red" });
        this.emptyCyan = createElement("text", { ...position, class: "market-chart-empty ghost cyan" });
        this.emptyEl = createElement("text", { ...position, class: "market-chart-empty" });
        this.svg.append(this.emptyRed, this.emptyCyan, this.emptyEl);

        this.#Decode();
    }

    /** Resolves the empty message out of noise, shearing while it churns. */
    #Decode()
    {
        const text = EMPTY_TEXT;
        const settleAt = SettleTimes(text);
        const done = settleAt.at(-1) ?? 0;

        this.#StopAnimation();

        if (Reduced())
        {
            this.#WriteEmpty(text, 0);

            return;
        }

        const started = performance.now();

        const step = now =>
        {
            const elapsed = now - started;
            const settled = Math.min(1, elapsed / done);

            this.#WriteEmpty(ScrambleFrame(text, elapsed, settleAt), 1 - settled);

            if (settled < 1) this.#frame = requestAnimationFrame(step);
            else this.#frame = null;
        };

        this.#frame = requestAnimationFrame(step);
    }

    /** Draws the chart empty-state message for an absent history series. */
    #WriteEmpty(value, strength)
    {
        if (!this.emptyEl) return;

        const shift = strength * ABERRATION_PX;

        for (const node of [ this.emptyEl, this.emptyRed, this.emptyCyan ]) node.textContent = value;

        this.emptyRed.setAttribute("transform", `translate(${-shift} ${shift * 0.4})`);
        this.emptyCyan.setAttribute("transform", `translate(${shift} ${-shift * 0.4})`);
        this.emptyRed.setAttribute("opacity", String(strength * 0.75));
        this.emptyCyan.setAttribute("opacity", String(strength * 0.75));
    }

    /**
     * Splits the line into its red and cyan channels as it falls.
     *
     * The same idea as the hero text's twitch, in the medium this has: the two
     * ghosts trace the identical path a few pixels either side, so at rest they
     * are hidden exactly behind the line and cannot be seen at all.
     *
     * Driven by `1 - progress`, so the effect is strongest at the baseline and
     * gone by the time a line is fully drawn. That is the right way round: a
     * collapse is the moment the reading falls apart, and a chart that shears
     * while it is being *read* would be a chart with a fault.
     *
     * Vertical as well as horizontal, and by different amounts — an aberration
     * that only slides sideways reads as a shadow.
     */
    #Aberration(path, progress)
    {
        const strength = 1 - Math.min(1, Math.max(0, progress));

        if (strength <= 0.01)
        {
            this.ghostRed.setAttribute("opacity", "0");
            this.ghostCyan.setAttribute("opacity", "0");

            return;
        }

        const shift = strength * ABERRATION_PX;

        this.ghostRed.setAttribute("d", path);
        this.ghostCyan.setAttribute("d", path);
        this.ghostRed.setAttribute("transform", `translate(${-shift} ${shift * 0.4})`);
        this.ghostCyan.setAttribute("transform", `translate(${shift} ${-shift * 0.4})`);
        this.ghostRed.setAttribute("opacity", String(strength * 0.75));
        this.ghostCyan.setAttribute("opacity", String(strength * 0.75));
    }

    /** Schedules a complete chart redraw from retained history state. */
    #Redraw()
    {
        const history = this.#history;
        // `getBoundingClientRect` rather than `clientWidth`: this is inside a
        // bar that animates its height open, and the rounded integer lags the
        // real box during the transition, which drew one frame at the wrong
        // aspect every time the bar opened.
        // The *parent* box, which has a definite size, rather than this
        // element's — which is pinned to it and therefore only has one because
        // the parent does. Measuring the pinned child during the bar's open
        // transition read a box it had not settled into yet, and the plot was
        // built for that and ran off two edges of the real one.
        const host = this.element.parentElement ?? this.element;
        const box = host.getBoundingClientRect();
        const boxWidth = Math.round(box.width) || DEFAULT_WIDTH;
        const boxHeight = Math.round(box.height) || DEFAULT_HEIGHT;

        this.model = buildHistoryChart(history, boxWidth, boxHeight);
        this.svg.setAttribute("viewBox", `0 0 ${boxWidth} ${boxHeight}`);
        this.svg.replaceChildren();
        this.HideTooltip();

        if (!this.model.points.length)
        {
            this.#DrawEmpty(boxWidth, boxHeight);

            return;
        }

        const { margin, width, height } = this.model;
        const plotBottom = height - margin.bottom;

        for (const tick of this.model.yTicks)
        {
            this.svg.appendChild(createElement("line", {
                x1: margin.left,
                x2: width - margin.right,
                y1: tick.y,
                y2: tick.y,
                class: "market-chart-grid"
            }));

            const label = createElement("text", {
                x: margin.left - 12,
                y: tick.y + 4,
                class: "market-chart-axis",
                "text-anchor": "end"
            });

            label.textContent = formatISK(tick.value, true);
            this.svg.appendChild(label);
        }

        for (const tick of this.model.xTicks)
        {
            const label = createElement("text", {
                x: tick.x,
                y: height - 12,
                class: "market-chart-axis",
                "text-anchor": "middle"
            });

            label.textContent = shortDate(tick.date);
            this.svg.appendChild(label);
        }

        if (this.volume)
        {
            const volume = createElement("g", { class: "market-chart-volumes" });

            for (const point of this.model.points)
            {
                volume.appendChild(createElement("rect", {
                    x: point.x - point.volumeWidth / 2,
                    y: point.volumeY,
                    width: point.volumeWidth,
                    height: Math.max(0, plotBottom - point.volumeY)
                }));
            }
            this.svg.appendChild(volume);
        }
        // Kept rather than appended and forgotten: the collapse and the grow
        // rewrite these `d` attributes every frame.
        this.bandEl = createElement("path", { d: this.model.bandPath, class: "market-chart-band" });
        this.averageEl = createElement("path", { d: this.model.averagePath, class: "market-chart-average" });
        // The chromatic ghosts, under the line rather than over it: they are a
        // fringe on the edges of the stroke, and drawn on top they would be a
        // magenta line with an orange one somewhere behind it.
        this.ghostRed = createElement("path", { d: "", class: "market-chart-ghost red" });
        this.ghostCyan = createElement("path", { d: "", class: "market-chart-ghost cyan" });
        this.baseline = plotBottom;
        this.svg.append(this.bandEl, this.ghostRed, this.ghostCyan, this.averageEl);

        this.crosshair = createElement("line", {
            y1: margin.top,
            y2: plotBottom,
            class: "market-chart-crosshair"
        });
        this.crosshair.hidden = true;
        this.dot = createElement("circle", { r: 4, class: "market-chart-dot" });
        this.dot.hidden = true;
        this.svg.append(this.crosshair, this.dot);

        // A redraw builds the paths at their full height. That is right when it
        // follows new data, and wrong when a resize interrupts a collapse — the
        // line would snap back up mid-fall — so whatever progress was reached is
        // re-applied to the shapes that have just replaced it.
        if (this.#progress !== 1) this.#SetProgress(this.#progress);
    }

    /** Converts one history record into chart-local plot coordinates. */
    #Point(event)
    {
        if (!this.model?.points.length) return;

        const bounds = this.svg.getBoundingClientRect();
        // Scaled by the model's own width, not a literal 1000. The geometry was
        // always built 1000 units wide, so that constant was right until the
        // viewBox started following the box — after which a pointer halfway
        // across a 1600px plot resolved to unit 500 of 1600, landing the
        // crosshair a third of the way in and naming a date six weeks early.
        const x = (event.clientX - bounds.left) / bounds.width * this.model.width;
        let chosen = this.model.points[0];
        let distance = Math.abs(chosen.x - x);

        for (const point of this.model.points)
        {
            const next = Math.abs(point.x - x);

            if (next >= distance) continue;
            chosen = point;
            distance = next;
        }

        this.crosshair.hidden = false;
        this.crosshair.setAttribute("x1", chosen.x);
        this.crosshair.setAttribute("x2", chosen.x);
        this.dot.hidden = false;
        this.dot.setAttribute("cx", chosen.x);
        this.dot.setAttribute("cy", chosen.averageY);

        // One line per fact, label left and figure right.
        //
        // Three facts to a line meant the box was as wide as the longest run of
        // them and changed width on every day it passed over — a tooltip that
        // resizes under the pointer is one the eye has to re-find continuously,
        // and it was doing that sixty times a second. A row per fact makes the
        // shape a property of the *fields*, not of the values, so with the
        // figure column sized for the widest number the market can produce the
        // box is the same size on every day of every history.
        const date = document.createElement("strong");

        date.textContent = longDate(chosen.date);
        this.tooltip.replaceChildren(date);

        const rows = [
            [ "AVG", formatISK(chosen.average, false, 2) ],
            [ "LOW", formatISK(chosen.low, false, 2) ],
            [ "HIGH", formatISK(chosen.high, false, 2) ],
            [ "VOLUME", formatQuantity(chosen.volume) ],
            [ "ORDERS", formatQuantity(chosen.orderCount) ]
        ];

        for (const [ label, value ] of rows)
        {
            const term = document.createElement("span");
            const figure = document.createElement("span");

            term.className = "market-chart-tip-label";
            term.textContent = label;
            figure.className = "market-chart-tip-value";
            figure.textContent = value;
            this.tooltip.append(term, figure);
        }

        this.tooltip.hidden = false;

        const left = Math.min(Math.max(event.clientX - bounds.left + 14, 8), bounds.width - this.tooltip.offsetWidth - 8);
        const top = Math.max(8, event.clientY - bounds.top - this.tooltip.offsetHeight - 12);

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    /** Puts the readout away. Public, because the panel hides it on close. */
    HideTooltip()
    {
        this.tooltip.hidden = true;
        if (this.crosshair) this.crosshair.hidden = true;
        if (this.dot) this.dot.hidden = true;
    }

    model = null;

    crosshair = null;

    dot = null;

}

function createElement(name, attributes)
{
    const element = document.createElementNS(SVG, name);

    for (const [ key, value ] of Object.entries(attributes))
    {
        element.setAttribute(key, value);
    }
    return element;
}

function shortDate(value)
{
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" })
        .format(new Date(`${value}T00:00:00Z`));
}

function longDate(value)
{
    return new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC"
    }).format(new Date(`${value}T00:00:00Z`));
}

/** Accelerating: a collapse gathers speed. */
function EaseIn(t)
{
    return t * t * t;
}

/** Decelerating: an arrival settles. */
function EaseOut(t)
{
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Two decimal places, which is what the model's own path builder uses. Any more
 * is a longer string per point for a difference no display can draw.
 */
function Round(value)
{
    return Math.round(value * 100) / 100;
}

/**
 * Whether to skip the animation entirely and jump to the end.
 *
 * The effect exists so a reader can tell a redraw from a fault; somebody who
 * has asked for reduced motion is better served by the plain swap than by a
 * shortened version of a movement they asked not to see.
 */
function Reduced()
{
    return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function SettleTimes(value)
{
    const times = [];

    for (let index = 0; index < String(value ?? "").length; index++)
    {
        times.push(SCRAMBLE_SETTLE_MS + index * SCRAMBLE_STAGGER_MS);
    }

    return times;
}

function ScrambleFrame(value, elapsed, settleAt)
{
    const text = String(value ?? "");
    let result = "";

    for (let index = 0; index < text.length; index++)
    {
        const character = text[index];

        if (!character.trim() || elapsed >= settleAt[index])
        {
            result += character;
        }
        else
        {
            result += SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
        }
    }

    return result;
}
