getUserMedia({video: true, audio: false}, function(stream) {
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
