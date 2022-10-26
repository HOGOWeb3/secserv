<?php

/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

include 'config.php';
include 'common.php';
sendCorsHeaders();

$action = filter_input(INPUT_POST, 'action');
switch ($action) {
    case 'createm':
    case 'creates':
	dieIfDisallowed();
            if (file_exists('banned.txt') && strpos(file_get_contents('banned.txt'), "\r\n".$_SERVER['REMOTE_ADDR']."\r\n") !== false) {
                logAndDie('You have been banned', FALSE);
            }
            
            $id = str_replace('=', '', 
                    str_replace('/', '_', 
                      base64_encode(
                        substr(
                            hash('sha256', 
                                openssl_random_pseudo_bytes(32), true), 0, 15)
                            )));
            
            $delKey = str_replace('=', '', 
                    str_replace('/', '_', 
                      base64_encode(
                        substr(
                            hash('sha256', 
                                openssl_random_pseudo_bytes(32), true), 0, 15)
                            )));

            if ($action === 'creates') {
                $id = substr($id, 0, 6);
            }
            $seconds = intval(filter_input(INPUT_POST, 'live'));
            $message = filter_input(INPUT_POST, 'message');
            
            if ($seconds < 1 || $seconds > 31536000 || strlen($message) == 0 || strlen($message) > $max_message)   {
                logAndDie('invalid create request '.strlen($message).'/'.$seconds, FALSE);
            }
            logIt($action.' 2');
            $delOn = date('Y-m-d H_i_s', time() + $seconds);
            $letter = array(
                "enc" => filter_input(INPUT_POST, 'encType'), 
                "message" => $message, 
                "singleRead" => intval(filter_input(INPUT_POST, 'singleRead')),
                "delOn" => time() + $seconds,
                "delKey" => $delKey
                    );
            $file = $message_dir.$id.'.'.$delOn;
            
            if (file_put_contents($file, serialize($letter)) === FALSE) {
                logAndDie('error writing file '.$id, "Error writing the file");
            }

            echo '{"url":"';
            echo $readurl_refix;
            echo $id;
            echo '","del":"';
            echo $delurl_refix;
            echo $id;
            echo '/';
            echo $delKey;
            echo '"}';
            
            logIt('created message '.$id);

        break;
    case 'read':
        $id = filter_input(INPUT_POST, 'id');

        opendir($message_dir);
        $file = false;
        while (false !== ($entry = readdir())) {
            if (startsWith($entry, $id.'.'))
            {
		$file = $entry;
		break;
            }
        }
        if ($file === false) {
            logAndDie('failed to read '.$id, "Message not found or already read");
        }

        $content = file_get_contents($message_dir.$file);

        $letter = unserialize($content);

        if ($letter["delOn"] < time()) {
            deleteMessage($file);
            logAndDie('failed to read '.$id, "Message not found or already read");
        }
        if ($letter["singleRead"] === 1){
            deleteMessage($file);
        }

        echo '{"message":"'.$letter['message'].'", "encType":"'.$letter['enc'].'"}';
        logIt('read message '.$id);
        break;
    case 'del':
        $id = filter_input(INPUT_POST, 'id');
        $delKey = filter_input(INPUT_POST, 'delKey');

        opendir($message_dir);
        $file = false;
        while (false !== ($entry = readdir())) {
            if (startsWith($entry, $id.'.'))
            {
		$file = $entry;
		break;
            }
        }
        if ($file === false) {
            logAndDie('failed to delete', "Message not found or already deleted");
        }

        $content = file_get_contents($message_dir.$file);

        $letter = unserialize($content);
        if ($delKey != $letter["delKey"] || $letter["delOn"] < time()) {
            deleteMessage($file);
            logAndDie('failed to read '.$id, "Message not found or already read");
        }

        if ($letter["singleRead"] === 1){
            logIt('deleting single-read message without reading it');
        }
        deleteMessage($file);

        echo '{"result":"ok"}';
        logIt('deleted message '.$id);
       break;
    case 'chatCreate':
	dieIfDisallowed();
        if (file_exists('banned.txt') && strpos(file_get_contents('banned.txt'), "\r\n".$_SERVER['REMOTE_ADDR']."\r\n") !== false) {
           echo '{"error": "You have been banned"}';
           die();
        }

        $adminPublicKey = filterOutInvalidBase64(filter_input(INPUT_POST, 'adminPublicKey'));
        $id = str_replace('=', '', 
                str_replace('/', '_', 
                  base64_encode(
                    substr(
                      hash('sha256', 
                        openssl_random_pseudo_bytes(64), true), 
                       0, 15))));
        if (mkdir($chat_dir.$id, 0777) === FALSE) {
            logAndDie(' cannot_create_chat_dir ', "Cannot create chat dir");
        }
        $niks = explode(',', filter_input(INPUT_POST, 'niks'));
        $status_file = array(
            'id' => 1, 
            'lastActive' => time(),
            'creationTime' => time(),
            'lastMId' => 0,
            'timeout' => (int)filter_input(INPUT_POST, 'timeout'),
            'startTimeout' => (int)filter_input(INPUT_POST, 'startTimeout'),
            'lastActivityPerPId' => array(),
            'adminKey' => 
                  base64_encode(
                    hash('sha256', 
                      openssl_random_pseudo_bytes(64), true)),
            'pCount' => sizeof($niks)
            
        );
        
        if (file_put_contents($chat_dir.$id.'/.status', serialize($status_file)) === FALSE) {
            logAndDie('cannot create chat status', "Cannot create chat status file");
        }
        $metadata_file = array(
                'niks' => $niks,
                'clientProps' => filterOutInvalidBase64(filter_input(INPUT_POST, 'clientProps')),
                'partialDHKeys' => array(),
                'dhP' => filterOutInvalidBase64(filter_input(INPUT_POST, 'dhP')),
                'dhG' => filterOutInvalidBase64(filter_input(INPUT_POST, 'dhG')),
                'publicKeys' => array(0 => $adminPublicKey)
            );
        
        $pCount = count($metadata_file["niks"]);
        for ($i = 0; $i < $pCount; $i++) {
            $metadata_file["niks"][$i] = $metadata_file["niks"][$i];
        }
        
        if (file_put_contents($chat_dir.$id.'/.metadata', serialize($metadata_file)) === FALSE) {
            logAndDie('cannot create chat metadata', "Cannot create chat metadata file");
        }
        echo '{"urlBase":"';
        echo $chaturl_refix;
        echo '", "adminKey":"';
        echo $status_file['adminKey'];
        echo '", "chatId":"';
        echo $id;
        echo '"}';
        logIt('created chat '.$id);

       break;
    case 'chatRegisterParticipant':
        $chatId = filterOutInvalidBase64(filter_input(INPUT_POST, 'chatId'));
        $regSign = filterOutInvalidBase64(filter_input(INPUT_POST, 'regSign'));

        $status = getChatStatusAndLock($chatId);
        $pId = getPIdBySignature($regSign, $status);
        checkInvalidStatus($status);

        if ($status["id"] === 2 || $status["id"] === 3) {
            unlockStatus($status);
            logAndDie('chat registration wait chat:'.$chatId.' pID:'.$pId, 'wait');
        }
        if ($status["id"] !== 1) {
            //status other than 1, 2 and 3 are disallowed
            unlockStatus($status);
            logAndDie('chat registration rejected because of status '.$status["id"].' for chat:'.$chatId.' pID:'.$pId, 'noregistration');
        }

        $metadata = readMetadata($status, $chatId);
        
        echo '{"pId":'.$pId.',"partialKeys":{';
        $isFirst = TRUE;
        foreach ($metadata['partialDHKeys'] as $pId1 => $pKey) {
            if (!$isFirst) {
                echo ',';
            }
            $isFirst = FALSE;
            echo '"';
            echo $pId1;
            echo '":"';
            echo $pKey;
            echo '"';
        }
        echo '},"niks":{';
        $isFirst = TRUE;
        foreach ($metadata['niks'] as $pId1 => $nik) {
            if (!$isFirst) {
                echo ',';
            }
            $isFirst = FALSE;
            echo '"';
            echo $pId1;
            echo '":"';
            echo $nik;
            echo '"';
        }
        
        echo '}, "clientProps":"';
        echo $metadata["clientProps"];
        echo '", "dhP":"';
        echo $metadata["dhP"];
        echo '", "timeout":"';
        echo $status["timeout"];
        echo '", "dhG":"';
        echo $metadata["dhG"];
        echo '"}';
        $status['id'] = sizeof($metadata['partialDHKeys']) === 0 ? 3 : 2;
        $status['registeringPId'] = $pId;
        setChatStatusAndUnlock($status);
        logIt('new participant '.$pId.' in chat '.$chatId);
       break;
    case "chatUpdateKeys":
        $chatId = filterOutInvalidBase64(filter_input(INPUT_POST, 'chatId'));
        $regSign = filterOutInvalidBase64(filter_input(INPUT_POST, 'regSign'));
        $publicKey = filterOutInvalidBase64(filter_input(INPUT_POST, 'publicKey'));

        $status = getChatStatusAndLock($chatId);
        $pId = getPIdBySignature($regSign, $status);
        checkInvalidStatus($status);
        
        if ($status['id'] !== 2) {
            unlockStatus($status);
            logAndDie('chatUpdateKeys invalid status '.$status['id'].' for chat '.$chatId, 'status error');
        }

        if ($status['registeringPId'] !== $pId) {
            $status['error'] = 'register sequence error: ('.$status['registeringPId'].'!='.$pId.')';
            setChatStatusAndUnlock($status);
            logAndDie('chatUpdateKeys registeringPId('.$status['registeringPId'].') != pId('.$pId.') for chat '.$chatId, 'register sequence error');
        }

        $newDHKeys_str = filter_input(INPUT_POST, 'keys');
        $newDHKeys = array_filter(json_decode($newDHKeys_str, TRUE));
        
        $metadata_str = file_get_contents($chat_dir.$chatId.'/.metadata');
        if ($metadata_str === FALSE) {
            $status['id'] = 5;
            $status['error'] = 'metedata read error';
            setChatStatusAndUnlock($status);
            logAndDie('cannot open metadata file for chat '.$chatId, 'internal error');
        }
        $metadata = unserialize($metadata_str);
        if (count(array_diff_key($newDHKeys, $metadata['partialDHKeys'])) > 0) {
            $status['id'] = 5;
            $status['error'] = 'DH keys update error';
            setChatStatusAndUnlock($status);
            logAndDie('chatUpdateKeys failed because of invalid key pIds received for chat '.$chatId.
                ' expected pIds '.implode(',', array_keys($metadata['partialDHKeys'])).
                ' but received '.implode(', ', array_keys($newDHKeys)), 'internal error');
        }
        $metadata['new_partialDHKeys'] = $newDHKeys;
        $metadata['publicKeys'][$pId] = $publicKey;
        writeMetadata($metadata, $status, $chatId);

        $status['id'] = 3;
        setChatStatusAndUnlock($status);
        echo '"ok"';
        
       break;
    case 'chatGetCreationStatus':
        $chatId = filterOutInvalidBase64(filter_input(INPUT_POST, 'chatId'));
        $status = getChatStatusAndLock($chatId);
       
        checkInvalidStatus($status);
        
        if ($status['id'] !== 1 && $status['id'] !== 2 && $status['id'] !== 3 && $status['id'] !== 4) {
            unlockStatus($status);
            logAndDie('chatGetCreationStatus invalid status '.$status['id'].' for chat '.$chatId, 'status error');
        }
        $metadata_str = file_get_contents($chat_dir.$chatId.'/.metadata');
        if ($metadata_str === FALSE) {
            $status['id'] = 5;
            $status['error'] = 'metedata read error';
            setChatStatusAndUnlock($status);
            logAndDie('cannot open metadata file for chat '.$chatId, 'internal error');
        }
        $metadata = unserialize($metadata_str);
        unlockStatus($status);

        echo '{"status":"';
        echo $status['id'];
        echo '", "registeringPId":"';
        echo $status['registeringPId'];
        echo '", "keys":';
        echo json_encode($metadata['partialDHKeys']);
        echo ', "publicKeys":';
        echo json_encode($metadata['publicKeys']);
        echo '}';
       break;
    case 'chatSetRegistringKeyPart':
        $chatId = filterOutInvalidBase64(filter_input(INPUT_POST, 'chatId'));
        $regSign = filterOutInvalidBase64(filter_input(INPUT_POST, 'regSign'));
        $key = filterOutInvalidBase64(filter_input(INPUT_POST, 'key'));

        $status = getChatStatusAndLock($chatId);
        $pId = getPIdBySignature($regSign, $status);
        checkInvalidStatus($status);
        $pId = (int)filter_input(INPUT_POST, 'pId');

        if ($status['id'] !== 3) {
            unlockStatus($status);
            logAndDie('chatSetRegistringKeyPart when do not need for status '.$status['id'].' pId '.$pId.' chat '.$chatId, 'notrequired');
        }

        if ($status['registeringPId'] !== $pId) {
            unlockStatus($status);
            logAndDie('chatSetRegistringKeyPart registring for another participant '.$status['id'].' pId '.$pId.' chat '.$chatId, 'notrequired');
        }

        $metadata = readMetadata($status, $chatId);
        if (array_key_exists($pId, $metadata["partialDHKeys"])) {
            //Already has this key, need to check its correctness
            if ($metadata["partialDHKeys"][$pId] === $key) {
                //Everything is ok
                logIt('Note: successfull duplicate same key registration for pId '.$pId.' chat '.$chatId);
                unlockStatus($status);
                echo 'ok"';
                die();
            }
            //Key missmatch
            $status['id'] = 5;
            $status['error'] = 'dh key registration mismatch';
            setChatStatusAndUnlock($status);
            logAndDie('dh key registration mismatch for pId'.$pId.' for chat '.$chatId, 'dh key registration mismatch');
        }
        
        $metadata['partialDHKeys'] = $metadata['new_partialDHKeys']; //commit
        unset($metadata['new_partialDHKeys']);
        $metadata["partialDHKeys"][$pId] = $key;
        $status['registeringPId'] = 0;
        
        if (count($metadata["partialDHKeys"]) == count($metadata["niks"])) {
            $status['id'] = 4; //autoclosing registration
            $status['requireIdsForRemove'] = count($metadata["partialDHKeys"]);
            unset($status['startTimeout']);
        } else {
            $status['id'] = 1;
        }
        writeMetadata($metadata, $status, $chatId);
        
        setChatStatusAndUnlock($status);
        echo '"ok'.count($metadata["partialDHKeys"]).'/'.count($metadata["niks"]).'"';
       break;
    case 'chatForceCloseRegistration':
        $chatId = filterOutInvalidBase64(filter_input(INPUT_POST, 'chatId'));
        $adminKey = filterOutInvalidBase64(filter_input(INPUT_POST, 'adminKey'));
        $status = getChatStatusAndLock($chatId);
        checkInvalidStatus($status);
        
        if ($adminKey !== $status['adminKey']) {
            unlockStatus($status);
            logAndDie('chatForceCloseRegistration incorrect adminKey chat '.$chatId, 'adminkey_invalid');
        }
        if ($status['id'] > 4) {
            unlockStatus($status);
            logAndDie('chatForceCloseRegistration already closed (status '.$status['id'].') for chat '.$chatId, 'alreadyclosed');
        }

        if ($status['id'] !== 1) {
            unlockStatus($status);
            logAndDie('chatForceCloseRegistration stuck in a registration (pId: '.$status['registeringPId'].') process (status '.$status['id'].') for chat '.$chatId, 'wait');
            
        }
        $status['id'] = 4;
        $metadata = readMetadata($status, $chatId);
        $status['requireIdsForRemove'] = count($metadata["partialDHKeys"]);
        setChatStatusAndUnlock($status);
       break;
    case 'chatPostMessage':
        $chatId = filter_input(INPUT_POST, 'chatId');
        $messageLocalId = filter_input(INPUT_POST, 'localId');
        $crypted = filterOutInvalidBase64(filter_input(INPUT_POST, 'crypted'));
        $regSign = filterOutInvalidBase64(filter_input(INPUT_POST, 'regSign'));

        $status = getChatStatusAndLock($chatId);
        $pId = getPIdBySignature($regSign, $status);
        checkInvalidStatus($status);

        if ($status['id'] !== 4) {
            unlockStatus($status);
            logAndDie('chatPostMessage invalid status '.$status['id'].' for chat '.$chatId, 'invalidStatus');
        }
        checkPIdTimeout($status, $pId);        

        $mId = $status['lastMId'] + 1;
        $message = array('crypted' => $crypted, 
            'requireIdsToRemove' => $status['requireIdsForRemove'],
            'postTime' => time(),
            'listOfReadLocalIds' => array(),
            'pId' => $pId);
        
        if (file_put_contents($chat_dir.$chatId.'/'.$mId, serialize($message)) === FALSE) {
            unlockStatus($status);
            logAndDie('error writing message file by '.$pId.' len '.strlen($crypted), 'writeerror');
        }
        $status['lastMId'] = $mId;
        echo '{"mId":"';
        echo $mId;
        echo '"}';
        setChatStatusAndUnlock($status);
       break;
    case 'chatGetNewMessage':
        $chatId = filterOutInvalidBase64(filter_input(INPUT_POST, 'chatId'));
        $lastMid = (int)filter_input(INPUT_POST, 'lastMId');
        $lastMIdLocalId = filterOutInvalidBase64(filter_input(INPUT_POST, 'lastMIdLocalId'));

        $status = getChatStatusAndLock($chatId);
        checkInvalidStatus($status);

        if ($lastMid > 0) {
            $file = $chat_dir.$chatId.'/'.$lastMid;
            
            if (file_exists($file)) {
                $lastMessage_str = file_get_contents($file);
                $lastMessage = unserialize($lastMessage_str);
                $lastMessage['listOfReadLocalIds'][$lastMIdLocalId] = 1;
                
                if (count($lastMessage['listOfReadLocalIds']) >= $lastMessage['requireIdsToRemove']) {
                    unlink($file);
                } else {
                    file_put_contents($file, serialize($lastMessage));
                }
            }
        }

        for ($mId = $lastMid + 1; $mId <= $status['lastMId']; $mId++) {
            if (file_exists($chat_dir.$chatId.'/'.$mId)) {
                $message_str = file_get_contents($chat_dir.$chatId.'/'.$mId);
                $message = unserialize($message_str);
                checkMessageTimeout($status, $message);

                if ($debug && $lastMid + 1 !== $mId) {
                    echo '{"error":"file not exists '.($lastMid + 1).' '.(file_exists($chat_dir.$chatId.'/'.($lastMid + 1))?'yes':'no').'"}';
                    die();
                }
                echo '{"mId":"';
                echo $mId;
                echo '", "more":"';
                echo $mId < $status['lastMId'];
                echo '", "message":"';
                echo $message['crypted'];
                echo '", "pId":"';
                echo $message['pId'];
                echo '"}';
                setChatStatusAndUnlock($status);
                die();
            }
        }
        echo '{"error":"nomessages", "Mid":"'.$status['lastMId'].'"}';
        setChatStatusAndUnlock($status);
       break;
    case 'chatClose':
        $chatId = filterOutInvalidBase64(filter_input(INPUT_POST, 'chatId'));
        $adminKey = filterOutInvalidBase64(filter_input(INPUT_POST, 'adminKey'));
        $status = getChatStatusAndLock($chatId);
        checkInvalidStatus($status);
        
        if ($adminKey !== $status['adminKey']) {
            unlockStatus($status);
            logAndDie('chatClose incorrect adminKey chat '.$chatId, 'adminkey_invalid');
        }
        $status['id'] = 6;
        setChatStatusAndUnlock($status);
        break;
}

