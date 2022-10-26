/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var ChatClient = function(chatCommunicator) {
    this._chatCommunicator = chatCommunicator;
    this._events = [];
    this._chattingPids = {};
    this._stoppedPids = {};
    this._leavingPids = {};
    this._lastActivePids = {};
    this._lastInactivePids = {};
    this._activated = 0;
    this._doSendPings = 1;
    this._reportedInvalidSignatures = {};
    return this;
}

var f = (function () {
    var MSG_LEAVING = String.fromCharCode(1);
    var MSG_STOPPED = String.fromCharCode(3);
    var MSG_NEW_SHARED_KEY = String.fromCharCode(4);
    var MSG_PING_ACTIVE = String.fromCharCode(5);
    var MSG_PING_INACTIVE = String.fromCharCode(6);
    var MSG_READ_CONFIRM = String.fromCharCode(7);

    var MSG_MAX_SERVICE = String.fromCharCode(8);

function dettachEvents(client) {
    for (var i = 0; i < client._events.length; i++) {
        MochiKit.Signal.disconnect(client._events[i]);
    }
}

function getHashTToIntArr(hash) {
    var ret = [];
    for (var i in hash) {
        if (hash.hasOwnProperty(i)) {
            ret.push(i|0);
        }
    }
    ret.sort(function(a,b){return a-b;});
    return ret;
}

function parseNewSharedKeyFile(client, ba, adminPid) {
    var pids = getHashTToIntArr(client._chattingPids);
    
    var com = client._chatCommunicator;
    var len = ba.length()/pids.length;
    var pid = client.getPId();
    var ind = jQuery.inArray(pid|0, pids);
    if (ind < 0) {
        debugger;
        console.log('Invalid pid while decrypting new key');
        return false;
    }
    var sharedKey = com.getPublicKeys()[adminPid|0].powerModule(com.getPrivateKey(), com.getP()).asByteArray();
    sharedKey = Clipperz.Crypto.SHA.sha256(sharedKey);
    var crypted = ba.split(ind*len, ind*len + len);
    return myEncryption['aes'].decrypt(crypted, sharedKey);
}

function encodeNewSharedKeyFile(client, ba) {
    var pids = getHashTToIntArr(client._chattingPids);
    var com = client._chatCommunicator;
    var ret = new Clipperz.ByteArray();
    
    for (var i = 0; i < pids.length; i++) {
        var pid = pids[i];
        
        var sharedKey = com.getPublicKeys()[pid].powerModule(com.getPrivateKey(), com.getP()).asByteArray();
        sharedKey = Clipperz.Crypto.SHA.sha256(sharedKey);
        var crypted = myEncryption['aes'].encrypt(ba, sharedKey);
        ret.appendBlock(crypted);
    }
    return ret;    
}

function checkTimeouts(client) {
    var upto = new Date().getTime()/1000 - client._chatCommunicator.getTimeout() - 10;
    var uptoIa = new Date().getTime()/1000 - 60;
    
    for (var pid in client._chattingPids) {
        if (!client._chattingPids.hasOwnProperty(pid) 
          || client._leavingPids[pid] 
          || client._stoppedPids[pid]) {
            continue;
        }
        if (client._lastActivePids[pid] < upto) {
            delete client._chattingPids[pid];
            leaving(client, pid, "no user input for a long time");
            return;
        }
        /* Disabled /*
          
           if (client._lastInactivePids[pid] < uptoIa) {
            delete client._chattingPids[pid];
            leaving(client, pid, "lack of network activity");
            return;
        }
        /**/
    }
}

function leaving(client, pId, msg) {
    client._leavingPids[pId] = 1;

    if (client._stopSent) {
        return;
    }
    
    if (!client._sendingMsgCount) {
        client.sendStopped();
    } else {
        console.log('sending ' + client._sendingMsgCount + ' messages. no stop.');
        client.needStop = 1;
    }
    client._stopSent = 1;
    MochiKit.Signal.signal(client, 'leaving', pId, msg);
    chkToSendNewKey(client);
}

function chkToSendNewKey(client) {
    if (!client._stopSent) {
        return;
    }
    var allStopped = 1;
     for (var pid in client._chattingPids) {
         if (!client._chattingPids.hasOwnProperty(pid)) {
             continue;
         }
         if (!client._stoppedPids[pid] && !client._leavingPids[pid]) {
             allStopped = 0;
             break;
         }
     }
     if (allStopped) {
         //Exclude leaving from chatting and send new key
         for (var pid in client._leavingPids) {
             if (!client._leavingPids.hasOwnProperty(pid)) {
                 continue;
             }
             delete client._chattingPids[pid];
             if (pid == client.getPId()) {
                 debugger;
                 client._stop();
                 return;
             }
         }
         if (client.isAdmin()) {
             client.sendNewKey();
         }
     }
}

function attachEvents(client) {
    client._events.push(MochiKit.Signal.connect(client._chatCommunicator, 'netError', 
        function (message) {
            if (!message) {
                return;
            }
            if (message === 'timeout') {
                debugger;
                client._stop();
            }
            if (message.toLowerCase() === 'chat expired') {
                client._stop();
            }
        }));
        
    client._events.push(MochiKit.Signal.connect(client._chatCommunicator, 'message', 
        function (message, mId, pId) {
            checkTimeouts(client);
            if (client._leavingPids[pId] || !client._chattingPids[pId]) {
                console.log('Stopping or leaving pid message dropped');
                chkToSendNewKey(client);
                return;
            }
            client._lastInactivePids[pId] = new Date().getTime()/1000;
            if (message.text === MSG_PING_INACTIVE) {
                console.log('Ping inactive from ' + pId + ' at ' + new Date());
                return;
            }
            if (message.text.charAt(0) === MSG_READ_CONFIRM) {
                return; //Not to count as activity
            }
            
            if (message.text === MSG_PING_ACTIVE) {
                console.log('Ping ACTIVE from ' + pId + ' at ' + new Date());
            }
            
            client._lastActivePids[pId] = new Date().getTime()/1000;
            
            if (message.text.length === 1 && message.text <= MSG_MAX_SERVICE) {
                var msg = message.text.charAt(0);
                if (msg === MSG_LEAVING) {
                    leaving(client, pId);
                }
                
                if (msg === MSG_STOPPED) {
                    client._stoppedPids[pId] = 1;
                    chkToSendNewKey(client);
                }
                if (msg === MSG_NEW_SHARED_KEY) {
                    client._chatCommunicator.replaceSharedKey(parseNewSharedKeyFile(client, message.files[0].content, client.getAdminPId()));
                    client._stopSent = 0;
                    client._stoppedPids = {};
                    var cnt = 0;
                    for (var pid in client._chattingPids){
                        if (client._chattingPids.hasOwnProperty(pid)) {
                            cnt ++;
                        }
                    }
                    if (cnt > 1) {
                        MochiKit.Signal.signal(client, 'resume');
                        ping(client);
                    } else {
                        client._stop();
                    }
                }
            }
        }));

    client._events.push(MochiKit.Signal.connect(client._chatCommunicator,  'activated', 
        function() {
            client._activated = 1;
            ping(client);
            var len = client._chatCommunicator.getNiks().length;
            for (var i = 0; i < len; i++) {
                client._chattingPids[i] = 1;
            }
            MochiKit.Signal.signal(client,  'activated');
        }));

        client._events.push(MochiKit.Signal.connect(client._chatCommunicator, 'joined', function (pid) {
            client._lastActivePids[pid] = new Date().getTime()/1000;
        }));
}

function ping(client) {
    if (client._stopSent) {
        return;
    }
    if (client._pingTimeoutHandle) {
        clearTimeout(client._pingTimeoutHandle);
        client._pingTimeoutHandle = 0;
    }

    client._send({text: client._statusActive ? MSG_PING_ACTIVE: MSG_PING_INACTIVE, files: []}, function(){});
}

ChatClient.prototype = MochiKit.Base.update(null, {
    'startExisting': function (chatId, chatKey, regSign, done) {
        attachEvents(this);
        this._chatCommunicator.setChatData({
            chatId: chatId,
            chatKey: chatKey,
            regSign: regSign
        });
        this._chatCommunicator.startExisting(done);
    },
    'startNew': function (niks, timeout, startTimeout, done) {
        attachEvents(this);
        this._chatCommunicator.startNew(niks, timeout, startTimeout, done);
    },
    '_send': function (message, done) {
        if (!this._chatCommunicator) {
            return;
        }
        if (this._pingTimeoutHandle) {
            clearTimeout(this._pingTimeoutHandle);
            this._pingTimeoutHandle = 0;
        }
        this._sendingMsgCount = this._sendingMsgCount ? this._sendingMsgCount+1:1;
        console.log('Message sending..');
        var _this = this;
        this._chatCommunicator.send(message, function(success) {
            console.log('Message sent');
            if (!_this._pingTimeoutHandle) {
                _this._pingTimeoutHandle = setTimeout(function(){
                _this._pingTimeoutHandle = 0;
                ping(_this);
               }, 10000);
            }
            _this._sendingMsgCount--;
            if (!_this._sendingMsgCount && _this.needStop) {
                _this.needStop = 0;
                _this.sendStopped();
            }
            done?done(success):0;
        });
    },
    'send': function (message, done) {
        if (!this._activated) {
            return false;
        }
        if (message.text.length === 1 && message.text < MSG_MAX_SERVICE) {
            message.text = ""; //control message conflict
        }
        if (this._stoppedPids[this.getPId()]) {
            console.log('Tried to send a message while stopped');
            return false;
        }
        this._send(message, done);
    },
    'sendLeave': function(done) {
        this._send({text: MSG_LEAVING, files: [], sync: 1}, done);
    },
    'sendStopped': function(done) {
        this._send({text: MSG_STOPPED, files: []}, done);
    },
    'sendNewKey': function(done) {
        this._reportedInvalidSignatures = {};
        this._send({
            text: MSG_NEW_SHARED_KEY, 
            files: [{file: {name: '', type: ''}, 
                    arr: encodeNewSharedKeyFile(this, myCrypt.getRandomBytes(myEncryption['aes'].keyLength()))}]
        }, done);
    },
    '_stop': function() {
        this._chatCommunicator.stop();
        MochiKit.Signal.signal(this, 'close');
        dettachEvents(this);
        this._chatCommunicator = null;
    },
    'stop': function() {
        this._activated = 0;
        this._chatCommunicator.stop();
        MochiKit.Signal.signal(this, 'close');
        dettachEvents(this);
        this._chatCommunicator = null;
    },
    'onClose': function(func) {
        this._events.push(MochiKit.Signal.connect(this, 'close', func));
    },
    'onNewMessage': function(func/*(message, mId, pId)*/) {
        this._events.push(MochiKit.Signal.connect(this._chatCommunicator, 'message', 
            function (message, mId, pId) {
                if (message.text.length >= 1 && message.text.charCodeAt(0) < 32) {
                    return;
                }
                func(message, mId, pId);
            }));
    },
    'onJoined': function(func) {
        this._events.push(MochiKit.Signal.connect(this._chatCommunicator, 'joined',func));
    },
    'onNetError': function(func){
        this._events.push(MochiKit.Signal.connect(this._chatCommunicator, 'netError',func));
    }, 
    'onActivated': function(func) {
        this._events.push(MochiKit.Signal.connect(this, 'activated',func));
    },
    'onLeaving': function(func) {
        this._events.push(MochiKit.Signal.connect(this, 'leaving', func));
    },
    'onStopped': function(func) {
        this._events.push(MochiKit.Signal.connect(this._chatCommunicator, 'message', 
            function (message, mId, pId) {
                if (message.text.length === 1 && message.text.charAt(0) === MSG_STOPPED) {
                    func(pId);
                }
            }));
    },
    'onNewSharedKey': function(func) {
        this._events.push(MochiKit.Signal.connect(this._chatCommunicator, 'message', 
            function (message, mId, pId) {
                if (message.text.length === 1 && message.text.charAt(0) === MSG_NEW_SHARED_KEY) {
                    func(pId);
                }
            }));
    },
    'onReadConfirm': function(func) {
        this._events.push(MochiKit.Signal.connect(this._chatCommunicator, 'message', 
            function (message, mId, pId) {
                var txt = message.text;
                if (txt.length > 1 && txt.charAt(0) === MSG_READ_CONFIRM) {
                    var mIdRead = txt.substring(1, txt.indexOf(' ', 1)) | 0;
                    func(pId, mIdRead);
                }
            }));
    },
    'sendRead': function(mId, done) {
        this._send({text: MSG_READ_CONFIRM + mId + ' ', files: []}, done);
    },
    'onResume': function(func) {
        this._events.push(MochiKit.Signal.connect(this, 'resume', func));
    },
    'onInvalidSignature': function (func) {
        var _this = this;
        this._events.push(MochiKit.Signal.connect(this._chatCommunicator, 'signatureInvalid', 
        function (mId, pId) {
            if (_this._reportedInvalidSignatures[pId]) {
                return;
            }
            debugger;
            _this._reportedInvalidSignatures[pId] = 1;
            func(mId, pId);
        }));
    },
    'onValidSignature': function (func) {
        var _this = this;
        this._events.push(MochiKit.Signal.connect(this._chatCommunicator, 'message', 
        function (msg, mId, pId) {
            if (!_this._reportedValidSignatures || _this._reportedValidSignatures[pId] || pId == _this.getPId()) {
                return;
            }
            _this._reportedValidSignatures[pId] = 1;
            func(mId, pId);
        }));
    },
    'getNiks': function () {
        return this._chatCommunicator && this._chatCommunicator.getNiks();
    },
    'getPId': function () {
        return this._chatCommunicator && this._chatCommunicator.getPId();
    },
    'getAdminPId': function () {
        for (var i = 0; i < 10000; i++){
            if (this._chattingPids[i]) {
                return i;
            }
        }
    },
    'isAdmin': function () {
        return this._chatCommunicator && this.getAdminPId() === this._chatCommunicator.getPId();
    },
    'setPassword': function(password) {
        if (!this._chatCommunicator) {
            return false;
        }
        this._reportedInvalidSignatures = {};
        this._reportedValidSignatures = {};
        this._chatCommunicator.setPassword(password);
    },
    'isActived': function () {
        return this._activated;
    },
    'isStopped': function () {
        return !this._activated;
    },
    'setActiveStatus': function () {
        this._statusActive = 1;
    },
    'setInactiveStatus': function () {
        this._statusActive = 0;
    },
    'getLastActivities': function () {
        return this._lastActivePids;
    },
    'getChattingPIds': function () {
        return this._chattingPids;
    },
    'getFingerprints': function () {
        var publicKeys = this._chatCommunicator.getPublicKeys();
        var ret = [];
        for (var i = 0; i < publicKeys.length; i++) {
            ret.push(Clipperz.Crypto.SHA.sha256(publicKeys[i].asByteArray().appendBlock(this._chatCommunicator.getChatKey())).toBase64String().split('=')[0]);
        }
        return ret;
    }
});
});

f();