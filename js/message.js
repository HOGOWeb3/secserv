/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


var messageCoder = 
        (function () {

return {
    'encodeSingle': function (message) {
        var ret = [], sizesPos = {};
        function writeText(text) {
            var c = text.length;
            for (var i=0; i < c; i++) {
                var ch = text.charCodeAt(i);
                ch ? Clipperz.ByteArray.pushUtf8BytesOfUnicodeChar(ret, ch):0;
            }
            ret.push(0);
        }
        
        function writeArrayBlock(ba) {
            var ar = ba._value;
            sizesPos[ret.length] = ar.length;
            ret.push(0);
            ret.push(0);
            ret.push(0);
            ret.push(0);
            for (var i = 0; i < ar.length; i++) {
                ret.push(ar[i]);
            }
        }
        
        function setSizes() {
            for (var i1 in sizesPos) {
                if (!sizesPos.hasOwnProperty(i1)) {
                    continue;
                }
                var i = i1|0;
                var l = sizesPos[i];
                var maxTurns = ((0x100000000 - l) / (ret.length - i)) | 0;
                var r = myCrypt.getRandomBytes(3)._value;
                r = r[0] + (r[1] << 8) + (r[2] << 16);

                l += (((maxTurns * r) / (1<<24)) | 0) * (ret.length - i);

                ret[i] = l & 255;
                ret[i+1] = (l >> 8) & 255;
                ret[i+2] = (l >> 16) & 255;
                ret[i+3] = (l >> 24) & 255;
            }
        }
        writeText(message.text);

        for (var i = 0; i < message.files.length; i++)
        {
            var f = message.files[i];
            var fname = writeText(f.file.name);
            var mt = jQuery.inArray(f.file.type, mediaTypes);
            console.log("attached file type " + f.file.type + " found at index " + mt);
            
            ret.push(mt < 0 ? 0: mt);
            writeArrayBlock(f.arr);
        }
        setSizes();
        return new Clipperz.ByteArray(ret);
    },
    'decodeSingle': function (message) {
        var pos = 0, ar = message._value;
        
        function fromUtf8ZByteArray() {
        var result= "";
        var c=0, c1=0, c2=0, c3=0, c4=0, c5=0, c6=0;

         while( pos < ar.length ) {
             c = ar[pos] & 0xff;

             if( c < 128 ) {
                 pos++;
                 if (!c) return result;
                 result += String.fromCharCode(c);
             }
             else if(c < 224) {
                 if( pos + 1 >= ar.length ) {
                     pos = ar.length;
                     return result;//throw "UTF-8 incorrect";
                 }
                 c2= ar[pos+1] & 0xff;
                 result+= String.fromCharCode( ((c&31)<<6) | (c2&63) );
                 pos+=2;
             }
             else if(c < 240) {
                 if( pos+2 >= ar.length) {
                     pos = ar.length;
                     return result;//throw "UTF-8 incorrect(2)";
                 }
                 c2= ar[pos+1]&0xff;
                 c3= ar[pos+2]&0xff;
                 result += String.fromCharCode( ((c&15)<<12) | ((c2&63)<<6) | (c3&63) );
                 pos += 3;
             }
             else if(c < 248) {
                 if( pos+3 >= ar.length) {
                     pos = ar.length;
                     return result;//throw "UTF-8 incorrect(3)";
                 }
                 c2= ar[pos+1]&0xff;
                 c3= ar[pos+2]&0xff;
                 c4= ar[pos+3]&0xff;
                 result += String.fromCharCode( ((c&7)<<18) | ((c2&63)<<12) | ((c3&63)<<6) | (c4&63) );
                 pos += 4;
             }
             else if(c < 252) {
                 if( pos+4 >= ar.length) {
                     pos = ar.length;
                     return result;//throw "UTF-8 incorrect(4)";
                 }
                 c2= ar[pos+1]&0xff;
                 c3= ar[pos+2]&0xff;
                 c4= ar[pos+3]&0xff;
                 c5= ar[pos+4]&0xff;
                 result += String.fromCharCode( ((c&3)<<24) | ((c2&63)<<18) | ((c3&63)<<12) | ((c4&63)<<6) | (c5&63) );
                 pos += 5;
             }
             else {
                 if( pos+5 >= ar.length) {
                     pos = ar.length;
                     return result;//throw "UTF-8 incorrect(5)";
                 }
                 c2= ar[pos+1]&0xff;
                 c3= ar[pos+2]&0xff;
                 c4= ar[pos+3]&0xff;
                 c5= ar[pos+4]&0xff;
                 c6= ar[pos+5]&0xff;
                 result += String.fromCharCode( ((c&1)<<30) | ((c2&63)<<24) | ((c3&63)<<18) | ((c4&63)<<12) | ((c5&63)<<6) | (c6&63) );
                 pos += 6;
             }
         }
         return result;
        }
        
        function readArrayBlock() {
            var maxLen = ar.length - pos;
            var len = ar[pos] + (ar[pos+1]<<8) + (ar[pos+2]<<16) + (ar[pos+3]<<24);
            if (!maxLen || !len) {
                return new Clipperz.ByteArray();
            }

            if (len < 0) {
                len += 0x100000000;
            }
            
            len %= maxLen;
            
            return new Clipperz.ByteArray(ar.slice(pos + 4, pos + len + 4));
        }
        var text = fromUtf8ZByteArray();
        ret = {text: text, files: []};

        while (pos < ar.length) {
            var fname = fromUtf8ZByteArray();

            if (pos >= ar.length) {
                break;
            }
            var mt = mediaTypes[ar[pos]] || mediaTypes[0];
            pos++;
            var fcontent = readArrayBlock();
            pos += fcontent.length() + 4;
            
            ret.files.push({name: fname, content: fcontent, type: mt});
        }
        return ret;
    },
    'encryptDouble': function(method, message1, password1, message2, password2, isNoKey) {
        message1 = messageCoder.encodeSingle(message1);
        password1 = password1 ? password1 : "";
        
        if (message2) {
            message2 = messageCoder.encodeSingle(message2);
            password2 = password2 ? password2 : "";
            if (password1 === password2) {
                return false;
            }
            password1 = util.toUtf8ByteArray(password1);
            password2 = util.toUtf8ByteArray(password2);
        } else {
            var r = myCrypt.getRandomF();
            var minSize = message1.length();
            var maxSize = Math.min(r * 1.5, myEncryption[method].maxHalfMessageSize);
            var size = Math.round(minSize + (maxSize - minSize) * r);
            message2 = myCrypt.getRandomBytes(size);
            password1 = util.toUtf8ByteArray(password1);
            password2 = myCrypt.getRandomBytes(32);
        }
        
        if (message1.length() < myEncryption[method].minHalfMessageSize) {
            message1.appendBlock(myCrypt.getRandomNonZeroBytes(myEncryption[method].minHalfMessageSize - message1.length()));
        }
        if (message2.length() < myEncryption[method].minHalfMessageSize) {
            message2.appendBlock(myCrypt.getRandomNonZeroBytes(myEncryption[method].minHalfMessageSize - message2.length()));
        }

        if (Math.max(message2.length(), message1.length()) > myEncryption[method].maxHalfMessageSize) {
            return false;
        }

        var key, keylen = Math.max(myEncryption[method].keyLength(message1), myEncryption[method].keyLength(message2));
        var ekey1, ekey2;
        if (isNoKey) {
            key = new Clipperz.ByteArray();
            for (var i = 0; i < keylen; i++){
                key.appendByte(0);
            }
            ekey1 = myCrypt.modifyKey(key, password1);
            ekey2 = myCrypt.modifyKey(key, password2);
            if ((ekey1._value[0] ^ ekey2._value[0]) & 1 === 0) {
                return false;
            }
        } else
        do {
            key = myCrypt.getRandomBytes(keylen);
            ekey1 = myCrypt.modifyKey(key, password1);
            ekey2 = myCrypt.modifyKey(key, password2);
        } while (((ekey1._value[0] ^ ekey2._value[0]) & 1) === 0);
    
        message1 = myEncryption[method].encrypt(message1, ekey1);
        message2 = myEncryption[method].encrypt(message2, ekey2);
        var ret = new Clipperz.ByteArray();
        if (ekey1._value[0] & 1) {
            var t = message1;
            message1 = message2;
            message2 = t;
        }
        var l = message1.length();
        for (var i = 0; i < 4; i++) {
            ret.appendByte(l & 255);
            l = l >> 8;
        }
        ret.appendBlock(message1);
        ret.appendBlock(message2);
        
        return isNoKey ? {message: ret} : {key: key, message: ret};
    },
    'decryptDouble':function (message, method, key, password) {
        var l = 0;
        for (var i = 3; i >= 0; i--) {
            l *= 256;
            l += message.byteAtIndex(i);
        }
        if (!key) {
            key = new Clipperz.ByteArray();
            var l = myEncryption[method].keyLength(message);
            for (var i = 0; i < l; i++) {
                key.appendByte(0);
            }
        }
        key = myCrypt.modifyKey(key, password);
        message = (key._value[0] & 1) ? message.split(l+4) : message.split(4, l+4);
        var isKeyTooShort = myEncryption[method].keyLength(message) > key.length();
        
        message = myEncryption[method].decrypt(message, key);
        var ret = messageCoder.decodeSingle(message);
        if (isKeyTooShort) ret.isKeyTooShort = 1;
        return ret;
    },
    'areNoKeyPasswordsAcceptable': function (password1, password2) {
        var key = new Clipperz.ByteArray();
        for (var i = 0; i < 32; i++){
            key.appendByte(0);
        }
        var ekey1 = myCrypt.modifyKey(key, password1);
        var ekey2 = myCrypt.modifyKey(key, password2);
        return ((ekey1._value[0] ^ ekey2._value[0]) & 1) === 1;
    },
    'areMessageSizesCompatible': function (message1, message2, method) {
        function msgSize(message) {
            var ret = util.toUtf8ByteArray(message.text).length() + 1;
            for (var i = 0; i < message.files.length; i++) {
                var f = message.files[i].file;
                ret += 6 + util.toUtf8ByteArray(f.name).length() + f.size;
            }
            return ret;
        }
        method = myEncryption[method];
        var _s1 = message1 ? method.getEncryptedMessageSize(msgSize(message1)) : 0, 
            _s2 = message2 ? method.getEncryptedMessageSize(msgSize(message2)) : 0,
            s1 = Math.max(_s1, _s2),
            s2 = Math.min(_s1, _s2);
        
        if (s1 <= 1024 && s2 <= 1024) {
            return true;
        }
        
        return s1 <= s2*2;
    }
};
})();

