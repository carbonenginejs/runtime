import { readRaw } from "../../../../../../src/resource/formats/webgpu/core/helpers.js";

/**
 * Read container bytes into the live `CarbonWebgpuContainer`.
 *
 * The format surface has one emit and it returns the plain JSON document; the
 * container itself is internal. That is deliberate - a second `raw` emit was how
 * `engine-webgpu` came to duck-type the container instead of reading the
 * document, and then kept asking for a shape the producer had stopped emitting.
 *
 * Tests still need the container, because several of them are *about* the
 * container: its offset table, its derived views, its behaviour on corrupted
 * bytes. Reaching it by importing the internal reader keeps that coverage while
 * leaving the published surface with exactly one way in. Nothing outside this
 * repository can do the same.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} bytes Container bytes.
 * @param {object} [options] Reader values; `source` names the file in errors.
 * @returns {object} The loaded container.
 */
export function readContainer(bytes, options = {})
{
    return readRaw(bytes, { source: "memory", ...options });
}
