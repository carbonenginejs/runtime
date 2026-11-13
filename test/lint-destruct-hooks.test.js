import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkSource } from "../scripts/lint-destruct-hooks.js";

const DOC = "/**\n * Carbon: ~Owner (trinity/Owner.cpp:2-4).\n */\n";

/** A class with one _Destructor, documented unless told otherwise. */
const destructor = (body, doc = DOC) => `class Owner extends Base { ${doc}_Destructor() { ${body} } }`;

test("an OnDestruct rejects super and prototype teardown calls other than super.OnDestruct", () =>
{
  for (const body of [ "super.Update();", "super['Destruct']();", "Base.prototype.OnDestruct.call(this);", "Base.prototype['Destruct'].apply(this, []);" ])
    assert.notEqual(checkSource(`class Owner extends Base { OnDestruct() { ${body} return true; } }`).length, 0, body);
  assert.notEqual(checkSource("class Owner extends Base { OnDestruct = () => super.Destruct(); }").length, 0);
  assert.deepEqual(checkSource("class Owner extends Base { OnDestruct(options) { this.held = null; return super.OnDestruct(options); } }"), [],
    "an OnDestruct reaches its parent's through super");
});

test("the lint permits ordinary super methods and owned-member cleanup", () =>
{
  assert.deepEqual(checkSource("class Owner extends Base { Update() { super.Update(); } OnDestruct() { this.buffer.Destroy(); this.child.Destruct(); return true; } }"), []);
  assert.deepEqual(checkSource("class Owner { OnDestruct() { class Nested extends Base { Update() { super.Update(); } } return true; } }"), []);
});

test("an OnDestruct ends by accepting, or its whole body refuses", () =>
{
  const hook = body => `class Owner extends Base { OnDestruct(options) { ${body} } }`;
  for (const body of [
    "return true;", "return super.OnDestruct(options);", "// Destroyed only by resMan.\nreturn false;",
    "if (this._done) return true; this._done = true; return super.OnDestruct(options);",
    "this.list.forEach(item => { return item; }); return true;"
  ]) assert.deepEqual(checkSource(hook(body)), [], body);

  for (const [ body, count ] of [
    [ "this.held = null;", 1 ],
    [ "this.held = null; return;", 2 ],
    [ "this.held = null; return this;", 2 ],
    [ "this.held = null; return false;", 2 ],
    [ "if (this.shared) return false; return true;", 1 ],
    [ "if (this._done) return; this._done = true; return true;", 1 ]
  ])
  {
    const errors = checkSource(hook(body));
    assert.equal(errors.length, count, `${body}\n${errors.join("\n")}`);
  }
});

test("a _Destructor never calls another level, and the finding names it", () =>
{
  for (const body of [ "super._Destructor();", "super.OnDestruct();", "Base.prototype._Destructor.call(this);", "Base.prototype.Destruct.call(this);" ])
  {
    const errors = checkSource(destructor(body));
    assert.equal(errors.length, 1, `${body}\n${errors.join("\n")}`);
    assert.match(errors[0], /_Destructor must not/);
  }
  assert.deepEqual(checkSource(destructor("this.buffer.Destroy(); CjsGraph.finalDelete(this.input);")), []);
});

test("a _Destructor takes no arguments and returns nothing", () =>
{
  assert.match(checkSource(`class Owner { ${DOC}_Destructor(managed) { this.buffer.Destroy(); } }`)[0], /takes no arguments/);
  assert.match(checkSource(destructor("if (this._done) return; this._done = true; return this;"))[0], /returns nothing/);
  assert.deepEqual(checkSource(destructor("if (this._done) return; this.list.map(item => { return item; });")), [], "a bare return leaves early");
});

