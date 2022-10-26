/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


var util = { 
    generateDownloadLink: function(content, name) {
        var iOS = /(iPad|iPhone|iPod)/g.test( navigator.userAgent );
        var $a = jQuery('<a/>').text('download ');
        
        //if (iOS || !window.Blob) {
            $a.attr('href', util.generateFileUrl(content, null, iOS)).
              attr('download', name).
              attr('_target', '_blank');
        /*} else {
            $a.attr('href', '#').
                    click(function(ev) {
                        ev.preventDefault();
                saveAs(new Blob([new Uint8Array(content._value)]), name);
            });
        }*/
        return $a;
    },
    createBlob: function(ar, type) {
        if (!window.Blob){
            return null;
        }
        try
        {
            return new Blob([new Uint8Array(ar)], { type: type });
        }
        catch(e){
        // TypeError old chrome and FF
            window.BlobBuilder = window.BlobBuilder || 
                         window.WebKitBlobBuilder || 
                         window.MozBlobBuilder || 
                         window.MSBlobBuilder;
            if(e.name === 'TypeError' && window.BlobBuilder){
                var bb = new BlobBuilder();
                bb.append([ar]);
                return bb.getBlob(type);
            }
            else if(e.name === "InvalidStateError"){
                // InvalidStateError (tested on FF13 WinXP)
                return new Blob( [ar], {type : type});
            }
            else{
                // We're screwed, blob constructor unsupported entirely   
                return null;
            }
        }
    },
    generateFileUrl: function(ar, type, forceDataUri) {
            var blob = forceDataUri ? null : this.createBlob(ar._value, type);
            var URL = window.webkitURL ? webkitURL : window.URL;
            if (blob && URL) {
                var ret = URL.createObjectURL(blob);
                if (!util.createdBlobs) {
                    util.createdBlobs = [];
                }
                util.createdBlobs.push(ret);
                return ret;
            }
        return 'data:' + (type || 'application/octet-stream') + ';base64,' + ar.toBase64String();
    },
    deleteAllBlobs: function() {
        if (util.createdBlobs) {
            jQuery.each(util.createdBlobs, function(ind, url) {
                URL.revokeObjectURL(url);
            });
            delete util.createdBlobs;
        }
    },
    fromUtf8ByteArray: function(ar) {
    ar = ar._value;
    var result= "";
    var i= 0;
    var c=0, c2=0, c3=0, c4=0, c5=0, c6=0;

     while( i < ar.length ) {
         c= ar[i] & 0xff;

         if( c < 128 ) {
             result += String.fromCharCode(c);
             i++;
         }
         else if(c < 224) {
             if( i+1 >= ar.length )
                 return result;//throw "UTF-8 incorrect";
             c2= ar[i+1] & 0xff;
             result+= String.fromCharCode( ((c&31)<<6) | (c2&63) );
             i+=2;
         }
         else if(c < 240) {
             if( i+2 >= ar.length)
                 return result;//throw "UTF-8 incorrect(2)";
             c2= ar[i+1]&0xff;
             c3= ar[i+2]&0xff;
             result += String.fromCharCode( ((c&15)<<12) | ((c2&63)<<6) | (c3&63) );
             i += 3;
         }
         else if(c < 248) {
             if( i+3 >= ar.length)
                 return result;//throw "UTF-8 incorrect(3)";
             c2= ar[i+1]&0xff;
             c3= ar[i+2]&0xff;
             c4= ar[i+3]&0xff;
             result += String.fromCharCode( ((c&7)<<18) | ((c2&63)<<12) | ((c3&63)<<6) | (c4&63) );
             i += 4;
         }
         else if(c < 252) {
             if( i+4 >= ar.length)
                 return result;//throw "UTF-8 incorrect(4)";
             c2= ar[i+1]&0xff;
             c3= ar[i+2]&0xff;
             c4= ar[i+3]&0xff;
             c5= ar[i+4]&0xff;
             result += String.fromCharCode( ((c&3)<<24) | ((c2&63)<<18) | ((c3&63)<<12) | ((c4&63)<<6) | (c5&63) );
             i += 5;
         }
         else {
             if( i+5 >= ar.length)
                 return result;//throw "UTF-8 incorrect(5)";
             c2= ar[i+1]&0xff;
             c3= ar[i+2]&0xff;
             c4= ar[i+3]&0xff;
             c5= ar[i+4]&0xff;
             c6= ar[i+5]&0xff;
             result += String.fromCharCode( ((c&1)<<30) | ((c2&63)<<24) | ((c3&63)<<18) | ((c4&63)<<12) | ((c5&63)<<6) | (c6&63) );
             i += 6;
         }
     }
     return result;
    },
    toUtf8ByteArray: function (text) {
        var c = text.length;
        var value = new Array();
        for (var i=0; i < c; i++) {
            Clipperz.ByteArray.pushUtf8BytesOfUnicodeChar(value, text.charCodeAt(i));
        }
        return new Clipperz.ByteArray(value);
    },
    byteArray2MyBase64: function (ar) {
        return ar.toBase64String().split('/').join('_').split('=')[0];
    },
    myBase642ByteArray: function (str) {
        while (str.length & 3) {
            str += '=';
        }
        return new Clipperz.ByteArray().appendBase64String(str.split('_').join('/'));
    },
    formatFileSize: function (num) {
        if (num < 2048) {
            return num + ' bytes';
        }

        if (num < 2048 * 1024) {
            return (((num + 512)/1024)|0) + ' kb';
        }

        if (num < 2048 * 1024 * 1024) {
            return (((num/1024 + 512)/1024)|0) + ' mb';
        }
    }
};

/* Old browser support */
if (typeof console === "undefined") {
    console = {};
}
if (!console.log) {
    console.log = function () { };
}
/* End old browser support */
