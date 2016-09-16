(function() {
  'use strict';

  var page = require('webpage').create();
  var args = require('system').args;
  var params = {};
  var regexp = /^([^=]+)=([^$]+)/;

  args.forEach(function(arg) {
    var parts = arg.match(regexp);
    if (!parts) { return; }
    params[parts[1]] = parts[2];
  });

  var usage = "url=<url> path=<filename> width=<width> height=<height> cookiename=<cookiename> sessionid=<sessionid> domain=<domain>";

  if (!params.url || !params.path || !params.cookiename || ! params.sessionid || !params.domain) {
    console.log(usage);
    phantom.exit();
  }

  phantom.addCookie({
    'name': params.cookiename,
    'value': params.sessionid,
    'domain': params.domain
  });

  page.viewportSize = {
    width: params.width || '800',
    height: params.height || '400'
  };

  var tries = 0;

  page.open(params.url, function (status) {
    // console.log('Loading a web page: ' + params.url + ' status: ' + status);

    page.onError = function(msg, trace) {
      var msgStack = ['ERROR: ' + msg];
      if (trace && trace.length) {
        msgStack.push('TRACE:');
        trace.forEach(function(t) {
          msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
        });
      }
      console.error(msgStack.join('\n'));
    };

    function checkIsReady() {
      var panelsRendered = page.evaluate(function() {
        if (!window.angular) { return false; }
        var body = window.angular.element(document.body);
        if (!body.injector) { return false; }
        if (!body.injector()) { return false; }

        var rootScope = body.injector().get('$rootScope');
        if (!rootScope) {return false;}
        var panelsToLoad = window.angular.element('div.panel').length - window.angular.element('div.panel-drop-zone').length;
        return rootScope.panelsRendered >= panelsToLoad;
      });

      if (panelsRendered || tries === 1000) {
        var bb = page.evaluate(function () {
          return document.getElementsByClassName("main-view")[0].getBoundingClientRect();
        });

        page.clipRect = {
          top:    bb.top,
          left:   bb.left,
          width:  bb.width,
          height: bb.height
        };

        page.render(params.path);
        phantom.exit();
      }
      else {
        tries++;
        setTimeout(checkIsReady, 10);
      }
    }

    setTimeout(checkIsReady, 200);
  });
})();
