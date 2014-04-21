var ControlState = function() {
    this.wheelLeftForward = false;
    this.wheelLeftReverse = false;
    this.wheelRightForward = false;
    this.wheelRightReverse = false;
    this.boost = false;

    this.frontCameraUp = false;
    this.frontCameraDown = false;

    this.frontLight = false;

    this.$dispatcher = $({});
};

ControlState.prototype.setSteering = function(params) {
    var that = this;
    $.each(params, function(key, value) {
        if (key == 'wheelLeftForward' ||
            key == 'wheelLeftReverse' ||
            key == 'wheelRightForward' ||
            key == 'wheelRightReverse' ||
            key == 'boost') {
            that[key] = value;
        }
    });
    this.$dispatcher.trigger('steering');
    this.$dispatcher.trigger('all');
};

ControlState.prototype.setFrontCamera = function(params) {
    var that = this;
    $.each(params, function(key, value) {
        if (key == 'frontCameraUp' ||
            key == 'frontCameraDown') {
            that[key] = value;
        }
    });
    this.$dispatcher.trigger('frontCamera');
    this.$dispatcher.trigger('all');
};

ControlState.prototype.setMisc = function(params) {
    var that = this;
    $.each(params, function(key, value) {
        if (key == 'frontLight') {
            that[key] = value;
        }
    });
    this.$dispatcher.trigger('misc');
    this.$dispatcher.trigger('all');
};

var KeyboardControl = function(state){
    // state.$dispatcher.on('all', this.update.bind(this));

    this.state = state;
    this.keysPressed = new Array(256);

    $(document).on('keydown', this.onKeyDown.bind(this));
    $(document).on('keyup', this.onKeyUp.bind(this));
};

KeyboardControl.prototype.onKeyDown = function(e) {
    if (e.keyCode >= this.keysPressed.length)
        return;
    if (this.keysPressed[e.keyCode])
        return;
    this.keysPressed[e.keyCode] = true;

    if (e.keyCode == Key.Q) {
        this.state.setSteering({wheelLeftForward: true});
    } else if (e.keyCode == Key.A) {
        this.state.setSteering({wheelLeftReverse: true});
    } else if (e.keyCode == Key.W) {
        this.state.setSteering({wheelRightForward: true});
    } else if (e.keyCode == Key.S) {
        this.state.setSteering({wheelRightReverse: true});
    } else if (e.keyCode == Key.SPACE) {
        this.state.setSteering({boost: true});
    } else if (e.keyCode == Key.K) {
        this.state.setFrontCamera({frontCameraUp: true});
    } else if (e.keyCode == Key.J) {
        this.state.setFrontCamera({frontCameraDown: true});
    } else if (e.keyCode == Key.L) {
        this.state.setMisc({frontLight: !this.state.frontLight});
    }
};

KeyboardControl.prototype.onKeyUp = function(e) {
    if (e.keyCode >= this.keysPressed.length)
        return;
    if (!this.keysPressed[e.keyCode])
        return;
    this.keysPressed[e.keyCode] = false;

    if (e.keyCode == Key.Q) {
        this.state.setSteering({wheelLeftForward: false});
    } else if (e.keyCode == Key.A) {
        this.state.setSteering({wheelLeftReverse: false});
    } else if (e.keyCode == Key.W) {
        this.state.setSteering({wheelRightForward: false});
    } else if (e.keyCode == Key.S) {
        this.state.setSteering({wheelRightReverse: false});
    } else if (e.keyCode == Key.SPACE) {
        this.state.setSteering({boost: false});
    } else if (e.keyCode == Key.K) {
        this.state.setFrontCamera({frontCameraUp: false});
    } else if (e.keyCode == Key.J) {
        this.state.setFrontCamera({frontCameraDown: false});
    }
};

var UIControl = function(state){
    this.state = state;

    this.$leftForward = $('.wheel-left > .arrow-forward');
    this.$leftReverse = $('.wheel-left > .arrow-reverse');
    this.$rightForward = $('.wheel-right > .arrow-forward');
    this.$rightReverse = $('.wheel-right > .arrow-reverse');

    this.$boost = $('.boost');

    this.$frontCameraUp = $('.front-camera-control > .arrow-up');
    this.$frontCameraDown = $('.front-camera-control > .arrow-down');
    this.$frontLight = $('.front-camera-control > .light-toggle');

    state.$dispatcher.on('all', this.update.bind(this));
};

