/*
 * Provides bridging between websockets.
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;

function Bridge(name, masterProtocol, slaveProtocol, keepOnSlaveClose) {
    this.name = name;
    this.master = null;
    this.slave = null;

    this._masterProtocol = masterProtocol;
    this._slaveProtocol = slaveProtocol;
}

util.inherits(Bridge, EventEmitter);

Bridge.prototype.addMaster = function(req) {
    if (this.master) {
        console.log((new Date()) + ' Duplicate master attemped to connect: ' + this.name);
        req.reject(409, 'Master already connected');
        return;
    }

    console.log((new Date()) + ' Master connected to: ' + this.name);

    this.master = req.accept(this._masterProtocol, req.origin);
    this.master.on('message', this._onMasterMessage.bind(this));
    this.master.on('close', this._onMasterClose.bind(this));
};

Bridge.prototype.addSlave = function(req) {
    if (this.slave) {
        console.log((new Date()) + ' Duplicate slave attemped to connect: ' + this.name);
        req.reject(409, 'Slave already connected');
        return;
    }

    console.log((new Date()) + ' Slave connected to: ' + this.name);

    this.slave = req.accept(this._slaveProtocol, req.origin);
    this.slave.on('message', this._onSlaveMessage.bind(this));
    this.slave.on('close', this._onSlaveClose.bind(this));
};

Bridge.prototype._onMasterMessage = function(message) {
    if (!this.slave) {
        return;
    }

    if (message.type == 'binary')
        this.slave.sendBytes(message.binaryData);
    else if (message.type == 'utf8')
        this.slave.sendUTF(message.utf8Data);
};

Bridge.prototype._onSlaveMessage = function(message) {
    if (!this.master) {
        return;
    }

    if (message.type == 'binary')
        this.master.sendBytes(message.binaryData);
    else if (message.type == 'utf8')
        this.master.sendUTF(message.utf8Data);
};

Bridge.prototype._onMasterClose = function() {
    console.log((new Date()) + ' Master disconnected from: ' + this.name);

    this.master = null;
    if (this.slave) {
        this.slave.close();
        this.slave = null;
    }

    this.emit('close', this);
};

Bridge.prototype._onSlaveClose = function() {
    console.log((new Date()) + ' Slave disconnected from: ' + this.name);

    this.slave = null;

    // Don't drop the bridge, wait for another slave to connect
};

function BridgePool(masterProtocol, slaveProtocol) {
    this._bridges = [];
    this._masterProtocol = masterProtocol;
    this._slaveProtocol = slaveProtocol;
}

BridgePool.prototype.addMaster = function(req, name) {
    if (req.requestedProtocols.indexOf(this._masterProtocol) == -1) {
        console.log((new Date()) + ' Unknown master protocols: ' + req.requestedProtocols);
        req.reject(400, 'Unknown protocol');
        return;
    }

    var bridgeIdx = this._getBridgeIndexByName(name);
    if (bridgeIdx != -1) {
        console.log((new Date()) + ' Duplicate master attemped to connect: ' + name);
        req.reject(409, 'Bridge already present');
        return;
    }

    var bridge = new Bridge(name, this._masterProtocol, this._slaveProtocol);
    this._bridges.push(bridge);
    bridge.on('close', this._onBridgeClose.bind(this));

    bridge.addMaster(req);
};

BridgePool.prototype.addSlave = function(req, name) {
    if (req.requestedProtocols.indexOf(this._slaveProtocol) == -1) {
        console.log((new Date()) + ' Unknown slave protocols: ' + req.requestedProtocols);
        req.reject(400, 'Unknown protocol');
        return;
    }

    var bridgeIdx = this._getBridgeIndexByName(name);
    if (bridgeIdx == -1) {
        console.log((new Date()) + ' Bridge not found: ' + name);
        req.reject(404, 'Bridge not found');
        return;
    }

    var bridge = this._bridges[bridgeIdx];
    bridge.addSlave(req);
};

BridgePool.prototype._getBridgeIndexByName = function(name) {
    for (var i = 0; i < this._bridges.length; ++i) {
        var bridge = this._bridges[i];
        if (bridge.name === name) {
            return i;
        }
    }

    return -1;
};

BridgePool.prototype._onBridgeClose = function(bridge) {
    var i = this._getBridgeIndexByName(bridge.name);
    if (i != -1) {
        this._bridges.splice(i, 1);
    }
};

exports.Bridge = Bridge;
exports.BridgePool = BridgePool;
