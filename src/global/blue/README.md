# Blue service composition

`blue` is the process-wide `CjsBlue` holder. Its constructor creates local defaults
without registering ticks, starting workers, fetching data or touching a device.
Class declarations and enums use the existing shared registries. The SOF slot
starts null; the audio slot holds the dependency-light silent engine from
`global/audio`. Real SOF and playback implementations stay above this layer.

`CjsLibrary.Initialize` installs preconfigured, borrowed providers. The internal
`installBlueServices` transaction first validates all supplied slots, registers
the candidate resource manager/clock pair, detaches the old pair, then publishes
the slots. Its private tick cookie preserves unrelated host registrations.
Changing only paths, SOF or audio does not touch ticks. Failed hooks run inverse
operations; the original error is retained, with failed compensation reported in
an AggregateError. Publication happens only after successful transfer.

The prior references and activation state form a restoration snapshot. Restoring
an unstarted holder detaches the active pair without activating the defaults.
Shutdown does not destroy borrowed providers or undo their own configuration.
The host still owns pumping the clock; startup only registers its recipient.

`CjsBlue.Fetch` forwards DNA to SOF and other requests to ResMan, preserving options
and results. It does not load catalogs or initialize resource dependencies itself.
Missing SOF reports "SOF is not configured". Dynamic resource constructors remain
registered with ResMan; they are not additional Blue slots.
