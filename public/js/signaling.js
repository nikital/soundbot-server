function Signaling(endpoint, session) {
    this._socket = new WebSocket(
        endpoint + '?session=' + encodeURIComponent(session),
        'soundbot-sdp-1');
    this._socket.onopen = this._onConnect.bind(this);
    this._socket.onmessage = this._onMessage.bind(this);
    this._socket.onclose = this._onClose.bind(this);

    this.$dispatcher = $({});

    this._bufferedSignals = [];
}

Signaling.prototype.signal = function(obj) {
    var message = JSON.stringify(obj);
    if (this._socket.readyState == WebSocket.OPEN) {
        this._socket.send(message);
    } else {
        this._bufferedSignals.push(message);
    }
}

Signaling.prototype._onConnect = function(e) {
    for (var i = 0; i < this._bufferedSignals.length; ++i) {
        this._socket.send(this._bufferedSignals[i]);
    }
    this._bufferedSignals = [];
};

Signaling.prototype._onMessage = function(e) {
    if (typeof e.data == 'string') {
        var obj = JSON.parse(e.data);
        this.$dispatcher.trigger('message', [obj]);
    }
};

Signaling.prototype._onClose = function(e) {
    console.log('Signaling closed');
    // Clean buffered signals, it won't make sense to send them to a new
    // connection.
    this._bufferedSignals = [];

    this.$dispatcher.trigger('close');
};
