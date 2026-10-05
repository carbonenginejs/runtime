// CarbonEngineJS original (no Carbon counterpart).
// Owns the SFX engine's speculative selection state; moved without behavior changes.

/** Owns speculative SFX selection leases, snapshots, and settlement. */
export class CjsSfxEngineSelectionTransactionLedger
{
    _activeTransaction = null;

    _continuousSequencePositions = null;

    _leasedTokens = new WeakMap();

    _preparingToken = null;

    _randomHistory = null;

    _selectionReservations = new Map();

    _sequencePositions = null;

    _shufflePools = null;

    /** Creates a ledger over the engine's mutable selection state maps. */
    constructor({
        randomHistory,
        shufflePools,
        sequencePositions,
        continuousSequencePositions,
    })
    {
        this._randomHistory = randomHistory;
        this._shufflePools = shufflePools;
        this._sequencePositions = sequencePositions;
        this._continuousSequencePositions = continuousSequencePositions;
    }

    /** Rejects nested preparations and duplicate leases in historical order. */
    AssertCanPrepare(token)
    {
        if (this._activeTransaction)
        {
            throw new Error(
                "CjsSfxEngine cannot nest speculative continuation selection",
            );
        }
        if (this._leasedTokens.has(token))
        {
            throw new Error(
                "CjsSfxEngine continuation token is already being prepared",
            );
        }
    }

    /** Rejects use of an unsettled token outside its synchronous preparation. */
    AssertContinuationAvailable(token)
    {
        if (this._leasedTokens.has(token)
            && this._preparingToken !== token)
        {
            throw new Error(
                "CjsSfxEngine continuation token is being prepared",
            );
        }
    }

    /** Resolves and returns one frozen speculative preparation facade. */
    Prepare({ token, resolve, isCurrent })
    {
        const beforeToken = CaptureContinuationToken(token);
        const transaction = {
            snapshots: new Map(),
            operations: [],
            ownerGameObjID: String(token.gameObjID),
            reservations: [],
            invalidated: false,
            token,
        };
        let program;
        let afterToken;

        this._leasedTokens.set(token, transaction);
        this._activeTransaction = transaction;
        this._preparingToken = token;
        try
        {
            program = resolve();
            afterToken = CaptureContinuationToken(token);
        }
        catch (error)
        {
            this._leasedTokens.delete(token);
            throw error;
        }
        finally
        {
            this._preparingToken = null;
            this._activeTransaction = null;
            RestoreContinuationToken(token, beforeToken);
            RestoreSelectionChanges(transaction.snapshots);
        }
        this._ReserveSelectionOperations(transaction);

        let settled = false;

        return {
            program,
            commit: () =>
            {
                if (!settled)
                {
                    settled = true;
                    this._leasedTokens.delete(token);
                    this._ReleaseSelectionReservations(transaction);
                    if (!isCurrent() || transaction.invalidated)
                    {
                        return;
                    }
                    CommitContinuationToken(token, beforeToken, afterToken);
                    this._CommitSelectionOperations(transaction.operations);
                }
            },
            rollback: () =>
            {
                settled = true;
                this._leasedTokens.delete(token);
                this._ReleaseSelectionReservations(transaction);
            },
        };
    }

    /** Captures one selection-state key before speculative mutation. */
    TrackMutation(map, key)
    {
        if (!this._activeTransaction)
        {
            return;
        }
        let mutations = this._activeTransaction.snapshots.get(map);

        if (!mutations)
        {
            mutations = new Map();
            this._activeTransaction.snapshots.set(map, mutations);
        }
        if (!mutations.has(key))
        {
            mutations.set(key, CaptureSelectionValue(map, key));
        }
    }

    /** Records one mergeable selection effect for speculative commit. */
    RecordOperation(operation)
    {
        this._activeTransaction?.operations.push(operation);
    }

    /** Returns speculative random children reserved on one state key. */
    ReservedRandomSelections(key)
    {
        return new Set(
            (this._selectionReservations.get(`random\0${key}`) ?? [])
                .map(value => value.selected),
        );
    }

    /** Clears reservations and every selection-state map for engine Reset. */
    Reset()
    {
        this._selectionReservations.clear();
        this._randomHistory.clear();
        this._shufflePools.clear();
        this._sequencePositions.clear();
        this._continuousSequencePositions.clear();
    }

    /** Invalidates reserved work and clears one game object's selection state. */
    ReleaseGameObj(gameObjID)
    {
        const id = String(gameObjID);
        const prefix = `o:${id}\0`;
        const invalidated = new Set();

        for (const reservations of this._selectionReservations.values())
        {
            for (const { transaction } of reservations)
            {
                if (transaction.ownerGameObjID === id)
                {
                    invalidated.add(transaction);
                }
            }
        }
        for (const transaction of invalidated)
        {
            transaction.invalidated = true;
            this._leasedTokens.delete(transaction.token);
            this._ReleaseSelectionReservations(transaction);
        }
        DeleteKeysWithPrefix(this._randomHistory, prefix);
        DeleteKeysWithPrefix(this._shufflePools, prefix);
        DeleteKeysWithPrefix(this._sequencePositions, prefix);
        DeleteKeysWithPrefix(this._continuousSequencePositions, prefix);
    }

