<?php

/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/*This file is supposed to be included and not to be used to directly serve 
http request */

//to allow cors from local files

function sendCorsHeaders() {
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
}

// Access-Control headers are received during OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {

    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");         

    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");

    exit(0);
}
}

function isIsAllowebClient()
{
	global $allow_from_everyone, $allow_from_fakesite, $allow_from_ip, $readurl_refix, $chaturl_refix;

	if ($allow_from_everyone) {
		return true;
	}

	if ($allow_from_fakesite) {
		$ref = $_SERVER['HTTP_REFERER'];
		if (startsWith($ref, $readurl_refix) || (startsWith($ref, $chaturl_refix))) {
			return true;
		}
	}

	if ($allow_from_ip) {
		$addr = $_SERVER['REMOTE_ADDR'];
		if (preg_match($allow_from_ip, $addr)) {
			return true;
		}
	}
	return false;
}

function dieIfDisallowed()
{
	global $disallowedRedirect;
	if (isIsAllowebClient()) {
		return;
	}
        logIt('disallowed request ');
	if ($disallowedRedirect){
		header("Location: ".$disallowedRedirect);
	} else {
	?>
	<h1>403 Forbidden</h1>
	<?php
	}
	die();
}

function logIt($message) {
    global $log;
    if ($log) {
        file_put_contents($log, date("Y-m-d H:i:s").' '.$_SERVER['REMOTE_ADDR'].' '.str_replace(' ', '_', $message).' '.$_SERVER['QUERY_STRING']."\n", FILE_APPEND);
    }
}

function logAndDie($logMessage, $errorOut) {
    logIt($logMessage);
    if ($errorOut) {
        echo '{"error": "'.str_replace('"', "'", $errorOut).'"}';
    }
    die();
}

function startsWith($haystack, $needle)
{
    return !strncmp($haystack, $needle, strlen($needle));
}
