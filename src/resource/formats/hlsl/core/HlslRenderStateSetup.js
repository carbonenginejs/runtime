/**
 * JavaScript mirror of a registered Carbon render-state setup.
 */
export class HlslRenderStateSetup
{
    /**
   * Creates a render-state table from a Map or plain object.
   *
   * @param {Map<number, number>|object} [states] Render-state key/value pairs.
   */
    constructor(states = new Map())
    {
        this.states = states instanceof Map
            ? new Map(states)
            : new Map(Object.entries(states || {}).map(([ key, value ]) => [ Number(key), Number(value) ]));
    }

    /**
   * Returns render states as stable serializable key/value records.
   *
   * @returns {{key:number,value:number}[]} Render-state entries.
   */
    get entries()
    {
        return Array.from(this.states.entries()).map(([ key, value ]) => ({ key, value }));
    }

    /**
   * Returns render states in report-friendly form.
   *
   * @returns {{key:number,value:number}[]} JSON-safe render-state entries.
   */
    toJSON()
    {
        return this.entries;
    }
}
