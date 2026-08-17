const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The reader's own number formatting, not ours.
 *
 * `undefined` is not "no locale" — it tells `toLocaleString` to use the
 * runtime's, which is the browser's, which is the one the reader set. These
 * were pinned to `en-US`, so a German reader was shown `1,234.56` for a figure
 * their every other application writes `1.234,56`. That is not a cosmetic
 * difference: the two swap the meaning of both separators, so a price can be
 * misread by a factor of a thousand.
 *
 * Dates are deliberately left alone. The chart's axis is short-form English by
 * design and shares its width budget with the plot; a locale that spells its
 * months out would break the axis rather than translate it. That is a separate
 * decision from how a number is punctuated.
 */
const LOCALE = undefined;

/**
 * Converts an external identifier into the positive integer used by the
 * market window, or returns null when the value cannot address an entity.
 */
export function marketID(value)
{
    const id = Number(value);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Sorts public regional orders into the two views used by the window.
 */
export function splitOrders(orders)
{
    const sellers = [];
    const buyers = [];

    for (const order of orders ?? [])
    {
        if (order.side === "buy") buyers.push(order);
        else if (order.side === "sell") sellers.push(order);
    }

    sellers.sort((left, right) => left.price - right.price || left.orderID - right.orderID);
    buyers.sort((left, right) => right.price - left.price || left.orderID - right.orderID);

    return { sellers, buyers };
}

/**
 * Derives the compact market headline without changing the source records.
 */
export function analyzeOrders(orders)
{
    const { sellers, buyers } = splitOrders(orders);
    const bestSell = sellers[0] ?? null;
    const bestBuy = buyers[0] ?? null;
    const spread = bestSell && bestBuy && bestSell.price > 0
        ? (bestSell.price - bestBuy.price) / bestSell.price
        : null;

    let sellVolume = 0;
    let buyVolume = 0;

    for (const order of sellers) sellVolume += Number(order.volumeRemain) || 0;
    for (const order of buyers) buyVolume += Number(order.volumeRemain) || 0;

    return {
        sellers,
        buyers,
        bestSell,
        bestBuy,
        spread,
        sellVolume,
        buyVolume
    };
}

/**
 * Keeps the requested trailing number of days, measured from the newest
 * record rather than the wall clock so archived fixtures remain useful.
 */
export function filterHistory(history, days = 90)
{
    const ordered = (history ?? []).slice().sort((left, right) =>
        String(left.date).localeCompare(String(right.date)));

    if (!Number.isFinite(days) || days <= 0 || ordered.length < 2) return ordered;

    const newest = Date.parse(`${ordered.at(-1).date}T00:00:00Z`);
    const cutoff = newest - (days - 1) * DAY_MS;

    return ordered.filter(row => Date.parse(`${row.date}T00:00:00Z`) >= cutoff);
}

/**
 * Produces renderer-neutral SVG geometry for a price/volume history chart.
 */
export function buildHistoryChart(history, width = 1000, height = 360)
{
    const rows = filterHistory(history, Number.POSITIVE_INFINITY);
    const margin = { top: 24, right: 24, bottom: 38, left: 74 };
    const plotWidth = Math.max(1, width - margin.left - margin.right);
    const plotHeight = Math.max(1, height - margin.top - margin.bottom);

    if (!rows.length)
    {
        return {
            width,
            height,
            margin,
            points: [],
            averagePath: "",
            bandPath: "",
            yTicks: [],
            xTicks: [],
            priceMin: 0,
            priceMax: 0,
            maxVolume: 0
        };
    }

    let priceMin = Number.POSITIVE_INFINITY;
    let priceMax = Number.NEGATIVE_INFINITY;
    let maxVolume = 0;

    for (const row of rows)
    {
        priceMin = Math.min(priceMin, Number(row.low), Number(row.average));
        priceMax = Math.max(priceMax, Number(row.high), Number(row.average));
        maxVolume = Math.max(maxVolume, Number(row.volume) || 0);
    }

    if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax))
    {
        priceMin = 0;
        priceMax = 1;
    }
    if (priceMax === priceMin)
    {
        const pad = Math.max(Math.abs(priceMax) * 0.02, 1);

        priceMin -= pad;
        priceMax += pad;
    }
    else
    {
        const pad = (priceMax - priceMin) * 0.08;

        priceMin = Math.max(0, priceMin - pad);
        priceMax += pad;
    }

    const priceSpan = priceMax - priceMin;
    const xStep = rows.length > 1 ? plotWidth / (rows.length - 1) : 0;
    const volumeHeight = plotHeight * 0.25;
    const points = [];

    for (let index = 0; index < rows.length; index++)
    {
        const row = rows[index];
        const x = margin.left + (rows.length > 1 ? index * xStep : plotWidth / 2);
        const y = value => margin.top + (priceMax - Number(value)) / priceSpan * plotHeight;
        const volume = Number(row.volume) || 0;

        points.push({
            date: row.date,
            average: row.average,
            high: row.high,
            low: row.low,
            orderCount: row.orderCount,
            volume: row.volume,
            x,
            averageY: y(row.average),
            highY: y(row.high),
            lowY: y(row.low),
            volumeY: margin.top + plotHeight - (maxVolume ? volume / maxVolume * volumeHeight : 0),
            volumeWidth: Math.max(1, Math.min(12, xStep * 0.64 || 8))
        });
    }

    const averagePath = points.map((point, index) =>
        `${index ? "L" : "M"}${round(point.x)},${round(point.averageY)}`).join(" ");
    const highPath = points.map((point, index) =>
        `${index ? "L" : "M"}${round(point.x)},${round(point.highY)}`).join(" ");
    const lowPath = points.slice().reverse().map(point =>
        `L${round(point.x)},${round(point.lowY)}`).join(" ");
    const bandPath = `${highPath} ${lowPath} Z`;

    const yTicks = [];

    for (let index = 0; index < 5; index++)
    {
        const ratio = index / 4;

        yTicks.push({
            value: priceMax - ratio * priceSpan,
            y: margin.top + ratio * plotHeight
        });
    }

    const xTicks = [];
    const tickCount = Math.min(6, rows.length);

    for (let index = 0; index < tickCount; index++)
    {
        const pointIndex = tickCount === 1
            ? 0
            : Math.round(index * (rows.length - 1) / (tickCount - 1));
        const point = points[pointIndex];

        if (!xTicks.some(tick => tick.index === pointIndex))
        {
            xTicks.push({ index: pointIndex, x: point.x, date: point.date });
        }
    }

    return {
        width,
        height,
        margin,
        points,
        averagePath,
        bandPath,
        yTicks,
        xTicks,
        priceMin,
        priceMax,
        maxVolume
    };
}

