(
// Run this to start sending the RMS OSC messages to SC.
~dirt.startSendRMS;

~dirt.orbits.collect { |orbit, i|
	// Set default reply rate and peak lag (this can also be set on the event itself (i.e. Tidal)
	orbit.defaultParentEvent.put(\rmsReplyRate, 8).put(\rmsPeakLag, 3);
};

// The bridge will be listening to OSC messages on port UDP 9130.
b = NetAddr.new("127.0.0.1", 9130);

// This is the RMS OSC handler, here we'll forward these messages to our bridge
OSCFunc({ |msg|
	// Forward OSC message
	b.sendMsg("/rms", *msg);
}, "/rms").fix;

"RMS ready!"
)

// You can stop sending RMS events with:
// ~dirt.stopSendRMS;