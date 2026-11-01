// TEST FIXTURE, not a runtime API.
//
// A Res class whose value is whatever its extension's reader returns: a
// registered object loader, a format, or a route's formats. It reads that value
// as production Res classes read theirs (TriTextureRes, Tr2LightProfileRes):
// `ReadResourceObjectPayload` in `_DoLoad`. Tests that need a resource to load,
// queue, cancel or purge register their extension with it:
//
//   resMan.RegisterObjectLoader("bin", bytes => ...);
//   resMan.RegisterExtension("bin", TestDataRes);
//
// GetResource serves Res classes only; plain decoded data has no resource
// (resman-in-the-browser.md, 2026-11-01).
import { BlueAsyncRes, blue } from "../../npm/dist/blue/blue/index.js";

/** A test resource holding its reader's decoded value. */
export class TestDataRes extends BlueAsyncRes
{
  /** The decoded value, or null before the load and after shutdown. */
  value = null;

  /** Reads through the extension's registered reader. */
  async _DoLoad()
  {
    this.value = await blue.resMan.ReadResourceObjectPayload(this, this._dataStream.data);
    return BlueAsyncRes.LoadingResult.LR_SUCCESS;
  }

  /** Nothing to prepare. */
  _DoPrepare()
  {
    return true;
  }

  /** Drops the value. */
  _OnShutdown()
  {
    this.value = null;
  }
}

/**
 * Registers an object loader for an extension and routes the extension to
 * `TestDataRes`, so `GetResource` serves the loader's value as a resource.
 *
 * @param {object} resMan A BlueResMan.
 * @param {string} extension Input extension.
 * @param {Function} loader Object loader, `(bytes, context) => value`.
 * @returns {object} The manager.
 */
export function RegisterDataLoader(resMan, extension, loader)
{
  resMan.RegisterObjectLoader(extension, loader);
  return resMan.RegisterExtension(extension, TestDataRes);
}
