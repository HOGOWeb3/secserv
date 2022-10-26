/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var ajax = (function($) {
    return {
        createMessage: function (message) {
            return $.ajax(ajaPath, {
                dataType: 'json',
                method: 'POST',
                data: {
                    action: message.isShortLink ? 'creates': 'createm',
                    encType: message.method,
                    live: message.live,
                    singleRead: message.singleRead? 1 : 0,
                    message: message.crypted
                }
            });
        },
        deleteMessage: function (messageId, delKey) {
            return $.ajax(ajaPath, {
                dataType: 'json',
                method: 'POST',
                data: {
                    action: 'del',
                    id: messageId,
                    delKey: delKey
                }
            });
        },
        getMessage: function (messageId) {
            return $.ajax(ajaPath, {
                dataType: 'json',
                method:'POST',
                data: {
                    action: 'read',
                    id: messageId
                }
            });
        },
        chatCreate: function(chat) {
            return $.ajax(ajaPath, {
                dataType: 'json',
                method:'POST',
                data: {
                    action: 'chatCreate',
                    niks: $.map(chat.cryptedNiks, function (nikBA) {return nikBA.toBase64String();}).join(','),
                    clientProps: '',//chat.clientProps.toBase64String(),
                    timeout: chat.timeout,
                    startTimeout: chat.startTimeout,
                    dhP: chat.dhP.asByteArray().toBase64String(),
                    dhG: chat.dhG.asByteArray().toBase64String(),
                    adminPublicKey: chat.publicKey.asByteArray().toBase64String()
                }
            });
        },
        chatRegisterParticipant: function (chat) {
            return $.ajax(ajaPath, {
                dataType: 'json',
                method:'POST',
                data: {
                    action: 'chatRegisterParticipant',
                    chatId: chat.chatId,
                    regSign: chat.regSign
                }
            });
        },
        chatSetRegistringKeyPart: function (chat, missingPId, key) {
            return $.ajax(ajaPath, {
                dataType: 'json',
                method:'POST',
                data: {
                    action: 'chatSetRegistringKeyPart',
                    chatId: chat.chatId,
                    pId: missingPId|0,
                    regSign: chat.regSign,
                    key: key
                }
            });

        },
        chatGetCreationStatus: function (chat) {
            return $.ajax(ajaPath, {
                dataType: 'json',
                method:'POST',
                data: {
                    action: 'chatGetCreationStatus',
                    regSign: chat.regSign,
                    chatId: chat.chatId
                }
            });
        },
        chatUpdateKeys: function (chat) {
            return $.ajax(ajaPath, {
                dataType: 'json',
                method:'POST',
                data: {
                    action: 'chatUpdateKeys',
                    chatId: chat.chatId,
                    pId: chat.pId,
                    regSign: chat.regSign,
                    keys: JSON.stringify(chat.partialKeys),
                    publicKey: chat.publicKey.asByteArray().toBase64String()
                }
            });
        },
        chatPostMessage: function (chat, message) {
            return $.ajax(ajaPath, {
                dataType: 'json',
                method:'POST',
                data: {
                    action: 'chatPostMessage',
                    chatId: chat.chatId,
                    localId: message.localId,
                    crypted: message.crypted,
                    pId: chat.pId,
                    regSign: chat.regSign,
                    async: !message.sync
                }
            });
        },
        chatGetNewMessage: function (chat) {
            return $.ajax(ajaPath, {
                dataType: 'json',
                method:'POST',
                data: {
                    action: 'chatGetNewMessage',
                    chatId: chat.chatId,
                    lastMId: chat.lastMId||0,
                    lastMIdLocalId: chat.mId2LocalIds[chat.lastMId]||''
                }
            });
        }
    };
})(jQuery);
