
//////////////////////////////////////////////////////////////////////
// Tab List Object
//////////////////////////////////////////////////////////////////////

function TabList() {
    this.shown_tab = undefined;
    this.tabs = [];
    setInterval(this.update_titles.bind(this), 500);
}

TabList.prototype.add = function(tab) {
    this.tabs.push(tab);
};

TabList.prototype.remove = function(tab) {
    var i = this.tabs.indexOf(tab);
    if (i >= 0) {
        this.tabs.splice(i,1);
    }
};

TabList.prototype.update_titles = function() {
    for (let tab of this.tabs)
        tab.update_title();
};

TabList.prototype.close_current = function() {
    if (this.shown_tab)
        this.shown_tab.close();
};

TabList.prototype.force_close_current = function() {
    if (this.shown_tab)
        this.shown_tab.close(true);
};

TabList.prototype.show_by_num = function(num) {
    var tab = this.tabs[num-1];
    if (tab)
        tab.show();
};

var tab_list = new TabList();

//////////////////////////////////////////////////////////////////////
// Tab Objects
//////////////////////////////////////////////////////////////////////

function Tab(url, is_home, window_to_attach=undefined) {
    this.orig_url = url;
    this.is_home = is_home;
    if (url.match(/.*notebook.*/))
        this.is_notebook = true;
    else
        this.is_notebook = false;
    this.title = undefined;
    this.window_to_attach = window_to_attach;
    this.setup_done = false;
    this.setup1();
}

Tab.prototype.setup1 = function() {
    this.webview = document.createElement("webview");
    console.log(this.orig_url);
    this.webview.setAttribute("tabindex", "-1");
    this.webview.setAttribute("src", this.orig_url);
    document.getElementById("container").appendChild(this.webview);
    // if (this.window_to_attach) {
    //     this.window_to_attach.attach(this.webview);
    // }
    this.webview.addEventListener("loadstop", this.setup2.bind(this));
};

Tab.prototype.setup2 = function() {
    if (this.setup_done)
        return;
    this.setup_done = true;

    this.setup_header_toggle();
    this.setup_messaging();

    this.webview.addEventListener("close", this.close.bind(this));
    this.webview.addEventListener("newwindow", this.newwindow.bind(this));

    this.menu_div = document.createElement("div");
    this.menu_div.classList.add("menuentry");
    document.getElementById("bar").appendChild(this.menu_div);
    this.menu_div.addEventListener("click", this.show.bind(this));

    this.update_title();
    this.show();
    tab_list.add(this);
};

Tab.prototype.setup_header_toggle = function() {
    inject_css(this.webview, ''
        + '.hidden-header {'
        + '   height: 0;'
        + '   display: none !important;'
        + '}'
    );
};

Tab.prototype.setup_messaging = function() {
    var that = this;
    var wv = this.webview;
    inject_script(wv, ''
        +  'var messageSource, messageOrigin;'
        +  'addEventListener("message", function(e) {'
        +  '    messageSource = e.source;'
        +  '    messageOrigin = e.origin;'
        +  '});'
        +  'window.close = function() {'
        +  '    messageSource.postMessage("close", messageOrigin);'
        +  '};'
    );
    addEventListener('message', function(e) {
        if (e.source != wv.contentWindow)
            return;
        if (e.data == "close")
            that.close(true);
    });
    wv.contentWindow.postMessage('hello, webpage!', '*');
};

Tab.prototype.hide = function() {
    if (tab_list.shown_tab == this)
        tab_list.shown_tab = undefined;
    this.webview.classList.remove("top");
    this.menu_div.classList.remove("top");
};

Tab.prototype.show = function() {
    if (tab_list.shown_tab) {
        if (tab_list.shown_tab == this)
            return;
        else
            tab_list.shown_tab.hide();
    }
    this.webview.classList.add("top");
    this.menu_div.classList.add("top");
    this.update_notebook_list();
    this.webview.focus();
    tab_list.shown_tab = this;
};

Tab.prototype.update_notebook_list = function() {
    if (this.is_home) {
        inject_script(this.webview, 'Jupyter.notebook_list.load_sessions();');
    }
};

Tab.prototype.close = function(force) {
    if (!force && this.is_notebook) {
        inject_script(this.webview, '$("#kill_and_exit").click();');
        return;
    }
    tab_list.remove(this);
    if (tab_list.tabs.length > 0) {
        var new_tab = tab_list.tabs[0];
        new_tab.show();
    }
    this.hide();
    document.getElementById("container").removeChild(this.webview);
    document.getElementById("bar").removeChild(this.menu_div);
};

Tab.prototype.newwindow = function(e) {
    e.preventDefault();
    load_tab(e.targetUrl, false, e.window);
};

Tab.prototype.update_title = function() {
    var that = this;
    this.webview.executeScript(
        { code: "document.title" },
        function (x) {
            that.title = x[0];
            that.menu_div.textContent = x[0];
        }
    );
};

//////////////////////////////////////////////////////////////////////
// inject_script and inject_css
//////////////////////////////////////////////////////////////////////

