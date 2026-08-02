const WWISE_FILTER_CUTOFF_HZ = Object.freeze([
    20000, 19567, 19133, 18700, 18267, 17833, 17400, 16967, 16533,
    16100, 15667, 15233, 14800, 14367, 13933, 13500, 13067, 12633,
    12200, 11767, 11333, 10900, 10467, 10033, 9600, 9167, 8733,
    8300, 7867, 7433, 7000, 6422, 5892, 5405, 4959, 4550, 4174,
    3829, 3513, 3223, 2957, 2713, 2489, 2283, 2095, 1922, 1763,
    1618, 1484, 1361, 1249, 1146, 1051, 964, 885, 812, 745, 683,
    627, 575, 528, 484, 444, 407, 374, 343, 315, 289, 265, 243,
    223, 204, 188, 172, 158, 145, 133, 122, 112, 103, 94, 86, 79,
    73, 67, 61, 56, 51, 47, 43, 40, 36, 33, 31, 28, 26, 24, 22,
    20, 18, 17,
]);

/** Maps an additive Wwise filter percentage to its WebAudio cutoff. */
export function wwiseFilterPercentToHz(value, highPass = false)
{
    const percent = Math.max(0, Math.min(100, Number(value) || 0));
    const tableValue = highPass ? 100 - percent : percent;
    const leftIndex = Math.floor(tableValue);
    const rightIndex = Math.ceil(tableValue);
    const left = WWISE_FILTER_CUTOFF_HZ[leftIndex];
    const right = WWISE_FILTER_CUTOFF_HZ[rightIndex];

    return left + (right - left) * (tableValue - leftIndex);
}
