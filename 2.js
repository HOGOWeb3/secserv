(function ($) {
/* Hash-based navigation */
$('[data-nav]').click(function(ev) {
    var url = $(this).attr('href');
    ui.setPageFromUrl(url, 1);
    ui.replaceUrl(url);
    ev.preventDefault();
});

window.onhashchange = function () {
    ui.setPageFromUrl(window.location.href);
};

setTimeout(function() {
    ui.setPageFromUrl(window.location.href, true);
}, 0);
/* End hash-based navigation */

/* Message ui logic */

function areMessagePasswordsMatch() {
    if (!$('#chkShortLink').is(':checked')
            || !$('#chkFake').is(':checked')) {
        return true;
    }

    var p1 = $('#password').val(), p2 = $('#password2').val();
    return messageCoder.areNoKeyPasswordsAcceptable(p1, p2);
}

$("#password,#password2,#chkShortLink,[data-fn='text'],#chkFake").change(function () {
    if ($('#password').val() === $('#password2').val() && $('#chkFake').is(':checked')) {
        $("[data-hf='fakeSamePassword']").show();
        $("[data-hf='messagePasswordsInconsistent']").hide();
        return;
    }

    $("[data-hf='fakeSamePassword']").hide();
    $("[data-hf='messagePasswordsInconsistent']")[areMessagePasswordsMatch()?'hide':'show']();
});

$("[data-fn='text'],#ddMethod,#chkFake,#divCreateSingleMessage,#divCreateSingleMessage2").change(function () {
    $("#divFake")[$('#chkFake').is(':checked') ? 'show': 'hide']('fast');

    $("[data-hf='messageSizesInconsistent']")[(!$('#chkFake').is(':checked') ||
        messageCoder.areMessageSizesCompatible(
            composeMessage($('#divCreateSingleMessage')),
            composeMessage($('#divCreateSingleMessage2')),
            $('#ddMethod').val()
        )) ? 'hide':'show']();
});

$("#password,#password2,#chkShortLink,[data-fn='text'],#ddMethod").keyup(function() {$(this).change();});
$('#chkFake').change();

function isMessageValid() {

    return !$('#chkFake').is(':checked') ||
        messageCoder.areMessageSizesCompatible(
            composeMessage($('#divCreateSingleMessage')),
            composeMessage($('#divCreateSingleMessage2')),
            $('#ddMethod').val()
        );
}

function doCreateMessage() {
    try
    {
        if (!isMessageValid()) {
            ui.hideBusy();
            return;
        }
        var isShortLink = $('#chkShortLink').is(':checked');
        var message1 = composeMessage($('#divCreateSingleMessage'));
		if (!message1) {
            ui.hideBusy();
			return;
		}
        var message2 = $('#chkFake').is(':checked') ? composeMessage($('#divCreateSingleMessage2')) : null;
        var message = messageCoder.encryptDouble(
            $('#ddMethod').val(),
            message1,
            $('#password').val(),
            message2,
            $('#password2').val(),
            isShortLink
            );

        if (!message) {
            ui.hideBusy();
            alert('Message not created. It may be too large. Please note, that for vernam we limit messages to ' +
                    myEncryption['v'].maxHalfMessageSize + ' bytes due to very large and therefore widely unsupported URLs.');
            return;
        }

    var req = {
        isShortLink:isShortLink,
        method:$('#ddMethod').val(),
        live:$('#ddSeconds').val(),
        singleRead:$('#chkSingleRead').is(':checked'),
        crypted:  message.message.toBase64String()
    };

    ui.setPageFromUrl(window.location.href, 1); //reset autoclean fields
    $("[data-hf='message-url']").val('Creating message. Wait..');
	cleanup();

    $("[data-hf='message-create-error']").hide();
    $('#btnCreate').attr('disabled', true);
    }
    catch(E) {
        ui.hideBusy();
        console.log(E);
        throw E;
    }
    ajax.createMessage(req)
    .success(function(res) {
        if(res.del) {
            $("#txtRemoveURL")
            .attr('disabled', false)
            .val(res.del)
        }
        if (res.url) {
            if (req.method === 'aes' && message.key) {
                //Append key 15 additional bytes to make url parameters of the same total size as chat
                message.key.appendBlock(myCrypt.getRandomBytes(15));
            }
            $("[data-hf='message-url']")
            .attr('disabled', false)
            .val(message.key ? res.url + '#' + message.key.toBase64String().split('/').join('_').split('=')[0]: res.url)
            .change();

            $("[data-hf='message-token']")
            .attr('disabled', false)
            .val(res.url.split('?')[1] + ( message.key ? "/" + message.key.toBase64String().split('/').join('_').split('=')[0]: "") )
            .change();

            $(window).scrollTop($('#txtURL').offset().top);
            return;
        }
        $("[data-hf='message-url']").val('Error..');
        $("[data-hf='message-token']").val('');

        if (res.error) {
            $("[data-hf='message-create-error']").show().text(res.error);
            return;
        }
        $("[data-hf='message-create-error']").show().text('Error');
        debugger;
    })
    .error(function(res) {
        $("[data-hf='message-create-error']").show().text(res);
        $("[data-hf='message-url']").val('Error..');
        debugger;
    })
    .always(function() {
        $('#btnCreate').attr('disabled', false);
        ui.hideBusy();
    });
}

$('#btnCreate').click(function(ev) {
    ev.preventDefault();
    if ($('#btnCreate').attr('disabled')) {
        return;
    }
    ui.showBusy();
    setTimeout(doCreateMessage, 15);
});

function composeMessage($block) {
    var text = $block.find("[data-fn='text']").val();
    var messageFiles = $block.data('message-files');

    if (!text.length && (!messageFiles ||!messageFiles.length)) {
        return false;
    }
    return {text: text, files: messageFiles || []};
}

myCrypt.onReseed(function (key) {
    if (!ui.isWindowFocused()) {
        return;
    }
    var block = new Clipperz.ByteArray().appendBlock(key);
    block = Clipperz.Crypto.SHA.sha256(block);

    $('#btnCreate').attr('disabled', false).attr('title', '');
    var str = block.toHexString().substr(2);
    $('.seedKey').each(function (ind, el) {
        var $el = $(el);
        var newstr = $el.val() + str;
        var maxLen = ($el.data('seed-length') | 0 ) || 100;

        newstr.length < maxLen || (newstr = newstr.substr(newstr.length - maxLen));
        $el.val(newstr);
    });
});

$(function() {
    if (navigator.userAgent.toLowerCase().indexOf('firefox') === -1) {
        $("[data-hf='mozOnly']").show();
    }
});

ui.initFilesSupport($('#divCreateSingleMessage'));
ui.initFilesSupport($('#divCreateSingleMessage2'));

$('#chkShortLink,#ddMethod').change(function () {
    var val = $('#chkShortLink').is(':checked');
    $('#lblShortLink').css('font-weight', val ? 'bold' : 'normal');
    if (val && !myEncryption[$('#ddMethod').val()].allowEmptyKey) {
        $('#ddMethod').val('aes');
    }
});

$('#chkSingleRead').change(function () {
    var val = $('#chkSingleRead').is(':checked');
    $('#lblSingleRead').css('font-weight', val ? 'bold' : 'normal');
});

(function () {
    var lastEnter = 0;
    $('#divChatComposeMessageTextarea').keydown(function(ev) {
        if ((ev.keyCode === 10 || ev.keyCode === 13) && ev.ctrlKey) {
            $('#btnChatSend').click();
            ev.preventDefault();
            lastEnter = 0;
            return false;
        }

        if ($('#btnChatSend').attr('disabled')) {
            return;
        }
        if (ev.ctrlKey && ev.which === 76) { //ctrl+L
            $('#btnChatClear').click();
            return false;
        }

        /*if (ev.ctrlKey && ev.which != 17) {
            alert(ev.which);
            return false;
        }*/

        if (ev.which === 13 && !ev.shiftKey && !lastEnter) {
            lastEnter = 1;
            return;
        }
        if (ev.which === 13 && !ev.shiftKey && lastEnter) {
            $('#btnChatSend').click();
            ev.preventDefault();
            lastEnter = 0;
            return false;
        }
        lastEnter = 0;
    });
})();

/* Read message */
$('#divMessageDel').on('my-activate', function() {
    var hs = window.location.hash.split('/');
    function showError(msg) {
        $('#divMessageDel').text(msg);
    }
    if (!hs[2]) {
        return;
    }
    ajax.deleteMessage(hs[1], hs[2])
    .success(function(res) {
        if (res.error) {
            showError(res.error);
            return;
        }
        ui.setPageFromUrl();
        ui.replaceUrl();
    })
    .error(function(res) {
        showError(res);
        debugger;
    });
});

function DecryptMessage(message, key, enc) {
    if (!key) {
        var len = myEncryption[enc].keyLength(message);
        key = [];
        for (var i = 0; i < len; i++) {
            key.push(0);
        }
    }
    message = getMessage(message, key, enc);
    var $files = $('#divReadFiles');
    $files.empty();
    var $table = $('<div/>');

    $files.append($table);

    for (var i = 0; i < message.files.length; i++) {
        var content = message.files[i].content, name = message.files[i].name;
        if (name.length > 80) name = name.substr(0, 50) + '...' + name.substr(name.length - 20);
        var $tr = $('<div/>'), $td = $('<div/>');
        $tr.css({
            clear: 'both'
        });

        $td.css({
            'float': 'left',
            'margin-right': '10px'
        });
        $table.append($tr);

        $td.append($('<span/>').text(name));
        $tr.append($td);

        $td = $('<div/>');
        $td.css({
            'float': 'left',
            'margin-right': '10px'
        });
        $td.append($('<span/>').text(util.formatFileSize(content.length())));
        $tr.append($td);

        $td = $('<div/>');
        $td.css({
            'float': 'left'
        });
        $td.append(util.generateDownloadLink(content, name).css( { 'float': 'left'} ));
        $td.append($('<div />').css( {clear: 'both' }));
        $tr.append($td);
    }

    $('#txtReadMessage').val(message.text);
}

$('#divRead').on('my-deactivate', function () {
        $('#txtReadMessage').val('').scrollTop(0);
        var $files = $('#divReadFiles');
        $files.empty();
});

$('#divCreateMessage').on('my-deactivate', function () {
	cleanup();
    $("[data-hf='message-create-error']").hide();
});

$('#divRead').on('my-activate', function () {
   var hs = window.location.hash.split('/');

   if (hs.length < 2) {
        ui.setPageFromUrl();
        ui.replaceUrl();
       return;
   }
   if (oldReadPasswordInterval) {
        clearInterval(oldReadPasswordInterval);
    }

    ui.showBusy();
    setTimeout( function() {
        processDecryptAndDisplay(hs);
    }, 1);
});

function processDecryptAndDisplay(hs) {
    ajax.getMessage(hs[1])
    .success(function(res) {
        ui.hideBusy();

        if (res.error) {
            ui.setPageFromUrl();
            ui.replaceUrl();
            $('#txtReadMessage').val(res.error);
            return;
        }

        if (!res.message) {
            ui.setPageFromUrl();
            ui.replaceUrl();
            $('#txtReadMessage').val('Error');
            debugger;
            return;
        }
        var dt = new Date().getTime();
        var doDecrypt = function () {
            if ($('#btnReadDecrypt').attr('disabled')) {
                return;
            }
            $('#btnReadDecrypt').attr('disabled', true);
            var theKey = $('#txtReadFullUrl').val().split('#')[1];
            try
            {
                if (theKey && theKey.substr(hs[2].length) === hs[2]) {
                    DecryptMessage(res.message, theKey, res.encType);
                } else {
                    DecryptMessage(res.message, hs[2], res.encType);
                }
            }
            catch(E){
                alert('decrypt:' + E);
            }
            finally{
                $('#btnReadDecrypt').attr('disabled', false);
            }
        };

        doDecrypt();
        ui.replaceUrl();
        dt -= new Date().getTime();
        if (dt > 500 || res.message.length > 10000) {
            //Slow machine or large data
            $('#btnReadDecrypt').show().off('click').on('click', doDecrypt);
        } else {
            $('#btnReadDecrypt').hide();
            oldReadPasswordInterval = setInterval(function () {
                if (oldReadPassword === $('#txtReadPassword').val()) {
                    return;
                }
                doDecrypt();
                oldReadPassword = $('#txtReadPassword').val();
            }, 500);
        }
    })
    .error(function(res) {
        ui.hideBusy();
        $('#txtReadMessage').val('Network Error');
        console.log(res);
        debugger;
    });
}
var oldReadPassword = false, oldReadPasswordInterval = false;

function getMessage(encDataStr, keyStr, method) {
    var ret = '';

    key = new Clipperz.ByteArray();
    if ($.isArray(keyStr)) {
        key.appendBytes(keyStr);
    } else {
        while ((keyStr.length % 4) > 0) keyStr += '=';
        keyStr = keyStr.split('_').join('/');
        key.appendBase64String(keyStr);
    }

    encData = new Clipperz.ByteArray();
    encData.appendBase64String(encDataStr.split('_').join('/'));
    var pass = $('#txtReadPassword').val();

    var message = messageCoder.decryptDouble(encData, method, key, pass);


    if (method === 'v' && message.isKeyTooShort) {
        $('#divReadFullUrl').show();
        ret += 'URL is not valid. \n\
Your  browser does not support long URLs. \n\
Vernam  algorithm require a long key to encrypt long messages. \n\
This require long URLs.\n\
Paste your Vernam URL and press `Decrypt` button if any.\n\
This is partially decrypted message: \n\
';
        }



	if (!message) {
            return false;
        }
	return message;
}


/* Chat */

var niks_tmp;
var currentChatClient;

function initChatCurrentCommunicator() {
    if (currentChatClient) {
        currentChatClient.stop();
    }
    currentChatClient = new ChatClient(new ChatCommunicator());

    currentChatClient.onNewMessage(function (message, mid, pid) {
            printChatMessage(message, mid, pid);
            chatMessageNotify(pid);
            currentChatClient.sendRead(mid);
        });
    currentChatClient.onReadConfirm(function(pId, mId) {
        var $msg = $('#msg' + mId),
            read = $msg.data('readParts') || {},
            pIds = currentChatClient.getChattingPIds(),
            unread = [],
            niks = currentChatClient.getNiks();

        read[pId] = 1;
        $msg.data('readParts', read);
        for (var pId1 in pIds) {
            if (!pIds.hasOwnProperty(pId1) || read[pId1]) {
                continue;
            }
            unread.push(niks[pId1]);
        }

        if (unread.length) {
            $msg.addClass('read-partial');
            $msg.removeClass('read-all');
            $msg.attr('title', 'Not received by ' + unread.join());
        } else {
            $msg.removeClass('read-partial');
            $msg.addClass('read-all');
            $msg.attr('title', 'Received by all participants');
        }
    });
    currentChatClient.onActivated(activatedChat);
    currentChatClient.onJoined(function(pId) {
        writeChat(currentChatClient.getNiks()[pId] + ' joined the chatroom');
    });

    currentChatClient.onNetError(function(err) {
        writeChat(err.length > 100 ? "Network error" : err);
        console.log(err);
    });

    currentChatClient.onLeaving(function(pId, msg) {
        if (pId == currentChatClient.getPId()) {
            if (msg) {
                clearChat();
                writeChat('You left the chatroom. ' + msg);
                currentChatClient.stop();
            }
            $('#btnChatSend').attr('disabled', true);
            return;
        }
        var cnt = 0;
        var pids = currentChatClient.getChattingPIds();
        for (var pid in pids) {
            if (pids.hasOwnProperty(pid) && pid != pId) {
                cnt++;
            }
        }
        if (cnt === 1) {
            writeChat(currentChatClient.getNiks()[pId] + ' leaving the chatroom'+ (msg ? '. ' + msg:'') + '. No one left in chat except you.');
            currentChatClient.stop();
            $('#btnChatSend').attr('disabled', true);
            return;
        }
        writeChat(currentChatClient.getNiks()[pId] + ' leaving the chatroom'+ (msg ? '. ' + msg:'') + '. A new encryption key is being created. Please wait..');
        ui.showBusy();
    });

    currentChatClient.onStopped(function(pId) {
        writeChat(currentChatClient.getNiks()[pId] + ' is ready for a new key.');
    });

    currentChatClient.onClose(function() {
        writeChat('Chat closed');
        currentChatClient = null;
        ui.hideBusy();
    });

    currentChatClient.onNewSharedKey(function() {
        writeChat('Got new shared key');
    });

    currentChatClient.onResume(function() {
        writeChat('Chat resumed');
        ui.hideBusy();
    });

    currentChatClient.onInvalidSignature(function(mId, pId) {
        writeChat('Invalid signature from ' + currentChatClient.getNiks()[pId] + '. Your or his password may be invalid.');
    });
    currentChatClient.onValidSignature(function(mId, pId) {
        writeChat('Seems that you have the same password with ' + currentChatClient.getNiks()[pId]);
    });
}

function clearChat() {
    $('#btnChatClear').click();
    $('#divChatAdminPanel').hide();
    $('#divChatLinks').empty();
    $('#divChatFingerprints').empty();
    $('#headFingerprintTitle').hide();
}

$(window).on('beforeunload', function(){
    if (!currentChatClient || currentChatClient.isStopped()) {
        return;
    }

    currentChatClient.sendLeave();
    currentChatClient = null;
});

$('#divChatCreate').on('my-activate', function () {
    niks_tmp = {};
    $('#ddChatParticipants').val(2).change();
});

$('#divChatCreate').on('my-deactivate', function () {
    //Clear everything for security
    niks_tmp = null;
});

$('#pswdChat').change(function () {
    currentChatClient && currentChatClient.setPassword($('#pswdChat').val());
});

$('#pswdChat').keyup(function () {
    currentChatClient && currentChatClient.setPassword($('#pswdChat').val());
});

$('#ddChatParticipants').change(function () {
    var pCnt = $('#ddChatParticipants').val() | 0;
    var $divNiks = $('#divChatNiks');
    $divNiks.empty();

    for (var i = 0; i < pCnt; i++) {
        (function (i) {
            var $nik = $('#templateChatNik')
                    .clone()
                    .css('display', 'block')
                    .attr('id', 'chatNik' + i)
                    .css('background-color', ui.getNikColor(pCnt, i));

            $nik.find('[data-fn=pId]').text(i);

            niks_tmp[i] = niks_tmp[i] || ("Participant_" + i);
            $nik.find('[data-fn=nikname]')
                    .val(niks_tmp[i])
                    .change(function () {
                        niks_tmp[i] = this.value;
                    });
            if (!i) {
                $nik.append('(admin, you)');
            }
            $divNiks.append($nik);
        })(i);
    }
});

$('#btnChatCreateStep2').click(function(ev) {
    ev.preventDefault();
    if ($('#btnChatCreateStep2').attr('disabled')) {
        return;
    }
    $('#btnChatCreateStep2').attr('disabled', true);
    var pCnt = $('#ddChatParticipants').val() | 0, niks = [];
    for (var i = 0; i < pCnt; i++) {
        niks.push($('#chatNik' + i).find('[data-fn=nikname]').val() || "");
    }

    initChatCurrentCommunicator();
    currentChatClient.startNew(
            niks,
            $('#ddTimeout').val()|0,
            $('#ddStartTimeout').val()|0,
            function(error, urls) {
        $('#btnChatCreateStep2').attr('disabled', false);
        ui.setPageFromUrl('#chat');
        ui.replaceUrl();
        if (error) {
            writeChat(error);
            return;
        }
        if (urls) {
            $('#divChatLinks').empty();
            $('#divChatAdminPanelContent').show();

            $('#divChatAdminPanel').show();
            for (var i = 1; i < urls.length; i++) {
                var $div = $('#templateChatUrl')
                        .clone()
                        .css('display', 'block')
                        .attr('id', 'divChatUrl' + i);

                $div.find("[data-fn='nik']")
                        .text(niks[i])
                        .css('background-color', ui.getNikColor(niks.length, i));

                $div.find("[data-fn='url']").val(urls[i]);
                $div.find("[data-fn='url']").click(function() {
                    this.select();
                });
                $div.find("[data-hf='link-qr']").click(
                        (function($div) {
                            return function(ev) {
                                ev.preventDefault();
                                showQrCode($div.find("[data-fn='url']").val());
                            };
                        })($div));
                $('#divChatLinks').append($div);
            }
            displayNiknames(niks, 0);
        }
    });
});

function displayNiknames(niks, pId) {
    $('#divChatNikList').text('Nicknames: ');
    var title_niks = [];

    for (var i = 0; i < niks.length; i++) {
        var $div = $('#templateNikInChat').clone();
        $div.attr('id', 'divNikInChat' + i)
            .show();
        $div.find("[data-fn='nik']")
                .text(niks[i])
                .css('background-color', ui.getNikColor(niks.length, i));
        $('#divChatNikList').append($div);
        if (pId !== i) {
            title_niks.push(niks[i]);
        }
    }
    document.title = title_niks.join(', ');
}

function showFingerprints() {
    var fps = currentChatClient.getFingerprints();
    var niks = currentChatClient.getNiks();
    var pids = currentChatClient.getChattingPIds();
    $('#divChatFingerprints').empty();
    $('#headFingerprintTitle').show();

    for (var i in pids) {
        if (!pids.hasOwnProperty(i)) {
            continue;
        }
        var $div = $('#templateFingerprint')
                .clone()
                .attr('id', 'divFingerprint' + i);
        $div.find("[data-fn='nik']").text(niks[i]);
        $div.find("[data-fn='fingerprint']").text(fps[i]);
        $div.show();

        $('#divChatFingerprints').append($div);
    }
}

function activatedChat() {
    console.log('Started chat');
    //$('#divChatMessages').empty();
    writeChat('Chat started...');
    ui.initFilesSupport($('#divChatComposeMessage'));
    showFingerprints();
    $('#btnChatSend').attr('disabled', false);
}

function scrollChatBottom() {
    var $div = $('#divChatMessages').parent();
    $div.scrollTop($div[0].scrollHeight - $div.height());
}

function writeChat(message, notService) {
    if (!notService) {
        message = $('<div class="chat-message-service"/>').append(message);
    }
    $('#divChatMessages').append(message);

    var timeout = setTimeout(function() {
        scrollChatBottom();
    }, 500);

    $('#divChatMessages').find('img').one('load', scrollChatBottom);
}

var chatResizeFunc = function () {
    setTimeout(function() {
        var h = $(window).height();
        h = Math.max(h - 200, 100);
        $('#divChat').css('height', h + 'px');
        $('#divChatComposeMessageTextarea').attr('rows', '5');

    }, 100);
};

var msgReadResizeFunc = function () {
    setTimeout(function() {
        var h = $(window).height();
        h = Math.max(h - 200, 100);

        var lineHeight = parseInt(jQuery('#txtReadMessage').css('line-height'));
        h -= 3*lineHeight / 4;
        h -= h % lineHeight;
        h += 3*lineHeight / 4;

        $('#txtReadMessage').css('height', h + 'px');

    }, 100);
};

$(window).on('resize', function() {
    var w = $(window).width();
    $('.autowidth').each(function() {
        var $el = $(this);
        var width = w - ($el.data('width-sub') |0);
        var maxWidth = $el.data('width-max')|0;
        var minWidth = $el.data('width-min')|0;
        maxWidth && width > maxWidth ? width = maxWidth : 0;
        minWidth && width < minWidth ? width = minWidth : 0;
        $el.css('width', width + 'px');
    });
});
setTimeout(function() {
        $(window).resize();
        }, 100);

$('#divRead').on('my-deactivate', function() {
    $(window).off('resize', msgReadResizeFunc);
});
$('#divRead').on('my-activate', function() {
    $(window).on('resize', msgReadResizeFunc);
    msgReadResizeFunc();
});

    $('#divChat').on('my-deactivate', function() {
    //Clear everything for security
    if (currentChatClient) {
        try
        {
            currentChatClient.sendLeave();
        }catch(E){}
        try
        {
            currentChatClient.stop();
        }catch(E){}
        clearChat();
    }
    niks_tmp = null;
    currentChatClient = null;
    $(window).off('resize', chatResizeFunc);
    $('#btnChatSend').attr('disabled', false);
    $('#divChatMessages').empty();
    $('#divChatFingerprints').empty();
    $('#divChatNikList').empty();
    $('#divChatComposeMessageTextarea').val('');
    $("[data-hf='divFiles']").empty();
    var f = $('#divChatComposeMessage').data('clear-files');
    f?f():0;

});
$('#divChat').mousemove(chatUnreadMessagesClear);
$(document).keyup(chatUnreadMessagesClear);

$('#divChat').on('my-activate', function() {
    //Clear everything for security
    niks_tmp = null;
    chatResizeFunc();
    $(window).on('resize', chatResizeFunc);
    var hs = window.location.hash.split('/');
    if (hs.length < 3) {
        return;
    }
    var key = hs[2].substr(0, 44);
    var regSign = hs[2].substr(44);
    var go = function () {
        initChatCurrentCommunicator();
        currentChatClient.startExisting(hs[1], util.myBase642ByteArray(key), regSign,
            function(error) {
                ui.replaceUrl();
                if (error === 'noregistration') {
                    ui.setPageFromUrl('#create_chat', 1);
                    return;
                }
                if (error) {
                    writeChat(error);
                    return;
                }
                displayNiknames(currentChatClient.getNiks(), currentChatClient.getPId());
            });
    };
    if (myCrypt.isRandomReady()) {
        go();
        return;
    }
    var ident = myCrypt.onReseed(function() {
        go();
        myCrypt.offReseed(ident);
    });
});

$('#btnChatClear').click(function(ev) {
    ev.preventDefault();
    $('#divChatMessages').empty();
});

$('#btnChatLeave').click(function(ev) {
    ev.preventDefault();
    if (!currentChatClient || currentChatClient.isStopped()) {
        return;
    }

    currentChatClient.sendLeave();
    writeChat('You are leaving the chat.');
    currentChatClient.stop();
    $('#btnChatSend').attr('disabled', true);
});

var hUpdActivities;
function updateChatActivities() {
    if (!currentChatClient){
        return;
    }
    var activities = currentChatClient.getLastActivities();
    var niks = currentChatClient.getNiks();
    if (!niks) {
        return;
    }
    var now = new Date().getTime()/1000;
    var chatting = currentChatClient.getChattingPIds();

    for (var i in niks) {
        if (!niks.hasOwnProperty(i)) {
            continue;
        }
        if (!chatting[i]) {
            $('#divNikInChat' + i).removeClass('nik-inactive').addClass('nik-exited');
            continue;
        }
        var ts = (now - activities[i]) | 0;
        ts -= ts % 10;
        $('#divNikInChat' + i)[ts >= 60 ? 'addClass' : 'removeClass']('nik-inactive')
                .attr('title', ts >= 20 ? ('Inactive for ' + ts + ' seconds') : '')
                .removeClass('nik-exited');
    }
}
var isActive = 1;
setInterval(function () {
    if (isActive) {
        isActive = 0;
        if (currentChatClient) {
            currentChatClient.setActiveStatus();
            updateChatActivities();
        }
        return;
    }
    if (currentChatClient) {
        currentChatClient.setInactiveStatus();
    }
}, 10000);

function renewActive() {
    if (isActive) {
        return;
    }
    isActive = 1;
    if (currentChatClient) {
        currentChatClient.setActiveStatus();
        updateChatActivities();
    }
}
$(document).mousemove(renewActive);
$(document).keypress(renewActive);
$(document).on('touchstart', renewActive);

ui.onWindowFocused(function () {
    if (currentChatClient) {
        chatUnreadMessagesClear();
    }
});

ui.onWindowBlured(function () {
    if (currentChatClient) {
        currentChatClient.setInactiveStatus();
    }
});

$('#btnChatSend').click(function(ev) {
    ev.preventDefault();

    if ($('#btnChatSend').attr('disabled')) {
        return;
    }
    if (!currentChatClient) {
        alert('Chat is closed. No one to send to.');
        return;
    }

    var message = composeMessage($('#divChatComposeMessage'));
    if (!message) {
        return;
    }

    if (!currentChatClient.isActived()) {
        writeChat("Chat is not active. You should wait for other participant(s) to join to be able to send messages.");
        return;
    }
    if (currentChatClient.isStopped()) {
        writeChat("Chat is paused. You should wait for other participant(s) to leave the chat.");
        return;
    }
    $('#divChatComposeMessage').find('input,textarea').attr('disabled', true);
    $('#btnChatSend').attr('disabled', true);
    currentChatClient.send(message, function (success) {
        $('#divChatComposeMessage')
                .find('input,textarea')
                .attr('disabled', false)
                .first().focus();
        $('#btnChatSend').attr('disabled', false);
        if (success) {
            $('#divChatComposeMessage').find("[data-fn='text']").val('');
            var f = $('#divChatComposeMessage').data('clear-files');
            f?f():0;
        }
    });
});

function printChatMessage(message, mId, pId) {
    var $message = $('#templateMessage').clone().attr('id', 'msg' + mId).css('display', 'block');
    var niks = currentChatClient.getNiks();
    $message.find("[data-fn='sender']").text(niks[pId]);
    $message.css('background-color', ui.getNikColor(niks.length, pId));
    if (pId != currentChatClient.getPId()) {
        $message.addClass('chat-message-foregin');
    }
    var $files = $message.find("[data-hf='files']");

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
        $td.append($('<span/>').text(util.formatFileSize(content.length())));
        $tr.append($td);

        $td = $('<td/>');

        var $a = null;
        try
        {
            $a = util.generateDownloadLink(content, name);
            var type = message.files[i].type;
            if (type && type.substr(0, 5) === "image" &&
                    (!(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))/* ||
                        content.length() < 102400*/)) {
                var $img = $('<img style="max-width:200px;max-height:150px;display:block;clear:both" alt="download" title="download"/>');
                $img.attr('src', util.generateFileUrl(content, type));
                $a.append($img);
            }

            $td.append($a);
            $tr.append($td);
        }catch(E) {
            alert(E);
        }
    }
    var lines = message.text.split('\n');
    $message.find("[data-fn='message']").empty();
    for (var i = 0; i < lines.length; i++) {
        $message.find("[data-fn='message']")
                .append($('<span/>').text(lines[i]))
                .append($('<br/>'));
    }
    writeChat($message, true);
}

