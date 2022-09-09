if (window.require && (!sessionStorage.start_script_run)) {

	sessionStorage.start_script_run = true;

	var	gui = require('nw.gui');
	var win = gui.Window.get();
	win.maximize();

	//gui.Window.get().showDevTools();
}