UIControl.prototype.update = function() {
    if (this.state.wheelLeftForward) {
        this.$leftForward.addClass('arrow-active');
    } else { this.$leftForward.removeClass('arrow-active'); }
    if (this.state.wheelLeftReverse) {
        this.$leftReverse.addClass('arrow-active');
    } else { this.$leftReverse.removeClass('arrow-active'); }
    if (this.state.wheelRightForward) {
        this.$rightForward.addClass('arrow-active');
    } else { this.$rightForward.removeClass('arrow-active'); }
    if (this.state.wheelRightReverse) {
        this.$rightReverse.addClass('arrow-active');
    } else { this.$rightReverse.removeClass('arrow-active'); }

    if (this.state.boost) {
        this.$boost.addClass('boost-active');
    } else { this.$boost.removeClass('boost-active'); }

    if (this.state.frontCameraUp) {
        this.$frontCameraUp.addClass('active');
    } else { this.$frontCameraUp.removeClass('active'); }
    if (this.state.frontCameraDown) {
        this.$frontCameraDown.addClass('active');
    } else { this.$frontCameraDown.removeClass('active'); }

    if (this.state.frontLight) {
        this.$frontLight.addClass('active');
    } else { this.$frontLight.removeClass('active'); }
};

var Connection = function(endpoint, session, state) {
    this.socket = new WebSocket(
        endpoint + '?session=' + encodeURIComponent(session),
        'soundbot-control-1');
    this.socket.onopen = this.onConnect.bind(this);
    this.socket.onclose = this.onClose.bind(this);
    this.socket.onerror = this.onError.bind(this);

    this.state = state;
};

Connection.prototype.onConnect = function(e) {
    this.state.$dispatcher.on('steering', this.onSteeringUpdate.bind(this));
    this.state.$dispatcher.on('frontCamera', this.onFrontCameraUpdate.bind(this));
    this.state.$dispatcher.on('misc', this.onMiscUpdate.bind(this));

    this.onSteeringUpdate();
};

Connection.prototype.onSteeringUpdate = function() {
    var p = new Uint8Array(4);
    p[0] = 1; // Message type: Steering

    if (this.state.wheelLeftForward == this.state.wheelLeftReverse) {
        p[1] = 0;
    } else if (this.state.wheelLeftForward) {
        p[1] = 1;
    } else if (this.state.wheelLeftReverse) {
        p[1] = 2;
    }

    if (this.state.wheelRightForward == this.state.wheelRightReverse) {
        p[2] = 0;
    } else if (this.state.wheelRightForward) {
        p[2] = 1;
    } else if (this.state.wheelRightReverse) {
        p[2] = 2;
    }

    p[3] = this.state.boost;

    this.socket.send(p);
};

Connection.prototype.onFrontCameraUpdate = function() {
    var p = new Uint8Array(2);
    p[0] = 2; // Message type: Front Camera

    if (this.state.frontCameraUp == this.state.frontCameraDown) {
        p[1] = 0;
    } else if (this.state.frontCameraUp) {
        p[1] = 1;
    } else if (this.state.frontCameraDown) {
        p[1] = 2;
    }

    this.socket.send(p);
};

Connection.prototype.onMiscUpdate = function() {
    var p = new Uint8Array(2);
    p[0] = 3; // Message type: Misc

    p[1] = this.state.frontLight ? 1 : 0;

    this.socket.send(p);
};

Connection.prototype.onClose = function(e) {
    console.log('Connection closed');
};
Connection.prototype.onError = function(e) {
    console.error('Connection error');
};

var controlState = new ControlState();
var keyboardControl = new KeyboardControl(controlState);
var uiControl = new UIControl(controlState);
var connection = new Connection('ws://nikita-macbook:8080/control',
                                prompt('Session name:', 'nik'),
                                controlState);
