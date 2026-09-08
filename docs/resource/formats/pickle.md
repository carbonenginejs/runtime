# Data-only pickle protocol 0

Status: Experimental
Scope: `@carbonenginejs/runtime/resource/formats/pickle`
Audience: Resource integrators handling inert legacy data caches
Summary: Defines safe protocol-0 pickle decoding without Python object reconstruction.

## Boundary

`CjsPickleFormat` reads `.pickle` bytes through an internal protocol-0 reader.
It is a data decoder, not a general Python unpickler. It never imports a
module, resolves a global, calls a reducer, follows a persistent ID, or
constructs a Python object. Every executable, object-bearing, newer-protocol,
or unknown opcode fails at its exact byte offset.

## One global is rebuilt, and it is a closed set

`GLOBAL` names a module and attribute to import; `REDUCE` calls it. This
remote-execution path is refused: `os.system` fails at `GLOBAL`, before its
argument is read.

**`collections.OrderedDict` is the single exception**: the reader directly
builds a plain JavaScript object preserving insertion order. Nothing is imported,
resolved or invoked. `REDUCE` independently refuses every other target, so it
cannot bypass the `GLOBAL` check.

Integer-like keys are rejected because JavaScript objects sort them ahead of
other keys, breaking insertion order.

Any additional allowed name must represent pure data without behavior and be
rebuilt directly, never through a callable.

Why it matters: every one of the 25 embedded-schema static-data containers in one
client build was scanned for the `GLOBAL` opcode's module and attribute lines,
and this is the **only** name any of them uses — once per file, 25 occurrences,
no second name. They use it because a schema's attribute order is its field order, which
an ordinary dictionary would lose. Refusing it left 25 containers unreadable,
including one of 88 MB holding roughly 477,000 records.

Two limits exist because of this opcode and are worth knowing before raising
either: `REDUCE` is the only path that builds many properties for a constant
number of opcodes, so rebuilt properties are budgeted **across the whole decode**
rather than per container, and a global may only ever be consumed by a `REDUCE` —
appending one to a list or leaving it as the result is refused, because it would
reach the caller as an empty object indistinguishable from an empty dictionary.

The initial reader accepts the protocol-0 scalar, string, list, tuple,
dictionary, memo, append, and set-item operations required by inert data
graphs. Lists and tuples become JavaScript arrays. Integers outside the safe
JavaScript range become lossless decimal strings. Dictionary keys must be
strings or safe integers; collisions introduced by JSON key normalization are
rejected.

## Outputs

The default `json` output returns a plain JSON-compatible graph and rejects
cycles. `payload` and debug `raw` output preserve memo aliases and may contain
cycles:

```js
import { CjsPickleFormat } from
  "@carbonenginejs/runtime/resource/formats/pickle";

const values = CjsPickleFormat.read(bytes);
const exactGraph = CjsPickleFormat.read(bytes, { emit: "payload" });
```

`CjsPickleFormat.supportedProtocols` currently contains only protocol `0`.
The public format name follows the `.pickle` extension so future protocol
dispatch can be added without changing resource registration. Unsupported
protocols continue to fail closed until their data-only semantics are
implemented and tested.

## Resource registration

The format contains no domain target policy. A caller registers the extension
and decides whether an exact resource path returns raw decoded data or hydrates
a target:

```js
import {
  CjsLoadingObject,
  CjsResMan
} from "@carbonenginejs/runtime/resource";
import { CjsPickleFormat } from
  "@carbonenginejs/runtime/resource/formats/pickle";

const resMan = new CjsResMan({ source });

resMan.RegisterExtension("pickle", CjsLoadingObject, {
  Format: CjsPickleFormat,
  Identify(_values, context) {
    return context.resFilePath === "res:/data/profile.pickle";
  }
});
```

Resource paths, extensions, and filenames in the context are normalized to
lowercase. URL-backed sources additionally expose the exact translated URL.

## Limits

Every read is bounded by configurable positive safe-integer limits for input
bytes, operations, stack depth, memo size and IDs, container items, and string
bytes. Defaults are conservative for ordinary resource files. Callers may
lower limits per profile or read; raising them remains an explicit trust and
memory decision.

## Related documentation

- [Format subpaths](README.md)
- [Queues, publication, and registration](../reference/queues.md)
- [Browser worker execution](../reference/workers.md)
