<?php

if((!isset($_SERVER['HTTPS']) || $_SERVER['HTTPS'] == 'off') && $req_https){
    $redirect = "https://".$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI'];

    header("Location: ".$redirect);
    die();
}

if (strpos($_SERVER['HTTP_USER_AGENT'], 'vkShare') !== false) {
	if ($log) {
		file_put_contents($log, date("Y-m-d H:i:s").' '.$_SERVER['REMOTE_ADDR'].' '.$_SERVER['REQUEST_URI'], FILE_APPEND);
		file_put_contents($log, ' '.$_SERVER['HTTP_USER_AGENT']." rejected \r\n", FILE_APPEND);
	}
	die();
}

header("Cache-Control: no-cache, must-revalidate");

header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
header('Content-Type: text/html; charset=utf-8');

if ($log) {
	file_put_contents($log, date("Y-m-d H:i:s").' '.$_SERVER['REMOTE_ADDR'].' '.$_SERVER['REQUEST_URI'], FILE_APPEND);
}

if ($log) {
	file_put_contents($log, ' '.$_SERVER['HTTP_USER_AGENT'].' '.$_SERVER['HTTP_REFERER']."\r\n", FILE_APPEND);
}

//checking messages to remove

opendir($message_dir);
$now = time();
//echo '<b>'.$now.'</b><br />';

while (false !== ($entry = readdir())) {
	{
		$date = strtotime(str_replace('_', ':', pathinfo($entry, PATHINFO_EXTENSION)));

if (!$date) continue;
//echo '|'.$date.'<br />';
		if ($now > $date) {
//echo 'deleting '.$entry;
if ($log) {
	file_put_contents($log, date("Y-m-d H:i:s").' '.$_SERVER['REMOTE_ADDR'].' deleting '.$entry."\n", FILE_APPEND);
}
unlink($message_dir.$entry);
}
	}
}

?>
<html>
<head>
<title><?php echo $title; ?></title>
<style>
textarea
{
border: solid 10px #fbb;
border-radius:5px;
}

body,span,div,td{
font-size:24px;
background-color:#ffface;
}

input,textarea,select,button{
font-size:20px;
}

a{
color:red;
}

button,input[type=submit]{
padding:15px 35px;
font-size:28px;
}

#url {
border: solid 5px #fbb;
border-radius:3px;
}

a{
white-space:nowrap;
}
</style>
</head>
<body>
<a href="/">Please use our new site</a><br />
<h2>Send and Receive your messages and files encrypted!</h2>