    /** Reserves speculative random choices against concurrent preparations. */
    _ReserveSelectionOperations(transaction)
    {
        for (const operation of transaction.operations)
        {
            if (operation.kind !== "random")
            {
                continue;
            }
            const key = `random\0${operation.key}`;
            const reservation = {
                transaction,
                selected: operation.selected,
                advance: operation.advance ?? 0,
            };
            const reservations = this._selectionReservations.get(key) ?? [];

            reservations.push(reservation);
            this._selectionReservations.set(key, reservations);
            transaction.reservations.push({ key, reservation });
        }
    }

    /** Removes every pending choice owned by one settled transaction. */
    _ReleaseSelectionReservations(transaction)
    {
        for (const { key, reservation } of transaction.reservations)
        {
            const reservations = this._selectionReservations.get(key)
                ?.filter(value => value !== reservation) ?? [];

            if (reservations.length)
            {
                this._selectionReservations.set(key, reservations);
            }
            else
            {
                this._selectionReservations.delete(key);
            }
        }
        transaction.reservations.length = 0;
    }

    /** Merges heard speculative choices into current shared selection state. */
    _CommitSelectionOperations(operations)
    {
        for (const operation of operations)
        {
            if (operation.kind === "random")
            {
                if (operation.historyLength > 0)
                {
                    const history = [
                        ...(this._randomHistory.get(operation.key) ?? []),
                        operation.selected,
                    ].slice(-operation.historyLength);

                    this._randomHistory.set(operation.key, history);
                }
                if (operation.shuffle)
                {
                    let pool = this._shufflePools.get(operation.key);

                    if (!pool?.length)
                    {
                        pool = operation.children.map(
                            (child, index) => ({ child, index }),
                        );
                    }
                    else
                    {
                        pool = pool.map(value => ({ ...value }));
                    }
                    const index = pool.findIndex(value =>
                        value.index === operation.selected);

                    if (index !== -1)
                    {
                        pool.splice(index, 1);
                    }
                    this._shufflePools.set(operation.key, pool);
                }
            }
            else if (operation.kind === "sequence")
            {
                const position = this._sequencePositions.get(
                    operation.key,
                ) ?? 0;

                this._sequencePositions.set(
                    operation.key,
                    position + operation.advance,
                );
            }
            else if (operation.kind === "continuous-sequence")
            {
                const position = this._continuousSequencePositions.get(
                    operation.key,
                ) ?? 0;

                this._continuousSequencePositions.set(
                    operation.key,
                    position + operation.advance,
                );
            }
        }
    }
}

function CaptureContinuationToken(token)
{
    return {
        passCount: token.passCount,
        remainingInPass: token.remainingInPass,
        sequencePosition: token.sequencePosition,
        batchIndex: token.batchIndex,
        done: token.done,
        restartPending: token.restartPending,
    };
}

function RestoreContinuationToken(token, snapshot)
{
    Object.assign(token, snapshot);
}

/** Merges one heard speculative continuation into its live token. */
function CommitContinuationToken(token, before, after)
{
    const childCount = token.node.children.length;
    const beforeSelections = ContinuationSelectionCount(
        before,
        childCount,
    );
    const afterSelections = ContinuationSelectionCount(
        after,
        childCount,
    );
    const currentSelections = ContinuationSelectionCount(
        token,
        childCount,
    );
    const maximumSelections = Number(token.node.continuous.loopCount) === 0
        ? Infinity
        : Number(token.node.continuous.loopCount) * childCount;
    const selections = Math.min(
        maximumSelections,
        currentSelections + Math.max(
            0,
            afterSelections - beforeSelections,
        ),
    );

    token.passCount = selections === 0
        ? 0
        : Math.ceil(selections / childCount);
    token.remainingInPass = token.passCount * childCount - selections;
    if (token.node.type === "sequence")
    {
        const advance = (
            after.sequencePosition - before.sequencePosition + childCount
        ) % childCount;

        token.sequencePosition = (
            token.sequencePosition + advance
        ) % childCount;
    }
    token.batchIndex += Math.max(
        0,
        after.batchIndex - before.batchIndex,
    );
    token.done ||= after.done;
    token.restartPending ||= after.restartPending;
}

/** Returns the number of selected children represented by a token snapshot. */
function ContinuationSelectionCount(snapshot, childCount)
{
    return snapshot.passCount * childCount
        - snapshot.remainingInPass;
}

function RestoreSelectionChanges(changes)
{
    for (const [ map, mutations ] of changes)
    {
        for (const [ key, snapshot ] of mutations)
        {
            if (!snapshot.exists)
            {
                map.delete(key);
            }
            else
            {
                map.set(key, CloneSelectionValue(snapshot.value));
            }
        }
    }
}

function CaptureSelectionValue(map, key)
{
    return {
        exists: map.has(key),
        value: CloneSelectionValue(map.get(key)),
    };
}

function CloneSelectionValue(value)
{
    return Array.isArray(value)
        ? value.map(item =>
            item && typeof item === "object"
                ? { ...item }
                : item)
        : value;
}

function DeleteKeysWithPrefix(map, prefix)
{
    for (const key of map.keys())
    {
        if (key.startsWith(prefix))
        {
            map.delete(key);
        }
    }
}
