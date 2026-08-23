export const num = {};

num.EPSILON = 0.000001;
num.RAD2DEG = 180 / Math.PI;
num.DEG2RAD = Math.PI / 180;
num.TWO_PI = Math.PI * 2;
num.PI = Math.PI;
num.INV_TWO_PI = 1 / num.TWO_PI;

/**
 * biCumulative
 *
 * @param {number} t
 * @param {number} order
 * @returns {number}
 */
num.biCumulative = function (t, order)
{
    if (order === 1)
    {
        const some = (1.0 - t);
        return 1.0 - some * some * some;
    }
    else if (order === 2)
    {
        return 3.0 * t * t - 2.0 * t * t * t;
    }
    else
    {
        return t * t * t;
    }
};

/**
 * @alias Math.ceil
 */
num.ceil = Math.ceil;

/**
 * Clamps a number
 *
 * @param {number} a
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
num.clamp = function (a, min, max)
{
    return Math.max(min, Math.min(max, a));
};

/**
 * Returns how many decimal places a number has
 *
 * @param {number} a
 * @returns {number}
 */
num.decimalPlaces = function (a)
{
    let match = ("" + a).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
    return match ? Math.max(0, (match[1] ? match[1].length : 0) - (match[2] ? +match[2] : 0)) : 0;
};

/**
 * Converts from radians to degrees
 *
 * @param {number} a
 * @returns {number}
 */
num.degrees = function (a)
{
    return a * num.RAD2DEG;
};

/**
 * Converts from radians to unwrapped degrees
 *
 * @param {number} a
 * @returns {number}
 */
num.degreesUnwrapped = function (a)
{
    return num.unwrapDegrees(a * num.RAD2DEG);
};

/**
 * Converts a Dword to Float
 * @param value
 * @return {Number}
 */
num.dwordToFloat = (function ()
{
    const
        words = new Uint32Array(1),
        floats = new Float32Array(words.buffer);

    return function (value)
    {
        words[0] = value >>> 0;
        return floats[0];
    };
}());

/**
 * Checks if a number equals another
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
num.equals = function (a, b)
{
    return Math.abs(a - b) <= num.EPSILON * Math.max(1.0, Math.abs(a), Math.abs(b));
};

/**
 * Checks if a number exactly equals another
 * - included for library consistency
 *
 * @param {number} a
 * @param {number} b
 * @returns {boolean}
 */
num.exactEquals = function (a, b)
{
    return a === b;
};

/**
 * Exponential decay
 *
 * @param {number} omega0
 * @param {number} torque
 * @param {number} I - inertia
 * @param {number} d - drag
 * @param {number} time - time
 * @returns {number}
 */
num.exponentialDecay = function (omega0, torque, I, d, time)
{
    return torque * time / d + I * (omega0 * d - torque) / (d * d) * (1.0 - Math.pow(Math.E, -d * time / I));
};

/**
 * Gets the fractional components of a number
 *
 * @param {number} a
 * @returns {number}
 */
num.fract = function (a)
{
    return a - Math.floor(a);
};

/**
 * Gets a value from a half float
 * @author Babylon
 * @param {number} a
 * @returns {number}
 */
num.fromHalfFloat = function (a)
{
    const
        s = (a & 0x8000) >> 15,
        e = (a & 0x7C00) >> 10,
        f = a & 0x03FF;

    if (e === 0)
    {
        return (s ? -1 : 1) * Math.pow(2, -14) * (f / Math.pow(2, 10));
    }
    else if (e === 0x1F)
    {
        return f ? NaN : ((s ? -1 : 1) * Infinity);
    }

    return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + (f / Math.pow(2, 10)));
};

/**
 * @alias Math.floor
 */
num.floor = Math.floor;

/**
 * Gets long word order
 * @author Babylon
 * @param {number} a
 * @returns {number}
 */
num.getLongWordOrder = function (a)
{
    let value = a >>> 0,
        order = 0;

    while (order < 3 && value !== 0 && (value & 0xff) === 0)
    {
        value >>>= 8;
        order++;
    }

    return order;
};

