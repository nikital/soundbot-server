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

function BridgePool() {
    this._bridges = [];
}

BridgePool.prototype.addBridge = function(bridge) {
    if (this.getBridgeByName(bridge.name)) {
        console.log((new Date()) + ' Duplicate bridge: ' + bridge.name);
        return;
    }

    this._bridges.push(bridge);
    bridge.on('close', this._onBridgeClose.bind(this));
};

BridgePool.prototype.getBridgeByName = function(name) {
    for (var i = 0; i < this._bridges.length; ++i) {
        var bridge = this._bridges[i];
        if (bridge.name === name) {
            return bridge;
        }
    }

    return null;
};

BridgePool.prototype._onBridgeClose = function(bridge) {
    for (var i = 0; i < this._bridges.length; ++i) {
        if (this._bridges[i] === bridge) {
            this._bridges.splice(i, 1);
            break;
        }
    }
};

exports.Bridge = Bridge;
exports.BridgePool = BridgePool;