test("a _Destructor's JSDoc names Carbon's destructor, written or implicit", () =>
{
  for (const doc of [
    DOC,
    "/**\n * Releases the buffer.\n * Carbon: ~Owner, implicit: m_buffer (trinity/Owner.h:9).\n * @adapted Explicit release.\n */\n",
    "/**\n * Carbon: ~Owner (Trinity 24d033fa~1, Interior/Owner.cpp:47-56): detaches the cell.\n */\n"
  ]) assert.deepEqual(checkSource(destructor("", doc)), [], doc);

  for (const doc of [
    "",
    "/** Releases the buffer. */\n",
    "/**\n * Carbon: Owner destructor (trinity/Owner.cpp:2-4).\n */\n",
    "/**\n * Carbon: trinity/Owner.cpp:2-4.\n */\n",
    "/**\n * Carbon: ~Owner.\n */\n",
    "// Carbon: ~Owner (trinity/Owner.cpp:2-4).\n"
  ])
  {
    const errors = checkSource(destructor("", doc));
    assert.equal(errors.length, 1, doc);
    assert.match(errors[0], /needs a JSDoc line "Carbon: ~Class \(file:lines\)"/);
  }
});

test("with a Carbon tree, a cite must hold the destructor or the member it names", t =>
{
  const carbonRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lint-destruct-hooks-"));
  t.after(() => fs.rmSync(carbonRoot, { recursive: true, force: true }));
  fs.mkdirSync(path.join(carbonRoot, "trinity"));
  fs.writeFileSync(path.join(carbonRoot, "trinity", "Owner.cpp"), "Owner::Owner()\n{\n}\nOwner::~Owner()\n{\n}\n");
  fs.writeFileSync(path.join(carbonRoot, "trinity", "Owner.h"), "class Owner\n{\n\tTr2BufferAL m_buffer;\n};\n");
  const cite = line => checkSource(destructor("", `/**\n * ${line}\n */\n`), "source.js", { carbonRoot });

  assert.deepEqual(cite("Carbon: ~Owner (trinity/Owner.cpp:4-6)."), []);
  assert.deepEqual(cite("Carbon: ~Owner, implicit: m_buffer (trinity/Owner.h:3)."), []);
  assert.deepEqual(cite("Carbon: ~Owner (Trinity 24d033fa~1, Interior/Owner.cpp:47-56)."), [], "history is not opened");
  assert.match(cite("Carbon: ~Owner (trinity/Owner.cpp:1-3).")[0], /no ~Owner at trinity\/Owner\.cpp:1-3/, "the constructor is not the destructor");
  assert.match(cite("Carbon: ~Owner, implicit: m_texture (trinity/Owner.h:3).")[0], /no m_texture at/);
  assert.match(cite("Carbon: ~Owner (trinity/Missing.cpp:4-6).")[0], /no such Carbon file/);
  assert.deepEqual(checkSource(destructor("", "/**\n * Carbon: ~Owner (trinity/Owner.cpp:1-3).\n */\n")), [], "without a Carbon tree only the form is checked");
});

test("only the graph calls a hook", () =>
{
  for (const [ code, hint ] of [
    [ "class Owner { Release() { this.input._Destructor(); } }", /use CjsGraph\.finalDelete/ ],
    [ "class Owner { Release() { this.input.OnDestruct(); } }", /use object\.Destruct/ ],
    [ "function release(object) { Base.prototype._Destructor.call(object); }", /use CjsGraph\.finalDelete/ ],
    [ "const hook = Owner.prototype.OnDestruct;", /use object\.Destruct/ ]
  ])
  {
    const errors = checkSource(code);
    assert.equal(errors.length, 1, code);
    assert.match(errors[0], hint);
  }
  assert.deepEqual(checkSource("class CjsGraph { static destruct(target) { target.OnDestruct(); } }", "src/global/model/graph/CjsGraph.js"), []);
  assert.deepEqual(checkSource("const own = Object.getOwnPropertyDescriptor(Constructor.prototype, \"_Destructor\");"), [], "reading the name is not a call");
});
