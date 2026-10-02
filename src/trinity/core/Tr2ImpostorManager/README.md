# Impostor capture ownership

The manager owns atlas/capture target wrappers, depth storage, the capture
queue and a registration with the shared quad renderer. Resource acquisition,
AL texture realization, instance upload and batch drawing stay with the
existing effect, context and quad-renderer owners. Explicit destruction drops
the registration and releases surfaces. Demo graph retirement also accounts
for constructor effects retained by another live graph.

The caller runs BeginUpdate/Add/EndUpdate, then captures each queued source
between BeginUpdateAtlas and EndUpdateAtlas. EndUpdate submits billboard
instances to Tr2QuadRenderer; it does not draw them directly. Automatic scene
capture scheduling is not added here. The native header's Render declaration
has no implementation and remains explicit rather than claiming a draw.

Headless regressions prove tile allocation, copy requests, native instance
bytes, queue priorities, upload/batch submission and lifetime. They do not
establish shader pixel parity.
