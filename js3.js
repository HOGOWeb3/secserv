if (typeof console == "undefined")
    console = {};
if (!console.log)
    console.log = function () { };


function vernamEncrypt(text, key)
{
	var ret = new Clipperz.ByteArray();

	for (var i = 0; i < text.length(); i++) {
		ret.appendByte((key.byteAtIndex(i) + text.byteAtIndex(i)) & 0xff);
	}
	return ret;
}

function vernamDecrypt(message, key)
{
	var ret = new Clipperz.ByteArray();

	for (var i = 0; i < message.length(); i++) {
		ret.appendByte((message.byteAtIndex(i) - key.byteAtIndex(i) + 256) & 0xff);
	}

	return ret;
}

function modifyKey(key, password)
{
	if (!password) return key;

	var newKey = '';
	for (var i = 0; i < key.length/ 64; i++){
		newKey += rstr_sha512(key.substr(i * 64, 64) + password);
	}
	newKey += rstr_sha512(key.substr(i * 64) + password);

	for (var i = 0; i < key.length; i++) {
		newKey += String.fromCharCode((key.charCodeAt(i) + password.charCodeAt(i % password.length)) % 255);
	}

	return newKey.substr(0, key.length);
}

function showChecksum(ar) {
	var sum = 0;
	for (var i = 0; i < ar.length(); i++) {
		sum += ar.byteAtIndex(i)*i;
	}
	alert(ar.length() + '/' + (sum % 1024));
}

function modifyKey3(key, password)
{
	if (!password) return key;
	password = toUtf8ByteArray(password);

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
}

function desEncrypt(text, key)
{
	return CryptoJS.TripleDES.encrypt(text, key).toString();
}

function desDecrypt(encData, key)
{
	var msg = CryptoJS.TripleDES.decrypt(encData, key);
	return (msg.sigBytes > 0) ? msg.toString(CryptoJS.enc.Utf8) : '';
	
}

function aesEncrypt(text, key)
{
//	console.log('encrypting');
	var crypt = Clipperz.Crypto.AES.encrypt(key, text, fortunaRandom.getRandomBytes(16));
//	console.log('encrypted');

	return crypt;
}

function toUtf8ByteArray(text) {
	var c = text.length;
	var value = new Array();
	for (var i=0; i < c; i++) {
		Clipperz.ByteArray.pushUtf8BytesOfUnicodeChar(value, text.charCodeAt(i));
	}
	return new Clipperz.ByteArray(value);
}

function fromUtf8ByteArray(ar) {
	ar = ar._value;
        var result= "";
        var i= 0;
        var c=0, c1=0, c2=0, c3=0, c4=0, c5=0, c6=0;
                      
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
}

function aesDecrypt(encData, key)
{
	var ptext = Clipperz.Crypto.AES.decrypt(key, encData);
	return ptext;
}

function submitForm(ev)
{
try {
	var form = document.getElementById('theForm'), 
	    encEl= document.getElementById('encData'), 
	    text = document.getElementById('txtMessage').value;

	if (!text.length) {
		alert('Please enter the text');
		return;
	}

	text = toUtf8ByteArray(text); //this must be done here for correct key length in case of vernam
	var message = new Clipperz.ByteArray();

	message.appendWord(text.length());
	message.appendBlock(text);

	for (var i = 0; i < messageFiles.length; i++)
	{
		var fname = toUtf8ByteArray(messageFiles[i].file.name);
		message.appendWord(fname.length());
		message.appendBlock(fname);
		message.appendWord(messageFiles[i].arr.length());
		message.appendBlock(messageFiles[i].arr);
	}

	var key  = [],
	encMsg = '',
	password = document.getElementById('password').value,
	emethod = document.getElementById('emethod').value,
	keylen = {'3d': 32, 'v': message.length(), 'aes': 32}[emethod];

	document.getElementById('writing').style.display = 'none';
	document.getElementById('copyUrl').style.display = 'block';
	document.getElementById('urlContainer').style.display = 'block';

	var cRand = fortunaRandom.getRandomBytes(keylen);

	for (var i = 0; i < keylen; i++) {
		var num = (Math.floor(Math.random()*256) + cRand.byteAtIndex(i)) & 0xff;
		key.push(num);
	}
	key = new Clipperz.ByteArray(key);

	document.getElementById('key').value = key.toBase64String();

	key = modifyKey3(key, password);
	encMsg = {des: desEncrypt, v: vernamEncrypt, aes: aesEncrypt}[emethod](message, key).toBase64String();

	encEl.value = encMsg;

	document.getElementById('url').value = '';
	document.getElementById('txtMessage').value = '';

	form.submit();
} catch (E) {
alert(E);
}
}

