MediaStreamTrack.getSources(gotSources);

function gotSources(sources)
{
    var videoSources = sources.filter(function(s) { return s.kind == 'video'; });
    if (videoSources.length == 0) {
        console.log('No video sources');
    }

    var environmentSourceId = 0;

    for (var i = 0; i < videoSources.length; ++i) {
        if (videoSources[i].facing == 'environment') {
            environmentSourceId = i;
            break;
        }
    }

    startCamera(videoSources[environmentSourceId].id);
}

function startCamera(videoSourceId)
{
    getUserMedia({video: {optional: [{sourceId: videoSourceId}]}, audio: false}, function(stream) {
        var pc = null;

        var session = prompt('Session name:', 'nik');
        var signaling = new Signaling('ws://' + window.location.host + '/sdp/offer', session);

        signaling.$dispatcher.on('message', function(e, message) {
            if (message.get_offer) {
                pc = RTCPeerConnection(WebRTC.peerConnectionConfig);

                pc.onicecandidate = function(e) {
                    if (e.candidate) {
                        signaling.signal({ice: e.candidate});
                    }
                };

                pc.addStream(stream);
                pc.createOffer(function(desc) {
                    pc.setLocalDescription(desc);
                    signaling.signal({sdp: desc});
                });
            } else if (message.sdp && pc) {
                pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
            } else if (message.ice && pc) {
                pc.addIceCandidate(new RTCIceCandidate(message.ice));
            }
        });
    });
}
