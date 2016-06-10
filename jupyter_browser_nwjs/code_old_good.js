
var tabs = {
    count: 0,
    current_id: undefined,
    current: undefined
};

function load_webpage(url, is_tree=false) {
    var wv_id = tabs.count + 1;
    ++tabs.count;
    var wv = document.createElement("webview");
    wv.setAttribute("src", url);
    wv.orig_url = url;
    wv.is_tree = is_tree;
    wv.menu_div = document.createElement("div");
    wv.menu_div.classList.add("menuentry");
    document.getElementById("container").appendChild(wv);
    document.getElementById("bar").appendChild(wv.menu_div);
    tabs[wv_id] = wv;
    wv.addEventListener("newwindow", function(e) {
        for (old_wv_id=1; old_wv_id<=tabs.count; ++old_wv_id) {
            if (tabs[old_wv_id]) {
                var old_wv = tabs[old_wv_id];
                if (old_wv.orig_url == e.targetUrl) {
                    if (tabs.current) {
                        if (tabs.current == old_wv) return;
                        tabs.current.classList.remove("top");
                        tabs.current.menu_div.classList.remove("top");
                    }
                    tabs.current = old_wv;
                    tabs.current_id = old_wv_id;
                    old_wv.classList.add("top");
                    old_wv.menu_div.classList.add("top");
                    return;
                }
            }
        }
        load_webpage(e.targetUrl);
    });
    wv.addEventListener("loadstop", function() {
        if (tabs.current) {
            tabs.current.classList.remove("top");
            tabs.current.menu_div.classList.remove("top");
        }
        tabs.current = wv;
        tabs.current_id = wv_id;
        wv.classList.add("top");
        wv.menu_div.classList.add("top");
    });
    wv.addEventListener("close", function() {
        close_webview(wv, wv_id);
    });
    wv.menu_div.addEventListener("click", function() {
        if (tabs.current) {
            if (tabs.current == wv) return;
            tabs.current.classList.remove("top");
            tabs.current.menu_div.classList.remove("top");
        }
        tabs.current = wv;
        tabs.current_id = wv_id;
        wv.classList.add("top");
        wv.menu_div.classList.add("top");
    });
}

function close_webview(wv, wv_id) {
    wv.classList.remove("top");
    wv.menu_div.classList.remove("top");
    if (tabs.current == wv) {
        for (var new_wv_id=1; new_wv_id<=tabs.count; ++new_wv_id) {
            if (new_wv_id == wv_id) {
                continue;
            }
            var new_wv = tabs[new_wv_id];
            if (new_wv) {
                tabs.current.classList.remove("top");
                tabs.current.menu_div.classList.remove("top");
                tabs.current = new_wv;
                tabs.current_id = new_wv_id;
                new_wv.classList.add("top");
                new_wv.menu_div.classList.add("top");
                break;
            }
        }
    }
    delete tabs[wv_id];
    document.getElementById("container").removeChild(wv);
    document.getElementById("bar").removeChild(wv.menu_div);
}

function update_one_title(wv_id) {
    var wv = tabs[wv_id];
    if (wv) {
        wv.executeScript(
            { code: "document.title" }, 
            function (x) { 
                wv.title = x[0]; 
                wv.menu_div.textContent = x[0]; 
            }
        );
    }
}

function update_titles() {
    for (var wv_id=1; wv_id<=tabs.count; ++wv_id) {
        update_one_title(wv_id);
    }
}

setInterval(update_titles, 500);

function close_current_webview() {
    if (tabs.current)
        close_webview(tabs.current, tabs.current_id);
}

function focus_tab_by_num(n) {
    var c = 0;
    var wv_id;
    var wv = undefined;
    for (wv_id=1; wv_id<=tabs.count; ++wv_id) {
        if (tabs[wv_id]) {
            ++c;
            if (n == c) {
                wv = tabs[wv_id];
                break;
            }
        }
    }
    if (wv) {
        if (tabs.current) {
            if (tabs.current == wv) return;
            tabs.current.classList.remove("top");
            tabs.current.menu_div.classList.remove("top");
        }
        tabs.current = wv;
        tabs.current_id = wv_id;
        wv.classList.add("top");
        wv.menu_div.classList.add("top");
    };
}

// nw.App.registerGlobalHotKey(new nw.Shortcut({
//     key : "Command+W",
//     active : close_current_webview
// }));

var mb = new nw.Menu({type:"menubar"});
mb.createMacBuiltin("Jupyter Browser");

mb.removeAt(2);

mb.items[0].submenu.removeAt(2);
mb.items[0].submenu.removeAt(2);
mb.items[0].submenu.removeAt(2);

var submenu = new nw.Menu();

submenu.append(new nw.MenuItem({
    label : "Close Tab",
    key : "w",
    modifiers : "cmd",
    click : close_current_webview
}));

submenu.append(new nw.MenuItem({
    label : "Open Default Tab",
    key : "o",
    modifiers : "cmd",
    click : function() {
        load_webpage("http://localhost:8888/tree", true);
    }
}));

var subsubmenu = new nw.Menu();

for (var n=1; n<=9; ++n) {
    subsubmenu.append(new nw.MenuItem({
        label : "Go To Tab " + n,
        key : n.toString(),
        modifiers: 'cmd',
        click : (function(n){ return function() {
            console.log(["Command+"+n, n]);
            focus_tab_by_num(n);
        };})(n),
    }));
}

submenu.append(new nw.MenuItem({
    label : "Go To Tab",
    submenu : subsubmenu
}));

submenu.append(new nw.MenuItem({
    type : "separator"
}));

submenu.append(new nw.MenuItem({
    label : "Toogle Notebook Menu",
    key : "`",
    modifiers : "cmd",
    click : function() {
        if (tabs.current) {
            tabs.current.classList.toggle('nomenu');
        }
    }
}));

submenu.append(new nw.MenuItem({
    type : "separator"
}));

submenu.append(new nw.MenuItem({
    label : "Show Developer Tools",
    key : "i",
    modifiers : "cmd+alt",
    click : function() {
        nw.Window.get().showDevTools();
    }
}));

submenu.append(new nw.MenuItem({
    label : "Show Developer Tools of Tab",
    key : "i",
    modifiers : "cmd+alt+shift",
    click : function() {
        if (tabs.current)
            tabs.current.showDevTools(true);
    }
}));

mb.insert(new nw.MenuItem({
    label : "Tab",
    submenu : submenu
}), 1);

nw.Window.get().menu = mb;

// for (var n=1; n<=9; ++n) {
//     nw.App.registerGlobalHotKey(new nw.Shortcut({
//         key : "Command+" + n,
//         active : (function(n){ return function() {
//             console.log(["Command+"+n, n]);
//             focus_tab_by_num(n);
//         };})(n),
//     }));
// }

nw.App.on('open', function(url) {
    load_webpage(url, true);
});

nw_window.on("close", function() {
    for (var wv_id=1; wv_id<=tabs.count; ++wv_id) {
        if (tabs[wv_id]) {
            if (confirm("Some notebooks are still opened. Are you sure you want to quit?")) 
                break;
            else
                return;
        }
    }
    this.close(true);
});

window.onload = function() {
    for (let url of nw.App.argv) {
        load_webpage(url, true);
    }
};
