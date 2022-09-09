if (window.require && (!sessionStorage.end_script_run)) {

	sessionStorage.end_script_run = true;

	var TMP_DIR_NAME = '.applocaltmp'

	var	gui = require('nw.gui');
	var win = gui.Window.get();

	var path = require('path');
	var fs = require('fs-extra');

	var datapath = gui.App.dataPath;

	//gui.Window.get().showDevTools();

	var isFile = function(path) {
		try {
			var stats = fs.statSync(path);
			return stats.isFile();
		} catch(e) {
			return null;
		}
	};

	var extend = function(source, toCopy) {

	   var target = source;

	   for (var i in toCopy) {
	    if (toCopy.hasOwnProperty(i)) {
	     target[i] = toCopy[i];
	    }
	   }

	   return target;
	};

	var initialize_splash = function(json, src) {

		var defaults = {
			width: 1920,
			height: 1080,
			minWidth: 480,
			backgroundOpacity: false, 
			src: 'local_extras/splash/video.MvTDKVFm'
		};

		var opts = extend({}, defaults);

		json = json?json:'local_extras/splash/splash.json'

		if (isFile(json)) {
			var data = fs.readFileSync(json);
			var externalOpts = JSON.parse(data);
			opts = extend(opts, externalOpts);
		}

		//console.log(opts);
		src = src?src:opts.src;

		if (!isFile(src)) {
			console.log('No splash file')
			return;
		}

		var width = opts.width;
		var height = opts.height;

		var minWidth = opts.minWidth;
		var screenWidth = win.width;

		while ((width > screenWidth) && (width > minWidth)) {
			width = Math.floor(width / 2);
			height = Math.floor(height / 2);
		}

		var nativeDoc = win.window.document;

		var video = nativeDoc.createElement('VIDEO');
		video.width = width;
		video.height = height;
		video.autoplay = true;
		video.controls = false;
		video.src = src;

		var w = Math.floor((win.width - video.width) / 2);
		var t = Math.floor((win.height - video.height) / 2);
		var divWhite = nativeDoc.createElement('DIV');
		divWhite.style.cssText = 'position: absolute;top: ' + t +'px;left: ' + w + 'px;z-index:1002;overflow: auto;'

		var divBlack = nativeDoc.createElement('DIV');
		var divBlackCssText = 'position: absolute;top: 0%;left: 0%;width: 100%;' 
			+ 'height: 100%;background-color: black;z-index:1001;';

		if (opts.backgroundOpacity) {
			divBlackCssText += '-moz-opacity: 0.8;opacity:.80;filter: alpha(opacity=80);'
		}
		divBlack.style.cssText = divBlackCssText;
		
		divWhite.appendChild(video);

		nativeDoc.body.appendChild(divWhite);
		nativeDoc.body.appendChild(divBlack);

	    var close_lightbox = function(e) {
	    	nativeDoc.body.removeChild(divWhite);
			nativeDoc.body.removeChild(divBlack);
	    };

	    var close_lightbox_timeout = function(e) {
	    	win.window.setTimeout(function() { close_lightbox(e) }, 1 * 1000);
	    };

		var events = ["ended", "abort", "stalled"]
	    for (var i = 0; i<events.length; i++) {	
			video.addEventListener(events[i], close_lightbox_timeout, true);
	    }

		divBlack.addEventListener('click', close_lightbox, true);
		//divWhite.addEventListener('click', close_lightbox, false);
		//video.addEventListener('click', close_lightbox, false);
	};


	initialize_splash();

	var getTemporaryDirName = function(basedir) {
		var tmp = path.join(basedir, TMP_DIR_NAME);
		return tmp;
	};

	var getTemporaryDir = function() {

		var tmp = getTemporaryDirName(datapath);
		//console.log('getTemporaryDir', tmp)

		var stat = fs.ensureDirSync(tmp);
		return tmp;
	};

	var cleanTemporaryDir = function() {

		var tmp = getTemporaryDirName(datapath);
		//console.log('cleanTemporaryDir', tmp)
		var stat = fs.remove(tmp);

		//console.log('cleanTemporaryDir', tmp, stat)
	};

	// Clean the temporary at the start (save disk space)
	cleanTemporaryDir();

	// Clean on close also
	// This functionality is hanging the application, do not execute
	/*
	win.on('close', function() {
		try {
			cleanTemporaryDir();
		} catch(e) {
			// ignore
		}
	});
	*/
	//console.log("temporary dir", getTemporaryDir());

	var useOpenExternal = function(url) {

		var platform = navigator.platform.toString().toLowerCase();
		console.log('platform', platform);

		if (!platform) {
			return false;
		}

		return (platform.search('mac') >= 0);
	};

	win.on('new-win-policy', function (frame, url, policy) {
			
		policy.ignore();

		if (! url) {
			console.log("url is not defined, skip ==> " + url)
			return;
		}
			
		// It is an inline file, save it to disk and open in th SO
		if (url.indexOf("data:") === 0) {
			
			var mime = require('mime');
			var uuid = require('node-uuid');

			var regex = /^data:(.+);(.+),(.*)$/;

			var matches = url.match(regex);
			var mimetype = matches[1];
			var encoding = matches[2];
			var data = matches[3];

			console.log("data to download", mimetype, encoding);

			var buffer = new Buffer(data, encoding);

			var name = uuid.v1();
			var extension = mime.extension(mimetype);
			// macos reports 'application/javascript' as 'text/javascript'
			if (! extension) {
				var newMime = mimetype.replace('text/', 'application/');
				extension = mime.extension(newMime) || 'tmp';
			}

			var filename = path.join(getTemporaryDir(), name + '.' + extension);

			console.log("file to download", name, extension, filename);
			//console.log("It is a data url - downloading ", filename);

			fs.writeFileSync(filename, buffer);

			gui.Shell.openItem(filename);

			return;
		}

		var isExternalUrl = (url.indexOf('http://') == 0) || (url.indexOf('https://') == 0);
		if (isExternalUrl) {
			// External url
			gui.Shell.openExternal(url);
			return;
		}
			
		// On mac, openItem is not working
		if (useOpenExternal(url)) {
			gui.Shell.openExternal(url);
		} else {
			gui.Shell.openItem(url);
		}
	});
	
	
	// After everything is processed, install a global error handler
	// This is not the better idea (See https://github.com/rogerwang/node-webkit/issues/1699),
	// but should work for our case
	if (process) {
		process.on("uncaughtException", function(e) { console.error(e); });
	}
}
