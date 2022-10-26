/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


var ChatCommunicator = function () {
    this._statusActive = 1;
    return this;
};

(function() {
    function ajaxCreateChat(chat, done) {
        ajax.chatCreate(chat)
        .success(function(res) {
            if (res.error) {
                done(res.error);
                return;
            }

            if (!res.chatId || !res.adminKey) {
                debugger;
                done('Invalid server response');
                return;
            }
            chat.chatId = res.chatId;
            chat.adminKey = res.adminKey;
            chat.urlBase = res.urlBase;
            done();
        })
        .error(function(res) {
            debugger;
            done(res.responseText);
        });
    }

    function generateChatData(niks, timeout, startTimeout) {
        var ret = {};
        ret.chatKey = myCrypt.getRandomBytes(33);
        var pCnt = niks.length;
        ret.cryptedNiks = [];
        ret.niks = niks;
        ret.dhP = myCrypt.getRandomPrime(dh_key_length);
        ret.dhG = myCrypt.generateG(ret.dhP, dh_key_length);
        
        ret.dhKey = new Clipperz.Crypto.BigInt(myCrypt.getRandomBytes(dh_key_length));
        ret.mId2LocalIds = [];
        ret.privateKey = new Clipperz.Crypto.BigInt(myCrypt.getRandomBytes(dh_key_length))
        ret.publicKey = ret.dhG.powerModule(ret.privateKey, ret.dhP);
        
        for (var i = 0; i < pCnt; i++) {
            var nikBA = util.toUtf8ByteArray(niks[i] || "");
            if (nikBA.length() > 32) {
                nikBA = nikBA.split(0, 32);
            }
            var pGuid = new Clipperz.ByteArray();
            pGuid.appendWord(i);
            pGuid.appendBlock(ret.chatKey);

            pGuid = Clipperz.Crypto.SHA.sha256(pGuid);
            nikBA = nikBA.xorMergeWithBlock(pGuid, 'left');
            ret.cryptedNiks.push(nikBA);
        }
        ret.timeout = timeout;
        ret.startTimeout = startTimeout;

        return ret;
    }
    
    function decryptChatNiks(cryptedNiks, chatKey) {
        var ret = [];

        for (var i = 0; i < cryptedNiks.length; i++) {
            if (typeof cryptedNiks[i] === 'string') {
                cryptedNiks[i] = new Clipperz.ByteArray().appendBase64String(cryptedNiks[i]);
            }
            var pGuid = new Clipperz.ByteArray();
            pGuid.appendWord(i);
            pGuid.appendBlock(chatKey);
            pGuid = Clipperz.Crypto.SHA.sha256(pGuid);

            ret.push(util.fromUtf8ByteArray(cryptedNiks[i].xorMergeWithBlock(pGuid, 'left')).split('\0').join(''));
        }
        return ret;
    }

    function processParticipantChatDataResponse(res) {
        var cn = res.niks;
        this.chatData.timeout = res.timeout|0;
        this.chatData.dhP = new Clipperz.Crypto.BigInt(new Clipperz.ByteArray().appendBase64String(res.dhP));
        this.chatData.partialKeys = [];
        var niksCount = 0;

        for (var i in cn) {
            var i1 = i|0;
            if (i1 >= niksCount && cn.hasOwnProperty(i)) {
                niksCount = i1 + 1;
            }
        }
        
        this.chatData.cryptedNiks = [];
        this.chatData.pId = res.pId;

        this.chatData.dhG = new Clipperz.Crypto.BigInt(new Clipperz.ByteArray().appendBase64String(res.dhG));

        if (!this.chatData.publicKey) {
            this.chatData.publicKey = this.chatData.dhG
                    .powerModule(this.chatData.privateKey, this.chatData.dhP);
        }
        
        for (var i = 0; i < niksCount; i++) {
            this.chatData.cryptedNiks.push(cn[i]);
        }
        
        if (res.partialKeys[0]) { //not first user
            this.chatData.niks = decryptChatNiks(this.chatData.cryptedNiks, this.chatData.chatKey);

            for (var pId in res.partialKeys) {
                var key = new Clipperz.Crypto.BigInt(new Clipperz.ByteArray().appendBase64String(res.partialKeys[pId]));
                console.log('uping key #' + pId + ' from ' + res.partialKeys[pId] + ' by ' + 
                        this.chatData.dhKey.toString() + ' mod ' + this.chatData.dhP);
                this.chatData.partialKeys[pId] = key.powerModule(this.chatData.dhKey, this.chatData.dhP).asByteArray().toBase64String();
                console.log('result ' + this.chatData.partialKeys[pId]);
            }
            updateKeysAndGo.call(this);
        } else {
            console.log('publishing G ' + this.chatData.dhG.asByteArray().toBase64String());
            publishG.call(this);
            waitForChatActivation.call(this);
        }
        
        
    }

    function updateKeysAndGo() {
        var _this = this;
        ajax.chatUpdateKeys(this.chatData)
        .success(function(res) {        
            if (res.error) {
                chatNetError(_this, res.error);
                return;
            }
            waitForChatActivation.call(_this);
        })
        .error(function(res) {
            debugger;
            var $retry = $('<a href="#" > retry</a>');
            $retry.click(function (ev) {
                ev.preventDefault();
                $retry.remove();
                updateKeysAndGo.call(_this);
            });
            chatNetError(_this, $('<span/>').text(res.responseText || 'Netword error ').append($retry));
        });
    }

    function publishG() {
        setRegisteringMissingKey.call(this, this.chatData.dhG.asByteArray().toBase64String());
    }

    function setRegisteringMissingKey(key, missingPId) {
        if (!key) {
            if (!this.chatData.sharedKey || this.chatData.partialKeys[missingPId|0]) {
                return;
            }
            console.log('uping key #' + this.chatData.pId + ' from ' + this.chatData.partialKeys[this.chatData.pId] + ' by ' + 
                    this.chatData.dhKey.toString() + ' mod ' + this.chatData.dhP + ' (missing)');
            key = new Clipperz.Crypto.BigInt(new Clipperz.ByteArray().appendBase64String(this.chatData.partialKeys[this.chatData.pId]))
                    .powerModule(this.chatData.dhKey, this.chatData.dhP);
            key = key.asByteArray();
            key = key.toBase64String();
            console.log('result ' + key);
        }
        var _this = this;

        ajax.chatSetRegistringKeyPart(this.chatData, missingPId, key)
        .success(function(res) {        
            if (res.error === 'notrequired') {
                return;//everything ok, maybe already filled
            }
            if (res.error) {
                chatNetError(_this, res.error);
                return;
            }
        })
        .error(function(res) {
            debugger;
            var $retry = $('<a href="#" > retry</a>');
            $retry.click(function (ev) {
                ev.preventDefault();
                $retry.remove();
                setRegisteringMissingKey.call(_this, key, missingPId);
            });
            chatNetError(_this, $('<span/>').text(res.responseText || 'Netword error ').append($retry));
        });
    }

    function waitForChatActivation() {
        var _this = this;
        setTimeout(function () {
            if (!_this.chatData) {
                return;
            }
            checkChatStatus.call(_this, function (status) {
               if (!status) {
                   waitForChatActivation.call(_this);//some error
                   return;
               }
               if (status >= 5) {
                   //broken or closed
                    chatNetError(_this, 'Chat is ' + {5: 'broken', 6:'closed'}[status]);
                    return;
               }
               if (status === 3) {
                    waitForChatActivation.call(_this);
                    return;
               }
               if (status === 4) {
                    calculateEncryptionKey(_this);
                    newMessagesMonitor.call(_this);
                    MochiKit.Signal.signal(_this, 'activated');
                    return;
               }
               waitForChatActivation.call(_this);
            });
        }, 1000);
    }
    
    function calculateEncryptionKey(client) {
        client.chatData.encryptionKey = myCrypt.modifyKey(new Clipperz.ByteArray()
                .appendBlock(client.chatData.sharedKey), 
                    myCrypt.modifyKey(client.chatData.chatKey, util.toUtf8ByteArray(client.chatData.password||"")));
    }
    
    function checkChatStatus(done) {
        var _this = this;
        ajax.chatGetCreationStatus(this.chatData)
        .success(function(res) {        
            if (res.error) {
                chatNetError(_this, res.error);
                done(false);
                return;
            }
            //TODO: remove key manipulation to `done`

            if (res.keys && res.keys[_this.chatData.pId]) {//not self registration
                _this.chatData.partialKeys = res.keys;

                if (res.publicKeys) {
                    _this.chatData.publicKeys = [];
                    for (var i in res.publicKeys) {
                        if (!res.publicKeys.hasOwnProperty(i)) {
                            continue;
                        }
                        var key = new Clipperz.Crypto.BigInt(
                                    new Clipperz.ByteArray()
                                    .appendBase64String(res.publicKeys[i])
                                );
                        if (i == _this.chatData.pId && key.asString() != _this.chatData.publicKey.asString()) {
                            debugger;
                            console.log('Our public key on server is not valid!');
                        }
                        _this.chatData.publicKeys.push(key);
                    }
                }
                
                calculateSharedKey.call(_this);
                refreshParticipants.call(_this);
            }

            if ((res.status|0) === 3) {
                 setRegisteringMissingKey.call(_this, null, res.registeringPId);
             }

            done(res.status | 0);
        })
        .error(function(res) {
            debugger;
            chatNetError(_this, res.responseText || 'Netword error ');
            done(false);
        });
    }

    function calculateSharedKey() {
        if (this.chatData.sharedKeySelfPart === this.chatData.partialKeys[this.chatData.pId])
            return;

        var oldKey = this.chatData.sharedKey;
        this.chatData.sharedKey = new Clipperz.Crypto.BigInt(
                new Clipperz.ByteArray()
                    .appendBase64String(this.chatData.partialKeys[this.chatData.pId]))
                    .powerModule(this.chatData.dhKey, this.chatData.dhP)
                    .asByteArray();
        this.chatData.sharedKey = this.chatData.sharedKey.split(0, myEncryption['aes'].keyLength());

        this.chatData.sharedKeySelfPart = this.chatData.partialKeys[this.chatData.pId];
        if (!oldKey || (oldKey.toBase64String() !== this.chatData.sharedKey.toBase64String())) {
            console.log('calculated shared key ' + this.chatData.sharedKey.toBase64String() + ' as uping ' +
                this.chatData.partialKeys[this.chatData.pId] + ' by ' + this.chatData.dhKey + ' mod ' + this.chatData.dhP);
        }
    }

    function refreshParticipants() {
        if (!this.reportedParticipants) {
            this.reportedParticipants = {};
        }
        for (var pId in this.chatData.partialKeys) {
            if (this.reportedParticipants[pId]){
                continue;
            }
            this.reportedParticipants[pId] = 1;

            MochiKit.Signal.signal(this, 'joined', pId);
        }
    }

    function newMessagesMonitor() {
        var _this = this;
        if (!this.chatData) {
            return;
        }

        ajax.chatGetNewMessage(_this.chatData)
        .success(function(res) {
            if (res.error === 'nomessages') {
                setTimeout(function() {
                    newMessagesMonitor.call(_this);
                }, _this._statusActive ? 2000 : 10000);
                return;
            }
            if (res.error) {
                chatNetError(_this, res.error);
                setTimeout(function() {
                    newMessagesMonitor.call(_this);
                }, 10000);
                return;
            }
            if (!res.mId) {
                chatNetError(_this, 'Error: checking new messages returned empty message Id');
                return;
            }

            if (de_bug) {
                //$('#divDebug').append($('<div/>').text('Got message ' + res.mId + ' prev ' + currentChat.lastMId));
            }

            var message = myEncryption['aes'].decrypt(new Clipperz.ByteArray().appendBase64String(res.message), _this.chatData.encryptionKey);
            if (!_this.chatData.mId2LocalIds[res.mId]) {
                _this.chatData.mId2LocalIds[res.mId] = myCrypt.getRandomBytes(9).toBase64String();
            }
            _this.chatData.lastMId = res.mId;

            if (!checkSignature(message, 
                                _this.chatData.publicKeys[res.pId], 
                                _this.chatData.privateKey, 
                                _this.chatData.dhP, 
                                res.pId, 
                                _this.chatData.niks.length,
                                _this.chatData.pId)) {
                
                MochiKit.Signal.signal(_this, 'signatureInvalid', res.mId|0, res.pId|0);
            } else {
                message = messageCoder.decodeSingle(message.split(0, message.length() - _this.chatData.niks.length*32));
                MochiKit.Signal.signal(_this, 'message', message, res.mId|0, res.pId|0);
            }
            if (!_this.chatData) {
                return;
            }
            setTimeout(function() {
                    newMessagesMonitor.call(_this);
                }, res.more? 1: _this._statusActive ? 100 : 2000);
        })
        .error(function(res) {
            debugger;
            chatNetError(_this, res.responseText);
                setTimeout(function() {
                    newMessagesMonitor.call(_this);
                }, 5000);
        });
    }

    function chatNetError(com, el) {
        MochiKit.Signal.signal(com, 'netError', el);
    }
    
    function signMessage(message, publicKeys, privateKey, p, currPId) {
        //return message;

        var hash = Clipperz.Crypto.SHA.sha256(message);
        for (var i = 0; publicKeys[i]; i++) {
            if (currPId == i) {
                message.appendBlock(hash);
                continue;
            }
            var sharedKey = publicKeys[i].powerModule(privateKey, p).asByteArray();
            var sign = Clipperz.Crypto.SHA.sha256(new Clipperz.ByteArray()
                                                  .appendBlock(hash)
                                                  .appendBlock(sharedKey));
            message.appendBlock(sign);
        }
        return message;
    }
    
    function checkSignature(message, publicKey, privateKey, p, pId, nikCount, currPId) {
        if (pId == currPId) return true;
    
        var ind = message.length() - (nikCount - currPId)*32;
        var signed = message.split(ind, ind + 32);
        var hash = Clipperz.Crypto.SHA.sha256(message.split(0, message.length() - nikCount*32));

        var sharedKey = publicKey.powerModule(privateKey, p).asByteArray();
        var sign = Clipperz.Crypto.SHA.sha256(new Clipperz.ByteArray()
                                              .appendBlock(hash)
                                              .appendBlock(sharedKey));
        return sign.compare(signed) === 0;
    }
    
    ChatCommunicator.prototype = MochiKit.Base.update(null, {
        'setChatData': function (newChatData) {
            this.chatData = newChatData;
            this.reportedParticipants = {};
            if (!newChatData.mId2LocalIds) {
                newChatData.mId2LocalIds = [];
            }
        },
        'startExisting': function (done) {
            var _this = this;
            if (!_this.chatData) {//avoid continuing on closed chat
                return ;
            }
            _this.chatData.dhKey = _this.chatData.dhKey || new Clipperz.Crypto.BigInt(myCrypt.getRandomBytes(dh_key_length));
            if (!_this.chatData.privateKey) { //For admin, we need to generate it earlier
                _this.chatData.privateKey = new Clipperz.Crypto.BigInt(myCrypt.getRandomBytes(dh_key_length))
            }
            
            ajax.chatRegisterParticipant(this.chatData)
            .success(function(res) {
                if (res.error === 'wait') {
                    //writeChat('Waiting for registration of participant');
                    setTimeout(function () {
                        _this.startExisting(done);
                    }, 1000);
                    return;
                }

                if (res.error) {
                    done(res.error);
                    return;
                }
                processParticipantChatDataResponse.call(_this, res);
                done();
            })
            .error(function(res) {
                debugger;
                var $retry = jQuery('<a href="#" > retry</a>');
                $retry.click(function (ev) {
                    ev.preventDefault();
                    $retry.remove();
                    _this.startExisting.call(_this, done);
                });
                done($('<span/>').text(res.responseText || 'Netword error ').append($retry));
            });
        },
        'startNew': function (niks, timeout, startTimeout, done/*(error, urls)*/) {
            var _this = this;
            this.chatData = generateChatData(niks, timeout, startTimeout);
            this.reportedParticipants = {};
            
            ajaxCreateChat(_this.chatData, function (error) {
                if (error) {
                    done(error);
                    return;
                }
                
                var urls = [];

                for (var i = 1; i < _this.chatData.niks.length; i++) {
                    urls[i] = _this.chatData.urlBase + 
                    _this.chatData.chatId + "#"  + 
                    util.byteArray2MyBase64(_this.chatData.chatKey) +
                    util.byteArray2MyBase64(Clipperz.Crypto.SHA.sha256(
                        new Clipperz.ByteArray()
                            .appendWord(i)
                            .appendBase64String(_this.chatData.adminKey)
                            ).split(0, 15));
                }
                _this.chatData.pId = 0;
                _this.chatData.regSign = util.byteArray2MyBase64(Clipperz.Crypto.SHA.sha256(new Clipperz.ByteArray()
                    .appendWord(_this.chatData.pId)
                    .appendBase64String(_this.chatData.adminKey)
                    ).split(0, 15));
                _this.startExisting(function (error2) {
                    done(error2, error2 ? null : urls);
                });
            });
        },
        'send': function (message, done) {
            if (!done) {
                done = function(){};
            }
            var _this = this;
            var localId = myCrypt.getRandomBytes(9).toBase64String();
            var sync = message.sync;
            message = messageCoder.encodeSingle(message);

            message = signMessage(message, 
                                  this.chatData.publicKeys, 
                                  this.chatData.privateKey, 
                                  this.chatData.dhP,
                                  this.chatData.pId);
            
            message = myEncryption['aes'].encrypt(message, this.chatData.encryptionKey);

            message = message.toBase64String();
            ajax.chatPostMessage(this.chatData, {
                crypted: message, 
                localId: localId,
                sync: sync
            })
            .success(function(res) {
                if (res.error) {
                    chatNetError(_this, res.error);
                    done(false);
                    return;
                }

                if (!res.mId) {
                    chatNetError(_this, 'Server did not return message id');
                    done(false);
                    return;
                }

                _this.chatData ? _this.chatData.mId2LocalIds[res.mId] = localId : 0;
                if (de_bug) {
                    //$('#divDebug').append($('<div/>').text('Sent message ' + res.mId));
                }
                done(true);
            })
            .error(function(res) {
                debugger;
                chatNetError(_this, res.responseText);
                done(false);
            });
        },
        'stop': function () {
            this.chatData = null;
        },
        'getNiks': function() {
            return (this.chatData||{}).niks;
        },
        'getPId': function() {
            return (this.chatData||{}).pId;
        },
        'setReceiverIds': function (rids) {
            this._receiverIds = rids;
        },
        'isAdmin': function () {
            return this.chatData.pId === 0;
        },
        'replaceSharedKey': function (key) {
            console.log('New shared key ' + key.toBase64String());
            this.chatData.sharedKey = key;
            calculateEncryptionKey(this);
        },
        'setPassword': function (password) {
            this.chatData.password = password;
            calculateEncryptionKey(this);
        },
        'getPublicKeys': function() {
            return this.chatData.publicKeys;
        }, 
        'getPrivateKey': function () {
            return this.chatData.privateKey;
        },
        'getP': function () {
            return this.chatData.dhP;
        },
        'getTimeout': function () {
            return this.chatData.timeout;
        },
        'setActiveStatus': function () {
            this._statusActive = 1;
        },
        'setInactiveStatus': function () {
            this._statusActive = 0;
        },
        'getChatKey': function () {
            return this.chatData.chatKey;
        }
    });
})();