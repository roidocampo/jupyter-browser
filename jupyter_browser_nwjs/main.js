
function create_main_window() {
    nw.Screen.Init();
    var screen_width = nw.Screen.screens[0]['bounds']['width'];
    var screen_height = nw.Screen.screens[0]['bounds']['height'];
    console.log(screen_width);
    console.log(screen_height);
    console.log(nw.Screen);
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
            newWindow.window.screen_info = {
                width: screen_width,
                height: screen_height
            };
        }
    );
}

create_main_window();