function loadedIframe(ev)
{
	var iframe = document.getElementById('ifrcreate'), 
	    iframeDocument = iframe.contentDocument || iframe.contentWindow.document,
	    msgIdEl = iframeDocument.getElementById('msgId'), msgId, 
	    key = document.getElementById('key').value;

	if(!msgIdEl) {
		window.location = 'refused.php'
		return;
	}
	msgId = msgIdEl.value;
	if (!msgId) return;
	
	document.getElementById('url').value = document.getElementById('urlPrefix').value + msgId + '#' + encodeURIComponent(key.split('+').join('-').split('/').join('_').split('=').join(''));
	iframe.src = iframe.getAttribute('data-default-url');

setTimeout(function() {
try
{
window.scrollTo(0, 200);
//window.location.hash = '#create';
}catch(E){
alert(E);
}
}, 1);

setTimeout(function() {
try
{
history.pushState(null, 'Message', 'message-url.html');
}catch(E){ window.location.hash = '#url'; }

}, 10);
}

function getMessage(encData, key)
{
var pass = document.getElementById('password').value;

	encData = Base64.decode(encData);
	key = Base64.decode(key);
	//console.log('getMessage key len: ' + key.length);

	if (key.length == 33) {
		//console.log('decrypting as tripple des');
		//Tripple des

		key = modifyKey(key, pass);

		return Base64._utf8_decode(desDecrypt(encData, key));
	}
	key = modifyKey(key, pass);

	return Base64._utf8_decode(decrypt(encData, key));
}

function getMessage2(encData, key)
{
var pass = document.getElementById('password').value;

	encData = Base64.decode(encData);
	key = Base64.decode(key);
	//console.log('getMessage key len: ' + key.length);

	if (key.length == 33) {
		//console.log('decrypting as tripple des');
		//Tripple des

		key = modifyKey2(key, pass);

		return Base64._utf8_decode(desDecrypt(encData, key));
	}
	key = modifyKey2(key, pass);

	return Base64._utf8_decode(decrypt(encData, key));
}

function readArrayBlock(byteArr, offs) {
	var len = byteArr.byteAtIndex(offs+3) + (byteArr.byteAtIndex(offs+2)<<8) + (byteArr.byteAtIndex(offs+1)<<16) + (byteArr.byteAtIndex(offs)<<24);
	var block = new Clipperz.ByteArray(byteArr._value.slice(offs + 4, offs + len + 4));
	return block;
}

function getMessage3(encDataStr, keyStr, method)
{
	var ret = '';
	if (method == 'v' && ((keyStr.length + 3) < encDataStr.length)) {
	$('#divFullUrl').show();
		ret += 'URL is not valid. \n\
Your  browser does not support long URLs. \n\
Vernam  algorithm require a long key to encrypt long messages. \n\
This require long URLs.\n\
Paste your Vernam URL and press “Decrypt” button if any.\n\
This is partially decrypted message: \n\
';
	}

	var pass = document.getElementById('password').value;

	encData = new Clipperz.ByteArray();

	encData.appendBase64String(encDataStr);

	key = new Clipperz.ByteArray();
	while ((keyStr.length % 4) > 0) keyStr += '=';

	key.appendBase64String(keyStr);
	key = modifyKey3(key, pass);

	var message = {v: vernamDecrypt, aes: aesDecrypt}[method](encData, key);

	if (message.length() < 4) return false;
	var offs = 0;
	
	var text = readArrayBlock(message, offs);
	offs += text.length() + 4;
	text = ret + fromUtf8ByteArray(text);
	ret = {text: text, files: []};

	while (offs < message.length()) {
		var fname = readArrayBlock(message, offs);
		offs += fname.length() + 4;
		fname = fromUtf8ByteArray(fname);

		var fcontent = readArrayBlock(message, offs);
		offs += fcontent.length() + 4;
		ret.files.push({name: fname, content: fcontent});
	}
	return ret;
}

