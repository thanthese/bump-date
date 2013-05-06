var scripts = [ 
    "workflowy-bump.js" 
];

for (var i = 0; i < scripts.length; i++) {
    var script = document.createElement('script');
    script.src = chrome.extension.getURL(scripts[i]);
    script.onload = function() { // dunno what this is for
        this.parentNode.removeChild(this);
    };
    (document.head || document.documentElement).appendChild(script);
}
