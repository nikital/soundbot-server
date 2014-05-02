#!/usr/bin/env node

var http = require('http');
var express = require('express');
var WebSocketServer = require('websocket').server;
var bridge = require('./bridge.js');
var Bridge = bridge.Bridge;
var BridgePool = bridge.BridgePool;

var app = express();
app.use(express.static(__dirname + '/public'));
var server = app.listen(8080);

ws = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

var controlConnections = new BridgePool();

function onBotRequest(req) {
    var session = req.resourceURL.query.session;
    if (!session) {
        req.reject(400, 'No session name');
        return;
    }

    if (controlConnections.getBridgeByName(session)) {
        req.reject(409, 'Session already present');
        return;
    }

    if (req.requestedProtocols.indexOf('soundbot-bot-1') == -1) {
        req.reject(400, 'Unknown protocol');
        return;
    }

    var bridge = new Bridge(session, 'soundbot-bot-1', 'soundbot-control-1');
    controlConnections.addBridge(bridge);
    bridge.addMaster(req);
};

function onControlRequest(req) {
    var session = req.resourceURL.query.session;
    if (!session) {
        req.reject(400, 'No session name');
        return;
    }

    var bridge = controlConnections.getBridgeByName(session);
    if (!bridge) {
        req.reject(404, 'Session not found');
        return;
    }

    if (req.requestedProtocols.indexOf('soundbot-control-1') == -1) {
        req.reject(400, 'Unknown protocol');
        return;
    }

    bridge.addSlave(req);
};

ws.on('request', function(req) {
    if (req.resourceURL.pathname == '/bot') {
        onBotRequest(req);
    } else if (req.resourceURL.pathname == '/control') {
        onControlRequest(req);
    } else {
        req.reject(404, 'Endpoint not found');
    }
});
