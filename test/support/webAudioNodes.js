// Web Audio nodes the audio backend always creates, for tests whose fake
// AudioContext does not assert on them: the master safety compressor and the
// per-emitter level analyser. A test that inspects either keeps its own.

function Param(value)
{
    const param = {
        value,
        cancelScheduledValues() {},
        setValueAtTime(next) { param.value = next; },
        linearRampToValueAtTime() {},
    };
    return param;
}

function Node(fields)
{
    const node = {
        ...fields,
        connectedTo: null,
        disconnected: false,
        connect(target) { node.connectedTo = target; return target; },
        disconnect() { node.disconnected = true; },
    };
    return node;
}

/** A DynamicsCompressorNode stand-in. */
export function FakeDynamicsCompressor()
{
    return Node({
        threshold: Param(-24),
        knee: Param(30),
        ratio: Param(12),
        attack: Param(0.003),
        release: Param(0.25),
    });
}

/** An AnalyserNode stand-in reading silence. */
export function FakeAnalyser()
{
    return Node({
        fftSize: 2048,
        getFloatTimeDomainData(samples) { samples.fill(0); },
    });
}