var unreadMessages = 0;
var chatTitle = 0;
var unreadMessagesBlinkInterval = 0;

function messageChatCount() {
    var ret = 0;
    if (!unreadMessages) {
        return 0;
    }
    for (var i in unreadMessages) {
        if (unreadMessages.hasOwnProperty(i)) {
            ret += unreadMessages[i];
        }
    }
    return ret;
}

function notificationChatString() {
    var cnt = messageChatCount();
    if (!cnt) {
        return 'No new messages';
    }
    /*var ar = [];
    for (var i in unreadMessages) {
        if (!unreadMessages.hasOwnProperty(i)) {
            continue;
        }
        ar.push({nike: i, cnt: unreadMessages[i]});
    }
    ar.sort(function (a, b) { return a > b ? -1: (a < b ? 1: 0)});
    return $.map(ar, function (a) {
        return a.cnt + " new from " + a.nike;
    }).join(', ');*/
    if (cnt === 1) {
        return '!!! 1 new message - ' + chatTitle + ' !!!';
    }
    return '!!! ' + cnt + ' new messages - ' + chatTitle + ' !!!';
}

function chatMessageNotify(nike) {
    if (ui.isWindowFocused()) {
        return;
     }
    if (!messageChatCount()) {
        chatTitle = document.title;
        unreadMessages = {};
    }

    unreadMessages[nike] |= 0;
    unreadMessages[nike]++;

    if (!unreadMessagesBlinkInterval) {
       unreadMessagesBlinkInterval = setInterval(function()
       {
           if (!currentChatClient) {
               chatUnreadMessagesClear();
               return;
           }
           if (document.title === chatTitle) {
               document.title = notificationChatString();
               return;
           }
           document.title = chatTitle;
       }, 1000);
   }
    try {
        $('#audio_new_message')[0].play();
    }
    catch(E) {
        console.log(E);
    }
}

