//// To connect skewer to workflowy:
//
// 1. M-x js2-mode
//
// 2. M-x httpd-start
//
// 3. Run this bookmarklet on http://workflowy.com
//
//    javascript:(function(){var d=document;var s=d.createElement('script');s.src='http://localhost:8080/skewer';d.body.appendChild(s);})()
//
// 4. In chrome, click shield in address bar to allow running insecure
//    content on site.

// main workflowy-bump namespace
var wfb = {}; 

////////////////////////////////////////////////////////////////////////////////
// date bumping logic

wfb._bumpText = function(text) {
    return "??" + text + "!!";
};

////////////////////////////////////////////////////////////////////////////////
// interface with workflowy

// workspace for interfacing with workflowy's code
wfb.workflowy = {}; 

wfb.workflowy.BUMP_SHORTCUT = "ctrl+w";

wfb.workflowy.bindShortcuts = function() {
    $(".editor > textarea").unbind(".wfb"); // don't attach multiple times
    $(".editor > textarea").bind("keydown.wfb", 
                                 wfb.workflowy.BUMP_SHORTCUT, 
                                 wfb.workflowy._bumpTextArea);
};

wfb.workflowy._bumpTextArea = function() {
    undoredo.startOperationBatch();
    var textarea = $(this).getProject().getName().children(".content");
    textarea.setContent(wfb._bumpText(textarea.getContentText()));
    textarea.moveCursorToBeginning();
    undoredo.finishOperationBatch();
};

////////////////////////////////////////////////////////////////////////////////
// load

wfb.workflowy.bindShortcuts();
