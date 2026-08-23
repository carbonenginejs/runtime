# History-preserving runtime migration

The combined runtime is built from the clean donor revisions recorded in
[`sources.json`](sources.json). Each donor is imported with its complete Git
history under the manifest's temporary prefix. Reviewed files are then moved
to their final layer paths with ordinary commits.

The migration uses these constraints:

- never copy a donor tree into the destination without its Git history;
- never squash a donor subtree import;
- import in the manifest order so dependency-floor identities settle first;
- keep one operator responsible for moves and import rewrites in the shared
  worktree;
- run the layer check after every source move;
- keep the package private and consumers unchanged until the atomic cutover;
- retain browser-safe tools only, with Node.js and native builders remaining in
  `@carbonenginejs/tools-core`.

Temporary import prefixes are migration evidence, not package contents. The
package allow-list excludes them from npm artifacts.