function chatUnreadMessagesClear() {
    if (!unreadMessages) {
        return;
    }
    if (unreadMessagesBlinkInterval) {
        clearInterval(unreadMessagesBlinkInterval);
        unreadMessagesBlinkInterval = 0;
    }
    document.title = chatTitle;
    unreadMessages = 0;
}


/* End Chat */


/* QR Codes */
$('.aMsgCreateQrCode').click( function( ev ) {
    ev.preventDefault();
    showQrCode($('#txtURL').attr('disabled') ? "": $('#txtURL').val());
});

function showQrCode(text) {
    if (!text) {
        alert('This is for making scannable qr-code of created URL. \n\
Use this AFTER creating a message/chat.\n\
This is usable for transfering something to a mobile phone that is near you or send it using SMS.');
        return;
    }
    $('#divQrCode').empty();
    new QRCode( $('#divQrCode')[0], text );
    $('#dlgQrCode').modal('show');
}

$('#dlgQrCode').on( 'hidden.bs.modal', function(){$('#divQrCode').empty()} );
$('#dlgQrCode').modal( { show:false } );

function cleanup() {
    var f = $('#divCreateSingleMessage').data('clear-files');
    f?f():0;
    var f = $('#divCreateSingleMessage2').data('clear-files');
    f?f():0;
}
})(jQuery);
