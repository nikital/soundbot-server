#!/usr/bin/env node

var http = require('http');
var express = require('express');
var WebSocketServer = require('websocket').server;

var app = express();
app.use(express.static(__dirname + '/public'));
var server = app.listen(8080);

ws = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

var pendingBotConnections = [];
var activeBotSessionNames = [];

function findPendingConnectionIndex(session) {
    for (var i = 0; i < pendingBotConnections.length; i++) {
        if (pendingBotConnections[i].session == session) {
            return i;
        }
    }
    return -1;
}

function isSessionNameAvailable(session) {
    if (!session) {
        return false;
    }

    if (findPendingConnectionIndex(session) != -1) {
        return false;
    }

    if (activeBotSessionNames.indexOf(session) != -1) {
        return false;
    }

    return true;
}

function onBotRequest(req) {
    var session = req.resourceURL.query.session;
    if (!session) {
        req.reject(400, 'No session name');
        return;
    }

    if (!isSessionNameAvailable(session)) {
        req.reject(409, 'Session already present');
        return;
    }

    if (req.requestedProtocols.indexOf('soundbot-bot-1') == -1) {
        req.reject(400, 'Unknown protocol');
        return;
    }

    var conn = req.accept('soundbot-bot-1', req.origin);
    console.log((new Date()) + ' Bot connected to session: ' + session);

    pendingBotConnections.push({
        session: session,
        connection: conn
    });

    conn.on('close', function() {
        var i = findPendingConnectionIndex(session);
        if (i != -1) {
            pendingBotConnections.splice(i, 1);
        }
    });
};

function onControlRequest(req) {
    var session = req.resourceURL.query.session;
    if (!session) {
        req.reject(400, 'No session name');
        return;
    }

    var sessionId = findPendingConnectionIndex(session);
    if (sessionId == -1) {
        req.reject(404, 'Session not found');
        return;
    }

    if (req.requestedProtocols.indexOf('soundbot-control-1') == -1) {
        req.reject(400, 'Unknown protocol');
        return;
    }

    var botConn = pendingBotConnections[sessionId].connection;
    var controlConn = req.accept('soundbot-control-1', req.origin);
    console.log((new Date()) + ' Control connected to session: ' + session);

    pendingBotConnections.splice(sessionId, 1);
    activeBotSessionNames.push(session);

    var cleanupSession = function() {
        var i = activeBotSessionNames.indexOf(session);
        if (i != -1) {
            activeBotSessionNames.splice(i, 1);
        }
    };

    controlConn.on('message', function(message) {
        if (message.type == 'binary')
            botConn.sendBytes(message.binaryData);
        else if (message.type == 'utf8')
            botConn.sendUTF(message.utf8Data);
    });
    botConn.on('message', function(message) {
        if (message.type == 'binary')
            controlConn.sendBytes(message.binaryData);
        else if (message.type == 'utf8')
            controlConn.sendUTF(message.utf8Data);
    });

    botConn.on('close', function() {
        controlConn.close();
        cleanupSession();
    });
    controlConn.on('close', function() {
        botConn.close();
        cleanupSession();
    });
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
