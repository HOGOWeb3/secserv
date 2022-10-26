<?php

$title = 'Message';
$file = '';


function cleanMessage()
{
global $file,$message_dir;
	$handle = fopen($message_dir.$file, 'r+');
	ftruncate($handle, 0);
}

function removeMessage()
{
global $file,$message_dir,$debug;
	if (!$debug){
		unlink($message_dir.$file);
	}
}

include('config.php');
opendir($message_dir);
$file = false;
while (false !== ($entry = readdir())) {
        if (startsWith($entry, $_SERVER['QUERY_STRING'].'.'))
	{
		$file = $entry;
		break;
	}
}
if ($file === false) {
	if ($log) {
		file_put_contents($log, date("Y-m-d H:i:s").' '.$_SERVER['REMOTE_ADDR'].' failed to read '.$_SERVER['QUERY_STRING']."\n", FILE_APPEND);
	}

Header('Location: message.html');
die();
}
include 'header.php';

$content = file_get_contents($message_dir.$file);

if (strlen($content) === 0)
{
?>
<b>Message has been read</b>
<?php
removeMessage();
die();
}
removeMessage();
$letter = unserialize($content);

?>
<script>
window.the_key = window.location.hash.substr(1);
window.emethod = "<?php echo $letter['enc']; ?>";
</script>

<script src='<?php echo $url_refix; ?>MochiKit/Base.js'></script>
<script src='<?php echo $url_refix; ?>MochiKit/MochiKit.js '></script>
<script src='<?php echo $url_refix; ?>MochiKit/DOM.js '></script>
<script src='<?php echo $url_refix; ?>MochiKit/Style.js '></script>
<script src='<?php echo $url_refix; ?>MochiKit/Signal.js '></script>
<script src='<?php echo $url_refix; ?>MochiKit/Logging.js '></script>

<script src='<?php echo $url_refix; ?>Clipperz/ByteArray.js'></script>
<script src='<?php echo $url_refix; ?>Clipperz/Crypto/SHA.js'></script>
<script src='<?php echo $url_refix; ?>Clipperz/Crypto/AES.js'></script>
<script src='<?php echo $url_refix; ?>Clipperz/Crypto/PRNG.js'></script>
<script src='/bootstrap-3.0.0/assets/js/jquery-1.10.2.js'></script>

<input type='hidden' id='encData' value='<?php echo $letter["message"];?>'/>
Enter your passphrase here<span id='spnDecrypt2'> and "Press to Decrypt"</span>: <br /><input type='password' id='password' value=''  style='width:680px'/><br />
<button id='btnDecrypt' onmousedown='goDecrypt()' style='margin-top:20px'>Press to Decrypt</button>
<br />
<span style='color:red'>This message can be read 1 time only!</span>
<br />
<br />
<div id='divFullUrl' style='display:none'>
Paste your Vernam URL here<span id='spnDecrypt1'> and press "Decrypt"</span>: <br />
<input type='text' id='inputFullUrl' style='width:680px' />
</div>
<div id='divFiles2Download'>

</div>
<div style='width:1000px'>
<div style='float:left'>Read your message:<br /></div>
<div style='clear:both'></div>
<textarea id='message' cols='80' rows='25'>Decrypting message..</textarea>
<br />
</div>

<script src='<?php echo $url_refix; ?>js3.js'></script>
<script src='<?php echo $url_refix; ?>sha512.js'></script>
<script src="<?php echo $url_refix; ?>tripledes.js"></script>
<script>
var oldPass, oldFullUrl;

function goDecrypt() {
try
{
document.getElementById('message').value = '';

var lines = '';
//for (var ii = 0; ii < 2; ii++) { //TODO: debug on Opera Mobile. this is workaround. Because of some reason, Opera Mobile throws an exception for the first time when password is entered.
try
{
/*	lines = getMessage2(document.getElementById('encData').value, window.the_key);
	lines = getMessage2(document.getElementById('encData').value, window.the_key); //Opera Mobile issue
	if (!lines.length) 
	{
		lines = getMessage(document.getElementById('encData').value, window.the_key);
	}
	//if (lines && lines.length) {break;}*/
	var message = getMessage3($('#encData').val(), decodeURIComponent($('#inputFullUrl').val().split('#')[1] || window.the_key).split('-').join('+').split('_').join('/'), window.emethod);
	var $files = $('#divFiles2Download');
	$files.empty();
	var $table = $('<table/>');

	$files.append($table);

	for (var i = 0; i < message.files.length; i++) {
		var content = message.files[i].content, name = message.files[i].name;
		if (name.length > 80) name = name.substr(0, 50) + '...' + name.substr(name.length - 20);
		var $tr = $('<tr/>'), $td = $('<td/>');
		$table.append($tr);

                $td.append($('<span/>').text(name));
		$tr.append($td);

		$td = $('<td/>');
                $td.append($('<span/>').text(formatFileSize(content.length())));
		$tr.append($td);

		$td = $('<td/>');
                $td.append(
			$('<a/>')
			.attr('href', 'data:application/octet-stream;base64,' + content.toBase64String())
			.attr('download', name)
			.attr('_target', '_blank')
			.text('download')
		);
		$tr.append($td);
		
	}
	
}catch(E)
{
debugger;
	lines = E;
}
//}
document.getElementById('message').value = message.text || lines;

try
{
history.replaceState(null, 'Message', 'message.html');
}catch(E){ window.location.hash = '#read'; }
}
catch(E) {
alert(E.message);
}

return 1;
}

window.mobilecheck = function() {
var check = false;
(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
return check; 
}

if (!window.mobilecheck() && document.getElementById('encData').value.length < 10000){
	document.getElementById('btnDecrypt').style.display = 'none';
	document.getElementById('spnDecrypt1').style.display = 'none';
	document.getElementById('spnDecrypt2').style.display = 'none';

	setInterval(function() {

	var pass = document.getElementById('password').value, fullUrl = $('#inputFullUrl').val();
	if (oldPass == pass && oldFullUrl == fullUrl) return;
	oldFullUrl = fullUrl;
	if (goDecrypt()) oldPass = pass;

	}, 1000);
} else {
	goDecrypt();
}
</script>
</body>
</html>
