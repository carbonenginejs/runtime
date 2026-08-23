# SOF generated compatibility namespace

This directory is a retired compatibility namespace, not the runtime surface.

The queue is complete: there are zero pending schema shells. Every reviewed
class now has a single implementation under its matching `src/sof/<domain>`
directory and is exported through the domain barrels.

Carbon/Blue source is authoritative for fields, defaults, enum ownership, and
runtime behavior. Secondary JavaScript implementations may inform optional CPU
conveniences only after those conveniences are checked against Carbon.

`index.js` intentionally exports nothing and remains as a compatibility
subpath for consumers that previously inspected the work queue.
