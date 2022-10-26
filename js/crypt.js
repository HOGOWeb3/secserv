/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var myEncryption = {
  v: {
      encrypt: function (text, key) {
        var ret = new Clipperz.ByteArray();

        for (var i = 0; i < text.length(); i++) {
            ret.appendByte(key.byteAtIndex(i) ^ text.byteAtIndex(i));
        }
        return ret;
    },
    decrypt: function (message, key) {
        var ret = new Clipperz.ByteArray();

        for (var i = 0; i < message.length(); i++) {
            ret.appendByte(message.byteAtIndex(i) ^ key.byteAtIndex(i));
        }

        return ret;
    },
    keyLength: function(message) {
        return message.length();
    },
    getEncryptedMessageSize: function(unencryptesSize) {
        return unencryptesSize;
    },
    maxHalfMessageSize: 200*1024,
    minHalfMessageSize: 40,
    allowEmptyKey: 0
  },
  aes: {
    encrypt: function(text, key) {
        key = key.split(0, 32);
        var crypt = Clipperz.Crypto.AES.encrypt(key, myCrypt.prependRandom(text), myCrypt.getRandomBytes(16));
        return crypt;
    },
    decrypt: function (encData, key) {
        key = key.split(0, 32);
        var ptext = Clipperz.Crypto.AES.decrypt(key, encData).split(prepend_random_size);
        return ptext;
    },
    keyLength: function() {
        return 33; //33 bytes for auto-alligned base64 strings in urls.
    },
    getEncryptedMessageSize: function(unencryptesSize) {
        return (((unencryptesSize+31) / 32) | 0) * 32;
    },
    maxHalfMessageSize: max_half_message_size,
    minHalfMessageSize: 1024,
    allowEmptyKey: 1
  }
};

var myCrypt = (function(){
    var fortunaRandom = new Clipperz.Crypto.PRNG.Fortuna({numberOfEntropyAccumulators:1, firstPoolReseedLevel: 32});
    fortunaRandom.addRandomnessSource(new Clipperz.Crypto.PRNG.TimeRandomnessSource({intervalTime:111}));
    fortunaRandom.addRandomnessSource(new Clipperz.Crypto.PRNG.MouseRandomnessSource());
    fortunaRandom.addRandomnessSource(new Clipperz.Crypto.PRNG.KeyboardRandomnessSource());

    return {
        encryptMessage: function (message, password, emethod, useRandomKey, message2, password2) {
        var key  = [], keylen = myEncryption[emethod].keyLength(message);

        if (useRandomKey) {
            var cRand = fortunaRandom.getRandomBytes(keylen);
            for (var i = 0; i < keylen; i++) {
                var num = Math.floor(Math.random()*256) ^ cRand.byteAtIndex(i);
                key.push(num);
            }
        } else {
            for (var i = 0; i < keylen; i++) {
                key.push(0);
            }
        }

        key = new Clipperz.ByteArray(key);

        return {
            message: myEncryption[emethod].encrypt(message, myCrypt.modifyKey(key, password)).toBase64String(), 
            key: useRandomKey ? key.toBase64String().split('=')[0].split('/').join('_') : null
        };
    },
        onReseed: function(func) {
            return MochiKit.Signal.connect(fortunaRandom, 'reseeded', this, function () {
                func(fortunaRandom.key());
            });
        },
        offReseed: function (handler) {
            MochiKit.Signal.disconnect(handler);
        },
        getRandomBytes: function (count) {
            return fortunaRandom.getRandomBytes(count);
        },
        getRandomNonZeroBytes: function (count) {
            var ret = fortunaRandom.getRandomBytes(count);
            for (var i = 0; i < ret.length(); i++) {
                if (!ret.byteAtIndex(i)) {
                    var newVal;
                    while (!(newVal = fortunaRandom.getRandomBytes(1).byteAtIndex(0)));
                    ret.setByteAtIndex(newVal, i);
                }
            }
            return ret;
        },
        isRandomReady: function() {
            return fortunaRandom.isReadyToGenerateRandomValues();
        },
        prependRandom: function (inBA) {
            return myCrypt.getRandomBytes(prepend_random_size).appendBlock(inBA);
        },
        generateG: function(p, length) {
            return new Clipperz.Crypto.BigInt(myCrypt.getRandomBytes(length));
        },
        modifyKey: function(key, password) {
            if (!password) {
                return key;
            }
            if (typeof password === 'string') {
                password = util.toUtf8ByteArray(password);
            }
            if (!password.length()){
                return key;
            }
            var newKey = new Clipperz.ByteArray(), i, blocks = key.length()/ 32, block;

            for (i = 0; i < blocks; i++){
                block = new Clipperz.ByteArray().appendBytes(key._value.slice(i*32, (i + 1)*32)).appendBlock(password);
                block = Clipperz.Crypto.SHA.sha256(block);
                newKey.appendBlock(block);
            }
            if (blocks*32 < key.length()) {
                block = new Clipperz.ByteArray().appendBytes(key._value.slice(blocks*32)).appendBlock(password);
                block = Clipperz.Crypto.SHA.sha256(block);
                newKey.appendBlock(block);
            }

            return new Clipperz.ByteArray().appendBytes(newKey._value.slice(0, key.length()));
        },
        getRandomF: function () { /*16 M values interval [0,1)*/
            var r = myCrypt.getRandomBytes(3)._value;
            return (r[0] + (r[1] << 8) + (r[2] << 16)) / (1<<24);
        },
        getRandomPrime: function(size) {
            return Clipperz.Crypto.BigInt.randomPrime(size * 8);
        }
    };
})();