/** Formats an ISK amount for labels and table cells. */
export function formatISK(value, compact = false, fractionDigits = null)
{
    const amount = Number(value);

    if (!Number.isFinite(amount)) return "—";
    if (compact)
    {
        const absolute = Math.abs(amount);
        const units = [
            { size: 1e12, suffix: "T" },
            { size: 1e9, suffix: "B" },
            { size: 1e6, suffix: "M" },
            { size: 1e3, suffix: "K" }
        ];

        for (const unit of units)
        {
            if (absolute >= unit.size)
            {
                const digits = absolute >= unit.size * 100 ? 0 : absolute >= unit.size * 10 ? 1 : 2;

                return `${(amount / unit.size).toFixed(digits)}${unit.suffix}`;
            }
        }
    }

    // `fractionDigits` overrides the default, which shows decimals only under
    // 100 ISK — right for an order book, where the column is long and the
    // decimals on a million-ISK line are noise. A caller showing two or three
    // figures on their own wants them, because ISK is priced to the hundredth
    // and a round-looking number that is not round is worse than a long one.
    const digits = fractionDigits === null ? (amount < 100 ? 2 : 0) : fractionDigits;

    return amount.toLocaleString(LOCALE, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    });
}

/** Formats a unit count without losing integer precision for normal ESI rows. */
export function formatQuantity(value)
{
    const amount = Number(value);

    return Number.isFinite(amount) ? Math.round(amount).toLocaleString(LOCALE) : "—";
}

/** Formats a fractional spread as a signed percentage. */
export function formatPercent(value)
{
    return Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "—";
}

/** Formats the remaining lifetime of an order relative to now. */
export function formatExpiry(value, now = Date.now())
{
    const remaining = Date.parse(value) - now;

    if (!Number.isFinite(remaining)) return "—";
    if (remaining <= 0) return "expired";

    const totalMinutes = Math.floor(remaining / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor(totalMinutes % 1440 / 60);
    const minutes = totalMinutes % 60;

    if (days) return `${days}d ${hours}h`;
    if (hours) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

/** Creates a spreadsheet-safe CSV export for the currently selected item. */
export function buildOrdersCsv(orders)
{
    const rows = [ [
        "side", "price", "volume_remain", "min_volume", "location", "system", "range", "expires_at", "order_id"
    ] ];

    for (const order of orders ?? [])
    {
        rows.push([
            order.side,
            order.price,
            order.volumeRemain,
            order.minVolume,
            order.locationName || order.locationID,
            order.systemName || order.systemID,
            order.range,
            order.expiresAt,
            order.orderID
        ]);
    }

    return rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}

function csvCell(value)
{
    let text = String(value ?? "");

    // Spreadsheet formula prefixes stay text when a provider supplies a name
    // beginning with one. ESI names are trusted display data, not formulae.
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
}

function round(value)
{
    return Number(value.toFixed(2));
}
