import { CjsStorageBackend } from "./CjsStorageBackend.js";
import { matchesStorage, storageKey } from "./storageRecord.js";

/**
 * Our persistent backend over IndexedDB, for windows and workers. The factory is
 * injected, so a test or host can supply its own. The database opens lazily on
 * the first operation, in our own versioned store, without touching unrelated
 * databases.
 */
export class CjsIndexedDBStorage extends CjsStorageBackend
{
    static className = "CjsIndexedDBStorage";

    /** @type {boolean} A committed IndexedDB transaction survives the session. */
    persistent = true;

    /** @type {IDBFactory|null} */
    factory = null;

    /** @type {typeof IDBKeyRange|null} */
    ranges = null;

    /** @type {string} Database name. */
    name = "";

    /** @type {IDBDatabase|null} The open connection, if any. */
    database = null;

    /** @type {Promise<IDBDatabase>|null} The open in progress, if any. */
    opening = null;

    /**
     * Bind the factory without opening anything.
     *
     * @param {object} [options] Database selection.
     * @param {string} [options.name] Database name.
     * @param {IDBFactory} [options.indexedDB] The IndexedDB factory; defaults to the host's.
     * @param {typeof IDBKeyRange} [options.keyRange] The key-range constructor; defaults to the host's.
     * @throws {Error} When the host has no IndexedDB.
     */
    constructor({ name = "carbonenginejs-storage", indexedDB = globalThis.indexedDB, keyRange = globalThis.IDBKeyRange } = {})
    {
        super();
        if (!indexedDB || !keyRange) throw new Error("IndexedDB storage is unavailable in this host");

        this.factory = indexedDB;
        this.ranges = keyRange;
        this.name = name;
    }

    /**
     * Open our versioned store once and share the open between concurrent callers.
     *
     * @returns {Promise<IDBDatabase>} The open connection.
     */
    async _Open()
    {
        if (this.database) return this.database;

        if (!this.opening)
        {
            this.opening = new Promise((resolve, reject) =>
            {
                const request = this.factory.open(this.name, 1);
                let failed = false;

                request.onupgradeneeded = () => request.result.createObjectStore("records", { keyPath: "storageID" });
                request.onerror = () =>
                {
                    failed = true;
                    reject(request.error);
                };
                request.onblocked = () =>
                {
                    failed = true;
                    reject(new Error("IndexedDB open blocked by another connection"));
                };
                request.onsuccess = () =>
                {
                    // A blocked open can still succeed later; close that late connection.
                    if (failed)
                    {
                        request.result.close();
                        return;
                    }

                    this.database = request.result;
                    this.database.onversionchange = () =>
                    {
                        this.database.close();
                        this.database = null;
                    };
                    resolve(this.database);
                };
            }).finally(() => { this.opening = null; });
        }

        return this.opening;
    }

    /**
     * Run one transaction. It resolves when the transaction commits, not when a
     * request succeeds, so a resolved write is durable.
     *
     * @param {IDBTransactionMode} mode `"readonly"` or `"readwrite"`.
     * @param {(store: IDBObjectStore, result: (value: *) => void) => void} submit Issues the requests and reports a result.
     * @returns {Promise<*>} The reported result, once the transaction completes.
     */
    async _Run(mode, submit)
    {
        const database = await this._Open();

        return new Promise((resolve, reject) =>
        {
            const transaction = database.transaction("records", mode);
            let result = null;
            let failure = null;

            transaction.oncomplete = () => resolve(result);
            transaction.onabort = () => reject(failure || transaction.error || new Error("IndexedDB transaction aborted"));
            transaction.onerror = () => { failure = transaction.error; };

            try
            {
                submit(transaction.objectStore("records"), value => { result = value; });
            }
            catch (error)
            {
                failure = error;
                transaction.abort();
            }
        });
    }

    /**
     * Read one owned structured-clone copy.
     *
     * @param {import("./CjsStorageBackend.js").CjsStorageAddress} address The record's address.
     * @returns {Promise<import("./CjsStorageBackend.js").CjsStorageRecord|null>} A copy, or null when absent.
     */
    Read(address)
    {
        const key = storageKey(address);

        return this._Run("readonly", (store, result) =>
        {
            const request = store.get(key);
            request.onsuccess = () => result(request.result?.record ?? null);
        });
    }

    /**
     * Commit a batch in one transaction. Values arrive already encoded, so no
     * asynchronous work happens inside the transaction.
     *
     * @param {import("./CjsStorageBackend.js").CjsStorageRecord[]} records Fully encoded records.
     * @returns {Promise<void>} Resolves once the transaction commits.
     */
    WriteBatch(records)
    {
        const entries = records.map(record => ({ storageID: storageKey(record.address), record }));

        return this._Run("readwrite", store =>
        {
            for (const entry of entries) store.put(entry);
        });
    }

    /**
     * Delete exactly one identity.
     *
     * @param {import("./CjsStorageBackend.js").CjsStorageAddress} address The record's address.
     * @returns {Promise<void>} Resolves once the transaction commits.
     */
    Delete(address)
    {
        const key = storageKey(address);
        return this._Run("readwrite", store => { store.delete(key); });
    }

    /**
     * Read bounded cursor pages of 128 records. Every page closes its transaction
     * before yielding, so a slow consumer never meets an auto-committed cursor.
     * Concurrent writers can change later pages; this is not a snapshot scan.
     *
     * @param {import("./CjsStorageBackend.js").CjsStorageQuery} query The namespace and optional collection.
     * @returns {AsyncIterable<import("./CjsStorageBackend.js").CjsStorageRecord>} Matching records.
     */
    async *List(query)
    {
        let after = null;

        while (true)
        {
            const page = await this._Run("readonly", (store, result) =>
            {
                const records = [];
                let visited = 0;
                const range = after === null ? null : this.ranges.lowerBound(after, true);
                const request = store.openCursor(range);

                request.onsuccess = () =>
                {
                    const cursor = request.result;
                    if (!cursor)
                    {
                        result({ records, after: null });
                        return;
                    }

                    if (matchesStorage(cursor.value.record, query)) records.push(cursor.value.record);
                    visited++;

                    if (visited === 128)
                    {
                        result({ records, after: cursor.primaryKey });
                        return;
                    }
                    cursor.continue();
                };
            });

            for (const record of page.records) yield record;

            if (page.after === null) return;
            after = page.after;
        }
    }

    /**
     * Release the connection; stored data survives.
     *
     * @returns {Promise<void>} Resolves once the connection is closed.
     */
    async Close()
    {
        if (this.opening) await this.opening;
        if (this.database) this.database.close();
        this.database = null;
    }
}
