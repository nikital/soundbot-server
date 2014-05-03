#!/usr/bin/env node

var http = require('http');
var express = require('express');
var WebSocketServer = require('websocket').server;
var BridgePool = require('./bridge.js').BridgePool;

var app = express();
app.use(express.static(__dirname + '/public'));
var server = app.listen(8080);

ws = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

var controlConnections = new BridgePool('soundbot-bot-1', 'soundbot-control-1');
var sdpConnections = new BridgePool('soundbot-sdp-1', 'soundbot-sdp-1');

function onBotRequest(req) {
    var session = req.resourceURL.query.session;
    if (!session) {
        req.reject(400, 'No session name');
        return;
    }

    controlConnections.addMaster(req, session);
};

function onControlRequest(req) {
    var session = req.resourceURL.query.session;
    if (!session) {
        req.reject(400, 'No session name');
        return;
    }

    controlConnections.addSlave(req, session);
};

function onSdpOfferRequest(req) {
    var session = req.resourceURL.query.session;
    if (!session) {
        req.reject(400, 'No session name');
        return;
    }

    sdpConnections.addMaster(req, session);
};

function onSdpAnswerRequest(req) {
    var session = req.resourceURL.query.session;
    if (!session) {
        req.reject(400, 'No session name');
        return;
    }

    sdpConnections.addSlave(req, session);
};

ws.on('request', function(req) {
    if (req.resourceURL.pathname == '/bot') {
        onBotRequest(req);
    } else if (req.resourceURL.pathname == '/control') {
        onControlRequest(req);
    } else if (req.resourceURL.pathname == '/sdp/offer') {
        onSdpOfferRequest(req);
    } else if (req.resourceURL.pathname == '/sdp/answer') {
        onSdpAnswerRequest(req);
    } else {
        req.reject(404, 'Endpoint not found');
    }
});
