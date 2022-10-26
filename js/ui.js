/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var ui = (function ($) {
    var currentHash = 0;
    var window_focus = true;

    $(window).focus(function() {
        window_focus = true;
    })
    .blur(function() {
        window_focus = false;
    });
   
    $('[data-vkeyboard-icon]').each(function (ind, el) {
        var $el = $(el);
        var ofId = $el.data('pos');
        var $of = ofId ? $('#' + ofId) : null;
        $el.keyboard({
        // *** choose layout & positioning ***
        // choose from 'qwerty', 'alpha',
        // 'international', 'dvorak', 'num' or 
        // 'custom' (to use the customLayout below)
        layout: 'qwerty',
        customLayout: {
            'default': [
                'd e f a u l t',
                '{meta1} {meta2} {accept} {cancel}'
                ],
            'meta1': [
                'm y m e t a 1',
                '{meta1} {meta2} {accept} {cancel}'
                ],
            'meta2': [
                'M Y M E T A 2',
                '{meta1} {meta2} {accept} {cancel}'
                ]
        },
        // Used by jQuery UI position utility
        position: {
            // null = attach to input/textarea;
            // use $(sel) to attach elsewhere
            of: $of, 
            my: 'center top',
            at: 'center top',
            // used when "usePreview" is false
            at2: 'center bottom'
        },

        // true: preview added above keyboard;
        // false: original input/textarea used
        usePreview: true,

        // if true, the keyboard will always be visible
        alwaysOpen: false,

            // give the preview initial focus when the keyboard
        // becomes visible
            initialFocus : true,

        // if true, keyboard will remain open even if
        // the input loses focus.
        stayOpen: false,

        // *** change keyboard language & look ***
        display: {
            'meta1' : '\u2666', // Diamond
            'meta2' : '\u2665', // Heart
            // check mark (accept)
            'a'     : '\u2714:Accept (Shift-Enter)',
            'accept': 'Accept:Accept (Shift-Enter)',
            'alt'   : 'AltGr:Alternate Graphemes',
            // Left arrow (same as &larr;)
            'b'     : '\u2190:Backspace',
            'bksp'  : 'Bksp:Backspace',
            // big X, close/cancel
            'c'     : '\u2716:Cancel (Esc)',
            'cancel': 'Cancel:Cancel (Esc)',
            // clear num pad
            'clear' : 'C:Clear',
            'combo' : '\u00f6:Toggle Combo Keys',
            // num pad decimal '.' (US) & ',' (EU)
            'dec'   : '.:Decimal',
            // down, then left arrow - enter symbol
            'e'     : '\u21b5:Enter',
            'enter' : 'Enter:Enter',
            // left arrow (move caret)
            'left'   : '\u2190',
            'lock'  : '\u21ea Lock:Caps Lock',
            'next'   : 'Next \u21e8',
            'prev'   : '\u21e6 Prev',
            // right arrow (move caret)
            'right'  : '\u2192',
            // thick hollow up arrow
            's'     : '\u21e7:Shift',
            'shift' : 'Shift:Shift',
            // +/- sign for num pad
            'sign'  : '\u00b1:Change Sign',
            'space' : ' :Space',
            // right arrow to bar
            // \u21b9 is the true tab symbol
            't'     : '\u21e5:Tab',
            'tab'   : '\u21e5 Tab:Tab'
        },

        // Message added to the key title while hovering,
        // if the mousewheel plugin exists
        wheelMessage: 'Use mousewheel to see other keys',

        css : {
            // input & preview
            input          : 'ui-widget-content ui-corner-all',
            // keyboard container
            container      : 'ui-widget-content ui-widget ui-corner-all ui-helper-clearfix', 
            // default state
            buttonDefault  : 'ui-state-default ui-corner-all',
            // hovered button
            buttonHover    : 'ui-state-hover',
            // Action keys (e.g. Accept, Cancel, Tab, etc);
            // this replaces "actionClass" option
            buttonAction   : 'ui-state-active',
            // used when disabling the decimal button {dec}
            // when a decimal exists in the input area
            buttonDisabled : 'ui-state-disabled'
            },

        // *** Useability ***
        // Auto-accept content when clicking outside the
        // keyboard (popup will close)
        autoAccept: true,

        // Prevents direct input in the preview window when true
        lockInput: false,

        // Prevent keys not in the displayed keyboard from being
        // typed in
        restrictInput: false,

        // Check input against validate function, if valid the
        // accept button is clickable; if invalid, the accept
        // button is disabled.
        acceptValid  : true,

        // if acceptValid is true & the validate function returns
        // a false, this option will cancel a keyboard close only
        // after the accept button is pressed
            cancelClose  : true,

        // tab to go to next, shift-tab for previous
        // (default behavior)
        tabNavigation: false,

        // enter for next input; shift-enter accepts content &
        // goes to next shift + "enterMod" + enter ("enterMod"
        // is the alt as set below) will accept content and go
        // to previous in a textarea
        enterNavigation : false,
        // mod key options: 'ctrlKey', 'shiftKey', 'altKey',
        // 'metaKey' (MAC only)
        // alt-enter to go to previous;
        // shift-alt-enter to accept & go to previous
        enterMod : 'altKey',

        // if true, the next button will stop on the last
        // keyboard input/textarea; prev button stops at first
        // if false, the next button will wrap to target the
        // first input/textarea; prev will go to the last
            stopAtEnd : true,

        // Set this to append the keyboard immediately after the
        // input/textarea it is attached to. This option works
        // best when the input container doesn't have a set width
        // and when the "tabNavigation" option is true
        appendLocally: false,

        // If false, the shift key will remain active until the
        // next key is (mouse) clicked on; if true it will stay
        // active until pressed again
        stickyShift  : true,

        // Prevent pasting content into the area
        preventPaste: false,

            // caret places at the end of any text
            caretToEnd   : false,

        // Set the max number of characters allowed in the input,
        // setting it to false disables this option
        maxLength: false,

        // Mouse repeat delay - when clicking/touching a virtual
        // keyboard key, after this delay the key will start
        // repeating
        repeatDelay  : 500,

        // Mouse repeat rate - after the repeatDelay, this is the
        // rate (characters per second) at which the key is
        // repeated. Added to simulate holding down a real keyboard
        // key and having it repeat. I haven't calculated the upper
        // limit of this rate, but it is limited to how fast the
        // javascript can process the keys. And for me, in Firefox,
        // it's around 20.
        repeatRate   : 20,   

        // resets the keyboard to the default keyset when visible
        resetDefault : false,

        // Event (namespaced) on the input to reveal the keyboard.
        // To disable it, just set it to ''.
        openOn: '',

        // Event (namepaced) for when the character is added to the
        // input (clicking on the keyboard)
        keyBinding: 'mousedown',

        // combos (emulate dead keys)
        // if user inputs `a the script converts it to à,
        // ^o becomes ô, etc.
        useCombos: true,
        // if you add a new combo, you will need to update the
        // regex below
        combos: {
             // uncomment out the next line, then read the Combos
            //Regex section below
            // '<': { 3: '\u2665' }, // turn <3 into ♥ - change regex below
            'a': { e: "\u00e6" }, // ae ligature
            'A': { E: "\u00c6" },
            'o': { e: "\u0153" }, // oe ligature
            'O': { E: "\u0152" }
        },

        // *** Methods ***
        // Callbacks - attach a function to any of these
        // callbacks as desired
        initialized : function(e, keyboard, el) {},
        visible     : function(e, keyboard, el) {},
        change      : function(e, keyboard, el) {},
        beforeClose : function(e, keyboard, el, accepted) {},
        accepted    : function(e, keyboard, el) {},
        canceled    : function(e, keyboard, el) {},
        hidden      : function(e, keyboard, el) {},

        // called instead of base.switchInput
        // Go to next or prev inputs
        // goToNext = true, then go to next input;
        //   if false go to prev
        // isAccepted is from autoAccept option or 
        //   true if user presses shift-enter
        switchInput : function(keyboard, goToNext, isAccepted) {},

        // this callback is called just before the "beforeClose"
        // to check the value if the value is valid, return true
        // and the keyboard will continue as it should (close if
        // not always open, etc)
        // if the value is not value, return false and the clear
        // the keyboard value ( like this
        // "keyboard.$preview.val('');" ), if desired
        validate    : function(keyboard, value, isClosing) { return true; }

    });
    
        $('#' + $el.data('vkeyboard-icon')).click(function() {
            $el.getkeyboard().reveal();
        });
    });
    var deferredUrlChanges = {};
    function clearDeferredUrlChanges() {
        for (var i in deferredUrlChanges) {
            if (!deferredUrlChanges.hasOwnProperty(i)) {
                continue;
            }
            clearTimeout(i);
        }
        deferredUrlChanges = {};
    }

    function clearDeferredUrlChange(i) {
        if (deferredUrlChanges[i]) {
            delete deferredUrlChanges[i];
            clearTimeout(i);
        }
    }
    
    return {
        defaultPage: 'create_message',
        replaceUrl: function (url) {
            clearDeferredUrlChanges();
            if (!url) {
                url = "";
            }
            var hashPos = url.indexOf('#'), hash = '';
            if (hashPos !== -1) {
                hash = url.substr(hashPos + 1);
            }
            if (!hash) {
                hash = ui.defaultPage;
            }
            currentHash = hash;
            var newUri = hash === ui.defaultPage ? "" : ('#' + hash);
            location.hash = newUri || "#";
            if (history && history.pushState) {
                try
                {
                    history.pushState(null, "", newUri || "./");
                }catch(E){}
            }
        },
        setPageFromUrl: function (url, forceEvents) {
            if (!url) {
                url = "";
            }
            var hashPos = url.indexOf('#'), hash = '';
            if (hashPos !== -1) {
                hash = url.substr(hashPos + 1);
            }
            if (!hash) {
                hash = ui.defaultPage;
            }
            
            if (hash === currentHash && !forceEvents) {
                return;
            }
            $('html,body').scrollTop(0);
            clearDeferredUrlChanges();
            
            currentHash = hash;
            
            hashPos = hash.indexOf('/');

            var pageName = hash;
            if (hashPos !== -1) {
                pageName = hash.substr(0, hashPos);
            }

            var $active = $('[data-page]').find(':visible');
            $active.trigger('my-deactivate');
            $('.autoclean').each(function() {
                if (this.type.toLowerCase() === 'checkbox') {
                    $(this).prop('checked', this.defaultChecked).change();
                    return;
                }

                $(this).val(this.defaultValue || $(this).find('option[selected]').val());
            });
            util.deleteAllBlobs();
            $('[data-page]').hide();

            $active = $('[data-page=\'' + pageName + '\']');
            document.title = $active.data('title') || 'Security service';
            $active.show();
            $active.trigger('my-activate');

            /*if ($('[data-page=\'' + pageName + '\']').is(':visible')) {
                return;
            }*/ //This prevents from working urls like #faq/c

            if (pageName !== hash) {
                currentHash = pageName;
                
               if (location.replace) {
                    location.replace('#' + pageName);
                } else {
                    location.hash = '#' + pageName;
                }
                var h = setTimeout(function () {
                    clearDeferredUrlChange(h);
                    currentHash = hash;
                    if (location.replace) {
                        location.replace('#' + currentHash);
                    } else {
                        location.hash = '#' + currentHash;
                    }
                    //console.log('going slow to ' + hash);
                }, 0);
                deferredUrlChanges[h] = 1;
            }
        },
        getNikColor: function(totalCount, index) {
            var s3 = Math.ceil(Math.pow(totalCount * 1.7, 1.0/3));
            for (var i = 0; i < s3; i++) {
                for (var j = 0; j < s3; j++){
                    for (var k = 0; k < s3; k++) {
                        if (i+j+k < s3) {
                            continue;
                        }
                       if (!index--) {
                            s3--;
                            var ret = 'rgb(' + ((50*i/s3)|0 + 200) +',' + ((50*j/s3)|0+200) + ',' + ((50*k/s3)|0+200) + ')';
                            return ret;
                        }
                    }
                }
            }
        },
        initFilesSupport: function($block) {
            var messageFiles = [];
            $block.data('message-files', messageFiles);
            $block.data('clear-files', clearFiles);
            $(window).one('beforeunload', clearFiles);

            function clearFiles() {
                messageFiles.length = 0;
                setFilesUI();
            }

            function setFilesUI() {
                checkShowFilesWarning();
                var $tbl = $('<table/>');

                for (var i = 0; i < messageFiles.length; i++) {
                    var $tr = $('<tr/>'), f = messageFiles[i];
                    $tr.append($('<td/>').text(f.file.name));
                    $tr.append($('<td/>').text(util.formatFileSize(f.file.size)));
                    $tr.append(
                            $('<td/>').append(
                                    $('<a/>').attr('href', '#').text('Remove').data('message-file', f).click(onRemoveFileClick)
                                            )
                            );
                    $tbl.append($tr);
                    $tr.append($('<td/>').text(f.status === 1 ? 'loading..' : ''));
                }
                $block.find("[data-hf='divFiles']").show().empty().append($tbl);
                $block.change();
            }

            function onRemoveFileClick(ev) {
                ev.preventDefault();
                if (!confirm('Remove this file?')) return;
                var mf = $(this).data('message-file');

                for (var i = 0; i < messageFiles.length; i++) {
                    if (messageFiles[i] !== mf) continue;
                    messageFiles.splice(i, 1);
                    break;
                }
                setFilesUI();
            }

            $(function () {
                $block.find("[data-hf='fileInput']").change(onFileInputChange);
            });

            function onFileInputChange() {
                var fs = this.files;

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
                    if (totalSize > max_half_message_size) {
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
                var $newFile = $block.find("[data-hf='fileInput']").clone();
                $newFile.val('');
                $block.find("[data-hf='fileInput']").replaceWith($newFile);
                $block.find("[data-hf='fileInput']").change(onFileInputChange);
                setFilesUI();
            }

            function checkShowFilesWarning() {
                // Check for the various File API support.
                if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
                    $block.find("[data-hf='divFilesWarning']").show().text('Your browser does not support File API.');
                    $block.find("[data-hf='divFilesParent']").hide();
                    return false;
                }
                // Check selected encryption algorithm
                //Enabled vernam files support
                /*if ($('#emethod').val() == 'v') {
                  $('#divFilesWarning').show().text('Vernam algorythm is not supported for files!');
                  $('#divFilesParent').hide();
                  return false;
                }*/

                $block.find("[data-hf='divFilesWarning']").hide();
                $block.find("[data-hf='divFilesParent']").show();
                return true;
            }

            function gotFile(file, data) {
                var u8Arr = new Uint8Array(data);
                var arr = new Clipperz.ByteArray();
                for (var i=0; i < u8Arr.length; i++) { //TODO:make new type to implement same as ByteArray functionally to use less memory?
                    arr.appendByte(u8Arr[i]);
                }

                for (var i = 0; i < messageFiles.length; i++)
                {
                    var mf = messageFiles[i];
                    if (mf.file !== file) continue;
                    mf.state = 2;
                    mf.arr = arr;
                    break;
                }
                setFilesUI();
            }
            return {
              getFiles: function () {
                  return messageFiles;
              }
            };
        },
        isWindowFocused: function () {
            return window_focus;
        },
        onWindowFocused: function(func) {
            $(window).focus(func);
        },
        onWindowBlured: function(func) {
            $(window).blur(func);
        },
        showBusy: function() {
            $("#busy").show();
        }, 
        hideBusy: function() {
            $("#busy").hide();
        }
    };
    $(window).bind('beforeunload', function() {
        $('.autoclean').each(function() {
            if (this.type.toLowerCase() === 'checkbox') {
                $(this).prop('checked', this.defaultChecked).change();
                return;
            }

            $(this).val(this.defaultValue || $(this).find('option[selected]').val());
        });
        util.deleteAllBlobs();
        var $active = $('[data-page]').find(':visible');
        $active.trigger('my-deactivate');
    });
})(jQuery);