# Core configuration

Status: Stable  
Scope: `@carbonenginejs/runtime/core`  
Audience: Runtime integrators  
Summary: Compose existing resource registrations and settings through CjsLibrary.

`DefaultConfiguration` is explicit JavaScript data containing classes and reader
functions. Construction copies those defaults and overrides without registering
anything. `Initialize` selects the supplied Blue services, registers the existing
host-pumped resource tick hook, and submits configuration to those actual owners.
The standard Blue tick registration does not pump or request resources. A custom
host must not begin resource work inside its registration hook.

`SetConfiguration` replaces each supplied named entry within a section. Omitted
entries remain; objects inside an entry are not deep-merged. Before initialization
it records requests. Afterwards only supplied entries are submitted. Resource
loaders/builders, extension routes and dynamic constructors remain implemented by
their resource modules. The default red/black route still reads compiled black
objects only. Backend translation is supplied as the existing shader loader.

`GetConfiguration` separates `requested` from `configured` owner submissions.
`owners` identifies their actual resource manager, paths and settings instances;
`initialized` concerns Blue service installation only. Backend entries remain
requested data for the host's existing setup. CREATE/LOAD settings do not imply
that an existing device or resource has changed. No restart occurs automatically.

ImageIO deduplicates the same handler class, appends distinct handlers and picks
the first match. Replacing an already configured ImageIO key with a different
class is rejected; a new key appends. Format registration updates the same class
but retains distinct candidates, so changing an applied format key to another
class is likewise rejected. Paths accept preconfigured instances and append once
per instance; this API does not implicitly unregister an old provider. No section
accepts a reset. Shutdown restores service references and ticks, not registrations
or settings in borrowed or global owners.

Supported entry shapes are the existing owner inputs: `formats` classes or
`{ Format, defaults }`, `resourceTypes` classes or `{ Constructor, ...options }`,
`extensions` classes or `{ Handler, Format, defaults, ...options }`, function-valued
`objectLoaders`/`objectBuilders`, and `resourceConstructors` classes (constructed
with the chosen manager) or prepared instances. `imageHandlers` contains codec
classes; `paths` contains prepared filesystem instances; `resMan` contains
existing Register options; `settings` contains named Trinity values; `backends`
contains per-backend request objects. No provider factory or lifecycle is added.

Validation happens before a patch is applied. Owners can still fail, including
after mutation: the original error propagates, successful preceding submissions
remain in `configured`, and `failure` identifies the uncertain call. A grouped
ResMan options failure makes the supplied option group uncertain. No rollback of
owner mutations is claimed, including when initial service installation is restored.

An existing extension route captures its loader. Changing that loader requires
submitting the corresponding extension entry in the same patch; a loader-only
change is rejected before any mutation. Existing resource handles keep their
captured route. Provider instances, including plain source/loader objects, remain
exact borrowed references in configuration and readback.
