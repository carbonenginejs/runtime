import assert from "node:assert/strict";
import test from "node:test";
import { CjsBluePaths, BlueResFileSystemRemote, RemoteFileCache } from "../../npm/dist/global/blue/index.js";

const ROOT = "res:/graphics/character/";
const FILES = [
  ROOT + "metadata.yaml",
  ROOT + "femalemetadata.yaml",
  ROOT + "root.color",
  ROOT + "pose.prs",
  ROOT + "female/metadata.yaml",
  ROOT + "female/skin.color",
  ROOT + "female/face1.color",
  ROOT + "female/face12.color",
  ROOT + "female/face(1)+[a].color",
  ROOT + "female/deep/metadata.yaml",
  ROOT + "female/deep/skin.color",
  ROOT + "female/deep/pose.prs",
  ROOT + "male/hair.color",
  ROOT + "folder.color/child.txt",
  "res:/graphics/character-other/ignored.color",
  "res:/dx9/model/spaceobjectfactory/ship.black",
  "res:/dx9/model/spaceobjectfactory/nested/other.black"
];

/** A real cache-backed filesystem; directory queries never need byte storage or fetch. */
function mount(paths, files)
{
  const cache = new RemoteFileCache();
  cache.AddFileIndex(files.map((path, index) => `${path},synthetic/${index},checksum,1`).join("\n"));
  paths.RegisterFileSystem(new BlueResFileSystemRemote(cache));
}

function fixture()
{
  const paths = new CjsBluePaths();
  mount(paths, FILES);
  return paths;
}

test("Filter supports segment stars, globstars including zero directories, and question marks", () =>
{
  const paths = fixture();
  assert.deepEqual(paths.Filter(ROOT + "*.color"), [ROOT + "root.color"]);
  assert.deepEqual(paths.Filter(ROOT + "**/metadata.yaml"), [
    ROOT + "female/deep/metadata.yaml", ROOT + "female/metadata.yaml", ROOT + "metadata.yaml"
  ]);
  assert.deepEqual(paths.Filter(ROOT + "female/face?.color"), [ROOT + "female/face1.color"]);
  assert.deepEqual(paths.Filter(ROOT + "female/face(1)+[a].color"), [ROOT + "female/face(1)+[a].color"]);
  assert.deepEqual(paths.Filter(ROOT + "*/skin.color"), [ROOT + "female/skin.color"]);
  assert.deepEqual(paths.Filter(ROOT + "female/**skin.color"), [ROOT + "female/deep/skin.color", ROOT + "female/skin.color"]);
});

test("an embedded globstar crosses segments without making the following slash optional", () =>
{
  assert.deepEqual(fixture().Filter(ROOT + "female**/metadata.yaml"), [
    ROOT + "female/deep/metadata.yaml", ROOT + "female/metadata.yaml"
  ]);
});

test("Filter supports an explicit root and a relative glob, regex or predicate", () =>
{
  const paths = fixture();
  const expected = [ROOT + "female/deep/pose.prs", ROOT + "pose.prs"];
  assert.deepEqual(paths.Filter(ROOT, "**/*.prs"), expected);
  assert.deepEqual(paths.Filter(ROOT.slice(0, -1), /\.PRS$/u), expected);
  const visited = [];
  assert.deepEqual(paths.Filter(ROOT, path => { visited.push(path); return path.endsWith(".prs"); }), expected);
  assert.ok(visited.every(path => path.startsWith(ROOT) && path === path.toLowerCase()));
  assert.ok(!visited.includes(ROOT + "folder.color"), "directories do not reach the predicate");
});

test("Filter canonicalizes case and slashes, and copies stateful regexes", () =>
{
  const paths = fixture();
  assert.deepEqual(paths.Filter("RES:\\GRAPHICS\\CHARACTER\\FEMALE\\FACE?.COLOR"), [ROOT + "female/face1.color"]);
  const regex = /\.COLOR$/gu;
  regex.lastIndex = 42;
  const expected = FILES.filter(path => path.startsWith(ROOT) && path.endsWith(".color")).sort();
  assert.deepEqual(paths.Filter(ROOT.toUpperCase(), regex), expected);
  assert.deepEqual(paths.Filter(ROOT, regex), expected);
  assert.equal(regex.lastIndex, 42);
  assert.equal(regex.flags, "gu");
  assert.deepEqual(paths.Filter(ROOT, /^RES:\/GRAPHICS\/CHARACTER\/pose\.prs$/y), [ROOT + "pose.prs"]);
});

test("Filter deduplicates overlapping real file systems and sorts their union", () =>
{
  const paths = fixture();
  mount(paths, [ROOT + "root.color", ROOT + "female/skin.color", ROOT + "a.color"]);
  assert.deepEqual(paths.Filter(ROOT + "**/*.color"), [...new Set([
    ...FILES.filter(path => path.startsWith(ROOT) && path.endsWith(".color")), ROOT + "a.color"
  ])].sort());
});

test("Filter starts at the fixed prefix and avoids deeper walks for segment-only globs", () =>
{
  const paths = fixture();
  const read = paths.GetDirectoryContents.bind(paths);
  const directories = [];
  paths.GetDirectoryContents = (directory, result) => { directories.push(directory); return read(directory, result); };
  paths.Filter(ROOT, "female/face?.color");
  assert.deepEqual(directories, [ROOT + "female/"]);
  directories.length = 0;
  paths.Filter(ROOT + "female/**/*.color");
  assert.deepEqual(directories.sort(), [ROOT + "female/", ROOT + "female/deep/"]);
});

test("Filter preserves Carbon's remote .black listing alias as .red", () =>
{
  const paths = fixture();
  const root = "res:/dx9/model/spaceobjectfactory/";
  assert.deepEqual(paths.Filter(root + "*.red"), [root + "ship.red"]);
  assert.deepEqual(paths.Filter(root + "*.black"), []);
  assert.deepEqual(paths.Filter(root, /\.red$/), [root + "nested/other.red", root + "ship.red"]);
});

test("Filter returns empty results for a negative control, missing directory and no filesystems", () =>
{
  const paths = fixture();
  assert.deepEqual(paths.Filter(ROOT + "**/never-a-resource.negative-control"), []);
  assert.deepEqual(paths.Filter("res:/missing/**/*.color"), []);
  assert.deepEqual(new CjsBluePaths().Filter(ROOT + "**/*.color"), []);
  assert.deepEqual(paths.Filter(ROOT, () => false), []);
});

test("Filter refuses unrooted/invalid requests and propagates predicate errors", () =>
{
  const paths = fixture();
  for (const pattern of [/\.color$/, "**/*.color", "*.color", "", null, 1, "http:/files/*.color", "res:/../*.color"])
  {
    assert.throws(() => paths.Filter(pattern), TypeError);
  }
  assert.throws(() => paths.Filter("res:/graphics/*", () => true), /literal directory/);
  for (const matcher of ["", "/other/*.color", "res:/other/*.color", "../../../*.color", 1, {}])
  {
    assert.throws(() => paths.Filter(ROOT, matcher), TypeError);
  }
  const error = new Error("predicate failure");
  assert.throws(() => paths.Filter(ROOT, () => { throw error; }), value => value === error);
});
