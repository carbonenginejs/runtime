import { blue, installBlueServices } from "../global/blue/blue.js";
import { CjsSchema, meta } from "#schema";

let activeLibrary = null;

/**
 * Application composition root. This service-installation boundary implements
 * Blue startup; rendering/device and user-facing wrappers remain separate work.
 * Construction is inert. Providers supplied to Initialize are preconfigured,
 * borrowed references: installation does not mutate their configuration or start
 * playback, load SOF data, create a device or pump a host loop.
 */
export class CjsLibrary
{
  /** In-flight initialization; concurrent calls share the first configuration. */
  _initialization = null;

  /** Exact prior service references and activation state, retained until shutdown. */
  _previousServices = null;

  /**
   * Claims the single application root and installs Blue's named providers.
   * A default SOF is constructed lazily here, never by the global holder.
   * Repeated initialization returns this root until Shutdown; the first call
   * chooses its providers. All provider validation precedes publication.
   * @param {object} [options={}] Preconfigured resMan, paths, os, sof and audio providers.
   * @returns {Promise<CjsLibrary>} The initialized root.
   */
  async Initialize(options = {})
  {
    if (this._initialization) return this._initialization;
    if (this._previousServices) return this;
    if (!options || typeof options !== "object" || Array.isArray(options))
      throw new TypeError("Library initialization requires named providers.");
    if (activeLibrary && activeLibrary !== this)
      throw new Error("A CjsLibrary is already active.");
    activeLibrary = this;
    // Publish the in-flight operation before provider hooks can reenter startup.
    this._initialization = Promise.resolve().then(async () =>
    {
      try
      {
        const services = { ...options };
        if (!Object.hasOwn(services, "sof"))
        {
          const { EveSOF } = await import("../sof/EveSOF.js");
          services.sof = new EveSOF();
        }
        this._previousServices = installBlueServices(services);
        return this;
      }
      catch (error)
      {
        if (activeLibrary === this) activeLibrary = null;
        throw error;
      }
    });
    try { return await this._initialization; }
    finally { this._initialization = null; }
  }

  /** Restores the exact prior slots and tick activation without destroying borrowed providers. */
  async Shutdown()
  {
    if (this._initialization) await this._initialization;
    if (!this._previousServices) return this;
    installBlueServices(this._previousServices, this._previousServices.running);
    this._previousServices = null;
    activeLibrary = null;
    return this;
  }

  /** Acquires a DNA build or resource through the installed Blue services. */
  async Fetch(value, options)
  {
    return blue.Fetch(value, options);
  }
}

CjsSchema.define(CjsLibrary, {
  className: "CjsLibrary", fields: {},
  methods: { Initialize: [meta.ours], Shutdown: [meta.ours], Fetch: [meta.ours] }
});

export default CjsLibrary;
