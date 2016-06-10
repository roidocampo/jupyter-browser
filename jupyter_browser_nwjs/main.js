
function create_main_window() {
    nw.Window.open(
        "index.html",
        {
            width: 0,
            height: 0,
            frame: false,
            show: true
        },
        function (newWindow) {
            newWindow.window.nw_window = newWindow;
            newWindow.moveTo(-5,0);
            newWindow.resizeTo(1450,900);
            newWindow.show();
        }
    );
}

create_main_window();
