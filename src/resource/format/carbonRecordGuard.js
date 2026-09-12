// One guard for the Carbon v15 description records.
//
// Ten reflection classes opened their `fromCarbonBinary` with the identical
// four lines, differing only in the noun:
//
//     if (!isPlainObject(record))
//     {
//       throw new TypeError("Carbon effect constant record must be an object");
//     }
//
// The noun is the only thing worth keeping, because it is what tells a caller
// WHICH record was malformed when a graph of them is being rebuilt. Everything
// around it was copied.

import { isPlainObject } from "#utils/is";

/**
 * Require a Carbon description record to be a plain object.
 *
 * @param {*} record Candidate record from the effect reader.
 * @param {string} noun Record kind, used in the failure message.
 * @throws {TypeError} The record is not a plain object.
 */
export function assertCarbonRecord(record, noun)
{
    if (!isPlainObject(record))
    {
        throw new TypeError(`Carbon effect ${noun} record must be an object`);
    }
}
