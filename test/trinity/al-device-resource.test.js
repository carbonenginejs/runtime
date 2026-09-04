import assert from "node:assert/strict";
import test from "node:test";

import {
  DescribeDeviceResources,
  DestroyDeviceResources,
  Tr2ALMemoryType,
  Tr2BaseDeviceResourceAL
} from "../../src/trinity/core/al/Tr2DeviceResourceAL.js";

/** A minimal resource: valid until destroyed, in the class it was given. */
class TestResource extends Tr2BaseDeviceResourceAL
{
  #valid = true;

  constructor(name, memoryClass = Tr2ALMemoryType.AL_MEMORY_MANAGED)
  {
    super();
    this.name = name;
    this.memoryClass = memoryClass;
  }

  IsValid()
  {
    return this.#valid;
  }

  GetMemoryClass()
  {
    return this.memoryClass;
  }

  Describe(description)
  {
    description.name = this.name;
  }

  Destroy()
  {
    this.#valid = false;
    super.Destroy();
  }
}

/** Every test starts from an empty registry; nothing else registers here. */
const clean = () => DestroyDeviceResources(
  Tr2ALMemoryType.AL_MEMORY_VIDEO | Tr2ALMemoryType.AL_MEMORY_MANAGED
);

test("a resource registers on construction and leaves on Destroy", () =>
{
  clean();

  const resource = new TestResource("buffer");

  assert.equal(Tr2BaseDeviceResourceAL.GetResourceCount(), 1);
  assert.equal(resource.IsRegistered(), true);

  resource.Destroy();

  assert.equal(Tr2BaseDeviceResourceAL.GetResourceCount(), 0);
  assert.equal(resource.IsRegistered(), false);
});

test("Destroy is idempotent, so a double release is not a double removal", () =>
{
  clean();

  const resource = new TestResource("buffer");

  resource.Destroy();
  resource.Destroy();

  assert.equal(Tr2BaseDeviceResourceAL.GetResourceCount(), 0);
});

test("only valid resources are described", () =>
{
  // Carbon skips invalid ones rather than describing them, so a released
  // handle contributes nothing to an inventory.
  clean();

  const live = new TestResource("live");
  const dead = new TestResource("dead");

  dead.Destroy();

  const seen = [];

  DescribeDeviceResources((memoryClass, description) => seen.push([ memoryClass, description.name ]));

  assert.deepEqual(seen, [ [ Tr2ALMemoryType.AL_MEMORY_MANAGED, "live" ] ]);

  live.Destroy();
});

test("destroying one memory class leaves the other alone", () =>
{
  clean();

  const video = new TestResource("video", Tr2ALMemoryType.AL_MEMORY_VIDEO);
  const managed = new TestResource("managed", Tr2ALMemoryType.AL_MEMORY_MANAGED);

  DestroyDeviceResources(Tr2ALMemoryType.AL_MEMORY_VIDEO);

  assert.equal(video.IsValid(), false);
  assert.equal(managed.IsValid(), true);

  managed.Destroy();
});

test("a destroy that creates more resources still sweeps them", () =>
{
  // THE CASE THE RESTART EXISTS FOR. Carbon breaks out and starts the sweep
  // again whenever the set changed underneath it, because destroying one
  // resource can create or destroy others. A single pass would leave the
  // spawned resource alive.
  clean();

  class Spawning extends TestResource
  {
    #spawned = false;

    Destroy()
    {
      if (!this.#spawned)
      {
        this.#spawned = true;
        new TestResource("spawned");
      }

      super.Destroy();
    }
  }

  const spawner = new Spawning("spawner");

  DestroyDeviceResources(Tr2ALMemoryType.AL_MEMORY_MANAGED);

  assert.equal(spawner.IsValid(), false);
  assert.equal(
    Tr2BaseDeviceResourceAL.GetResourceCount(),
    0,
    "the resource created during the sweep was destroyed too"
  );
});

test("enumeration tolerates an operation that destroys what it sees", () =>
{
  clean();

  const resources = [ new TestResource("a"), new TestResource("b"), new TestResource("c") ];
  const seen = [];

  Tr2BaseDeviceResourceAL.EnumerateResources(resource =>
  {
    seen.push(resource.name);
    resource.Destroy();
  });

  assert.deepEqual(seen.sort(), [ "a", "b", "c" ]);
  assert.equal(Tr2BaseDeviceResourceAL.GetResourceCount(), 0);
  assert.ok(resources.every(resource => !resource.IsValid()));
});

test("a subclass that forgets IsValid says so", () =>
{
  clean();

  class Incomplete extends Tr2BaseDeviceResourceAL {}

  const resource = new Incomplete();

  assert.throws(() => resource.IsValid(), /must implement IsValid/);

  resource.Destroy();
});

test("the default memory class is managed, as every Carbon stub reports", () =>
{
  clean();

  class Defaulted extends Tr2BaseDeviceResourceAL
  {
    IsValid()
    {
      return true;
    }
  }

  const resource = new Defaulted();

  assert.equal(resource.GetMemoryClass(), Tr2ALMemoryType.AL_MEMORY_MANAGED);

  resource.Destroy();
});