function inject_aux(tag, field, wv, data) {
    wv.executeScript(
        { code:   "(function(){"
                + "var script = document.createElement('"
                + tag
                + "');"
                + "script." + field + " = '"
                + data
                + "';"
                + "document.head.appendChild(script);"
                + "})()"
        },
        function (x) { return x; }
    );
}

function inject_script(wv, script) {
    inject_aux('script', 'text', wv, script);
}

function inject_css(wv, script) {
    inject_aux('style', 'innerHTML', wv, script);
}

//////////////////////////////////////////////////////////////////////
// load_tab
//////////////////////////////////////////////////////////////////////

function load_tab(url, is_home=true, window_to_attach=undefined) {
    if (url == "about:blank" && window_to_attach != undefined) {
        intercept_redirect(window_to_attach);
        return;
    }
    for (let tab of tab_list.tabs) {
        if (tab.orig_url == url) {
            tab.show();
            return tab;
        }
    }
    return new Tab(url, is_home, window_to_attach);
}

function intercept_redirect(window_obj) {
    var proxy_webview = document.createElement('webview');
    proxy_webview.classList.add("proxy");
    document.body.appendChild(proxy_webview);

    var onBeforeRequestListener = function(e) {
        if (e.type === "main_frame" && e.url !== 'about:blank') {
            document.body.removeChild(proxy_webview);
            load_tab(e.url, false);
            return { cancel: true };
        } else {
            return { cancel: false };
        }
    };
    proxy_webview.request.onBeforeRequest.addListener(
            onBeforeRequestListener,
            { urls: [ "*://*/*" ] },
            [ 'blocking' ]
            );
    window_obj.attach(proxy_webview);
}

//////////////////////////////////////////////////////////////////////
// Menu setup 
//////////////////////////////////////////////////////////////////////

var mb = new nw.Menu({ type: "menubar" });
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
    click : tab_list.close_current.bind(tab_list)
}));

submenu.append(new nw.MenuItem({
    label : "Force Close Tab",
    key : "w",
    modifiers : "cmd+shift",
    click : tab_list.force_close_current.bind(tab_list)
}));

submenu.append(new nw.MenuItem({
    label : "Open Default Tab",
    key : "o",
    modifiers : "cmd",
    click : function() {
        load_tab("http://localhost:8888/tree");
    }
}));

var subsubmenu = new nw.Menu();

for (var n=1; n<=9; ++n) {
    subsubmenu.append(new nw.MenuItem({
        label : "Go To Tab " + n,
        key : n.toString(),
        modifiers: 'cmd',
        click : (function(n){ return function() {
            tab_list.show_by_num(n);
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
        if (tab_list.shown_tab) {
            inject_script(
                tab_list.shown_tab.webview,
                '$("#header").toggleClass("hidden-header");'
                + 'Jupyter.menubar.events.trigger("resize-header.Page");'
            );
        }
    }
}));

submenu.append(new nw.MenuItem({
    type : "separator"
}));

submenu.append(new nw.MenuItem({
    label : "Toogle Full Screen",
    key : "Y",
    modifiers : "cmd",
    click : toggle_maximized
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
        if (tab_list.shown_tab)
            tab_list.shown_tab.webview.showDevTools(true);
    }
}));

mb.insert(new nw.MenuItem({
    label : "Tab",
    submenu : submenu
}), 1);

nw.Window.get().menu = mb;

//////////////////////////////////////////////////////////////////////
// Window sizing
//////////////////////////////////////////////////////////////////////

var window_info = {
    state: "init",
    x: 65,
    y: 35,
    width: 1200,
    height: 1400
};

function toggle_maximized() {
    var save_window_info = true;
    if (window_info.state == "init") {
        if (screen_info.width > 1500) {
            save_window_info = false;
            window_info.state = "maximized";
        } else {
            window_info.state = "normal";
        }
    }
    if (window_info.state == "normal") {
        if (save_window_info) {
            window_info.x = nw_window.x;
            window_info.y = nw_window.y;
            window_info.width = nw_window.width;
            window_info.height = nw_window.height;
        }
        nw_window.moveTo(-5,0);
        nw_window.resizeTo(screen_info.width + 10, screen_info.height);
        nw_window.window.document.body.classList.add("maximized");
        window_info.state = "maximized";
    }
    else if (window_info.state == "maximized") {
        nw_window.moveTo(window_info.x, window_info.y);
        nw_window.resizeTo(window_info.width, window_info.height);
        nw_window.window.document.body.classList.remove("maximized");
        window_info.state = "normal";
    }
}

//////////////////////////////////////////////////////////////////////
// Global Events
//////////////////////////////////////////////////////////////////////

nw.App.on('open', function(url) {
    load_tab(url);
});

nw_window.on("close", function() {
    var msg = "Some notebooks are still opened. "
            + "Are you sure you want to quit?";
    if (tab_list.tabs.length > 0)
        if (!confirm(msg))
            return;
    this.close(true);
});

nw_window.on("focus", function() {
    if (tab_list.shown_tab) {
        tab_list.shown_tab.webview.focus();
    }
});

window.onload = function() {
    toggle_maximized();
    nw_window.show();
    for (let url of nw.App.argv) {
        load_tab(url);
    }
};