function checkInvalidStatus($status) {
    if ($status["id"] === 5) {
        unlockStatus($status);
        echo '{"error":"';
        echo $status['error'];
        echo '"}';
        die();
    }
    if ($status["id"] === 6) {
        unlockStatus($status);
        echo '{"error":"closed"}';
        die();
    }
}

function readMetadata($status, $chatId) {
    global $chat_dir;
    $metadata_str = file_get_contents($chat_dir.$chatId.'/.metadata');
    if ($metadata_str === FALSE) {
        $status['id'] = 5;
        $status['error'] = 'metedata read error';
        setChatStatusAndUnlock($status);
        logAndDie('cannot open metadata file for chat '.$chatId, 'internal error');
    }
    return unserialize($metadata_str);
}

function writeMetadata($metadata, $status, $chatId) {
    global $chat_dir;
    if (file_put_contents($chat_dir.$chatId.'/.metadata', serialize($metadata)) === FALSE) {
        $status['id'] = 5;
        $status['error'] = 'metadata write error';
        setChatStatusAndUnlock($status);
        logAndDie('cannot create chat metadata', "Cannot write chat metadata file");
    }
}

function getChatStatusAndLock($chatId) {
    global $chat_dir; //we can  use this as global because only chat is affected at a time
    $filename = $chat_dir.$chatId.'/.status';
    $lock_handle = fopen($filename, "r+");
    if (!flock($lock_handle, LOCK_EX)) {
        logAndDie('cannot lock status file for chat '.$chatId, 'lock status error');
    }

    $ret = unserialize(fread($lock_handle, filesize($filename)));
    $ret['fhandle'] = $lock_handle;
    checkStartTimeout($ret);
    return $ret;
}

