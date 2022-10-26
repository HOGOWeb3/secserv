/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var prepend_random_size = 16;
var dh_key_length = 64; //in bytes
var force_https = 0;
var de_bug = 0;
var max_half_message_size = 15*1024*1024;
var min_half_message_size = 1024;
var ajaPath = 'aja.php';
var streamPath = 'chatStream.php';
if (force_https && window.location.protocol != "https:") {
    window.location.href = "https:" + window.location.href.substring(window.location.protocol.length);
}
