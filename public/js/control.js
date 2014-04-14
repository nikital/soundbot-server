var ControlState = function() {
    this.wheelLeftForward = false;
    this.wheelLeftReverse = false;
    this.wheelRightForward = false;
    this.wheelRightReverse = false;

    this.$dispatcher = $({});
};

ControlState.prototype.setSteering = function(params) {
    var that = this;
    $.each(params, function(key, value) {
        if (key == 'wheelLeftForward' ||
            key == 'wheelLeftReverse' ||
            key == 'wheelRightForward' ||
            key == 'wheelRightReverse') {
            that[key] = value;
        }
    });
    this.$dispatcher.trigger('steering');
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
    }
    else if (e.keyCode == Key.A) {
        this.state.setSteering({wheelLeftReverse: true});
    }
    else if (e.keyCode == Key.W) {
        this.state.setSteering({wheelRightForward: true});
    }
    else if (e.keyCode == Key.S) {
        this.state.setSteering({wheelRightReverse: true});
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
    }
    else if (e.keyCode == Key.A) {
        this.state.setSteering({wheelLeftReverse: false});
    }
    else if (e.keyCode == Key.W) {
        this.state.setSteering({wheelRightForward: false});
    }
    else if (e.keyCode == Key.S) {
        this.state.setSteering({wheelRightReverse: false});
    }
};

var UIControl = function(state){
    this.state = state;

    this.$leftForward = $('.wheel-left > .arrow-forward');
    this.$leftReverse = $('.wheel-left > .arrow-reverse');
    this.$rightForward = $('.wheel-right > .arrow-forward');
    this.$rightReverse = $('.wheel-right > .arrow-reverse');

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
};

var controlState = new ControlState();
var keyboardControl = new KeyboardControl(controlState);
var uiControl = new UIControl(controlState);