function setChatStatusAndUnlock($content) {
    $content['lastActivity'] = time();
    
    $lock_handle = $content['fhandle'];
    unset($content['fhandle']);
    
    ftruncate($lock_handle, 0);
    fseek($lock_handle, 0);
    fwrite($lock_handle, serialize($content));

    flock($lock_handle, LOCK_UN);
    fclose($lock_handle);
}

function unlockStatus($content) {
    $lock_handle = $content['fhandle'];
    unset($content['fhandle']);
    
    flock($lock_handle, LOCK_UN);
    fclose($lock_handle);
}

function checkPIdTimeout($status, $pId) {
    if (array_key_exists($pId, $status['lastActivityPerPId']) && 
        time() - $status['lastActivityPerPId'][$pId] > $status['timeout']) {
        unlockStatus($status);
        logAndDie('request after timeout', 'timeout');
    }
    $status['lastActivityPerPId'][$pId] = time();
}

function checkStartTimeout($status) {
    if (array_key_exists('startTimeout', $status) && 
        (time() - $status['creationTime'] > $status['startTimeout'])) {
        unlockStatus($status);
        logAndDie('request chat after creationTimeout', 'Chat expired');
    }
}

function checkMessageTimeout($status, $message) {
    if (time() - $message['postTime'] > $status['timeout']) {
        unlockStatus($status);
        logAndDie('request message after timeout', 'timeout');
    }
}

function filterOutInvalidBase64($data)
{
    return $data;
    //return base64_encode(base64_decode($data)) === $data ? $data : "";
}

function getPIdBySignature($signature, $status) {
    $adminKeyDecoded = base64_decode($status['adminKey']);
    $sign1 = FALSE;
    for ($pid = 0; $pid < $status['pCount']; $pid++) {
        $word = pack("N", $pid);
        
        $sign = str_replace('=', '', 
                    str_replace('/', '_', 
                      //bin2hex(
                      base64_encode(
                        substr(
                        hash('sha256', 
                            $word.$adminKeyDecoded, true),
                                0, 15)
                              )));
        if (strcmp($signature, $sign) === 0) {
            return $pid;
        }
        if (!$sign1) {
            $sign1 = $sign;
        }
    }
    unlockStatus($status);
    logAndDie('security error', $signature.'!='.$sign1.':'.strcmp($signature, $sign1));
}

function deleteMessage($file) {
	global $message_dir, $trash_dir;
	if (isset($trash_dir)) {
		if (rename($message_dir.$file, $trash_dir.$file) ) {
			return;
		}
	}
   	unlink($message_dir.$file);
}