/**
 *
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
num.greaterThan = function (a, b)
{
    return a > b ? 1 : 0;
};

/**
 *
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
num.greaterThanEqual = function (a, b)
{
    return a === b || num.equals(a, b) || a > b ? 1 : 0;
};

/**
 *
 * - included for library consistency
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
num.greaterThanExactEqual = function (a, b)
{
    return a >= b ? 1 : 0;
};


/**
 * Checks if a number is even
 *
 * @param {number} a
 * @returns {boolean}
 */
num.isEven = function (a)
{
    return Math.abs(a) % 2 === 0;
};

/**
 * Checks if a number is a float
 *
 * @param {number} a
 * @returns {boolean}
 */
num.isFloat = function (a)
{
    return a % 1 !== 0;
};

/**
 * @alias Number.isFinite
 */
num.isFinite = Number.isFinite;
// return (typeof v === "number" && !isNaN(v) && v !== Infinity && v !== -Infinity);

/**
 * Checks if a number is an integer
 *
 * @param {number} a
 * @returns {boolean}
 */
num.isInt = function (a)
{
    return a % 1 === 0;
};

/**
 * @alias Number.isNaN
 */
num.isNaN = Number.isNaN;

/**
 * Checks if a number is odd
 *
 * @param {number} a
 * @returns {boolean}
 */
num.isOdd = function (a)
{
    return Math.abs(a) % 2 === 1;
};

/**
 * Checks if a number is to the power of two
 *
 * @param {number} a
 * @returns {boolean}
 */
num.isPowerOfTwo = function (a)
{
    return Number.isSafeInteger(a) && a > 0 && Number.isInteger(Math.log2(a));
};

/**
 *
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
num.lessThan = function (a, b)
{
    return a < b ? 1 : 0;
};

/**
 *
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
num.lessThanEqual = function (a, b)
{
    return a === b || num.equals(a, b) || a < b ? 1 : 0;
};

/**
 *
 * - included for library consistency
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
num.lessThanExactEqual = function (a, b)
{
    return a <= b ? 1 : 0;
};

/**
 * Gets the log2 of a number
 * @param {number} a
 * @returns {number}
 */
num.log2 = function (a)
{
    return Math.log(a) * Math.LOG2E;
};

/**
 * @alias Math.max
 */
num.max = Math.max;

/**
 * @alias Math.min
 */
num.min = Math.min;


/**
 * Gets the nearest power of two value to a number
 *
 * @param {number} a
 * @returns {number}
 */
num.nearestPowerOfTwo = function (a)
{
    return Math.pow(2, Math.round(Math.log(a) / Math.LN2));
};

/**
 *
 *
 * @param {number} value
 * @param {number} start
 * @param {number} end
 * @param {number} precision
 * @returns {number}
 */
num.normalizeInt = function (value, start, end, precision)
{
    let width = end - start;
    let offsetValue = value - start;
    let result = (offsetValue - (Math.floor(offsetValue / width) * width)) + start;
    return precision === undefined ? result : Number(result.toFixed(precision));
};

/**
 *
 *
 * @param {number} value
 * @param {number} start
 * @param {number} end
 * @param {number} precision
 * @returns {number}
 */
num.normalizeFloat = function (value, start, end, precision)
{
    let width = end - start;
    let offsetValue = value - start;
    let result = (offsetValue - (Math.floor(offsetValue / width) * width)) + start;
    return precision === undefined ? result : Number(result.toFixed(precision));
};


/**
 * Converts from degrees to radians
 *
 * @param {number} a
 * @returns {number}
 */
num.radians = function (a)
{
    return a * num.DEG2RAD;
};

/**
 * Converts from degrees to unwrapped radians
 *
 * @param {number} a
 * @returns {number}
 */
num.radiansUnwrapped = function (a)
{
    return num.unwrapRadians(a *= num.DEG2RAD);
};

/**
 * Creates a random integer
 *
 * @param {number} low
 * @param {number} high
 * @returns {number}
 */
num.randomInt = function (low, high)
{
    return low + Math.floor(Math.random() * (high - low + 1));
};

/**
 * Creates a random float
 *
 * @param {number} low
 * @param {number} high
 * @returns {number}
 */
num.randomFloat = function (low, high)
{
    return low + Math.random() * (high - low);
};

/**
 * @alias for Math.round
 */
num.round = Math.round;

/**
 * Rounds a number to the closest zero
 *
 * @param {number} a
 * @returns {number}
 */
