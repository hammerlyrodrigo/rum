(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))

},{"_process":2}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
/*!
 * mime-types
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

var db = require('mime-db')
var extname = require('path').extname

/**
 * Module variables.
 * @private
 */

var extractTypeRegExp = /^\s*([^;\s]*)(?:;|\s|$)/
var textTypeRegExp = /^text\//i

/**
 * Module exports.
 * @public
 */

exports.charset = charset
exports.charsets = { lookup: charset }
exports.contentType = contentType
exports.extension = extension
exports.extensions = Object.create(null)
exports.lookup = lookup
exports.types = Object.create(null)

// Populate the extensions/types maps
populateMaps(exports.extensions, exports.types)

/**
 * Get the default charset for a MIME type.
 *
 * @param {string} type
 * @return {boolean|string}
 */

function charset(type) {
  if (!type || typeof type !== 'string') {
    return false
  }

  // TODO: use media-typer
  var match = extractTypeRegExp.exec(type)
  var mime = match && db[match[1].toLowerCase()]

  if (mime && mime.charset) {
    return mime.charset
  }

  // default text/* to utf-8
  if (match && textTypeRegExp.test(match[1])) {
    return 'UTF-8'
  }

  return false
}

/**
 * Create a full Content-Type header given a MIME type or extension.
 *
 * @param {string} str
 * @return {boolean|string}
 */

function contentType(str) {
  // TODO: should this even be in this module?
  if (!str || typeof str !== 'string') {
    return false
  }

  var mime = str.indexOf('/') === -1
    ? exports.lookup(str)
    : str

  if (!mime) {
    return false
  }

  // TODO: use content-type or other module
  if (mime.indexOf('charset') === -1) {
    var charset = exports.charset(mime)
    if (charset) mime += '; charset=' + charset.toLowerCase()
  }

  return mime
}

/**
 * Get the default extension for a MIME type.
 *
 * @param {string} type
 * @return {boolean|string}
 */

function extension(type) {
  if (!type || typeof type !== 'string') {
    return false
  }

  // TODO: use media-typer
  var match = extractTypeRegExp.exec(type)

  // get extensions
  var exts = match && exports.extensions[match[1].toLowerCase()]

  if (!exts || !exts.length) {
    return false
  }

  return exts[0]
}

/**
 * Lookup the MIME type for a file path/extension.
 *
 * @param {string} path
 * @return {boolean|string}
 */

function lookup(path) {
  if (!path || typeof path !== 'string') {
    return false
  }

  // get the extension ("ext" or ".ext" or full path)
  var extension = extname('x.' + path)
    .toLowerCase()
    .substr(1)

  if (!extension) {
    return false
  }

  return exports.types[extension] || false
}

/**
 * Populate the extensions and types maps.
 * @private
 */

function populateMaps(extensions, types) {
  // source preference (least -> most)
  var preference = ['nginx', 'apache', undefined, 'iana']

  Object.keys(db).forEach(function forEachMimeType(type) {
    var mime = db[type]
    var exts = mime.extensions

    if (!exts || !exts.length) {
      return
    }

    // mime -> extensions
    extensions[type] = exts

    // extension -> mime
    for (var i = 0; i < exts.length; i++) {
      var extension = exts[i]

      if (types[extension]) {
        var from = preference.indexOf(db[types[extension]].source)
        var to = preference.indexOf(mime.source)

        if (types[extension] !== 'application/octet-stream'
          && from > to || (from === to && types[extension].substr(0, 12) === 'application/')) {
          // skip the remapping
          return
        }
      }

      // set the extension -> mime
      types[extension] = type
    }
  })
}

},{"mime-db":5,"path":1}],4:[function(require,module,exports){
module.exports={
  "application/1d-interleaved-parityfec": {
    "source": "iana"
  },
  "application/3gpdash-qoe-report+xml": {
    "source": "iana"
  },
  "application/3gpp-ims+xml": {
    "source": "iana"
  },
  "application/a2l": {
    "source": "iana"
  },
  "application/activemessage": {
    "source": "iana"
  },
  "application/alto-costmap+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-costmapfilter+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-directory+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-endpointcost+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-endpointcostparams+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-endpointprop+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-endpointpropparams+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-error+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-networkmap+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-networkmapfilter+json": {
    "source": "iana",
    "compressible": true
  },
  "application/aml": {
    "source": "iana"
  },
  "application/andrew-inset": {
    "source": "iana",
    "extensions": ["ez"]
  },
  "application/applefile": {
    "source": "iana"
  },
  "application/applixware": {
    "source": "apache",
    "extensions": ["aw"]
  },
  "application/atf": {
    "source": "iana"
  },
  "application/atfx": {
    "source": "iana"
  },
  "application/atom+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": ["atom"]
  },
  "application/atomcat+xml": {
    "source": "iana",
    "extensions": ["atomcat"]
  },
  "application/atomdeleted+xml": {
    "source": "iana"
  },
  "application/atomicmail": {
    "source": "iana"
  },
  "application/atomsvc+xml": {
    "source": "iana",
    "extensions": ["atomsvc"]
  },
  "application/atxml": {
    "source": "iana"
  },
  "application/auth-policy+xml": {
    "source": "iana"
  },
  "application/bacnet-xdd+zip": {
    "source": "iana"
  },
  "application/batch-smtp": {
    "source": "iana"
  },
  "application/bdoc": {
    "compressible": false,
    "extensions": ["bdoc"]
  },
  "application/beep+xml": {
    "source": "iana"
  },
  "application/calendar+json": {
    "source": "iana",
    "compressible": true
  },
  "application/calendar+xml": {
    "source": "iana"
  },
  "application/call-completion": {
    "source": "iana"
  },
  "application/cals-1840": {
    "source": "iana"
  },
  "application/cbor": {
    "source": "iana"
  },
  "application/ccmp+xml": {
    "source": "iana"
  },
  "application/ccxml+xml": {
    "source": "iana",
    "extensions": ["ccxml"]
  },
  "application/cdfx+xml": {
    "source": "iana"
  },
  "application/cdmi-capability": {
    "source": "iana",
    "extensions": ["cdmia"]
  },
  "application/cdmi-container": {
    "source": "iana",
    "extensions": ["cdmic"]
  },
  "application/cdmi-domain": {
    "source": "iana",
    "extensions": ["cdmid"]
  },
  "application/cdmi-object": {
    "source": "iana",
    "extensions": ["cdmio"]
  },
  "application/cdmi-queue": {
    "source": "iana",
    "extensions": ["cdmiq"]
  },
  "application/cea": {
    "source": "iana"
  },
  "application/cea-2018+xml": {
    "source": "iana"
  },
  "application/cellml+xml": {
    "source": "iana"
  },
  "application/cfw": {
    "source": "iana"
  },
  "application/cms": {
    "source": "iana"
  },
  "application/cnrp+xml": {
    "source": "iana"
  },
  "application/coap-group+json": {
    "source": "iana",
    "compressible": true
  },
  "application/commonground": {
    "source": "iana"
  },
  "application/conference-info+xml": {
    "source": "iana"
  },
  "application/cpl+xml": {
    "source": "iana"
  },
  "application/csrattrs": {
    "source": "iana"
  },
  "application/csta+xml": {
    "source": "iana"
  },
  "application/cstadata+xml": {
    "source": "iana"
  },
  "application/cu-seeme": {
    "source": "apache",
    "extensions": ["cu"]
  },
  "application/cybercash": {
    "source": "iana"
  },
  "application/dart": {
    "compressible": true
  },
  "application/dash+xml": {
    "source": "iana",
    "extensions": ["mdp"]
  },
  "application/dashdelta": {
    "source": "iana"
  },
  "application/davmount+xml": {
    "source": "iana",
    "extensions": ["davmount"]
  },
  "application/dca-rft": {
    "source": "iana"
  },
  "application/dcd": {
    "source": "iana"
  },
  "application/dec-dx": {
    "source": "iana"
  },
  "application/dialog-info+xml": {
    "source": "iana"
  },
  "application/dicom": {
    "source": "iana"
  },
  "application/dii": {
    "source": "iana"
  },
  "application/dit": {
    "source": "iana"
  },
  "application/dns": {
    "source": "iana"
  },
  "application/docbook+xml": {
    "source": "apache",
    "extensions": ["dbk"]
  },
  "application/dskpp+xml": {
    "source": "iana"
  },
  "application/dssc+der": {
    "source": "iana",
    "extensions": ["dssc"]
  },
  "application/dssc+xml": {
    "source": "iana",
    "extensions": ["xdssc"]
  },
  "application/dvcs": {
    "source": "iana"
  },
  "application/ecmascript": {
    "source": "iana",
    "compressible": true,
    "extensions": ["ecma"]
  },
  "application/edi-consent": {
    "source": "iana"
  },
  "application/edi-x12": {
    "source": "iana",
    "compressible": false
  },
  "application/edifact": {
    "source": "iana",
    "compressible": false
  },
  "application/emma+xml": {
    "source": "iana",
    "extensions": ["emma"]
  },
  "application/emotionml+xml": {
    "source": "iana"
  },
  "application/encaprtp": {
    "source": "iana"
  },
  "application/epp+xml": {
    "source": "iana"
  },
  "application/epub+zip": {
    "source": "iana",
    "extensions": ["epub"]
  },
  "application/eshop": {
    "source": "iana"
  },
  "application/exi": {
    "source": "iana",
    "extensions": ["exi"]
  },
  "application/fastinfoset": {
    "source": "iana"
  },
  "application/fastsoap": {
    "source": "iana"
  },
  "application/fdt+xml": {
    "source": "iana"
  },
  "application/fits": {
    "source": "iana"
  },
  "application/font-sfnt": {
    "source": "iana"
  },
  "application/font-tdpfr": {
    "source": "iana",
    "extensions": ["pfr"]
  },
  "application/font-woff": {
    "source": "iana",
    "compressible": false,
    "extensions": ["woff"]
  },
  "application/font-woff2": {
    "compressible": false,
    "extensions": ["woff2"]
  },
  "application/framework-attributes+xml": {
    "source": "iana"
  },
  "application/gml+xml": {
    "source": "apache",
    "extensions": ["gml"]
  },
  "application/gpx+xml": {
    "source": "apache",
    "extensions": ["gpx"]
  },
  "application/gxf": {
    "source": "apache",
    "extensions": ["gxf"]
  },
  "application/gzip": {
    "source": "iana",
    "compressible": false
  },
  "application/h224": {
    "source": "iana"
  },
  "application/held+xml": {
    "source": "iana"
  },
  "application/http": {
    "source": "iana"
  },
  "application/hyperstudio": {
    "source": "iana",
    "extensions": ["stk"]
  },
  "application/ibe-key-request+xml": {
    "source": "iana"
  },
  "application/ibe-pkg-reply+xml": {
    "source": "iana"
  },
  "application/ibe-pp-data": {
    "source": "iana"
  },
  "application/iges": {
    "source": "iana"
  },
  "application/im-iscomposing+xml": {
    "source": "iana"
  },
  "application/index": {
    "source": "iana"
  },
  "application/index.cmd": {
    "source": "iana"
  },
  "application/index.obj": {
    "source": "iana"
  },
  "application/index.response": {
    "source": "iana"
  },
  "application/index.vnd": {
    "source": "iana"
  },
  "application/inkml+xml": {
    "source": "iana",
    "extensions": ["ink","inkml"]
  },
  "application/iotp": {
    "source": "iana"
  },
  "application/ipfix": {
    "source": "iana",
    "extensions": ["ipfix"]
  },
  "application/ipp": {
    "source": "iana"
  },
  "application/isup": {
    "source": "iana"
  },
  "application/its+xml": {
    "source": "iana"
  },
  "application/java-archive": {
    "source": "apache",
    "compressible": false,
    "extensions": ["jar","war","ear"]
  },
  "application/java-serialized-object": {
    "source": "apache",
    "compressible": false,
    "extensions": ["ser"]
  },
  "application/java-vm": {
    "source": "apache",
    "compressible": false,
    "extensions": ["class"]
  },
  "application/javascript": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true,
    "extensions": ["js"]
  },
  "application/jose": {
    "source": "iana"
  },
  "application/jose+json": {
    "source": "iana",
    "compressible": true
  },
  "application/jrd+json": {
    "source": "iana",
    "compressible": true
  },
  "application/json": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true,
    "extensions": ["json","map"]
  },
  "application/json-patch+json": {
    "source": "iana",
    "compressible": true
  },
  "application/json-seq": {
    "source": "iana"
  },
  "application/json5": {
    "extensions": ["json5"]
  },
  "application/jsonml+json": {
    "source": "apache",
    "compressible": true,
    "extensions": ["jsonml"]
  },
  "application/jwk+json": {
    "source": "iana",
    "compressible": true
  },
  "application/jwk-set+json": {
    "source": "iana",
    "compressible": true
  },
  "application/jwt": {
    "source": "iana"
  },
  "application/kpml-request+xml": {
    "source": "iana"
  },
  "application/kpml-response+xml": {
    "source": "iana"
  },
  "application/ld+json": {
    "source": "iana",
    "compressible": true,
    "extensions": ["jsonld"]
  },
  "application/link-format": {
    "source": "iana"
  },
  "application/load-control+xml": {
    "source": "iana"
  },
  "application/lost+xml": {
    "source": "iana",
    "extensions": ["lostxml"]
  },
  "application/lostsync+xml": {
    "source": "iana"
  },
  "application/lxf": {
    "source": "iana"
  },
  "application/mac-binhex40": {
    "source": "iana",
    "extensions": ["hqx"]
  },
  "application/mac-compactpro": {
    "source": "apache",
    "extensions": ["cpt"]
  },
  "application/macwriteii": {
    "source": "iana"
  },
  "application/mads+xml": {
    "source": "iana",
    "extensions": ["mads"]
  },
  "application/manifest+json": {
    "charset": "UTF-8",
    "compressible": true,
    "extensions": ["webmanifest"]
  },
  "application/marc": {
    "source": "iana",
    "extensions": ["mrc"]
  },
  "application/marcxml+xml": {
    "source": "iana",
    "extensions": ["mrcx"]
  },
  "application/mathematica": {
    "source": "iana",
    "extensions": ["ma","nb","mb"]
  },
  "application/mathml+xml": {
    "source": "iana",
    "extensions": ["mathml"]
  },
  "application/mathml-content+xml": {
    "source": "iana"
  },
  "application/mathml-presentation+xml": {
    "source": "iana"
  },
  "application/mbms-associated-procedure-description+xml": {
    "source": "iana"
  },
  "application/mbms-deregister+xml": {
    "source": "iana"
  },
  "application/mbms-envelope+xml": {
    "source": "iana"
  },
  "application/mbms-msk+xml": {
    "source": "iana"
  },
  "application/mbms-msk-response+xml": {
    "source": "iana"
  },
  "application/mbms-protection-description+xml": {
    "source": "iana"
  },
  "application/mbms-reception-report+xml": {
    "source": "iana"
  },
  "application/mbms-register+xml": {
    "source": "iana"
  },
  "application/mbms-register-response+xml": {
    "source": "iana"
  },
  "application/mbms-schedule+xml": {
    "source": "iana"
  },
  "application/mbms-user-service-description+xml": {
    "source": "iana"
  },
  "application/mbox": {
    "source": "iana",
    "extensions": ["mbox"]
  },
  "application/media-policy-dataset+xml": {
    "source": "iana"
  },
  "application/media_control+xml": {
    "source": "iana"
  },
  "application/mediaservercontrol+xml": {
    "source": "iana",
    "extensions": ["mscml"]
  },
  "application/merge-patch+json": {
    "source": "iana",
    "compressible": true
  },
  "application/metalink+xml": {
    "source": "apache",
    "extensions": ["metalink"]
  },
  "application/metalink4+xml": {
    "source": "iana",
    "extensions": ["meta4"]
  },
  "application/mets+xml": {
    "source": "iana",
    "extensions": ["mets"]
  },
  "application/mf4": {
    "source": "iana"
  },
  "application/mikey": {
    "source": "iana"
  },
  "application/mods+xml": {
    "source": "iana",
    "extensions": ["mods"]
  },
  "application/moss-keys": {
    "source": "iana"
  },
  "application/moss-signature": {
    "source": "iana"
  },
  "application/mosskey-data": {
    "source": "iana"
  },
  "application/mosskey-request": {
    "source": "iana"
  },
  "application/mp21": {
    "source": "iana",
    "extensions": ["m21","mp21"]
  },
  "application/mp4": {
    "source": "iana",
    "extensions": ["mp4s","m4p"]
  },
  "application/mpeg4-generic": {
    "source": "iana"
  },
  "application/mpeg4-iod": {
    "source": "iana"
  },
  "application/mpeg4-iod-xmt": {
    "source": "iana"
  },
  "application/mrb-consumer+xml": {
    "source": "iana"
  },
  "application/mrb-publish+xml": {
    "source": "iana"
  },
  "application/msc-ivr+xml": {
    "source": "iana"
  },
  "application/msc-mixer+xml": {
    "source": "iana"
  },
  "application/msword": {
    "source": "iana",
    "compressible": false,
    "extensions": ["doc","dot"]
  },
  "application/mxf": {
    "source": "iana",
    "extensions": ["mxf"]
  },
  "application/nasdata": {
    "source": "iana"
  },
  "application/news-checkgroups": {
    "source": "iana"
  },
  "application/news-groupinfo": {
    "source": "iana"
  },
  "application/news-transmission": {
    "source": "iana"
  },
  "application/nlsml+xml": {
    "source": "iana"
  },
  "application/nss": {
    "source": "iana"
  },
  "application/ocsp-request": {
    "source": "iana"
  },
  "application/ocsp-response": {
    "source": "iana"
  },
  "application/octet-stream": {
    "source": "iana",
    "compressible": false,
    "extensions": ["bin","dms","lrf","mar","so","dist","distz","pkg","bpk","dump","elc","deploy","exe","dll","deb","dmg","iso","img","msi","msp","msm","buffer"]
  },
  "application/oda": {
    "source": "iana",
    "extensions": ["oda"]
  },
  "application/odx": {
    "source": "iana"
  },
  "application/oebps-package+xml": {
    "source": "iana",
    "extensions": ["opf"]
  },
  "application/ogg": {
    "source": "iana",
    "compressible": false,
    "extensions": ["ogx"]
  },
  "application/omdoc+xml": {
    "source": "apache",
    "extensions": ["omdoc"]
  },
  "application/onenote": {
    "source": "apache",
    "extensions": ["onetoc","onetoc2","onetmp","onepkg"]
  },
  "application/oxps": {
    "source": "iana",
    "extensions": ["oxps"]
  },
  "application/p2p-overlay+xml": {
    "source": "iana"
  },
  "application/parityfec": {
    "source": "iana"
  },
  "application/patch-ops-error+xml": {
    "source": "iana",
    "extensions": ["xer"]
  },
  "application/pdf": {
    "source": "iana",
    "compressible": false,
    "extensions": ["pdf"]
  },
  "application/pdx": {
    "source": "iana"
  },
  "application/pgp-encrypted": {
    "source": "iana",
    "compressible": false,
    "extensions": ["pgp"]
  },
  "application/pgp-keys": {
    "source": "iana"
  },
  "application/pgp-signature": {
    "source": "iana",
    "extensions": ["asc","sig"]
  },
  "application/pics-rules": {
    "source": "apache",
    "extensions": ["prf"]
  },
  "application/pidf+xml": {
    "source": "iana"
  },
  "application/pidf-diff+xml": {
    "source": "iana"
  },
  "application/pkcs10": {
    "source": "iana",
    "extensions": ["p10"]
  },
  "application/pkcs7-mime": {
    "source": "iana",
    "extensions": ["p7m","p7c"]
  },
  "application/pkcs7-signature": {
    "source": "iana",
    "extensions": ["p7s"]
  },
  "application/pkcs8": {
    "source": "iana",
    "extensions": ["p8"]
  },
  "application/pkix-attr-cert": {
    "source": "iana",
    "extensions": ["ac"]
  },
  "application/pkix-cert": {
    "source": "iana",
    "extensions": ["cer"]
  },
  "application/pkix-crl": {
    "source": "iana",
    "extensions": ["crl"]
  },
  "application/pkix-pkipath": {
    "source": "iana",
    "extensions": ["pkipath"]
  },
  "application/pkixcmp": {
    "source": "iana",
    "extensions": ["pki"]
  },
  "application/pls+xml": {
    "source": "iana",
    "extensions": ["pls"]
  },
  "application/poc-settings+xml": {
    "source": "iana"
  },
  "application/postscript": {
    "source": "iana",
    "compressible": true,
    "extensions": ["ai","eps","ps"]
  },
  "application/provenance+xml": {
    "source": "iana"
  },
  "application/prs.alvestrand.titrax-sheet": {
    "source": "iana"
  },
  "application/prs.cww": {
    "source": "iana",
    "extensions": ["cww"]
  },
  "application/prs.hpub+zip": {
    "source": "iana"
  },
  "application/prs.nprend": {
    "source": "iana"
  },
  "application/prs.plucker": {
    "source": "iana"
  },
  "application/prs.rdf-xml-crypt": {
    "source": "iana"
  },
  "application/prs.xsf+xml": {
    "source": "iana"
  },
  "application/pskc+xml": {
    "source": "iana",
    "extensions": ["pskcxml"]
  },
  "application/qsig": {
    "source": "iana"
  },
  "application/raptorfec": {
    "source": "iana"
  },
  "application/rdap+json": {
    "source": "iana",
    "compressible": true
  },
  "application/rdf+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": ["rdf"]
  },
  "application/reginfo+xml": {
    "source": "iana",
    "extensions": ["rif"]
  },
  "application/relax-ng-compact-syntax": {
    "source": "iana",
    "extensions": ["rnc"]
  },
  "application/remote-printing": {
    "source": "iana"
  },
  "application/reputon+json": {
    "source": "iana",
    "compressible": true
  },
  "application/resource-lists+xml": {
    "source": "iana",
    "extensions": ["rl"]
  },
  "application/resource-lists-diff+xml": {
    "source": "iana",
    "extensions": ["rld"]
  },
  "application/riscos": {
    "source": "iana"
  },
  "application/rlmi+xml": {
    "source": "iana"
  },
  "application/rls-services+xml": {
    "source": "iana",
    "extensions": ["rs"]
  },
  "application/rpki-ghostbusters": {
    "source": "iana",
    "extensions": ["gbr"]
  },
  "application/rpki-manifest": {
    "source": "iana",
    "extensions": ["mft"]
  },
  "application/rpki-roa": {
    "source": "iana",
    "extensions": ["roa"]
  },
  "application/rpki-updown": {
    "source": "iana"
  },
  "application/rsd+xml": {
    "source": "apache",
    "extensions": ["rsd"]
  },
  "application/rss+xml": {
    "source": "apache",
    "compressible": true,
    "extensions": ["rss"]
  },
  "application/rtf": {
    "source": "iana",
    "compressible": true,
    "extensions": ["rtf"]
  },
  "application/rtploopback": {
    "source": "iana"
  },
  "application/rtx": {
    "source": "iana"
  },
  "application/samlassertion+xml": {
    "source": "iana"
  },
  "application/samlmetadata+xml": {
    "source": "iana"
  },
  "application/sbml+xml": {
    "source": "iana",
    "extensions": ["sbml"]
  },
  "application/scaip+xml": {
    "source": "iana"
  },
  "application/scim+json": {
    "source": "iana",
    "compressible": true
  },
  "application/scvp-cv-request": {
    "source": "iana",
    "extensions": ["scq"]
  },
  "application/scvp-cv-response": {
    "source": "iana",
    "extensions": ["scs"]
  },
  "application/scvp-vp-request": {
    "source": "iana",
    "extensions": ["spq"]
  },
  "application/scvp-vp-response": {
    "source": "iana",
    "extensions": ["spp"]
  },
  "application/sdp": {
    "source": "iana",
    "extensions": ["sdp"]
  },
  "application/sep+xml": {
    "source": "iana"
  },
  "application/sep-exi": {
    "source": "iana"
  },
  "application/session-info": {
    "source": "iana"
  },
  "application/set-payment": {
    "source": "iana"
  },
  "application/set-payment-initiation": {
    "source": "iana",
    "extensions": ["setpay"]
  },
  "application/set-registration": {
    "source": "iana"
  },
  "application/set-registration-initiation": {
    "source": "iana",
    "extensions": ["setreg"]
  },
  "application/sgml": {
    "source": "iana"
  },
  "application/sgml-open-catalog": {
    "source": "iana"
  },
  "application/shf+xml": {
    "source": "iana",
    "extensions": ["shf"]
  },
  "application/sieve": {
    "source": "iana"
  },
  "application/simple-filter+xml": {
    "source": "iana"
  },
  "application/simple-message-summary": {
    "source": "iana"
  },
  "application/simplesymbolcontainer": {
    "source": "iana"
  },
  "application/slate": {
    "source": "iana"
  },
  "application/smil": {
    "source": "iana"
  },
  "application/smil+xml": {
    "source": "iana",
    "extensions": ["smi","smil"]
  },
  "application/smpte336m": {
    "source": "iana"
  },
  "application/soap+fastinfoset": {
    "source": "iana"
  },
  "application/soap+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/sparql-query": {
    "source": "iana",
    "extensions": ["rq"]
  },
  "application/sparql-results+xml": {
    "source": "iana",
    "extensions": ["srx"]
  },
  "application/spirits-event+xml": {
    "source": "iana"
  },
  "application/sql": {
    "source": "iana"
  },
  "application/srgs": {
    "source": "iana",
    "extensions": ["gram"]
  },
  "application/srgs+xml": {
    "source": "iana",
    "extensions": ["grxml"]
  },
  "application/sru+xml": {
    "source": "iana",
    "extensions": ["sru"]
  },
  "application/ssdl+xml": {
    "source": "apache",
    "extensions": ["ssdl"]
  },
  "application/ssml+xml": {
    "source": "iana",
    "extensions": ["ssml"]
  },
  "application/tamp-apex-update": {
    "source": "iana"
  },
  "application/tamp-apex-update-confirm": {
    "source": "iana"
  },
  "application/tamp-community-update": {
    "source": "iana"
  },
  "application/tamp-community-update-confirm": {
    "source": "iana"
  },
  "application/tamp-error": {
    "source": "iana"
  },
  "application/tamp-sequence-adjust": {
    "source": "iana"
  },
  "application/tamp-sequence-adjust-confirm": {
    "source": "iana"
  },
  "application/tamp-status-query": {
    "source": "iana"
  },
  "application/tamp-status-response": {
    "source": "iana"
  },
  "application/tamp-update": {
    "source": "iana"
  },
  "application/tamp-update-confirm": {
    "source": "iana"
  },
  "application/tar": {
    "compressible": true
  },
  "application/tei+xml": {
    "source": "iana",
    "extensions": ["tei","teicorpus"]
  },
  "application/thraud+xml": {
    "source": "iana",
    "extensions": ["tfi"]
  },
  "application/timestamp-query": {
    "source": "iana"
  },
  "application/timestamp-reply": {
    "source": "iana"
  },
  "application/timestamped-data": {
    "source": "iana",
    "extensions": ["tsd"]
  },
  "application/ttml+xml": {
    "source": "iana"
  },
  "application/tve-trigger": {
    "source": "iana"
  },
  "application/ulpfec": {
    "source": "iana"
  },
  "application/urc-grpsheet+xml": {
    "source": "iana"
  },
  "application/urc-ressheet+xml": {
    "source": "iana"
  },
  "application/urc-targetdesc+xml": {
    "source": "iana"
  },
  "application/urc-uisocketdesc+xml": {
    "source": "iana"
  },
  "application/vcard+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vcard+xml": {
    "source": "iana"
  },
  "application/vemmi": {
    "source": "iana"
  },
  "application/vividence.scriptfile": {
    "source": "apache"
  },
  "application/vnd.3gpp.bsf+xml": {
    "source": "iana"
  },
  "application/vnd.3gpp.pic-bw-large": {
    "source": "iana",
    "extensions": ["plb"]
  },
  "application/vnd.3gpp.pic-bw-small": {
    "source": "iana",
    "extensions": ["psb"]
  },
  "application/vnd.3gpp.pic-bw-var": {
    "source": "iana",
    "extensions": ["pvb"]
  },
  "application/vnd.3gpp.sms": {
    "source": "iana"
  },
  "application/vnd.3gpp.ussd+xml": {
    "source": "iana"
  },
  "application/vnd.3gpp2.bcmcsinfo+xml": {
    "source": "iana"
  },
  "application/vnd.3gpp2.sms": {
    "source": "iana"
  },
  "application/vnd.3gpp2.tcap": {
    "source": "iana",
    "extensions": ["tcap"]
  },
  "application/vnd.3m.post-it-notes": {
    "source": "iana",
    "extensions": ["pwn"]
  },
  "application/vnd.accpac.simply.aso": {
    "source": "iana",
    "extensions": ["aso"]
  },
  "application/vnd.accpac.simply.imp": {
    "source": "iana",
    "extensions": ["imp"]
  },
  "application/vnd.acucobol": {
    "source": "iana",
    "extensions": ["acu"]
  },
  "application/vnd.acucorp": {
    "source": "iana",
    "extensions": ["atc","acutc"]
  },
  "application/vnd.adobe.air-application-installer-package+zip": {
    "source": "apache",
    "extensions": ["air"]
  },
  "application/vnd.adobe.flash.movie": {
    "source": "iana"
  },
  "application/vnd.adobe.formscentral.fcdt": {
    "source": "iana",
    "extensions": ["fcdt"]
  },
  "application/vnd.adobe.fxp": {
    "source": "iana",
    "extensions": ["fxp","fxpl"]
  },
  "application/vnd.adobe.partial-upload": {
    "source": "iana"
  },
  "application/vnd.adobe.xdp+xml": {
    "source": "iana",
    "extensions": ["xdp"]
  },
  "application/vnd.adobe.xfdf": {
    "source": "iana",
    "extensions": ["xfdf"]
  },
  "application/vnd.aether.imp": {
    "source": "iana"
  },
  "application/vnd.ah-barcode": {
    "source": "iana"
  },
  "application/vnd.ahead.space": {
    "source": "iana",
    "extensions": ["ahead"]
  },
  "application/vnd.airzip.filesecure.azf": {
    "source": "iana",
    "extensions": ["azf"]
  },
  "application/vnd.airzip.filesecure.azs": {
    "source": "iana",
    "extensions": ["azs"]
  },
  "application/vnd.amazon.ebook": {
    "source": "apache",
    "extensions": ["azw"]
  },
  "application/vnd.americandynamics.acc": {
    "source": "iana",
    "extensions": ["acc"]
  },
  "application/vnd.amiga.ami": {
    "source": "iana",
    "extensions": ["ami"]
  },
  "application/vnd.amundsen.maze+xml": {
    "source": "iana"
  },
  "application/vnd.android.package-archive": {
    "source": "apache",
    "compressible": false,
    "extensions": ["apk"]
  },
  "application/vnd.anser-web-certificate-issue-initiation": {
    "source": "iana",
    "extensions": ["cii"]
  },
  "application/vnd.anser-web-funds-transfer-initiation": {
    "source": "apache",
    "extensions": ["fti"]
  },
  "application/vnd.antix.game-component": {
    "source": "iana",
    "extensions": ["atx"]
  },
  "application/vnd.apache.thrift.binary": {
    "source": "iana"
  },
  "application/vnd.apache.thrift.compact": {
    "source": "iana"
  },
  "application/vnd.apache.thrift.json": {
    "source": "iana"
  },
  "application/vnd.api+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.apple.installer+xml": {
    "source": "iana",
    "extensions": ["mpkg"]
  },
  "application/vnd.apple.mpegurl": {
    "source": "iana",
    "extensions": ["m3u8"]
  },
  "application/vnd.arastra.swi": {
    "source": "iana"
  },
  "application/vnd.aristanetworks.swi": {
    "source": "iana",
    "extensions": ["swi"]
  },
  "application/vnd.artsquare": {
    "source": "iana"
  },
  "application/vnd.astraea-software.iota": {
    "source": "iana",
    "extensions": ["iota"]
  },
  "application/vnd.audiograph": {
    "source": "iana",
    "extensions": ["aep"]
  },
  "application/vnd.autopackage": {
    "source": "iana"
  },
  "application/vnd.avistar+xml": {
    "source": "iana"
  },
  "application/vnd.balsamiq.bmml+xml": {
    "source": "iana"
  },
  "application/vnd.balsamiq.bmpr": {
    "source": "iana"
  },
  "application/vnd.bekitzur-stech+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.biopax.rdf+xml": {
    "source": "iana"
  },
  "application/vnd.blueice.multipass": {
    "source": "iana",
    "extensions": ["mpm"]
  },
  "application/vnd.bluetooth.ep.oob": {
    "source": "iana"
  },
  "application/vnd.bluetooth.le.oob": {
    "source": "iana"
  },
  "application/vnd.bmi": {
    "source": "iana",
    "extensions": ["bmi"]
  },
  "application/vnd.businessobjects": {
    "source": "iana",
    "extensions": ["rep"]
  },
  "application/vnd.cab-jscript": {
    "source": "iana"
  },
  "application/vnd.canon-cpdl": {
    "source": "iana"
  },
  "application/vnd.canon-lips": {
    "source": "iana"
  },
  "application/vnd.cendio.thinlinc.clientconf": {
    "source": "iana"
  },
  "application/vnd.century-systems.tcp_stream": {
    "source": "iana"
  },
  "application/vnd.chemdraw+xml": {
    "source": "iana",
    "extensions": ["cdxml"]
  },
  "application/vnd.chipnuts.karaoke-mmd": {
    "source": "iana",
    "extensions": ["mmd"]
  },
  "application/vnd.cinderella": {
    "source": "iana",
    "extensions": ["cdy"]
  },
  "application/vnd.cirpack.isdn-ext": {
    "source": "iana"
  },
  "application/vnd.citationstyles.style+xml": {
    "source": "iana"
  },
  "application/vnd.claymore": {
    "source": "iana",
    "extensions": ["cla"]
  },
  "application/vnd.cloanto.rp9": {
    "source": "iana",
    "extensions": ["rp9"]
  },
  "application/vnd.clonk.c4group": {
    "source": "iana",
    "extensions": ["c4g","c4d","c4f","c4p","c4u"]
  },
  "application/vnd.cluetrust.cartomobile-config": {
    "source": "iana",
    "extensions": ["c11amc"]
  },
  "application/vnd.cluetrust.cartomobile-config-pkg": {
    "source": "iana",
    "extensions": ["c11amz"]
  },
  "application/vnd.coffeescript": {
    "source": "iana"
  },
  "application/vnd.collection+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.collection.doc+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.collection.next+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.commerce-battelle": {
    "source": "iana"
  },
  "application/vnd.commonspace": {
    "source": "iana",
    "extensions": ["csp"]
  },
  "application/vnd.contact.cmsg": {
    "source": "iana",
    "extensions": ["cdbcmsg"]
  },
  "application/vnd.cosmocaller": {
    "source": "iana",
    "extensions": ["cmc"]
  },
  "application/vnd.crick.clicker": {
    "source": "iana",
    "extensions": ["clkx"]
  },
  "application/vnd.crick.clicker.keyboard": {
    "source": "iana",
    "extensions": ["clkk"]
  },
  "application/vnd.crick.clicker.palette": {
    "source": "iana",
    "extensions": ["clkp"]
  },
  "application/vnd.crick.clicker.template": {
    "source": "iana",
    "extensions": ["clkt"]
  },
  "application/vnd.crick.clicker.wordbank": {
    "source": "iana",
    "extensions": ["clkw"]
  },
  "application/vnd.criticaltools.wbs+xml": {
    "source": "iana",
    "extensions": ["wbs"]
  },
  "application/vnd.ctc-posml": {
    "source": "iana",
    "extensions": ["pml"]
  },
  "application/vnd.ctct.ws+xml": {
    "source": "iana"
  },
  "application/vnd.cups-pdf": {
    "source": "iana"
  },
  "application/vnd.cups-postscript": {
    "source": "iana"
  },
  "application/vnd.cups-ppd": {
    "source": "iana",
    "extensions": ["ppd"]
  },
  "application/vnd.cups-raster": {
    "source": "iana"
  },
  "application/vnd.cups-raw": {
    "source": "iana"
  },
  "application/vnd.curl": {
    "source": "iana"
  },
  "application/vnd.curl.car": {
    "source": "apache",
    "extensions": ["car"]
  },
  "application/vnd.curl.pcurl": {
    "source": "apache",
    "extensions": ["pcurl"]
  },
  "application/vnd.cyan.dean.root+xml": {
    "source": "iana"
  },
  "application/vnd.cybank": {
    "source": "iana"
  },
  "application/vnd.dart": {
    "source": "iana",
    "compressible": true,
    "extensions": ["dart"]
  },
  "application/vnd.data-vision.rdz": {
    "source": "iana",
    "extensions": ["rdz"]
  },
  "application/vnd.debian.binary-package": {
    "source": "iana"
  },
  "application/vnd.dece.data": {
    "source": "iana",
    "extensions": ["uvf","uvvf","uvd","uvvd"]
  },
  "application/vnd.dece.ttml+xml": {
    "source": "iana",
    "extensions": ["uvt","uvvt"]
  },
  "application/vnd.dece.unspecified": {
    "source": "iana",
    "extensions": ["uvx","uvvx"]
  },
  "application/vnd.dece.zip": {
    "source": "iana",
    "extensions": ["uvz","uvvz"]
  },
  "application/vnd.denovo.fcselayout-link": {
    "source": "iana",
    "extensions": ["fe_launch"]
  },
  "application/vnd.desmume-movie": {
    "source": "iana"
  },
  "application/vnd.dir-bi.plate-dl-nosuffix": {
    "source": "iana"
  },
  "application/vnd.dm.delegation+xml": {
    "source": "iana"
  },
  "application/vnd.dna": {
    "source": "iana",
    "extensions": ["dna"]
  },
  "application/vnd.document+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.dolby.mlp": {
    "source": "apache",
    "extensions": ["mlp"]
  },
  "application/vnd.dolby.mobile.1": {
    "source": "iana"
  },
  "application/vnd.dolby.mobile.2": {
    "source": "iana"
  },
  "application/vnd.doremir.scorecloud-binary-document": {
    "source": "iana"
  },
  "application/vnd.dpgraph": {
    "source": "iana",
    "extensions": ["dpg"]
  },
  "application/vnd.dreamfactory": {
    "source": "iana",
    "extensions": ["dfac"]
  },
  "application/vnd.ds-keypoint": {
    "source": "apache",
    "extensions": ["kpxx"]
  },
  "application/vnd.dtg.local": {
    "source": "iana"
  },
  "application/vnd.dtg.local.flash": {
    "source": "iana"
  },
  "application/vnd.dtg.local.html": {
    "source": "iana"
  },
  "application/vnd.dvb.ait": {
    "source": "iana",
    "extensions": ["ait"]
  },
  "application/vnd.dvb.dvbj": {
    "source": "iana"
  },
  "application/vnd.dvb.esgcontainer": {
    "source": "iana"
  },
  "application/vnd.dvb.ipdcdftnotifaccess": {
    "source": "iana"
  },
  "application/vnd.dvb.ipdcesgaccess": {
    "source": "iana"
  },
  "application/vnd.dvb.ipdcesgaccess2": {
    "source": "iana"
  },
  "application/vnd.dvb.ipdcesgpdd": {
    "source": "iana"
  },
  "application/vnd.dvb.ipdcroaming": {
    "source": "iana"
  },
  "application/vnd.dvb.iptv.alfec-base": {
    "source": "iana"
  },
  "application/vnd.dvb.iptv.alfec-enhancement": {
    "source": "iana"
  },
  "application/vnd.dvb.notif-aggregate-root+xml": {
    "source": "iana"
  },
  "application/vnd.dvb.notif-container+xml": {
    "source": "iana"
  },
  "application/vnd.dvb.notif-generic+xml": {
    "source": "iana"
  },
  "application/vnd.dvb.notif-ia-msglist+xml": {
    "source": "iana"
  },
  "application/vnd.dvb.notif-ia-registration-request+xml": {
    "source": "iana"
  },
  "application/vnd.dvb.notif-ia-registration-response+xml": {
    "source": "iana"
  },
  "application/vnd.dvb.notif-init+xml": {
    "source": "iana"
  },
  "application/vnd.dvb.pfr": {
    "source": "iana"
  },
  "application/vnd.dvb.service": {
    "source": "iana",
    "extensions": ["svc"]
  },
  "application/vnd.dxr": {
    "source": "iana"
  },
  "application/vnd.dynageo": {
    "source": "iana",
    "extensions": ["geo"]
  },
  "application/vnd.dzr": {
    "source": "iana"
  },
  "application/vnd.easykaraoke.cdgdownload": {
    "source": "iana"
  },
  "application/vnd.ecdis-update": {
    "source": "iana"
  },
  "application/vnd.ecowin.chart": {
    "source": "iana",
    "extensions": ["mag"]
  },
  "application/vnd.ecowin.filerequest": {
    "source": "iana"
  },
  "application/vnd.ecowin.fileupdate": {
    "source": "iana"
  },
  "application/vnd.ecowin.series": {
    "source": "iana"
  },
  "application/vnd.ecowin.seriesrequest": {
    "source": "iana"
  },
  "application/vnd.ecowin.seriesupdate": {
    "source": "iana"
  },
  "application/vnd.emclient.accessrequest+xml": {
    "source": "iana"
  },
  "application/vnd.enliven": {
    "source": "iana",
    "extensions": ["nml"]
  },
  "application/vnd.enphase.envoy": {
    "source": "iana"
  },
  "application/vnd.eprints.data+xml": {
    "source": "iana"
  },
  "application/vnd.epson.esf": {
    "source": "iana",
    "extensions": ["esf"]
  },
  "application/vnd.epson.msf": {
    "source": "iana",
    "extensions": ["msf"]
  },
  "application/vnd.epson.quickanime": {
    "source": "iana",
    "extensions": ["qam"]
  },
  "application/vnd.epson.salt": {
    "source": "iana",
    "extensions": ["slt"]
  },
  "application/vnd.epson.ssf": {
    "source": "iana",
    "extensions": ["ssf"]
  },
  "application/vnd.ericsson.quickcall": {
    "source": "iana"
  },
  "application/vnd.eszigno3+xml": {
    "source": "iana",
    "extensions": ["es3","et3"]
  },
  "application/vnd.etsi.aoc+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.asic-e+zip": {
    "source": "iana"
  },
  "application/vnd.etsi.asic-s+zip": {
    "source": "iana"
  },
  "application/vnd.etsi.cug+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.iptvcommand+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.iptvdiscovery+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.iptvprofile+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.iptvsad-bc+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.iptvsad-cod+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.iptvsad-npvr+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.iptvservice+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.iptvsync+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.iptvueprofile+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.mcid+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.mheg5": {
    "source": "iana"
  },
  "application/vnd.etsi.overload-control-policy-dataset+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.pstn+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.sci+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.simservs+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.timestamp-token": {
    "source": "iana"
  },
  "application/vnd.etsi.tsl+xml": {
    "source": "iana"
  },
  "application/vnd.etsi.tsl.der": {
    "source": "iana"
  },
  "application/vnd.eudora.data": {
    "source": "iana"
  },
  "application/vnd.ezpix-album": {
    "source": "iana",
    "extensions": ["ez2"]
  },
  "application/vnd.ezpix-package": {
    "source": "iana",
    "extensions": ["ez3"]
  },
  "application/vnd.f-secure.mobile": {
    "source": "iana"
  },
  "application/vnd.fastcopy-disk-image": {
    "source": "iana"
  },
  "application/vnd.fdf": {
    "source": "iana",
    "extensions": ["fdf"]
  },
  "application/vnd.fdsn.mseed": {
    "source": "iana",
    "extensions": ["mseed"]
  },
  "application/vnd.fdsn.seed": {
    "source": "iana",
    "extensions": ["seed","dataless"]
  },
  "application/vnd.ffsns": {
    "source": "iana"
  },
  "application/vnd.fints": {
    "source": "iana"
  },
  "application/vnd.flographit": {
    "source": "iana",
    "extensions": ["gph"]
  },
  "application/vnd.fluxtime.clip": {
    "source": "iana",
    "extensions": ["ftc"]
  },
  "application/vnd.font-fontforge-sfd": {
    "source": "iana"
  },
  "application/vnd.framemaker": {
    "source": "iana",
    "extensions": ["fm","frame","maker","book"]
  },
  "application/vnd.frogans.fnc": {
    "source": "iana",
    "extensions": ["fnc"]
  },
  "application/vnd.frogans.ltf": {
    "source": "iana",
    "extensions": ["ltf"]
  },
  "application/vnd.fsc.weblaunch": {
    "source": "iana",
    "extensions": ["fsc"]
  },
  "application/vnd.fujitsu.oasys": {
    "source": "iana",
    "extensions": ["oas"]
  },
  "application/vnd.fujitsu.oasys2": {
    "source": "iana",
    "extensions": ["oa2"]
  },
  "application/vnd.fujitsu.oasys3": {
    "source": "iana",
    "extensions": ["oa3"]
  },
  "application/vnd.fujitsu.oasysgp": {
    "source": "iana",
    "extensions": ["fg5"]
  },
  "application/vnd.fujitsu.oasysprs": {
    "source": "iana",
    "extensions": ["bh2"]
  },
  "application/vnd.fujixerox.art-ex": {
    "source": "iana"
  },
  "application/vnd.fujixerox.art4": {
    "source": "iana"
  },
  "application/vnd.fujixerox.ddd": {
    "source": "iana",
    "extensions": ["ddd"]
  },
  "application/vnd.fujixerox.docuworks": {
    "source": "iana",
    "extensions": ["xdw"]
  },
  "application/vnd.fujixerox.docuworks.binder": {
    "source": "iana",
    "extensions": ["xbd"]
  },
  "application/vnd.fujixerox.docuworks.container": {
    "source": "iana"
  },
  "application/vnd.fujixerox.hbpl": {
    "source": "iana"
  },
  "application/vnd.fut-misnet": {
    "source": "iana"
  },
  "application/vnd.fuzzysheet": {
    "source": "iana",
    "extensions": ["fzs"]
  },
  "application/vnd.genomatix.tuxedo": {
    "source": "iana",
    "extensions": ["txd"]
  },
  "application/vnd.geo+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.geocube+xml": {
    "source": "iana"
  },
  "application/vnd.geogebra.file": {
    "source": "iana",
    "extensions": ["ggb"]
  },
  "application/vnd.geogebra.tool": {
    "source": "iana",
    "extensions": ["ggt"]
  },
  "application/vnd.geometry-explorer": {
    "source": "iana",
    "extensions": ["gex","gre"]
  },
  "application/vnd.geonext": {
    "source": "iana",
    "extensions": ["gxt"]
  },
  "application/vnd.geoplan": {
    "source": "iana",
    "extensions": ["g2w"]
  },
  "application/vnd.geospace": {
    "source": "iana",
    "extensions": ["g3w"]
  },
  "application/vnd.gerber": {
    "source": "iana"
  },
  "application/vnd.globalplatform.card-content-mgt": {
    "source": "iana"
  },
  "application/vnd.globalplatform.card-content-mgt-response": {
    "source": "iana"
  },
  "application/vnd.gmx": {
    "source": "iana",
    "extensions": ["gmx"]
  },
  "application/vnd.google-earth.kml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": ["kml"]
  },
  "application/vnd.google-earth.kmz": {
    "source": "iana",
    "compressible": false,
    "extensions": ["kmz"]
  },
  "application/vnd.gov.sk.e-form+xml": {
    "source": "iana"
  },
  "application/vnd.gov.sk.e-form+zip": {
    "source": "iana"
  },
  "application/vnd.gov.sk.xmldatacontainer+xml": {
    "source": "iana"
  },
  "application/vnd.grafeq": {
    "source": "iana",
    "extensions": ["gqf","gqs"]
  },
  "application/vnd.gridmp": {
    "source": "iana"
  },
  "application/vnd.groove-account": {
    "source": "iana",
    "extensions": ["gac"]
  },
  "application/vnd.groove-help": {
    "source": "iana",
    "extensions": ["ghf"]
  },
  "application/vnd.groove-identity-message": {
    "source": "iana",
    "extensions": ["gim"]
  },
  "application/vnd.groove-injector": {
    "source": "iana",
    "extensions": ["grv"]
  },
  "application/vnd.groove-tool-message": {
    "source": "iana",
    "extensions": ["gtm"]
  },
  "application/vnd.groove-tool-template": {
    "source": "iana",
    "extensions": ["tpl"]
  },
  "application/vnd.groove-vcard": {
    "source": "iana",
    "extensions": ["vcg"]
  },
  "application/vnd.hal+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.hal+xml": {
    "source": "iana",
    "extensions": ["hal"]
  },
  "application/vnd.handheld-entertainment+xml": {
    "source": "iana",
    "extensions": ["zmm"]
  },
  "application/vnd.hbci": {
    "source": "iana",
    "extensions": ["hbci"]
  },
  "application/vnd.hcl-bireports": {
    "source": "iana"
  },
  "application/vnd.heroku+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.hhe.lesson-player": {
    "source": "iana",
    "extensions": ["les"]
  },
  "application/vnd.hp-hpgl": {
    "source": "iana",
    "extensions": ["hpgl"]
  },
  "application/vnd.hp-hpid": {
    "source": "iana",
    "extensions": ["hpid"]
  },
  "application/vnd.hp-hps": {
    "source": "iana",
    "extensions": ["hps"]
  },
  "application/vnd.hp-jlyt": {
    "source": "iana",
    "extensions": ["jlt"]
  },
  "application/vnd.hp-pcl": {
    "source": "iana",
    "extensions": ["pcl"]
  },
  "application/vnd.hp-pclxl": {
    "source": "iana",
    "extensions": ["pclxl"]
  },
  "application/vnd.httphone": {
    "source": "iana"
  },
  "application/vnd.hydrostatix.sof-data": {
    "source": "iana",
    "extensions": ["sfd-hdstx"]
  },
  "application/vnd.hyperdrive+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.hzn-3d-crossword": {
    "source": "iana"
  },
  "application/vnd.ibm.afplinedata": {
    "source": "iana"
  },
  "application/vnd.ibm.electronic-media": {
    "source": "iana"
  },
  "application/vnd.ibm.minipay": {
    "source": "iana",
    "extensions": ["mpy"]
  },
  "application/vnd.ibm.modcap": {
    "source": "iana",
    "extensions": ["afp","listafp","list3820"]
  },
  "application/vnd.ibm.rights-management": {
    "source": "iana",
    "extensions": ["irm"]
  },
  "application/vnd.ibm.secure-container": {
    "source": "iana",
    "extensions": ["sc"]
  },
  "application/vnd.iccprofile": {
    "source": "iana",
    "extensions": ["icc","icm"]
  },
  "application/vnd.ieee.1905": {
    "source": "iana"
  },
  "application/vnd.igloader": {
    "source": "iana",
    "extensions": ["igl"]
  },
  "application/vnd.immervision-ivp": {
    "source": "iana",
    "extensions": ["ivp"]
  },
  "application/vnd.immervision-ivu": {
    "source": "iana",
    "extensions": ["ivu"]
  },
  "application/vnd.ims.imsccv1p1": {
    "source": "iana"
  },
  "application/vnd.ims.imsccv1p2": {
    "source": "iana"
  },
  "application/vnd.ims.imsccv1p3": {
    "source": "iana"
  },
  "application/vnd.ims.lis.v2.result+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ims.lti.v2.toolconsumerprofile+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ims.lti.v2.toolproxy+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ims.lti.v2.toolproxy.id+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ims.lti.v2.toolsettings+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ims.lti.v2.toolsettings.simple+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.informedcontrol.rms+xml": {
    "source": "iana"
  },
  "application/vnd.informix-visionary": {
    "source": "iana"
  },
  "application/vnd.infotech.project": {
    "source": "iana"
  },
  "application/vnd.infotech.project+xml": {
    "source": "iana"
  },
  "application/vnd.innopath.wamp.notification": {
    "source": "iana"
  },
  "application/vnd.insors.igm": {
    "source": "iana",
    "extensions": ["igm"]
  },
  "application/vnd.intercon.formnet": {
    "source": "iana",
    "extensions": ["xpw","xpx"]
  },
  "application/vnd.intergeo": {
    "source": "iana",
    "extensions": ["i2g"]
  },
  "application/vnd.intertrust.digibox": {
    "source": "iana"
  },
  "application/vnd.intertrust.nncp": {
    "source": "iana"
  },
  "application/vnd.intu.qbo": {
    "source": "iana",
    "extensions": ["qbo"]
  },
  "application/vnd.intu.qfx": {
    "source": "iana",
    "extensions": ["qfx"]
  },
  "application/vnd.iptc.g2.catalogitem+xml": {
    "source": "iana"
  },
  "application/vnd.iptc.g2.conceptitem+xml": {
    "source": "iana"
  },
  "application/vnd.iptc.g2.knowledgeitem+xml": {
    "source": "iana"
  },
  "application/vnd.iptc.g2.newsitem+xml": {
    "source": "iana"
  },
  "application/vnd.iptc.g2.newsmessage+xml": {
    "source": "iana"
  },
  "application/vnd.iptc.g2.packageitem+xml": {
    "source": "iana"
  },
  "application/vnd.iptc.g2.planningitem+xml": {
    "source": "iana"
  },
  "application/vnd.ipunplugged.rcprofile": {
    "source": "iana",
    "extensions": ["rcprofile"]
  },
  "application/vnd.irepository.package+xml": {
    "source": "iana",
    "extensions": ["irp"]
  },
  "application/vnd.is-xpr": {
    "source": "iana",
    "extensions": ["xpr"]
  },
  "application/vnd.isac.fcs": {
    "source": "iana",
    "extensions": ["fcs"]
  },
  "application/vnd.jam": {
    "source": "iana",
    "extensions": ["jam"]
  },
  "application/vnd.japannet-directory-service": {
    "source": "iana"
  },
  "application/vnd.japannet-jpnstore-wakeup": {
    "source": "iana"
  },
  "application/vnd.japannet-payment-wakeup": {
    "source": "iana"
  },
  "application/vnd.japannet-registration": {
    "source": "iana"
  },
  "application/vnd.japannet-registration-wakeup": {
    "source": "iana"
  },
  "application/vnd.japannet-setstore-wakeup": {
    "source": "iana"
  },
  "application/vnd.japannet-verification": {
    "source": "iana"
  },
  "application/vnd.japannet-verification-wakeup": {
    "source": "iana"
  },
  "application/vnd.jcp.javame.midlet-rms": {
    "source": "iana",
    "extensions": ["rms"]
  },
  "application/vnd.jisp": {
    "source": "iana",
    "extensions": ["jisp"]
  },
  "application/vnd.joost.joda-archive": {
    "source": "iana",
    "extensions": ["joda"]
  },
  "application/vnd.jsk.isdn-ngn": {
    "source": "iana"
  },
  "application/vnd.kahootz": {
    "source": "iana",
    "extensions": ["ktz","ktr"]
  },
  "application/vnd.kde.karbon": {
    "source": "iana",
    "extensions": ["karbon"]
  },
  "application/vnd.kde.kchart": {
    "source": "iana",
    "extensions": ["chrt"]
  },
  "application/vnd.kde.kformula": {
    "source": "iana",
    "extensions": ["kfo"]
  },
  "application/vnd.kde.kivio": {
    "source": "iana",
    "extensions": ["flw"]
  },
  "application/vnd.kde.kontour": {
    "source": "iana",
    "extensions": ["kon"]
  },
  "application/vnd.kde.kpresenter": {
    "source": "iana",
    "extensions": ["kpr","kpt"]
  },
  "application/vnd.kde.kspread": {
    "source": "iana",
    "extensions": ["ksp"]
  },
  "application/vnd.kde.kword": {
    "source": "iana",
    "extensions": ["kwd","kwt"]
  },
  "application/vnd.kenameaapp": {
    "source": "iana",
    "extensions": ["htke"]
  },
  "application/vnd.kidspiration": {
    "source": "iana",
    "extensions": ["kia"]
  },
  "application/vnd.kinar": {
    "source": "iana",
    "extensions": ["kne","knp"]
  },
  "application/vnd.koan": {
    "source": "iana",
    "extensions": ["skp","skd","skt","skm"]
  },
  "application/vnd.kodak-descriptor": {
    "source": "iana",
    "extensions": ["sse"]
  },
  "application/vnd.las.las+xml": {
    "source": "iana",
    "extensions": ["lasxml"]
  },
  "application/vnd.liberty-request+xml": {
    "source": "iana"
  },
  "application/vnd.llamagraphics.life-balance.desktop": {
    "source": "iana",
    "extensions": ["lbd"]
  },
  "application/vnd.llamagraphics.life-balance.exchange+xml": {
    "source": "iana",
    "extensions": ["lbe"]
  },
  "application/vnd.lotus-1-2-3": {
    "source": "iana",
    "extensions": ["123"]
  },
  "application/vnd.lotus-approach": {
    "source": "iana",
    "extensions": ["apr"]
  },
  "application/vnd.lotus-freelance": {
    "source": "iana",
    "extensions": ["pre"]
  },
  "application/vnd.lotus-notes": {
    "source": "iana",
    "extensions": ["nsf"]
  },
  "application/vnd.lotus-organizer": {
    "source": "iana",
    "extensions": ["org"]
  },
  "application/vnd.lotus-screencam": {
    "source": "iana",
    "extensions": ["scm"]
  },
  "application/vnd.lotus-wordpro": {
    "source": "iana",
    "extensions": ["lwp"]
  },
  "application/vnd.macports.portpkg": {
    "source": "iana",
    "extensions": ["portpkg"]
  },
  "application/vnd.marlin.drm.actiontoken+xml": {
    "source": "iana"
  },
  "application/vnd.marlin.drm.conftoken+xml": {
    "source": "iana"
  },
  "application/vnd.marlin.drm.license+xml": {
    "source": "iana"
  },
  "application/vnd.marlin.drm.mdcf": {
    "source": "iana"
  },
  "application/vnd.mason+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.maxmind.maxmind-db": {
    "source": "iana"
  },
  "application/vnd.mcd": {
    "source": "iana",
    "extensions": ["mcd"]
  },
  "application/vnd.medcalcdata": {
    "source": "iana",
    "extensions": ["mc1"]
  },
  "application/vnd.mediastation.cdkey": {
    "source": "iana",
    "extensions": ["cdkey"]
  },
  "application/vnd.meridian-slingshot": {
    "source": "iana"
  },
  "application/vnd.mfer": {
    "source": "iana",
    "extensions": ["mwf"]
  },
  "application/vnd.mfmp": {
    "source": "iana",
    "extensions": ["mfm"]
  },
  "application/vnd.micro+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.micrografx.flo": {
    "source": "iana",
    "extensions": ["flo"]
  },
  "application/vnd.micrografx.igx": {
    "source": "iana",
    "extensions": ["igx"]
  },
  "application/vnd.microsoft.portable-executable": {
    "source": "iana"
  },
  "application/vnd.miele+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.mif": {
    "source": "iana",
    "extensions": ["mif"]
  },
  "application/vnd.minisoft-hp3000-save": {
    "source": "iana"
  },
  "application/vnd.mitsubishi.misty-guard.trustweb": {
    "source": "iana"
  },
  "application/vnd.mobius.daf": {
    "source": "iana",
    "extensions": ["daf"]
  },
  "application/vnd.mobius.dis": {
    "source": "iana",
    "extensions": ["dis"]
  },
  "application/vnd.mobius.mbk": {
    "source": "iana",
    "extensions": ["mbk"]
  },
  "application/vnd.mobius.mqy": {
    "source": "iana",
    "extensions": ["mqy"]
  },
  "application/vnd.mobius.msl": {
    "source": "iana",
    "extensions": ["msl"]
  },
  "application/vnd.mobius.plc": {
    "source": "iana",
    "extensions": ["plc"]
  },
  "application/vnd.mobius.txf": {
    "source": "iana",
    "extensions": ["txf"]
  },
  "application/vnd.mophun.application": {
    "source": "iana",
    "extensions": ["mpn"]
  },
  "application/vnd.mophun.certificate": {
    "source": "iana",
    "extensions": ["mpc"]
  },
  "application/vnd.motorola.flexsuite": {
    "source": "iana"
  },
  "application/vnd.motorola.flexsuite.adsi": {
    "source": "iana"
  },
  "application/vnd.motorola.flexsuite.fis": {
    "source": "iana"
  },
  "application/vnd.motorola.flexsuite.gotap": {
    "source": "iana"
  },
  "application/vnd.motorola.flexsuite.kmr": {
    "source": "iana"
  },
  "application/vnd.motorola.flexsuite.ttc": {
    "source": "iana"
  },
  "application/vnd.motorola.flexsuite.wem": {
    "source": "iana"
  },
  "application/vnd.motorola.iprm": {
    "source": "iana"
  },
  "application/vnd.mozilla.xul+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": ["xul"]
  },
  "application/vnd.ms-3mfdocument": {
    "source": "iana"
  },
  "application/vnd.ms-artgalry": {
    "source": "iana",
    "extensions": ["cil"]
  },
  "application/vnd.ms-asf": {
    "source": "iana"
  },
  "application/vnd.ms-cab-compressed": {
    "source": "iana",
    "extensions": ["cab"]
  },
  "application/vnd.ms-color.iccprofile": {
    "source": "apache"
  },
  "application/vnd.ms-excel": {
    "source": "iana",
    "compressible": false,
    "extensions": ["xls","xlm","xla","xlc","xlt","xlw"]
  },
  "application/vnd.ms-excel.addin.macroenabled.12": {
    "source": "iana",
    "extensions": ["xlam"]
  },
  "application/vnd.ms-excel.sheet.binary.macroenabled.12": {
    "source": "iana",
    "extensions": ["xlsb"]
  },
  "application/vnd.ms-excel.sheet.macroenabled.12": {
    "source": "iana",
    "extensions": ["xlsm"]
  },
  "application/vnd.ms-excel.template.macroenabled.12": {
    "source": "iana",
    "extensions": ["xltm"]
  },
  "application/vnd.ms-fontobject": {
    "source": "iana",
    "compressible": true,
    "extensions": ["eot"]
  },
  "application/vnd.ms-htmlhelp": {
    "source": "iana",
    "extensions": ["chm"]
  },
  "application/vnd.ms-ims": {
    "source": "iana",
    "extensions": ["ims"]
  },
  "application/vnd.ms-lrm": {
    "source": "iana",
    "extensions": ["lrm"]
  },
  "application/vnd.ms-office.activex+xml": {
    "source": "iana"
  },
  "application/vnd.ms-officetheme": {
    "source": "iana",
    "extensions": ["thmx"]
  },
  "application/vnd.ms-opentype": {
    "source": "apache",
    "compressible": true
  },
  "application/vnd.ms-package.obfuscated-opentype": {
    "source": "apache"
  },
  "application/vnd.ms-pki.seccat": {
    "source": "apache",
    "extensions": ["cat"]
  },
  "application/vnd.ms-pki.stl": {
    "source": "apache",
    "extensions": ["stl"]
  },
  "application/vnd.ms-playready.initiator+xml": {
    "source": "iana"
  },
  "application/vnd.ms-powerpoint": {
    "source": "iana",
    "compressible": false,
    "extensions": ["ppt","pps","pot"]
  },
  "application/vnd.ms-powerpoint.addin.macroenabled.12": {
    "source": "iana",
    "extensions": ["ppam"]
  },
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": {
    "source": "iana",
    "extensions": ["pptm"]
  },
  "application/vnd.ms-powerpoint.slide.macroenabled.12": {
    "source": "iana",
    "extensions": ["sldm"]
  },
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12": {
    "source": "iana",
    "extensions": ["ppsm"]
  },
  "application/vnd.ms-powerpoint.template.macroenabled.12": {
    "source": "iana",
    "extensions": ["potm"]
  },
  "application/vnd.ms-printing.printticket+xml": {
    "source": "apache"
  },
  "application/vnd.ms-project": {
    "source": "iana",
    "extensions": ["mpp","mpt"]
  },
  "application/vnd.ms-tnef": {
    "source": "iana"
  },
  "application/vnd.ms-windows.printerpairing": {
    "source": "iana"
  },
  "application/vnd.ms-wmdrm.lic-chlg-req": {
    "source": "iana"
  },
  "application/vnd.ms-wmdrm.lic-resp": {
    "source": "iana"
  },
  "application/vnd.ms-wmdrm.meter-chlg-req": {
    "source": "iana"
  },
  "application/vnd.ms-wmdrm.meter-resp": {
    "source": "iana"
  },
  "application/vnd.ms-word.document.macroenabled.12": {
    "source": "iana",
    "extensions": ["docm"]
  },
  "application/vnd.ms-word.template.macroenabled.12": {
    "source": "iana",
    "extensions": ["dotm"]
  },
  "application/vnd.ms-works": {
    "source": "iana",
    "extensions": ["wps","wks","wcm","wdb"]
  },
  "application/vnd.ms-wpl": {
    "source": "iana",
    "extensions": ["wpl"]
  },
  "application/vnd.ms-xpsdocument": {
    "source": "iana",
    "compressible": false,
    "extensions": ["xps"]
  },
  "application/vnd.msa-disk-image": {
    "source": "iana"
  },
  "application/vnd.mseq": {
    "source": "iana",
    "extensions": ["mseq"]
  },
  "application/vnd.msign": {
    "source": "iana"
  },
  "application/vnd.multiad.creator": {
    "source": "iana"
  },
  "application/vnd.multiad.creator.cif": {
    "source": "iana"
  },
  "application/vnd.music-niff": {
    "source": "iana"
  },
  "application/vnd.musician": {
    "source": "iana",
    "extensions": ["mus"]
  },
  "application/vnd.muvee.style": {
    "source": "iana",
    "extensions": ["msty"]
  },
  "application/vnd.mynfc": {
    "source": "iana",
    "extensions": ["taglet"]
  },
  "application/vnd.ncd.control": {
    "source": "iana"
  },
  "application/vnd.ncd.reference": {
    "source": "iana"
  },
  "application/vnd.nervana": {
    "source": "iana"
  },
  "application/vnd.netfpx": {
    "source": "iana"
  },
  "application/vnd.neurolanguage.nlu": {
    "source": "iana",
    "extensions": ["nlu"]
  },
  "application/vnd.nintendo.nitro.rom": {
    "source": "iana"
  },
  "application/vnd.nintendo.snes.rom": {
    "source": "iana"
  },
  "application/vnd.nitf": {
    "source": "iana",
    "extensions": ["ntf","nitf"]
  },
  "application/vnd.noblenet-directory": {
    "source": "iana",
    "extensions": ["nnd"]
  },
  "application/vnd.noblenet-sealer": {
    "source": "iana",
    "extensions": ["nns"]
  },
  "application/vnd.noblenet-web": {
    "source": "iana",
    "extensions": ["nnw"]
  },
  "application/vnd.nokia.catalogs": {
    "source": "iana"
  },
  "application/vnd.nokia.conml+wbxml": {
    "source": "iana"
  },
  "application/vnd.nokia.conml+xml": {
    "source": "iana"
  },
  "application/vnd.nokia.iptv.config+xml": {
    "source": "iana"
  },
  "application/vnd.nokia.isds-radio-presets": {
    "source": "iana"
  },
  "application/vnd.nokia.landmark+wbxml": {
    "source": "iana"
  },
  "application/vnd.nokia.landmark+xml": {
    "source": "iana"
  },
  "application/vnd.nokia.landmarkcollection+xml": {
    "source": "iana"
  },
  "application/vnd.nokia.n-gage.ac+xml": {
    "source": "iana"
  },
  "application/vnd.nokia.n-gage.data": {
    "source": "iana",
    "extensions": ["ngdat"]
  },
  "application/vnd.nokia.n-gage.symbian.install": {
    "source": "iana",
    "extensions": ["n-gage"]
  },
  "application/vnd.nokia.ncd": {
    "source": "iana"
  },
  "application/vnd.nokia.pcd+wbxml": {
    "source": "iana"
  },
  "application/vnd.nokia.pcd+xml": {
    "source": "iana"
  },
  "application/vnd.nokia.radio-preset": {
    "source": "iana",
    "extensions": ["rpst"]
  },
  "application/vnd.nokia.radio-presets": {
    "source": "iana",
    "extensions": ["rpss"]
  },
  "application/vnd.novadigm.edm": {
    "source": "iana",
    "extensions": ["edm"]
  },
  "application/vnd.novadigm.edx": {
    "source": "iana",
    "extensions": ["edx"]
  },
  "application/vnd.novadigm.ext": {
    "source": "iana",
    "extensions": ["ext"]
  },
  "application/vnd.ntt-local.content-share": {
    "source": "iana"
  },
  "application/vnd.ntt-local.file-transfer": {
    "source": "iana"
  },
  "application/vnd.ntt-local.ogw_remote-access": {
    "source": "iana"
  },
  "application/vnd.ntt-local.sip-ta_remote": {
    "source": "iana"
  },
  "application/vnd.ntt-local.sip-ta_tcp_stream": {
    "source": "iana"
  },
  "application/vnd.oasis.opendocument.chart": {
    "source": "iana",
    "extensions": ["odc"]
  },
  "application/vnd.oasis.opendocument.chart-template": {
    "source": "iana",
    "extensions": ["otc"]
  },
  "application/vnd.oasis.opendocument.database": {
    "source": "iana",
    "extensions": ["odb"]
  },
  "application/vnd.oasis.opendocument.formula": {
    "source": "iana",
    "extensions": ["odf"]
  },
  "application/vnd.oasis.opendocument.formula-template": {
    "source": "iana",
    "extensions": ["odft"]
  },
  "application/vnd.oasis.opendocument.graphics": {
    "source": "iana",
    "compressible": false,
    "extensions": ["odg"]
  },
  "application/vnd.oasis.opendocument.graphics-template": {
    "source": "iana",
    "extensions": ["otg"]
  },
  "application/vnd.oasis.opendocument.image": {
    "source": "iana",
    "extensions": ["odi"]
  },
  "application/vnd.oasis.opendocument.image-template": {
    "source": "iana",
    "extensions": ["oti"]
  },
  "application/vnd.oasis.opendocument.presentation": {
    "source": "iana",
    "compressible": false,
    "extensions": ["odp"]
  },
  "application/vnd.oasis.opendocument.presentation-template": {
    "source": "iana",
    "extensions": ["otp"]
  },
  "application/vnd.oasis.opendocument.spreadsheet": {
    "source": "iana",
    "compressible": false,
    "extensions": ["ods"]
  },
  "application/vnd.oasis.opendocument.spreadsheet-template": {
    "source": "iana",
    "extensions": ["ots"]
  },
  "application/vnd.oasis.opendocument.text": {
    "source": "iana",
    "compressible": false,
    "extensions": ["odt"]
  },
  "application/vnd.oasis.opendocument.text-master": {
    "source": "iana",
    "extensions": ["odm"]
  },
  "application/vnd.oasis.opendocument.text-template": {
    "source": "iana",
    "extensions": ["ott"]
  },
  "application/vnd.oasis.opendocument.text-web": {
    "source": "iana",
    "extensions": ["oth"]
  },
  "application/vnd.obn": {
    "source": "iana"
  },
  "application/vnd.oftn.l10n+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oipf.contentaccessdownload+xml": {
    "source": "iana"
  },
  "application/vnd.oipf.contentaccessstreaming+xml": {
    "source": "iana"
  },
  "application/vnd.oipf.cspg-hexbinary": {
    "source": "iana"
  },
  "application/vnd.oipf.dae.svg+xml": {
    "source": "iana"
  },
  "application/vnd.oipf.dae.xhtml+xml": {
    "source": "iana"
  },
  "application/vnd.oipf.mippvcontrolmessage+xml": {
    "source": "iana"
  },
  "application/vnd.oipf.pae.gem": {
    "source": "iana"
  },
  "application/vnd.oipf.spdiscovery+xml": {
    "source": "iana"
  },
  "application/vnd.oipf.spdlist+xml": {
    "source": "iana"
  },
  "application/vnd.oipf.ueprofile+xml": {
    "source": "iana"
  },
  "application/vnd.oipf.userprofile+xml": {
    "source": "iana"
  },
  "application/vnd.olpc-sugar": {
    "source": "iana",
    "extensions": ["xo"]
  },
  "application/vnd.oma-scws-config": {
    "source": "iana"
  },
  "application/vnd.oma-scws-http-request": {
    "source": "iana"
  },
  "application/vnd.oma-scws-http-response": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.associated-procedure-parameter+xml": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.drm-trigger+xml": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.imd+xml": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.ltkm": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.notification+xml": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.provisioningtrigger": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.sgboot": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.sgdd+xml": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.sgdu": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.simple-symbol-container": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.smartcard-trigger+xml": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.sprov+xml": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.stkm": {
    "source": "iana"
  },
  "application/vnd.oma.cab-address-book+xml": {
    "source": "iana"
  },
  "application/vnd.oma.cab-feature-handler+xml": {
    "source": "iana"
  },
  "application/vnd.oma.cab-pcc+xml": {
    "source": "iana"
  },
  "application/vnd.oma.cab-subs-invite+xml": {
    "source": "iana"
  },
  "application/vnd.oma.cab-user-prefs+xml": {
    "source": "iana"
  },
  "application/vnd.oma.dcd": {
    "source": "iana"
  },
  "application/vnd.oma.dcdc": {
    "source": "iana"
  },
  "application/vnd.oma.dd2+xml": {
    "source": "iana",
    "extensions": ["dd2"]
  },
  "application/vnd.oma.drm.risd+xml": {
    "source": "iana"
  },
  "application/vnd.oma.group-usage-list+xml": {
    "source": "iana"
  },
  "application/vnd.oma.pal+xml": {
    "source": "iana"
  },
  "application/vnd.oma.poc.detailed-progress-report+xml": {
    "source": "iana"
  },
  "application/vnd.oma.poc.final-report+xml": {
    "source": "iana"
  },
  "application/vnd.oma.poc.groups+xml": {
    "source": "iana"
  },
  "application/vnd.oma.poc.invocation-descriptor+xml": {
    "source": "iana"
  },
  "application/vnd.oma.poc.optimized-progress-report+xml": {
    "source": "iana"
  },
  "application/vnd.oma.push": {
    "source": "iana"
  },
  "application/vnd.oma.scidm.messages+xml": {
    "source": "iana"
  },
  "application/vnd.oma.xcap-directory+xml": {
    "source": "iana"
  },
  "application/vnd.omads-email+xml": {
    "source": "iana"
  },
  "application/vnd.omads-file+xml": {
    "source": "iana"
  },
  "application/vnd.omads-folder+xml": {
    "source": "iana"
  },
  "application/vnd.omaloc-supl-init": {
    "source": "iana"
  },
  "application/vnd.openeye.oeb": {
    "source": "iana"
  },
  "application/vnd.openofficeorg.extension": {
    "source": "apache",
    "extensions": ["oxt"]
  },
  "application/vnd.openxmlformats-officedocument.custom-properties+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.drawing+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.extended-properties+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml-template": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    "source": "iana",
    "compressible": false,
    "extensions": ["pptx"]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slide": {
    "source": "iana",
    "extensions": ["sldx"]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow": {
    "source": "iana",
    "extensions": ["ppsx"]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.template": {
    "source": "apache",
    "extensions": ["potx"]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml-template": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    "source": "iana",
    "compressible": false,
    "extensions": ["xlsx"]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template": {
    "source": "apache",
    "extensions": ["xltx"]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.theme+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.themeoverride+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.vmldrawing": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml-template": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    "source": "iana",
    "compressible": false,
    "extensions": ["docx"]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template": {
    "source": "apache",
    "extensions": ["dotx"]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-package.core-properties+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-package.relationships+xml": {
    "source": "iana"
  },
  "application/vnd.oracle.resource+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.orange.indata": {
    "source": "iana"
  },
  "application/vnd.osa.netdeploy": {
    "source": "iana"
  },
  "application/vnd.osgeo.mapguide.package": {
    "source": "iana",
    "extensions": ["mgp"]
  },
  "application/vnd.osgi.bundle": {
    "source": "iana"
  },
  "application/vnd.osgi.dp": {
    "source": "iana",
    "extensions": ["dp"]
  },
  "application/vnd.osgi.subsystem": {
    "source": "iana",
    "extensions": ["esa"]
  },
  "application/vnd.otps.ct-kip+xml": {
    "source": "iana"
  },
  "application/vnd.palm": {
    "source": "iana",
    "extensions": ["pdb","pqa","oprc"]
  },
  "application/vnd.panoply": {
    "source": "iana"
  },
  "application/vnd.paos+xml": {
    "source": "iana"
  },
  "application/vnd.paos.xml": {
    "source": "apache"
  },
  "application/vnd.pawaafile": {
    "source": "iana",
    "extensions": ["paw"]
  },
  "application/vnd.pcos": {
    "source": "iana"
  },
  "application/vnd.pg.format": {
    "source": "iana",
    "extensions": ["str"]
  },
  "application/vnd.pg.osasli": {
    "source": "iana",
    "extensions": ["ei6"]
  },
  "application/vnd.piaccess.application-licence": {
    "source": "iana"
  },
  "application/vnd.picsel": {
    "source": "iana",
    "extensions": ["efif"]
  },
  "application/vnd.pmi.widget": {
    "source": "iana",
    "extensions": ["wg"]
  },
  "application/vnd.poc.group-advertisement+xml": {
    "source": "iana"
  },
  "application/vnd.pocketlearn": {
    "source": "iana",
    "extensions": ["plf"]
  },
  "application/vnd.powerbuilder6": {
    "source": "iana",
    "extensions": ["pbd"]
  },
  "application/vnd.powerbuilder6-s": {
    "source": "iana"
  },
  "application/vnd.powerbuilder7": {
    "source": "iana"
  },
  "application/vnd.powerbuilder7-s": {
    "source": "iana"
  },
  "application/vnd.powerbuilder75": {
    "source": "iana"
  },
  "application/vnd.powerbuilder75-s": {
    "source": "iana"
  },
  "application/vnd.preminet": {
    "source": "iana"
  },
  "application/vnd.previewsystems.box": {
    "source": "iana",
    "extensions": ["box"]
  },
  "application/vnd.proteus.magazine": {
    "source": "iana",
    "extensions": ["mgz"]
  },
  "application/vnd.publishare-delta-tree": {
    "source": "iana",
    "extensions": ["qps"]
  },
  "application/vnd.pvi.ptid1": {
    "source": "iana",
    "extensions": ["ptid"]
  },
  "application/vnd.pwg-multiplexed": {
    "source": "iana"
  },
  "application/vnd.pwg-xhtml-print+xml": {
    "source": "iana"
  },
  "application/vnd.qualcomm.brew-app-res": {
    "source": "iana"
  },
  "application/vnd.quark.quarkxpress": {
    "source": "iana",
    "extensions": ["qxd","qxt","qwd","qwt","qxl","qxb"]
  },
  "application/vnd.quobject-quoxdocument": {
    "source": "iana"
  },
  "application/vnd.radisys.moml+xml": {
    "source": "iana"
  },
  "application/vnd.radisys.msml+xml": {
    "source": "iana"
  },
  "application/vnd.radisys.msml-audit+xml": {
    "source": "iana"
  },
  "application/vnd.radisys.msml-audit-conf+xml": {
    "source": "iana"
  },
  "application/vnd.radisys.msml-audit-conn+xml": {
    "source": "iana"
  },
  "application/vnd.radisys.msml-audit-dialog+xml": {
    "source": "iana"
  },
  "application/vnd.radisys.msml-audit-stream+xml": {
    "source": "iana"
  },
  "application/vnd.radisys.msml-conf+xml": {
    "source": "iana"
  },
  "application/vnd.radisys.msml-dialog+xml": {
    "source": "iana"
  },
  "application/vnd.radisys.msml-dialog-base+xml": {
    "source": "iana"
  },
  "application/vnd.radisys.msml-dialog-fax-detect+xml": {
    "source": "iana"
  },
  "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": {
    "source": "iana"
  },
  "application/vnd.radisys.msml-dialog-group+xml": {
    "source": "iana"
  },
  "application/vnd.radisys.msml-dialog-speech+xml": {
    "source": "iana"
  },
  "application/vnd.radisys.msml-dialog-transform+xml": {
    "source": "iana"
  },
  "application/vnd.rainstor.data": {
    "source": "iana"
  },
  "application/vnd.rapid": {
    "source": "iana"
  },
  "application/vnd.realvnc.bed": {
    "source": "iana",
    "extensions": ["bed"]
  },
  "application/vnd.recordare.musicxml": {
    "source": "iana",
    "extensions": ["mxl"]
  },
  "application/vnd.recordare.musicxml+xml": {
    "source": "iana",
    "extensions": ["musicxml"]
  },
  "application/vnd.renlearn.rlprint": {
    "source": "iana"
  },
  "application/vnd.rig.cryptonote": {
    "source": "iana",
    "extensions": ["cryptonote"]
  },
  "application/vnd.rim.cod": {
    "source": "apache",
    "extensions": ["cod"]
  },
  "application/vnd.rn-realmedia": {
    "source": "apache",
    "extensions": ["rm"]
  },
  "application/vnd.rn-realmedia-vbr": {
    "source": "apache",
    "extensions": ["rmvb"]
  },
  "application/vnd.route66.link66+xml": {
    "source": "iana",
    "extensions": ["link66"]
  },
  "application/vnd.rs-274x": {
    "source": "iana"
  },
  "application/vnd.ruckus.download": {
    "source": "iana"
  },
  "application/vnd.s3sms": {
    "source": "iana"
  },
  "application/vnd.sailingtracker.track": {
    "source": "iana",
    "extensions": ["st"]
  },
  "application/vnd.sbm.cid": {
    "source": "iana"
  },
  "application/vnd.sbm.mid2": {
    "source": "iana"
  },
  "application/vnd.scribus": {
    "source": "iana"
  },
  "application/vnd.sealed.3df": {
    "source": "iana"
  },
  "application/vnd.sealed.csf": {
    "source": "iana"
  },
  "application/vnd.sealed.doc": {
    "source": "iana"
  },
  "application/vnd.sealed.eml": {
    "source": "iana"
  },
  "application/vnd.sealed.mht": {
    "source": "iana"
  },
  "application/vnd.sealed.net": {
    "source": "iana"
  },
  "application/vnd.sealed.ppt": {
    "source": "iana"
  },
  "application/vnd.sealed.tiff": {
    "source": "iana"
  },
  "application/vnd.sealed.xls": {
    "source": "iana"
  },
  "application/vnd.sealedmedia.softseal.html": {
    "source": "iana"
  },
  "application/vnd.sealedmedia.softseal.pdf": {
    "source": "iana"
  },
  "application/vnd.seemail": {
    "source": "iana",
    "extensions": ["see"]
  },
  "application/vnd.sema": {
    "source": "iana",
    "extensions": ["sema"]
  },
  "application/vnd.semd": {
    "source": "iana",
    "extensions": ["semd"]
  },
  "application/vnd.semf": {
    "source": "iana",
    "extensions": ["semf"]
  },
  "application/vnd.shana.informed.formdata": {
    "source": "iana",
    "extensions": ["ifm"]
  },
  "application/vnd.shana.informed.formtemplate": {
    "source": "iana",
    "extensions": ["itp"]
  },
  "application/vnd.shana.informed.interchange": {
    "source": "iana",
    "extensions": ["iif"]
  },
  "application/vnd.shana.informed.package": {
    "source": "iana",
    "extensions": ["ipk"]
  },
  "application/vnd.simtech-mindmapper": {
    "source": "iana",
    "extensions": ["twd","twds"]
  },
  "application/vnd.siren+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.smaf": {
    "source": "iana",
    "extensions": ["mmf"]
  },
  "application/vnd.smart.notebook": {
    "source": "iana"
  },
  "application/vnd.smart.teacher": {
    "source": "iana",
    "extensions": ["teacher"]
  },
  "application/vnd.software602.filler.form+xml": {
    "source": "iana"
  },
  "application/vnd.software602.filler.form-xml-zip": {
    "source": "iana"
  },
  "application/vnd.solent.sdkm+xml": {
    "source": "iana",
    "extensions": ["sdkm","sdkd"]
  },
  "application/vnd.spotfire.dxp": {
    "source": "iana",
    "extensions": ["dxp"]
  },
  "application/vnd.spotfire.sfs": {
    "source": "iana",
    "extensions": ["sfs"]
  },
  "application/vnd.sss-cod": {
    "source": "iana"
  },
  "application/vnd.sss-dtf": {
    "source": "iana"
  },
  "application/vnd.sss-ntf": {
    "source": "iana"
  },
  "application/vnd.stardivision.calc": {
    "source": "apache",
    "extensions": ["sdc"]
  },
  "application/vnd.stardivision.draw": {
    "source": "apache",
    "extensions": ["sda"]
  },
  "application/vnd.stardivision.impress": {
    "source": "apache",
    "extensions": ["sdd"]
  },
  "application/vnd.stardivision.math": {
    "source": "apache",
    "extensions": ["smf"]
  },
  "application/vnd.stardivision.writer": {
    "source": "apache",
    "extensions": ["sdw","vor"]
  },
  "application/vnd.stardivision.writer-global": {
    "source": "apache",
    "extensions": ["sgl"]
  },
  "application/vnd.stepmania.package": {
    "source": "iana",
    "extensions": ["smzip"]
  },
  "application/vnd.stepmania.stepchart": {
    "source": "iana",
    "extensions": ["sm"]
  },
  "application/vnd.street-stream": {
    "source": "iana"
  },
  "application/vnd.sun.wadl+xml": {
    "source": "iana"
  },
  "application/vnd.sun.xml.calc": {
    "source": "apache",
    "extensions": ["sxc"]
  },
  "application/vnd.sun.xml.calc.template": {
    "source": "apache",
    "extensions": ["stc"]
  },
  "application/vnd.sun.xml.draw": {
    "source": "apache",
    "extensions": ["sxd"]
  },
  "application/vnd.sun.xml.draw.template": {
    "source": "apache",
    "extensions": ["std"]
  },
  "application/vnd.sun.xml.impress": {
    "source": "apache",
    "extensions": ["sxi"]
  },
  "application/vnd.sun.xml.impress.template": {
    "source": "apache",
    "extensions": ["sti"]
  },
  "application/vnd.sun.xml.math": {
    "source": "apache",
    "extensions": ["sxm"]
  },
  "application/vnd.sun.xml.writer": {
    "source": "apache",
    "extensions": ["sxw"]
  },
  "application/vnd.sun.xml.writer.global": {
    "source": "apache",
    "extensions": ["sxg"]
  },
  "application/vnd.sun.xml.writer.template": {
    "source": "apache",
    "extensions": ["stw"]
  },
  "application/vnd.sus-calendar": {
    "source": "iana",
    "extensions": ["sus","susp"]
  },
  "application/vnd.svd": {
    "source": "iana",
    "extensions": ["svd"]
  },
  "application/vnd.swiftview-ics": {
    "source": "iana"
  },
  "application/vnd.symbian.install": {
    "source": "apache",
    "extensions": ["sis","sisx"]
  },
  "application/vnd.syncml+xml": {
    "source": "iana",
    "extensions": ["xsm"]
  },
  "application/vnd.syncml.dm+wbxml": {
    "source": "iana",
    "extensions": ["bdm"]
  },
  "application/vnd.syncml.dm+xml": {
    "source": "iana",
    "extensions": ["xdm"]
  },
  "application/vnd.syncml.dm.notification": {
    "source": "iana"
  },
  "application/vnd.syncml.dmddf+wbxml": {
    "source": "iana"
  },
  "application/vnd.syncml.dmddf+xml": {
    "source": "iana"
  },
  "application/vnd.syncml.dmtnds+wbxml": {
    "source": "iana"
  },
  "application/vnd.syncml.dmtnds+xml": {
    "source": "iana"
  },
  "application/vnd.syncml.ds.notification": {
    "source": "iana"
  },
  "application/vnd.tao.intent-module-archive": {
    "source": "iana",
    "extensions": ["tao"]
  },
  "application/vnd.tcpdump.pcap": {
    "source": "iana",
    "extensions": ["pcap","cap","dmp"]
  },
  "application/vnd.tmd.mediaflex.api+xml": {
    "source": "iana"
  },
  "application/vnd.tmobile-livetv": {
    "source": "iana",
    "extensions": ["tmo"]
  },
  "application/vnd.trid.tpt": {
    "source": "iana",
    "extensions": ["tpt"]
  },
  "application/vnd.triscape.mxs": {
    "source": "iana",
    "extensions": ["mxs"]
  },
  "application/vnd.trueapp": {
    "source": "iana",
    "extensions": ["tra"]
  },
  "application/vnd.truedoc": {
    "source": "iana"
  },
  "application/vnd.ubisoft.webplayer": {
    "source": "iana"
  },
  "application/vnd.ufdl": {
    "source": "iana",
    "extensions": ["ufd","ufdl"]
  },
  "application/vnd.uiq.theme": {
    "source": "iana",
    "extensions": ["utz"]
  },
  "application/vnd.umajin": {
    "source": "iana",
    "extensions": ["umj"]
  },
  "application/vnd.unity": {
    "source": "iana",
    "extensions": ["unityweb"]
  },
  "application/vnd.uoml+xml": {
    "source": "iana",
    "extensions": ["uoml"]
  },
  "application/vnd.uplanet.alert": {
    "source": "iana"
  },
  "application/vnd.uplanet.alert-wbxml": {
    "source": "iana"
  },
  "application/vnd.uplanet.bearer-choice": {
    "source": "iana"
  },
  "application/vnd.uplanet.bearer-choice-wbxml": {
    "source": "iana"
  },
  "application/vnd.uplanet.cacheop": {
    "source": "iana"
  },
  "application/vnd.uplanet.cacheop-wbxml": {
    "source": "iana"
  },
  "application/vnd.uplanet.channel": {
    "source": "iana"
  },
  "application/vnd.uplanet.channel-wbxml": {
    "source": "iana"
  },
  "application/vnd.uplanet.list": {
    "source": "iana"
  },
  "application/vnd.uplanet.list-wbxml": {
    "source": "iana"
  },
  "application/vnd.uplanet.listcmd": {
    "source": "iana"
  },
  "application/vnd.uplanet.listcmd-wbxml": {
    "source": "iana"
  },
  "application/vnd.uplanet.signal": {
    "source": "iana"
  },
  "application/vnd.valve.source.material": {
    "source": "iana"
  },
  "application/vnd.vcx": {
    "source": "iana",
    "extensions": ["vcx"]
  },
  "application/vnd.vd-study": {
    "source": "iana"
  },
  "application/vnd.vectorworks": {
    "source": "iana"
  },
  "application/vnd.verimatrix.vcas": {
    "source": "iana"
  },
  "application/vnd.vidsoft.vidconference": {
    "source": "iana"
  },
  "application/vnd.visio": {
    "source": "iana",
    "extensions": ["vsd","vst","vss","vsw"]
  },
  "application/vnd.visionary": {
    "source": "iana",
    "extensions": ["vis"]
  },
  "application/vnd.vividence.scriptfile": {
    "source": "iana"
  },
  "application/vnd.vsf": {
    "source": "iana",
    "extensions": ["vsf"]
  },
  "application/vnd.wap.sic": {
    "source": "iana"
  },
  "application/vnd.wap.slc": {
    "source": "iana"
  },
  "application/vnd.wap.wbxml": {
    "source": "iana",
    "extensions": ["wbxml"]
  },
  "application/vnd.wap.wmlc": {
    "source": "iana",
    "extensions": ["wmlc"]
  },
  "application/vnd.wap.wmlscriptc": {
    "source": "iana",
    "extensions": ["wmlsc"]
  },
  "application/vnd.webturbo": {
    "source": "iana",
    "extensions": ["wtb"]
  },
  "application/vnd.wfa.p2p": {
    "source": "iana"
  },
  "application/vnd.wfa.wsc": {
    "source": "iana"
  },
  "application/vnd.windows.devicepairing": {
    "source": "iana"
  },
  "application/vnd.wmc": {
    "source": "iana"
  },
  "application/vnd.wmf.bootstrap": {
    "source": "iana"
  },
  "application/vnd.wolfram.mathematica": {
    "source": "iana"
  },
  "application/vnd.wolfram.mathematica.package": {
    "source": "iana"
  },
  "application/vnd.wolfram.player": {
    "source": "iana",
    "extensions": ["nbp"]
  },
  "application/vnd.wordperfect": {
    "source": "iana",
    "extensions": ["wpd"]
  },
  "application/vnd.wqd": {
    "source": "iana",
    "extensions": ["wqd"]
  },
  "application/vnd.wrq-hp3000-labelled": {
    "source": "iana"
  },
  "application/vnd.wt.stf": {
    "source": "iana",
    "extensions": ["stf"]
  },
  "application/vnd.wv.csp+wbxml": {
    "source": "iana"
  },
  "application/vnd.wv.csp+xml": {
    "source": "iana"
  },
  "application/vnd.wv.ssp+xml": {
    "source": "iana"
  },
  "application/vnd.xacml+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.xara": {
    "source": "iana",
    "extensions": ["xar"]
  },
  "application/vnd.xfdl": {
    "source": "iana",
    "extensions": ["xfdl"]
  },
  "application/vnd.xfdl.webform": {
    "source": "iana"
  },
  "application/vnd.xmi+xml": {
    "source": "iana"
  },
  "application/vnd.xmpie.cpkg": {
    "source": "iana"
  },
  "application/vnd.xmpie.dpkg": {
    "source": "iana"
  },
  "application/vnd.xmpie.plan": {
    "source": "iana"
  },
  "application/vnd.xmpie.ppkg": {
    "source": "iana"
  },
  "application/vnd.xmpie.xlim": {
    "source": "iana"
  },
  "application/vnd.yamaha.hv-dic": {
    "source": "iana",
    "extensions": ["hvd"]
  },
  "application/vnd.yamaha.hv-script": {
    "source": "iana",
    "extensions": ["hvs"]
  },
  "application/vnd.yamaha.hv-voice": {
    "source": "iana",
    "extensions": ["hvp"]
  },
  "application/vnd.yamaha.openscoreformat": {
    "source": "iana",
    "extensions": ["osf"]
  },
  "application/vnd.yamaha.openscoreformat.osfpvg+xml": {
    "source": "iana",
    "extensions": ["osfpvg"]
  },
  "application/vnd.yamaha.remote-setup": {
    "source": "iana"
  },
  "application/vnd.yamaha.smaf-audio": {
    "source": "iana",
    "extensions": ["saf"]
  },
  "application/vnd.yamaha.smaf-phrase": {
    "source": "iana",
    "extensions": ["spf"]
  },
  "application/vnd.yamaha.through-ngn": {
    "source": "iana"
  },
  "application/vnd.yamaha.tunnel-udpencap": {
    "source": "iana"
  },
  "application/vnd.yaoweme": {
    "source": "iana"
  },
  "application/vnd.yellowriver-custom-menu": {
    "source": "iana",
    "extensions": ["cmp"]
  },
  "application/vnd.zul": {
    "source": "iana",
    "extensions": ["zir","zirz"]
  },
  "application/vnd.zzazz.deck+xml": {
    "source": "iana",
    "extensions": ["zaz"]
  },
  "application/voicexml+xml": {
    "source": "iana",
    "extensions": ["vxml"]
  },
  "application/vq-rtcpxr": {
    "source": "iana"
  },
  "application/watcherinfo+xml": {
    "source": "iana"
  },
  "application/whoispp-query": {
    "source": "iana"
  },
  "application/whoispp-response": {
    "source": "iana"
  },
  "application/widget": {
    "source": "iana",
    "extensions": ["wgt"]
  },
  "application/winhlp": {
    "source": "apache",
    "extensions": ["hlp"]
  },
  "application/wita": {
    "source": "iana"
  },
  "application/wordperfect5.1": {
    "source": "iana"
  },
  "application/wsdl+xml": {
    "source": "iana",
    "extensions": ["wsdl"]
  },
  "application/wspolicy+xml": {
    "source": "iana",
    "extensions": ["wspolicy"]
  },
  "application/x-7z-compressed": {
    "source": "apache",
    "compressible": false,
    "extensions": ["7z"]
  },
  "application/x-abiword": {
    "source": "apache",
    "extensions": ["abw"]
  },
  "application/x-ace-compressed": {
    "source": "apache",
    "extensions": ["ace"]
  },
  "application/x-amf": {
    "source": "apache"
  },
  "application/x-apple-diskimage": {
    "source": "apache",
    "extensions": ["dmg"]
  },
  "application/x-authorware-bin": {
    "source": "apache",
    "extensions": ["aab","x32","u32","vox"]
  },
  "application/x-authorware-map": {
    "source": "apache",
    "extensions": ["aam"]
  },
  "application/x-authorware-seg": {
    "source": "apache",
    "extensions": ["aas"]
  },
  "application/x-bcpio": {
    "source": "apache",
    "extensions": ["bcpio"]
  },
  "application/x-bdoc": {
    "compressible": false,
    "extensions": ["bdoc"]
  },
  "application/x-bittorrent": {
    "source": "apache",
    "extensions": ["torrent"]
  },
  "application/x-blorb": {
    "source": "apache",
    "extensions": ["blb","blorb"]
  },
  "application/x-bzip": {
    "source": "apache",
    "compressible": false,
    "extensions": ["bz"]
  },
  "application/x-bzip2": {
    "source": "apache",
    "compressible": false,
    "extensions": ["bz2","boz"]
  },
  "application/x-cbr": {
    "source": "apache",
    "extensions": ["cbr","cba","cbt","cbz","cb7"]
  },
  "application/x-cdlink": {
    "source": "apache",
    "extensions": ["vcd"]
  },
  "application/x-cfs-compressed": {
    "source": "apache",
    "extensions": ["cfs"]
  },
  "application/x-chat": {
    "source": "apache",
    "extensions": ["chat"]
  },
  "application/x-chess-pgn": {
    "source": "apache",
    "extensions": ["pgn"]
  },
  "application/x-chrome-extension": {
    "extensions": ["crx"]
  },
  "application/x-cocoa": {
    "source": "nginx",
    "extensions": ["cco"]
  },
  "application/x-compress": {
    "source": "apache"
  },
  "application/x-conference": {
    "source": "apache",
    "extensions": ["nsc"]
  },
  "application/x-cpio": {
    "source": "apache",
    "extensions": ["cpio"]
  },
  "application/x-csh": {
    "source": "apache",
    "extensions": ["csh"]
  },
  "application/x-deb": {
    "compressible": false
  },
  "application/x-debian-package": {
    "source": "apache",
    "extensions": ["deb","udeb"]
  },
  "application/x-dgc-compressed": {
    "source": "apache",
    "extensions": ["dgc"]
  },
  "application/x-director": {
    "source": "apache",
    "extensions": ["dir","dcr","dxr","cst","cct","cxt","w3d","fgd","swa"]
  },
  "application/x-doom": {
    "source": "apache",
    "extensions": ["wad"]
  },
  "application/x-dtbncx+xml": {
    "source": "apache",
    "extensions": ["ncx"]
  },
  "application/x-dtbook+xml": {
    "source": "apache",
    "extensions": ["dtb"]
  },
  "application/x-dtbresource+xml": {
    "source": "apache",
    "extensions": ["res"]
  },
  "application/x-dvi": {
    "source": "apache",
    "compressible": false,
    "extensions": ["dvi"]
  },
  "application/x-envoy": {
    "source": "apache",
    "extensions": ["evy"]
  },
  "application/x-eva": {
    "source": "apache",
    "extensions": ["eva"]
  },
  "application/x-font-bdf": {
    "source": "apache",
    "extensions": ["bdf"]
  },
  "application/x-font-dos": {
    "source": "apache"
  },
  "application/x-font-framemaker": {
    "source": "apache"
  },
  "application/x-font-ghostscript": {
    "source": "apache",
    "extensions": ["gsf"]
  },
  "application/x-font-libgrx": {
    "source": "apache"
  },
  "application/x-font-linux-psf": {
    "source": "apache",
    "extensions": ["psf"]
  },
  "application/x-font-otf": {
    "source": "apache",
    "compressible": true,
    "extensions": ["otf"]
  },
  "application/x-font-pcf": {
    "source": "apache",
    "extensions": ["pcf"]
  },
  "application/x-font-snf": {
    "source": "apache",
    "extensions": ["snf"]
  },
  "application/x-font-speedo": {
    "source": "apache"
  },
  "application/x-font-sunos-news": {
    "source": "apache"
  },
  "application/x-font-ttf": {
    "source": "apache",
    "compressible": true,
    "extensions": ["ttf","ttc"]
  },
  "application/x-font-type1": {
    "source": "apache",
    "extensions": ["pfa","pfb","pfm","afm"]
  },
  "application/x-font-vfont": {
    "source": "apache"
  },
  "application/x-freearc": {
    "source": "apache",
    "extensions": ["arc"]
  },
  "application/x-futuresplash": {
    "source": "apache",
    "extensions": ["spl"]
  },
  "application/x-gca-compressed": {
    "source": "apache",
    "extensions": ["gca"]
  },
  "application/x-glulx": {
    "source": "apache",
    "extensions": ["ulx"]
  },
  "application/x-gnumeric": {
    "source": "apache",
    "extensions": ["gnumeric"]
  },
  "application/x-gramps-xml": {
    "source": "apache",
    "extensions": ["gramps"]
  },
  "application/x-gtar": {
    "source": "apache",
    "extensions": ["gtar"]
  },
  "application/x-gzip": {
    "source": "apache"
  },
  "application/x-hdf": {
    "source": "apache",
    "extensions": ["hdf"]
  },
  "application/x-httpd-php": {
    "compressible": true,
    "extensions": ["php"]
  },
  "application/x-install-instructions": {
    "source": "apache",
    "extensions": ["install"]
  },
  "application/x-iso9660-image": {
    "source": "apache",
    "extensions": ["iso"]
  },
  "application/x-java-archive-diff": {
    "source": "nginx",
    "extensions": ["jardiff"]
  },
  "application/x-java-jnlp-file": {
    "source": "apache",
    "compressible": false,
    "extensions": ["jnlp"]
  },
  "application/x-javascript": {
    "compressible": true
  },
  "application/x-latex": {
    "source": "apache",
    "compressible": false,
    "extensions": ["latex"]
  },
  "application/x-lua-bytecode": {
    "extensions": ["luac"]
  },
  "application/x-lzh-compressed": {
    "source": "apache",
    "extensions": ["lzh","lha"]
  },
  "application/x-makeself": {
    "source": "nginx",
    "extensions": ["run"]
  },
  "application/x-mie": {
    "source": "apache",
    "extensions": ["mie"]
  },
  "application/x-mobipocket-ebook": {
    "source": "apache",
    "extensions": ["prc","mobi"]
  },
  "application/x-mpegurl": {
    "compressible": false
  },
  "application/x-ms-application": {
    "source": "apache",
    "extensions": ["application"]
  },
  "application/x-ms-shortcut": {
    "source": "apache",
    "extensions": ["lnk"]
  },
  "application/x-ms-wmd": {
    "source": "apache",
    "extensions": ["wmd"]
  },
  "application/x-ms-wmz": {
    "source": "apache",
    "extensions": ["wmz"]
  },
  "application/x-ms-xbap": {
    "source": "apache",
    "extensions": ["xbap"]
  },
  "application/x-msaccess": {
    "source": "apache",
    "extensions": ["mdb"]
  },
  "application/x-msbinder": {
    "source": "apache",
    "extensions": ["obd"]
  },
  "application/x-mscardfile": {
    "source": "apache",
    "extensions": ["crd"]
  },
  "application/x-msclip": {
    "source": "apache",
    "extensions": ["clp"]
  },
  "application/x-msdownload": {
    "source": "apache",
    "extensions": ["exe","dll","com","bat","msi"]
  },
  "application/x-msmediaview": {
    "source": "apache",
    "extensions": ["mvb","m13","m14"]
  },
  "application/x-msmetafile": {
    "source": "apache",
    "extensions": ["wmf","wmz","emf","emz"]
  },
  "application/x-msmoney": {
    "source": "apache",
    "extensions": ["mny"]
  },
  "application/x-mspublisher": {
    "source": "apache",
    "extensions": ["pub"]
  },
  "application/x-msschedule": {
    "source": "apache",
    "extensions": ["scd"]
  },
  "application/x-msterminal": {
    "source": "apache",
    "extensions": ["trm"]
  },
  "application/x-mswrite": {
    "source": "apache",
    "extensions": ["wri"]
  },
  "application/x-netcdf": {
    "source": "apache",
    "extensions": ["nc","cdf"]
  },
  "application/x-ns-proxy-autoconfig": {
    "compressible": true,
    "extensions": ["pac"]
  },
  "application/x-nzb": {
    "source": "apache",
    "extensions": ["nzb"]
  },
  "application/x-perl": {
    "source": "nginx",
    "extensions": ["pl","pm"]
  },
  "application/x-pilot": {
    "source": "nginx",
    "extensions": ["prc","pdb"]
  },
  "application/x-pkcs12": {
    "source": "apache",
    "compressible": false,
    "extensions": ["p12","pfx"]
  },
  "application/x-pkcs7-certificates": {
    "source": "apache",
    "extensions": ["p7b","spc"]
  },
  "application/x-pkcs7-certreqresp": {
    "source": "apache",
    "extensions": ["p7r"]
  },
  "application/x-rar-compressed": {
    "source": "apache",
    "compressible": false,
    "extensions": ["rar"]
  },
  "application/x-redhat-package-manager": {
    "source": "nginx",
    "extensions": ["rpm"]
  },
  "application/x-research-info-systems": {
    "source": "apache",
    "extensions": ["ris"]
  },
  "application/x-sea": {
    "source": "nginx",
    "extensions": ["sea"]
  },
  "application/x-sh": {
    "source": "apache",
    "compressible": true,
    "extensions": ["sh"]
  },
  "application/x-shar": {
    "source": "apache",
    "extensions": ["shar"]
  },
  "application/x-shockwave-flash": {
    "source": "apache",
    "compressible": false,
    "extensions": ["swf"]
  },
  "application/x-silverlight-app": {
    "source": "apache",
    "extensions": ["xap"]
  },
  "application/x-sql": {
    "source": "apache",
    "extensions": ["sql"]
  },
  "application/x-stuffit": {
    "source": "apache",
    "compressible": false,
    "extensions": ["sit"]
  },
  "application/x-stuffitx": {
    "source": "apache",
    "extensions": ["sitx"]
  },
  "application/x-subrip": {
    "source": "apache",
    "extensions": ["srt"]
  },
  "application/x-sv4cpio": {
    "source": "apache",
    "extensions": ["sv4cpio"]
  },
  "application/x-sv4crc": {
    "source": "apache",
    "extensions": ["sv4crc"]
  },
  "application/x-t3vm-image": {
    "source": "apache",
    "extensions": ["t3"]
  },
  "application/x-tads": {
    "source": "apache",
    "extensions": ["gam"]
  },
  "application/x-tar": {
    "source": "apache",
    "compressible": true,
    "extensions": ["tar"]
  },
  "application/x-tcl": {
    "source": "apache",
    "extensions": ["tcl","tk"]
  },
  "application/x-tex": {
    "source": "apache",
    "extensions": ["tex"]
  },
  "application/x-tex-tfm": {
    "source": "apache",
    "extensions": ["tfm"]
  },
  "application/x-texinfo": {
    "source": "apache",
    "extensions": ["texinfo","texi"]
  },
  "application/x-tgif": {
    "source": "apache",
    "extensions": ["obj"]
  },
  "application/x-ustar": {
    "source": "apache",
    "extensions": ["ustar"]
  },
  "application/x-wais-source": {
    "source": "apache",
    "extensions": ["src"]
  },
  "application/x-web-app-manifest+json": {
    "compressible": true,
    "extensions": ["webapp"]
  },
  "application/x-www-form-urlencoded": {
    "source": "iana",
    "compressible": true
  },
  "application/x-x509-ca-cert": {
    "source": "apache",
    "extensions": ["der","crt","pem"]
  },
  "application/x-xfig": {
    "source": "apache",
    "extensions": ["fig"]
  },
  "application/x-xliff+xml": {
    "source": "apache",
    "extensions": ["xlf"]
  },
  "application/x-xpinstall": {
    "source": "apache",
    "compressible": false,
    "extensions": ["xpi"]
  },
  "application/x-xz": {
    "source": "apache",
    "extensions": ["xz"]
  },
  "application/x-zmachine": {
    "source": "apache",
    "extensions": ["z1","z2","z3","z4","z5","z6","z7","z8"]
  },
  "application/x400-bp": {
    "source": "iana"
  },
  "application/xacml+xml": {
    "source": "iana"
  },
  "application/xaml+xml": {
    "source": "apache",
    "extensions": ["xaml"]
  },
  "application/xcap-att+xml": {
    "source": "iana"
  },
  "application/xcap-caps+xml": {
    "source": "iana"
  },
  "application/xcap-diff+xml": {
    "source": "iana",
    "extensions": ["xdf"]
  },
  "application/xcap-el+xml": {
    "source": "iana"
  },
  "application/xcap-error+xml": {
    "source": "iana"
  },
  "application/xcap-ns+xml": {
    "source": "iana"
  },
  "application/xcon-conference-info+xml": {
    "source": "iana"
  },
  "application/xcon-conference-info-diff+xml": {
    "source": "iana"
  },
  "application/xenc+xml": {
    "source": "iana",
    "extensions": ["xenc"]
  },
  "application/xhtml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": ["xhtml","xht"]
  },
  "application/xhtml-voice+xml": {
    "source": "apache"
  },
  "application/xml": {
    "source": "iana",
    "compressible": true,
    "extensions": ["xml","xsl","xsd"]
  },
  "application/xml-dtd": {
    "source": "iana",
    "compressible": true,
    "extensions": ["dtd"]
  },
  "application/xml-external-parsed-entity": {
    "source": "iana"
  },
  "application/xml-patch+xml": {
    "source": "iana"
  },
  "application/xmpp+xml": {
    "source": "iana"
  },
  "application/xop+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": ["xop"]
  },
  "application/xproc+xml": {
    "source": "apache",
    "extensions": ["xpl"]
  },
  "application/xslt+xml": {
    "source": "iana",
    "extensions": ["xslt"]
  },
  "application/xspf+xml": {
    "source": "apache",
    "extensions": ["xspf"]
  },
  "application/xv+xml": {
    "source": "iana",
    "extensions": ["mxml","xhvml","xvml","xvm"]
  },
  "application/yang": {
    "source": "iana",
    "extensions": ["yang"]
  },
  "application/yin+xml": {
    "source": "iana",
    "extensions": ["yin"]
  },
  "application/zip": {
    "source": "iana",
    "compressible": false,
    "extensions": ["zip"]
  },
  "application/zlib": {
    "source": "iana"
  },
  "audio/1d-interleaved-parityfec": {
    "source": "iana"
  },
  "audio/32kadpcm": {
    "source": "iana"
  },
  "audio/3gpp": {
    "source": "iana"
  },
  "audio/3gpp2": {
    "source": "iana"
  },
  "audio/ac3": {
    "source": "iana"
  },
  "audio/adpcm": {
    "source": "apache",
    "extensions": ["adp"]
  },
  "audio/amr": {
    "source": "iana"
  },
  "audio/amr-wb": {
    "source": "iana"
  },
  "audio/amr-wb+": {
    "source": "iana"
  },
  "audio/aptx": {
    "source": "iana"
  },
  "audio/asc": {
    "source": "iana"
  },
  "audio/atrac-advanced-lossless": {
    "source": "iana"
  },
  "audio/atrac-x": {
    "source": "iana"
  },
  "audio/atrac3": {
    "source": "iana"
  },
  "audio/basic": {
    "source": "iana",
    "compressible": false,
    "extensions": ["au","snd"]
  },
  "audio/bv16": {
    "source": "iana"
  },
  "audio/bv32": {
    "source": "iana"
  },
  "audio/clearmode": {
    "source": "iana"
  },
  "audio/cn": {
    "source": "iana"
  },
  "audio/dat12": {
    "source": "iana"
  },
  "audio/dls": {
    "source": "iana"
  },
  "audio/dsr-es201108": {
    "source": "iana"
  },
  "audio/dsr-es202050": {
    "source": "iana"
  },
  "audio/dsr-es202211": {
    "source": "iana"
  },
  "audio/dsr-es202212": {
    "source": "iana"
  },
  "audio/dv": {
    "source": "iana"
  },
  "audio/dvi4": {
    "source": "iana"
  },
  "audio/eac3": {
    "source": "iana"
  },
  "audio/encaprtp": {
    "source": "iana"
  },
  "audio/evrc": {
    "source": "iana"
  },
  "audio/evrc-qcp": {
    "source": "iana"
  },
  "audio/evrc0": {
    "source": "iana"
  },
  "audio/evrc1": {
    "source": "iana"
  },
  "audio/evrcb": {
    "source": "iana"
  },
  "audio/evrcb0": {
    "source": "iana"
  },
  "audio/evrcb1": {
    "source": "iana"
  },
  "audio/evrcnw": {
    "source": "iana"
  },
  "audio/evrcnw0": {
    "source": "iana"
  },
  "audio/evrcnw1": {
    "source": "iana"
  },
  "audio/evrcwb": {
    "source": "iana"
  },
  "audio/evrcwb0": {
    "source": "iana"
  },
  "audio/evrcwb1": {
    "source": "iana"
  },
  "audio/fwdred": {
    "source": "iana"
  },
  "audio/g719": {
    "source": "iana"
  },
  "audio/g722": {
    "source": "iana"
  },
  "audio/g7221": {
    "source": "iana"
  },
  "audio/g723": {
    "source": "iana"
  },
  "audio/g726-16": {
    "source": "iana"
  },
  "audio/g726-24": {
    "source": "iana"
  },
  "audio/g726-32": {
    "source": "iana"
  },
  "audio/g726-40": {
    "source": "iana"
  },
  "audio/g728": {
    "source": "iana"
  },
  "audio/g729": {
    "source": "iana"
  },
  "audio/g7291": {
    "source": "iana"
  },
  "audio/g729d": {
    "source": "iana"
  },
  "audio/g729e": {
    "source": "iana"
  },
  "audio/gsm": {
    "source": "iana"
  },
  "audio/gsm-efr": {
    "source": "iana"
  },
  "audio/gsm-hr-08": {
    "source": "iana"
  },
  "audio/ilbc": {
    "source": "iana"
  },
  "audio/ip-mr_v2.5": {
    "source": "iana"
  },
  "audio/isac": {
    "source": "apache"
  },
  "audio/l16": {
    "source": "iana"
  },
  "audio/l20": {
    "source": "iana"
  },
  "audio/l24": {
    "source": "iana",
    "compressible": false
  },
  "audio/l8": {
    "source": "iana"
  },
  "audio/lpc": {
    "source": "iana"
  },
  "audio/midi": {
    "source": "apache",
    "extensions": ["mid","midi","kar","rmi"]
  },
  "audio/mobile-xmf": {
    "source": "iana"
  },
  "audio/mp4": {
    "source": "iana",
    "compressible": false,
    "extensions": ["mp4a","m4a"]
  },
  "audio/mp4a-latm": {
    "source": "iana"
  },
  "audio/mpa": {
    "source": "iana"
  },
  "audio/mpa-robust": {
    "source": "iana"
  },
  "audio/mpeg": {
    "source": "iana",
    "compressible": false,
    "extensions": ["mpga","mp2","mp2a","mp3","m2a","m3a"]
  },
  "audio/mpeg4-generic": {
    "source": "iana"
  },
  "audio/musepack": {
    "source": "apache"
  },
  "audio/ogg": {
    "source": "iana",
    "compressible": false,
    "extensions": ["oga","ogg","spx"]
  },
  "audio/opus": {
    "source": "iana"
  },
  "audio/parityfec": {
    "source": "iana"
  },
  "audio/pcma": {
    "source": "iana"
  },
  "audio/pcma-wb": {
    "source": "iana"
  },
  "audio/pcmu": {
    "source": "iana"
  },
  "audio/pcmu-wb": {
    "source": "iana"
  },
  "audio/prs.sid": {
    "source": "iana"
  },
  "audio/qcelp": {
    "source": "iana"
  },
  "audio/raptorfec": {
    "source": "iana"
  },
  "audio/red": {
    "source": "iana"
  },
  "audio/rtp-enc-aescm128": {
    "source": "iana"
  },
  "audio/rtp-midi": {
    "source": "iana"
  },
  "audio/rtploopback": {
    "source": "iana"
  },
  "audio/rtx": {
    "source": "iana"
  },
  "audio/s3m": {
    "source": "apache",
    "extensions": ["s3m"]
  },
  "audio/silk": {
    "source": "apache",
    "extensions": ["sil"]
  },
  "audio/smv": {
    "source": "iana"
  },
  "audio/smv-qcp": {
    "source": "iana"
  },
  "audio/smv0": {
    "source": "iana"
  },
  "audio/sp-midi": {
    "source": "iana"
  },
  "audio/speex": {
    "source": "iana"
  },
  "audio/t140c": {
    "source": "iana"
  },
  "audio/t38": {
    "source": "iana"
  },
  "audio/telephone-event": {
    "source": "iana"
  },
  "audio/tone": {
    "source": "iana"
  },
  "audio/uemclip": {
    "source": "iana"
  },
  "audio/ulpfec": {
    "source": "iana"
  },
  "audio/vdvi": {
    "source": "iana"
  },
  "audio/vmr-wb": {
    "source": "iana"
  },
  "audio/vnd.3gpp.iufp": {
    "source": "iana"
  },
  "audio/vnd.4sb": {
    "source": "iana"
  },
  "audio/vnd.audiokoz": {
    "source": "iana"
  },
  "audio/vnd.celp": {
    "source": "iana"
  },
  "audio/vnd.cisco.nse": {
    "source": "iana"
  },
  "audio/vnd.cmles.radio-events": {
    "source": "iana"
  },
  "audio/vnd.cns.anp1": {
    "source": "iana"
  },
  "audio/vnd.cns.inf1": {
    "source": "iana"
  },
  "audio/vnd.dece.audio": {
    "source": "iana",
    "extensions": ["uva","uvva"]
  },
  "audio/vnd.digital-winds": {
    "source": "iana",
    "extensions": ["eol"]
  },
  "audio/vnd.dlna.adts": {
    "source": "iana"
  },
  "audio/vnd.dolby.heaac.1": {
    "source": "iana"
  },
  "audio/vnd.dolby.heaac.2": {
    "source": "iana"
  },
  "audio/vnd.dolby.mlp": {
    "source": "iana"
  },
  "audio/vnd.dolby.mps": {
    "source": "iana"
  },
  "audio/vnd.dolby.pl2": {
    "source": "iana"
  },
  "audio/vnd.dolby.pl2x": {
    "source": "iana"
  },
  "audio/vnd.dolby.pl2z": {
    "source": "iana"
  },
  "audio/vnd.dolby.pulse.1": {
    "source": "iana"
  },
  "audio/vnd.dra": {
    "source": "iana",
    "extensions": ["dra"]
  },
  "audio/vnd.dts": {
    "source": "iana",
    "extensions": ["dts"]
  },
  "audio/vnd.dts.hd": {
    "source": "iana",
    "extensions": ["dtshd"]
  },
  "audio/vnd.dvb.file": {
    "source": "iana"
  },
  "audio/vnd.everad.plj": {
    "source": "iana"
  },
  "audio/vnd.hns.audio": {
    "source": "iana"
  },
  "audio/vnd.lucent.voice": {
    "source": "iana",
    "extensions": ["lvp"]
  },
  "audio/vnd.ms-playready.media.pya": {
    "source": "iana",
    "extensions": ["pya"]
  },
  "audio/vnd.nokia.mobile-xmf": {
    "source": "iana"
  },
  "audio/vnd.nortel.vbk": {
    "source": "iana"
  },
  "audio/vnd.nuera.ecelp4800": {
    "source": "iana",
    "extensions": ["ecelp4800"]
  },
  "audio/vnd.nuera.ecelp7470": {
    "source": "iana",
    "extensions": ["ecelp7470"]
  },
  "audio/vnd.nuera.ecelp9600": {
    "source": "iana",
    "extensions": ["ecelp9600"]
  },
  "audio/vnd.octel.sbc": {
    "source": "iana"
  },
  "audio/vnd.qcelp": {
    "source": "iana"
  },
  "audio/vnd.rhetorex.32kadpcm": {
    "source": "iana"
  },
  "audio/vnd.rip": {
    "source": "iana",
    "extensions": ["rip"]
  },
  "audio/vnd.rn-realaudio": {
    "compressible": false
  },
  "audio/vnd.sealedmedia.softseal.mpeg": {
    "source": "iana"
  },
  "audio/vnd.vmx.cvsd": {
    "source": "iana"
  },
  "audio/vnd.wave": {
    "compressible": false
  },
  "audio/vorbis": {
    "source": "iana",
    "compressible": false
  },
  "audio/vorbis-config": {
    "source": "iana"
  },
  "audio/wav": {
    "compressible": false,
    "extensions": ["wav"]
  },
  "audio/wave": {
    "compressible": false,
    "extensions": ["wav"]
  },
  "audio/webm": {
    "source": "apache",
    "compressible": false,
    "extensions": ["weba"]
  },
  "audio/x-aac": {
    "source": "apache",
    "compressible": false,
    "extensions": ["aac"]
  },
  "audio/x-aiff": {
    "source": "apache",
    "extensions": ["aif","aiff","aifc"]
  },
  "audio/x-caf": {
    "source": "apache",
    "compressible": false,
    "extensions": ["caf"]
  },
  "audio/x-flac": {
    "source": "apache",
    "extensions": ["flac"]
  },
  "audio/x-m4a": {
    "source": "nginx",
    "extensions": ["m4a"]
  },
  "audio/x-matroska": {
    "source": "apache",
    "extensions": ["mka"]
  },
  "audio/x-mpegurl": {
    "source": "apache",
    "extensions": ["m3u"]
  },
  "audio/x-ms-wax": {
    "source": "apache",
    "extensions": ["wax"]
  },
  "audio/x-ms-wma": {
    "source": "apache",
    "extensions": ["wma"]
  },
  "audio/x-pn-realaudio": {
    "source": "apache",
    "extensions": ["ram","ra"]
  },
  "audio/x-pn-realaudio-plugin": {
    "source": "apache",
    "extensions": ["rmp"]
  },
  "audio/x-realaudio": {
    "source": "nginx",
    "extensions": ["ra"]
  },
  "audio/x-tta": {
    "source": "apache"
  },
  "audio/x-wav": {
    "source": "apache",
    "extensions": ["wav"]
  },
  "audio/xm": {
    "source": "apache",
    "extensions": ["xm"]
  },
  "chemical/x-cdx": {
    "source": "apache",
    "extensions": ["cdx"]
  },
  "chemical/x-cif": {
    "source": "apache",
    "extensions": ["cif"]
  },
  "chemical/x-cmdf": {
    "source": "apache",
    "extensions": ["cmdf"]
  },
  "chemical/x-cml": {
    "source": "apache",
    "extensions": ["cml"]
  },
  "chemical/x-csml": {
    "source": "apache",
    "extensions": ["csml"]
  },
  "chemical/x-pdb": {
    "source": "apache"
  },
  "chemical/x-xyz": {
    "source": "apache",
    "extensions": ["xyz"]
  },
  "font/opentype": {
    "compressible": true,
    "extensions": ["otf"]
  },
  "image/bmp": {
    "source": "apache",
    "compressible": true,
    "extensions": ["bmp"]
  },
  "image/cgm": {
    "source": "iana",
    "extensions": ["cgm"]
  },
  "image/fits": {
    "source": "iana"
  },
  "image/g3fax": {
    "source": "iana",
    "extensions": ["g3"]
  },
  "image/gif": {
    "source": "iana",
    "compressible": false,
    "extensions": ["gif"]
  },
  "image/ief": {
    "source": "iana",
    "extensions": ["ief"]
  },
  "image/jp2": {
    "source": "iana"
  },
  "image/jpeg": {
    "source": "iana",
    "compressible": false,
    "extensions": ["jpeg","jpg","jpe"]
  },
  "image/jpm": {
    "source": "iana"
  },
  "image/jpx": {
    "source": "iana"
  },
  "image/ktx": {
    "source": "iana",
    "extensions": ["ktx"]
  },
  "image/naplps": {
    "source": "iana"
  },
  "image/pjpeg": {
    "compressible": false
  },
  "image/png": {
    "source": "iana",
    "compressible": false,
    "extensions": ["png"]
  },
  "image/prs.btif": {
    "source": "iana",
    "extensions": ["btif"]
  },
  "image/prs.pti": {
    "source": "iana"
  },
  "image/pwg-raster": {
    "source": "iana"
  },
  "image/sgi": {
    "source": "apache",
    "extensions": ["sgi"]
  },
  "image/svg+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": ["svg","svgz"]
  },
  "image/t38": {
    "source": "iana"
  },
  "image/tiff": {
    "source": "iana",
    "compressible": false,
    "extensions": ["tiff","tif"]
  },
  "image/tiff-fx": {
    "source": "iana"
  },
  "image/vnd.adobe.photoshop": {
    "source": "iana",
    "compressible": true,
    "extensions": ["psd"]
  },
  "image/vnd.airzip.accelerator.azv": {
    "source": "iana"
  },
  "image/vnd.cns.inf2": {
    "source": "iana"
  },
  "image/vnd.dece.graphic": {
    "source": "iana",
    "extensions": ["uvi","uvvi","uvg","uvvg"]
  },
  "image/vnd.djvu": {
    "source": "iana",
    "extensions": ["djvu","djv"]
  },
  "image/vnd.dvb.subtitle": {
    "source": "iana",
    "extensions": ["sub"]
  },
  "image/vnd.dwg": {
    "source": "iana",
    "extensions": ["dwg"]
  },
  "image/vnd.dxf": {
    "source": "iana",
    "extensions": ["dxf"]
  },
  "image/vnd.fastbidsheet": {
    "source": "iana",
    "extensions": ["fbs"]
  },
  "image/vnd.fpx": {
    "source": "iana",
    "extensions": ["fpx"]
  },
  "image/vnd.fst": {
    "source": "iana",
    "extensions": ["fst"]
  },
  "image/vnd.fujixerox.edmics-mmr": {
    "source": "iana",
    "extensions": ["mmr"]
  },
  "image/vnd.fujixerox.edmics-rlc": {
    "source": "iana",
    "extensions": ["rlc"]
  },
  "image/vnd.globalgraphics.pgb": {
    "source": "iana"
  },
  "image/vnd.microsoft.icon": {
    "source": "iana"
  },
  "image/vnd.mix": {
    "source": "iana"
  },
  "image/vnd.ms-modi": {
    "source": "iana",
    "extensions": ["mdi"]
  },
  "image/vnd.ms-photo": {
    "source": "apache",
    "extensions": ["wdp"]
  },
  "image/vnd.net-fpx": {
    "source": "iana",
    "extensions": ["npx"]
  },
  "image/vnd.radiance": {
    "source": "iana"
  },
  "image/vnd.sealed.png": {
    "source": "iana"
  },
  "image/vnd.sealedmedia.softseal.gif": {
    "source": "iana"
  },
  "image/vnd.sealedmedia.softseal.jpg": {
    "source": "iana"
  },
  "image/vnd.svf": {
    "source": "iana"
  },
  "image/vnd.tencent.tap": {
    "source": "iana"
  },
  "image/vnd.valve.source.texture": {
    "source": "iana"
  },
  "image/vnd.wap.wbmp": {
    "source": "iana",
    "extensions": ["wbmp"]
  },
  "image/vnd.xiff": {
    "source": "iana",
    "extensions": ["xif"]
  },
  "image/vnd.zbrush.pcx": {
    "source": "iana"
  },
  "image/webp": {
    "source": "apache",
    "extensions": ["webp"]
  },
  "image/x-3ds": {
    "source": "apache",
    "extensions": ["3ds"]
  },
  "image/x-cmu-raster": {
    "source": "apache",
    "extensions": ["ras"]
  },
  "image/x-cmx": {
    "source": "apache",
    "extensions": ["cmx"]
  },
  "image/x-freehand": {
    "source": "apache",
    "extensions": ["fh","fhc","fh4","fh5","fh7"]
  },
  "image/x-icon": {
    "source": "apache",
    "compressible": true,
    "extensions": ["ico"]
  },
  "image/x-jng": {
    "source": "nginx",
    "extensions": ["jng"]
  },
  "image/x-mrsid-image": {
    "source": "apache",
    "extensions": ["sid"]
  },
  "image/x-ms-bmp": {
    "source": "nginx",
    "compressible": true,
    "extensions": ["bmp"]
  },
  "image/x-pcx": {
    "source": "apache",
    "extensions": ["pcx"]
  },
  "image/x-pict": {
    "source": "apache",
    "extensions": ["pic","pct"]
  },
  "image/x-portable-anymap": {
    "source": "apache",
    "extensions": ["pnm"]
  },
  "image/x-portable-bitmap": {
    "source": "apache",
    "extensions": ["pbm"]
  },
  "image/x-portable-graymap": {
    "source": "apache",
    "extensions": ["pgm"]
  },
  "image/x-portable-pixmap": {
    "source": "apache",
    "extensions": ["ppm"]
  },
  "image/x-rgb": {
    "source": "apache",
    "extensions": ["rgb"]
  },
  "image/x-tga": {
    "source": "apache",
    "extensions": ["tga"]
  },
  "image/x-xbitmap": {
    "source": "apache",
    "extensions": ["xbm"]
  },
  "image/x-xcf": {
    "compressible": false
  },
  "image/x-xpixmap": {
    "source": "apache",
    "extensions": ["xpm"]
  },
  "image/x-xwindowdump": {
    "source": "apache",
    "extensions": ["xwd"]
  },
  "message/cpim": {
    "source": "iana"
  },
  "message/delivery-status": {
    "source": "iana"
  },
  "message/disposition-notification": {
    "source": "iana"
  },
  "message/external-body": {
    "source": "iana"
  },
  "message/feedback-report": {
    "source": "iana"
  },
  "message/global": {
    "source": "iana"
  },
  "message/global-delivery-status": {
    "source": "iana"
  },
  "message/global-disposition-notification": {
    "source": "iana"
  },
  "message/global-headers": {
    "source": "iana"
  },
  "message/http": {
    "source": "iana",
    "compressible": false
  },
  "message/imdn+xml": {
    "source": "iana",
    "compressible": true
  },
  "message/news": {
    "source": "iana"
  },
  "message/partial": {
    "source": "iana",
    "compressible": false
  },
  "message/rfc822": {
    "source": "iana",
    "compressible": true,
    "extensions": ["eml","mime"]
  },
  "message/s-http": {
    "source": "iana"
  },
  "message/sip": {
    "source": "iana"
  },
  "message/sipfrag": {
    "source": "iana"
  },
  "message/tracking-status": {
    "source": "iana"
  },
  "message/vnd.si.simp": {
    "source": "iana"
  },
  "message/vnd.wfa.wsc": {
    "source": "iana"
  },
  "model/iges": {
    "source": "iana",
    "compressible": false,
    "extensions": ["igs","iges"]
  },
  "model/mesh": {
    "source": "iana",
    "compressible": false,
    "extensions": ["msh","mesh","silo"]
  },
  "model/vnd.collada+xml": {
    "source": "iana",
    "extensions": ["dae"]
  },
  "model/vnd.dwf": {
    "source": "iana",
    "extensions": ["dwf"]
  },
  "model/vnd.flatland.3dml": {
    "source": "iana"
  },
  "model/vnd.gdl": {
    "source": "iana",
    "extensions": ["gdl"]
  },
  "model/vnd.gs-gdl": {
    "source": "apache"
  },
  "model/vnd.gs.gdl": {
    "source": "iana"
  },
  "model/vnd.gtw": {
    "source": "iana",
    "extensions": ["gtw"]
  },
  "model/vnd.moml+xml": {
    "source": "iana"
  },
  "model/vnd.mts": {
    "source": "iana",
    "extensions": ["mts"]
  },
  "model/vnd.opengex": {
    "source": "iana"
  },
  "model/vnd.parasolid.transmit.binary": {
    "source": "iana"
  },
  "model/vnd.parasolid.transmit.text": {
    "source": "iana"
  },
  "model/vnd.valve.source.compiled-map": {
    "source": "iana"
  },
  "model/vnd.vtu": {
    "source": "iana",
    "extensions": ["vtu"]
  },
  "model/vrml": {
    "source": "iana",
    "compressible": false,
    "extensions": ["wrl","vrml"]
  },
  "model/x3d+binary": {
    "source": "apache",
    "compressible": false,
    "extensions": ["x3db","x3dbz"]
  },
  "model/x3d+fastinfoset": {
    "source": "iana"
  },
  "model/x3d+vrml": {
    "source": "apache",
    "compressible": false,
    "extensions": ["x3dv","x3dvz"]
  },
  "model/x3d+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": ["x3d","x3dz"]
  },
  "model/x3d-vrml": {
    "source": "iana"
  },
  "multipart/alternative": {
    "source": "iana",
    "compressible": false
  },
  "multipart/appledouble": {
    "source": "iana"
  },
  "multipart/byteranges": {
    "source": "iana"
  },
  "multipart/digest": {
    "source": "iana"
  },
  "multipart/encrypted": {
    "source": "iana",
    "compressible": false
  },
  "multipart/form-data": {
    "source": "iana",
    "compressible": false
  },
  "multipart/header-set": {
    "source": "iana"
  },
  "multipart/mixed": {
    "source": "iana",
    "compressible": false
  },
  "multipart/parallel": {
    "source": "iana"
  },
  "multipart/related": {
    "source": "iana",
    "compressible": false
  },
  "multipart/report": {
    "source": "iana"
  },
  "multipart/signed": {
    "source": "iana",
    "compressible": false
  },
  "multipart/voice-message": {
    "source": "iana"
  },
  "multipart/x-mixed-replace": {
    "source": "iana"
  },
  "text/1d-interleaved-parityfec": {
    "source": "iana"
  },
  "text/cache-manifest": {
    "source": "iana",
    "compressible": true,
    "extensions": ["appcache","manifest"]
  },
  "text/calendar": {
    "source": "iana",
    "extensions": ["ics","ifb"]
  },
  "text/calender": {
    "compressible": true
  },
  "text/cmd": {
    "compressible": true
  },
  "text/coffeescript": {
    "extensions": ["coffee","litcoffee"]
  },
  "text/css": {
    "source": "iana",
    "compressible": true,
    "extensions": ["css"]
  },
  "text/csv": {
    "source": "iana",
    "compressible": true,
    "extensions": ["csv"]
  },
  "text/csv-schema": {
    "source": "iana"
  },
  "text/directory": {
    "source": "iana"
  },
  "text/dns": {
    "source": "iana"
  },
  "text/ecmascript": {
    "source": "iana"
  },
  "text/encaprtp": {
    "source": "iana"
  },
  "text/enriched": {
    "source": "iana"
  },
  "text/fwdred": {
    "source": "iana"
  },
  "text/grammar-ref-list": {
    "source": "iana"
  },
  "text/hjson": {
    "extensions": ["hjson"]
  },
  "text/html": {
    "source": "iana",
    "compressible": true,
    "extensions": ["html","htm","shtml"]
  },
  "text/jade": {
    "extensions": ["jade"]
  },
  "text/javascript": {
    "source": "iana",
    "compressible": true
  },
  "text/jcr-cnd": {
    "source": "iana"
  },
  "text/jsx": {
    "compressible": true,
    "extensions": ["jsx"]
  },
  "text/less": {
    "extensions": ["less"]
  },
  "text/markdown": {
    "source": "iana"
  },
  "text/mathml": {
    "source": "nginx",
    "extensions": ["mml"]
  },
  "text/mizar": {
    "source": "iana"
  },
  "text/n3": {
    "source": "iana",
    "compressible": true,
    "extensions": ["n3"]
  },
  "text/parameters": {
    "source": "iana"
  },
  "text/parityfec": {
    "source": "iana"
  },
  "text/plain": {
    "source": "iana",
    "compressible": true,
    "extensions": ["txt","text","conf","def","list","log","in","ini"]
  },
  "text/provenance-notation": {
    "source": "iana"
  },
  "text/prs.fallenstein.rst": {
    "source": "iana"
  },
  "text/prs.lines.tag": {
    "source": "iana",
    "extensions": ["dsc"]
  },
  "text/raptorfec": {
    "source": "iana"
  },
  "text/red": {
    "source": "iana"
  },
  "text/rfc822-headers": {
    "source": "iana"
  },
  "text/richtext": {
    "source": "iana",
    "compressible": true,
    "extensions": ["rtx"]
  },
  "text/rtf": {
    "source": "iana",
    "compressible": true,
    "extensions": ["rtf"]
  },
  "text/rtp-enc-aescm128": {
    "source": "iana"
  },
  "text/rtploopback": {
    "source": "iana"
  },
  "text/rtx": {
    "source": "iana"
  },
  "text/sgml": {
    "source": "iana",
    "extensions": ["sgml","sgm"]
  },
  "text/stylus": {
    "extensions": ["stylus","styl"]
  },
  "text/t140": {
    "source": "iana"
  },
  "text/tab-separated-values": {
    "source": "iana",
    "compressible": true,
    "extensions": ["tsv"]
  },
  "text/troff": {
    "source": "iana",
    "extensions": ["t","tr","roff","man","me","ms"]
  },
  "text/turtle": {
    "source": "iana",
    "extensions": ["ttl"]
  },
  "text/ulpfec": {
    "source": "iana"
  },
  "text/uri-list": {
    "source": "iana",
    "compressible": true,
    "extensions": ["uri","uris","urls"]
  },
  "text/vcard": {
    "source": "iana",
    "compressible": true,
    "extensions": ["vcard"]
  },
  "text/vnd.a": {
    "source": "iana"
  },
  "text/vnd.abc": {
    "source": "iana"
  },
  "text/vnd.curl": {
    "source": "iana",
    "extensions": ["curl"]
  },
  "text/vnd.curl.dcurl": {
    "source": "apache",
    "extensions": ["dcurl"]
  },
  "text/vnd.curl.mcurl": {
    "source": "apache",
    "extensions": ["mcurl"]
  },
  "text/vnd.curl.scurl": {
    "source": "apache",
    "extensions": ["scurl"]
  },
  "text/vnd.debian.copyright": {
    "source": "iana"
  },
  "text/vnd.dmclientscript": {
    "source": "iana"
  },
  "text/vnd.dvb.subtitle": {
    "source": "iana",
    "extensions": ["sub"]
  },
  "text/vnd.esmertec.theme-descriptor": {
    "source": "iana"
  },
  "text/vnd.fly": {
    "source": "iana",
    "extensions": ["fly"]
  },
  "text/vnd.fmi.flexstor": {
    "source": "iana",
    "extensions": ["flx"]
  },
  "text/vnd.graphviz": {
    "source": "iana",
    "extensions": ["gv"]
  },
  "text/vnd.in3d.3dml": {
    "source": "iana",
    "extensions": ["3dml"]
  },
  "text/vnd.in3d.spot": {
    "source": "iana",
    "extensions": ["spot"]
  },
  "text/vnd.iptc.newsml": {
    "source": "iana"
  },
  "text/vnd.iptc.nitf": {
    "source": "iana"
  },
  "text/vnd.latex-z": {
    "source": "iana"
  },
  "text/vnd.motorola.reflex": {
    "source": "iana"
  },
  "text/vnd.ms-mediapackage": {
    "source": "iana"
  },
  "text/vnd.net2phone.commcenter.command": {
    "source": "iana"
  },
  "text/vnd.radisys.msml-basic-layout": {
    "source": "iana"
  },
  "text/vnd.si.uricatalogue": {
    "source": "iana"
  },
  "text/vnd.sun.j2me.app-descriptor": {
    "source": "iana",
    "extensions": ["jad"]
  },
  "text/vnd.trolltech.linguist": {
    "source": "iana"
  },
  "text/vnd.wap.si": {
    "source": "iana"
  },
  "text/vnd.wap.sl": {
    "source": "iana"
  },
  "text/vnd.wap.wml": {
    "source": "iana",
    "extensions": ["wml"]
  },
  "text/vnd.wap.wmlscript": {
    "source": "iana",
    "extensions": ["wmls"]
  },
  "text/vtt": {
    "charset": "UTF-8",
    "compressible": true,
    "extensions": ["vtt"]
  },
  "text/x-asm": {
    "source": "apache",
    "extensions": ["s","asm"]
  },
  "text/x-c": {
    "source": "apache",
    "extensions": ["c","cc","cxx","cpp","h","hh","dic"]
  },
  "text/x-component": {
    "source": "nginx",
    "extensions": ["htc"]
  },
  "text/x-fortran": {
    "source": "apache",
    "extensions": ["f","for","f77","f90"]
  },
  "text/x-gwt-rpc": {
    "compressible": true
  },
  "text/x-handlebars-template": {
    "extensions": ["hbs"]
  },
  "text/x-java-source": {
    "source": "apache",
    "extensions": ["java"]
  },
  "text/x-jquery-tmpl": {
    "compressible": true
  },
  "text/x-lua": {
    "extensions": ["lua"]
  },
  "text/x-markdown": {
    "compressible": true,
    "extensions": ["markdown","md","mkd"]
  },
  "text/x-nfo": {
    "source": "apache",
    "extensions": ["nfo"]
  },
  "text/x-opml": {
    "source": "apache",
    "extensions": ["opml"]
  },
  "text/x-pascal": {
    "source": "apache",
    "extensions": ["p","pas"]
  },
  "text/x-processing": {
    "compressible": true,
    "extensions": ["pde"]
  },
  "text/x-sass": {
    "extensions": ["sass"]
  },
  "text/x-scss": {
    "extensions": ["scss"]
  },
  "text/x-setext": {
    "source": "apache",
    "extensions": ["etx"]
  },
  "text/x-sfv": {
    "source": "apache",
    "extensions": ["sfv"]
  },
  "text/x-uuencode": {
    "source": "apache",
    "extensions": ["uu"]
  },
  "text/x-vcalendar": {
    "source": "apache",
    "extensions": ["vcs"]
  },
  "text/x-vcard": {
    "source": "apache",
    "extensions": ["vcf"]
  },
  "text/xml": {
    "source": "iana",
    "compressible": true,
    "extensions": ["xml"]
  },
  "text/xml-external-parsed-entity": {
    "source": "iana"
  },
  "text/yaml": {
    "extensions": ["yaml","yml"]
  },
  "video/1d-interleaved-parityfec": {
    "source": "apache"
  },
  "video/3gpp": {
    "source": "apache",
    "extensions": ["3gp","3gpp"]
  },
  "video/3gpp-tt": {
    "source": "apache"
  },
  "video/3gpp2": {
    "source": "apache",
    "extensions": ["3g2"]
  },
  "video/bmpeg": {
    "source": "apache"
  },
  "video/bt656": {
    "source": "apache"
  },
  "video/celb": {
    "source": "apache"
  },
  "video/dv": {
    "source": "apache"
  },
  "video/h261": {
    "source": "apache",
    "extensions": ["h261"]
  },
  "video/h263": {
    "source": "apache",
    "extensions": ["h263"]
  },
  "video/h263-1998": {
    "source": "apache"
  },
  "video/h263-2000": {
    "source": "apache"
  },
  "video/h264": {
    "source": "apache",
    "extensions": ["h264"]
  },
  "video/h264-rcdo": {
    "source": "apache"
  },
  "video/h264-svc": {
    "source": "apache"
  },
  "video/jpeg": {
    "source": "apache",
    "extensions": ["jpgv"]
  },
  "video/jpeg2000": {
    "source": "apache"
  },
  "video/jpm": {
    "source": "apache",
    "extensions": ["jpm","jpgm"]
  },
  "video/mj2": {
    "source": "apache",
    "extensions": ["mj2","mjp2"]
  },
  "video/mp1s": {
    "source": "apache"
  },
  "video/mp2p": {
    "source": "apache"
  },
  "video/mp2t": {
    "source": "apache",
    "extensions": ["ts"]
  },
  "video/mp4": {
    "source": "apache",
    "compressible": false,
    "extensions": ["mp4","mp4v","mpg4"]
  },
  "video/mp4v-es": {
    "source": "apache"
  },
  "video/mpeg": {
    "source": "apache",
    "compressible": false,
    "extensions": ["mpeg","mpg","mpe","m1v","m2v"]
  },
  "video/mpeg4-generic": {
    "source": "apache"
  },
  "video/mpv": {
    "source": "apache"
  },
  "video/nv": {
    "source": "apache"
  },
  "video/ogg": {
    "source": "apache",
    "compressible": false,
    "extensions": ["ogv"]
  },
  "video/parityfec": {
    "source": "apache"
  },
  "video/pointer": {
    "source": "apache"
  },
  "video/quicktime": {
    "source": "apache",
    "compressible": false,
    "extensions": ["qt","mov"]
  },
  "video/raw": {
    "source": "apache"
  },
  "video/rtp-enc-aescm128": {
    "source": "apache"
  },
  "video/rtx": {
    "source": "apache"
  },
  "video/smpte292m": {
    "source": "apache"
  },
  "video/ulpfec": {
    "source": "apache"
  },
  "video/vc1": {
    "source": "apache"
  },
  "video/vnd.cctv": {
    "source": "apache"
  },
  "video/vnd.dece.hd": {
    "source": "apache",
    "extensions": ["uvh","uvvh"]
  },
  "video/vnd.dece.mobile": {
    "source": "apache",
    "extensions": ["uvm","uvvm"]
  },
  "video/vnd.dece.mp4": {
    "source": "apache"
  },
  "video/vnd.dece.pd": {
    "source": "apache",
    "extensions": ["uvp","uvvp"]
  },
  "video/vnd.dece.sd": {
    "source": "apache",
    "extensions": ["uvs","uvvs"]
  },
  "video/vnd.dece.video": {
    "source": "apache",
    "extensions": ["uvv","uvvv"]
  },
  "video/vnd.directv.mpeg": {
    "source": "apache"
  },
  "video/vnd.directv.mpeg-tts": {
    "source": "apache"
  },
  "video/vnd.dlna.mpeg-tts": {
    "source": "apache"
  },
  "video/vnd.dvb.file": {
    "source": "apache",
    "extensions": ["dvb"]
  },
  "video/vnd.fvt": {
    "source": "apache",
    "extensions": ["fvt"]
  },
  "video/vnd.hns.video": {
    "source": "apache"
  },
  "video/vnd.iptvforum.1dparityfec-1010": {
    "source": "apache"
  },
  "video/vnd.iptvforum.1dparityfec-2005": {
    "source": "apache"
  },
  "video/vnd.iptvforum.2dparityfec-1010": {
    "source": "apache"
  },
  "video/vnd.iptvforum.2dparityfec-2005": {
    "source": "apache"
  },
  "video/vnd.iptvforum.ttsavc": {
    "source": "apache"
  },
  "video/vnd.iptvforum.ttsmpeg2": {
    "source": "apache"
  },
  "video/vnd.motorola.video": {
    "source": "apache"
  },
  "video/vnd.motorola.videop": {
    "source": "apache"
  },
  "video/vnd.mpegurl": {
    "source": "apache",
    "extensions": ["mxu","m4u"]
  },
  "video/vnd.ms-playready.media.pyv": {
    "source": "apache",
    "extensions": ["pyv"]
  },
  "video/vnd.nokia.interleaved-multimedia": {
    "source": "apache"
  },
  "video/vnd.nokia.videovoip": {
    "source": "apache"
  },
  "video/vnd.objectvideo": {
    "source": "apache"
  },
  "video/vnd.sealed.mpeg1": {
    "source": "apache"
  },
  "video/vnd.sealed.mpeg4": {
    "source": "apache"
  },
  "video/vnd.sealed.swf": {
    "source": "apache"
  },
  "video/vnd.sealedmedia.softseal.mov": {
    "source": "apache"
  },
  "video/vnd.uvvu.mp4": {
    "source": "apache",
    "extensions": ["uvu","uvvu"]
  },
  "video/vnd.vivo": {
    "source": "apache",
    "extensions": ["viv"]
  },
  "video/webm": {
    "source": "apache",
    "compressible": false,
    "extensions": ["webm"]
  },
  "video/x-f4v": {
    "source": "apache",
    "extensions": ["f4v"]
  },
  "video/x-fli": {
    "source": "apache",
    "extensions": ["fli"]
  },
  "video/x-flv": {
    "source": "apache",
    "compressible": false,
    "extensions": ["flv"]
  },
  "video/x-m4v": {
    "source": "apache",
    "extensions": ["m4v"]
  },
  "video/x-matroska": {
    "source": "apache",
    "compressible": false,
    "extensions": ["mkv","mk3d","mks"]
  },
  "video/x-mng": {
    "source": "apache",
    "extensions": ["mng"]
  },
  "video/x-ms-asf": {
    "source": "apache",
    "extensions": ["asf","asx"]
  },
  "video/x-ms-vob": {
    "source": "apache",
    "extensions": ["vob"]
  },
  "video/x-ms-wm": {
    "source": "apache",
    "extensions": ["wm"]
  },
  "video/x-ms-wmv": {
    "source": "apache",
    "compressible": false,
    "extensions": ["wmv"]
  },
  "video/x-ms-wmx": {
    "source": "apache",
    "extensions": ["wmx"]
  },
  "video/x-ms-wvx": {
    "source": "apache",
    "extensions": ["wvx"]
  },
  "video/x-msvideo": {
    "source": "apache",
    "extensions": ["avi"]
  },
  "video/x-sgi-movie": {
    "source": "apache",
    "extensions": ["movie"]
  },
  "video/x-smv": {
    "source": "apache",
    "extensions": ["smv"]
  },
  "x-conference/x-cooltalk": {
    "source": "apache",
    "extensions": ["ice"]
  },
  "x-shader/x-fragment": {
    "compressible": true
  },
  "x-shader/x-vertex": {
    "compressible": true
  }
}

},{}],5:[function(require,module,exports){
/*!
 * mime-db
 * Copyright(c) 2014 Jonathan Ong
 * MIT Licensed
 */

/**
 * Module exports.
 */

module.exports = require('./db.json')

},{"./db.json":4}],6:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _report = require('./report');

/**
 * Agent report class provides automatic information gethering and report
 * generation for browser and user platform related data.
 */

var _report2 = _interopRequireDefault(_report);

var AgentReport = (function (_Report) {
    _inherits(AgentReport, _Report);

    /**
     * Creates an user agent report object and gathers all related information
     * at the same time. This reporst will be ready for dispatching just after
     * being created.
     */

    function AgentReport() {
        _classCallCheck(this, AgentReport);

        _get(Object.getPrototypeOf(AgentReport.prototype), 'constructor', this).call(this, 'user-agent');

        var data = {};

        var entries = ['appCodeName', 'appName', 'appVersion', 'userAgent', 'cookieEnabled', 'language', 'platform', 'product'];

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = entries[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var entry = _step.value;

                data[entry] = window.navigator[entry];
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator['return']) {
                    _iterator['return']();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }

        this._data = data;

        if (window.navigator.geolocation) {
            var position = this._updateLocation.bind(this);

            window.navigator.geolocation.getCurrentPosition(position);
        } else {
            this._data['coords'] = 'n/a';
        }
    }

    _createClass(AgentReport, [{
        key: '_updateLocation',
        value: function _updateLocation(location) {
            this._data['coords'] = location.coords;
        }
    }]);

    return AgentReport;
})(_report2['default']);

exports['default'] = AgentReport;
module.exports = exports['default'];

},{"./report":10}],7:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _report = require('./report');

var _report2 = _interopRequireDefault(_report);

var _profile = require('./profile');

var _profile2 = _interopRequireDefault(_profile);

var _util = require('../util');

/**
 * Profile digest class provides the means to gather a set of profiling
 * individual results and route statics related to the performance of the
 * whole set of entries in a single report. This reporst is useful for those
 * functions that are called a lot of times and time spent varies from execution
 * to execution greatly.
 */

var _util2 = _interopRequireDefault(_util);

var ProfileDigest = (function (_Report) {
    _inherits(ProfileDigest, _Report);

    /**
     * Creates a new profile report instance.
     * @param  {String} name An identifier that will be used when data is posted
     *                  through the Reouter into the remote server.
     */

    function ProfileDigest(name) {
        _classCallCheck(this, ProfileDigest);

        _get(Object.getPrototypeOf(ProfileDigest.prototype), 'constructor', this).call(this);
        this._name = name;
        this._profiles = [];
        this._running = false;
        this._fromUTC = new Date().toUTCString();
    }

    /**
     * Creates a new profile measure operation and closes any other measuring
     * process that could be running,
     */

    _createClass(ProfileDigest, [{
        key: 'startMeasure',
        value: function startMeasure() {
            this.completeMeasure();
            this._running = true;
            var name = this._name + '-' + this._profiles.length;
            this._profiles.push(new _profile2['default'](name));
        }

        /**
         * Completes a profiling measure operation being executed as part of the
         * set.
         */
    }, {
        key: 'completeMeasure',
        value: function completeMeasure() {

            if (this._profiles.length === 0) return;

            var current = this._profiles[this._profiles.length - 1];
            current.complete(false);
        }

        /**
         * Compleates current profiling digest report and dispatches the resulting
         * information into the server routing queue.
         */
    }, {
        key: 'complete',
        value: function complete() {

            if (!this._running) return;
            this._running = false;

            // get sure all measures are completed
            this.completeMeasure();

            var values = [];

            var _iteratorNormalCompletion = true;

            // Build report data
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = this._profiles[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var profile = _step.value;

                    values.push(profile.elapsed);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator['return']) {
                        _iterator['return']();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            this._data = {
                'name': this._name,
                'entries': this._profiles.length,
                'median': _util2['default'].median(values),
                'max': values[0],
                'min': values[values.length - 1]
            };

            this.dispatch();
        }
    }]);

    return ProfileDigest;
})(_report2['default']);

exports['default'] = ProfileDigest;
module.exports = exports['default'];

},{"../util":16,"./profile":9,"./report":10}],8:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, '__esModule', {
    value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _report = require('./report');

/**
 * Page report class provides automatic information gathering and report
 * generation for common page performance timing measures.
 * In order to get this report information fully available it is required
 * to create it after the page has been totally loaded.
 */

var _report2 = _interopRequireDefault(_report);

var PageReport = (function (_Report) {
    _inherits(PageReport, _Report);

    /**
     * Creates a Page timing Report object and gathers all related information
     * at the same time. This reporst will be ready for dispatching after being
     * created.
     */

    function PageReport() {
        _classCallCheck(this, PageReport);

        _get(Object.getPrototypeOf(PageReport.prototype), 'constructor', this).call(this, 'page-timing');

        var sourceInfo = {};
        var timingInfo = {};
        var timing = performance.timing;

        var timingEntries = ['connect', 'domainLookup', 'domContentLoadedEvent', 'loadEvent', 'redirect', 'response', 'unloadEvent'];

        var locationEntries = ['origin', 'protocol', 'pathname'];

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = timingEntries[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var entry = _step.value;

                var start = timing[entry + 'Start'];
                var end = timing[entry + 'End'];

                timingInfo[entry] = end - start;
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator['return']) {
                    _iterator['return']();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }

        sourceInfo['title'] = window.document.title;

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
            for (var _iterator2 = locationEntries[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var entry = _step2.value;

                sourceInfo[entry] = window.document.location[entry];
            }
        } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                    _iterator2['return']();
                }
            } finally {
                if (_didIteratorError2) {
                    throw _iteratorError2;
                }
            }
        }

        this._data = {
            'source': sourceInfo,
            'timing': timingInfo
        };
    }

    return PageReport;
})(_report2['default']);

exports['default'] = PageReport;
module.exports = exports['default'];

},{"./report":10}],9:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _report = require('./report');

var _report2 = _interopRequireDefault(_report);

var _util = require('../util');

/**
 * Profile report class provides the means to collect information for a single
 * named operation by saving the time since it has been created until it is
 * completed using the ProfileReport::complete method. After compleating a report
 * it will be automatically dispatched to the server routing queue.
 */

var _util2 = _interopRequireDefault(_util);

var ProfileReport = (function (_Report) {
    _inherits(ProfileReport, _Report);

    /**
     * Creates a new profile report instance.
     * @param  {String} name An identifier that will be used when data is posted
     *                  through the Reouter into the remote server.
     */

    function ProfileReport(name) {
        _classCallCheck(this, ProfileReport);

        _get(Object.getPrototypeOf(ProfileReport.prototype), 'constructor', this).call(this);
        this._name = name;
        this._from = window.performance.now();
        this._to = null;
        this._running = true;
        this._fromUTC = new Date().toUTCString();
    }

    /**
     * Returns the total number if milliseconds passed since this report has
     * been created and until the time it has been completed, or current time
     * if the profile report is still under progress.
     * @return {Nunber}
     */

    _createClass(ProfileReport, [{
        key: 'complete',

        /**
         * Compleates current profiling report and dispatches the resulting
         * information into the server routing queue.
         * @param {Boolean} dispatch Send false if you don't want to send this
         *                  profiling report into the dispatching queue.
         */
        value: function complete(dispatch) {
            if (!this._running) return;

            this._running = false;
            this.to = window.performance.now();
            this._toUTC = new Date().toUTCString();

            // Build report data
            this._data = {
                'name': this._name,
                'duration': this.elapsed,
                'started': this._fromUTC
            };

            if (dispatch !== false) {
                this.dispatch();
            }
        }
    }, {
        key: 'elapsed',
        get: function get() {
            if (!this.isRunning) {
                return this._from - this._to;
            }

            return this._from - window.performance.now();
        }

        /**
         * Returns true if current profiling report has been yet completed.
         * @return {Boolean}
         */
    }, {
        key: 'isRunning',
        get: function get() {
            return this._running;
        }
    }]);

    return ProfileReport;
})(_report2['default']);

exports['default'] = ProfileReport;
module.exports = exports['default'];

},{"../util":16,"./report":10}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _router = require('../router');

var _router2 = _interopRequireDefault(_router);

var _util = require('../util');

/**
 * Base class for report generation, this class cotains a minimal set of data
 * structures and functionality used to gather and post information through the
 * routing service used to flush gathered information to remote server.
 */

var _util2 = _interopRequireDefault(_util);

var Report = (function () {

    /**
     * Creates a new report instance.
     * @param  {String} name An identifier that will be used when data is posted
     *                  through the Reouter into the remote server.
     */

    function Report(name) {
        _classCallCheck(this, Report);

        this._data = {};
        this._name = name || _util2['default'].generateGUID();
    }

    /**
     * Returns a representation of report data along with its provided name
     * to be used on the report dispathing cycle.
     * @return {Object}
     */

    _createClass(Report, [{
        key: 'dispatch',

        /**
         * Sends the report data through the Router dispatching queue.
         */
        value: function dispatch() {
            _router2['default'].enqueue(this.data);
        }
    }, {
        key: 'data',
        get: function get() {
            return {
                'name': this.name,
                'data': this._data
            };
        }

        /**
         * Returns a string representing the textual identifier set for this
         * specific report when created,
         * @return {String}
         */
    }, {
        key: 'name',
        get: function get() {
            return this._name;
        }
    }]);

    return Report;
})();

exports['default'] = Report;
module.exports = exports['default'];

},{"../router":14,"../util":16}],11:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, '__esModule', {
    value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _mimeTypes = require('mime-types');

var _mimeTypes2 = _interopRequireDefault(_mimeTypes);

var _util = require('../util');

var _util2 = _interopRequireDefault(_util);

var _report = require('./report');

/**
 * Resource disget report class provides a set of page resource loading statics
 * took from the performance entries available on the browser at the moment of
 * its creation. This class will generate a report with the longest and shortes
 * times consumed by the loaded resources at the moment of its creation along
 * with the detailed information of the resource requests that generated those
 * values. For all other requests digest report will generate a count of
 * individual resource plus the total time spent by them split in several
 * categories.
 */

var _report2 = _interopRequireDefault(_report);

var ResourcesDigest = (function (_Report) {
    _inherits(ResourcesDigest, _Report);

    /**
     * Creates a Resource digest Report object and gathers all related information
     * at the same time. This reporst will be ready for dispatching after being
     * created.
     */

    function ResourcesDigest() {
        _classCallCheck(this, ResourcesDigest);

        _get(Object.getPrototypeOf(ResourcesDigest.prototype), 'constructor', this).call(this, 'resources-timing-digest');

        var resources = performance.getEntries();
        var initiators = {};
        var mimeTypes = {};
        var timing = {
            'longest': {
                'duration': 0
            },
            'shortest': {
                'duration': 0
            }
        };

        var _iteratorNormalCompletion = true;

        // After keeping the longest and shortest loading time related resources
        // get sure only to keep it's own properties and get rid of the reast of
        // the object in order to pass it trough the dispatcher worker safely
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = resources[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var resource = _step.value;

                // Keep full record of the shortest and longest resource
                // request time
                if (resource.duration > timing.longest.duration) {
                    timing.longest.duration = Math.round(resource.duration);
                    timing.longest.resource = resource;
                }

                if (resource.duration < timing.shortest.duration || timing.shortest.duration == 0) {
                    timing.shortest.duration = Math.round(resource.duration);
                    timing.shortest.resource = resource;
                }

                // Sum the time for resource request initiators
                var initiatorType = resource.initiatorType;

                if (!initiators[initiatorType]) {
                    initiators[initiatorType] = {
                        'count': 0,
                        'total': 0
                    };
                }

                initiators[initiatorType].count += 1;
                initiators[initiatorType].total += Math.round(resource.duration);

                //Sum the time for different mime types when available
                var mimeType = _mimeTypes2['default'].lookup(resource.name);

                if (!mimeType) continue;

                if (!mimeTypes[mimeType]) {
                    mimeTypes[mimeType] = {
                        'count': 0,
                        'total': 0
                    };
                }

                mimeTypes[mimeType].count += 1;
                mimeTypes[mimeType].total += Math.round(resource.duration);
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator['return']) {
                    _iterator['return']();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }

        timing.longest.resource = _util2['default'].copyObject(timing.longest.resource);
        timing.shortest.resource = _util2['default'].copyObject(timing.shortest.resource);

        this._data = {
            'timing': timing,
            'initiators': initiators,
            'mimeTypes': mimeTypes
        };
    }

    return ResourcesDigest;
})(_report2['default']);

exports['default'] = ResourcesDigest;
module.exports = exports['default'];

},{"../util":16,"./report":10,"mime-types":3}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _util = require('./util');

var _util2 = _interopRequireDefault(_util);

var _dataPage = require('./data/page');

var _dataPage2 = _interopRequireDefault(_dataPage);

var _dataAgent = require('./data/agent');

var _dataAgent2 = _interopRequireDefault(_dataAgent);

var _dataProfile = require('./data/profile');

var _dataProfile2 = _interopRequireDefault(_dataProfile);

var _dataResource = require('./data/resource');

var _dataResource2 = _interopRequireDefault(_dataResource);

var singleton = Symbol();
var singletonEnforcer = Symbol();

/**
 * Monitor class provides a single accesible point for fetching information and
 * generating Real User Monitoring reports to a remote server. Monitor will
 * listen several events on webpage and send results through the network
 * dispatcher in order to be deliverd to remove server.
 */

var Monitor = (function () {

    /**
     * Creates a single instance for this clase, this method shouldn't be
     * called directly from outside, instead use instance getter to get
     * access to the single instace.
     * @private
     * @param  {Symbol} enforcer
     */

    function Monitor(enforcer) {
        _classCallCheck(this, Monitor);

        if (enforcer != singletonEnforcer) throw "Cannot construct singleton";
        this._idleInterval = 20000;
    }

    /**
     * Returns a singleton reference for this class to be used application wide.
     * @static
     * @return {Router} A refernce to the unique  instance.
     */

    _createClass(Monitor, [{
        key: '_init',

        /**
         * @private
         */
        value: function _init() {
            var loadHandler = this._onPageLoad.bind(this);
            var readyHandler = this._onReadyStateChange.bind(this);
            var activeHandler = _util2['default'].debounce(this._clearIdle, 1000, false, this);
            var idleHandler = this._setIdle.bind(this);
            var visibleHandler = this._onVisibilityChange.bind(this);

            _util2['default'].addEventListener(window, 'load', loadHandler);
            _util2['default'].addEventListener(document, 'readystatechange', readyHandler);
            _util2['default'].addEventListener(document, 'mousemove', activeHandler);
            _util2['default'].addEventListener(document, 'keydown', activeHandler);
            _util2['default'].addEventListener(document, _util2['default'].VISIBILITY_CHANGE, visibleHandler);

            this._idleInterval = setInterval(idleHandler, this._idleInterval);
            this._idleHandler = idleHandler;

            if (document.readyState === "complete") {
                this._crateLoadReport();
            }
        }

        /**
         * @private
         */
    }, {
        key: '_onPageLoad',
        value: function _onPageLoad() {}
        // Nothing to do at the moment

        /**
         * Handles document ready state change event. Monitor will auto generate
         * reports on certain events.
         * @private
         */

    }, {
        key: '_onReadyStateChange',
        value: function _onReadyStateChange() {

            switch (window.document.readyState) {
                case 'interactive':
                    if (_util2['default'].isDocumentHidden()) {
                        this._setIdle();
                    } else {
                        this._clearIdle();
                    }

                    break;
                case 'complete':
                    this._crateLoadReport();
                    break;
            }
        }

        /**
         * Creates a set of reports after page load process has been completed.
         * @private
         */
    }, {
        key: '_crateLoadReport',
        value: function _crateLoadReport() {
            var page = new _dataPage2['default']();
            var agent = new _dataAgent2['default']();
            var resources = new _dataResource2['default']();

            page.dispatch();
            agent.dispatch();
            resources.dispatch();
        }

        /**
         * Handles page visibility state change event. Monitor will auto generate
         * reports whenever page goes out of scope or user focus it back.
         * @private
         */
    }, {
        key: '_onVisibilityChange',
        value: function _onVisibilityChange() {
            if (_util2['default'].isDocumentHidden()) {
                this._setIdle();
            } else {
                this._clearIdle();
            }
        }

        /**
         * @private
         */
    }, {
        key: '_clearIdle',
        value: function _clearIdle() {
            clearInterval(this._idleInterval);

            // Clear previous idle profiler if any
            if (this._idle) {
                this._idle.complete();
                this._idle = null;
            }

            this._activity = new _dataProfile2['default']('user active period');
            this._idleInterval = setInterval(this._idleHandler, this._idleInterval);
        }

        /**
         * @private
         */
    }, {
        key: '_setIdle',
        value: function _setIdle() {

            // Clear previous activity profiler if any
            if (this._activity) {
                this._activity.complete();
                this._activity = null;
            }

            this._idle = new _dataProfile2['default']('user idle period');
        }
    }], [{
        key: 'init',

        /**
         * Initializes the Monitoring process by attaching a set of listeners that
         * will be used to collect information and generate pasive reports.
         */
        value: function init() {
            this.instance._init();
        }
    }, {
        key: 'instance',
        get: function get() {
            if (!this[singleton]) {
                this[singleton] = new this(singletonEnforcer);
            }
            return this[singleton];
        }
    }]);

    return Monitor;
})();

exports['default'] = Monitor;
module.exports = exports['default'];

},{"./data/agent":6,"./data/page":8,"./data/profile":9,"./data/resource":11,"./util":16}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _dataProfile = require('./data/profile');

var _dataProfile2 = _interopRequireDefault(_dataProfile);

var _dataDigest = require('./data/digest');

var _dataDigest2 = _interopRequireDefault(_dataDigest);

var singleton = Symbol();
var singletonEnforcer = Symbol();

/**
 * @class Profiler
 * @description Profiler class provides the means for dynamic program analysis
 *              that measures time complexity of a javascript code, the usage
 *              of particular instructions, or the frequency and duration of
 *              function calls. Profiling information serves to aid program
 *              optimization.
 */

var Profiler = (function () {
    function Profiler(enforcer) {
        _classCallCheck(this, Profiler);

        if (enforcer != singletonEnforcer) throw "Cannot construct singleton";
        this._profiles = new Map();
        this._digests = new Map();
    }

    /**
    * Returns a singleton reference for this class to be used application wide.
    * @static
    * @return {Profiler} A refernce to the unique  instance.
    */

    _createClass(Profiler, [{
        key: '_start',

        /**
         * @private
         */
        value: function _start(identifier) {
            if (!this._profiles.has(identifier)) {
                var profile = new _dataProfile2['default'](identifier);
                this._profiles.set(identifier, profile);
                return true;
            }

            return false;
        }

        /**
         * @private
         */
    }, {
        key: '_startMeasure',
        value: function _startMeasure(identifier) {
            if (!this._digests.has(identifier)) return false;
            var digest = this._digests.get(identifier);
            digest.startMeasure();

            return true;
        }

        /**
         * @private
         */
    }, {
        key: '_stopMeasure',
        value: function _stopMeasure(identifier) {
            if (!this._digests.has(identifier)) return false;
            var digest = this._digests.get(identifier);
            digest.completeMeasure();
            return true;
        }

        /**
         * @private
         */
    }, {
        key: '_createMulti',
        value: function _createMulti(identifier) {
            if (!this._digests.has(identifier)) {
                var digest = new _dataDigest2['default'](identifier);
                this._digests.set(identifier, digest);
                return true;
            }

            return false;
        }

        /**
         * @private
         */
    }, {
        key: '_completeMulti',
        value: function _completeMulti(identifier) {
            if (this._digests.has(identifier)) {
                var digest = this._digests.get(identifier);
                digest.complete();
                this._digests['delete'](identifier);
                return true;
            }

            return false;
        }

        /**
         * @private
         */
    }, {
        key: '_stop',
        value: function _stop(identifier) {
            if (this._profiles.has(identifier)) {
                var profile = this._profiles.get(identifier);
                profile.complete();
                this._profiles['delete'](identifier);
                return true;
            }

            return false;
        }
    }], [{
        key: 'stop',

        /**
         * Stops a profile execution  under provided identifier when available
         * @param  {String|Object|Function} identifier A reference to a unique
         *         identifier used to store a profile, the identifier could be a
         *         String an object or even a function, this way indivual objects
         *         or even functions can be tracked more reliabily.
         *
         * @return {Bool}  Returnns true if the profile has been successfully stoped,
         *         if it was already running or there is a another
         *         profile using the same identifier will return false,
         * @static
         */
        value: function stop(identifier) {
            var success = this.instance._stop(identifier);
            return success;
        }

        /**
         * Starts a profile execution and stores it under provided identifier
         * @param  {String|Object|Function} identifier A reference to a unique
         *         identifier used to store a profile, the identifier could be a
         *         String an object or even a function, this way indivual objects
         *         or even functions can be tracked more reliabily.
         *
         * @return {Bool}   Returnns true if the profile has been started
         *         successfully, if it was already running or there is another
         *         profile using the same identifier will return false,
         * @static
         */
    }, {
        key: 'start',
        value: function start(identifier) {
            return this.instance._start(identifier);
        }

        /**
         * Creates a multi profiling digest and stores it under provided identifier
         * @param  {String|Object|Function} identifier A reference to a unique
         *         identifier used to store a profile, the identifier could be a
         *         String an object or even a function, this way indivual objects
         *         or even functions can be tracked more reliabily.
         *
         * @return {Bool}   Returnns true if the digest has been successfully
         *         created if it was already running or there is another
         *         digest using the same identifier will return false,
         * @static
         */
    }, {
        key: 'createtMulti',
        value: function createtMulti(identifier) {
            return this.instance._createMulti(identifier);
        }

        /**
         * Completes a multi profiling digest gathering stored under provided
         * identifier when available.
         * @param  {String|Object|Function} identifier A reference to a unique
         *         identifier used to store a profile, the identifier could be a
         *         String an object or even a function, this way indivual objects
         *         or even functions can be tracked more reliabily.
         *
         * @return {Bool}            Returnns true if the profile has been started
         *         successfully, if it was already running or there is a another
         *         profile using the same identifier will return false,
         * @static
         */
    }, {
        key: 'completeMulti',
        value: function completeMulti(identifier) {
            return this.instance._completeMulti(identifier);
        }

        /**
         * Starts a profile execution for a multi profile digest collection
         * @param  {String|Object|Function} identifier A reference to a unique
         *         identifier used to store a profile, the identifier could be a
         *         String an object or even a function, this way indivual objects
         *         or even functions can be tracked more reliabily.
         *
         * @return {Bool}   Returnns true if the profile has been started
         *         successfully, if it was already running or there is another
         *         profile using the same identifier will return false,
         * @static
         */
    }, {
        key: 'startMeasure',
        value: function startMeasure(identifier) {
            return this.instance._startMeasure(identifier);
        }

        /**
         * Stops a profile execution   for a multi profile digest collectio when
         * available
         * @param  {String|Object|Function} identifier A reference to a unique
         *         identifier used to store the multi profile, the identifier
         *         could be a String an object or even a function, this way indivual
         *         objects  or even functions can be tracked more reliabily.
         *
         * @return {Bool}  Returnns true if the profile has been successfully stoped,
         *         if it was already running or there is a another
         *         profile using the same identifier will return false,
         * @static
         */
    }, {
        key: 'stopMeasure',
        value: function stopMeasure(identifier) {
            return this.instance._stopMeasure(identifier);
        }
    }, {
        key: 'instance',
        get: function get() {
            if (!this[singleton]) {
                this[singleton] = new this(singletonEnforcer);
            }
            return this[singleton];
        }
    }]);

    return Profiler;
})();

exports['default'] = Profiler;
module.exports = exports['default'];

},{"./data/digest":7,"./data/profile":9}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var singleton = Symbol();
var singletonEnforcer = Symbol();

/**
 * Worker dispatcher functionality declaration.
 * This function is used as a script template for the code executed by the
 * Message Dispatcher Worker.
 */
var dispatcher = (function () {

    var cache = [];

    /**
     * Returns true whenever a network connection is available
     * Note: this method is a mockup testing method an return a random value
     * instead making the proper checking
     * @return {Boolean}
     */
    var checkNetwork = function checkNetwork() {
        return Math.random() < .2;
    };

    /**
     * Sends cache content trought the network and cleans its contents.
     * Note: this method is a mockup testing method and only outputs the
     * 		 information through the console.
     * @fires CACHE_FLUSHED
     * @fires CACHE_FLUSH_ERROR
     */
    var flushCache = function flushCache() {
        if (checkNetwork()) {
            console.debug('MOCKUP CONNECTION AVAILABLE TRIGGERED');
            self.postMessage('FLUSHING CACHE MOCKUP');
            console.debug(JSON.stringify(cache));
            cache = [];
            self.postMessage('CACHE_FLUSHED');
        } else {
            console.debug('MOCKUP CONNECTION LOST TRIGGERED');
            self.postMessage('CACHE_FLUSH_ERROR');
        }
    };

    /**
     * Handles a message sent to the web worker from it's owner.
     * @param  {Object} e Message Event object
     */
    var onMessage = function onMessage(e) {
        var data = e.data;

        switch (data.cmd) {
            case 'start':
                self.postMessage('DISPATCHER WORKER STARTED');
                break;
            case 'stop':
                self.postMessage('DISPATCHER WORKER STOPPED');
                flushCache();
                self.close(); // Terminates the worker.
                break;
            case 'queue':
                cache.push(e.data);
                break;
            case 'flush':
                flushCache();
                break;
        };
    };

    self.addEventListener('message', onMessage, false);
}).toString();

/**
 * Router class provides a single access point for sending report content
 * to the server by using a dedicated web worker dispatcher.
 */

var Router = (function () {

    /**
     * Creates a single instance for this clase, this method shouldn't be
     * called directly from outside, instead use instance getter to get
     * access to the single instace.
     * @private
     * @param  {Symbol} enforcer
     */

    function Router(enforcer) {
        _classCallCheck(this, Router);

        if (enforcer != singletonEnforcer) throw "Cannot construct singleton";

        this._flushInterval = 20000; // 20 seconds
        this._flushHandler = this._flush.bind(this);

        this._flushInterval = setInterval(this._flushHandler, this._flushInterval);

        // Create a string defining a closure and execute it.
        dispatcher = '(' + dispatcher + ')()';

        // Create a fake file using script string in order to provide worker
        // with the code required to run.
        var blob = new Blob([dispatcher], {
            type: 'application/javascript'
        });

        // Create a worker using code stored in the blob file
        this._worker = new Worker(URL.createObjectURL(blob));

        // Listen to worker notifications
        this._worker.onmessage = function (message) {
            console.debug(message.data);
        };

        // Send init command to worker
        this._worker.postMessage({
            'cmd': 'start'
        });
    }

    /**
     * Returns a singleton reference for this class to be used application wide.
     * @static
     * @return {Router} A refernce to the unique  instance.
     */

    _createClass(Router, [{
        key: '_flush',

        /**
         * @private
         */
        value: function _flush() {
            this._worker.postMessage({
                'cmd': 'flush'
            });
        }
    }], [{
        key: 'enqueue',

        /**
         * Sends information to the report post queue
         * @param  {Object} data A simple javascript object containing a set of
         *                  keys and values that will be transmited to the
         *                  server on flush operations.
         */
        value: function enqueue(data) {
            this.instance._worker.postMessage({
                'cmd': 'queue',
                'params': data
            });
            console.debug('MESSAGE SENT TO QUEUE', data);
        }

        /**
         * Flushes cached information on threaded dispatcher into the server whenever
         * a valid network connection is available.
         */
    }, {
        key: 'flush',
        value: function flush() {
            console.info('MESSAGE CACHE WILL FLUSH');
            this.instance._flush();
        }

        /**
         * Sets auto flush interval in milliseconds, after the time set router will
         * attempt to dispatch all pending messages to remote server whenever there
         * is connection available. Set interval to false in order to stop auto
         * dispatch operations.
         * @param  {Number|Boolean} interval The number of milliseconds that router
         *                          will wait until sending cached information to
         *                          remote server.
         */
    }, {
        key: 'instance',
        get: function get() {
            if (!this[singleton]) {
                this[singleton] = new this(singletonEnforcer);
            }
            return this[singleton];
        }
    }, {
        key: 'flushInterval',
        set: function set(interval) {
            this.instance._flushInterval = interval;

            clearInterval(this._flushInterval);

            // If false sent no auto flush operation will be created
            if (interval === false) return;

            // set new auto flush operation interval
            this._flushInterval = setInterval(this._flushHandler, this._flushInterval);
        },

        /**
         * Returns default auto flush interval value in milliseconds. The interval
         * will be used to enroute pending message to remote server.
         * @return {Number|Boolean} The number of millisenconds configured for the
         * flush interval or false whenever the auto flush feature has been disabled.
         */
        get: function get() {
            return this.instance._flushInterval;
        }
    }]);

    return Router;
})();

exports['default'] = Router;
module.exports = exports['default'];

},{}],15:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _monitor = require('./monitor');

var _monitor2 = _interopRequireDefault(_monitor);

var _profiler = require('./profiler');

var _profiler2 = _interopRequireDefault(_profiler);

window.Rum = {};
window.Rum.Monitor = _monitor2['default'];
window.Rum.Profiler = _profiler2['default'];

},{"./monitor":12,"./profiler":13}],16:[function(require,module,exports){
'use strict';

/**
 * Util class exposes a set of common utility functionalities used through the
 * application.
 */
Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Util = (function () {
    function Util() {
        _classCallCheck(this, Util);
    }

    _createClass(Util, null, [{
        key: "debounce",

        /**
         * Returns a new function with a limit on the rate it can be fired. This
         * is useful for those functions that are called too often as a result
         * of user events.
         * @param  {Function} func    The reference to the original function
         * @param  {Number} wait      The minimum amount of time that should
         *                            pass without calling the function in order
         *                            to trigger the real call.
         * @param  {Boolean} immediate
         * @param  {Object} scope
         */
        value: function debounce(func, wait, immediate, scope) {
            var timeout;
            return function () {
                var context = this,
                    args = arguments;
                var later = function later() {
                    timeout = null;
                    if (!immediate) func.apply(scope, args);
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(scope, args);
            };
        }

        /**
         * Adds a new event listener to the provided object and binds it to a
         * supplied callback function
         * @param {Object}   target
         * @param {String}   name
         * @param {Function} callback
         * @param {Boolean}   capture
         */
    }, {
        key: "addEventListener",
        value: function addEventListener(target, name, callback, capture) {
            capture = capture || false;
            if ("undefined" != typeof target.attachEvent) {
                return target.attachEvent("on" + name, callback);
            } else if (target.addEventListener) {
                return target.addEventListener(name, callback, capture);
            }
        }
    }, {
        key: "isDocumentHidden",

        /**
         * Check whenever document has been hiden by user switching to other
         * tabs or windows.
         * @return {Boolean}
         */
        value: function isDocumentHidden() {
            return document[this.HIDDEN_PROPERTY];
        }

        /**
         * Generates a Globally Unique Identifier
         * @param [hyphens = true] Set to false to remove hypen separator between
         * number groups.
         * @return {String}
         */
    }, {
        key: "generateGUID",
        value: function generateGUID(hyphens) {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
            }

            var sep = '-';

            if (hyphens === false) {
                sep = '';
            }

            return s4() + s4() + sep + s4() + sep + s4() + sep + s4() + sep + s4() + s4() + s4();
        }

        /**
         * Copies all object properties into a new object
         * @param  {Object} obj the source object which properties will be copied
         * @return {Object}     A new object with the properties copied
         */
    }, {
        key: "copyObject",
        value: function copyObject(obj) {
            var newObj = {};

            for (var key in obj) {
                newObj[key] = obj[key];
            }

            return newObj;
        }
    }, {
        key: "median",
        value: function median(values) {

            values.sort(function (a, b) {
                return a - b;
            });

            var half = Math.floor(values.length / 2);

            if (values.length % 2) return values[half];else return (values[half - 1] + values[half]) / 2.0;
        }
    }, {
        key: "VISIBILITY_CHANGE",

        /**
         * Returns the name of visibility change property on current user agent.
         */
        get: function get() {
            var hidden = "hidden";

            // Standards:
            if (hidden in document) return "visibilitychange";else if ((hidden = "mozHidden") in document) return "mozvisibilitychange";else if ((hidden = "webkitHidden") in document) return "webkitvisibilitychange";else if ((hidden = "msHidden") in document) return "msvisibilitychange";
        }

        /**
         * Returns the name of document hidden property on current user agent.
         */
    }, {
        key: "HIDDEN_PROPERTY",
        get: function get() {
            if ('hidden' in document) return 'hidden';
            if ('mozHidden' in document) return 'mozHidden';
            if ('webkitHidden' in document) return 'webkitHidden';
            if ('msHidden' in document) return 'msHidden';
        }
    }]);

    return Util;
})();

exports["default"] = Util;
module.exports = exports["default"];

},{}]},{},[15])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcGF0aC1icm93c2VyaWZ5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9taW1lLXR5cGVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL21pbWUtdHlwZXMvbm9kZV9tb2R1bGVzL21pbWUtZGIvZGIuanNvbiIsIm5vZGVfbW9kdWxlcy9taW1lLXR5cGVzL25vZGVfbW9kdWxlcy9taW1lLWRiL2luZGV4LmpzIiwiL2hvbWUvcm9kcmlnby9Xb3Jrc3BhY2VzL3J1bS9zcmMvZGF0YS9hZ2VudC5qcyIsIi9ob21lL3JvZHJpZ28vV29ya3NwYWNlcy9ydW0vc3JjL2RhdGEvZGlnZXN0LmpzIiwiL2hvbWUvcm9kcmlnby9Xb3Jrc3BhY2VzL3J1bS9zcmMvZGF0YS9wYWdlLmpzIiwiL2hvbWUvcm9kcmlnby9Xb3Jrc3BhY2VzL3J1bS9zcmMvZGF0YS9wcm9maWxlLmpzIiwiL2hvbWUvcm9kcmlnby9Xb3Jrc3BhY2VzL3J1bS9zcmMvZGF0YS9yZXBvcnQuanMiLCIvaG9tZS9yb2RyaWdvL1dvcmtzcGFjZXMvcnVtL3NyYy9kYXRhL3Jlc291cmNlLmpzIiwiL2hvbWUvcm9kcmlnby9Xb3Jrc3BhY2VzL3J1bS9zcmMvbW9uaXRvci5qcyIsIi9ob21lL3JvZHJpZ28vV29ya3NwYWNlcy9ydW0vc3JjL3Byb2ZpbGVyLmpzIiwiL2hvbWUvcm9kcmlnby9Xb3Jrc3BhY2VzL3J1bS9zcmMvcm91dGVyLmpzIiwiL2hvbWUvcm9kcmlnby9Xb3Jrc3BhY2VzL3J1bS9zcmMvcnVtLmpzIiwiL2hvbWUvcm9kcmlnby9Xb3Jrc3BhY2VzL3J1bS9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QyxNQUFNLEdBQUcsY0FBYyxDQUFBLElBQUssUUFBUSxFQUMxQyxPQUFPLHdCQUF3QixDQUFDLEtBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFBLElBQUssUUFBUSxFQUN0QyxPQUFPLG9CQUFvQixDQUFDO1NBQ25DOzs7Ozs7O2FBS3lCLGVBQUc7QUFDekIsZ0JBQUksUUFBUSxJQUFJLFFBQVEsRUFBRSxPQUFPLFFBQVEsQ0FBQztBQUMxQyxnQkFBSSxXQUFXLElBQUksUUFBUSxFQUFFLE9BQU8sV0FBVyxDQUFDO0FBQ2hELGdCQUFJLGNBQWMsSUFBSSxRQUFRLEVBQUUsT0FBTyxjQUFjLENBQUM7QUFDdEQsZ0JBQUksVUFBVSxJQUFJLFFBQVEsRUFBRSxPQUFPLFVBQVUsQ0FBQztTQUNqRDs7O1dBeEVnQixJQUFJOzs7cUJBQUosSUFBSSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gcmVzb2x2ZXMgLiBhbmQgLi4gZWxlbWVudHMgaW4gYSBwYXRoIGFycmF5IHdpdGggZGlyZWN0b3J5IG5hbWVzIHRoZXJlXG4vLyBtdXN0IGJlIG5vIHNsYXNoZXMsIGVtcHR5IGVsZW1lbnRzLCBvciBkZXZpY2UgbmFtZXMgKGM6XFwpIGluIHRoZSBhcnJheVxuLy8gKHNvIGFsc28gbm8gbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlcyAtIGl0IGRvZXMgbm90IGRpc3Rpbmd1aXNoXG4vLyByZWxhdGl2ZSBhbmQgYWJzb2x1dGUgcGF0aHMpXG5mdW5jdGlvbiBub3JtYWxpemVBcnJheShwYXJ0cywgYWxsb3dBYm92ZVJvb3QpIHtcbiAgLy8gaWYgdGhlIHBhdGggdHJpZXMgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIGB1cGAgZW5kcyB1cCA+IDBcbiAgdmFyIHVwID0gMDtcbiAgZm9yICh2YXIgaSA9IHBhcnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIGxhc3QgPSBwYXJ0c1tpXTtcbiAgICBpZiAobGFzdCA9PT0gJy4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgfSBlbHNlIGlmIChsYXN0ID09PSAnLi4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cCsrO1xuICAgIH0gZWxzZSBpZiAodXApIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwLS07XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIHBhdGggaXMgYWxsb3dlZCB0byBnbyBhYm92ZSB0aGUgcm9vdCwgcmVzdG9yZSBsZWFkaW5nIC4uc1xuICBpZiAoYWxsb3dBYm92ZVJvb3QpIHtcbiAgICBmb3IgKDsgdXAtLTsgdXApIHtcbiAgICAgIHBhcnRzLnVuc2hpZnQoJy4uJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhcnRzO1xufVxuXG4vLyBTcGxpdCBhIGZpbGVuYW1lIGludG8gW3Jvb3QsIGRpciwgYmFzZW5hbWUsIGV4dF0sIHVuaXggdmVyc2lvblxuLy8gJ3Jvb3QnIGlzIGp1c3QgYSBzbGFzaCwgb3Igbm90aGluZy5cbnZhciBzcGxpdFBhdGhSZSA9XG4gICAgL14oXFwvP3wpKFtcXHNcXFNdKj8pKCg/OlxcLnsxLDJ9fFteXFwvXSs/fCkoXFwuW14uXFwvXSp8KSkoPzpbXFwvXSopJC87XG52YXIgc3BsaXRQYXRoID0gZnVuY3Rpb24oZmlsZW5hbWUpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aFJlLmV4ZWMoZmlsZW5hbWUpLnNsaWNlKDEpO1xufTtcblxuLy8gcGF0aC5yZXNvbHZlKFtmcm9tIC4uLl0sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZXNvbHZlID0gZnVuY3Rpb24oKSB7XG4gIHZhciByZXNvbHZlZFBhdGggPSAnJyxcbiAgICAgIHJlc29sdmVkQWJzb2x1dGUgPSBmYWxzZTtcblxuICBmb3IgKHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTEgJiYgIXJlc29sdmVkQWJzb2x1dGU7IGktLSkge1xuICAgIHZhciBwYXRoID0gKGkgPj0gMCkgPyBhcmd1bWVudHNbaV0gOiBwcm9jZXNzLmN3ZCgpO1xuXG4gICAgLy8gU2tpcCBlbXB0eSBhbmQgaW52YWxpZCBlbnRyaWVzXG4gICAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGgucmVzb2x2ZSBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9IGVsc2UgaWYgKCFwYXRoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICByZXNvbHZlZFBhdGggPSBwYXRoICsgJy8nICsgcmVzb2x2ZWRQYXRoO1xuICAgIHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsIGJ1dFxuICAvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcmVzb2x2ZWRQYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHJlc29sdmVkUGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFyZXNvbHZlZEFic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgcmV0dXJuICgocmVzb2x2ZWRBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHJlc29sdmVkUGF0aCkgfHwgJy4nO1xufTtcblxuLy8gcGF0aC5ub3JtYWxpemUocGF0aClcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMubm9ybWFsaXplID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgaXNBYnNvbHV0ZSA9IGV4cG9ydHMuaXNBYnNvbHV0ZShwYXRoKSxcbiAgICAgIHRyYWlsaW5nU2xhc2ggPSBzdWJzdHIocGF0aCwgLTEpID09PSAnLyc7XG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFpc0Fic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgaWYgKCFwYXRoICYmICFpc0Fic29sdXRlKSB7XG4gICAgcGF0aCA9ICcuJztcbiAgfVxuICBpZiAocGF0aCAmJiB0cmFpbGluZ1NsYXNoKSB7XG4gICAgcGF0aCArPSAnLyc7XG4gIH1cblxuICByZXR1cm4gKGlzQWJzb2x1dGUgPyAnLycgOiAnJykgKyBwYXRoO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5pc0Fic29sdXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuam9pbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcGF0aHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICByZXR1cm4gZXhwb3J0cy5ub3JtYWxpemUoZmlsdGVyKHBhdGhzLCBmdW5jdGlvbihwLCBpbmRleCkge1xuICAgIGlmICh0eXBlb2YgcCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLmpvaW4gbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9KS5qb2luKCcvJykpO1xufTtcblxuXG4vLyBwYXRoLnJlbGF0aXZlKGZyb20sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZWxhdGl2ZSA9IGZ1bmN0aW9uKGZyb20sIHRvKSB7XG4gIGZyb20gPSBleHBvcnRzLnJlc29sdmUoZnJvbSkuc3Vic3RyKDEpO1xuICB0byA9IGV4cG9ydHMucmVzb2x2ZSh0bykuc3Vic3RyKDEpO1xuXG4gIGZ1bmN0aW9uIHRyaW0oYXJyKSB7XG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICBmb3IgKDsgc3RhcnQgPCBhcnIubGVuZ3RoOyBzdGFydCsrKSB7XG4gICAgICBpZiAoYXJyW3N0YXJ0XSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIHZhciBlbmQgPSBhcnIubGVuZ3RoIC0gMTtcbiAgICBmb3IgKDsgZW5kID49IDA7IGVuZC0tKSB7XG4gICAgICBpZiAoYXJyW2VuZF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoc3RhcnQgPiBlbmQpIHJldHVybiBbXTtcbiAgICByZXR1cm4gYXJyLnNsaWNlKHN0YXJ0LCBlbmQgLSBzdGFydCArIDEpO1xuICB9XG5cbiAgdmFyIGZyb21QYXJ0cyA9IHRyaW0oZnJvbS5zcGxpdCgnLycpKTtcbiAgdmFyIHRvUGFydHMgPSB0cmltKHRvLnNwbGl0KCcvJykpO1xuXG4gIHZhciBsZW5ndGggPSBNYXRoLm1pbihmcm9tUGFydHMubGVuZ3RoLCB0b1BhcnRzLmxlbmd0aCk7XG4gIHZhciBzYW1lUGFydHNMZW5ndGggPSBsZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZnJvbVBhcnRzW2ldICE9PSB0b1BhcnRzW2ldKSB7XG4gICAgICBzYW1lUGFydHNMZW5ndGggPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdmFyIG91dHB1dFBhcnRzID0gW107XG4gIGZvciAodmFyIGkgPSBzYW1lUGFydHNMZW5ndGg7IGkgPCBmcm9tUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBvdXRwdXRQYXJ0cy5wdXNoKCcuLicpO1xuICB9XG5cbiAgb3V0cHV0UGFydHMgPSBvdXRwdXRQYXJ0cy5jb25jYXQodG9QYXJ0cy5zbGljZShzYW1lUGFydHNMZW5ndGgpKTtcblxuICByZXR1cm4gb3V0cHV0UGFydHMuam9pbignLycpO1xufTtcblxuZXhwb3J0cy5zZXAgPSAnLyc7XG5leHBvcnRzLmRlbGltaXRlciA9ICc6JztcblxuZXhwb3J0cy5kaXJuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgcmVzdWx0ID0gc3BsaXRQYXRoKHBhdGgpLFxuICAgICAgcm9vdCA9IHJlc3VsdFswXSxcbiAgICAgIGRpciA9IHJlc3VsdFsxXTtcblxuICBpZiAoIXJvb3QgJiYgIWRpcikge1xuICAgIC8vIE5vIGRpcm5hbWUgd2hhdHNvZXZlclxuICAgIHJldHVybiAnLic7XG4gIH1cblxuICBpZiAoZGlyKSB7XG4gICAgLy8gSXQgaGFzIGEgZGlybmFtZSwgc3RyaXAgdHJhaWxpbmcgc2xhc2hcbiAgICBkaXIgPSBkaXIuc3Vic3RyKDAsIGRpci5sZW5ndGggLSAxKTtcbiAgfVxuXG4gIHJldHVybiByb290ICsgZGlyO1xufTtcblxuXG5leHBvcnRzLmJhc2VuYW1lID0gZnVuY3Rpb24ocGF0aCwgZXh0KSB7XG4gIHZhciBmID0gc3BsaXRQYXRoKHBhdGgpWzJdO1xuICAvLyBUT0RPOiBtYWtlIHRoaXMgY29tcGFyaXNvbiBjYXNlLWluc2Vuc2l0aXZlIG9uIHdpbmRvd3M/XG4gIGlmIChleHQgJiYgZi5zdWJzdHIoLTEgKiBleHQubGVuZ3RoKSA9PT0gZXh0KSB7XG4gICAgZiA9IGYuc3Vic3RyKDAsIGYubGVuZ3RoIC0gZXh0Lmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGY7XG59O1xuXG5cbmV4cG9ydHMuZXh0bmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aChwYXRoKVszXTtcbn07XG5cbmZ1bmN0aW9uIGZpbHRlciAoeHMsIGYpIHtcbiAgICBpZiAoeHMuZmlsdGVyKSByZXR1cm4geHMuZmlsdGVyKGYpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChmKHhzW2ldLCBpLCB4cykpIHJlcy5wdXNoKHhzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cblxuLy8gU3RyaW5nLnByb3RvdHlwZS5zdWJzdHIgLSBuZWdhdGl2ZSBpbmRleCBkb24ndCB3b3JrIGluIElFOFxudmFyIHN1YnN0ciA9ICdhYicuc3Vic3RyKC0xKSA9PT0gJ2InXG4gICAgPyBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7IHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pIH1cbiAgICA6IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHtcbiAgICAgICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSBzdHIubGVuZ3RoICsgc3RhcnQ7XG4gICAgICAgIHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pO1xuICAgIH1cbjtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyohXG4gKiBtaW1lLXR5cGVzXG4gKiBDb3B5cmlnaHQoYykgMjAxNCBKb25hdGhhbiBPbmdcbiAqIENvcHlyaWdodChjKSAyMDE1IERvdWdsYXMgQ2hyaXN0b3BoZXIgV2lsc29uXG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG4ndXNlIHN0cmljdCdcblxuLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICogQHByaXZhdGVcbiAqL1xuXG52YXIgZGIgPSByZXF1aXJlKCdtaW1lLWRiJylcbnZhciBleHRuYW1lID0gcmVxdWlyZSgncGF0aCcpLmV4dG5hbWVcblxuLyoqXG4gKiBNb2R1bGUgdmFyaWFibGVzLlxuICogQHByaXZhdGVcbiAqL1xuXG52YXIgZXh0cmFjdFR5cGVSZWdFeHAgPSAvXlxccyooW147XFxzXSopKD86O3xcXHN8JCkvXG52YXIgdGV4dFR5cGVSZWdFeHAgPSAvXnRleHRcXC8vaVxuXG4vKipcbiAqIE1vZHVsZSBleHBvcnRzLlxuICogQHB1YmxpY1xuICovXG5cbmV4cG9ydHMuY2hhcnNldCA9IGNoYXJzZXRcbmV4cG9ydHMuY2hhcnNldHMgPSB7IGxvb2t1cDogY2hhcnNldCB9XG5leHBvcnRzLmNvbnRlbnRUeXBlID0gY29udGVudFR5cGVcbmV4cG9ydHMuZXh0ZW5zaW9uID0gZXh0ZW5zaW9uXG5leHBvcnRzLmV4dGVuc2lvbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpXG5leHBvcnRzLmxvb2t1cCA9IGxvb2t1cFxuZXhwb3J0cy50eXBlcyA9IE9iamVjdC5jcmVhdGUobnVsbClcblxuLy8gUG9wdWxhdGUgdGhlIGV4dGVuc2lvbnMvdHlwZXMgbWFwc1xucG9wdWxhdGVNYXBzKGV4cG9ydHMuZXh0ZW5zaW9ucywgZXhwb3J0cy50eXBlcylcblxuLyoqXG4gKiBHZXQgdGhlIGRlZmF1bHQgY2hhcnNldCBmb3IgYSBNSU1FIHR5cGUuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAqIEByZXR1cm4ge2Jvb2xlYW58c3RyaW5nfVxuICovXG5cbmZ1bmN0aW9uIGNoYXJzZXQodHlwZSkge1xuICBpZiAoIXR5cGUgfHwgdHlwZW9mIHR5cGUgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBUT0RPOiB1c2UgbWVkaWEtdHlwZXJcbiAgdmFyIG1hdGNoID0gZXh0cmFjdFR5cGVSZWdFeHAuZXhlYyh0eXBlKVxuICB2YXIgbWltZSA9IG1hdGNoICYmIGRiW21hdGNoWzFdLnRvTG93ZXJDYXNlKCldXG5cbiAgaWYgKG1pbWUgJiYgbWltZS5jaGFyc2V0KSB7XG4gICAgcmV0dXJuIG1pbWUuY2hhcnNldFxuICB9XG5cbiAgLy8gZGVmYXVsdCB0ZXh0LyogdG8gdXRmLThcbiAgaWYgKG1hdGNoICYmIHRleHRUeXBlUmVnRXhwLnRlc3QobWF0Y2hbMV0pKSB7XG4gICAgcmV0dXJuICdVVEYtOCdcbiAgfVxuXG4gIHJldHVybiBmYWxzZVxufVxuXG4vKipcbiAqIENyZWF0ZSBhIGZ1bGwgQ29udGVudC1UeXBlIGhlYWRlciBnaXZlbiBhIE1JTUUgdHlwZSBvciBleHRlbnNpb24uXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHN0clxuICogQHJldHVybiB7Ym9vbGVhbnxzdHJpbmd9XG4gKi9cblxuZnVuY3Rpb24gY29udGVudFR5cGUoc3RyKSB7XG4gIC8vIFRPRE86IHNob3VsZCB0aGlzIGV2ZW4gYmUgaW4gdGhpcyBtb2R1bGU/XG4gIGlmICghc3RyIHx8IHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICB2YXIgbWltZSA9IHN0ci5pbmRleE9mKCcvJykgPT09IC0xXG4gICAgPyBleHBvcnRzLmxvb2t1cChzdHIpXG4gICAgOiBzdHJcblxuICBpZiAoIW1pbWUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIFRPRE86IHVzZSBjb250ZW50LXR5cGUgb3Igb3RoZXIgbW9kdWxlXG4gIGlmIChtaW1lLmluZGV4T2YoJ2NoYXJzZXQnKSA9PT0gLTEpIHtcbiAgICB2YXIgY2hhcnNldCA9IGV4cG9ydHMuY2hhcnNldChtaW1lKVxuICAgIGlmIChjaGFyc2V0KSBtaW1lICs9ICc7IGNoYXJzZXQ9JyArIGNoYXJzZXQudG9Mb3dlckNhc2UoKVxuICB9XG5cbiAgcmV0dXJuIG1pbWVcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGRlZmF1bHQgZXh0ZW5zaW9uIGZvciBhIE1JTUUgdHlwZS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICogQHJldHVybiB7Ym9vbGVhbnxzdHJpbmd9XG4gKi9cblxuZnVuY3Rpb24gZXh0ZW5zaW9uKHR5cGUpIHtcbiAgaWYgKCF0eXBlIHx8IHR5cGVvZiB0eXBlICE9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLy8gVE9ETzogdXNlIG1lZGlhLXR5cGVyXG4gIHZhciBtYXRjaCA9IGV4dHJhY3RUeXBlUmVnRXhwLmV4ZWModHlwZSlcblxuICAvLyBnZXQgZXh0ZW5zaW9uc1xuICB2YXIgZXh0cyA9IG1hdGNoICYmIGV4cG9ydHMuZXh0ZW5zaW9uc1ttYXRjaFsxXS50b0xvd2VyQ2FzZSgpXVxuXG4gIGlmICghZXh0cyB8fCAhZXh0cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIHJldHVybiBleHRzWzBdXG59XG5cbi8qKlxuICogTG9va3VwIHRoZSBNSU1FIHR5cGUgZm9yIGEgZmlsZSBwYXRoL2V4dGVuc2lvbi5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHJldHVybiB7Ym9vbGVhbnxzdHJpbmd9XG4gKi9cblxuZnVuY3Rpb24gbG9va3VwKHBhdGgpIHtcbiAgaWYgKCFwYXRoIHx8IHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLy8gZ2V0IHRoZSBleHRlbnNpb24gKFwiZXh0XCIgb3IgXCIuZXh0XCIgb3IgZnVsbCBwYXRoKVxuICB2YXIgZXh0ZW5zaW9uID0gZXh0bmFtZSgneC4nICsgcGF0aClcbiAgICAudG9Mb3dlckNhc2UoKVxuICAgIC5zdWJzdHIoMSlcblxuICBpZiAoIWV4dGVuc2lvbikge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgcmV0dXJuIGV4cG9ydHMudHlwZXNbZXh0ZW5zaW9uXSB8fCBmYWxzZVxufVxuXG4vKipcbiAqIFBvcHVsYXRlIHRoZSBleHRlbnNpb25zIGFuZCB0eXBlcyBtYXBzLlxuICogQHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBwb3B1bGF0ZU1hcHMoZXh0ZW5zaW9ucywgdHlwZXMpIHtcbiAgLy8gc291cmNlIHByZWZlcmVuY2UgKGxlYXN0IC0+IG1vc3QpXG4gIHZhciBwcmVmZXJlbmNlID0gWyduZ2lueCcsICdhcGFjaGUnLCB1bmRlZmluZWQsICdpYW5hJ11cblxuICBPYmplY3Qua2V5cyhkYikuZm9yRWFjaChmdW5jdGlvbiBmb3JFYWNoTWltZVR5cGUodHlwZSkge1xuICAgIHZhciBtaW1lID0gZGJbdHlwZV1cbiAgICB2YXIgZXh0cyA9IG1pbWUuZXh0ZW5zaW9uc1xuXG4gICAgaWYgKCFleHRzIHx8ICFleHRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gbWltZSAtPiBleHRlbnNpb25zXG4gICAgZXh0ZW5zaW9uc1t0eXBlXSA9IGV4dHNcblxuICAgIC8vIGV4dGVuc2lvbiAtPiBtaW1lXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBleHRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZXh0ZW5zaW9uID0gZXh0c1tpXVxuXG4gICAgICBpZiAodHlwZXNbZXh0ZW5zaW9uXSkge1xuICAgICAgICB2YXIgZnJvbSA9IHByZWZlcmVuY2UuaW5kZXhPZihkYlt0eXBlc1tleHRlbnNpb25dXS5zb3VyY2UpXG4gICAgICAgIHZhciB0byA9IHByZWZlcmVuY2UuaW5kZXhPZihtaW1lLnNvdXJjZSlcblxuICAgICAgICBpZiAodHlwZXNbZXh0ZW5zaW9uXSAhPT0gJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSdcbiAgICAgICAgICAmJiBmcm9tID4gdG8gfHwgKGZyb20gPT09IHRvICYmIHR5cGVzW2V4dGVuc2lvbl0uc3Vic3RyKDAsIDEyKSA9PT0gJ2FwcGxpY2F0aW9uLycpKSB7XG4gICAgICAgICAgLy8gc2tpcCB0aGUgcmVtYXBwaW5nXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gc2V0IHRoZSBleHRlbnNpb24gLT4gbWltZVxuICAgICAgdHlwZXNbZXh0ZW5zaW9uXSA9IHR5cGVcbiAgICB9XG4gIH0pXG59XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwiYXBwbGljYXRpb24vMWQtaW50ZXJsZWF2ZWQtcGFyaXR5ZmVjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uLzNncGRhc2gtcW9lLXJlcG9ydCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vM2dwcC1pbXMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2EybFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9hY3RpdmVtZXNzYWdlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2FsdG8tY29zdG1hcCtqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYWx0by1jb3N0bWFwZmlsdGVyK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9hbHRvLWRpcmVjdG9yeStqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYWx0by1lbmRwb2ludGNvc3QranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2FsdG8tZW5kcG9pbnRjb3N0cGFyYW1zK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9hbHRvLWVuZHBvaW50cHJvcCtqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYWx0by1lbmRwb2ludHByb3BwYXJhbXMranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2FsdG8tZXJyb3IranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2FsdG8tbmV0d29ya21hcCtqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYWx0by1uZXR3b3JrbWFwZmlsdGVyK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9hbWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYW5kcmV3LWluc2V0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZXpcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9hcHBsZWZpbGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYXBwbGl4d2FyZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9hdGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYXRmeFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9hdG9tK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXRvbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2F0b21jYXQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXRvbWNhdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2F0b21kZWxldGVkK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9hdG9taWNtYWlsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2F0b21zdmMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXRvbXN2Y1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2F0eG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2F1dGgtcG9saWN5K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9iYWNuZXQteGRkK3ppcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9iYXRjaC1zbXRwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2Jkb2NcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJiZG9jXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYmVlcCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY2FsZW5kYXIranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2NhbGVuZGFyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jYWxsLWNvbXBsZXRpb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY2Fscy0xODQwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2Nib3JcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY2NtcCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY2N4bWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2N4bWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jZGZ4K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jZG1pLWNhcGFiaWxpdHlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjZG1pYVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2NkbWktY29udGFpbmVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2RtaWNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jZG1pLWRvbWFpblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNkbWlkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY2RtaS1vYmplY3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjZG1pb1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2NkbWktcXVldWVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjZG1pcVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2NlYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jZWEtMjAxOCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY2VsbG1sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jZndcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY21zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2NucnAreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2NvYXAtZ3JvdXAranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2NvbW1vbmdyb3VuZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jb25mZXJlbmNlLWluZm8reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2NwbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY3NyYXR0cnNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY3N0YSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY3N0YWRhdGEreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2N1LXNlZW1lXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjdVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2N5YmVyY2FzaFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9kYXJ0XCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZGFzaCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtZHBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9kYXNoZGVsdGFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZGF2bW91bnQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZGF2bW91bnRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9kY2EtcmZ0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2RjZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9kZWMtZHhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZGlhbG9nLWluZm8reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2RpY29tXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2RpaVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9kaXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZG5zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2RvY2Jvb2sreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkYmtcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9kc2twcCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZHNzYytkZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkc3NjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZHNzYyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4ZHNzY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2R2Y3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZWNtYXNjcmlwdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZWNtYVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2VkaS1jb25zZW50XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2VkaS14MTJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZWRpZmFjdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2VcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9lbW1hK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImVtbWFcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9lbW90aW9ubWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2VuY2FwcnRwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2VwcCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZXB1Yit6aXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJlcHViXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZXNob3BcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZXhpXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZXhpXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZmFzdGluZm9zZXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZmFzdHNvYXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZmR0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9maXRzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2ZvbnQtc2ZudFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9mb250LXRkcGZyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicGZyXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZm9udC13b2ZmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid29mZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2ZvbnQtd29mZjJcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3b2ZmMlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2ZyYW1ld29yay1hdHRyaWJ1dGVzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9nbWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnbWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9ncHgreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJncHhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9neGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImd4ZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2d6aXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vaDIyNFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9oZWxkK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9odHRwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2h5cGVyc3R1ZGlvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3RrXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vaWJlLWtleS1yZXF1ZXN0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9pYmUtcGtnLXJlcGx5K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9pYmUtcHAtZGF0YVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9pZ2VzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2ltLWlzY29tcG9zaW5nK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9pbmRleFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9pbmRleC5jbWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vaW5kZXgub2JqXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2luZGV4LnJlc3BvbnNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2luZGV4LnZuZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9pbmttbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJpbmtcIixcImlua21sXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vaW90cFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9pcGZpeFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImlwZml4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vaXBwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2lzdXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vaXRzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9qYXZhLWFyY2hpdmVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImphclwiLFwid2FyXCIsXCJlYXJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9qYXZhLXNlcmlhbGl6ZWQtb2JqZWN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzZXJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9qYXZhLXZtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjbGFzc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2phdmFzY3JpcHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY2hhcnNldFwiOiBcIlVURi04XCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wianNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9qb3NlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2pvc2UranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2pyZCtqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vanNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjaGFyc2V0XCI6IFwiVVRGLThcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJqc29uXCIsXCJtYXBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9qc29uLXBhdGNoK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9qc29uLXNlcVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9qc29uNVwiOiB7XG4gICAgXCJleHRlbnNpb25zXCI6IFtcImpzb241XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vanNvbm1sK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wianNvbm1sXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vandrK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9qd2stc2V0K2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9qd3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24va3BtbC1yZXF1ZXN0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9rcG1sLXJlc3BvbnNlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9sZCtqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJqc29ubGRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9saW5rLWZvcm1hdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9sb2FkLWNvbnRyb2wreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2xvc3QreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibG9zdHhtbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2xvc3RzeW5jK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9seGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWFjLWJpbmhleDQwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaHF4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWFjLWNvbXBhY3Rwcm9cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNwdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL21hY3dyaXRlaWlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWFkcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtYWRzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWFuaWZlc3QranNvblwiOiB7XG4gICAgXCJjaGFyc2V0XCI6IFwiVVRGLThcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3ZWJtYW5pZmVzdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL21hcmNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtcmNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tYXJjeG1sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1yY3hcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tYXRoZW1hdGljYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1hXCIsXCJuYlwiLFwibWJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tYXRobWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWF0aG1sXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWF0aG1sLWNvbnRlbnQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21hdGhtbC1wcmVzZW50YXRpb24reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21ibXMtYXNzb2NpYXRlZC1wcm9jZWR1cmUtZGVzY3JpcHRpb24reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21ibXMtZGVyZWdpc3Rlcit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWJtcy1lbnZlbG9wZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWJtcy1tc2sreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21ibXMtbXNrLXJlc3BvbnNlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tYm1zLXByb3RlY3Rpb24tZGVzY3JpcHRpb24reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21ibXMtcmVjZXB0aW9uLXJlcG9ydCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWJtcy1yZWdpc3Rlcit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWJtcy1yZWdpc3Rlci1yZXNwb25zZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWJtcy1zY2hlZHVsZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWJtcy11c2VyLXNlcnZpY2UtZGVzY3JpcHRpb24reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21ib3hcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtYm94XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWVkaWEtcG9saWN5LWRhdGFzZXQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21lZGlhX2NvbnRyb2wreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21lZGlhc2VydmVyY29udHJvbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtc2NtbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL21lcmdlLXBhdGNoK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tZXRhbGluayt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1ldGFsaW5rXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWV0YWxpbms0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1ldGE0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWV0cyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtZXRzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWY0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21pa2V5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21vZHMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibW9kc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL21vc3Mta2V5c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tb3NzLXNpZ25hdHVyZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tb3Nza2V5LWRhdGFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbW9zc2tleS1yZXF1ZXN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21wMjFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtMjFcIixcIm1wMjFcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tcDRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtcDRzXCIsXCJtNHBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tcGVnNC1nZW5lcmljXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21wZWc0LWlvZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tcGVnNC1pb2QteG10XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21yYi1jb25zdW1lcit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbXJiLXB1Ymxpc2greG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21zYy1pdnIreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21zYy1taXhlcit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbXN3b3JkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZG9jXCIsXCJkb3RcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9teGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJteGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9uYXNkYXRhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL25ld3MtY2hlY2tncm91cHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbmV3cy1ncm91cGluZm9cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbmV3cy10cmFuc21pc3Npb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbmxzbWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL25zc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9vY3NwLXJlcXVlc3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vb2NzcC1yZXNwb25zZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJiaW5cIixcImRtc1wiLFwibHJmXCIsXCJtYXJcIixcInNvXCIsXCJkaXN0XCIsXCJkaXN0elwiLFwicGtnXCIsXCJicGtcIixcImR1bXBcIixcImVsY1wiLFwiZGVwbG95XCIsXCJleGVcIixcImRsbFwiLFwiZGViXCIsXCJkbWdcIixcImlzb1wiLFwiaW1nXCIsXCJtc2lcIixcIm1zcFwiLFwibXNtXCIsXCJidWZmZXJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9vZGFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvZGFcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9vZHhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vb2VicHMtcGFja2FnZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvcGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9vZ2dcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvZ3hcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9vbWRvYyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9tZG9jXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vb25lbm90ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib25ldG9jXCIsXCJvbmV0b2MyXCIsXCJvbmV0bXBcIixcIm9uZXBrZ1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL294cHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJveHBzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcDJwLW92ZXJsYXkreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3Bhcml0eWZlY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wYXRjaC1vcHMtZXJyb3IreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieGVyXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcGRmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicGRmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcGR4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3BncC1lbmNyeXB0ZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwZ3BcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wZ3Ata2V5c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wZ3Atc2lnbmF0dXJlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXNjXCIsXCJzaWdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9waWNzLXJ1bGVzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwcmZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9waWRmK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9waWRmLWRpZmYreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3BrY3MxMFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInAxMFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3BrY3M3LW1pbWVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwN21cIixcInA3Y1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3BrY3M3LXNpZ25hdHVyZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInA3c1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3BrY3M4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicDhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wa2l4LWF0dHItY2VydFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcGtpeC1jZXJ0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2VyXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcGtpeC1jcmxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjcmxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wa2l4LXBraXBhdGhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwa2lwYXRoXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcGtpeGNtcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBraVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3Bscyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwbHNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wb2Mtc2V0dGluZ3MreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3Bvc3RzY3JpcHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFpXCIsXCJlcHNcIixcInBzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcHJvdmVuYW5jZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcHJzLmFsdmVzdHJhbmQudGl0cmF4LXNoZWV0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3Bycy5jd3dcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjd3dcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wcnMuaHB1Yit6aXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcHJzLm5wcmVuZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wcnMucGx1Y2tlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wcnMucmRmLXhtbC1jcnlwdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wcnMueHNmK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wc2tjK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBza2N4bWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9xc2lnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3JhcHRvcmZlY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9yZGFwK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9yZGYreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJyZGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9yZWdpbmZvK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJpZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3JlbGF4LW5nLWNvbXBhY3Qtc3ludGF4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicm5jXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcmVtb3RlLXByaW50aW5nXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3JlcHV0b24ranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3Jlc291cmNlLWxpc3RzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcmVzb3VyY2UtbGlzdHMtZGlmZit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJybGRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9yaXNjb3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcmxtaSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcmxzLXNlcnZpY2VzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcnBraS1naG9zdGJ1c3RlcnNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnYnJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9ycGtpLW1hbmlmZXN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWZ0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcnBraS1yb2FcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJyb2FcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9ycGtpLXVwZG93blwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9yc2QreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJyc2RcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9yc3MreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJzc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3J0ZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicnRmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcnRwbG9vcGJhY2tcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcnR4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NhbWxhc3NlcnRpb24reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NhbWxtZXRhZGF0YSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc2JtbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzYm1sXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc2NhaXAreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NjaW0ranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NjdnAtY3YtcmVxdWVzdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNjcVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NjdnAtY3YtcmVzcG9uc2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzY3NcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zY3ZwLXZwLXJlcXVlc3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzcHFcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zY3ZwLXZwLXJlc3BvbnNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3BwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc2RwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2RwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc2VwK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zZXAtZXhpXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3Nlc3Npb24taW5mb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zZXQtcGF5bWVudFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zZXQtcGF5bWVudC1pbml0aWF0aW9uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2V0cGF5XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc2V0LXJlZ2lzdHJhdGlvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zZXQtcmVnaXN0cmF0aW9uLWluaXRpYXRpb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzZXRyZWdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zZ21sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NnbWwtb3Blbi1jYXRhbG9nXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NoZit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzaGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zaWV2ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zaW1wbGUtZmlsdGVyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zaW1wbGUtbWVzc2FnZS1zdW1tYXJ5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NpbXBsZXN5bWJvbGNvbnRhaW5lclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zbGF0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zbWlsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NtaWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic21pXCIsXCJzbWlsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc21wdGUzMzZtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NvYXArZmFzdGluZm9zZXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc29hcCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zcGFycWwtcXVlcnlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJycVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NwYXJxbC1yZXN1bHRzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNyeFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NwaXJpdHMtZXZlbnQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NxbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zcmdzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZ3JhbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NyZ3MreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZ3J4bWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zcnUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3J1XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc3NkbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNzZGxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zc21sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNzbWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi90YW1wLWFwZXgtdXBkYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3RhbXAtYXBleC11cGRhdGUtY29uZmlybVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi90YW1wLWNvbW11bml0eS11cGRhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdGFtcC1jb21tdW5pdHktdXBkYXRlLWNvbmZpcm1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdGFtcC1lcnJvclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi90YW1wLXNlcXVlbmNlLWFkanVzdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi90YW1wLXNlcXVlbmNlLWFkanVzdC1jb25maXJtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3RhbXAtc3RhdHVzLXF1ZXJ5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3RhbXAtc3RhdHVzLXJlc3BvbnNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3RhbXAtdXBkYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3RhbXAtdXBkYXRlLWNvbmZpcm1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdGFyXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdGVpK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRlaVwiLFwidGVpY29ycHVzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdGhyYXVkK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRmaVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3RpbWVzdGFtcC1xdWVyeVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi90aW1lc3RhbXAtcmVwbHlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdGltZXN0YW1wZWQtZGF0YVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRzZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3R0bWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3R2ZS10cmlnZ2VyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3VscGZlY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi91cmMtZ3Jwc2hlZXQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3VyYy1yZXNzaGVldCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdXJjLXRhcmdldGRlc2MreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3VyYy11aXNvY2tldGRlc2MreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZjYXJkK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92Y2FyZCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdmVtbWlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdml2aWRlbmNlLnNjcmlwdGZpbGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuM2dwcC5ic2YreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC4zZ3BwLnBpYy1idy1sYXJnZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBsYlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC4zZ3BwLnBpYy1idy1zbWFsbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBzYlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC4zZ3BwLnBpYy1idy12YXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwdmJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuM2dwcC5zbXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLjNncHAudXNzZCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLjNncHAyLmJjbWNzaW5mbyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLjNncHAyLnNtc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuM2dwcDIudGNhcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRjYXBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuM20ucG9zdC1pdC1ub3Rlc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInB3blwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hY2NwYWMuc2ltcGx5LmFzb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFzb1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hY2NwYWMuc2ltcGx5LmltcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImltcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hY3Vjb2JvbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFjdVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hY3Vjb3JwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXRjXCIsXCJhY3V0Y1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hZG9iZS5haXItYXBwbGljYXRpb24taW5zdGFsbGVyLXBhY2thZ2UremlwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhaXJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYWRvYmUuZmxhc2gubW92aWVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFkb2JlLmZvcm1zY2VudHJhbC5mY2R0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZmNkdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hZG9iZS5meHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmeHBcIixcImZ4cGxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYWRvYmUucGFydGlhbC11cGxvYWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFkb2JlLnhkcCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4ZHBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYWRvYmUueGZkZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhmZGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYWV0aGVyLmltcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYWgtYmFyY29kZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYWhlYWQuc3BhY2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhaGVhZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5haXJ6aXAuZmlsZXNlY3VyZS5hemZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhemZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYWlyemlwLmZpbGVzZWN1cmUuYXpzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXpzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFtYXpvbi5lYm9va1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXp3XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFtZXJpY2FuZHluYW1pY3MuYWNjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYWNjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFtaWdhLmFtaVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFtaVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hbXVuZHNlbi5tYXplK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYW5kcm9pZC5wYWNrYWdlLWFyY2hpdmVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFwa1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hbnNlci13ZWItY2VydGlmaWNhdGUtaXNzdWUtaW5pdGlhdGlvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNpaVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hbnNlci13ZWItZnVuZHMtdHJhbnNmZXItaW5pdGlhdGlvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZnRpXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFudGl4LmdhbWUtY29tcG9uZW50XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXR4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFwYWNoZS50aHJpZnQuYmluYXJ5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hcGFjaGUudGhyaWZ0LmNvbXBhY3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFwYWNoZS50aHJpZnQuanNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYXBpK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYXBwbGUuaW5zdGFsbGVyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1wa2dcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYXBwbGUubXBlZ3VybFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm0zdThcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYXJhc3RyYS5zd2lcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFyaXN0YW5ldHdvcmtzLnN3aVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN3aVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hcnRzcXVhcmVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFzdHJhZWEtc29mdHdhcmUuaW90YVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImlvdGFcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYXVkaW9ncmFwaFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFlcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hdXRvcGFja2FnZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYXZpc3Rhcit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmJhbHNhbWlxLmJtbWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5iYWxzYW1pcS5ibXByXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5iZWtpdHp1ci1zdGVjaCtqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmJpb3BheC5yZGYreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ibHVlaWNlLm11bHRpcGFzc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1wbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ibHVldG9vdGguZXAub29iXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ibHVldG9vdGgubGUub29iXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ibWlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJibWlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYnVzaW5lc3NvYmplY3RzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicmVwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNhYi1qc2NyaXB0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jYW5vbi1jcGRsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jYW5vbi1saXBzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jZW5kaW8udGhpbmxpbmMuY2xpZW50Y29uZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY2VudHVyeS1zeXN0ZW1zLnRjcF9zdHJlYW1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNoZW1kcmF3K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNkeG1sXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNoaXBudXRzLmthcmFva2UtbW1kXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibW1kXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNpbmRlcmVsbGFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjZHlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY2lycGFjay5pc2RuLWV4dFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY2l0YXRpb25zdHlsZXMuc3R5bGUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jbGF5bW9yZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNsYVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jbG9hbnRvLnJwOVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJwOVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jbG9uay5jNGdyb3VwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYzRnXCIsXCJjNGRcIixcImM0ZlwiLFwiYzRwXCIsXCJjNHVcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY2x1ZXRydXN0LmNhcnRvbW9iaWxlLWNvbmZpZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImMxMWFtY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jbHVldHJ1c3QuY2FydG9tb2JpbGUtY29uZmlnLXBrZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImMxMWFtelwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jb2ZmZWVzY3JpcHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNvbGxlY3Rpb24ranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jb2xsZWN0aW9uLmRvYytqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNvbGxlY3Rpb24ubmV4dCtqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNvbW1lcmNlLWJhdHRlbGxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jb21tb25zcGFjZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNzcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jb250YWN0LmNtc2dcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjZGJjbXNnXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNvc21vY2FsbGVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY21jXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNyaWNrLmNsaWNrZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjbGt4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNyaWNrLmNsaWNrZXIua2V5Ym9hcmRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjbGtrXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNyaWNrLmNsaWNrZXIucGFsZXR0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNsa3BcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY3JpY2suY2xpY2tlci50ZW1wbGF0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNsa3RcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY3JpY2suY2xpY2tlci53b3JkYmFua1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNsa3dcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY3JpdGljYWx0b29scy53YnMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid2JzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmN0Yy1wb3NtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBtbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jdGN0LndzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY3Vwcy1wZGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmN1cHMtcG9zdHNjcmlwdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY3Vwcy1wcGRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwcGRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY3Vwcy1yYXN0ZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmN1cHMtcmF3XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jdXJsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jdXJsLmNhclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2FyXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmN1cmwucGN1cmxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBjdXJsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmN5YW4uZGVhbi5yb290K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY3liYW5rXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kYXJ0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkYXJ0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRhdGEtdmlzaW9uLnJkelwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJkelwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kZWJpYW4uYmluYXJ5LXBhY2thZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRlY2UuZGF0YVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInV2ZlwiLFwidXZ2ZlwiLFwidXZkXCIsXCJ1dnZkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRlY2UudHRtbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ1dnRcIixcInV2dnRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZGVjZS51bnNwZWNpZmllZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInV2eFwiLFwidXZ2eFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kZWNlLnppcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInV2elwiLFwidXZ2elwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kZW5vdm8uZmNzZWxheW91dC1saW5rXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZmVfbGF1bmNoXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRlc211bWUtbW92aWVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRpci1iaS5wbGF0ZS1kbC1ub3N1ZmZpeFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZG0uZGVsZWdhdGlvbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRuYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRuYVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kb2N1bWVudCtqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRvbGJ5Lm1scFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWxwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRvbGJ5Lm1vYmlsZS4xXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kb2xieS5tb2JpbGUuMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZG9yZW1pci5zY29yZWNsb3VkLWJpbmFyeS1kb2N1bWVudFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHBncmFwaFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRwZ1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kcmVhbWZhY3RvcnlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkZmFjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRzLWtleXBvaW50XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJrcHh4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmR0Zy5sb2NhbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHRnLmxvY2FsLmZsYXNoXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kdGcubG9jYWwuaHRtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLmFpdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFpdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kdmIuZHZialwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLmVzZ2NvbnRhaW5lclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLmlwZGNkZnRub3RpZmFjY2Vzc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLmlwZGNlc2dhY2Nlc3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmR2Yi5pcGRjZXNnYWNjZXNzMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLmlwZGNlc2dwZGRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmR2Yi5pcGRjcm9hbWluZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLmlwdHYuYWxmZWMtYmFzZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLmlwdHYuYWxmZWMtZW5oYW5jZW1lbnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmR2Yi5ub3RpZi1hZ2dyZWdhdGUtcm9vdCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmR2Yi5ub3RpZi1jb250YWluZXIreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kdmIubm90aWYtZ2VuZXJpYyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmR2Yi5ub3RpZi1pYS1tc2dsaXN0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLm5vdGlmLWlhLXJlZ2lzdHJhdGlvbi1yZXF1ZXN0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLm5vdGlmLWlhLXJlZ2lzdHJhdGlvbi1yZXNwb25zZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmR2Yi5ub3RpZi1pbml0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLnBmclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLnNlcnZpY2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzdmNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHhyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5keW5hZ2VvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZ2VvXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmR6clwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZWFzeWthcmFva2UuY2RnZG93bmxvYWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmVjZGlzLXVwZGF0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZWNvd2luLmNoYXJ0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWFnXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmVjb3dpbi5maWxlcmVxdWVzdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZWNvd2luLmZpbGV1cGRhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmVjb3dpbi5zZXJpZXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmVjb3dpbi5zZXJpZXNyZXF1ZXN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lY293aW4uc2VyaWVzdXBkYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lbWNsaWVudC5hY2Nlc3NyZXF1ZXN0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZW5saXZlblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm5tbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lbnBoYXNlLmVudm95XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lcHJpbnRzLmRhdGEreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lcHNvbi5lc2ZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJlc2ZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZXBzb24ubXNmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXNmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmVwc29uLnF1aWNrYW5pbWVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJxYW1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZXBzb24uc2FsdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNsdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lcHNvbi5zc2ZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzc2ZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZXJpY3Nzb24ucXVpY2tjYWxsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lc3ppZ25vMyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJlczNcIixcImV0M1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLmFvYyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kuYXNpYy1lK3ppcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZXRzaS5hc2ljLXMremlwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLmN1Zyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kuaXB0dmNvbW1hbmQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLmlwdHZkaXNjb3ZlcnkreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLmlwdHZwcm9maWxlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZXRzaS5pcHR2c2FkLWJjK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZXRzaS5pcHR2c2FkLWNvZCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kuaXB0dnNhZC1ucHZyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZXRzaS5pcHR2c2VydmljZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kuaXB0dnN5bmMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLmlwdHZ1ZXByb2ZpbGUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLm1jaWQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLm1oZWc1XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLm92ZXJsb2FkLWNvbnRyb2wtcG9saWN5LWRhdGFzZXQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLnBzdG4reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLnNjaSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kuc2ltc2VydnMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLnRpbWVzdGFtcC10b2tlblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZXRzaS50c2wreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLnRzbC5kZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV1ZG9yYS5kYXRhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lenBpeC1hbGJ1bVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImV6MlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lenBpeC1wYWNrYWdlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZXozXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmYtc2VjdXJlLm1vYmlsZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZmFzdGNvcHktZGlzay1pbWFnZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZmRmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZmRmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZkc24ubXNlZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtc2VlZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mZHNuLnNlZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzZWVkXCIsXCJkYXRhbGVzc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mZnNuc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZmludHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZsb2dyYXBoaXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJncGhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZmx1eHRpbWUuY2xpcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImZ0Y1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mb250LWZvbnRmb3JnZS1zZmRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZyYW1lbWFrZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmbVwiLFwiZnJhbWVcIixcIm1ha2VyXCIsXCJib29rXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZyb2dhbnMuZm5jXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZm5jXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZyb2dhbnMubHRmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibHRmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZzYy53ZWJsYXVuY2hcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmc2NcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZnVqaXRzdS5vYXN5c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9hc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mdWppdHN1Lm9hc3lzMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9hMlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mdWppdHN1Lm9hc3lzM1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9hM1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mdWppdHN1Lm9hc3lzZ3BcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmZzVcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZnVqaXRzdS5vYXN5c3Byc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImJoMlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mdWppeGVyb3guYXJ0LWV4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mdWppeGVyb3guYXJ0NFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZnVqaXhlcm94LmRkZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRkZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mdWppeGVyb3guZG9jdXdvcmtzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieGR3XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZ1aml4ZXJveC5kb2N1d29ya3MuYmluZGVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieGJkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZ1aml4ZXJveC5kb2N1d29ya3MuY29udGFpbmVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mdWppeGVyb3guaGJwbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZnV0LW1pc25ldFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZnV6enlzaGVldFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImZ6c1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5nZW5vbWF0aXgudHV4ZWRvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widHhkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdlbytqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdlb2N1YmUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5nZW9nZWJyYS5maWxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZ2diXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdlb2dlYnJhLnRvb2xcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnZ3RcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ2VvbWV0cnktZXhwbG9yZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnZXhcIixcImdyZVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5nZW9uZXh0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZ3h0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdlb3BsYW5cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnMndcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ2Vvc3BhY2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnM3dcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ2VyYmVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5nbG9iYWxwbGF0Zm9ybS5jYXJkLWNvbnRlbnQtbWd0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5nbG9iYWxwbGF0Zm9ybS5jYXJkLWNvbnRlbnQtbWd0LXJlc3BvbnNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5nbXhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnbXhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWVhcnRoLmttbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImttbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5nb29nbGUtZWFydGgua216XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wia216XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdvdi5zay5lLWZvcm0reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5nb3Yuc2suZS1mb3JtK3ppcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ292LnNrLnhtbGRhdGFjb250YWluZXIreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ncmFmZXFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJncWZcIixcImdxc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ncmlkbXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdyb292ZS1hY2NvdW50XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZ2FjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdyb292ZS1oZWxwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZ2hmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdyb292ZS1pZGVudGl0eS1tZXNzYWdlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZ2ltXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdyb292ZS1pbmplY3RvclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImdydlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ncm9vdmUtdG9vbC1tZXNzYWdlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZ3RtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdyb292ZS10b29sLXRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widHBsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdyb292ZS12Y2FyZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInZjZ1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5oYWwranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5oYWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaGFsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmhhbmRoZWxkLWVudGVydGFpbm1lbnQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiem1tXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmhiY2lcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJoYmNpXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmhjbC1iaXJlcG9ydHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmhlcm9rdStqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmhoZS5sZXNzb24tcGxheWVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibGVzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmhwLWhwZ2xcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJocGdsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmhwLWhwaWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJocGlkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmhwLWhwc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImhwc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ocC1qbHl0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiamx0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmhwLXBjbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBjbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ocC1wY2x4bFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBjbHhsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmh0dHBob25lXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5oeWRyb3N0YXRpeC5zb2YtZGF0YVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNmZC1oZHN0eFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5oeXBlcmRyaXZlK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaHpuLTNkLWNyb3Nzd29yZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaWJtLmFmcGxpbmVkYXRhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pYm0uZWxlY3Ryb25pYy1tZWRpYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaWJtLm1pbmlwYXlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtcHlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaWJtLm1vZGNhcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFmcFwiLFwibGlzdGFmcFwiLFwibGlzdDM4MjBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaWJtLnJpZ2h0cy1tYW5hZ2VtZW50XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaXJtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmlibS5zZWN1cmUtY29udGFpbmVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2NcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaWNjcHJvZmlsZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImljY1wiLFwiaWNtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmllZWUuMTkwNVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaWdsb2FkZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJpZ2xcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaW1tZXJ2aXNpb24taXZwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaXZwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmltbWVydmlzaW9uLWl2dVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIml2dVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pbXMuaW1zY2N2MXAxXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pbXMuaW1zY2N2MXAyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pbXMuaW1zY2N2MXAzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pbXMubGlzLnYyLnJlc3VsdCtqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmltcy5sdGkudjIudG9vbGNvbnN1bWVycHJvZmlsZStqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmltcy5sdGkudjIudG9vbHByb3h5K2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaW1zLmx0aS52Mi50b29scHJveHkuaWQranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pbXMubHRpLnYyLnRvb2xzZXR0aW5ncytqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmltcy5sdGkudjIudG9vbHNldHRpbmdzLnNpbXBsZStqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmluZm9ybWVkY29udHJvbC5ybXMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pbmZvcm1peC12aXNpb25hcnlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmluZm90ZWNoLnByb2plY3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmluZm90ZWNoLnByb2plY3QreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pbm5vcGF0aC53YW1wLm5vdGlmaWNhdGlvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaW5zb3JzLmlnbVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImlnbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pbnRlcmNvbi5mb3JtbmV0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieHB3XCIsXCJ4cHhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaW50ZXJnZW9cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJpMmdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaW50ZXJ0cnVzdC5kaWdpYm94XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pbnRlcnRydXN0Lm5uY3BcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmludHUucWJvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicWJvXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmludHUucWZ4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicWZ4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmlwdGMuZzIuY2F0YWxvZ2l0ZW0reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pcHRjLmcyLmNvbmNlcHRpdGVtK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaXB0Yy5nMi5rbm93bGVkZ2VpdGVtK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaXB0Yy5nMi5uZXdzaXRlbSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmlwdGMuZzIubmV3c21lc3NhZ2UreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pcHRjLmcyLnBhY2thZ2VpdGVtK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaXB0Yy5nMi5wbGFubmluZ2l0ZW0reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pcHVucGx1Z2dlZC5yY3Byb2ZpbGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJyY3Byb2ZpbGVcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaXJlcG9zaXRvcnkucGFja2FnZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJpcnBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaXMteHByXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieHByXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmlzYWMuZmNzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZmNzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmphbVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImphbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5qYXBhbm5ldC1kaXJlY3Rvcnktc2VydmljZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuamFwYW5uZXQtanBuc3RvcmUtd2FrZXVwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5qYXBhbm5ldC1wYXltZW50LXdha2V1cFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuamFwYW5uZXQtcmVnaXN0cmF0aW9uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5qYXBhbm5ldC1yZWdpc3RyYXRpb24td2FrZXVwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5qYXBhbm5ldC1zZXRzdG9yZS13YWtldXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmphcGFubmV0LXZlcmlmaWNhdGlvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuamFwYW5uZXQtdmVyaWZpY2F0aW9uLXdha2V1cFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuamNwLmphdmFtZS5taWRsZXQtcm1zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicm1zXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmppc3BcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJqaXNwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmpvb3N0LmpvZGEtYXJjaGl2ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImpvZGFcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuanNrLmlzZG4tbmduXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5rYWhvb3R6XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wia3R6XCIsXCJrdHJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQua2RlLmthcmJvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImthcmJvblwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5rZGUua2NoYXJ0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2hydFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5rZGUua2Zvcm11bGFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJrZm9cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQua2RlLmtpdmlvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZmx3XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmtkZS5rb250b3VyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wia29uXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmtkZS5rcHJlc2VudGVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wia3ByXCIsXCJrcHRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQua2RlLmtzcHJlYWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJrc3BcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQua2RlLmt3b3JkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wia3dkXCIsXCJrd3RcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQua2VuYW1lYWFwcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImh0a2VcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQua2lkc3BpcmF0aW9uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wia2lhXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmtpbmFyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wia25lXCIsXCJrbnBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQua29hblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNrcFwiLFwic2tkXCIsXCJza3RcIixcInNrbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5rb2Rhay1kZXNjcmlwdG9yXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3NlXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmxhcy5sYXMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibGFzeG1sXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmxpYmVydHktcmVxdWVzdCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmxsYW1hZ3JhcGhpY3MubGlmZS1iYWxhbmNlLmRlc2t0b3BcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJsYmRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubGxhbWFncmFwaGljcy5saWZlLWJhbGFuY2UuZXhjaGFuZ2UreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibGJlXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmxvdHVzLTEtMi0zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiMTIzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmxvdHVzLWFwcHJvYWNoXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXByXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmxvdHVzLWZyZWVsYW5jZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInByZVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5sb3R1cy1ub3Rlc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm5zZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5sb3R1cy1vcmdhbml6ZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvcmdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubG90dXMtc2NyZWVuY2FtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2NtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmxvdHVzLXdvcmRwcm9cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJsd3BcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWFjcG9ydHMucG9ydHBrZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBvcnRwa2dcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWFybGluLmRybS5hY3Rpb250b2tlbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1hcmxpbi5kcm0uY29uZnRva2VuK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWFybGluLmRybS5saWNlbnNlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWFybGluLmRybS5tZGNmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tYXNvbitqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1heG1pbmQubWF4bWluZC1kYlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWNkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWNkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1lZGNhbGNkYXRhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWMxXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1lZGlhc3RhdGlvbi5jZGtleVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNka2V5XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1lcmlkaWFuLXNsaW5nc2hvdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWZlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm13ZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tZm1wXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWZtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1pY3JvK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWljcm9ncmFmeC5mbG9cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmbG9cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWljcm9ncmFmeC5pZ3hcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJpZ3hcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWljcm9zb2Z0LnBvcnRhYmxlLWV4ZWN1dGFibGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1pZWxlK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWlmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWlmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1pbmlzb2Z0LWhwMzAwMC1zYXZlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5taXRzdWJpc2hpLm1pc3R5LWd1YXJkLnRydXN0d2ViXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tb2JpdXMuZGFmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZGFmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1vYml1cy5kaXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkaXNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubW9iaXVzLm1ia1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1ia1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tb2JpdXMubXF5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXF5XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1vYml1cy5tc2xcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtc2xcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubW9iaXVzLnBsY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBsY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tb2JpdXMudHhmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widHhmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1vcGh1bi5hcHBsaWNhdGlvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1wblwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tb3BodW4uY2VydGlmaWNhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtcGNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubW90b3JvbGEuZmxleHN1aXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tb3Rvcm9sYS5mbGV4c3VpdGUuYWRzaVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubW90b3JvbGEuZmxleHN1aXRlLmZpc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubW90b3JvbGEuZmxleHN1aXRlLmdvdGFwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tb3Rvcm9sYS5mbGV4c3VpdGUua21yXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tb3Rvcm9sYS5mbGV4c3VpdGUudHRjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tb3Rvcm9sYS5mbGV4c3VpdGUud2VtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tb3Rvcm9sYS5pcHJtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tb3ppbGxhLnh1bCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInh1bFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy0zbWZkb2N1bWVudFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtYXJ0Z2FscnlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjaWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtYXNmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1jYWItY29tcHJlc3NlZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNhYlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1jb2xvci5pY2Nwcm9maWxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLWV4Y2VsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieGxzXCIsXCJ4bG1cIixcInhsYVwiLFwieGxjXCIsXCJ4bHRcIixcInhsd1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1leGNlbC5hZGRpbi5tYWNyb2VuYWJsZWQuMTJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4bGFtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLWV4Y2VsLnNoZWV0LmJpbmFyeS5tYWNyb2VuYWJsZWQuMTJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4bHNiXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLWV4Y2VsLnNoZWV0Lm1hY3JvZW5hYmxlZC4xMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhsc21cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtZXhjZWwudGVtcGxhdGUubWFjcm9lbmFibGVkLjEyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieGx0bVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1mb250b2JqZWN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJlb3RcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtaHRtbGhlbHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjaG1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtaW1zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaW1zXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLWxybVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImxybVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1vZmZpY2UuYWN0aXZleCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLW9mZmljZXRoZW1lXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widGhteFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1vcGVudHlwZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXBhY2thZ2Uub2JmdXNjYXRlZC1vcGVudHlwZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1wa2kuc2VjY2F0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjYXRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtcGtpLnN0bFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3RsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXBsYXlyZWFkeS5pbml0aWF0b3IreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1wb3dlcnBvaW50XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHB0XCIsXCJwcHNcIixcInBvdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1wb3dlcnBvaW50LmFkZGluLm1hY3JvZW5hYmxlZC4xMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBwYW1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtcG93ZXJwb2ludC5wcmVzZW50YXRpb24ubWFjcm9lbmFibGVkLjEyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHB0bVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1wb3dlcnBvaW50LnNsaWRlLm1hY3JvZW5hYmxlZC4xMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNsZG1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtcG93ZXJwb2ludC5zbGlkZXNob3cubWFjcm9lbmFibGVkLjEyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHBzbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1wb3dlcnBvaW50LnRlbXBsYXRlLm1hY3JvZW5hYmxlZC4xMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBvdG1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtcHJpbnRpbmcucHJpbnR0aWNrZXQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXByb2plY3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtcHBcIixcIm1wdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy10bmVmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy13aW5kb3dzLnByaW50ZXJwYWlyaW5nXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy13bWRybS5saWMtY2hsZy1yZXFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXdtZHJtLmxpYy1yZXNwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy13bWRybS5tZXRlci1jaGxnLXJlcVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtd21kcm0ubWV0ZXItcmVzcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtd29yZC5kb2N1bWVudC5tYWNyb2VuYWJsZWQuMTJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkb2NtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXdvcmQudGVtcGxhdGUubWFjcm9lbmFibGVkLjEyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZG90bVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy13b3Jrc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndwc1wiLFwid2tzXCIsXCJ3Y21cIixcIndkYlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy13cGxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3cGxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMteHBzZG9jdW1lbnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4cHNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXNhLWRpc2staW1hZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zZXFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtc2VxXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zaWduXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tdWx0aWFkLmNyZWF0b3JcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm11bHRpYWQuY3JlYXRvci5jaWZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm11c2ljLW5pZmZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm11c2ljaWFuXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXVzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm11dmVlLnN0eWxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXN0eVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5teW5mY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRhZ2xldFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5uY2QuY29udHJvbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubmNkLnJlZmVyZW5jZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubmVydmFuYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubmV0ZnB4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5uZXVyb2xhbmd1YWdlLm5sdVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm5sdVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5uaW50ZW5kby5uaXRyby5yb21cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5pbnRlbmRvLnNuZXMucm9tXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5uaXRmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibnRmXCIsXCJuaXRmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5vYmxlbmV0LWRpcmVjdG9yeVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm5uZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ub2JsZW5ldC1zZWFsZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJubnNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubm9ibGVuZXQtd2ViXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibm53XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5va2lhLmNhdGFsb2dzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ub2tpYS5jb25tbCt3YnhtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubm9raWEuY29ubWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ub2tpYS5pcHR2LmNvbmZpZyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5va2lhLmlzZHMtcmFkaW8tcHJlc2V0c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubm9raWEubGFuZG1hcmsrd2J4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5va2lhLmxhbmRtYXJrK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubm9raWEubGFuZG1hcmtjb2xsZWN0aW9uK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubm9raWEubi1nYWdlLmFjK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubm9raWEubi1nYWdlLmRhdGFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJuZ2RhdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ub2tpYS5uLWdhZ2Uuc3ltYmlhbi5pbnN0YWxsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibi1nYWdlXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5va2lhLm5jZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubm9raWEucGNkK3dieG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ub2tpYS5wY2QreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ub2tpYS5yYWRpby1wcmVzZXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJycHN0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5va2lhLnJhZGlvLXByZXNldHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJycHNzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5vdmFkaWdtLmVkbVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImVkbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ub3ZhZGlnbS5lZHhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJlZHhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubm92YWRpZ20uZXh0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZXh0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm50dC1sb2NhbC5jb250ZW50LXNoYXJlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5udHQtbG9jYWwuZmlsZS10cmFuc2ZlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubnR0LWxvY2FsLm9nd19yZW1vdGUtYWNjZXNzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5udHQtbG9jYWwuc2lwLXRhX3JlbW90ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubnR0LWxvY2FsLnNpcC10YV90Y3Bfc3RyZWFtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQuY2hhcnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvZGNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2FzaXMub3BlbmRvY3VtZW50LmNoYXJ0LXRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib3RjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC5kYXRhYmFzZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9kYlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQuZm9ybXVsYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9kZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQuZm9ybXVsYS10ZW1wbGF0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9kZnRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2FzaXMub3BlbmRvY3VtZW50LmdyYXBoaWNzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib2RnXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC5ncmFwaGljcy10ZW1wbGF0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm90Z1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQuaW1hZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvZGlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2FzaXMub3BlbmRvY3VtZW50LmltYWdlLXRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib3RpXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC5wcmVzZW50YXRpb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvZHBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2FzaXMub3BlbmRvY3VtZW50LnByZXNlbnRhdGlvbi10ZW1wbGF0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm90cFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQuc3ByZWFkc2hlZXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvZHNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2FzaXMub3BlbmRvY3VtZW50LnNwcmVhZHNoZWV0LXRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib3RzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC50ZXh0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib2R0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC50ZXh0LW1hc3RlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9kbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQudGV4dC10ZW1wbGF0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm90dFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQudGV4dC13ZWJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvdGhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2JuXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vZnRuLmwxMG4ranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vaXBmLmNvbnRlbnRhY2Nlc3Nkb3dubG9hZCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9pcGYuY29udGVudGFjY2Vzc3N0cmVhbWluZyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9pcGYuY3NwZy1oZXhiaW5hcnlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9pcGYuZGFlLnN2Zyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9pcGYuZGFlLnhodG1sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2lwZi5taXBwdmNvbnRyb2xtZXNzYWdlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2lwZi5wYWUuZ2VtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vaXBmLnNwZGlzY292ZXJ5K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2lwZi5zcGRsaXN0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2lwZi51ZXByb2ZpbGUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vaXBmLnVzZXJwcm9maWxlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2xwYy1zdWdhclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhvXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS1zY3dzLWNvbmZpZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLXNjd3MtaHR0cC1yZXF1ZXN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEtc2N3cy1odHRwLXJlc3BvbnNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuYmNhc3QuYXNzb2NpYXRlZC1wcm9jZWR1cmUtcGFyYW1ldGVyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmJjYXN0LmRybS10cmlnZ2VyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmJjYXN0LmltZCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5iY2FzdC5sdGttXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuYmNhc3Qubm90aWZpY2F0aW9uK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmJjYXN0LnByb3Zpc2lvbmluZ3RyaWdnZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5iY2FzdC5zZ2Jvb3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5iY2FzdC5zZ2RkK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmJjYXN0LnNnZHVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5iY2FzdC5zaW1wbGUtc3ltYm9sLWNvbnRhaW5lclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmJjYXN0LnNtYXJ0Y2FyZC10cmlnZ2VyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmJjYXN0LnNwcm92K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmJjYXN0LnN0a21cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5jYWItYWRkcmVzcy1ib29rK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmNhYi1mZWF0dXJlLWhhbmRsZXIreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuY2FiLXBjYyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5jYWItc3Vicy1pbnZpdGUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuY2FiLXVzZXItcHJlZnMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuZGNkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuZGNkY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmRkMit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkZDJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmRybS5yaXNkK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmdyb3VwLXVzYWdlLWxpc3QreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEucGFsK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLnBvYy5kZXRhaWxlZC1wcm9ncmVzcy1yZXBvcnQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEucG9jLmZpbmFsLXJlcG9ydCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5wb2MuZ3JvdXBzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLnBvYy5pbnZvY2F0aW9uLWRlc2NyaXB0b3IreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEucG9jLm9wdGltaXplZC1wcm9ncmVzcy1yZXBvcnQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEucHVzaFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLnNjaWRtLm1lc3NhZ2VzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLnhjYXAtZGlyZWN0b3J5K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hZHMtZW1haWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWFkcy1maWxlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hZHMtZm9sZGVyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hbG9jLXN1cGwtaW5pdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbmV5ZS5vZWJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW5vZmZpY2VvcmcuZXh0ZW5zaW9uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJveHRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuY3VzdG9tLXByb3BlcnRpZXMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5jdXN0b214bWxwcm9wZXJ0aWVzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuZHJhd2luZyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LmRyYXdpbmdtbC5jaGFydCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LmRyYXdpbmdtbC5jaGFydHNoYXBlcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LmRyYXdpbmdtbC5kaWFncmFtY29sb3JzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuZHJhd2luZ21sLmRpYWdyYW1kYXRhK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuZHJhd2luZ21sLmRpYWdyYW1sYXlvdXQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5kcmF3aW5nbWwuZGlhZ3JhbXN0eWxlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuZXh0ZW5kZWQtcHJvcGVydGllcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLXRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5wcmVzZW50YXRpb25tbC5jb21tZW50YXV0aG9ycyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLmNvbW1lbnRzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwuaGFuZG91dG1hc3Rlcit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLm5vdGVzbWFzdGVyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwubm90ZXNzbGlkZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLnByZXNlbnRhdGlvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBwdHhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwucHJlc2VudGF0aW9uLm1haW4reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5wcmVzZW50YXRpb25tbC5wcmVzcHJvcHMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5wcmVzZW50YXRpb25tbC5zbGlkZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNsZHhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwuc2xpZGUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5wcmVzZW50YXRpb25tbC5zbGlkZWxheW91dCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLnNsaWRlbWFzdGVyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwuc2xpZGVzaG93XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHBzeFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5wcmVzZW50YXRpb25tbC5zbGlkZXNob3cubWFpbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLnNsaWRldXBkYXRlaW5mbyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLnRhYmxlc3R5bGVzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwudGFncyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLnRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwb3R4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLnRlbXBsYXRlLm1haW4reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5wcmVzZW50YXRpb25tbC52aWV3cHJvcHMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLXRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLmNhbGNjaGFpbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuY2hhcnRzaGVldCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuY29tbWVudHMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLmNvbm5lY3Rpb25zK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC5kaWFsb2dzaGVldCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuZXh0ZXJuYWxsaW5rK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC5waXZvdGNhY2hlZGVmaW5pdGlvbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwucGl2b3RjYWNoZXJlY29yZHMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnBpdm90dGFibGUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnF1ZXJ5dGFibGUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnJldmlzaW9uaGVhZGVycyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwucmV2aXNpb25sb2creG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnNoYXJlZHN0cmluZ3MreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnNoZWV0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieGxzeFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnNoZWV0Lm1haW4reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnNoZWV0bWV0YWRhdGEreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnN0eWxlcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwudGFibGUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnRhYmxlc2luZ2xlY2VsbHMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4bHR4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwudGVtcGxhdGUubWFpbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwudXNlcm5hbWVzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC52b2xhdGlsZWRlcGVuZGVuY2llcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwud29ya3NoZWV0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQudGhlbWUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC50aGVtZW92ZXJyaWRlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQudm1sZHJhd2luZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQud29yZHByb2Nlc3NpbmdtbC10ZW1wbGF0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQud29yZHByb2Nlc3NpbmdtbC5jb21tZW50cyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LndvcmRwcm9jZXNzaW5nbWwuZG9jdW1lbnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkb2N4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LndvcmRwcm9jZXNzaW5nbWwuZG9jdW1lbnQuZ2xvc3NhcnkreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC53b3JkcHJvY2Vzc2luZ21sLmRvY3VtZW50Lm1haW4reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC53b3JkcHJvY2Vzc2luZ21sLmVuZG5vdGVzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQud29yZHByb2Nlc3NpbmdtbC5mb250dGFibGUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC53b3JkcHJvY2Vzc2luZ21sLmZvb3Rlcit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LndvcmRwcm9jZXNzaW5nbWwuZm9vdG5vdGVzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQud29yZHByb2Nlc3NpbmdtbC5udW1iZXJpbmcreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC53b3JkcHJvY2Vzc2luZ21sLnNldHRpbmdzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQud29yZHByb2Nlc3NpbmdtbC5zdHlsZXMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC53b3JkcHJvY2Vzc2luZ21sLnRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkb3R4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LndvcmRwcm9jZXNzaW5nbWwudGVtcGxhdGUubWFpbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LndvcmRwcm9jZXNzaW5nbWwud2Vic2V0dGluZ3MreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1wYWNrYWdlLmNvcmUtcHJvcGVydGllcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLXBhY2thZ2UuZGlnaXRhbC1zaWduYXR1cmUteG1sc2lnbmF0dXJlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtcGFja2FnZS5yZWxhdGlvbnNoaXBzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3JhY2xlLnJlc291cmNlK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3JhbmdlLmluZGF0YVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3NhLm5ldGRlcGxveVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3NnZW8ubWFwZ3VpZGUucGFja2FnZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1ncFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vc2dpLmJ1bmRsZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3NnaS5kcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9zZ2kuc3Vic3lzdGVtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZXNhXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm90cHMuY3Qta2lwK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucGFsbVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBkYlwiLFwicHFhXCIsXCJvcHJjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnBhbm9wbHlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnBhb3MreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5wYW9zLnhtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5wYXdhYWZpbGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwYXdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucGNvc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucGcuZm9ybWF0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3RyXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnBnLm9zYXNsaVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImVpNlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5waWFjY2Vzcy5hcHBsaWNhdGlvbi1saWNlbmNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5waWNzZWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJlZmlmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnBtaS53aWRnZXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3Z1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5wb2MuZ3JvdXAtYWR2ZXJ0aXNlbWVudCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnBvY2tldGxlYXJuXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicGxmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnBvd2VyYnVpbGRlcjZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwYmRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucG93ZXJidWlsZGVyNi1zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5wb3dlcmJ1aWxkZXI3XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5wb3dlcmJ1aWxkZXI3LXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnBvd2VyYnVpbGRlcjc1XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5wb3dlcmJ1aWxkZXI3NS1zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5wcmVtaW5ldFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucHJldmlld3N5c3RlbXMuYm94XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYm94XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnByb3RldXMubWFnYXppbmVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtZ3pcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucHVibGlzaGFyZS1kZWx0YS10cmVlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicXBzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnB2aS5wdGlkMVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInB0aWRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucHdnLW11bHRpcGxleGVkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5wd2cteGh0bWwtcHJpbnQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5xdWFsY29tbS5icmV3LWFwcC1yZXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnF1YXJrLnF1YXJreHByZXNzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicXhkXCIsXCJxeHRcIixcInF3ZFwiLFwicXd0XCIsXCJxeGxcIixcInF4YlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5xdW9iamVjdC1xdW94ZG9jdW1lbnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJhZGlzeXMubW9tbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJhZGlzeXMubXNtbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJhZGlzeXMubXNtbC1hdWRpdCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJhZGlzeXMubXNtbC1hdWRpdC1jb25mK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmFkaXN5cy5tc21sLWF1ZGl0LWNvbm4reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5yYWRpc3lzLm1zbWwtYXVkaXQtZGlhbG9nK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmFkaXN5cy5tc21sLWF1ZGl0LXN0cmVhbSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJhZGlzeXMubXNtbC1jb25mK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmFkaXN5cy5tc21sLWRpYWxvZyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJhZGlzeXMubXNtbC1kaWFsb2ctYmFzZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJhZGlzeXMubXNtbC1kaWFsb2ctZmF4LWRldGVjdCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJhZGlzeXMubXNtbC1kaWFsb2ctZmF4LXNlbmRyZWN2K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmFkaXN5cy5tc21sLWRpYWxvZy1ncm91cCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJhZGlzeXMubXNtbC1kaWFsb2ctc3BlZWNoK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmFkaXN5cy5tc21sLWRpYWxvZy10cmFuc2Zvcm0reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5yYWluc3Rvci5kYXRhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5yYXBpZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmVhbHZuYy5iZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJiZWRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmVjb3JkYXJlLm11c2ljeG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXhsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJlY29yZGFyZS5tdXNpY3htbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtdXNpY3htbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5yZW5sZWFybi5ybHByaW50XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5yaWcuY3J5cHRvbm90ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNyeXB0b25vdGVcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmltLmNvZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY29kXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJuLXJlYWxtZWRpYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicm1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucm4tcmVhbG1lZGlhLXZiclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicm12YlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5yb3V0ZTY2Lmxpbms2Nit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJsaW5rNjZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucnMtMjc0eFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucnVja3VzLmRvd25sb2FkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zM3Ntc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2FpbGluZ3RyYWNrZXIudHJhY2tcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zYm0uY2lkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zYm0ubWlkMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2NyaWJ1c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2VhbGVkLjNkZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2VhbGVkLmNzZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2VhbGVkLmRvY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2VhbGVkLmVtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2VhbGVkLm1odFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2VhbGVkLm5ldFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2VhbGVkLnBwdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2VhbGVkLnRpZmZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNlYWxlZC54bHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNlYWxlZG1lZGlhLnNvZnRzZWFsLmh0bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNlYWxlZG1lZGlhLnNvZnRzZWFsLnBkZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2VlbWFpbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNlZVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zZW1hXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2VtYVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zZW1kXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2VtZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zZW1mXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2VtZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zaGFuYS5pbmZvcm1lZC5mb3JtZGF0YVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImlmbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zaGFuYS5pbmZvcm1lZC5mb3JtdGVtcGxhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJpdHBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2hhbmEuaW5mb3JtZWQuaW50ZXJjaGFuZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJpaWZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2hhbmEuaW5mb3JtZWQucGFja2FnZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImlwa1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zaW10ZWNoLW1pbmRtYXBwZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0d2RcIixcInR3ZHNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2lyZW4ranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zbWFmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibW1mXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNtYXJ0Lm5vdGVib29rXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zbWFydC50ZWFjaGVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widGVhY2hlclwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zb2Z0d2FyZTYwMi5maWxsZXIuZm9ybSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNvZnR3YXJlNjAyLmZpbGxlci5mb3JtLXhtbC16aXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNvbGVudC5zZGttK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNka21cIixcInNka2RcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3BvdGZpcmUuZHhwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZHhwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNwb3RmaXJlLnNmc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNmc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zc3MtY29kXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zc3MtZHRmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zc3MtbnRmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdGFyZGl2aXNpb24uY2FsY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2RjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN0YXJkaXZpc2lvbi5kcmF3XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzZGFcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3RhcmRpdmlzaW9uLmltcHJlc3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNkZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdGFyZGl2aXNpb24ubWF0aFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic21mXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN0YXJkaXZpc2lvbi53cml0ZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNkd1wiLFwidm9yXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN0YXJkaXZpc2lvbi53cml0ZXItZ2xvYmFsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzZ2xcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3RlcG1hbmlhLnBhY2thZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzbXppcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdGVwbWFuaWEuc3RlcGNoYXJ0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic21cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3RyZWV0LXN0cmVhbVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3VuLndhZGwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdW4ueG1sLmNhbGNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN4Y1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdW4ueG1sLmNhbGMudGVtcGxhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN0Y1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdW4ueG1sLmRyYXdcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN4ZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdW4ueG1sLmRyYXcudGVtcGxhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN0ZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdW4ueG1sLmltcHJlc3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN4aVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdW4ueG1sLmltcHJlc3MudGVtcGxhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN0aVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdW4ueG1sLm1hdGhcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN4bVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdW4ueG1sLndyaXRlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3h3XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN1bi54bWwud3JpdGVyLmdsb2JhbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3hnXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN1bi54bWwud3JpdGVyLnRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzdHdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3VzLWNhbGVuZGFyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3VzXCIsXCJzdXNwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN2ZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN2ZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zd2lmdHZpZXctaWNzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zeW1iaWFuLmluc3RhbGxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNpc1wiLFwic2lzeFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zeW5jbWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieHNtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN5bmNtbC5kbSt3YnhtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImJkbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zeW5jbWwuZG0reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieGRtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN5bmNtbC5kbS5ub3RpZmljYXRpb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN5bmNtbC5kbWRkZit3YnhtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3luY21sLmRtZGRmK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3luY21sLmRtdG5kcyt3YnhtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3luY21sLmRtdG5kcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN5bmNtbC5kcy5ub3RpZmljYXRpb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnRhby5pbnRlbnQtbW9kdWxlLWFyY2hpdmVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0YW9cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudGNwZHVtcC5wY2FwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicGNhcFwiLFwiY2FwXCIsXCJkbXBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudG1kLm1lZGlhZmxleC5hcGkreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC50bW9iaWxlLWxpdmV0dlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRtb1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC50cmlkLnRwdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRwdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC50cmlzY2FwZS5teHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJteHNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudHJ1ZWFwcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRyYVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC50cnVlZG9jXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC51Ymlzb2Z0LndlYnBsYXllclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudWZkbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInVmZFwiLFwidWZkbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC51aXEudGhlbWVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ1dHpcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudW1hamluXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widW1qXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnVuaXR5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widW5pdHl3ZWJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudW9tbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ1b21sXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnVwbGFuZXQuYWxlcnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnVwbGFuZXQuYWxlcnQtd2J4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnVwbGFuZXQuYmVhcmVyLWNob2ljZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudXBsYW5ldC5iZWFyZXItY2hvaWNlLXdieG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC51cGxhbmV0LmNhY2hlb3BcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnVwbGFuZXQuY2FjaGVvcC13YnhtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudXBsYW5ldC5jaGFubmVsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC51cGxhbmV0LmNoYW5uZWwtd2J4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnVwbGFuZXQubGlzdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudXBsYW5ldC5saXN0LXdieG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC51cGxhbmV0Lmxpc3RjbWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnVwbGFuZXQubGlzdGNtZC13YnhtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudXBsYW5ldC5zaWduYWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnZhbHZlLnNvdXJjZS5tYXRlcmlhbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudmN4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widmN4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnZkLXN0dWR5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC52ZWN0b3J3b3Jrc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudmVyaW1hdHJpeC52Y2FzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC52aWRzb2Z0LnZpZGNvbmZlcmVuY2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnZpc2lvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widnNkXCIsXCJ2c3RcIixcInZzc1wiLFwidnN3XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnZpc2lvbmFyeVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInZpc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC52aXZpZGVuY2Uuc2NyaXB0ZmlsZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudnNmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widnNmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndhcC5zaWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndhcC5zbGNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndhcC53YnhtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndieG1sXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndhcC53bWxjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid21sY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC53YXAud21sc2NyaXB0Y1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndtbHNjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndlYnR1cmJvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid3RiXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndmYS5wMnBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndmYS53c2NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndpbmRvd3MuZGV2aWNlcGFpcmluZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQud21jXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC53bWYuYm9vdHN0cmFwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC53b2xmcmFtLm1hdGhlbWF0aWNhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC53b2xmcmFtLm1hdGhlbWF0aWNhLnBhY2thZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndvbGZyYW0ucGxheWVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibmJwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndvcmRwZXJmZWN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid3BkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndxZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndxZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC53cnEtaHAzMDAwLWxhYmVsbGVkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC53dC5zdGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzdGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQud3YuY3NwK3dieG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC53di5jc3AreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC53di5zc3AreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC54YWNtbCtqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnhhcmFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4YXJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQueGZkbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhmZGxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQueGZkbC53ZWJmb3JtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC54bWkreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC54bXBpZS5jcGtnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC54bXBpZS5kcGtnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC54bXBpZS5wbGFuXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC54bXBpZS5wcGtnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC54bXBpZS54bGltXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC55YW1haGEuaHYtZGljXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaHZkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnlhbWFoYS5odi1zY3JpcHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJodnNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQueWFtYWhhLmh2LXZvaWNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaHZwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnlhbWFoYS5vcGVuc2NvcmVmb3JtYXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvc2ZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQueWFtYWhhLm9wZW5zY29yZWZvcm1hdC5vc2ZwdmcreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib3NmcHZnXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnlhbWFoYS5yZW1vdGUtc2V0dXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnlhbWFoYS5zbWFmLWF1ZGlvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2FmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnlhbWFoYS5zbWFmLXBocmFzZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNwZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC55YW1haGEudGhyb3VnaC1uZ25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnlhbWFoYS50dW5uZWwtdWRwZW5jYXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnlhb3dlbWVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnllbGxvd3JpdmVyLWN1c3RvbS1tZW51XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY21wXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnp1bFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInppclwiLFwiemlyelwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC56emF6ei5kZWNrK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInphelwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZvaWNleG1sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInZ4bWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92cS1ydGNweHJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vd2F0Y2hlcmluZm8reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3dob2lzcHAtcXVlcnlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vd2hvaXNwcC1yZXNwb25zZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi93aWRnZXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3Z3RcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi93aW5obHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImhscFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3dpdGFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vd29yZHBlcmZlY3Q1LjFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vd3NkbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3c2RsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vd3Nwb2xpY3kreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid3Nwb2xpY3lcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LTd6LWNvbXByZXNzZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIjd6XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1hYml3b3JkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhYndcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWFjZS1jb21wcmVzc2VkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhY2VcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWFtZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtYXBwbGUtZGlza2ltYWdlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkbWdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWF1dGhvcndhcmUtYmluXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhYWJcIixcIngzMlwiLFwidTMyXCIsXCJ2b3hcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWF1dGhvcndhcmUtbWFwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhYW1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWF1dGhvcndhcmUtc2VnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhYXNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWJjcGlvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJiY3Bpb1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtYmRvY1wiOiB7XG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImJkb2NcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWJpdHRvcnJlbnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRvcnJlbnRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWJsb3JiXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJibGJcIixcImJsb3JiXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1iemlwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJielwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtYnppcDJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImJ6MlwiLFwiYm96XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1jYnJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNiclwiLFwiY2JhXCIsXCJjYnRcIixcImNielwiLFwiY2I3XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1jZGxpbmtcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInZjZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtY2ZzLWNvbXByZXNzZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNmc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtY2hhdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2hhdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtY2hlc3MtcGduXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwZ25cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWNocm9tZS1leHRlbnNpb25cIjoge1xuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjcnhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWNvY29hXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcIm5naW54XCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNjb1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtY29tcHJlc3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWNvbmZlcmVuY2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm5zY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtY3Bpb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY3Bpb1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtY3NoXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjc2hcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWRlYlwiOiB7XG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2VcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWRlYmlhbi1wYWNrYWdlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkZWJcIixcInVkZWJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWRnYy1jb21wcmVzc2VkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkZ2NcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWRpcmVjdG9yXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkaXJcIixcImRjclwiLFwiZHhyXCIsXCJjc3RcIixcImNjdFwiLFwiY3h0XCIsXCJ3M2RcIixcImZnZFwiLFwic3dhXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1kb29tXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3YWRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWR0Ym5jeCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm5jeFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZHRib29rK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZHRiXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1kdGJyZXNvdXJjZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJlc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZHZpXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkdmlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWVudm95XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJldnlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWV2YVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZXZhXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1mb250LWJkZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYmRmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1mb250LWRvc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZm9udC1mcmFtZW1ha2VyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1mb250LWdob3N0c2NyaXB0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnc2ZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWZvbnQtbGliZ3J4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1mb250LWxpbnV4LXBzZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHNmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1mb250LW90ZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvdGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWZvbnQtcGNmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwY2ZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWZvbnQtc25mXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzbmZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWZvbnQtc3BlZWRvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1mb250LXN1bm9zLW5ld3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWZvbnQtdHRmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInR0ZlwiLFwidHRjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1mb250LXR5cGUxXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwZmFcIixcInBmYlwiLFwicGZtXCIsXCJhZm1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWZvbnQtdmZvbnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWZyZWVhcmNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFyY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZnV0dXJlc3BsYXNoXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzcGxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWdjYS1jb21wcmVzc2VkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnY2FcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWdsdWx4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ1bHhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWdudW1lcmljXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnbnVtZXJpY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZ3JhbXBzLXhtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZ3JhbXBzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1ndGFyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJndGFyXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1nemlwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1oZGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImhkZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtaHR0cGQtcGhwXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwaHBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWluc3RhbGwtaW5zdHJ1Y3Rpb25zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJpbnN0YWxsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1pc285NjYwLWltYWdlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJpc29cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWphdmEtYXJjaGl2ZS1kaWZmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcIm5naW54XCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImphcmRpZmZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWphdmEtam5scC1maWxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJqbmxwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1qYXZhc2NyaXB0XCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1sYXRleFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibGF0ZXhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWx1YS1ieXRlY29kZVwiOiB7XG4gICAgXCJleHRlbnNpb25zXCI6IFtcImx1YWNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWx6aC1jb21wcmVzc2VkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJsemhcIixcImxoYVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbWFrZXNlbGZcIjoge1xuICAgIFwic291cmNlXCI6IFwibmdpbnhcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicnVuXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1taWVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1pZVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbW9iaXBvY2tldC1lYm9va1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHJjXCIsXCJtb2JpXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1tcGVndXJsXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbXMtYXBwbGljYXRpb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFwcGxpY2F0aW9uXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1tcy1zaG9ydGN1dFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibG5rXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1tcy13bWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndtZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbXMtd216XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3bXpcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW1zLXhiYXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhiYXBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW1zYWNjZXNzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtZGJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW1zYmluZGVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvYmRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW1zY2FyZGZpbGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNyZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbXNjbGlwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjbHBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW1zZG93bmxvYWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImV4ZVwiLFwiZGxsXCIsXCJjb21cIixcImJhdFwiLFwibXNpXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1tc21lZGlhdmlld1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXZiXCIsXCJtMTNcIixcIm0xNFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbXNtZXRhZmlsZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid21mXCIsXCJ3bXpcIixcImVtZlwiLFwiZW16XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1tc21vbmV5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtbnlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW1zcHVibGlzaGVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwdWJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW1zc2NoZWR1bGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNjZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbXN0ZXJtaW5hbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widHJtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1tc3dyaXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3cmlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW5ldGNkZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibmNcIixcImNkZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbnMtcHJveHktYXV0b2NvbmZpZ1wiOiB7XG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicGFjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1uemJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm56YlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtcGVybFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJuZ2lueFwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwbFwiLFwicG1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXBpbG90XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcIm5naW54XCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInByY1wiLFwicGRiXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1wa2NzMTJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInAxMlwiLFwicGZ4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1wa2NzNy1jZXJ0aWZpY2F0ZXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInA3YlwiLFwic3BjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1wa2NzNy1jZXJ0cmVxcmVzcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicDdyXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1yYXItY29tcHJlc3NlZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicmFyXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1yZWRoYXQtcGFja2FnZS1tYW5hZ2VyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcIm5naW54XCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJwbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtcmVzZWFyY2gtaW5mby1zeXN0ZW1zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJyaXNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXNlYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJuZ2lueFwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzZWFcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXNoXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNoXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1zaGFyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzaGFyXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1zaG9ja3dhdmUtZmxhc2hcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN3ZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtc2lsdmVybGlnaHQtYXBwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4YXBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXNxbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3FsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1zdHVmZml0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzaXRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXN0dWZmaXR4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzaXR4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1zdWJyaXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNydFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtc3Y0Y3Bpb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3Y0Y3Bpb1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtc3Y0Y3JjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzdjRjcmNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXQzdm0taW1hZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInQzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC10YWRzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnYW1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXRhclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0YXJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXRjbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widGNsXCIsXCJ0a1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtdGV4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0ZXhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXRleC10Zm1cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRmbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtdGV4aW5mb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widGV4aW5mb1wiLFwidGV4aVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtdGdpZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib2JqXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC11c3RhclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widXN0YXJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXdhaXMtc291cmNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzcmNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXdlYi1hcHAtbWFuaWZlc3QranNvblwiOiB7XG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid2ViYXBwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC14NTA5LWNhLWNlcnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRlclwiLFwiY3J0XCIsXCJwZW1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXhmaWdcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImZpZ1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gteGxpZmYreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4bGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXhwaW5zdGFsbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieHBpXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC14elwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieHpcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXptYWNoaW5lXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ6MVwiLFwiejJcIixcInozXCIsXCJ6NFwiLFwiejVcIixcIno2XCIsXCJ6N1wiLFwiejhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94NDAwLWJwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3hhY21sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94YW1sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieGFtbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3hjYXAtYXR0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94Y2FwLWNhcHMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3hjYXAtZGlmZit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4ZGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94Y2FwLWVsK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94Y2FwLWVycm9yK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94Y2FwLW5zK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94Y29uLWNvbmZlcmVuY2UtaW5mbyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veGNvbi1jb25mZXJlbmNlLWluZm8tZGlmZit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veGVuYyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4ZW5jXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veGh0bWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4aHRtbFwiLFwieGh0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veGh0bWwtdm9pY2UreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4bWxcIixcInhzbFwiLFwieHNkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veG1sLWR0ZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZHRkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veG1sLWV4dGVybmFsLXBhcnNlZC1lbnRpdHlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veG1sLXBhdGNoK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94bXBwK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94b3AreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4b3BcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94cHJvYyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhwbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3hzbHQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieHNsdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3hzcGYreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4c3BmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veHYreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXhtbFwiLFwieGh2bWxcIixcInh2bWxcIixcInh2bVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3lhbmdcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ5YW5nXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veWluK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInlpblwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ppcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInppcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3psaWJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vMWQtaW50ZXJsZWF2ZWQtcGFyaXR5ZmVjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvLzMya2FkcGNtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvLzNncHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vM2dwcDJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vYWMzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2FkcGNtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhZHBcIl1cbiAgfSxcbiAgXCJhdWRpby9hbXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vYW1yLXdiXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2Ftci13YitcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vYXB0eFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9hc2NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vYXRyYWMtYWR2YW5jZWQtbG9zc2xlc3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vYXRyYWMteFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9hdHJhYzNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vYmFzaWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhdVwiLFwic25kXCJdXG4gIH0sXG4gIFwiYXVkaW8vYnYxNlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9idjMyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2NsZWFybW9kZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9jblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9kYXQxMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9kbHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZHNyLWVzMjAxMTA4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2Rzci1lczIwMjA1MFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9kc3ItZXMyMDIyMTFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZHNyLWVzMjAyMjEyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2R2XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2R2aTRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZWFjM1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9lbmNhcHJ0cFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9ldnJjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2V2cmMtcWNwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2V2cmMwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2V2cmMxXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2V2cmNiXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2V2cmNiMFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9ldnJjYjFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZXZyY253XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2V2cmNudzBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZXZyY253MVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9ldnJjd2JcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZXZyY3diMFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9ldnJjd2IxXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2Z3ZHJlZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9nNzE5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2c3MjJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZzcyMjFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZzcyM1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9nNzI2LTE2XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2c3MjYtMjRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZzcyNi0zMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9nNzI2LTQwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2c3MjhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZzcyOVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9nNzI5MVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9nNzI5ZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9nNzI5ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9nc21cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZ3NtLWVmclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9nc20taHItMDhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vaWxiY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9pcC1tcl92Mi41XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2lzYWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJhdWRpby9sMTZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vbDIwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2wyNFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2VcbiAgfSxcbiAgXCJhdWRpby9sOFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9scGNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vbWlkaVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWlkXCIsXCJtaWRpXCIsXCJrYXJcIixcInJtaVwiXVxuICB9LFxuICBcImF1ZGlvL21vYmlsZS14bWZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vbXA0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXA0YVwiLFwibTRhXCJdXG4gIH0sXG4gIFwiYXVkaW8vbXA0YS1sYXRtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL21wYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9tcGEtcm9idXN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL21wZWdcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtcGdhXCIsXCJtcDJcIixcIm1wMmFcIixcIm1wM1wiLFwibTJhXCIsXCJtM2FcIl1cbiAgfSxcbiAgXCJhdWRpby9tcGVnNC1nZW5lcmljXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL211c2VwYWNrXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwiYXVkaW8vb2dnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib2dhXCIsXCJvZ2dcIixcInNweFwiXVxuICB9LFxuICBcImF1ZGlvL29wdXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vcGFyaXR5ZmVjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3BjbWFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vcGNtYS13YlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9wY211XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3BjbXUtd2JcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vcHJzLnNpZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9xY2VscFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9yYXB0b3JmZWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vcmVkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3J0cC1lbmMtYWVzY20xMjhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vcnRwLW1pZGlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vcnRwbG9vcGJhY2tcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vcnR4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3MzbVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiczNtXCJdXG4gIH0sXG4gIFwiYXVkaW8vc2lsa1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2lsXCJdXG4gIH0sXG4gIFwiYXVkaW8vc212XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3Ntdi1xY3BcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vc212MFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9zcC1taWRpXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3NwZWV4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3QxNDBjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3QzOFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby90ZWxlcGhvbmUtZXZlbnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdG9uZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby91ZW1jbGlwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3VscGZlY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby92ZHZpXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3Ztci13YlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby92bmQuM2dwcC5pdWZwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC40c2JcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmF1ZGlva296XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5jZWxwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5jaXNjby5uc2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmNtbGVzLnJhZGlvLWV2ZW50c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby92bmQuY25zLmFucDFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmNucy5pbmYxXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5kZWNlLmF1ZGlvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widXZhXCIsXCJ1dnZhXCJdXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmRpZ2l0YWwtd2luZHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJlb2xcIl1cbiAgfSxcbiAgXCJhdWRpby92bmQuZGxuYS5hZHRzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5kb2xieS5oZWFhYy4xXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5kb2xieS5oZWFhYy4yXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5kb2xieS5tbHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmRvbGJ5Lm1wc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby92bmQuZG9sYnkucGwyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5kb2xieS5wbDJ4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5kb2xieS5wbDJ6XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5kb2xieS5wdWxzZS4xXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5kcmFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkcmFcIl1cbiAgfSxcbiAgXCJhdWRpby92bmQuZHRzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZHRzXCJdXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmR0cy5oZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImR0c2hkXCJdXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmR2Yi5maWxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5ldmVyYWQucGxqXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5obnMuYXVkaW9cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmx1Y2VudC52b2ljZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImx2cFwiXVxuICB9LFxuICBcImF1ZGlvL3ZuZC5tcy1wbGF5cmVhZHkubWVkaWEucHlhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHlhXCJdXG4gIH0sXG4gIFwiYXVkaW8vdm5kLm5va2lhLm1vYmlsZS14bWZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLm5vcnRlbC52YmtcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLm51ZXJhLmVjZWxwNDgwMFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImVjZWxwNDgwMFwiXVxuICB9LFxuICBcImF1ZGlvL3ZuZC5udWVyYS5lY2VscDc0NzBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJlY2VscDc0NzBcIl1cbiAgfSxcbiAgXCJhdWRpby92bmQubnVlcmEuZWNlbHA5NjAwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZWNlbHA5NjAwXCJdXG4gIH0sXG4gIFwiYXVkaW8vdm5kLm9jdGVsLnNiY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby92bmQucWNlbHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLnJoZXRvcmV4LjMya2FkcGNtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5yaXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJyaXBcIl1cbiAgfSxcbiAgXCJhdWRpby92bmQucm4tcmVhbGF1ZGlvXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZVxuICB9LFxuICBcImF1ZGlvL3ZuZC5zZWFsZWRtZWRpYS5zb2Z0c2VhbC5tcGVnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC52bXguY3ZzZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby92bmQud2F2ZVwiOiB7XG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2VcbiAgfSxcbiAgXCJhdWRpby92b3JiaXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlXG4gIH0sXG4gIFwiYXVkaW8vdm9yYmlzLWNvbmZpZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby93YXZcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3YXZcIl1cbiAgfSxcbiAgXCJhdWRpby93YXZlXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid2F2XCJdXG4gIH0sXG4gIFwiYXVkaW8vd2VibVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid2ViYVwiXVxuICB9LFxuICBcImF1ZGlvL3gtYWFjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhYWNcIl1cbiAgfSxcbiAgXCJhdWRpby94LWFpZmZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFpZlwiLFwiYWlmZlwiLFwiYWlmY1wiXVxuICB9LFxuICBcImF1ZGlvL3gtY2FmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjYWZcIl1cbiAgfSxcbiAgXCJhdWRpby94LWZsYWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImZsYWNcIl1cbiAgfSxcbiAgXCJhdWRpby94LW00YVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJuZ2lueFwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtNGFcIl1cbiAgfSxcbiAgXCJhdWRpby94LW1hdHJvc2thXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJta2FcIl1cbiAgfSxcbiAgXCJhdWRpby94LW1wZWd1cmxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm0zdVwiXVxuICB9LFxuICBcImF1ZGlvL3gtbXMtd2F4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3YXhcIl1cbiAgfSxcbiAgXCJhdWRpby94LW1zLXdtYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid21hXCJdXG4gIH0sXG4gIFwiYXVkaW8veC1wbi1yZWFsYXVkaW9cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJhbVwiLFwicmFcIl1cbiAgfSxcbiAgXCJhdWRpby94LXBuLXJlYWxhdWRpby1wbHVnaW5cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJtcFwiXVxuICB9LFxuICBcImF1ZGlvL3gtcmVhbGF1ZGlvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcIm5naW54XCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJhXCJdXG4gIH0sXG4gIFwiYXVkaW8veC10dGFcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJhdWRpby94LXdhdlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid2F2XCJdXG4gIH0sXG4gIFwiYXVkaW8veG1cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhtXCJdXG4gIH0sXG4gIFwiY2hlbWljYWwveC1jZHhcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNkeFwiXVxuICB9LFxuICBcImNoZW1pY2FsL3gtY2lmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjaWZcIl1cbiAgfSxcbiAgXCJjaGVtaWNhbC94LWNtZGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNtZGZcIl1cbiAgfSxcbiAgXCJjaGVtaWNhbC94LWNtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY21sXCJdXG4gIH0sXG4gIFwiY2hlbWljYWwveC1jc21sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjc21sXCJdXG4gIH0sXG4gIFwiY2hlbWljYWwveC1wZGJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJjaGVtaWNhbC94LXh5elwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieHl6XCJdXG4gIH0sXG4gIFwiZm9udC9vcGVudHlwZVwiOiB7XG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib3RmXCJdXG4gIH0sXG4gIFwiaW1hZ2UvYm1wXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImJtcFwiXVxuICB9LFxuICBcImltYWdlL2NnbVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNnbVwiXVxuICB9LFxuICBcImltYWdlL2ZpdHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiaW1hZ2UvZzNmYXhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnM1wiXVxuICB9LFxuICBcImltYWdlL2dpZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImdpZlwiXVxuICB9LFxuICBcImltYWdlL2llZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImllZlwiXVxuICB9LFxuICBcImltYWdlL2pwMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS9qcGVnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wianBlZ1wiLFwianBnXCIsXCJqcGVcIl1cbiAgfSxcbiAgXCJpbWFnZS9qcG1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiaW1hZ2UvanB4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImltYWdlL2t0eFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImt0eFwiXVxuICB9LFxuICBcImltYWdlL25hcGxwc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS9wanBlZ1wiOiB7XG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2VcbiAgfSxcbiAgXCJpbWFnZS9wbmdcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwbmdcIl1cbiAgfSxcbiAgXCJpbWFnZS9wcnMuYnRpZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImJ0aWZcIl1cbiAgfSxcbiAgXCJpbWFnZS9wcnMucHRpXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImltYWdlL3B3Zy1yYXN0ZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiaW1hZ2Uvc2dpXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzZ2lcIl1cbiAgfSxcbiAgXCJpbWFnZS9zdmcreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzdmdcIixcInN2Z3pcIl1cbiAgfSxcbiAgXCJpbWFnZS90MzhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiaW1hZ2UvdGlmZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRpZmZcIixcInRpZlwiXVxuICB9LFxuICBcImltYWdlL3RpZmYtZnhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLmFkb2JlLnBob3Rvc2hvcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHNkXCJdXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLmFpcnppcC5hY2NlbGVyYXRvci5henZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLmNucy5pbmYyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImltYWdlL3ZuZC5kZWNlLmdyYXBoaWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ1dmlcIixcInV2dmlcIixcInV2Z1wiLFwidXZ2Z1wiXVxuICB9LFxuICBcImltYWdlL3ZuZC5kanZ1XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZGp2dVwiLFwiZGp2XCJdXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLmR2Yi5zdWJ0aXRsZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN1YlwiXVxuICB9LFxuICBcImltYWdlL3ZuZC5kd2dcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkd2dcIl1cbiAgfSxcbiAgXCJpbWFnZS92bmQuZHhmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZHhmXCJdXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLmZhc3RiaWRzaGVldFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImZic1wiXVxuICB9LFxuICBcImltYWdlL3ZuZC5mcHhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmcHhcIl1cbiAgfSxcbiAgXCJpbWFnZS92bmQuZnN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZnN0XCJdXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLmZ1aml4ZXJveC5lZG1pY3MtbW1yXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibW1yXCJdXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLmZ1aml4ZXJveC5lZG1pY3MtcmxjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicmxjXCJdXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLmdsb2JhbGdyYXBoaWNzLnBnYlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS92bmQubWljcm9zb2Z0Lmljb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLm1peFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS92bmQubXMtbW9kaVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1kaVwiXVxuICB9LFxuICBcImltYWdlL3ZuZC5tcy1waG90b1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid2RwXCJdXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLm5ldC1mcHhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJucHhcIl1cbiAgfSxcbiAgXCJpbWFnZS92bmQucmFkaWFuY2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLnNlYWxlZC5wbmdcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLnNlYWxlZG1lZGlhLnNvZnRzZWFsLmdpZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS92bmQuc2VhbGVkbWVkaWEuc29mdHNlYWwuanBnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImltYWdlL3ZuZC5zdmZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLnRlbmNlbnQudGFwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImltYWdlL3ZuZC52YWx2ZS5zb3VyY2UudGV4dHVyZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS92bmQud2FwLndibXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3Ym1wXCJdXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLnhpZmZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4aWZcIl1cbiAgfSxcbiAgXCJpbWFnZS92bmQuemJydXNoLnBjeFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS93ZWJwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3ZWJwXCJdXG4gIH0sXG4gIFwiaW1hZ2UveC0zZHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIjNkc1wiXVxuICB9LFxuICBcImltYWdlL3gtY211LXJhc3RlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicmFzXCJdXG4gIH0sXG4gIFwiaW1hZ2UveC1jbXhcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNteFwiXVxuICB9LFxuICBcImltYWdlL3gtZnJlZWhhbmRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImZoXCIsXCJmaGNcIixcImZoNFwiLFwiZmg1XCIsXCJmaDdcIl1cbiAgfSxcbiAgXCJpbWFnZS94LWljb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaWNvXCJdXG4gIH0sXG4gIFwiaW1hZ2UveC1qbmdcIjoge1xuICAgIFwic291cmNlXCI6IFwibmdpbnhcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiam5nXCJdXG4gIH0sXG4gIFwiaW1hZ2UveC1tcnNpZC1pbWFnZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2lkXCJdXG4gIH0sXG4gIFwiaW1hZ2UveC1tcy1ibXBcIjoge1xuICAgIFwic291cmNlXCI6IFwibmdpbnhcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJibXBcIl1cbiAgfSxcbiAgXCJpbWFnZS94LXBjeFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicGN4XCJdXG4gIH0sXG4gIFwiaW1hZ2UveC1waWN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwaWNcIixcInBjdFwiXVxuICB9LFxuICBcImltYWdlL3gtcG9ydGFibGUtYW55bWFwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwbm1cIl1cbiAgfSxcbiAgXCJpbWFnZS94LXBvcnRhYmxlLWJpdG1hcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicGJtXCJdXG4gIH0sXG4gIFwiaW1hZ2UveC1wb3J0YWJsZS1ncmF5bWFwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwZ21cIl1cbiAgfSxcbiAgXCJpbWFnZS94LXBvcnRhYmxlLXBpeG1hcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHBtXCJdXG4gIH0sXG4gIFwiaW1hZ2UveC1yZ2JcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJnYlwiXVxuICB9LFxuICBcImltYWdlL3gtdGdhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0Z2FcIl1cbiAgfSxcbiAgXCJpbWFnZS94LXhiaXRtYXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhibVwiXVxuICB9LFxuICBcImltYWdlL3gteGNmXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZVxuICB9LFxuICBcImltYWdlL3gteHBpeG1hcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieHBtXCJdXG4gIH0sXG4gIFwiaW1hZ2UveC14d2luZG93ZHVtcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieHdkXCJdXG4gIH0sXG4gIFwibWVzc2FnZS9jcGltXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1lc3NhZ2UvZGVsaXZlcnktc3RhdHVzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1lc3NhZ2UvZGlzcG9zaXRpb24tbm90aWZpY2F0aW9uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1lc3NhZ2UvZXh0ZXJuYWwtYm9keVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtZXNzYWdlL2ZlZWRiYWNrLXJlcG9ydFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtZXNzYWdlL2dsb2JhbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtZXNzYWdlL2dsb2JhbC1kZWxpdmVyeS1zdGF0dXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibWVzc2FnZS9nbG9iYWwtZGlzcG9zaXRpb24tbm90aWZpY2F0aW9uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1lc3NhZ2UvZ2xvYmFsLWhlYWRlcnNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibWVzc2FnZS9odHRwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZVxuICB9LFxuICBcIm1lc3NhZ2UvaW1kbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJtZXNzYWdlL25ld3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibWVzc2FnZS9wYXJ0aWFsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZVxuICB9LFxuICBcIm1lc3NhZ2UvcmZjODIyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJlbWxcIixcIm1pbWVcIl1cbiAgfSxcbiAgXCJtZXNzYWdlL3MtaHR0cFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtZXNzYWdlL3NpcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtZXNzYWdlL3NpcGZyYWdcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibWVzc2FnZS90cmFja2luZy1zdGF0dXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibWVzc2FnZS92bmQuc2kuc2ltcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtZXNzYWdlL3ZuZC53ZmEud3NjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1vZGVsL2lnZXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJpZ3NcIixcImlnZXNcIl1cbiAgfSxcbiAgXCJtb2RlbC9tZXNoXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXNoXCIsXCJtZXNoXCIsXCJzaWxvXCJdXG4gIH0sXG4gIFwibW9kZWwvdm5kLmNvbGxhZGEreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZGFlXCJdXG4gIH0sXG4gIFwibW9kZWwvdm5kLmR3ZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImR3ZlwiXVxuICB9LFxuICBcIm1vZGVsL3ZuZC5mbGF0bGFuZC4zZG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1vZGVsL3ZuZC5nZGxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnZGxcIl1cbiAgfSxcbiAgXCJtb2RlbC92bmQuZ3MtZ2RsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwibW9kZWwvdm5kLmdzLmdkbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtb2RlbC92bmQuZ3R3XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZ3R3XCJdXG4gIH0sXG4gIFwibW9kZWwvdm5kLm1vbWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1vZGVsL3ZuZC5tdHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtdHNcIl1cbiAgfSxcbiAgXCJtb2RlbC92bmQub3BlbmdleFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtb2RlbC92bmQucGFyYXNvbGlkLnRyYW5zbWl0LmJpbmFyeVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtb2RlbC92bmQucGFyYXNvbGlkLnRyYW5zbWl0LnRleHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibW9kZWwvdm5kLnZhbHZlLnNvdXJjZS5jb21waWxlZC1tYXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibW9kZWwvdm5kLnZ0dVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInZ0dVwiXVxuICB9LFxuICBcIm1vZGVsL3ZybWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3cmxcIixcInZybWxcIl1cbiAgfSxcbiAgXCJtb2RlbC94M2QrYmluYXJ5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4M2RiXCIsXCJ4M2RielwiXVxuICB9LFxuICBcIm1vZGVsL3gzZCtmYXN0aW5mb3NldFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtb2RlbC94M2QrdnJtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieDNkdlwiLFwieDNkdnpcIl1cbiAgfSxcbiAgXCJtb2RlbC94M2QreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4M2RcIixcIngzZHpcIl1cbiAgfSxcbiAgXCJtb2RlbC94M2QtdnJtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtdWx0aXBhcnQvYWx0ZXJuYXRpdmVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlXG4gIH0sXG4gIFwibXVsdGlwYXJ0L2FwcGxlZG91YmxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm11bHRpcGFydC9ieXRlcmFuZ2VzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm11bHRpcGFydC9kaWdlc3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibXVsdGlwYXJ0L2VuY3J5cHRlZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2VcbiAgfSxcbiAgXCJtdWx0aXBhcnQvZm9ybS1kYXRhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZVxuICB9LFxuICBcIm11bHRpcGFydC9oZWFkZXItc2V0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm11bHRpcGFydC9taXhlZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2VcbiAgfSxcbiAgXCJtdWx0aXBhcnQvcGFyYWxsZWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibXVsdGlwYXJ0L3JlbGF0ZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlXG4gIH0sXG4gIFwibXVsdGlwYXJ0L3JlcG9ydFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtdWx0aXBhcnQvc2lnbmVkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZVxuICB9LFxuICBcIm11bHRpcGFydC92b2ljZS1tZXNzYWdlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm11bHRpcGFydC94LW1peGVkLXJlcGxhY2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC8xZC1pbnRlcmxlYXZlZC1wYXJpdHlmZWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9jYWNoZS1tYW5pZmVzdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXBwY2FjaGVcIixcIm1hbmlmZXN0XCJdXG4gIH0sXG4gIFwidGV4dC9jYWxlbmRhclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImljc1wiLFwiaWZiXCJdXG4gIH0sXG4gIFwidGV4dC9jYWxlbmRlclwiOiB7XG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcInRleHQvY21kXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwidGV4dC9jb2ZmZWVzY3JpcHRcIjoge1xuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjb2ZmZWVcIixcImxpdGNvZmZlZVwiXVxuICB9LFxuICBcInRleHQvY3NzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjc3NcIl1cbiAgfSxcbiAgXCJ0ZXh0L2NzdlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY3N2XCJdXG4gIH0sXG4gIFwidGV4dC9jc3Ytc2NoZW1hXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvZGlyZWN0b3J5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvZG5zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvZWNtYXNjcmlwdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L2VuY2FwcnRwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvZW5yaWNoZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9md2RyZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9ncmFtbWFyLXJlZi1saXN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvaGpzb25cIjoge1xuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJoanNvblwiXVxuICB9LFxuICBcInRleHQvaHRtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaHRtbFwiLFwiaHRtXCIsXCJzaHRtbFwiXVxuICB9LFxuICBcInRleHQvamFkZVwiOiB7XG4gICAgXCJleHRlbnNpb25zXCI6IFtcImphZGVcIl1cbiAgfSxcbiAgXCJ0ZXh0L2phdmFzY3JpcHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJ0ZXh0L2pjci1jbmRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9qc3hcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImpzeFwiXVxuICB9LFxuICBcInRleHQvbGVzc1wiOiB7XG4gICAgXCJleHRlbnNpb25zXCI6IFtcImxlc3NcIl1cbiAgfSxcbiAgXCJ0ZXh0L21hcmtkb3duXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvbWF0aG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcIm5naW54XCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1tbFwiXVxuICB9LFxuICBcInRleHQvbWl6YXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9uM1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibjNcIl1cbiAgfSxcbiAgXCJ0ZXh0L3BhcmFtZXRlcnNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9wYXJpdHlmZWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9wbGFpblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1widHh0XCIsXCJ0ZXh0XCIsXCJjb25mXCIsXCJkZWZcIixcImxpc3RcIixcImxvZ1wiLFwiaW5cIixcImluaVwiXVxuICB9LFxuICBcInRleHQvcHJvdmVuYW5jZS1ub3RhdGlvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3Bycy5mYWxsZW5zdGVpbi5yc3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9wcnMubGluZXMudGFnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZHNjXCJdXG4gIH0sXG4gIFwidGV4dC9yYXB0b3JmZWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9yZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9yZmM4MjItaGVhZGVyc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3JpY2h0ZXh0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJydHhcIl1cbiAgfSxcbiAgXCJ0ZXh0L3J0ZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicnRmXCJdXG4gIH0sXG4gIFwidGV4dC9ydHAtZW5jLWFlc2NtMTI4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvcnRwbG9vcGJhY2tcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9ydHhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9zZ21sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2dtbFwiLFwic2dtXCJdXG4gIH0sXG4gIFwidGV4dC9zdHlsdXNcIjoge1xuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzdHlsdXNcIixcInN0eWxcIl1cbiAgfSxcbiAgXCJ0ZXh0L3QxNDBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC90YWItc2VwYXJhdGVkLXZhbHVlc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1widHN2XCJdXG4gIH0sXG4gIFwidGV4dC90cm9mZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRcIixcInRyXCIsXCJyb2ZmXCIsXCJtYW5cIixcIm1lXCIsXCJtc1wiXVxuICB9LFxuICBcInRleHQvdHVydGxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widHRsXCJdXG4gIH0sXG4gIFwidGV4dC91bHBmZWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC91cmktbGlzdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1widXJpXCIsXCJ1cmlzXCIsXCJ1cmxzXCJdXG4gIH0sXG4gIFwidGV4dC92Y2FyZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1widmNhcmRcIl1cbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5hXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvdm5kLmFiY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5jdXJsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY3VybFwiXVxuICB9LFxuICBcInRleHQvdm5kLmN1cmwuZGN1cmxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRjdXJsXCJdXG4gIH0sXG4gIFwidGV4dC92bmQuY3VybC5tY3VybFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWN1cmxcIl1cbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5jdXJsLnNjdXJsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzY3VybFwiXVxuICB9LFxuICBcInRleHQvdm5kLmRlYmlhbi5jb3B5cmlnaHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC92bmQuZG1jbGllbnRzY3JpcHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC92bmQuZHZiLnN1YnRpdGxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3ViXCJdXG4gIH0sXG4gIFwidGV4dC92bmQuZXNtZXJ0ZWMudGhlbWUtZGVzY3JpcHRvclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5mbHlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmbHlcIl1cbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5mbWkuZmxleHN0b3JcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmbHhcIl1cbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5ncmFwaHZpelwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImd2XCJdXG4gIH0sXG4gIFwidGV4dC92bmQuaW4zZC4zZG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiM2RtbFwiXVxuICB9LFxuICBcInRleHQvdm5kLmluM2Quc3BvdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNwb3RcIl1cbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5pcHRjLm5ld3NtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5pcHRjLm5pdGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC92bmQubGF0ZXgtelwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5tb3Rvcm9sYS5yZWZsZXhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC92bmQubXMtbWVkaWFwYWNrYWdlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvdm5kLm5ldDJwaG9uZS5jb21tY2VudGVyLmNvbW1hbmRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC92bmQucmFkaXN5cy5tc21sLWJhc2ljLWxheW91dFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5zaS51cmljYXRhbG9ndWVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC92bmQuc3VuLmoybWUuYXBwLWRlc2NyaXB0b3JcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJqYWRcIl1cbiAgfSxcbiAgXCJ0ZXh0L3ZuZC50cm9sbHRlY2gubGluZ3Vpc3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC92bmQud2FwLnNpXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvdm5kLndhcC5zbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3ZuZC53YXAud21sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid21sXCJdXG4gIH0sXG4gIFwidGV4dC92bmQud2FwLndtbHNjcmlwdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndtbHNcIl1cbiAgfSxcbiAgXCJ0ZXh0L3Z0dFwiOiB7XG4gICAgXCJjaGFyc2V0XCI6IFwiVVRGLThcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ2dHRcIl1cbiAgfSxcbiAgXCJ0ZXh0L3gtYXNtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzXCIsXCJhc21cIl1cbiAgfSxcbiAgXCJ0ZXh0L3gtY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY1wiLFwiY2NcIixcImN4eFwiLFwiY3BwXCIsXCJoXCIsXCJoaFwiLFwiZGljXCJdXG4gIH0sXG4gIFwidGV4dC94LWNvbXBvbmVudFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJuZ2lueFwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJodGNcIl1cbiAgfSxcbiAgXCJ0ZXh0L3gtZm9ydHJhblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZlwiLFwiZm9yXCIsXCJmNzdcIixcImY5MFwiXVxuICB9LFxuICBcInRleHQveC1nd3QtcnBjXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwidGV4dC94LWhhbmRsZWJhcnMtdGVtcGxhdGVcIjoge1xuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJoYnNcIl1cbiAgfSxcbiAgXCJ0ZXh0L3gtamF2YS1zb3VyY2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImphdmFcIl1cbiAgfSxcbiAgXCJ0ZXh0L3gtanF1ZXJ5LXRtcGxcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJ0ZXh0L3gtbHVhXCI6IHtcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibHVhXCJdXG4gIH0sXG4gIFwidGV4dC94LW1hcmtkb3duXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtYXJrZG93blwiLFwibWRcIixcIm1rZFwiXVxuICB9LFxuICBcInRleHQveC1uZm9cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm5mb1wiXVxuICB9LFxuICBcInRleHQveC1vcG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvcG1sXCJdXG4gIH0sXG4gIFwidGV4dC94LXBhc2NhbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicFwiLFwicGFzXCJdXG4gIH0sXG4gIFwidGV4dC94LXByb2Nlc3NpbmdcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBkZVwiXVxuICB9LFxuICBcInRleHQveC1zYXNzXCI6IHtcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2Fzc1wiXVxuICB9LFxuICBcInRleHQveC1zY3NzXCI6IHtcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2Nzc1wiXVxuICB9LFxuICBcInRleHQveC1zZXRleHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImV0eFwiXVxuICB9LFxuICBcInRleHQveC1zZnZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNmdlwiXVxuICB9LFxuICBcInRleHQveC11dWVuY29kZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widXVcIl1cbiAgfSxcbiAgXCJ0ZXh0L3gtdmNhbGVuZGFyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ2Y3NcIl1cbiAgfSxcbiAgXCJ0ZXh0L3gtdmNhcmRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInZjZlwiXVxuICB9LFxuICBcInRleHQveG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4bWxcIl1cbiAgfSxcbiAgXCJ0ZXh0L3htbC1leHRlcm5hbC1wYXJzZWQtZW50aXR5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQveWFtbFwiOiB7XG4gICAgXCJleHRlbnNpb25zXCI6IFtcInlhbWxcIixcInltbFwiXVxuICB9LFxuICBcInZpZGVvLzFkLWludGVybGVhdmVkLXBhcml0eWZlY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvLzNncHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIjNncFwiLFwiM2dwcFwiXVxuICB9LFxuICBcInZpZGVvLzNncHAtdHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby8zZ3BwMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiM2cyXCJdXG4gIH0sXG4gIFwidmlkZW8vYm1wZWdcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9idDY1NlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL2NlbGJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9kdlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL2gyNjFcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImgyNjFcIl1cbiAgfSxcbiAgXCJ2aWRlby9oMjYzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJoMjYzXCJdXG4gIH0sXG4gIFwidmlkZW8vaDI2My0xOTk4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vaDI2My0yMDAwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vaDI2NFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaDI2NFwiXVxuICB9LFxuICBcInZpZGVvL2gyNjQtcmNkb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL2gyNjQtc3ZjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vanBlZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wianBndlwiXVxuICB9LFxuICBcInZpZGVvL2pwZWcyMDAwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vanBtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJqcG1cIixcImpwZ21cIl1cbiAgfSxcbiAgXCJ2aWRlby9tajJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1qMlwiLFwibWpwMlwiXVxuICB9LFxuICBcInZpZGVvL21wMXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9tcDJwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vbXAydFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widHNcIl1cbiAgfSxcbiAgXCJ2aWRlby9tcDRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1wNFwiLFwibXA0dlwiLFwibXBnNFwiXVxuICB9LFxuICBcInZpZGVvL21wNHYtZXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9tcGVnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtcGVnXCIsXCJtcGdcIixcIm1wZVwiLFwibTF2XCIsXCJtMnZcIl1cbiAgfSxcbiAgXCJ2aWRlby9tcGVnNC1nZW5lcmljXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vbXB2XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vbnZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9vZ2dcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9ndlwiXVxuICB9LFxuICBcInZpZGVvL3Bhcml0eWZlY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3BvaW50ZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9xdWlja3RpbWVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInF0XCIsXCJtb3ZcIl1cbiAgfSxcbiAgXCJ2aWRlby9yYXdcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9ydHAtZW5jLWFlc2NtMTI4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vcnR4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vc21wdGUyOTJtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdWxwZmVjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdmMxXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdm5kLmNjdHZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby92bmQuZGVjZS5oZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widXZoXCIsXCJ1dnZoXCJdXG4gIH0sXG4gIFwidmlkZW8vdm5kLmRlY2UubW9iaWxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ1dm1cIixcInV2dm1cIl1cbiAgfSxcbiAgXCJ2aWRlby92bmQuZGVjZS5tcDRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby92bmQuZGVjZS5wZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widXZwXCIsXCJ1dnZwXCJdXG4gIH0sXG4gIFwidmlkZW8vdm5kLmRlY2Uuc2RcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInV2c1wiLFwidXZ2c1wiXVxuICB9LFxuICBcInZpZGVvL3ZuZC5kZWNlLnZpZGVvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ1dnZcIixcInV2dnZcIl1cbiAgfSxcbiAgXCJ2aWRlby92bmQuZGlyZWN0di5tcGVnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdm5kLmRpcmVjdHYubXBlZy10dHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby92bmQuZGxuYS5tcGVnLXR0c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5kdmIuZmlsZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZHZiXCJdXG4gIH0sXG4gIFwidmlkZW8vdm5kLmZ2dFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZnZ0XCJdXG4gIH0sXG4gIFwidmlkZW8vdm5kLmhucy52aWRlb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5pcHR2Zm9ydW0uMWRwYXJpdHlmZWMtMTAxMFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5pcHR2Zm9ydW0uMWRwYXJpdHlmZWMtMjAwNVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5pcHR2Zm9ydW0uMmRwYXJpdHlmZWMtMTAxMFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5pcHR2Zm9ydW0uMmRwYXJpdHlmZWMtMjAwNVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5pcHR2Zm9ydW0udHRzYXZjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdm5kLmlwdHZmb3J1bS50dHNtcGVnMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5tb3Rvcm9sYS52aWRlb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5tb3Rvcm9sYS52aWRlb3BcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby92bmQubXBlZ3VybFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXh1XCIsXCJtNHVcIl1cbiAgfSxcbiAgXCJ2aWRlby92bmQubXMtcGxheXJlYWR5Lm1lZGlhLnB5dlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHl2XCJdXG4gIH0sXG4gIFwidmlkZW8vdm5kLm5va2lhLmludGVybGVhdmVkLW11bHRpbWVkaWFcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby92bmQubm9raWEudmlkZW92b2lwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdm5kLm9iamVjdHZpZGVvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdm5kLnNlYWxlZC5tcGVnMVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5zZWFsZWQubXBlZzRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby92bmQuc2VhbGVkLnN3ZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5zZWFsZWRtZWRpYS5zb2Z0c2VhbC5tb3ZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby92bmQudXZ2dS5tcDRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInV2dVwiLFwidXZ2dVwiXVxuICB9LFxuICBcInZpZGVvL3ZuZC52aXZvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ2aXZcIl1cbiAgfSxcbiAgXCJ2aWRlby93ZWJtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3ZWJtXCJdXG4gIH0sXG4gIFwidmlkZW8veC1mNHZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImY0dlwiXVxuICB9LFxuICBcInZpZGVvL3gtZmxpXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmbGlcIl1cbiAgfSxcbiAgXCJ2aWRlby94LWZsdlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZmx2XCJdXG4gIH0sXG4gIFwidmlkZW8veC1tNHZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm00dlwiXVxuICB9LFxuICBcInZpZGVvL3gtbWF0cm9za2FcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1rdlwiLFwibWszZFwiLFwibWtzXCJdXG4gIH0sXG4gIFwidmlkZW8veC1tbmdcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1uZ1wiXVxuICB9LFxuICBcInZpZGVvL3gtbXMtYXNmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhc2ZcIixcImFzeFwiXVxuICB9LFxuICBcInZpZGVvL3gtbXMtdm9iXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ2b2JcIl1cbiAgfSxcbiAgXCJ2aWRlby94LW1zLXdtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3bVwiXVxuICB9LFxuICBcInZpZGVvL3gtbXMtd212XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3bXZcIl1cbiAgfSxcbiAgXCJ2aWRlby94LW1zLXdteFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid214XCJdXG4gIH0sXG4gIFwidmlkZW8veC1tcy13dnhcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInd2eFwiXVxuICB9LFxuICBcInZpZGVvL3gtbXN2aWRlb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXZpXCJdXG4gIH0sXG4gIFwidmlkZW8veC1zZ2ktbW92aWVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1vdmllXCJdXG4gIH0sXG4gIFwidmlkZW8veC1zbXZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNtdlwiXVxuICB9LFxuICBcIngtY29uZmVyZW5jZS94LWNvb2x0YWxrXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJpY2VcIl1cbiAgfSxcbiAgXCJ4LXNoYWRlci94LWZyYWdtZW50XCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwieC1zaGFkZXIveC12ZXJ0ZXhcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfVxufVxuIiwiLyohXG4gKiBtaW1lLWRiXG4gKiBDb3B5cmlnaHQoYykgMjAxNCBKb25hdGhhbiBPbmdcbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbi8qKlxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2RiLmpzb24nKVxuIiwiJ3VzZSBzdHJpY3QnO1xuaW1wb3J0IFJlcG9ydCBmcm9tICcuL3JlcG9ydCc7XG5cbi8qKlxuICogQWdlbnQgcmVwb3J0IGNsYXNzIHByb3ZpZGVzIGF1dG9tYXRpYyBpbmZvcm1hdGlvbiBnZXRoZXJpbmcgYW5kIHJlcG9ydFxuICogZ2VuZXJhdGlvbiBmb3IgYnJvd3NlciBhbmQgdXNlciBwbGF0Zm9ybSByZWxhdGVkIGRhdGEuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFnZW50UmVwb3J0IGV4dGVuZHMgUmVwb3J0IHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gdXNlciBhZ2VudCByZXBvcnQgb2JqZWN0IGFuZCBnYXRoZXJzIGFsbCByZWxhdGVkIGluZm9ybWF0aW9uXG4gICAgICogYXQgdGhlIHNhbWUgdGltZS4gVGhpcyByZXBvcnN0IHdpbGwgYmUgcmVhZHkgZm9yIGRpc3BhdGNoaW5nIGp1c3QgYWZ0ZXJcbiAgICAgKiBiZWluZyBjcmVhdGVkLlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigndXNlci1hZ2VudCcpO1xuXG4gICAgICAgIGxldCBkYXRhID0ge307XG5cbiAgICAgICAgbGV0IGVudHJpZXMgPSBbJ2FwcENvZGVOYW1lJywgJ2FwcE5hbWUnLCAnYXBwVmVyc2lvbicsICd1c2VyQWdlbnQnLFxuICAgICAgICAgICAgICAgICAgICAgICAnY29va2llRW5hYmxlZCcsICdsYW5ndWFnZScsICdwbGF0Zm9ybScsICdwcm9kdWN0J107XG5cbiAgICAgICAgZm9yIChsZXQgZW50cnkgb2YgZW50cmllcykge1xuICAgICAgICAgICAgZGF0YVtlbnRyeV0gPSB3aW5kb3cubmF2aWdhdG9yW2VudHJ5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuXG4gICAgICAgIGlmICh3aW5kb3cubmF2aWdhdG9yLmdlb2xvY2F0aW9uKSB7XG4gICAgICAgICAgICBsZXQgcG9zaXRpb24gPSB0aGlzLl91cGRhdGVMb2NhdGlvbi5iaW5kKHRoaXMpO1xuXG4gICAgICAgICAgICB3aW5kb3cubmF2aWdhdG9yLmdlb2xvY2F0aW9uLmdldEN1cnJlbnRQb3NpdGlvbihwb3NpdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9kYXRhWydjb29yZHMnXSA9ICduL2EnO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgX3VwZGF0ZUxvY2F0aW9uKGxvY2F0aW9uKSB7XG4gICAgICAgIHRoaXMuX2RhdGFbJ2Nvb3JkcyddID0gbG9jYXRpb24uY29vcmRzO1xuICAgIH1cblxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuaW1wb3J0IFJlcG9ydCBmcm9tICcuL3JlcG9ydCc7XG5pbXBvcnQgUHJvZmlsZSBmcm9tICcuL3Byb2ZpbGUnO1xuaW1wb3J0IFV0aWwgZnJvbSAnLi4vdXRpbCc7XG5cbi8qKlxuICogUHJvZmlsZSBkaWdlc3QgY2xhc3MgcHJvdmlkZXMgdGhlIG1lYW5zIHRvIGdhdGhlciBhIHNldCBvZiBwcm9maWxpbmdcbiAqIGluZGl2aWR1YWwgcmVzdWx0cyBhbmQgcm91dGUgc3RhdGljcyByZWxhdGVkIHRvIHRoZSBwZXJmb3JtYW5jZSBvZiB0aGVcbiAqIHdob2xlIHNldCBvZiBlbnRyaWVzIGluIGEgc2luZ2xlIHJlcG9ydC4gVGhpcyByZXBvcnN0IGlzIHVzZWZ1bCBmb3IgdGhvc2VcbiAqIGZ1bmN0aW9ucyB0aGF0IGFyZSBjYWxsZWQgYSBsb3Qgb2YgdGltZXMgYW5kIHRpbWUgc3BlbnQgdmFyaWVzIGZyb20gZXhlY3V0aW9uXG4gKiB0byBleGVjdXRpb24gZ3JlYXRseS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUHJvZmlsZURpZ2VzdCBleHRlbmRzIFJlcG9ydCB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IHByb2ZpbGUgcmVwb3J0IGluc3RhbmNlLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gbmFtZSBBbiBpZGVudGlmaWVyIHRoYXQgd2lsbCBiZSB1c2VkIHdoZW4gZGF0YSBpcyBwb3N0ZWRcbiAgICAgKiAgICAgICAgICAgICAgICAgIHRocm91Z2ggdGhlIFJlb3V0ZXIgaW50byB0aGUgcmVtb3RlIHNlcnZlci5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihuYW1lKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX25hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLl9wcm9maWxlcyA9IFtdO1xuICAgICAgICB0aGlzLl9ydW5uaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2Zyb21VVEMgPSAobmV3IERhdGUoKSkudG9VVENTdHJpbmcoKTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgcHJvZmlsZSBtZWFzdXJlIG9wZXJhdGlvbiBhbmQgY2xvc2VzIGFueSBvdGhlciBtZWFzdXJpbmdcbiAgICAgKiBwcm9jZXNzIHRoYXQgY291bGQgYmUgcnVubmluZyxcbiAgICAgKi9cbiAgICBzdGFydE1lYXN1cmUoKSB7XG4gICAgICAgIHRoaXMuY29tcGxldGVNZWFzdXJlKCk7XG4gICAgICAgIHRoaXMuX3J1bm5pbmcgPSB0cnVlO1xuICAgICAgICBsZXQgbmFtZSA9IHRoaXMuX25hbWUgKyAnLScgKyB0aGlzLl9wcm9maWxlcy5sZW5ndGg7XG4gICAgICAgIHRoaXMuX3Byb2ZpbGVzLnB1c2gobmV3IFByb2ZpbGUobmFtZSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbXBsZXRlcyBhIHByb2ZpbGluZyBtZWFzdXJlIG9wZXJhdGlvbiBiZWluZyBleGVjdXRlZCBhcyBwYXJ0IG9mIHRoZVxuICAgICAqIHNldC5cbiAgICAgKi9cbiAgICBjb21wbGV0ZU1lYXN1cmUoKSB7XG5cbiAgICAgICAgaWYgKHRoaXMuX3Byb2ZpbGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gICAgICAgIGxldCBjdXJyZW50ID0gdGhpcy5fcHJvZmlsZXNbdGhpcy5fcHJvZmlsZXMubGVuZ3RoIC0gMV07XG4gICAgICAgIGN1cnJlbnQuY29tcGxldGUoZmFsc2UpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbXBsZWF0ZXMgY3VycmVudCBwcm9maWxpbmcgZGlnZXN0IHJlcG9ydCBhbmQgZGlzcGF0Y2hlcyB0aGUgcmVzdWx0aW5nXG4gICAgICogaW5mb3JtYXRpb24gaW50byB0aGUgc2VydmVyIHJvdXRpbmcgcXVldWUuXG4gICAgICovXG4gICAgY29tcGxldGUoKSB7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9ydW5uaW5nKSByZXR1cm47XG4gICAgICAgIHRoaXMuX3J1bm5pbmcgPSBmYWxzZTtcblxuICAgICAgICAvLyBnZXQgc3VyZSBhbGwgbWVhc3VyZXMgYXJlIGNvbXBsZXRlZFxuICAgICAgICB0aGlzLmNvbXBsZXRlTWVhc3VyZSgpO1xuXG4gICAgICAgIGxldCB2YWx1ZXMgPSBbXTtcblxuICAgICAgICBmb3IgKGxldCBwcm9maWxlIG9mIHRoaXMuX3Byb2ZpbGVzKSB7XG4gICAgICAgICAgICB2YWx1ZXMucHVzaChwcm9maWxlLmVsYXBzZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgcmVwb3J0IGRhdGFcbiAgICAgICAgdGhpcy5fZGF0YSA9IHtcbiAgICAgICAgICAgICduYW1lJzogdGhpcy5fbmFtZSxcbiAgICAgICAgICAgICdlbnRyaWVzJzogdGhpcy5fcHJvZmlsZXMubGVuZ3RoLFxuICAgICAgICAgICAgJ21lZGlhbic6IFV0aWwubWVkaWFuKHZhbHVlcyksXG4gICAgICAgICAgICAnbWF4JzogdmFsdWVzWzBdLFxuICAgICAgICAgICAgJ21pbic6IHZhbHVlc1t2YWx1ZXMubGVuZ3RoIC0gMV1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRpc3BhdGNoKCk7XG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuaW1wb3J0IFJlcG9ydCBmcm9tICcuL3JlcG9ydCc7XG5cbi8qKlxuICogUGFnZSByZXBvcnQgY2xhc3MgcHJvdmlkZXMgYXV0b21hdGljIGluZm9ybWF0aW9uIGdhdGhlcmluZyBhbmQgcmVwb3J0XG4gKiBnZW5lcmF0aW9uIGZvciBjb21tb24gcGFnZSBwZXJmb3JtYW5jZSB0aW1pbmcgbWVhc3VyZXMuXG4gKiBJbiBvcmRlciB0byBnZXQgdGhpcyByZXBvcnQgaW5mb3JtYXRpb24gZnVsbHkgYXZhaWxhYmxlIGl0IGlzIHJlcXVpcmVkXG4gKiB0byBjcmVhdGUgaXQgYWZ0ZXIgdGhlIHBhZ2UgaGFzIGJlZW4gdG90YWxseSBsb2FkZWQuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhZ2VSZXBvcnQgZXh0ZW5kcyBSZXBvcnQge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIFBhZ2UgdGltaW5nIFJlcG9ydCBvYmplY3QgYW5kIGdhdGhlcnMgYWxsIHJlbGF0ZWQgaW5mb3JtYXRpb25cbiAgICAgKiBhdCB0aGUgc2FtZSB0aW1lLiBUaGlzIHJlcG9yc3Qgd2lsbCBiZSByZWFkeSBmb3IgZGlzcGF0Y2hpbmcgYWZ0ZXIgYmVpbmdcbiAgICAgKiBjcmVhdGVkLlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigncGFnZS10aW1pbmcnKTtcblxuICAgICAgICBsZXQgc291cmNlSW5mbyA9IHt9O1xuICAgICAgICBsZXQgdGltaW5nSW5mbyA9IHt9O1xuICAgICAgICBsZXQgdGltaW5nID0gcGVyZm9ybWFuY2UudGltaW5nO1xuXG4gICAgICAgIGxldCB0aW1pbmdFbnRyaWVzID0gWydjb25uZWN0JywgJ2RvbWFpbkxvb2t1cCcsICdkb21Db250ZW50TG9hZGVkRXZlbnQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdsb2FkRXZlbnQnLCAncmVkaXJlY3QnLCAncmVzcG9uc2UnLCAndW5sb2FkRXZlbnQnXTtcblxuICAgICAgICBsZXQgbG9jYXRpb25FbnRyaWVzID0gWydvcmlnaW4nLCAncHJvdG9jb2wnLCdwYXRobmFtZSddO1xuXG4gICAgICAgIGZvciAobGV0IGVudHJ5IG9mIHRpbWluZ0VudHJpZXMpIHtcbiAgICAgICAgICAgIGxldCBzdGFydCA9IHRpbWluZ1tlbnRyeSArICdTdGFydCddO1xuICAgICAgICAgICAgbGV0IGVuZCA9IHRpbWluZ1tlbnRyeSArICdFbmQnXTtcblxuICAgICAgICAgICAgdGltaW5nSW5mb1tlbnRyeV0gPSBlbmQgLSBzdGFydDtcbiAgICAgICAgfVxuXG4gICAgICAgIHNvdXJjZUluZm9bJ3RpdGxlJ10gPSB3aW5kb3cuZG9jdW1lbnQudGl0bGU7XG5cbiAgICAgICAgZm9yIChsZXQgZW50cnkgb2YgbG9jYXRpb25FbnRyaWVzKSB7XG4gICAgICAgICAgICBzb3VyY2VJbmZvW2VudHJ5XSA9IHdpbmRvdy5kb2N1bWVudC5sb2NhdGlvbltlbnRyeV07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9kYXRhID0ge1xuICAgICAgICAgICAgJ3NvdXJjZScgOiBzb3VyY2VJbmZvLFxuICAgICAgICAgICAgJ3RpbWluZycgOiB0aW1pbmdJbmZvXG4gICAgICAgIH07XG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuaW1wb3J0IFJlcG9ydCBmcm9tICcuL3JlcG9ydCc7XG5pbXBvcnQgVXRpbCBmcm9tICcuLi91dGlsJztcblxuLyoqXG4gKiBQcm9maWxlIHJlcG9ydCBjbGFzcyBwcm92aWRlcyB0aGUgbWVhbnMgdG8gY29sbGVjdCBpbmZvcm1hdGlvbiBmb3IgYSBzaW5nbGVcbiAqIG5hbWVkIG9wZXJhdGlvbiBieSBzYXZpbmcgdGhlIHRpbWUgc2luY2UgaXQgaGFzIGJlZW4gY3JlYXRlZCB1bnRpbCBpdCBpc1xuICogY29tcGxldGVkIHVzaW5nIHRoZSBQcm9maWxlUmVwb3J0Ojpjb21wbGV0ZSBtZXRob2QuIEFmdGVyIGNvbXBsZWF0aW5nIGEgcmVwb3J0XG4gKiBpdCB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgZGlzcGF0Y2hlZCB0byB0aGUgc2VydmVyIHJvdXRpbmcgcXVldWUuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFByb2ZpbGVSZXBvcnQgZXh0ZW5kcyBSZXBvcnQge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBwcm9maWxlIHJlcG9ydCBpbnN0YW5jZS5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IG5hbWUgQW4gaWRlbnRpZmllciB0aGF0IHdpbGwgYmUgdXNlZCB3aGVuIGRhdGEgaXMgcG9zdGVkXG4gICAgICogICAgICAgICAgICAgICAgICB0aHJvdWdoIHRoZSBSZW91dGVyIGludG8gdGhlIHJlbW90ZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IobmFtZSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5fZnJvbSA9IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgICAgdGhpcy5fdG8gPSBudWxsO1xuICAgICAgICB0aGlzLl9ydW5uaW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fZnJvbVVUQyA9IChuZXcgRGF0ZSgpKS50b1VUQ1N0cmluZygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHRvdGFsIG51bWJlciBpZiBtaWxsaXNlY29uZHMgcGFzc2VkIHNpbmNlIHRoaXMgcmVwb3J0IGhhc1xuICAgICAqIGJlZW4gY3JlYXRlZCBhbmQgdW50aWwgdGhlIHRpbWUgaXQgaGFzIGJlZW4gY29tcGxldGVkLCBvciBjdXJyZW50IHRpbWVcbiAgICAgKiBpZiB0aGUgcHJvZmlsZSByZXBvcnQgaXMgc3RpbGwgdW5kZXIgcHJvZ3Jlc3MuXG4gICAgICogQHJldHVybiB7TnVuYmVyfVxuICAgICAqL1xuICAgIGdldCBlbGFwc2VkKCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNSdW5uaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZnJvbSAtIHRoaXMuX3RvO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX2Zyb20gLSB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIGN1cnJlbnQgcHJvZmlsaW5nIHJlcG9ydCBoYXMgYmVlbiB5ZXQgY29tcGxldGVkLlxuICAgICAqIEByZXR1cm4ge0Jvb2xlYW59XG4gICAgICovXG4gICAgZ2V0IGlzUnVubmluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3J1bm5pbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcGxlYXRlcyBjdXJyZW50IHByb2ZpbGluZyByZXBvcnQgYW5kIGRpc3BhdGNoZXMgdGhlIHJlc3VsdGluZ1xuICAgICAqIGluZm9ybWF0aW9uIGludG8gdGhlIHNlcnZlciByb3V0aW5nIHF1ZXVlLlxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gZGlzcGF0Y2ggU2VuZCBmYWxzZSBpZiB5b3UgZG9uJ3Qgd2FudCB0byBzZW5kIHRoaXNcbiAgICAgKiAgICAgICAgICAgICAgICAgIHByb2ZpbGluZyByZXBvcnQgaW50byB0aGUgZGlzcGF0Y2hpbmcgcXVldWUuXG4gICAgICovXG4gICAgY29tcGxldGUoZGlzcGF0Y2gpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9ydW5uaW5nKSByZXR1cm47XG5cbiAgICAgICAgdGhpcy5fcnVubmluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRvID0gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgICB0aGlzLl90b1VUQyA9IChuZXcgRGF0ZSgpKS50b1VUQ1N0cmluZygpO1xuXG4gICAgICAgIC8vIEJ1aWxkIHJlcG9ydCBkYXRhXG4gICAgICAgIHRoaXMuX2RhdGEgPSB7XG4gICAgICAgICAgICAnbmFtZSc6IHRoaXMuX25hbWUsXG4gICAgICAgICAgICAnZHVyYXRpb24nOiB0aGlzLmVsYXBzZWQsXG4gICAgICAgICAgICAnc3RhcnRlZCc6IHRoaXMuX2Zyb21VVENcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoZGlzcGF0Y2ggIT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoKCk7XG4gICAgICAgIH1cblxuICAgIH1cblxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgUm91dGVyIGZyb20gJy4uL3JvdXRlcic7XG5pbXBvcnQgVXRpbCBmcm9tICcuLi91dGlsJztcblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciByZXBvcnQgZ2VuZXJhdGlvbiwgdGhpcyBjbGFzcyBjb3RhaW5zIGEgbWluaW1hbCBzZXQgb2YgZGF0YVxuICogc3RydWN0dXJlcyBhbmQgZnVuY3Rpb25hbGl0eSB1c2VkIHRvIGdhdGhlciBhbmQgcG9zdCBpbmZvcm1hdGlvbiB0aHJvdWdoIHRoZVxuICogcm91dGluZyBzZXJ2aWNlIHVzZWQgdG8gZmx1c2ggZ2F0aGVyZWQgaW5mb3JtYXRpb24gdG8gcmVtb3RlIHNlcnZlci5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVwb3J0IHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgcmVwb3J0IGluc3RhbmNlLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gbmFtZSBBbiBpZGVudGlmaWVyIHRoYXQgd2lsbCBiZSB1c2VkIHdoZW4gZGF0YSBpcyBwb3N0ZWRcbiAgICAgKiAgICAgICAgICAgICAgICAgIHRocm91Z2ggdGhlIFJlb3V0ZXIgaW50byB0aGUgcmVtb3RlIHNlcnZlci5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihuYW1lKSB7XG4gICAgICAgIHRoaXMuX2RhdGEgPSB7fTtcbiAgICAgICAgdGhpcy5fbmFtZSA9IG5hbWUgfHwgVXRpbC5nZW5lcmF0ZUdVSUQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgcmVwcmVzZW50YXRpb24gb2YgcmVwb3J0IGRhdGEgYWxvbmcgd2l0aCBpdHMgcHJvdmlkZWQgbmFtZVxuICAgICAqIHRvIGJlIHVzZWQgb24gdGhlIHJlcG9ydCBkaXNwYXRoaW5nIGN5Y2xlLlxuICAgICAqIEByZXR1cm4ge09iamVjdH1cbiAgICAgKi9cbiAgICBnZXQgZGF0YSgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICduYW1lJzogdGhpcy5uYW1lLFxuICAgICAgICAgICAgJ2RhdGEnOiB0aGlzLl9kYXRhXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIHRleHR1YWwgaWRlbnRpZmllciBzZXQgZm9yIHRoaXNcbiAgICAgKiBzcGVjaWZpYyByZXBvcnQgd2hlbiBjcmVhdGVkLFxuICAgICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICAgKi9cbiAgICBnZXQgbmFtZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX25hbWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VuZHMgdGhlIHJlcG9ydCBkYXRhIHRocm91Z2ggdGhlIFJvdXRlciBkaXNwYXRjaGluZyBxdWV1ZS5cbiAgICAgKi9cbiAgICBkaXNwYXRjaCgpIHtcbiAgICAgICAgUm91dGVyLmVucXVldWUodGhpcy5kYXRhKTtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5pbXBvcnQgbWltZSBmcm9tICdtaW1lLXR5cGVzJztcbmltcG9ydCBVdGlsIGZyb20gJy4uL3V0aWwnO1xuaW1wb3J0IFJlcG9ydCBmcm9tICcuL3JlcG9ydCc7XG5cbi8qKlxuICogUmVzb3VyY2UgZGlzZ2V0IHJlcG9ydCBjbGFzcyBwcm92aWRlcyBhIHNldCBvZiBwYWdlIHJlc291cmNlIGxvYWRpbmcgc3RhdGljc1xuICogdG9vayBmcm9tIHRoZSBwZXJmb3JtYW5jZSBlbnRyaWVzIGF2YWlsYWJsZSBvbiB0aGUgYnJvd3NlciBhdCB0aGUgbW9tZW50IG9mXG4gKiBpdHMgY3JlYXRpb24uIFRoaXMgY2xhc3Mgd2lsbCBnZW5lcmF0ZSBhIHJlcG9ydCB3aXRoIHRoZSBsb25nZXN0IGFuZCBzaG9ydGVzXG4gKiB0aW1lcyBjb25zdW1lZCBieSB0aGUgbG9hZGVkIHJlc291cmNlcyBhdCB0aGUgbW9tZW50IG9mIGl0cyBjcmVhdGlvbiBhbG9uZ1xuICogd2l0aCB0aGUgZGV0YWlsZWQgaW5mb3JtYXRpb24gb2YgdGhlIHJlc291cmNlIHJlcXVlc3RzIHRoYXQgZ2VuZXJhdGVkIHRob3NlXG4gKiB2YWx1ZXMuIEZvciBhbGwgb3RoZXIgcmVxdWVzdHMgZGlnZXN0IHJlcG9ydCB3aWxsIGdlbmVyYXRlIGEgY291bnQgb2ZcbiAqIGluZGl2aWR1YWwgcmVzb3VyY2UgcGx1cyB0aGUgdG90YWwgdGltZSBzcGVudCBieSB0aGVtIHNwbGl0IGluIHNldmVyYWxcbiAqIGNhdGVnb3JpZXMuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlc291cmNlc0RpZ2VzdCBleHRlbmRzIFJlcG9ydCB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgUmVzb3VyY2UgZGlnZXN0IFJlcG9ydCBvYmplY3QgYW5kIGdhdGhlcnMgYWxsIHJlbGF0ZWQgaW5mb3JtYXRpb25cbiAgICAgKiBhdCB0aGUgc2FtZSB0aW1lLiBUaGlzIHJlcG9yc3Qgd2lsbCBiZSByZWFkeSBmb3IgZGlzcGF0Y2hpbmcgYWZ0ZXIgYmVpbmdcbiAgICAgKiBjcmVhdGVkLlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigncmVzb3VyY2VzLXRpbWluZy1kaWdlc3QnKTtcblxuICAgICAgICBsZXQgcmVzb3VyY2VzID0gcGVyZm9ybWFuY2UuZ2V0RW50cmllcygpO1xuICAgICAgICBsZXQgaW5pdGlhdG9ycyA9IHt9O1xuICAgICAgICBsZXQgbWltZVR5cGVzID0ge307XG4gICAgICAgIGxldCB0aW1pbmcgPSB7XG4gICAgICAgICAgICAnbG9uZ2VzdCc6IHtcbiAgICAgICAgICAgICAgICAnZHVyYXRpb24nOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3Nob3J0ZXN0Jzoge1xuICAgICAgICAgICAgICAgICdkdXJhdGlvbic6IDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZm9yIChsZXQgcmVzb3VyY2Ugb2YgcmVzb3VyY2VzKSB7XG5cbiAgICAgICAgICAgIC8vIEtlZXAgZnVsbCByZWNvcmQgb2YgdGhlIHNob3J0ZXN0IGFuZCBsb25nZXN0IHJlc291cmNlXG4gICAgICAgICAgICAvLyByZXF1ZXN0IHRpbWVcbiAgICAgICAgICAgIGlmIChyZXNvdXJjZS5kdXJhdGlvbiA+IHRpbWluZy5sb25nZXN0LmR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGltaW5nLmxvbmdlc3QuZHVyYXRpb24gPSBNYXRoLnJvdW5kKHJlc291cmNlLmR1cmF0aW9uKTtcbiAgICAgICAgICAgICAgICB0aW1pbmcubG9uZ2VzdC5yZXNvdXJjZSA9IHJlc291cmNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocmVzb3VyY2UuZHVyYXRpb24gPCB0aW1pbmcuc2hvcnRlc3QuZHVyYXRpb24gfHxcbiAgICAgICAgICAgICAgICB0aW1pbmcuc2hvcnRlc3QuZHVyYXRpb24gPT0gMCkge1xuICAgICAgICAgICAgICAgIHRpbWluZy5zaG9ydGVzdC5kdXJhdGlvbiA9IE1hdGgucm91bmQocmVzb3VyY2UuZHVyYXRpb24pO1xuICAgICAgICAgICAgICAgIHRpbWluZy5zaG9ydGVzdC5yZXNvdXJjZSA9IHJlc291cmNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdW0gdGhlIHRpbWUgZm9yIHJlc291cmNlIHJlcXVlc3QgaW5pdGlhdG9yc1xuICAgICAgICAgICAgbGV0IGluaXRpYXRvclR5cGUgPSByZXNvdXJjZS5pbml0aWF0b3JUeXBlO1xuXG4gICAgICAgICAgICBpZiAoIWluaXRpYXRvcnNbaW5pdGlhdG9yVHlwZV0pIHtcbiAgICAgICAgICAgICAgICBpbml0aWF0b3JzW2luaXRpYXRvclR5cGVdID0ge1xuICAgICAgICAgICAgICAgICAgICAnY291bnQnOiAwLFxuICAgICAgICAgICAgICAgICAgICAndG90YWwnOiAwXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaW5pdGlhdG9yc1tpbml0aWF0b3JUeXBlXS5jb3VudCArPSAxO1xuICAgICAgICAgICAgaW5pdGlhdG9yc1tpbml0aWF0b3JUeXBlXS50b3RhbCArPSBNYXRoLnJvdW5kKHJlc291cmNlLmR1cmF0aW9uKTtcblxuICAgICAgICAgICAgLy9TdW0gdGhlIHRpbWUgZm9yIGRpZmZlcmVudCBtaW1lIHR5cGVzIHdoZW4gYXZhaWxhYmxlXG4gICAgICAgICAgICBsZXQgbWltZVR5cGUgPSBtaW1lLmxvb2t1cChyZXNvdXJjZS5uYW1lKTtcblxuICAgICAgICAgICAgaWYgKCFtaW1lVHlwZSkgY29udGludWU7XG5cbiAgICAgICAgICAgIGlmICghbWltZVR5cGVzW21pbWVUeXBlXSkge1xuICAgICAgICAgICAgICAgIG1pbWVUeXBlc1ttaW1lVHlwZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICdjb3VudCc6IDAsXG4gICAgICAgICAgICAgICAgICAgICd0b3RhbCc6IDBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtaW1lVHlwZXNbbWltZVR5cGVdLmNvdW50ICs9IDE7XG4gICAgICAgICAgICBtaW1lVHlwZXNbbWltZVR5cGVdLnRvdGFsICs9IE1hdGgucm91bmQocmVzb3VyY2UuZHVyYXRpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWZ0ZXIga2VlcGluZyB0aGUgbG9uZ2VzdCBhbmQgc2hvcnRlc3QgbG9hZGluZyB0aW1lIHJlbGF0ZWQgcmVzb3VyY2VzXG4gICAgICAgIC8vIGdldCBzdXJlIG9ubHkgdG8ga2VlcCBpdCdzIG93biBwcm9wZXJ0aWVzIGFuZCBnZXQgcmlkIG9mIHRoZSByZWFzdCBvZlxuICAgICAgICAvLyB0aGUgb2JqZWN0IGluIG9yZGVyIHRvIHBhc3MgaXQgdHJvdWdoIHRoZSBkaXNwYXRjaGVyIHdvcmtlciBzYWZlbHlcbiAgICAgICAgdGltaW5nLmxvbmdlc3QucmVzb3VyY2UgPSBVdGlsLmNvcHlPYmplY3QodGltaW5nLmxvbmdlc3QucmVzb3VyY2UpO1xuICAgICAgICB0aW1pbmcuc2hvcnRlc3QucmVzb3VyY2UgPSBVdGlsLmNvcHlPYmplY3QodGltaW5nLnNob3J0ZXN0LnJlc291cmNlKTtcblxuICAgICAgICB0aGlzLl9kYXRhID0ge1xuICAgICAgICAgICAgJ3RpbWluZyc6IHRpbWluZyxcbiAgICAgICAgICAgICdpbml0aWF0b3JzJzogaW5pdGlhdG9ycyxcbiAgICAgICAgICAgICdtaW1lVHlwZXMnOiBtaW1lVHlwZXNcbiAgICAgICAgfTtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBVdGlsIGZyb20gJy4vdXRpbCc7XG5pbXBvcnQgUGFnZVJlcG9ydCBmcm9tICcuL2RhdGEvcGFnZSc7XG5pbXBvcnQgQWdlbnRSZXBvcnQgZnJvbSAnLi9kYXRhL2FnZW50JztcbmltcG9ydCBQcm9maWxlUmVwb3J0IGZyb20gJy4vZGF0YS9wcm9maWxlJztcbmltcG9ydCBSZXNvdXJjZURpZ2VzdCBmcm9tICcuL2RhdGEvcmVzb3VyY2UnO1xuXG5sZXQgc2luZ2xldG9uID0gU3ltYm9sKCk7XG5sZXQgc2luZ2xldG9uRW5mb3JjZXIgPSBTeW1ib2woKTtcblxuLyoqXG4gKiBNb25pdG9yIGNsYXNzIHByb3ZpZGVzIGEgc2luZ2xlIGFjY2VzaWJsZSBwb2ludCBmb3IgZmV0Y2hpbmcgaW5mb3JtYXRpb24gYW5kXG4gKiBnZW5lcmF0aW5nIFJlYWwgVXNlciBNb25pdG9yaW5nIHJlcG9ydHMgdG8gYSByZW1vdGUgc2VydmVyLiBNb25pdG9yIHdpbGxcbiAqIGxpc3RlbiBzZXZlcmFsIGV2ZW50cyBvbiB3ZWJwYWdlIGFuZCBzZW5kIHJlc3VsdHMgdGhyb3VnaCB0aGUgbmV0d29ya1xuICogZGlzcGF0Y2hlciBpbiBvcmRlciB0byBiZSBkZWxpdmVyZCB0byByZW1vdmUgc2VydmVyLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNb25pdG9yIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBzaW5nbGUgaW5zdGFuY2UgZm9yIHRoaXMgY2xhc2UsIHRoaXMgbWV0aG9kIHNob3VsZG4ndCBiZVxuICAgICAqIGNhbGxlZCBkaXJlY3RseSBmcm9tIG91dHNpZGUsIGluc3RlYWQgdXNlIGluc3RhbmNlIGdldHRlciB0byBnZXRcbiAgICAgKiBhY2Nlc3MgdG8gdGhlIHNpbmdsZSBpbnN0YWNlLlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtICB7U3ltYm9sfSBlbmZvcmNlclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGVuZm9yY2VyKSB7XG4gICAgICAgIGlmIChlbmZvcmNlciAhPSBzaW5nbGV0b25FbmZvcmNlcikgdGhyb3cgXCJDYW5ub3QgY29uc3RydWN0IHNpbmdsZXRvblwiO1xuICAgICAgICB0aGlzLl9pZGxlSW50ZXJ2YWwgPSAyMDAwMDtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBzaW5nbGV0b24gcmVmZXJlbmNlIGZvciB0aGlzIGNsYXNzIHRvIGJlIHVzZWQgYXBwbGljYXRpb24gd2lkZS5cbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybiB7Um91dGVyfSBBIHJlZmVybmNlIHRvIHRoZSB1bmlxdWUgIGluc3RhbmNlLlxuICAgICAqL1xuICAgIHN0YXRpYyBnZXQgaW5zdGFuY2UoKSB7XG4gICAgICAgIGlmICghdGhpc1tzaW5nbGV0b25dKSB7XG4gICAgICAgICAgICB0aGlzW3NpbmdsZXRvbl0gPSBuZXcgdGhpcyhzaW5nbGV0b25FbmZvcmNlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXNbc2luZ2xldG9uXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgTW9uaXRvcmluZyBwcm9jZXNzIGJ5IGF0dGFjaGluZyBhIHNldCBvZiBsaXN0ZW5lcnMgdGhhdFxuICAgICAqIHdpbGwgYmUgdXNlZCB0byBjb2xsZWN0IGluZm9ybWF0aW9uIGFuZCBnZW5lcmF0ZSBwYXNpdmUgcmVwb3J0cy5cbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdCgpIHtcbiAgICAgICAgdGhpcy5pbnN0YW5jZS5faW5pdCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2luaXQoKSB7XG4gICAgICAgIGxldCBsb2FkSGFuZGxlciA9IHRoaXMuX29uUGFnZUxvYWQuYmluZCh0aGlzKTtcbiAgICAgICAgbGV0IHJlYWR5SGFuZGxlciA9IHRoaXMuX29uUmVhZHlTdGF0ZUNoYW5nZS5iaW5kKHRoaXMpO1xuICAgICAgICBsZXQgYWN0aXZlSGFuZGxlciA9IFV0aWwuZGVib3VuY2UodGhpcy5fY2xlYXJJZGxlLCAxMDAwLCBmYWxzZSwgdGhpcyk7XG4gICAgICAgIGxldCBpZGxlSGFuZGxlciA9IHRoaXMuX3NldElkbGUuYmluZCh0aGlzKTtcbiAgICAgICAgbGV0IHZpc2libGVIYW5kbGVyID0gdGhpcy5fb25WaXNpYmlsaXR5Q2hhbmdlLmJpbmQodGhpcyk7XG5cbiAgICAgICAgVXRpbC5hZGRFdmVudExpc3RlbmVyKHdpbmRvdywgJ2xvYWQnLCBsb2FkSGFuZGxlcik7XG4gICAgICAgIFV0aWwuYWRkRXZlbnRMaXN0ZW5lcihkb2N1bWVudCwgJ3JlYWR5c3RhdGVjaGFuZ2UnLCByZWFkeUhhbmRsZXIpO1xuICAgICAgICBVdGlsLmFkZEV2ZW50TGlzdGVuZXIoZG9jdW1lbnQsICdtb3VzZW1vdmUnLCBhY3RpdmVIYW5kbGVyKTtcbiAgICAgICAgVXRpbC5hZGRFdmVudExpc3RlbmVyKGRvY3VtZW50LCAna2V5ZG93bicsIGFjdGl2ZUhhbmRsZXIpO1xuICAgICAgICBVdGlsLmFkZEV2ZW50TGlzdGVuZXIoZG9jdW1lbnQsIFV0aWwuVklTSUJJTElUWV9DSEFOR0UsIHZpc2libGVIYW5kbGVyKTtcblxuICAgICAgICB0aGlzLl9pZGxlSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChpZGxlSGFuZGxlciwgdGhpcy5faWRsZUludGVydmFsKTtcbiAgICAgICAgdGhpcy5faWRsZUhhbmRsZXIgPSBpZGxlSGFuZGxlcjtcblxuICAgICAgICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gXCJjb21wbGV0ZVwiKSAge1xuICAgICAgICAgICAgdGhpcy5fY3JhdGVMb2FkUmVwb3J0KCk7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX29uUGFnZUxvYWQoKSB7XG4gICAgICAgIC8vIE5vdGhpbmcgdG8gZG8gYXQgdGhlIG1vbWVudFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgZG9jdW1lbnQgcmVhZHkgc3RhdGUgY2hhbmdlIGV2ZW50LiBNb25pdG9yIHdpbGwgYXV0byBnZW5lcmF0ZVxuICAgICAqIHJlcG9ydHMgb24gY2VydGFpbiBldmVudHMuXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfb25SZWFkeVN0YXRlQ2hhbmdlKCkge1xuXG4gICAgICAgIHN3aXRjaCAod2luZG93LmRvY3VtZW50LnJlYWR5U3RhdGUpIHtcbiAgICAgICAgY2FzZSAnaW50ZXJhY3RpdmUnOlxuICAgICAgICAgICAgaWYgKFV0aWwuaXNEb2N1bWVudEhpZGRlbigpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2V0SWRsZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jbGVhcklkbGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2NvbXBsZXRlJzpcbiAgICAgICAgICAgICAgICB0aGlzLl9jcmF0ZUxvYWRSZXBvcnQoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHNldCBvZiByZXBvcnRzIGFmdGVyIHBhZ2UgbG9hZCBwcm9jZXNzIGhhcyBiZWVuIGNvbXBsZXRlZC5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9jcmF0ZUxvYWRSZXBvcnQgKCkge1xuICAgICAgICBsZXQgcGFnZSA9IG5ldyBQYWdlUmVwb3J0KCk7XG4gICAgICAgIGxldCBhZ2VudCA9IG5ldyBBZ2VudFJlcG9ydCgpO1xuICAgICAgICBsZXQgcmVzb3VyY2VzID0gbmV3IFJlc291cmNlRGlnZXN0KCk7XG5cbiAgICAgICAgcGFnZS5kaXNwYXRjaCgpO1xuICAgICAgICBhZ2VudC5kaXNwYXRjaCgpO1xuICAgICAgICByZXNvdXJjZXMuZGlzcGF0Y2goKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHBhZ2UgdmlzaWJpbGl0eSBzdGF0ZSBjaGFuZ2UgZXZlbnQuIE1vbml0b3Igd2lsbCBhdXRvIGdlbmVyYXRlXG4gICAgICogcmVwb3J0cyB3aGVuZXZlciBwYWdlIGdvZXMgb3V0IG9mIHNjb3BlIG9yIHVzZXIgZm9jdXMgaXQgYmFjay5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9vblZpc2liaWxpdHlDaGFuZ2UoKSB7XG4gICAgICAgIGlmIChVdGlsLmlzRG9jdW1lbnRIaWRkZW4oKSkge1xuICAgICAgICAgICAgdGhpcy5fc2V0SWRsZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fY2xlYXJJZGxlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9jbGVhcklkbGUoKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5faWRsZUludGVydmFsKTtcblxuICAgICAgICAvLyBDbGVhciBwcmV2aW91cyBpZGxlIHByb2ZpbGVyIGlmIGFueVxuICAgICAgICBpZiAodGhpcy5faWRsZSkge1xuICAgICAgICAgICAgdGhpcy5faWRsZS5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgdGhpcy5faWRsZSA9IG51bGw7XG4gICAgICAgIH1cblxuXG4gICAgICAgIHRoaXMuX2FjdGl2aXR5ID0gbmV3IFByb2ZpbGVSZXBvcnQoJ3VzZXIgYWN0aXZlIHBlcmlvZCcpO1xuICAgICAgICB0aGlzLl9pZGxlSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCh0aGlzLl9pZGxlSGFuZGxlciwgdGhpcy5faWRsZUludGVydmFsKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9zZXRJZGxlKCkge1xuXG4gICAgICAgIC8vIENsZWFyIHByZXZpb3VzIGFjdGl2aXR5IHByb2ZpbGVyIGlmIGFueVxuICAgICAgICBpZiAodGhpcy5fYWN0aXZpdHkpIHtcbiAgICAgICAgICAgIHRoaXMuX2FjdGl2aXR5LmNvbXBsZXRlKCk7XG4gICAgICAgICAgICB0aGlzLl9hY3Rpdml0eSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9pZGxlID0gbmV3IFByb2ZpbGVSZXBvcnQoJ3VzZXIgaWRsZSBwZXJpb2QnKTtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCdcblxuaW1wb3J0IFByb2ZpbGUgZnJvbSAnLi9kYXRhL3Byb2ZpbGUnO1xuaW1wb3J0IFByb2ZpbGVEaWdlc3QgZnJvbSAnLi9kYXRhL2RpZ2VzdCc7XG5cbmxldCBzaW5nbGV0b24gPSBTeW1ib2woKTtcbmxldCBzaW5nbGV0b25FbmZvcmNlciA9IFN5bWJvbCgpO1xuXG5cbi8qKlxuICogQGNsYXNzIFByb2ZpbGVyXG4gKiBAZGVzY3JpcHRpb24gUHJvZmlsZXIgY2xhc3MgcHJvdmlkZXMgdGhlIG1lYW5zIGZvciBkeW5hbWljIHByb2dyYW0gYW5hbHlzaXNcbiAqICAgICAgICAgICAgICB0aGF0IG1lYXN1cmVzIHRpbWUgY29tcGxleGl0eSBvZiBhIGphdmFzY3JpcHQgY29kZSwgdGhlIHVzYWdlXG4gKiAgICAgICAgICAgICAgb2YgcGFydGljdWxhciBpbnN0cnVjdGlvbnMsIG9yIHRoZSBmcmVxdWVuY3kgYW5kIGR1cmF0aW9uIG9mXG4gKiAgICAgICAgICAgICAgZnVuY3Rpb24gY2FsbHMuIFByb2ZpbGluZyBpbmZvcm1hdGlvbiBzZXJ2ZXMgdG8gYWlkIHByb2dyYW1cbiAqICAgICAgICAgICAgICBvcHRpbWl6YXRpb24uXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFByb2ZpbGVyIHtcblxuICAgIGNvbnN0cnVjdG9yKGVuZm9yY2VyKSB7XG4gICAgICAgIGlmIChlbmZvcmNlciAhPSBzaW5nbGV0b25FbmZvcmNlcikgdGhyb3cgXCJDYW5ub3QgY29uc3RydWN0IHNpbmdsZXRvblwiO1xuICAgICAgICB0aGlzLl9wcm9maWxlcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5fZGlnZXN0cyA9IG5ldyBNYXAoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAqIFJldHVybnMgYSBzaW5nbGV0b24gcmVmZXJlbmNlIGZvciB0aGlzIGNsYXNzIHRvIGJlIHVzZWQgYXBwbGljYXRpb24gd2lkZS5cbiAgICAqIEBzdGF0aWNcbiAgICAqIEByZXR1cm4ge1Byb2ZpbGVyfSBBIHJlZmVybmNlIHRvIHRoZSB1bmlxdWUgIGluc3RhbmNlLlxuICAgICovXG4gICAgc3RhdGljIGdldCBpbnN0YW5jZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzW3NpbmdsZXRvbl0pIHtcbiAgICAgICAgICAgIHRoaXNbc2luZ2xldG9uXSA9IG5ldyB0aGlzKHNpbmdsZXRvbkVuZm9yY2VyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpc1tzaW5nbGV0b25dO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN0b3BzIGEgcHJvZmlsZSBleGVjdXRpb24gIHVuZGVyIHByb3ZpZGVkIGlkZW50aWZpZXIgd2hlbiBhdmFpbGFibGVcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd8T2JqZWN0fEZ1bmN0aW9ufSBpZGVudGlmaWVyIEEgcmVmZXJlbmNlIHRvIGEgdW5pcXVlXG4gICAgICogICAgICAgICBpZGVudGlmaWVyIHVzZWQgdG8gc3RvcmUgYSBwcm9maWxlLCB0aGUgaWRlbnRpZmllciBjb3VsZCBiZSBhXG4gICAgICogICAgICAgICBTdHJpbmcgYW4gb2JqZWN0IG9yIGV2ZW4gYSBmdW5jdGlvbiwgdGhpcyB3YXkgaW5kaXZ1YWwgb2JqZWN0c1xuICAgICAqICAgICAgICAgb3IgZXZlbiBmdW5jdGlvbnMgY2FuIGJlIHRyYWNrZWQgbW9yZSByZWxpYWJpbHkuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtCb29sfSAgUmV0dXJubnMgdHJ1ZSBpZiB0aGUgcHJvZmlsZSBoYXMgYmVlbiBzdWNjZXNzZnVsbHkgc3RvcGVkLFxuICAgICAqICAgICAgICAgaWYgaXQgd2FzIGFscmVhZHkgcnVubmluZyBvciB0aGVyZSBpcyBhIGFub3RoZXJcbiAgICAgKiAgICAgICAgIHByb2ZpbGUgdXNpbmcgdGhlIHNhbWUgaWRlbnRpZmllciB3aWxsIHJldHVybiBmYWxzZSxcbiAgICAgKiBAc3RhdGljXG4gICAgICovXG4gICAgc3RhdGljIHN0b3AoaWRlbnRpZmllcikge1xuICAgICAgICBsZXQgc3VjY2VzcyA9IHRoaXMuaW5zdGFuY2UuX3N0b3AoaWRlbnRpZmllcik7XG4gICAgICAgIHJldHVybiBzdWNjZXNzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogU3RhcnRzIGEgcHJvZmlsZSBleGVjdXRpb24gYW5kIHN0b3JlcyBpdCB1bmRlciBwcm92aWRlZCBpZGVudGlmaWVyXG4gICAgICogQHBhcmFtICB7U3RyaW5nfE9iamVjdHxGdW5jdGlvbn0gaWRlbnRpZmllciBBIHJlZmVyZW5jZSB0byBhIHVuaXF1ZVxuICAgICAqICAgICAgICAgaWRlbnRpZmllciB1c2VkIHRvIHN0b3JlIGEgcHJvZmlsZSwgdGhlIGlkZW50aWZpZXIgY291bGQgYmUgYVxuICAgICAqICAgICAgICAgU3RyaW5nIGFuIG9iamVjdCBvciBldmVuIGEgZnVuY3Rpb24sIHRoaXMgd2F5IGluZGl2dWFsIG9iamVjdHNcbiAgICAgKiAgICAgICAgIG9yIGV2ZW4gZnVuY3Rpb25zIGNhbiBiZSB0cmFja2VkIG1vcmUgcmVsaWFiaWx5LlxuICAgICAqXG4gICAgICogQHJldHVybiB7Qm9vbH0gICBSZXR1cm5ucyB0cnVlIGlmIHRoZSBwcm9maWxlIGhhcyBiZWVuIHN0YXJ0ZWRcbiAgICAgKiAgICAgICAgIHN1Y2Nlc3NmdWxseSwgaWYgaXQgd2FzIGFscmVhZHkgcnVubmluZyBvciB0aGVyZSBpcyBhbm90aGVyXG4gICAgICogICAgICAgICBwcm9maWxlIHVzaW5nIHRoZSBzYW1lIGlkZW50aWZpZXIgd2lsbCByZXR1cm4gZmFsc2UsXG4gICAgICogQHN0YXRpY1xuICAgICAqL1xuICAgIHN0YXRpYyBzdGFydChpZGVudGlmaWVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmluc3RhbmNlLl9zdGFydChpZGVudGlmaWVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbXVsdGkgcHJvZmlsaW5nIGRpZ2VzdCBhbmQgc3RvcmVzIGl0IHVuZGVyIHByb3ZpZGVkIGlkZW50aWZpZXJcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd8T2JqZWN0fEZ1bmN0aW9ufSBpZGVudGlmaWVyIEEgcmVmZXJlbmNlIHRvIGEgdW5pcXVlXG4gICAgICogICAgICAgICBpZGVudGlmaWVyIHVzZWQgdG8gc3RvcmUgYSBwcm9maWxlLCB0aGUgaWRlbnRpZmllciBjb3VsZCBiZSBhXG4gICAgICogICAgICAgICBTdHJpbmcgYW4gb2JqZWN0IG9yIGV2ZW4gYSBmdW5jdGlvbiwgdGhpcyB3YXkgaW5kaXZ1YWwgb2JqZWN0c1xuICAgICAqICAgICAgICAgb3IgZXZlbiBmdW5jdGlvbnMgY2FuIGJlIHRyYWNrZWQgbW9yZSByZWxpYWJpbHkuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtCb29sfSAgIFJldHVybm5zIHRydWUgaWYgdGhlIGRpZ2VzdCBoYXMgYmVlbiBzdWNjZXNzZnVsbHlcbiAgICAgKiAgICAgICAgIGNyZWF0ZWQgaWYgaXQgd2FzIGFscmVhZHkgcnVubmluZyBvciB0aGVyZSBpcyBhbm90aGVyXG4gICAgICogICAgICAgICBkaWdlc3QgdXNpbmcgdGhlIHNhbWUgaWRlbnRpZmllciB3aWxsIHJldHVybiBmYWxzZSxcbiAgICAgKiBAc3RhdGljXG4gICAgICovXG4gICAgc3RhdGljIGNyZWF0ZXRNdWx0aShpZGVudGlmaWVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmluc3RhbmNlLl9jcmVhdGVNdWx0aShpZGVudGlmaWVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb21wbGV0ZXMgYSBtdWx0aSBwcm9maWxpbmcgZGlnZXN0IGdhdGhlcmluZyBzdG9yZWQgdW5kZXIgcHJvdmlkZWRcbiAgICAgKiBpZGVudGlmaWVyIHdoZW4gYXZhaWxhYmxlLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ3xPYmplY3R8RnVuY3Rpb259IGlkZW50aWZpZXIgQSByZWZlcmVuY2UgdG8gYSB1bmlxdWVcbiAgICAgKiAgICAgICAgIGlkZW50aWZpZXIgdXNlZCB0byBzdG9yZSBhIHByb2ZpbGUsIHRoZSBpZGVudGlmaWVyIGNvdWxkIGJlIGFcbiAgICAgKiAgICAgICAgIFN0cmluZyBhbiBvYmplY3Qgb3IgZXZlbiBhIGZ1bmN0aW9uLCB0aGlzIHdheSBpbmRpdnVhbCBvYmplY3RzXG4gICAgICogICAgICAgICBvciBldmVuIGZ1bmN0aW9ucyBjYW4gYmUgdHJhY2tlZCBtb3JlIHJlbGlhYmlseS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge0Jvb2x9ICAgICAgICAgICAgUmV0dXJubnMgdHJ1ZSBpZiB0aGUgcHJvZmlsZSBoYXMgYmVlbiBzdGFydGVkXG4gICAgICogICAgICAgICBzdWNjZXNzZnVsbHksIGlmIGl0IHdhcyBhbHJlYWR5IHJ1bm5pbmcgb3IgdGhlcmUgaXMgYSBhbm90aGVyXG4gICAgICogICAgICAgICBwcm9maWxlIHVzaW5nIHRoZSBzYW1lIGlkZW50aWZpZXIgd2lsbCByZXR1cm4gZmFsc2UsXG4gICAgICogQHN0YXRpY1xuICAgICAqL1xuICAgIHN0YXRpYyBjb21wbGV0ZU11bHRpKGlkZW50aWZpZXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5zdGFuY2UuX2NvbXBsZXRlTXVsdGkoaWRlbnRpZmllcik7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgYSBwcm9maWxlIGV4ZWN1dGlvbiBmb3IgYSBtdWx0aSBwcm9maWxlIGRpZ2VzdCBjb2xsZWN0aW9uXG4gICAgICogQHBhcmFtICB7U3RyaW5nfE9iamVjdHxGdW5jdGlvbn0gaWRlbnRpZmllciBBIHJlZmVyZW5jZSB0byBhIHVuaXF1ZVxuICAgICAqICAgICAgICAgaWRlbnRpZmllciB1c2VkIHRvIHN0b3JlIGEgcHJvZmlsZSwgdGhlIGlkZW50aWZpZXIgY291bGQgYmUgYVxuICAgICAqICAgICAgICAgU3RyaW5nIGFuIG9iamVjdCBvciBldmVuIGEgZnVuY3Rpb24sIHRoaXMgd2F5IGluZGl2dWFsIG9iamVjdHNcbiAgICAgKiAgICAgICAgIG9yIGV2ZW4gZnVuY3Rpb25zIGNhbiBiZSB0cmFja2VkIG1vcmUgcmVsaWFiaWx5LlxuICAgICAqXG4gICAgICogQHJldHVybiB7Qm9vbH0gICBSZXR1cm5ucyB0cnVlIGlmIHRoZSBwcm9maWxlIGhhcyBiZWVuIHN0YXJ0ZWRcbiAgICAgKiAgICAgICAgIHN1Y2Nlc3NmdWxseSwgaWYgaXQgd2FzIGFscmVhZHkgcnVubmluZyBvciB0aGVyZSBpcyBhbm90aGVyXG4gICAgICogICAgICAgICBwcm9maWxlIHVzaW5nIHRoZSBzYW1lIGlkZW50aWZpZXIgd2lsbCByZXR1cm4gZmFsc2UsXG4gICAgICogQHN0YXRpY1xuICAgICAqL1xuICAgIHN0YXRpYyBzdGFydE1lYXN1cmUoaWRlbnRpZmllcikge1xuICAgICAgICByZXR1cm4gdGhpcy5pbnN0YW5jZS5fc3RhcnRNZWFzdXJlKGlkZW50aWZpZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN0b3BzIGEgcHJvZmlsZSBleGVjdXRpb24gICBmb3IgYSBtdWx0aSBwcm9maWxlIGRpZ2VzdCBjb2xsZWN0aW8gd2hlblxuICAgICAqIGF2YWlsYWJsZVxuICAgICAqIEBwYXJhbSAge1N0cmluZ3xPYmplY3R8RnVuY3Rpb259IGlkZW50aWZpZXIgQSByZWZlcmVuY2UgdG8gYSB1bmlxdWVcbiAgICAgKiAgICAgICAgIGlkZW50aWZpZXIgdXNlZCB0byBzdG9yZSB0aGUgbXVsdGkgcHJvZmlsZSwgdGhlIGlkZW50aWZpZXJcbiAgICAgKiAgICAgICAgIGNvdWxkIGJlIGEgU3RyaW5nIGFuIG9iamVjdCBvciBldmVuIGEgZnVuY3Rpb24sIHRoaXMgd2F5IGluZGl2dWFsXG4gICAgICogICAgICAgICBvYmplY3RzICBvciBldmVuIGZ1bmN0aW9ucyBjYW4gYmUgdHJhY2tlZCBtb3JlIHJlbGlhYmlseS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge0Jvb2x9ICBSZXR1cm5ucyB0cnVlIGlmIHRoZSBwcm9maWxlIGhhcyBiZWVuIHN1Y2Nlc3NmdWxseSBzdG9wZWQsXG4gICAgICogICAgICAgICBpZiBpdCB3YXMgYWxyZWFkeSBydW5uaW5nIG9yIHRoZXJlIGlzIGEgYW5vdGhlclxuICAgICAqICAgICAgICAgcHJvZmlsZSB1c2luZyB0aGUgc2FtZSBpZGVudGlmaWVyIHdpbGwgcmV0dXJuIGZhbHNlLFxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgc3RvcE1lYXN1cmUoaWRlbnRpZmllcikge1xuICAgICAgICByZXR1cm4gdGhpcy5pbnN0YW5jZS5fc3RvcE1lYXN1cmUoaWRlbnRpZmllcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfc3RhcnQgKGlkZW50aWZpZXIpIHtcbiAgICAgICAgaWYoIXRoaXMuX3Byb2ZpbGVzLmhhcyhpZGVudGlmaWVyKSkge1xuICAgICAgICAgICAgbGV0IHByb2ZpbGUgPSBuZXcgUHJvZmlsZShpZGVudGlmaWVyKTtcbiAgICAgICAgICAgIHRoaXMuX3Byb2ZpbGVzLnNldChpZGVudGlmaWVyLCBwcm9maWxlKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3N0YXJ0TWVhc3VyZShpZGVudGlmaWVyKSB7XG4gICAgICAgIGlmKCF0aGlzLl9kaWdlc3RzLmhhcyhpZGVudGlmaWVyKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBsZXQgZGlnZXN0ID0gdGhpcy5fZGlnZXN0cy5nZXQoaWRlbnRpZmllcik7XG4gICAgICAgIGRpZ2VzdC5zdGFydE1lYXN1cmUoKTtcblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgIH1cblxuICAgLyoqXG4gICAgKiBAcHJpdmF0ZVxuICAgICovXG4gICBfc3RvcE1lYXN1cmUoaWRlbnRpZmllcikge1xuICAgICAgIGlmKCF0aGlzLl9kaWdlc3RzLmhhcyhpZGVudGlmaWVyKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgIGxldCBkaWdlc3QgPSB0aGlzLl9kaWdlc3RzLmdldChpZGVudGlmaWVyKTtcbiAgICAgICBkaWdlc3QuY29tcGxldGVNZWFzdXJlKCk7XG4gICAgICAgcmV0dXJuIHRydWU7XG4gICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9jcmVhdGVNdWx0aSAoaWRlbnRpZmllcikge1xuICAgICAgICBpZighdGhpcy5fZGlnZXN0cy5oYXMoaWRlbnRpZmllcikpIHtcbiAgICAgICAgICAgIGxldCBkaWdlc3QgPSBuZXcgUHJvZmlsZURpZ2VzdChpZGVudGlmaWVyKTtcbiAgICAgICAgICAgIHRoaXMuX2RpZ2VzdHMuc2V0KGlkZW50aWZpZXIsIGRpZ2VzdCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9jb21wbGV0ZU11bHRpIChpZGVudGlmaWVyKSB7XG4gICAgICAgIGlmKHRoaXMuX2RpZ2VzdHMuaGFzKGlkZW50aWZpZXIpKSB7XG4gICAgICAgICAgICBsZXQgZGlnZXN0ID0gdGhpcy5fZGlnZXN0cy5nZXQoaWRlbnRpZmllcik7XG4gICAgICAgICAgICBkaWdlc3QuY29tcGxldGUoKTtcbiAgICAgICAgICAgIHRoaXMuX2RpZ2VzdHMuZGVsZXRlKGlkZW50aWZpZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9zdG9wIChpZGVudGlmaWVyKSB7XG4gICAgICAgIGlmKHRoaXMuX3Byb2ZpbGVzLmhhcyhpZGVudGlmaWVyKSkge1xuICAgICAgICAgICAgbGV0IHByb2ZpbGUgPSB0aGlzLl9wcm9maWxlcy5nZXQoaWRlbnRpZmllcik7XG4gICAgICAgICAgICBwcm9maWxlLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICB0aGlzLl9wcm9maWxlcy5kZWxldGUoaWRlbnRpZmllcik7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubGV0IHNpbmdsZXRvbiA9IFN5bWJvbCgpO1xubGV0IHNpbmdsZXRvbkVuZm9yY2VyID0gU3ltYm9sKCk7XG5cbi8qKlxuICogV29ya2VyIGRpc3BhdGNoZXIgZnVuY3Rpb25hbGl0eSBkZWNsYXJhdGlvbi5cbiAqIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCBhcyBhIHNjcmlwdCB0ZW1wbGF0ZSBmb3IgdGhlIGNvZGUgZXhlY3V0ZWQgYnkgdGhlXG4gKiBNZXNzYWdlIERpc3BhdGNoZXIgV29ya2VyLlxuICovXG5sZXQgZGlzcGF0Y2hlciA9IGZ1bmN0aW9uICgpIHtcblxuICAgIGxldCBjYWNoZSA9IFtdO1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIHdoZW5ldmVyIGEgbmV0d29yayBjb25uZWN0aW9uIGlzIGF2YWlsYWJsZVxuICAgICAqIE5vdGU6IHRoaXMgbWV0aG9kIGlzIGEgbW9ja3VwIHRlc3RpbmcgbWV0aG9kIGFuIHJldHVybiBhIHJhbmRvbSB2YWx1ZVxuICAgICAqIGluc3RlYWQgbWFraW5nIHRoZSBwcm9wZXIgY2hlY2tpbmdcbiAgICAgKiBAcmV0dXJuIHtCb29sZWFufVxuICAgICAqL1xuICAgIGxldCBjaGVja05ldHdvcmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBNYXRoLnJhbmRvbSgpIDwgLjI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VuZHMgY2FjaGUgY29udGVudCB0cm91Z2h0IHRoZSBuZXR3b3JrIGFuZCBjbGVhbnMgaXRzIGNvbnRlbnRzLlxuICAgICAqIE5vdGU6IHRoaXMgbWV0aG9kIGlzIGEgbW9ja3VwIHRlc3RpbmcgbWV0aG9kIGFuZCBvbmx5IG91dHB1dHMgdGhlXG4gICAgICogXHRcdCBpbmZvcm1hdGlvbiB0aHJvdWdoIHRoZSBjb25zb2xlLlxuICAgICAqIEBmaXJlcyBDQUNIRV9GTFVTSEVEXG4gICAgICogQGZpcmVzIENBQ0hFX0ZMVVNIX0VSUk9SXG4gICAgICovXG4gICAgbGV0IGZsdXNoQ2FjaGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChjaGVja05ldHdvcmsoKSkge1xuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnTU9DS1VQIENPTk5FQ1RJT04gQVZBSUxBQkxFIFRSSUdHRVJFRCcpO1xuICAgICAgICAgICAgc2VsZi5wb3N0TWVzc2FnZSgnRkxVU0hJTkcgQ0FDSEUgTU9DS1VQJyk7XG4gICAgICAgICAgICBjb25zb2xlLmRlYnVnKEpTT04uc3RyaW5naWZ5KGNhY2hlKSk7XG4gICAgICAgICAgICBjYWNoZSA9IFtdO1xuICAgICAgICAgICAgc2VsZi5wb3N0TWVzc2FnZSgnQ0FDSEVfRkxVU0hFRCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnTU9DS1VQIENPTk5FQ1RJT04gTE9TVCBUUklHR0VSRUQnKTtcbiAgICAgICAgICAgIHNlbGYucG9zdE1lc3NhZ2UoJ0NBQ0hFX0ZMVVNIX0VSUk9SJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIGEgbWVzc2FnZSBzZW50IHRvIHRoZSB3ZWIgd29ya2VyIGZyb20gaXQncyBvd25lci5cbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGUgTWVzc2FnZSBFdmVudCBvYmplY3RcbiAgICAgKi9cbiAgICBsZXQgb25NZXNzYWdlID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBlLmRhdGE7XG5cbiAgICAgICAgc3dpdGNoIChkYXRhLmNtZCkge1xuICAgICAgICBjYXNlICdzdGFydCc6XG4gICAgICAgICAgICBzZWxmLnBvc3RNZXNzYWdlKCdESVNQQVRDSEVSIFdPUktFUiBTVEFSVEVEJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnc3RvcCc6XG4gICAgICAgICAgICBzZWxmLnBvc3RNZXNzYWdlKCdESVNQQVRDSEVSIFdPUktFUiBTVE9QUEVEJyk7XG4gICAgICAgICAgICBmbHVzaENhY2hlKCk7XG4gICAgICAgICAgICBzZWxmLmNsb3NlKCk7IC8vIFRlcm1pbmF0ZXMgdGhlIHdvcmtlci5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdxdWV1ZSc6XG4gICAgICAgICAgICBjYWNoZS5wdXNoKGUuZGF0YSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZmx1c2gnOlxuICAgICAgICAgICAgZmx1c2hDYWNoZSgpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH07XG5cbiAgICB9O1xuXG4gICAgc2VsZi5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgb25NZXNzYWdlLCBmYWxzZSk7XG59LnRvU3RyaW5nKCk7XG5cblxuLyoqXG4gKiBSb3V0ZXIgY2xhc3MgcHJvdmlkZXMgYSBzaW5nbGUgYWNjZXNzIHBvaW50IGZvciBzZW5kaW5nIHJlcG9ydCBjb250ZW50XG4gKiB0byB0aGUgc2VydmVyIGJ5IHVzaW5nIGEgZGVkaWNhdGVkIHdlYiB3b3JrZXIgZGlzcGF0Y2hlci5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUm91dGVyIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBzaW5nbGUgaW5zdGFuY2UgZm9yIHRoaXMgY2xhc2UsIHRoaXMgbWV0aG9kIHNob3VsZG4ndCBiZVxuICAgICAqIGNhbGxlZCBkaXJlY3RseSBmcm9tIG91dHNpZGUsIGluc3RlYWQgdXNlIGluc3RhbmNlIGdldHRlciB0byBnZXRcbiAgICAgKiBhY2Nlc3MgdG8gdGhlIHNpbmdsZSBpbnN0YWNlLlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtICB7U3ltYm9sfSBlbmZvcmNlclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGVuZm9yY2VyKSB7XG5cbiAgICAgICAgaWYgKGVuZm9yY2VyICE9IHNpbmdsZXRvbkVuZm9yY2VyKSB0aHJvdyBcIkNhbm5vdCBjb25zdHJ1Y3Qgc2luZ2xldG9uXCI7XG5cbiAgICAgICAgdGhpcy5fZmx1c2hJbnRlcnZhbCA9IDIwMDAwOyAvLyAyMCBzZWNvbmRzXG4gICAgICAgIHRoaXMuX2ZsdXNoSGFuZGxlciA9IHRoaXMuX2ZsdXNoLmJpbmQodGhpcyk7XG5cbiAgICAgICAgdGhpcy5fZmx1c2hJbnRlcnZhbCA9IHNldEludGVydmFsKHRoaXMuX2ZsdXNoSGFuZGxlciwgdGhpcy5fZmx1c2hJbnRlcnZhbCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGEgc3RyaW5nIGRlZmluaW5nIGEgY2xvc3VyZSBhbmQgZXhlY3V0ZSBpdC5cbiAgICAgICAgZGlzcGF0Y2hlciA9ICcoJyArIGRpc3BhdGNoZXIgKyAnKSgpJztcblxuICAgICAgICAvLyBDcmVhdGUgYSBmYWtlIGZpbGUgdXNpbmcgc2NyaXB0IHN0cmluZyBpbiBvcmRlciB0byBwcm92aWRlIHdvcmtlclxuICAgICAgICAvLyB3aXRoIHRoZSBjb2RlIHJlcXVpcmVkIHRvIHJ1bi5cbiAgICAgICAgbGV0IGJsb2IgPSBuZXcgQmxvYihbZGlzcGF0Y2hlcl0sIHtcbiAgICAgICAgICAgIHR5cGU6ICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0J1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgYSB3b3JrZXIgdXNpbmcgY29kZSBzdG9yZWQgaW4gdGhlIGJsb2IgZmlsZVxuICAgICAgICB0aGlzLl93b3JrZXIgPSBuZXcgV29ya2VyKFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYikpO1xuXG4gICAgICAgIC8vIExpc3RlbiB0byB3b3JrZXIgbm90aWZpY2F0aW9uc1xuICAgICAgICB0aGlzLl93b3JrZXIub25tZXNzYWdlID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcobWVzc2FnZS5kYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBTZW5kIGluaXQgY29tbWFuZCB0byB3b3JrZXJcbiAgICAgICAgdGhpcy5fd29ya2VyLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgICdjbWQnOiAnc3RhcnQnXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBzaW5nbGV0b24gcmVmZXJlbmNlIGZvciB0aGlzIGNsYXNzIHRvIGJlIHVzZWQgYXBwbGljYXRpb24gd2lkZS5cbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybiB7Um91dGVyfSBBIHJlZmVybmNlIHRvIHRoZSB1bmlxdWUgIGluc3RhbmNlLlxuICAgICAqL1xuICAgIHN0YXRpYyBnZXQgaW5zdGFuY2UoKSB7XG4gICAgICAgIGlmICghdGhpc1tzaW5nbGV0b25dKSB7XG4gICAgICAgICAgICB0aGlzW3NpbmdsZXRvbl0gPSBuZXcgdGhpcyhzaW5nbGV0b25FbmZvcmNlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXNbc2luZ2xldG9uXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZW5kcyBpbmZvcm1hdGlvbiB0byB0aGUgcmVwb3J0IHBvc3QgcXVldWVcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGRhdGEgQSBzaW1wbGUgamF2YXNjcmlwdCBvYmplY3QgY29udGFpbmluZyBhIHNldCBvZlxuICAgICAqICAgICAgICAgICAgICAgICAga2V5cyBhbmQgdmFsdWVzIHRoYXQgd2lsbCBiZSB0cmFuc21pdGVkIHRvIHRoZVxuICAgICAqICAgICAgICAgICAgICAgICAgc2VydmVyIG9uIGZsdXNoIG9wZXJhdGlvbnMuXG4gICAgICovXG4gICAgc3RhdGljIGVucXVldWUoZGF0YSkge1xuICAgICAgICB0aGlzLmluc3RhbmNlLl93b3JrZXIucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgJ2NtZCc6ICdxdWV1ZScsXG4gICAgICAgICAgICAncGFyYW1zJzogZGF0YVxuICAgICAgICB9KTtcbiAgICAgICAgY29uc29sZS5kZWJ1ZygnTUVTU0FHRSBTRU5UIFRPIFFVRVVFJywgZGF0YSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmx1c2hlcyBjYWNoZWQgaW5mb3JtYXRpb24gb24gdGhyZWFkZWQgZGlzcGF0Y2hlciBpbnRvIHRoZSBzZXJ2ZXIgd2hlbmV2ZXJcbiAgICAgKiBhIHZhbGlkIG5ldHdvcmsgY29ubmVjdGlvbiBpcyBhdmFpbGFibGUuXG4gICAgICovXG4gICAgc3RhdGljIGZsdXNoKCkge1xuICAgICAgICBjb25zb2xlLmluZm8oJ01FU1NBR0UgQ0FDSEUgV0lMTCBGTFVTSCcpO1xuICAgICAgICB0aGlzLmluc3RhbmNlLl9mbHVzaCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgYXV0byBmbHVzaCBpbnRlcnZhbCBpbiBtaWxsaXNlY29uZHMsIGFmdGVyIHRoZSB0aW1lIHNldCByb3V0ZXIgd2lsbFxuICAgICAqIGF0dGVtcHQgdG8gZGlzcGF0Y2ggYWxsIHBlbmRpbmcgbWVzc2FnZXMgdG8gcmVtb3RlIHNlcnZlciB3aGVuZXZlciB0aGVyZVxuICAgICAqIGlzIGNvbm5lY3Rpb24gYXZhaWxhYmxlLiBTZXQgaW50ZXJ2YWwgdG8gZmFsc2UgaW4gb3JkZXIgdG8gc3RvcCBhdXRvXG4gICAgICogZGlzcGF0Y2ggb3BlcmF0aW9ucy5cbiAgICAgKiBAcGFyYW0gIHtOdW1iZXJ8Qm9vbGVhbn0gaW50ZXJ2YWwgVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdGhhdCByb3V0ZXJcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgd2lsbCB3YWl0IHVudGlsIHNlbmRpbmcgY2FjaGVkIGluZm9ybWF0aW9uIHRvXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW90ZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgc3RhdGljIHNldCBmbHVzaEludGVydmFsKGludGVydmFsKSB7XG4gICAgICAgIHRoaXMuaW5zdGFuY2UuX2ZsdXNoSW50ZXJ2YWwgPSBpbnRlcnZhbDtcblxuICAgICAgICBjbGVhckludGVydmFsKHRoaXMuX2ZsdXNoSW50ZXJ2YWwpO1xuXG4gICAgICAgIC8vIElmIGZhbHNlIHNlbnQgbm8gYXV0byBmbHVzaCBvcGVyYXRpb24gd2lsbCBiZSBjcmVhdGVkXG4gICAgICAgIGlmKGludGVydmFsID09PSBmYWxzZSkgcmV0dXJuO1xuXG4gICAgICAgIC8vIHNldCBuZXcgYXV0byBmbHVzaCBvcGVyYXRpb24gaW50ZXJ2YWxcbiAgICAgICAgdGhpcy5fZmx1c2hJbnRlcnZhbCA9IHNldEludGVydmFsKHRoaXMuX2ZsdXNoSGFuZGxlciwgdGhpcy5fZmx1c2hJbnRlcnZhbCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBkZWZhdWx0IGF1dG8gZmx1c2ggaW50ZXJ2YWwgdmFsdWUgaW4gbWlsbGlzZWNvbmRzLiBUaGUgaW50ZXJ2YWxcbiAgICAgKiB3aWxsIGJlIHVzZWQgdG8gZW5yb3V0ZSBwZW5kaW5nIG1lc3NhZ2UgdG8gcmVtb3RlIHNlcnZlci5cbiAgICAgKiBAcmV0dXJuIHtOdW1iZXJ8Qm9vbGVhbn0gVGhlIG51bWJlciBvZiBtaWxsaXNlbmNvbmRzIGNvbmZpZ3VyZWQgZm9yIHRoZVxuICAgICAqIGZsdXNoIGludGVydmFsIG9yIGZhbHNlIHdoZW5ldmVyIHRoZSBhdXRvIGZsdXNoIGZlYXR1cmUgaGFzIGJlZW4gZGlzYWJsZWQuXG4gICAgICovXG4gICAgc3RhdGljIGdldCBmbHVzaEludGVydmFsKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pbnN0YW5jZS5fZmx1c2hJbnRlcnZhbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9mbHVzaCgpIHtcbiAgICAgICAgdGhpcy5fd29ya2VyLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgICdjbWQnOiAnZmx1c2gnXG4gICAgICAgIH0pO1xuICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IE1vbml0b3IgZnJvbSAnLi9tb25pdG9yJztcbmltcG9ydCBQcm9maWxlciBmcm9tICcuL3Byb2ZpbGVyJztcblxud2luZG93LlJ1bSA9IHt9O1xud2luZG93LlJ1bS5Nb25pdG9yID0gTW9uaXRvcjtcbndpbmRvdy5SdW0uUHJvZmlsZXIgPSBQcm9maWxlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBVdGlsIGNsYXNzIGV4cG9zZXMgYSBzZXQgb2YgY29tbW9uIHV0aWxpdHkgZnVuY3Rpb25hbGl0aWVzIHVzZWQgdGhyb3VnaCB0aGVcbiAqIGFwcGxpY2F0aW9uLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBVdGlsIHtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBuZXcgZnVuY3Rpb24gd2l0aCBhIGxpbWl0IG9uIHRoZSByYXRlIGl0IGNhbiBiZSBmaXJlZC4gVGhpc1xuICAgICAqIGlzIHVzZWZ1bCBmb3IgdGhvc2UgZnVuY3Rpb25zIHRoYXQgYXJlIGNhbGxlZCB0b28gb2Z0ZW4gYXMgYSByZXN1bHRcbiAgICAgKiBvZiB1c2VyIGV2ZW50cy5cbiAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZnVuYyAgICBUaGUgcmVmZXJlbmNlIHRvIHRoZSBvcmlnaW5hbCBmdW5jdGlvblxuICAgICAqIEBwYXJhbSAge051bWJlcn0gd2FpdCAgICAgIFRoZSBtaW5pbXVtIGFtb3VudCBvZiB0aW1lIHRoYXQgc2hvdWxkXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFzcyB3aXRob3V0IGNhbGxpbmcgdGhlIGZ1bmN0aW9uIGluIG9yZGVyXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgdG8gdHJpZ2dlciB0aGUgcmVhbCBjYWxsLlxuICAgICAqIEBwYXJhbSAge0Jvb2xlYW59IGltbWVkaWF0ZVxuICAgICAqIEBwYXJhbSAge09iamVjdH0gc2NvcGVcbiAgICAgKi9cbiAgICBzdGF0aWMgZGVib3VuY2UoZnVuYywgd2FpdCwgaW1tZWRpYXRlLCBzY29wZSkge1xuICAgICAgICB2YXIgdGltZW91dDtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gdGhpcyxcbiAgICAgICAgICAgICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgdmFyIGxhdGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmICghaW1tZWRpYXRlKSBmdW5jLmFwcGx5KHNjb3BlLCBhcmdzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgY2FsbE5vdyA9IGltbWVkaWF0ZSAmJiAhdGltZW91dDtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgICAgICAgIGlmIChjYWxsTm93KSBmdW5jLmFwcGx5KHNjb3BlLCBhcmdzKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgbmV3IGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBwcm92aWRlZCBvYmplY3QgYW5kIGJpbmRzIGl0IHRvIGFcbiAgICAgKiBzdXBwbGllZCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSAgIHRhcmdldFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSAgIG5hbWVcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gICBjYXB0dXJlXG4gICAgICovXG4gICAgc3RhdGljIGFkZEV2ZW50TGlzdGVuZXIodGFyZ2V0LCBuYW1lLCBjYWxsYmFjaywgY2FwdHVyZSkge1xuICAgICAgICBjYXB0dXJlID0gY2FwdHVyZSB8fCBmYWxzZTtcbiAgICAgICAgaWYgKFwidW5kZWZpbmVkXCIgIT0gdHlwZW9mICh0YXJnZXQuYXR0YWNoRXZlbnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0LmF0dGFjaEV2ZW50KFwib25cIiArIG5hbWUsIGNhbGxiYWNrKTtcbiAgICAgICAgfSBlbHNlIGlmICh0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldC5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGNhbGxiYWNrLCBjYXB0dXJlKTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIG5hbWUgb2YgdmlzaWJpbGl0eSBjaGFuZ2UgcHJvcGVydHkgb24gY3VycmVudCB1c2VyIGFnZW50LlxuICAgICAqL1xuICAgIHN0YXRpYyBnZXQgVklTSUJJTElUWV9DSEFOR0UoKSB7XG4gICAgICAgIGxldCBoaWRkZW4gPSBcImhpZGRlblwiO1xuXG4gICAgICAgIC8vIFN0YW5kYXJkczpcbiAgICAgICAgaWYgKGhpZGRlbiBpbiBkb2N1bWVudClcbiAgICAgICAgICAgIHJldHVybiBcInZpc2liaWxpdHljaGFuZ2VcIjtcbiAgICAgICAgZWxzZSBpZiAoKGhpZGRlbiA9IFwibW96SGlkZGVuXCIpIGluIGRvY3VtZW50KVxuICAgICAgICAgICAgcmV0dXJuIFwibW96dmlzaWJpbGl0eWNoYW5nZVwiO1xuICAgICAgICBlbHNlIGlmICgoaGlkZGVuID0gXCJ3ZWJraXRIaWRkZW5cIikgaW4gZG9jdW1lbnQpXG4gICAgICAgICAgICByZXR1cm4gXCJ3ZWJraXR2aXNpYmlsaXR5Y2hhbmdlXCI7XG4gICAgICAgIGVsc2UgaWYgKChoaWRkZW4gPSBcIm1zSGlkZGVuXCIpIGluIGRvY3VtZW50KVxuICAgICAgICAgICAgcmV0dXJuIFwibXN2aXNpYmlsaXR5Y2hhbmdlXCI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgbmFtZSBvZiBkb2N1bWVudCBoaWRkZW4gcHJvcGVydHkgb24gY3VycmVudCB1c2VyIGFnZW50LlxuICAgICAqL1xuICAgIHN0YXRpYyBnZXQgSElEREVOX1BST1BFUlRZKCkge1xuICAgICAgICBpZiAoJ2hpZGRlbicgaW4gZG9jdW1lbnQpIHJldHVybiAnaGlkZGVuJztcbiAgICAgICAgaWYgKCdtb3pIaWRkZW4nIGluIGRvY3VtZW50KSByZXR1cm4gJ21vekhpZGRlbic7XG4gICAgICAgIGlmICgnd2Via2l0SGlkZGVuJyBpbiBkb2N1bWVudCkgcmV0dXJuICd3ZWJraXRIaWRkZW4nO1xuICAgICAgICBpZiAoJ21zSGlkZGVuJyBpbiBkb2N1bWVudCkgcmV0dXJuICdtc0hpZGRlbic7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgd2hlbmV2ZXIgZG9jdW1lbnQgaGFzIGJlZW4gaGlkZW4gYnkgdXNlciBzd2l0Y2hpbmcgdG8gb3RoZXJcbiAgICAgKiB0YWJzIG9yIHdpbmRvd3MuXG4gICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBzdGF0aWMgaXNEb2N1bWVudEhpZGRlbigpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50W3RoaXMuSElEREVOX1BST1BFUlRZXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgYSBHbG9iYWxseSBVbmlxdWUgSWRlbnRpZmllclxuICAgICAqIEBwYXJhbSBbaHlwaGVucyA9IHRydWVdIFNldCB0byBmYWxzZSB0byByZW1vdmUgaHlwZW4gc2VwYXJhdG9yIGJldHdlZW5cbiAgICAgKiBudW1iZXIgZ3JvdXBzLlxuICAgICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICAgKi9cbiAgICBzdGF0aWMgZ2VuZXJhdGVHVUlEKGh5cGhlbnMpIHtcbiAgICAgICAgZnVuY3Rpb24gczQoKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcigoMSArIE1hdGgucmFuZG9tKCkpICogMHgxMDAwMClcbiAgICAgICAgICAgICAgICAudG9TdHJpbmcoMTYpXG4gICAgICAgICAgICAgICAgLnN1YnN0cmluZygxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzZXAgPSAnLSc7XG5cbiAgICAgICAgaWYgKGh5cGhlbnMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBzZXAgPSAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzNCgpICsgczQoKSArIHNlcCArIHM0KCkgKyBzZXAgKyBzNCgpICsgc2VwICsgczQoKSArIHNlcCArXG4gICAgICAgICAgICBzNCgpICsgczQoKSArIHM0KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29waWVzIGFsbCBvYmplY3QgcHJvcGVydGllcyBpbnRvIGEgbmV3IG9iamVjdFxuICAgICAqIEBwYXJhbSAge09iamVjdH0gb2JqIHRoZSBzb3VyY2Ugb2JqZWN0IHdoaWNoIHByb3BlcnRpZXMgd2lsbCBiZSBjb3BpZWRcbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9ICAgICBBIG5ldyBvYmplY3Qgd2l0aCB0aGUgcHJvcGVydGllcyBjb3BpZWRcbiAgICAgKi9cbiAgICBzdGF0aWMgY29weU9iamVjdChvYmopIHtcbiAgICAgICAgdmFyIG5ld09iaiA9IHt9O1xuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgIG5ld09ialtrZXldID0gb2JqW2tleV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3T2JqO1xuICAgIH1cblxuICAgIHN0YXRpYyBtZWRpYW4odmFsdWVzKSB7XG5cbiAgICAgICAgdmFsdWVzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgIHJldHVybiBhIC0gYjtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGhhbGYgPSBNYXRoLmZsb29yKHZhbHVlcy5sZW5ndGggLyAyKTtcblxuICAgICAgICBpZiAodmFsdWVzLmxlbmd0aCAlIDIpXG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzW2hhbGZdO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gKHZhbHVlc1toYWxmIC0gMV0gKyB2YWx1ZXNbaGFsZl0pIC8gMi4wO1xuICAgIH1cblxufVxuIl19
