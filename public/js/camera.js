getUserMedia({video: true, audio: false}, function(stream) {
    var pc = RTCPeerConnection(WebRTC.peerConnectionConfig);

    var session = prompt('Session name:', 'nik');
    var signaling = new Signaling('ws://' + window.location.host + '/sdp/offer', session);

    pc.onicecandidate = function(e) {
        if (e.candidate) {
            signaling.signal({ice: e.candidate});
        }
    };

    pc.addStream(stream);

    signaling.$dispatcher.on('message', function(e, message) {
        if (message.get_offer) {
            pc.createOffer(function(desc) {
                pc.setLocalDescription(desc);
                signaling.signal({sdp: desc});
            });
        } else if (message.sdp) {
            pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        } else if (message.ice) {
            pc.addIceCandidate(new RTCIceCandidate(message.ice));
        }
    });
});