num.roundToZero = function (a)
{
    return a < 0 ? Math.ceil(a) : Math.floor(a);
};

/**
 * @alias for num.greaterThan
 */
num.step = num.greaterThan;

/**
 * Force positive number (excluding 0)
 * @param {Number} s
 * @returns {Number}
 */
num.strictPositive = function (s)
{
    return Math.max(num.EPSILON, Math.abs(s));
};

/**
 * Force negative number (excluding 0)
 * @param {Number} s
 * @returns {Number}
 */
num.strictNegative = function (s)
{
    return -Math.max(num.EPSILON, Math.abs(s));
};

/**
 * Evaluates cubic Hermite interpolation using Carbon argument order.
 *
 * @param {number} startValue
 * @param {number} startTangent
 * @param {number} endValue
 * @param {number} endTangent
 * @param {number} amount
 * @returns {number}
 */
// USE THIS: Carbon order is start value, start tangent, end value, end tangent.
num.cubicHermite = function (startValue, startTangent, endValue, endTangent, amount)
{
    const
        amountSquared = amount * amount,
        amountCubed = amountSquared * amount,
        startFactor = 2 * amountCubed - 3 * amountSquared + 1,
        startTangentFactor = amountCubed - 2 * amountSquared + amount,
        endFactor = -2 * amountCubed + 3 * amountSquared,
        endTangentFactor = amountCubed - amountSquared;

    return startValue * startFactor
        + startTangent * startTangentFactor
        + endValue * endFactor
        + endTangent * endTangentFactor;
};

/**
 * Evaluates the derivative of cubic Hermite interpolation using Carbon
 * argument order.
 *
 * @param {number} startValue
 * @param {number} startTangent
 * @param {number} endValue
 * @param {number} endTangent
 * @param {number} amount
 * @returns {number}
 */
// USE THIS: Carbon order is start value, start tangent, end value, end tangent.
num.cubicHermiteDerivative = function (startValue, startTangent, endValue, endTangent, amount)
{
    const
        amountSquared = amount * amount,
        startFactor = 6 * amountSquared - 6 * amount,
        startTangentFactor = 3 * amountSquared - 4 * amount + 1,
        endFactor = -startFactor,
        endTangentFactor = 3 * amountSquared - 2 * amount;

    return startValue * startFactor
        + startTangent * startTangentFactor
        + endValue * endFactor
        + endTangent * endTangentFactor;
};

/**
 *
 * @param a
 * @param min
 * @param max
 * @returns {number}
 */
num.smoothStep = function (a, min, max)
{
    if (a <= min) return 0;
    if (a >= max) return 1;
    a = (a - min) / (max - min);
    return a * a * (3 - 2 * a);
};

/**
 *
 * @param a
 * @param min
 * @param max
 * @returns {number}
 */
num.smootherStep = function (a, min, max)
{
    if (a <= min) return 0;
    if (a >= max) return 1;
    a = (a - min) / (max - min);
    return a * a * a * (a * (a * 6 - 15) + 10);
};

/**
 * Converts a number to a half float
 * @author http://stackoverflow.com/questions/32633585/how-do-you-convert-to-half-floats-in-javascript
 * @param {number} a
 * @returns {number}
 */
num.toHalfFloat = (function ()
{
    const
        floats = new Float32Array(1),
        words = new Uint32Array(floats.buffer);

    return function (a)
    {
        floats[0] = a;

        const
            word = words[0],
            sign = (word >>> 16) & 0x8000,
            exponent = (word >>> 23) & 0xff;

        let mantissa = word & 0x7fffff;

        if (exponent === 0xff)
        {
            return sign | 0x7c00 | (mantissa ? 0x0200 : 0);
        }

        let halfExponent = exponent - 127 + 15;
        if (halfExponent >= 0x1f)
        {
            return sign | 0x7c00;
        }

        if (halfExponent <= 0)
        {
            if (halfExponent < -10) return sign;

            mantissa |= 0x800000;
            const
                shift = 14 - halfExponent,
                halfway = 1 << (shift - 1),
                remainder = mantissa & ((1 << shift) - 1);

            let halfMantissa = mantissa >>> shift;
            if (remainder > halfway || (remainder === halfway && (halfMantissa & 1)))
            {
                halfMantissa++;
            }
            return sign | halfMantissa;
        }

        let halfMantissa = mantissa >>> 13;
        const remainder = mantissa & 0x1fff;
        if (remainder > 0x1000 || (remainder === 0x1000 && (halfMantissa & 1)))
        {
            halfMantissa++;
            if (halfMantissa === 0x400)
            {
                halfMantissa = 0;
                halfExponent++;
                if (halfExponent >= 0x1f) return sign | 0x7c00;
            }
        }

        return sign | (halfExponent << 10) | halfMantissa;
    };
}());