//impose maxlength
window.unloaded = 0;

window.onload = function() { 
  var txts = document.getElementsByTagName('TEXTAREA');

  for(var i = 0, l = txts.length; i < l; i++) {
    if(/^[0-9]+$/.test(txts[i].getAttribute("maxlength"))) { 
      var func = function() { 
        var len = parseInt(this.getAttribute("maxlength"), 10); 

        if(this.value.length > len) { 
          alert('Maximum length exceeded: ' + len); 
          this.value = this.value.substr(0, len); 
          return false; 
        } 
	
      }

      txts[i].onkeyup = func;
      txts[i].onblur = func;
    } 
  } 
setInterval(function () {if (document.getElementById('urlPrefix') && !document.getElementById('urlPrefix').value) {window.location.href = window.location.href;  window.location.reload();}}, 1000);
setTimeout(function (){
window.onpopstate = function () {
	window.location.reload(false);
}}, 100);

}

var messageFiles = [];
	function formatFileSize(num) {
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

	function setFilesUI() {
		var $tbl = $('<table/>');
		
		for (var i = 0; i < messageFiles.length; i++) {
			var $tr = $('<tr/>'), f = messageFiles[i];
			$tr.append($('<td/>').text(f.file.name));
			$tr.append($('<td/>').text(formatFileSize(f.file.size)));
			$tr.append(
				$('<td/>').append(
					$('<a/>').attr('href', '#').text('Remove').data('message-file', f).click(onRemoveFileClick)
						)
				);
			$tbl.append($tr);
			$tr.append($('<td/>').text(f.status == 1 ? 'loading..' : ''));
		}
		$('#divFiles').show().empty().append($tbl);
	}

	function onRemoveFileClick(ev) {
		ev.preventDefault();
		if (!confirm('Remove this file?')) return;
		var mf = $(this).data('message-file');

		for (var i = 0; i < messageFiles.length; i++) {
			if (messageFiles[i] != mf) continue;
			messageFiles.splice(i, 1);
			break;
		}
	setFilesUI();
	}

$(function () {
	$('#fileInput').change(onFileInputChange);
});

function onFileInputChange() {
        	var $input = $(this), fs = this.files;

        	if (!fs) {
			//TODO:Log
            		alert("Your browser does not support reading files");
	        	return;
	        }
		var totalSize = 0;
		for (var i = 0; i < messageFiles.length; i++) {
			totalSize += messageFiles[i].file.size;
		}

		for (var i = 0; i < fs.length; i++) {
			totalSize += fs[i].size;
			if (totalSize > 5*1024*1024) {
				alert('Total file size is over limit');
				break;
			}
			messageFiles.push({state: 1, file: fs[i]});
			var reader = new FileReader();
			reader.onload = (function(file) {
			return function(ev) {
				gotFile(file, ev.target.result);
			};
			})(fs[i]);
			reader.readAsArrayBuffer(fs[i]);
		}
	$('#fileInput').replaceWith($('#fileInput').clone());
	$('#fileInput').change(onFileInputChange);
	setFilesUI();
}

function checkShowFilesWarning() {
// Check for the various File API support.
if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
  $('#divFilesWarning').show().text('Your browser does not support File API.');
  $('#divFilesParent').hide();
  return false;
}
// Check selected encryption algorithm
//Enabled vernam files support
/*if ($('#emethod').val() == 'v') {
  $('#divFilesWarning').show().text('Vernam algorythm is not supported for files!');
  $('#divFilesParent').hide();
  return false;
}*/

$('#divFilesWarning').hide();
$('#divFilesParent').show();
return true;
}

function gotFile(file, data) {
	var u8Arr = new Uint8Array(data);
	var arr = new Clipperz.ByteArray();
	for (var i=0; i < u8Arr.length; i++) { //TODO:make new type to implement same as ByteArray functionally to use less memory
		arr.appendByte(u8Arr[i]);
	}

	for (var i = 0; i < messageFiles.length; i++)
	{
		var mf = messageFiles[i];
		if (mf.file != file) continue;
		mf.state = 2;
		mf.arr = arr;
		break;
	}
	setFilesUI();
}

function emethodCreateChange() {
	checkShowFilesWarning();
}