var mediaTypes = [
  "application/octet-stream",//default
  "application/atom+xml",
  "application/ecmascript",
  "application/EDI-X12",
  "application/EDIFACT",
  "application/json",
  "application/javascript",
  "application/ogg",
  "application/pdf",
  "application/postscript",
  "application/rdf+xml",
  "application/rss+xml",
  "application/soap+xml",
  "application/font-woff",
  "application/xhtml+xml",
  "application/xml",
  "application/xml-dtd",
  "application/xop+xml",
  "application/zip",
  "application/gzip",
  "application/example",
  "application/x-nacl",
  "audio/basic",
  "audio/L24",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/opus",
  "audio/vorbis",
  "audio/vnd.rn-realaudio",
  "audio/vnd.wave",
  "audio/webm",
  "image/gif",
  "image/jpeg",
  "image/pjpeg",
  "image/png",
  "image/svg+xml",
  "message/http",
  "message/imdn+xml",
  "message/rfc822",
  "model/iges",
  "model/mesh",
  "model/vrml",
  "model/x3d+binary",
  "model/x3d+fastinfoset",
  "model/x3d-vrml",
  "model/x3d+xml",
  "text/cmd",
  "text/css",
  "text/csv",
  "text/html", 
  "text/javascript", 
  "text/plain", 
  "text/rtf",
  "text/vcard", 
  "text/vnd.abc",
  "text/xml",
  "video/avi",
  "video/mpeg",
  "video/mp4",
  "video/ogg",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/x-ms-wmv",
  "video/x-flv",
  "application/x-7z-compressed",
  "application/x-chrome-extension",
  "application/x-deb",
  "application/x-dvi",
  "application/x-font-ttf",
  "application/x-javascript",
  "application/x-latex",
  "application/x-mpegURL",
  "application/x-rar-compressed",
  "application/x-shockwave-flash",
  "application/x-stuffit",
  "application/x-tar",
  "application/x-xpinstall",
  "audio/x-aac",
  "audio/x-caf",
  "image/x-xcf",
  "text/x-gwt-rpc",
  "text/x-jquery-tmpl",
  "application/x-pkcs12"
];