/**
 * Converts linear color to rgba/rgb color
 * @param {Number} a
 * @returns {Number}
 */
num.colorFromLinear = function (a)
{
    return Math.max(0, Math.min(Math.floor(a * 255), 255));
};

/**
 * Converts linear color to rgba/rgb color
 * @param {Number} a
 * @returns {Number}
 */
num.linearFromColor = function (a)
{
    return a / 255;
};

/**
 * Converts linear color to hex string
 * @param {Number} a
 * @returns {String}
 */
num.hexFromLinear = function (a)
{
    return num.hexFromColor(num.colorFromLinear(a));
};

/**
 * Converts rgb/rgba color to hex string
 * @param {Number} a
 * @returns {String}
 */
num.hexFromColor = function (a)
{
    return (a | 1 << 8).toString(16).slice(1);
};

/**
 * Unwraps degrees
 *
 * @param {number} d
 * @returns {number}
 */
num.unwrapDegrees = function (d)
{
    d = d % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
};

/**
 * Unwraps radians
 *
 * @param {number} r
 * @returns {number}
 */
num.unwrapRadians = function (r)
{
    r = r % num.TWO_PI;
    if (r > num.PI) r -= num.TWO_PI;
    if (r < -num.PI) r += num.TWO_PI;
    return r;
};

/**
 * Converts srgb to linear colour
 * @param {Number} a
 * @returns {Number}
 */
num.linearFromSRGB = function (a)
{
    return (a < 0.04045) ? a * 0.0773993808 : Math.pow(a * 0.9478672986 + 0.0521327014, 2.4);
};

/**
 * Converts from linear color space to Carbon gamma 2.2 color space
 * @param {Number} a
 * @returns {Number}
 */
num.linearToGamma = function (a)
{
    return Math.pow(a, 0.454545);
};

/**
 * Converts from Carbon gamma 2.2 color space to linear color space
 * @param {Number} a
 * @returns {Number}
 */
num.gammaToLinear = function (a)
{
    return Math.pow(a, 2.2);
};

/**
 * Converts linear colour to srgb
 * @param {Number} a
 * @returns {Number}
 */
num.srgbFromLinear = function (a)
{
    return (a < 0.0031308)
        ? a * 12.92
        : 1.055 * Math.pow(a, 1.0 / 2.4) - 0.055;
};

export const {
    EPSILON,
    RAD2DEG,
    DEG2RAD,
    TWO_PI,
    PI,
    INV_TWO_PI,
    biCumulative,
    ceil,
    clamp,
    decimalPlaces,
    degrees,
    degreesUnwrapped,
    dwordToFloat,
    equals,
    exactEquals,
    exponentialDecay,
    fract,
    fromHalfFloat,
    floor,
    getLongWordOrder,
    greaterThan,
    greaterThanEqual,
    greaterThanExactEqual,
    isEven,
    isFloat,
    isFinite,
    isInt,
    isNaN,
    isOdd,
    isPowerOfTwo,
    lessThan,
    lessThanEqual,
    lessThanExactEqual,
    log2,
    max,
    min,
    nearestPowerOfTwo,
    normalizeInt,
    normalizeFloat,
    radians,
    radiansUnwrapped,
    randomInt,
    randomFloat,
    round,
    roundToZero,
    step,
    strictPositive,
    strictNegative,
    cubicHermite,
    cubicHermiteDerivative,
    smoothStep,
    smootherStep,
    toHalfFloat,
    colorFromLinear,
    linearFromColor,
    hexFromLinear,
    hexFromColor,
    unwrapDegrees,
    unwrapRadians,
    linearFromSRGB,
    linearToGamma,
    gammaToLinear,
    srgbFromLinear
} = num;
