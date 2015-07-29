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

},{"./report":9}],7:[function(require,module,exports){
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

},{"./report":9}],8:[function(require,module,exports){
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
     * Profile digest class provides the means to gather a set of profiling
     * individual results and route statics related to the performance of the
     * whole set of entries in a single report. This reporst is useful for those
     * functions that are called a lot of times and time spent varies from execution
     * to execution greatly.
     */

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

var ProfileDigest = (function (_Report2) {
    _inherits(ProfileDigest, _Report2);

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
        this._running = true;
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

            var name = this._name + '-' + this._profiles.length;
            this._profiles.push(new Profile(name));
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
            current.complete();
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
                    profile = _step.value;

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
                'min': value[values.length - 1]
            };

            this.dispatch();
        }
    }]);

    return ProfileDigest;
})(_report2['default']);

exports.ProfileDigest = ProfileDigest;

},{"../util":15,"./report":9}],9:[function(require,module,exports){
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

},{"../router":13,"../util":15}],10:[function(require,module,exports){
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

},{"../util":15,"./report":9,"mime-types":3}],11:[function(require,module,exports){
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
                    var page = new _dataPage2['default']();
                    var agent = new _dataAgent2['default']();
                    var resources = new _dataResource2['default']();

                    page.dispatch();
                    agent.dispatch();
                    resources.dispatch();

                    break;
            }
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

},{"./data/agent":6,"./data/page":7,"./data/profile":8,"./data/resource":10,"./util":15}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _dataProfile = require('./data/profile');

var _dataProfile2 = _interopRequireDefault(_dataProfile);

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
        key: '_stop',
        value: function _stop(identifier) {
            if (this._profiles.has(identifier)) {
                var profile = this._profiles.get(identifier);
                profile.complete();
                return true;
            }

            return false;
        }
    }], [{
        key: 'stop',

        /**
         * Stops a profile execution under
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
        value: function stop(identifier) {
            var success = this.instance._stop(identifier);
            return success;
        }

        /**
         * Stops a profile execution under
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
        key: 'start',
        value: function start(identifier) {
            return this.instance._start(identifier);
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

},{"./data/profile":8}],13:[function(require,module,exports){
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
        return Math.random() < .5;
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
            console.debug(JSON.stringify(cache));
            cache = [];
            self.postMessage('CACHE_FLUSHED');
        } else {
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
            this.instance._worker.postMessage({
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
            console.debug('MESSAGE CACHE WILL FLUSH');
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

},{}],14:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _monitor = require('./monitor');

var _monitor2 = _interopRequireDefault(_monitor);

var _profiler = require('./profiler');

var _profiler2 = _interopRequireDefault(_profiler);

window.Rum = {};
window.Rum.Monitor = _monitor2['default'];
window.Rum.Profiler = _profiler2['default'];

},{"./monitor":11,"./profiler":12}],15:[function(require,module,exports){
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

},{}]},{},[14])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcGF0aC1icm93c2VyaWZ5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9taW1lLXR5cGVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL21pbWUtdHlwZXMvbm9kZV9tb2R1bGVzL21pbWUtZGIvZGIuanNvbiIsIm5vZGVfbW9kdWxlcy9taW1lLXR5cGVzL25vZGVfbW9kdWxlcy9taW1lLWRiL2luZGV4LmpzIiwiL2hvbWUvcm9kcmlnby9Xb3Jrc3BhY2VzL3J1bS9zcmMvZGF0YS9hZ2VudC5qcyIsIi9ob21lL3JvZHJpZ28vV29ya3NwYWNlcy9ydW0vc3JjL2RhdGEvcGFnZS5qcyIsIi9ob21lL3JvZHJpZ28vV29ya3NwYWNlcy9ydW0vc3JjL2RhdGEvcHJvZmlsZS5qcyIsIi9ob21lL3JvZHJpZ28vV29ya3NwYWNlcy9ydW0vc3JjL2RhdGEvcmVwb3J0LmpzIiwiL2hvbWUvcm9kcmlnby9Xb3Jrc3BhY2VzL3J1bS9zcmMvZGF0YS9yZXNvdXJjZS5qcyIsIi9ob21lL3JvZHJpZ28vV29ya3NwYWNlcy9ydW0vc3JjL21vbml0b3IuanMiLCIvaG9tZS9yb2RyaWdvL1dvcmtzcGFjZXMvcnVtL3NyYy9wcm9maWxlci5qcyIsIi9ob21lL3JvZHJpZ28vV29ya3NwYWNlcy9ydW0vc3JjL3JvdXRlci5qcyIsIi9ob21lL3JvZHJpZ28vV29ya3NwYWNlcy9ydW0vc3JjL3J1bS5qcyIsIi9ob21lL3JvZHJpZ28vV29ya3NwYWNlcy9ydW0vc3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeHhNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEEsWUFBWSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7c0JBQ00sVUFBVTs7Ozs7Ozs7O0lBTVIsV0FBVztjQUFYLFdBQVc7Ozs7Ozs7O0FBT2pCLGFBUE0sV0FBVyxHQU9kOzhCQVBHLFdBQVc7O0FBUXhCLG1DQVJhLFdBQVcsNkNBUWxCLFlBQVksRUFBRTs7QUFFcEIsWUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDOztBQUVkLFlBQUksT0FBTyxHQUFHLENBQUMsYUFBYSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUNuRCxlQUFlLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQzs7Ozs7OztBQUVuRSxpQ0FBa0IsT0FBTyw4SEFBRTtvQkFBbEIsS0FBSzs7QUFDVixvQkFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDekM7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFRCxZQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQzs7QUFFbEIsWUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRTtBQUM5QixnQkFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRS9DLGtCQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUM3RCxNQUFNO0FBQ0gsZ0JBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsS0FBSyxDQUFDO1NBQ2hDO0tBQ0o7O2lCQTVCZ0IsV0FBVzs7ZUE4QmIseUJBQUMsUUFBUSxFQUFFO0FBQ3RCLGdCQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7U0FDMUM7OztXQWhDZ0IsV0FBVzs7O3FCQUFYLFdBQVc7Ozs7QUNQaEMsWUFBWSxDQUFDOzs7Ozs7Ozs7Ozs7O3NCQUNNLFVBQVU7Ozs7Ozs7Ozs7O0lBUVIsVUFBVTtjQUFWLFVBQVU7Ozs7Ozs7O0FBT2hCLGFBUE0sVUFBVSxHQU9iOzhCQVBHLFVBQVU7O0FBUXZCLG1DQVJhLFVBQVUsNkNBUWpCLGFBQWEsRUFBRTs7QUFFckIsWUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDO0FBQ3BCLFlBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQztBQUNwQixZQUFJLE1BQU0sR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDOztBQUVoQyxZQUFJLGFBQWEsR0FBRyxDQUFDLFNBQVMsRUFBRSxjQUFjLEVBQUUsdUJBQXVCLEVBQ25ELFdBQVcsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDOztBQUV4RSxZQUFJLGVBQWUsR0FBRyxDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUMsVUFBVSxDQUFDLENBQUM7Ozs7Ozs7QUFFeEQsaUNBQWtCLGFBQWEsOEhBQUU7b0JBQXhCLEtBQUs7O0FBQ1Ysb0JBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLENBQUM7QUFDcEMsb0JBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUM7O0FBRWhDLDBCQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQzthQUNuQzs7Ozs7Ozs7Ozs7Ozs7OztBQUVELGtCQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7Ozs7Ozs7QUFFNUMsa0NBQWtCLGVBQWUsbUlBQUU7b0JBQTFCLEtBQUs7O0FBQ1YsMEJBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUN2RDs7Ozs7Ozs7Ozs7Ozs7OztBQUVELFlBQUksQ0FBQyxLQUFLLEdBQUc7QUFDVCxvQkFBUSxFQUFHLFVBQVU7QUFDckIsb0JBQVEsRUFBRyxVQUFVO1NBQ3hCLENBQUM7S0FDTDs7V0FwQ2dCLFVBQVU7OztxQkFBVixVQUFVOzs7O0FDVC9CLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7Ozs7O3NCQUNNLFVBQVU7Ozs7b0JBQ1osU0FBUzs7Ozs7Ozs7Ozs7SUFRTCxhQUFhO2NBQWIsYUFBYTs7Ozs7Ozs7QUFPbkIsYUFQTSxhQUFhLENBT2xCLElBQUksRUFBRTs4QkFQRCxhQUFhOztBQVExQixtQ0FSYSxhQUFhLDZDQVFsQjtBQUNSLFlBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0FBQ2xCLFlBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUN0QyxZQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQztBQUNoQixZQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztBQUNyQixZQUFJLENBQUMsUUFBUSxHQUFHLEFBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBRSxXQUFXLEVBQUUsQ0FBQztLQUM5Qzs7Ozs7Ozs7Ozs7Ozs7Ozs7aUJBZGdCLGFBQWE7Ozs7Ozs7OztlQTRDdEIsa0JBQUMsUUFBUSxFQUFFO0FBQ2YsZ0JBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU87O0FBRTNCLGdCQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztBQUN0QixnQkFBSSxDQUFDLEVBQUUsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ25DLGdCQUFJLENBQUMsTUFBTSxHQUFHLEFBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBRSxXQUFXLEVBQUUsQ0FBQzs7O0FBR3pDLGdCQUFJLENBQUMsS0FBSyxHQUFHO0FBQ1Qsc0JBQU0sRUFBRSxJQUFJLENBQUMsS0FBSztBQUNsQiwwQkFBVSxFQUFFLElBQUksQ0FBQyxPQUFPO0FBQ3hCLHlCQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVE7YUFDM0IsQ0FBQzs7QUFFRixnQkFBSSxRQUFRLEtBQUssS0FBSyxFQUFFO0FBQ3BCLG9CQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDbkI7U0FFSjs7O2FBeENVLGVBQUc7QUFDVixnQkFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUU7QUFDakIsdUJBQU8sSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO2FBQ2hDOztBQUVELG1CQUFPLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUNoRDs7Ozs7Ozs7YUFNWSxlQUFHO0FBQ1osbUJBQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztTQUN4Qjs7O1dBcENnQixhQUFhOzs7cUJBQWIsYUFBYTs7SUF5RXJCLGFBQWE7Y0FBYixhQUFhOzs7Ozs7OztBQU9YLGFBUEYsYUFBYSxDQU9WLElBQUksRUFBRTs4QkFQVCxhQUFhOztBQVFsQixtQ0FSSyxhQUFhLDZDQVFWO0FBQ1IsWUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7QUFDbEIsWUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFDcEIsWUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7QUFDckIsWUFBSSxDQUFDLFFBQVEsR0FBRyxBQUFDLElBQUksSUFBSSxFQUFFLENBQUUsV0FBVyxFQUFFLENBQUM7S0FFOUM7Ozs7Ozs7aUJBZFEsYUFBYTs7ZUFvQlYsd0JBQUc7QUFDWCxnQkFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDOztBQUV2QixnQkFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFDcEQsZ0JBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDMUM7Ozs7Ozs7O2VBTWMsMkJBQUc7O0FBRWQsZ0JBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLE9BQU87O0FBRXZDLGdCQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3hELG1CQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7U0FDdEI7Ozs7Ozs7O2VBTU8sb0JBQUc7O0FBRVAsZ0JBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU87QUFDM0IsZ0JBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDOzs7QUFHdEIsZ0JBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQzs7QUFFdkIsZ0JBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQzs7Ozs7Ozs7O0FBRWhCLHFDQUFnQixJQUFJLENBQUMsU0FBUyw4SEFBRTtBQUEzQiwyQkFBTzs7QUFDUiwwQkFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQ2hDOzs7Ozs7Ozs7Ozs7Ozs7O0FBR0QsZ0JBQUksQ0FBQyxLQUFLLEdBQUc7QUFDVCxzQkFBTSxFQUFFLElBQUksQ0FBQyxLQUFLO0FBQ2xCLHlCQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNO0FBQ2hDLHdCQUFRLEVBQUUsa0JBQUssTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUM3QixxQkFBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDaEIscUJBQUssRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7YUFDbEMsQ0FBQzs7QUFFRixnQkFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQ25COzs7V0FuRVEsYUFBYTs7O1FBQWIsYUFBYSxHQUFiLGFBQWE7OztBQ25GMUIsWUFBWSxDQUFDOzs7Ozs7Ozs7Ozs7c0JBRU0sV0FBVzs7OztvQkFDYixTQUFTOzs7Ozs7Ozs7O0lBT0wsTUFBTTs7Ozs7Ozs7QUFPWixhQVBNLE1BQU0sQ0FPWCxJQUFJLEVBQUU7OEJBUEQsTUFBTTs7QUFRbkIsWUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDaEIsWUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLElBQUksa0JBQUssWUFBWSxFQUFFLENBQUM7S0FDNUM7Ozs7Ozs7O2lCQVZnQixNQUFNOzs7Ozs7ZUFvQ2Ysb0JBQUc7QUFDUCxnQ0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzdCOzs7YUFyQk8sZUFBRztBQUNQLG1CQUFPO0FBQ0gsc0JBQU0sRUFBRSxJQUFJLENBQUMsSUFBSTtBQUNqQixzQkFBTSxFQUFFLElBQUksQ0FBQyxLQUFLO2FBQ3JCLENBQUM7U0FDTDs7Ozs7Ozs7O2FBT08sZUFBRztBQUNQLG1CQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7U0FDckI7OztXQS9CZ0IsTUFBTTs7O3FCQUFOLE1BQU07Ozs7QUNWM0IsWUFBWSxDQUFDOzs7Ozs7Ozs7Ozs7O3lCQUNJLFlBQVk7Ozs7b0JBQ1osU0FBUzs7OztzQkFDUCxVQUFVOzs7Ozs7Ozs7Ozs7Ozs7SUFZUixlQUFlO2NBQWYsZUFBZTs7Ozs7Ozs7QUFPckIsYUFQTSxlQUFlLEdBT2xCOzhCQVBHLGVBQWU7O0FBUTVCLG1DQVJhLGVBQWUsNkNBUXRCLHlCQUF5QixFQUFFOztBQUVqQyxZQUFJLFNBQVMsR0FBRyxXQUFXLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDekMsWUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDO0FBQ3BCLFlBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQztBQUNuQixZQUFJLE1BQU0sR0FBRztBQUNULHFCQUFTLEVBQUU7QUFDUCwwQkFBVSxFQUFFLENBQUM7YUFDaEI7QUFDRCxzQkFBVSxFQUFFO0FBQ1IsMEJBQVUsRUFBRSxDQUFDO2FBQ2hCO1NBQ0osQ0FBQTs7Ozs7Ozs7Ozs7QUFFRCxpQ0FBcUIsU0FBUyw4SEFBRTtvQkFBdkIsUUFBUTs7OztBQUliLG9CQUFJLFFBQVEsQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUU7QUFDN0MsMEJBQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3hELDBCQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7aUJBQ3RDOztBQUVELG9CQUFJLFFBQVEsQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLElBQzVDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxJQUFJLENBQUMsRUFBRTtBQUMvQiwwQkFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDekQsMEJBQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztpQkFDdkM7OztBQUdELG9CQUFJLGFBQWEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDOztBQUUzQyxvQkFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsRUFBRTtBQUM1Qiw4QkFBVSxDQUFDLGFBQWEsQ0FBQyxHQUFHO0FBQ3hCLCtCQUFPLEVBQUUsQ0FBQztBQUNWLCtCQUFPLEVBQUUsQ0FBQztxQkFDYixDQUFDO2lCQUNMOztBQUVELDBCQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQztBQUNyQywwQkFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQzs7O0FBR2pFLG9CQUFJLFFBQVEsR0FBRyx1QkFBSyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUUxQyxvQkFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTOztBQUV4QixvQkFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRTtBQUN0Qiw2QkFBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHO0FBQ2xCLCtCQUFPLEVBQUUsQ0FBQztBQUNWLCtCQUFPLEVBQUUsQ0FBQztxQkFDYixDQUFDO2lCQUNMOztBQUVELHlCQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQztBQUMvQix5QkFBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUM5RDs7Ozs7Ozs7Ozs7Ozs7OztBQUtELGNBQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxHQUFHLGtCQUFLLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ25FLGNBQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxHQUFHLGtCQUFLLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDOztBQUVyRSxZQUFJLENBQUMsS0FBSyxHQUFHO0FBQ1Qsb0JBQVEsRUFBRSxNQUFNO0FBQ2hCLHdCQUFZLEVBQUUsVUFBVTtBQUN4Qix1QkFBVyxFQUFFLFNBQVM7U0FDekIsQ0FBQztLQUNMOztXQTdFZ0IsZUFBZTs7O3FCQUFmLGVBQWU7Ozs7QUNmcEMsWUFBWSxDQUFDOzs7Ozs7Ozs7Ozs7b0JBRUksUUFBUTs7Ozt3QkFDRixhQUFhOzs7O3lCQUNaLGNBQWM7Ozs7MkJBQ1osZ0JBQWdCOzs7OzRCQUNmLGlCQUFpQjs7OztBQUU1QyxJQUFJLFNBQVMsR0FBRyxNQUFNLEVBQUUsQ0FBQztBQUN6QixJQUFJLGlCQUFpQixHQUFHLE1BQU0sRUFBRSxDQUFDOzs7Ozs7Ozs7SUFRWixPQUFPOzs7Ozs7Ozs7O0FBU2IsYUFUTSxPQUFPLENBU1osUUFBUSxFQUFFOzhCQVRMLE9BQU87O0FBVXBCLFlBQUksUUFBUSxJQUFJLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDdEUsWUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7S0FFOUI7Ozs7Ozs7O2lCQWJnQixPQUFPOzs7Ozs7ZUFzQ25CLGlCQUFHO0FBQ0osZ0JBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzlDLGdCQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3ZELGdCQUFJLGFBQWEsR0FBRyxrQkFBSyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3RFLGdCQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzQyxnQkFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs7QUFFekQsOEJBQUssZ0JBQWdCLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztBQUNuRCw4QkFBSyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDbEUsOEJBQUssZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxhQUFhLENBQUMsQ0FBQztBQUM1RCw4QkFBSyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0FBQzFELDhCQUFLLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxrQkFBSyxpQkFBaUIsRUFBRSxjQUFjLENBQUMsQ0FBQzs7QUFFeEUsZ0JBQUksQ0FBQyxhQUFhLEdBQUcsV0FBVyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDbEUsZ0JBQUksQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFDO1NBRW5DOzs7Ozs7O2VBS1UsdUJBQUcsRUFFYjs7Ozs7Ozs7QUFBQTs7O2VBT2tCLCtCQUFHOztBQUVsQixvQkFBUSxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVU7QUFDbEMscUJBQUssYUFBYTtBQUNkLHdCQUFJLGtCQUFLLGdCQUFnQixFQUFFLEVBQUU7QUFDekIsNEJBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztxQkFDbkIsTUFBTTtBQUNILDRCQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7cUJBQ3JCOztBQUVELDBCQUFNO0FBQUEsQUFDVixxQkFBSyxVQUFVO0FBQ1gsd0JBQUksSUFBSSxHQUFHLDJCQUFnQixDQUFDO0FBQzVCLHdCQUFJLEtBQUssR0FBRyw0QkFBaUIsQ0FBQztBQUM5Qix3QkFBSSxTQUFTLEdBQUcsK0JBQW9CLENBQUM7O0FBRXJDLHdCQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDaEIseUJBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNqQiw2QkFBUyxDQUFDLFFBQVEsRUFBRSxDQUFDOztBQUVyQiwwQkFBTTtBQUFBLGFBQ1Q7U0FDSjs7Ozs7Ozs7O2VBT2tCLCtCQUFHO0FBQ2xCLGdCQUFJLGtCQUFLLGdCQUFnQixFQUFFLEVBQUU7QUFDekIsb0JBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUNuQixNQUFNO0FBQ0gsb0JBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQzthQUNyQjtTQUNKOzs7Ozs7O2VBS1Msc0JBQUc7QUFDVCx5QkFBYSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQzs7O0FBR2xDLGdCQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7QUFDWixvQkFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUN0QixvQkFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7YUFDckI7O0FBR0QsZ0JBQUksQ0FBQyxTQUFTLEdBQUcsNkJBQWtCLG9CQUFvQixDQUFDLENBQUM7QUFDekQsZ0JBQUksQ0FBQyxhQUFhLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1NBQzNFOzs7Ozs7O2VBS08sb0JBQUc7OztBQUdQLGdCQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7QUFDaEIsb0JBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDMUIsb0JBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO2FBQ3pCOztBQUVELGdCQUFJLENBQUMsS0FBSyxHQUFHLDZCQUFrQixrQkFBa0IsQ0FBQyxDQUFDO1NBQ3REOzs7Ozs7OztlQXZHVSxnQkFBRztBQUNWLGdCQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQ3pCOzs7YUFia0IsZUFBRztBQUNsQixnQkFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtBQUNsQixvQkFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7YUFDakQ7QUFDRCxtQkFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDMUI7OztXQXpCZ0IsT0FBTzs7O3FCQUFQLE9BQU87Ozs7QUNqQjVCLFlBQVksQ0FBQTs7Ozs7Ozs7Ozs7OzJCQUVRLGdCQUFnQjs7OztBQUVwQyxJQUFJLFNBQVMsR0FBRyxNQUFNLEVBQUUsQ0FBQztBQUN6QixJQUFJLGlCQUFpQixHQUFHLE1BQU0sRUFBRSxDQUFDOzs7Ozs7Ozs7OztJQVdaLFFBQVE7QUFFZCxhQUZNLFFBQVEsQ0FFYixRQUFRLEVBQUU7OEJBRkwsUUFBUTs7QUFHckIsWUFBSSxRQUFRLElBQUksaUJBQWlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN0RSxZQUFJLENBQUMsU0FBUyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7S0FDOUI7Ozs7Ozs7O2lCQUxnQixRQUFROzs7Ozs7ZUF3RGxCLGdCQUFDLFVBQVUsRUFBRTtBQUNoQixnQkFBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2hDLG9CQUFJLE9BQU8sR0FBRyw2QkFBWSxVQUFVLENBQUMsQ0FBQztBQUN0QyxvQkFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3hDLHVCQUFPLElBQUksQ0FBQzthQUNmOztBQUVELG1CQUFPLEtBQUssQ0FBQztTQUNoQjs7Ozs7OztlQUtLLGVBQUMsVUFBVSxFQUFFO0FBQ2YsZ0JBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDL0Isb0JBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzdDLHVCQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDbkIsdUJBQU8sSUFBSSxDQUFDO2FBQ2Y7O0FBRUQsbUJBQU8sS0FBSyxDQUFDO1NBQ2hCOzs7Ozs7Ozs7Ozs7Ozs7O2VBOUNVLGNBQUMsVUFBVSxFQUFFO0FBQ3BCLGdCQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUM5QyxtQkFBTyxPQUFPLENBQUM7U0FDbEI7Ozs7Ozs7Ozs7Ozs7Ozs7ZUFlVyxlQUFDLFVBQVUsRUFBRTtBQUNyQixtQkFBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUMzQzs7O2FBdkNrQixlQUFHO0FBQ2xCLGdCQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFO0FBQ2xCLG9CQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQzthQUNqRDtBQUNELG1CQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUMxQjs7O1dBakJnQixRQUFROzs7cUJBQVIsUUFBUTs7OztBQ2hCN0IsWUFBWSxDQUFDOzs7Ozs7Ozs7O0FBRWIsSUFBSSxTQUFTLEdBQUcsTUFBTSxFQUFFLENBQUM7QUFDekIsSUFBSSxpQkFBaUIsR0FBRyxNQUFNLEVBQUUsQ0FBQzs7Ozs7OztBQU9qQyxJQUFJLFVBQVUsR0FBRyxDQUFBLFlBQVk7O0FBRXpCLFFBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQzs7Ozs7Ozs7QUFRZixRQUFJLFlBQVksR0FBRyxTQUFmLFlBQVksR0FBZTtBQUMzQixlQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUM7S0FDN0IsQ0FBQTs7Ozs7Ozs7O0FBU0QsUUFBSSxVQUFVLEdBQUcsU0FBYixVQUFVLEdBQWU7QUFDekIsWUFBSSxZQUFZLEVBQUUsRUFBRTtBQUNoQixtQkFBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDckMsaUJBQUssR0FBRyxFQUFFLENBQUM7QUFDWCxnQkFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQztTQUNyQyxNQUFNO0FBQ0gsZ0JBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FBQztTQUN6QztLQUNKLENBQUE7Ozs7OztBQU1ELFFBQUksU0FBUyxHQUFHLFNBQVosU0FBUyxDQUFhLENBQUMsRUFBRTtBQUN6QixZQUFJLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDOztBQUVsQixnQkFBUSxJQUFJLENBQUMsR0FBRztBQUNoQixpQkFBSyxPQUFPO0FBQ1Isb0JBQUksQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQztBQUM5QyxzQkFBTTtBQUFBLEFBQ1YsaUJBQUssTUFBTTtBQUNQLG9CQUFJLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFDOUMsMEJBQVUsRUFBRSxDQUFDO0FBQ2Isb0JBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNiLHNCQUFNO0FBQUEsQUFDVixpQkFBSyxPQUFPO0FBQ1IscUJBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ25CLHNCQUFNO0FBQUEsQUFDVixpQkFBSyxPQUFPO0FBQ1IsMEJBQVUsRUFBRSxDQUFDO0FBQ2Isc0JBQU07QUFBQSxTQUNULENBQUM7S0FFTCxDQUFDOztBQUVGLFFBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO0NBQ3RELENBQUEsQ0FBQyxRQUFRLEVBQUUsQ0FBQzs7Ozs7OztJQU9RLE1BQU07Ozs7Ozs7Ozs7QUFTWixhQVRNLE1BQU0sQ0FTWCxRQUFRLEVBQUU7OEJBVEwsTUFBTTs7QUFXbkIsWUFBSSxRQUFRLElBQUksaUJBQWlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQzs7QUFFdEUsWUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7QUFDNUIsWUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs7QUFFNUMsWUFBSSxDQUFDLGNBQWMsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7OztBQUczRSxrQkFBVSxHQUFHLEdBQUcsR0FBRyxVQUFVLEdBQUcsS0FBSyxDQUFDOzs7O0FBSXRDLFlBQUksSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDOUIsZ0JBQUksRUFBRSx3QkFBd0I7U0FDakMsQ0FBQyxDQUFDOzs7QUFHSCxZQUFJLENBQUMsT0FBTyxHQUFHLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzs7O0FBR3JELFlBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLFVBQVUsT0FBTyxFQUFFO0FBQ3hDLG1CQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMvQixDQUFDOzs7QUFHRixZQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztBQUNyQixpQkFBSyxFQUFFLE9BQU87U0FDakIsQ0FBQyxDQUFDO0tBQ047Ozs7Ozs7O2lCQXZDZ0IsTUFBTTs7Ozs7O2VBOEdqQixrQkFBRztBQUNMLGdCQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7QUFDOUIscUJBQUssRUFBRSxPQUFPO2FBQ2pCLENBQUMsQ0FBQztTQUNOOzs7Ozs7Ozs7O2VBdkRhLGlCQUFDLElBQUksRUFBRTtBQUNqQixnQkFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO0FBQzlCLHFCQUFLLEVBQUUsT0FBTztBQUNkLHdCQUFRLEVBQUUsSUFBSTthQUNqQixDQUFDLENBQUM7QUFDSCxtQkFBTyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNoRDs7Ozs7Ozs7ZUFNVyxpQkFBRztBQUNYLG1CQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7QUFDMUMsZ0JBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7U0FDMUI7Ozs7Ozs7Ozs7Ozs7YUE1QmtCLGVBQUc7QUFDbEIsZ0JBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7QUFDbEIsb0JBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2FBQ2pEO0FBQ0QsbUJBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzFCOzs7YUFrQ3VCLGFBQUMsUUFBUSxFQUFFO0FBQy9CLGdCQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsR0FBRyxRQUFRLENBQUM7O0FBRXhDLHlCQUFhLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDOzs7QUFHbkMsZ0JBQUcsUUFBUSxLQUFLLEtBQUssRUFBRSxPQUFPOzs7QUFHOUIsZ0JBQUksQ0FBQyxjQUFjLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1NBQzlFOzs7Ozs7OzthQVF1QixlQUFHO0FBQ3ZCLG1CQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDO1NBQ3ZDOzs7V0F6R2dCLE1BQU07OztxQkFBTixNQUFNOzs7O0FDM0UzQixZQUFZLENBQUM7Ozs7dUJBRU8sV0FBVzs7Ozt3QkFDVixZQUFZOzs7O0FBRWpDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyx1QkFBVSxDQUFDO0FBQzdCLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSx3QkFBVyxDQUFDOzs7QUNQL0IsWUFBWSxDQUFDOzs7Ozs7Ozs7Ozs7OztJQU1RLElBQUk7YUFBSixJQUFJOzhCQUFKLElBQUk7OztpQkFBSixJQUFJOzs7Ozs7Ozs7Ozs7OztlQWFOLGtCQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRTtBQUMxQyxnQkFBSSxPQUFPLENBQUM7QUFDWixtQkFBTyxZQUFZO0FBQ2Ysb0JBQUksT0FBTyxHQUFHLElBQUk7b0JBQ2QsSUFBSSxHQUFHLFNBQVMsQ0FBQztBQUNyQixvQkFBSSxLQUFLLEdBQUcsU0FBUixLQUFLLEdBQWU7QUFDcEIsMkJBQU8sR0FBRyxJQUFJLENBQUM7QUFDZix3QkFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztpQkFDM0MsQ0FBQztBQUNGLG9CQUFJLE9BQU8sR0FBRyxTQUFTLElBQUksQ0FBQyxPQUFPLENBQUM7QUFDcEMsNEJBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN0Qix1QkFBTyxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDbEMsb0JBQUksT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ3hDLENBQUM7U0FDTDs7Ozs7Ozs7Ozs7O2VBVXNCLDBCQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRTtBQUNyRCxtQkFBTyxHQUFHLE9BQU8sSUFBSSxLQUFLLENBQUM7QUFDM0IsZ0JBQUksV0FBVyxJQUFJLE9BQVEsTUFBTSxDQUFDLFdBQVcsQUFBQyxFQUFFO0FBQzVDLHVCQUFPLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQzthQUNwRCxNQUFNLElBQUksTUFBTSxDQUFDLGdCQUFnQixFQUFFO0FBQ2hDLHVCQUFPLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2FBQzNEO1NBQ0o7Ozs7Ozs7OztlQW1Dc0IsNEJBQUc7QUFDdEIsbUJBQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztTQUN6Qzs7Ozs7Ozs7OztlQVFrQixzQkFBQyxPQUFPLEVBQUU7QUFDekIscUJBQVMsRUFBRSxHQUFHO0FBQ1YsdUJBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUEsR0FBSSxPQUFPLENBQUMsQ0FDM0MsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUNaLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNyQjs7QUFFRCxnQkFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDOztBQUVkLGdCQUFJLE9BQU8sS0FBSyxLQUFLLEVBQUU7QUFDbkIsbUJBQUcsR0FBRyxFQUFFLENBQUM7YUFDWjs7QUFFRCxtQkFBTyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxFQUFFLEdBQUcsR0FBRyxHQUFHLEVBQUUsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEVBQUUsR0FBRyxHQUFHLEdBQzNELEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDO1NBQzFCOzs7Ozs7Ozs7ZUFPZ0Isb0JBQUMsR0FBRyxFQUFFO0FBQ25CLGdCQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7O0FBRWhCLGlCQUFLLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRTtBQUNqQixzQkFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUMxQjs7QUFFRCxtQkFBTyxNQUFNLENBQUM7U0FDakI7OztlQUVZLGdCQUFDLE1BQU0sRUFBRTs7QUFFbEIsa0JBQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ3hCLHVCQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDaEIsQ0FBQyxDQUFDOztBQUVILGdCQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7O0FBRXpDLGdCQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUNqQixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUVwQixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUEsR0FBSSxHQUFHLENBQUM7U0FDdEQ7Ozs7Ozs7YUFuRjJCLGVBQUc7QUFDM0IsZ0JBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQzs7O0FBR3RCLGdCQUFJLE1BQU0sSUFBSSxRQUFRLEVBQ2xCLE9BQU8sa0JBQWtCLENBQUMsS0FDekIsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUEsSUFBSyxRQUFRLEVBQ3ZDLE9BQU8scUJBQXFCLENBQUMsS0FDNUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUEsSUFBSyxRQUFRLEVBQzFDLE9BQU8sd0JBQXdCLENBQUMsS0FDL0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUEsSUFBSyxRQUFRLEVBQ3RDLE9BQU8sb0JBQW9CLENBQUM7U0FDbkM7Ozs7Ozs7YUFLeUIsZUFBRztBQUN6QixnQkFBSSxRQUFRLElBQUksUUFBUSxFQUFFLE9BQU8sUUFBUSxDQUFDO0FBQzFDLGdCQUFJLFdBQVcsSUFBSSxRQUFRLEVBQUUsT0FBTyxXQUFXLENBQUM7QUFDaEQsZ0JBQUksY0FBYyxJQUFJLFFBQVEsRUFBRSxPQUFPLGNBQWMsQ0FBQztBQUN0RCxnQkFBSSxVQUFVLElBQUksUUFBUSxFQUFFLE9BQU8sVUFBVSxDQUFDO1NBQ2pEOzs7V0F4RWdCLElBQUk7OztxQkFBSixJQUFJIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyByZXNvbHZlcyAuIGFuZCAuLiBlbGVtZW50cyBpbiBhIHBhdGggYXJyYXkgd2l0aCBkaXJlY3RvcnkgbmFtZXMgdGhlcmVcbi8vIG11c3QgYmUgbm8gc2xhc2hlcywgZW1wdHkgZWxlbWVudHMsIG9yIGRldmljZSBuYW1lcyAoYzpcXCkgaW4gdGhlIGFycmF5XG4vLyAoc28gYWxzbyBubyBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIC0gaXQgZG9lcyBub3QgZGlzdGluZ3Vpc2hcbi8vIHJlbGF0aXZlIGFuZCBhYnNvbHV0ZSBwYXRocylcbmZ1bmN0aW9uIG5vcm1hbGl6ZUFycmF5KHBhcnRzLCBhbGxvd0Fib3ZlUm9vdCkge1xuICAvLyBpZiB0aGUgcGF0aCB0cmllcyB0byBnbyBhYm92ZSB0aGUgcm9vdCwgYHVwYCBlbmRzIHVwID4gMFxuICB2YXIgdXAgPSAwO1xuICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgbGFzdCA9IHBhcnRzW2ldO1xuICAgIGlmIChsYXN0ID09PSAnLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmIChhbGxvd0Fib3ZlUm9vdCkge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgcGFydHMudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydHM7XG59XG5cbi8vIFNwbGl0IGEgZmlsZW5hbWUgaW50byBbcm9vdCwgZGlyLCBiYXNlbmFtZSwgZXh0XSwgdW5peCB2ZXJzaW9uXG4vLyAncm9vdCcgaXMganVzdCBhIHNsYXNoLCBvciBub3RoaW5nLlxudmFyIHNwbGl0UGF0aFJlID1cbiAgICAvXihcXC8/fCkoW1xcc1xcU10qPykoKD86XFwuezEsMn18W15cXC9dKz98KShcXC5bXi5cXC9dKnwpKSg/OltcXC9dKikkLztcbnZhciBzcGxpdFBhdGggPSBmdW5jdGlvbihmaWxlbmFtZSkge1xuICByZXR1cm4gc3BsaXRQYXRoUmUuZXhlYyhmaWxlbmFtZSkuc2xpY2UoMSk7XG59O1xuXG4vLyBwYXRoLnJlc29sdmUoW2Zyb20gLi4uXSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJlc29sdmVkUGF0aCA9ICcnLFxuICAgICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuXG4gIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSA+PSAtMSAmJiAhcmVzb2x2ZWRBYnNvbHV0ZTsgaS0tKSB7XG4gICAgdmFyIHBhdGggPSAoaSA+PSAwKSA/IGFyZ3VtZW50c1tpXSA6IHByb2Nlc3MuY3dkKCk7XG5cbiAgICAvLyBTa2lwIGVtcHR5IGFuZCBpbnZhbGlkIGVudHJpZXNcbiAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5yZXNvbHZlIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH0gZWxzZSBpZiAoIXBhdGgpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc29sdmVkUGF0aCA9IHBhdGggKyAnLycgKyByZXNvbHZlZFBhdGg7XG4gICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckF0KDApID09PSAnLyc7XG4gIH1cblxuICAvLyBBdCB0aGlzIHBvaW50IHRoZSBwYXRoIHNob3VsZCBiZSByZXNvbHZlZCB0byBhIGZ1bGwgYWJzb2x1dGUgcGF0aCwgYnV0XG4gIC8vIGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBwcm9jZXNzLmN3ZCgpIGZhaWxzKVxuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICByZXNvbHZlZFBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocmVzb2x2ZWRQYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIXJlc29sdmVkQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICByZXR1cm4gKChyZXNvbHZlZEFic29sdXRlID8gJy8nIDogJycpICsgcmVzb2x2ZWRQYXRoKSB8fCAnLic7XG59O1xuXG4vLyBwYXRoLm5vcm1hbGl6ZShwYXRoKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5ub3JtYWxpemUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBpc0Fic29sdXRlID0gZXhwb3J0cy5pc0Fic29sdXRlKHBhdGgpLFxuICAgICAgdHJhaWxpbmdTbGFzaCA9IHN1YnN0cihwYXRoLCAtMSkgPT09ICcvJztcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihwYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIWlzQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICBpZiAoIXBhdGggJiYgIWlzQWJzb2x1dGUpIHtcbiAgICBwYXRoID0gJy4nO1xuICB9XG4gIGlmIChwYXRoICYmIHRyYWlsaW5nU2xhc2gpIHtcbiAgICBwYXRoICs9ICcvJztcbiAgfVxuXG4gIHJldHVybiAoaXNBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHBhdGg7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmlzQWJzb2x1dGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5qb2luID0gZnVuY3Rpb24oKSB7XG4gIHZhciBwYXRocyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gIHJldHVybiBleHBvcnRzLm5vcm1hbGl6ZShmaWx0ZXIocGF0aHMsIGZ1bmN0aW9uKHAsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBwICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGguam9pbiBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9XG4gICAgcmV0dXJuIHA7XG4gIH0pLmpvaW4oJy8nKSk7XG59O1xuXG5cbi8vIHBhdGgucmVsYXRpdmUoZnJvbSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlbGF0aXZlID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgZnJvbSA9IGV4cG9ydHMucmVzb2x2ZShmcm9tKS5zdWJzdHIoMSk7XG4gIHRvID0gZXhwb3J0cy5yZXNvbHZlKHRvKS5zdWJzdHIoMSk7XG5cbiAgZnVuY3Rpb24gdHJpbShhcnIpIHtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoOyBzdGFydCA8IGFyci5sZW5ndGg7IHN0YXJ0KyspIHtcbiAgICAgIGlmIChhcnJbc3RhcnRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFyIGVuZCA9IGFyci5sZW5ndGggLSAxO1xuICAgIGZvciAoOyBlbmQgPj0gMDsgZW5kLS0pIHtcbiAgICAgIGlmIChhcnJbZW5kXSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChzdGFydCA+IGVuZCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBhcnIuc2xpY2Uoc3RhcnQsIGVuZCAtIHN0YXJ0ICsgMSk7XG4gIH1cblxuICB2YXIgZnJvbVBhcnRzID0gdHJpbShmcm9tLnNwbGl0KCcvJykpO1xuICB2YXIgdG9QYXJ0cyA9IHRyaW0odG8uc3BsaXQoJy8nKSk7XG5cbiAgdmFyIGxlbmd0aCA9IE1hdGgubWluKGZyb21QYXJ0cy5sZW5ndGgsIHRvUGFydHMubGVuZ3RoKTtcbiAgdmFyIHNhbWVQYXJ0c0xlbmd0aCA9IGxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChmcm9tUGFydHNbaV0gIT09IHRvUGFydHNbaV0pIHtcbiAgICAgIHNhbWVQYXJ0c0xlbmd0aCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICB2YXIgb3V0cHV0UGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IHNhbWVQYXJ0c0xlbmd0aDsgaSA8IGZyb21QYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIG91dHB1dFBhcnRzLnB1c2goJy4uJyk7XG4gIH1cblxuICBvdXRwdXRQYXJ0cyA9IG91dHB1dFBhcnRzLmNvbmNhdCh0b1BhcnRzLnNsaWNlKHNhbWVQYXJ0c0xlbmd0aCkpO1xuXG4gIHJldHVybiBvdXRwdXRQYXJ0cy5qb2luKCcvJyk7XG59O1xuXG5leHBvcnRzLnNlcCA9ICcvJztcbmV4cG9ydHMuZGVsaW1pdGVyID0gJzonO1xuXG5leHBvcnRzLmRpcm5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciByZXN1bHQgPSBzcGxpdFBhdGgocGF0aCksXG4gICAgICByb290ID0gcmVzdWx0WzBdLFxuICAgICAgZGlyID0gcmVzdWx0WzFdO1xuXG4gIGlmICghcm9vdCAmJiAhZGlyKSB7XG4gICAgLy8gTm8gZGlybmFtZSB3aGF0c29ldmVyXG4gICAgcmV0dXJuICcuJztcbiAgfVxuXG4gIGlmIChkaXIpIHtcbiAgICAvLyBJdCBoYXMgYSBkaXJuYW1lLCBzdHJpcCB0cmFpbGluZyBzbGFzaFxuICAgIGRpciA9IGRpci5zdWJzdHIoMCwgZGlyLmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgcmV0dXJuIHJvb3QgKyBkaXI7XG59O1xuXG5cbmV4cG9ydHMuYmFzZW5hbWUgPSBmdW5jdGlvbihwYXRoLCBleHQpIHtcbiAgdmFyIGYgPSBzcGxpdFBhdGgocGF0aClbMl07XG4gIC8vIFRPRE86IG1ha2UgdGhpcyBjb21wYXJpc29uIGNhc2UtaW5zZW5zaXRpdmUgb24gd2luZG93cz9cbiAgaWYgKGV4dCAmJiBmLnN1YnN0cigtMSAqIGV4dC5sZW5ndGgpID09PSBleHQpIHtcbiAgICBmID0gZi5zdWJzdHIoMCwgZi5sZW5ndGggLSBleHQubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZjtcbn07XG5cblxuZXhwb3J0cy5leHRuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gc3BsaXRQYXRoKHBhdGgpWzNdO1xufTtcblxuZnVuY3Rpb24gZmlsdGVyICh4cywgZikge1xuICAgIGlmICh4cy5maWx0ZXIpIHJldHVybiB4cy5maWx0ZXIoZik7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGYoeHNbaV0sIGksIHhzKSkgcmVzLnB1c2goeHNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuXG4vLyBTdHJpbmcucHJvdG90eXBlLnN1YnN0ciAtIG5lZ2F0aXZlIGluZGV4IGRvbid0IHdvcmsgaW4gSUU4XG52YXIgc3Vic3RyID0gJ2FiJy5zdWJzdHIoLTEpID09PSAnYidcbiAgICA/IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHsgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbikgfVxuICAgIDogZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikge1xuICAgICAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IHN0ci5sZW5ndGggKyBzdGFydDtcbiAgICAgICAgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbik7XG4gICAgfVxuO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIvKiFcbiAqIG1pbWUtdHlwZXNcbiAqIENvcHlyaWdodChjKSAyMDE0IEpvbmF0aGFuIE9uZ1xuICogQ29weXJpZ2h0KGMpIDIwMTUgRG91Z2xhcyBDaHJpc3RvcGhlciBXaWxzb25cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbid1c2Ugc3RyaWN0J1xuXG4vKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKiBAcHJpdmF0ZVxuICovXG5cbnZhciBkYiA9IHJlcXVpcmUoJ21pbWUtZGInKVxudmFyIGV4dG5hbWUgPSByZXF1aXJlKCdwYXRoJykuZXh0bmFtZVxuXG4vKipcbiAqIE1vZHVsZSB2YXJpYWJsZXMuXG4gKiBAcHJpdmF0ZVxuICovXG5cbnZhciBleHRyYWN0VHlwZVJlZ0V4cCA9IC9eXFxzKihbXjtcXHNdKikoPzo7fFxcc3wkKS9cbnZhciB0ZXh0VHlwZVJlZ0V4cCA9IC9edGV4dFxcLy9pXG5cbi8qKlxuICogTW9kdWxlIGV4cG9ydHMuXG4gKiBAcHVibGljXG4gKi9cblxuZXhwb3J0cy5jaGFyc2V0ID0gY2hhcnNldFxuZXhwb3J0cy5jaGFyc2V0cyA9IHsgbG9va3VwOiBjaGFyc2V0IH1cbmV4cG9ydHMuY29udGVudFR5cGUgPSBjb250ZW50VHlwZVxuZXhwb3J0cy5leHRlbnNpb24gPSBleHRlbnNpb25cbmV4cG9ydHMuZXh0ZW5zaW9ucyA9IE9iamVjdC5jcmVhdGUobnVsbClcbmV4cG9ydHMubG9va3VwID0gbG9va3VwXG5leHBvcnRzLnR5cGVzID0gT2JqZWN0LmNyZWF0ZShudWxsKVxuXG4vLyBQb3B1bGF0ZSB0aGUgZXh0ZW5zaW9ucy90eXBlcyBtYXBzXG5wb3B1bGF0ZU1hcHMoZXhwb3J0cy5leHRlbnNpb25zLCBleHBvcnRzLnR5cGVzKVxuXG4vKipcbiAqIEdldCB0aGUgZGVmYXVsdCBjaGFyc2V0IGZvciBhIE1JTUUgdHlwZS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICogQHJldHVybiB7Ym9vbGVhbnxzdHJpbmd9XG4gKi9cblxuZnVuY3Rpb24gY2hhcnNldCh0eXBlKSB7XG4gIGlmICghdHlwZSB8fCB0eXBlb2YgdHlwZSAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIFRPRE86IHVzZSBtZWRpYS10eXBlclxuICB2YXIgbWF0Y2ggPSBleHRyYWN0VHlwZVJlZ0V4cC5leGVjKHR5cGUpXG4gIHZhciBtaW1lID0gbWF0Y2ggJiYgZGJbbWF0Y2hbMV0udG9Mb3dlckNhc2UoKV1cblxuICBpZiAobWltZSAmJiBtaW1lLmNoYXJzZXQpIHtcbiAgICByZXR1cm4gbWltZS5jaGFyc2V0XG4gIH1cblxuICAvLyBkZWZhdWx0IHRleHQvKiB0byB1dGYtOFxuICBpZiAobWF0Y2ggJiYgdGV4dFR5cGVSZWdFeHAudGVzdChtYXRjaFsxXSkpIHtcbiAgICByZXR1cm4gJ1VURi04J1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogQ3JlYXRlIGEgZnVsbCBDb250ZW50LVR5cGUgaGVhZGVyIGdpdmVuIGEgTUlNRSB0eXBlIG9yIGV4dGVuc2lvbi5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtib29sZWFufHN0cmluZ31cbiAqL1xuXG5mdW5jdGlvbiBjb250ZW50VHlwZShzdHIpIHtcbiAgLy8gVE9ETzogc2hvdWxkIHRoaXMgZXZlbiBiZSBpbiB0aGlzIG1vZHVsZT9cbiAgaWYgKCFzdHIgfHwgdHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIHZhciBtaW1lID0gc3RyLmluZGV4T2YoJy8nKSA9PT0gLTFcbiAgICA/IGV4cG9ydHMubG9va3VwKHN0cilcbiAgICA6IHN0clxuXG4gIGlmICghbWltZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLy8gVE9ETzogdXNlIGNvbnRlbnQtdHlwZSBvciBvdGhlciBtb2R1bGVcbiAgaWYgKG1pbWUuaW5kZXhPZignY2hhcnNldCcpID09PSAtMSkge1xuICAgIHZhciBjaGFyc2V0ID0gZXhwb3J0cy5jaGFyc2V0KG1pbWUpXG4gICAgaWYgKGNoYXJzZXQpIG1pbWUgKz0gJzsgY2hhcnNldD0nICsgY2hhcnNldC50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICByZXR1cm4gbWltZVxufVxuXG4vKipcbiAqIEdldCB0aGUgZGVmYXVsdCBleHRlbnNpb24gZm9yIGEgTUlNRSB0eXBlLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gKiBAcmV0dXJuIHtib29sZWFufHN0cmluZ31cbiAqL1xuXG5mdW5jdGlvbiBleHRlbnNpb24odHlwZSkge1xuICBpZiAoIXR5cGUgfHwgdHlwZW9mIHR5cGUgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBUT0RPOiB1c2UgbWVkaWEtdHlwZXJcbiAgdmFyIG1hdGNoID0gZXh0cmFjdFR5cGVSZWdFeHAuZXhlYyh0eXBlKVxuXG4gIC8vIGdldCBleHRlbnNpb25zXG4gIHZhciBleHRzID0gbWF0Y2ggJiYgZXhwb3J0cy5leHRlbnNpb25zW21hdGNoWzFdLnRvTG93ZXJDYXNlKCldXG5cbiAgaWYgKCFleHRzIHx8ICFleHRzLmxlbmd0aCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgcmV0dXJuIGV4dHNbMF1cbn1cblxuLyoqXG4gKiBMb29rdXAgdGhlIE1JTUUgdHlwZSBmb3IgYSBmaWxlIHBhdGgvZXh0ZW5zaW9uLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtib29sZWFufHN0cmluZ31cbiAqL1xuXG5mdW5jdGlvbiBsb29rdXAocGF0aCkge1xuICBpZiAoIXBhdGggfHwgdHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBnZXQgdGhlIGV4dGVuc2lvbiAoXCJleHRcIiBvciBcIi5leHRcIiBvciBmdWxsIHBhdGgpXG4gIHZhciBleHRlbnNpb24gPSBleHRuYW1lKCd4LicgKyBwYXRoKVxuICAgIC50b0xvd2VyQ2FzZSgpXG4gICAgLnN1YnN0cigxKVxuXG4gIGlmICghZXh0ZW5zaW9uKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICByZXR1cm4gZXhwb3J0cy50eXBlc1tleHRlbnNpb25dIHx8IGZhbHNlXG59XG5cbi8qKlxuICogUG9wdWxhdGUgdGhlIGV4dGVuc2lvbnMgYW5kIHR5cGVzIG1hcHMuXG4gKiBAcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBvcHVsYXRlTWFwcyhleHRlbnNpb25zLCB0eXBlcykge1xuICAvLyBzb3VyY2UgcHJlZmVyZW5jZSAobGVhc3QgLT4gbW9zdClcbiAgdmFyIHByZWZlcmVuY2UgPSBbJ25naW54JywgJ2FwYWNoZScsIHVuZGVmaW5lZCwgJ2lhbmEnXVxuXG4gIE9iamVjdC5rZXlzKGRiKS5mb3JFYWNoKGZ1bmN0aW9uIGZvckVhY2hNaW1lVHlwZSh0eXBlKSB7XG4gICAgdmFyIG1pbWUgPSBkYlt0eXBlXVxuICAgIHZhciBleHRzID0gbWltZS5leHRlbnNpb25zXG5cbiAgICBpZiAoIWV4dHMgfHwgIWV4dHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBtaW1lIC0+IGV4dGVuc2lvbnNcbiAgICBleHRlbnNpb25zW3R5cGVdID0gZXh0c1xuXG4gICAgLy8gZXh0ZW5zaW9uIC0+IG1pbWVcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV4dHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBleHRlbnNpb24gPSBleHRzW2ldXG5cbiAgICAgIGlmICh0eXBlc1tleHRlbnNpb25dKSB7XG4gICAgICAgIHZhciBmcm9tID0gcHJlZmVyZW5jZS5pbmRleE9mKGRiW3R5cGVzW2V4dGVuc2lvbl1dLnNvdXJjZSlcbiAgICAgICAgdmFyIHRvID0gcHJlZmVyZW5jZS5pbmRleE9mKG1pbWUuc291cmNlKVxuXG4gICAgICAgIGlmICh0eXBlc1tleHRlbnNpb25dICE9PSAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ1xuICAgICAgICAgICYmIGZyb20gPiB0byB8fCAoZnJvbSA9PT0gdG8gJiYgdHlwZXNbZXh0ZW5zaW9uXS5zdWJzdHIoMCwgMTIpID09PSAnYXBwbGljYXRpb24vJykpIHtcbiAgICAgICAgICAvLyBza2lwIHRoZSByZW1hcHBpbmdcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBzZXQgdGhlIGV4dGVuc2lvbiAtPiBtaW1lXG4gICAgICB0eXBlc1tleHRlbnNpb25dID0gdHlwZVxuICAgIH1cbiAgfSlcbn1cbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJhcHBsaWNhdGlvbi8xZC1pbnRlcmxlYXZlZC1wYXJpdHlmZWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vM2dwZGFzaC1xb2UtcmVwb3J0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi8zZ3BwLWltcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYTJsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2FjdGl2ZW1lc3NhZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYWx0by1jb3N0bWFwK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9hbHRvLWNvc3RtYXBmaWx0ZXIranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2FsdG8tZGlyZWN0b3J5K2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9hbHRvLWVuZHBvaW50Y29zdCtqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYWx0by1lbmRwb2ludGNvc3RwYXJhbXMranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2FsdG8tZW5kcG9pbnRwcm9wK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9hbHRvLWVuZHBvaW50cHJvcHBhcmFtcytqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYWx0by1lcnJvcitqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYWx0by1uZXR3b3JrbWFwK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9hbHRvLW5ldHdvcmttYXBmaWx0ZXIranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2FtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9hbmRyZXctaW5zZXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJlelwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2FwcGxlZmlsZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9hcHBsaXh3YXJlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhd1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2F0ZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9hdGZ4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2F0b20reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhdG9tXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYXRvbWNhdCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhdG9tY2F0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYXRvbWRlbGV0ZWQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2F0b21pY21haWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYXRvbXN2Yyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhdG9tc3ZjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYXR4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYXV0aC1wb2xpY3kreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2JhY25ldC14ZGQremlwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2JhdGNoLXNtdHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vYmRvY1wiOiB7XG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImJkb2NcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9iZWVwK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jYWxlbmRhcitqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY2FsZW5kYXIreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2NhbGwtY29tcGxldGlvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jYWxzLTE4NDBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY2JvclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jY21wK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jY3htbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjY3htbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2NkZngreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2NkbWktY2FwYWJpbGl0eVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNkbWlhXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY2RtaS1jb250YWluZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjZG1pY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2NkbWktZG9tYWluXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2RtaWRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jZG1pLW9iamVjdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNkbWlvXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY2RtaS1xdWV1ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNkbWlxXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY2VhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2NlYS0yMDE4K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jZWxsbWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2Nmd1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jbXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY25ycCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY29hcC1ncm91cCtqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY29tbW9uZ3JvdW5kXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2NvbmZlcmVuY2UtaW5mbyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY3BsK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jc3JhdHRyc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jc3RhK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9jc3RhZGF0YSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY3Utc2VlbWVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImN1XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vY3liZXJjYXNoXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2RhcnRcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9kYXNoK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1kcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2Rhc2hkZWx0YVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9kYXZtb3VudCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkYXZtb3VudFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2RjYS1yZnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZGNkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2RlYy1keFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9kaWFsb2ctaW5mbyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZGljb21cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZGlpXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2RpdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9kbnNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZG9jYm9vayt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRia1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2Rza3BwK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9kc3NjK2RlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRzc2NcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9kc3NjK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhkc3NjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZHZjc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9lY21hc2NyaXB0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJlY21hXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZWRpLWNvbnNlbnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZWRpLXgxMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2VcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9lZGlmYWN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2VtbWEreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZW1tYVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2Vtb3Rpb25tbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZW5jYXBydHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZXBwK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9lcHViK3ppcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImVwdWJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9lc2hvcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9leGlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJleGlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9mYXN0aW5mb3NldFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9mYXN0c29hcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9mZHQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2ZpdHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZm9udC1zZm50XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2ZvbnQtdGRwZnJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwZnJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9mb250LXdvZmZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3b2ZmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZm9udC13b2ZmMlwiOiB7XG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndvZmYyXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZnJhbWV3b3JrLWF0dHJpYnV0ZXMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2dtbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImdtbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2dweCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImdweFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2d4ZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZ3hmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vZ3ppcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2VcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9oMjI0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2hlbGQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2h0dHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vaHlwZXJzdHVkaW9cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzdGtcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9pYmUta2V5LXJlcXVlc3QreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2liZS1wa2ctcmVwbHkreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2liZS1wcC1kYXRhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2lnZXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vaW0taXNjb21wb3NpbmcreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2luZGV4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2luZGV4LmNtZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9pbmRleC5vYmpcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vaW5kZXgucmVzcG9uc2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vaW5kZXgudm5kXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2lua21sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImlua1wiLFwiaW5rbWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9pb3RwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2lwZml4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaXBmaXhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9pcHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vaXN1cFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9pdHMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2phdmEtYXJjaGl2ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiamFyXCIsXCJ3YXJcIixcImVhclwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2phdmEtc2VyaWFsaXplZC1vYmplY3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNlclwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2phdmEtdm1cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNsYXNzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vamF2YXNjcmlwdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjaGFyc2V0XCI6IFwiVVRGLThcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJqc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2pvc2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vam9zZStqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vanJkK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9qc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNoYXJzZXRcIjogXCJVVEYtOFwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImpzb25cIixcIm1hcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2pzb24tcGF0Y2granNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2pzb24tc2VxXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2pzb241XCI6IHtcbiAgICBcImV4dGVuc2lvbnNcIjogW1wianNvbjVcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9qc29ubWwranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJqc29ubWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9qd2sranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2p3ay1zZXQranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2p3dFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9rcG1sLXJlcXVlc3QreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2twbWwtcmVzcG9uc2UreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2xkK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImpzb25sZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL2xpbmstZm9ybWF0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2xvYWQtY29udHJvbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbG9zdCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJsb3N0eG1sXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbG9zdHN5bmMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL2x4ZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tYWMtYmluaGV4NDBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJocXhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tYWMtY29tcGFjdHByb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY3B0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWFjd3JpdGVpaVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tYWRzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1hZHNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tYW5pZmVzdCtqc29uXCI6IHtcbiAgICBcImNoYXJzZXRcIjogXCJVVEYtOFwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndlYm1hbmlmZXN0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWFyY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1yY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL21hcmN4bWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXJjeFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL21hdGhlbWF0aWNhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWFcIixcIm5iXCIsXCJtYlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL21hdGhtbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtYXRobWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tYXRobWwtY29udGVudCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWF0aG1sLXByZXNlbnRhdGlvbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWJtcy1hc3NvY2lhdGVkLXByb2NlZHVyZS1kZXNjcmlwdGlvbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWJtcy1kZXJlZ2lzdGVyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tYm1zLWVudmVsb3BlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tYm1zLW1zayt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWJtcy1tc2stcmVzcG9uc2UreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21ibXMtcHJvdGVjdGlvbi1kZXNjcmlwdGlvbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWJtcy1yZWNlcHRpb24tcmVwb3J0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tYm1zLXJlZ2lzdGVyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tYm1zLXJlZ2lzdGVyLXJlc3BvbnNlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tYm1zLXNjaGVkdWxlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tYm1zLXVzZXItc2VydmljZS1kZXNjcmlwdGlvbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWJveFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1ib3hcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tZWRpYS1wb2xpY3ktZGF0YXNldCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWVkaWFfY29udHJvbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWVkaWFzZXJ2ZXJjb250cm9sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1zY21sXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWVyZ2UtcGF0Y2granNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL21ldGFsaW5rK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWV0YWxpbmtcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tZXRhbGluazQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWV0YTRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tZXRzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1ldHNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tZjRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbWlrZXlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbW9kcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtb2RzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbW9zcy1rZXlzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21vc3Mtc2lnbmF0dXJlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21vc3NrZXktZGF0YVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tb3Nza2V5LXJlcXVlc3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbXAyMVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm0yMVwiLFwibXAyMVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL21wNFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1wNHNcIixcIm00cFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL21wZWc0LWdlbmVyaWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbXBlZzQtaW9kXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL21wZWc0LWlvZC14bXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbXJiLWNvbnN1bWVyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tcmItcHVibGlzaCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbXNjLWl2cit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbXNjLW1peGVyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9tc3dvcmRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkb2NcIixcImRvdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL214ZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm14ZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL25hc2RhdGFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbmV3cy1jaGVja2dyb3Vwc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9uZXdzLWdyb3VwaW5mb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9uZXdzLXRyYW5zbWlzc2lvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9ubHNtbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vbnNzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL29jc3AtcmVxdWVzdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9vY3NwLXJlc3BvbnNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImJpblwiLFwiZG1zXCIsXCJscmZcIixcIm1hclwiLFwic29cIixcImRpc3RcIixcImRpc3R6XCIsXCJwa2dcIixcImJwa1wiLFwiZHVtcFwiLFwiZWxjXCIsXCJkZXBsb3lcIixcImV4ZVwiLFwiZGxsXCIsXCJkZWJcIixcImRtZ1wiLFwiaXNvXCIsXCJpbWdcIixcIm1zaVwiLFwibXNwXCIsXCJtc21cIixcImJ1ZmZlclwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL29kYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9kYVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL29keFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9vZWJwcy1wYWNrYWdlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9wZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL29nZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9neFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL29tZG9jK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib21kb2NcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9vbmVub3RlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvbmV0b2NcIixcIm9uZXRvYzJcIixcIm9uZXRtcFwiLFwib25lcGtnXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vb3hwc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm94cHNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wMnAtb3ZlcmxheSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcGFyaXR5ZmVjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3BhdGNoLW9wcy1lcnJvcit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4ZXJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wZGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwZGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wZHhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcGdwLWVuY3J5cHRlZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBncFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3BncC1rZXlzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3BncC1zaWduYXR1cmVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhc2NcIixcInNpZ1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3BpY3MtcnVsZXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInByZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3BpZGYreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3BpZGYtZGlmZit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcGtjczEwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicDEwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcGtjczctbWltZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInA3bVwiLFwicDdjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcGtjczctc2lnbmF0dXJlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicDdzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcGtjczhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwOFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3BraXgtYXR0ci1jZXJ0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYWNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wa2l4LWNlcnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjZXJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wa2l4LWNybFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNybFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3BraXgtcGtpcGF0aFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBraXBhdGhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wa2l4Y21wXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicGtpXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcGxzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBsc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3BvYy1zZXR0aW5ncyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcG9zdHNjcmlwdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYWlcIixcImVwc1wiLFwicHNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wcm92ZW5hbmNlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wcnMuYWx2ZXN0cmFuZC50aXRyYXgtc2hlZXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcHJzLmN3d1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImN3d1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3Bycy5ocHViK3ppcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9wcnMubnByZW5kXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3Bycy5wbHVja2VyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3Bycy5yZGYteG1sLWNyeXB0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3Bycy54c2YreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3Bza2MreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHNrY3htbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3FzaWdcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcmFwdG9yZmVjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3JkYXAranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3JkZit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJkZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3JlZ2luZm8reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicmlmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcmVsYXgtbmctY29tcGFjdC1zeW50YXhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJybmNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9yZW1vdGUtcHJpbnRpbmdcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcmVwdXRvbitqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcmVzb3VyY2UtbGlzdHMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicmxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9yZXNvdXJjZS1saXN0cy1kaWZmK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJsZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3Jpc2Nvc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9ybG1pK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9ybHMtc2VydmljZXMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicnNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9ycGtpLWdob3N0YnVzdGVyc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImdiclwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3Jwa2ktbWFuaWZlc3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtZnRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9ycGtpLXJvYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJvYVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3Jwa2ktdXBkb3duXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3JzZCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJzZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3Jzcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicnNzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vcnRmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJydGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9ydHBsb29wYmFja1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9ydHhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc2FtbGFzc2VydGlvbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc2FtbG1ldGFkYXRhK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zYm1sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNibWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zY2FpcCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc2NpbStqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc2N2cC1jdi1yZXF1ZXN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2NxXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc2N2cC1jdi1yZXNwb25zZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNjc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NjdnAtdnAtcmVxdWVzdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNwcVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NjdnAtdnAtcmVzcG9uc2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzcHBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zZHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzZHBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zZXAreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NlcC1leGlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc2Vzc2lvbi1pbmZvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NldC1wYXltZW50XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NldC1wYXltZW50LWluaXRpYXRpb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzZXRwYXlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zZXQtcmVnaXN0cmF0aW9uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NldC1yZWdpc3RyYXRpb24taW5pdGlhdGlvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNldHJlZ1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NnbWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc2dtbC1vcGVuLWNhdGFsb2dcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc2hmK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNoZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NpZXZlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NpbXBsZS1maWx0ZXIreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NpbXBsZS1tZXNzYWdlLXN1bW1hcnlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc2ltcGxlc3ltYm9sY29udGFpbmVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NtaWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc21pbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzbWlcIixcInNtaWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zbXB0ZTMzNm1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc29hcCtmYXN0aW5mb3NldFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zb2FwK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NwYXJxbC1xdWVyeVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJxXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc3BhcnFsLXJlc3VsdHMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3J4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc3Bpcml0cy1ldmVudCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc3FsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NyZ3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJncmFtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vc3Jncyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJncnhtbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NydSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzcnVcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi9zc2RsK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3NkbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3NzbWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3NtbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3RhbXAtYXBleC11cGRhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdGFtcC1hcGV4LXVwZGF0ZS1jb25maXJtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3RhbXAtY29tbXVuaXR5LXVwZGF0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi90YW1wLWNvbW11bml0eS11cGRhdGUtY29uZmlybVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi90YW1wLWVycm9yXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3RhbXAtc2VxdWVuY2UtYWRqdXN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3RhbXAtc2VxdWVuY2UtYWRqdXN0LWNvbmZpcm1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdGFtcC1zdGF0dXMtcXVlcnlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdGFtcC1zdGF0dXMtcmVzcG9uc2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdGFtcC11cGRhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdGFtcC11cGRhdGUtY29uZmlybVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi90YXJcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi90ZWkreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widGVpXCIsXCJ0ZWljb3JwdXNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi90aHJhdWQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widGZpXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdGltZXN0YW1wLXF1ZXJ5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3RpbWVzdGFtcC1yZXBseVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi90aW1lc3RhbXBlZC1kYXRhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widHNkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdHRtbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdHZlLXRyaWdnZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdWxwZmVjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3VyYy1ncnBzaGVldCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdXJjLXJlc3NoZWV0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi91cmMtdGFyZ2V0ZGVzYyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdXJjLXVpc29ja2V0ZGVzYyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdmNhcmQranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZjYXJkK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92ZW1taVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92aXZpZGVuY2Uuc2NyaXB0ZmlsZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC4zZ3BwLmJzZit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLjNncHAucGljLWJ3LWxhcmdlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicGxiXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLjNncHAucGljLWJ3LXNtYWxsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHNiXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLjNncHAucGljLWJ3LXZhclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInB2YlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC4zZ3BwLnNtc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuM2dwcC51c3NkK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuM2dwcDIuYmNtY3NpbmZvK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuM2dwcDIuc21zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC4zZ3BwMi50Y2FwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widGNhcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC4zbS5wb3N0LWl0LW5vdGVzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHduXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFjY3BhYy5zaW1wbHkuYXNvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXNvXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFjY3BhYy5zaW1wbHkuaW1wXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaW1wXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFjdWNvYm9sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYWN1XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFjdWNvcnBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhdGNcIixcImFjdXRjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFkb2JlLmFpci1hcHBsaWNhdGlvbi1pbnN0YWxsZXItcGFja2FnZSt6aXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFpclwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hZG9iZS5mbGFzaC5tb3ZpZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYWRvYmUuZm9ybXNjZW50cmFsLmZjZHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmY2R0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFkb2JlLmZ4cFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImZ4cFwiLFwiZnhwbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hZG9iZS5wYXJ0aWFsLXVwbG9hZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYWRvYmUueGRwK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhkcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hZG9iZS54ZmRmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieGZkZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hZXRoZXIuaW1wXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5haC1iYXJjb2RlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5haGVhZC5zcGFjZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFoZWFkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFpcnppcC5maWxlc2VjdXJlLmF6ZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImF6ZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5haXJ6aXAuZmlsZXNlY3VyZS5henNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhenNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYW1hem9uLmVib29rXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhendcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYW1lcmljYW5keW5hbWljcy5hY2NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhY2NcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYW1pZ2EuYW1pXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYW1pXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFtdW5kc2VuLm1hemUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hbmRyb2lkLnBhY2thZ2UtYXJjaGl2ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXBrXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFuc2VyLXdlYi1jZXJ0aWZpY2F0ZS1pc3N1ZS1pbml0aWF0aW9uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2lpXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFuc2VyLXdlYi1mdW5kcy10cmFuc2Zlci1pbml0aWF0aW9uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmdGlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYW50aXguZ2FtZS1jb21wb25lbnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhdHhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYXBhY2hlLnRocmlmdC5iaW5hcnlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFwYWNoZS50aHJpZnQuY29tcGFjdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYXBhY2hlLnRocmlmdC5qc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hcGkranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hcHBsZS5pbnN0YWxsZXIreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXBrZ1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hcHBsZS5tcGVndXJsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibTN1OFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hcmFzdHJhLnN3aVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYXJpc3RhbmV0d29ya3Muc3dpXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3dpXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmFydHNxdWFyZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYXN0cmFlYS1zb2Z0d2FyZS5pb3RhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaW90YVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hdWRpb2dyYXBoXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYWVwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmF1dG9wYWNrYWdlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5hdmlzdGFyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYmFsc2FtaXEuYm1tbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmJhbHNhbWlxLmJtcHJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmJla2l0enVyLXN0ZWNoK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuYmlvcGF4LnJkZit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmJsdWVpY2UubXVsdGlwYXNzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXBtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmJsdWV0b290aC5lcC5vb2JcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmJsdWV0b290aC5sZS5vb2JcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmJtaVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImJtaVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5idXNpbmVzc29iamVjdHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJyZXBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY2FiLWpzY3JpcHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNhbm9uLWNwZGxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNhbm9uLWxpcHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNlbmRpby50aGlubGluYy5jbGllbnRjb25mXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jZW50dXJ5LXN5c3RlbXMudGNwX3N0cmVhbVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY2hlbWRyYXcreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2R4bWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY2hpcG51dHMua2FyYW9rZS1tbWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtbWRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY2luZGVyZWxsYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNkeVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jaXJwYWNrLmlzZG4tZXh0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jaXRhdGlvbnN0eWxlcy5zdHlsZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNsYXltb3JlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2xhXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNsb2FudG8ucnA5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicnA5XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNsb25rLmM0Z3JvdXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjNGdcIixcImM0ZFwiLFwiYzRmXCIsXCJjNHBcIixcImM0dVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jbHVldHJ1c3QuY2FydG9tb2JpbGUtY29uZmlnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYzExYW1jXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNsdWV0cnVzdC5jYXJ0b21vYmlsZS1jb25maWctcGtnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYzExYW16XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNvZmZlZXNjcmlwdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY29sbGVjdGlvbitqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNvbGxlY3Rpb24uZG9jK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY29sbGVjdGlvbi5uZXh0K2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY29tbWVyY2UtYmF0dGVsbGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNvbW1vbnNwYWNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY3NwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmNvbnRhY3QuY21zZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNkYmNtc2dcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY29zbW9jYWxsZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjbWNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY3JpY2suY2xpY2tlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNsa3hcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY3JpY2suY2xpY2tlci5rZXlib2FyZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNsa2tcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY3JpY2suY2xpY2tlci5wYWxldHRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2xrcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jcmljay5jbGlja2VyLnRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2xrdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jcmljay5jbGlja2VyLndvcmRiYW5rXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2xrd1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jcml0aWNhbHRvb2xzLndicyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3YnNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY3RjLXBvc21sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicG1sXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmN0Y3Qud3MreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jdXBzLXBkZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY3Vwcy1wb3N0c2NyaXB0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jdXBzLXBwZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBwZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jdXBzLXJhc3RlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY3Vwcy1yYXdcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmN1cmxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmN1cmwuY2FyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjYXJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY3VybC5wY3VybFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicGN1cmxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuY3lhbi5kZWFuLnJvb3QreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5jeWJhbmtcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRhcnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRhcnRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZGF0YS12aXNpb24ucmR6XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicmR6XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRlYmlhbi5iaW5hcnktcGFja2FnZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZGVjZS5kYXRhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widXZmXCIsXCJ1dnZmXCIsXCJ1dmRcIixcInV2dmRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZGVjZS50dG1sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInV2dFwiLFwidXZ2dFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kZWNlLnVuc3BlY2lmaWVkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widXZ4XCIsXCJ1dnZ4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRlY2UuemlwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widXZ6XCIsXCJ1dnZ6XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRlbm92by5mY3NlbGF5b3V0LWxpbmtcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmZV9sYXVuY2hcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZGVzbXVtZS1tb3ZpZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZGlyLWJpLnBsYXRlLWRsLW5vc3VmZml4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kbS5kZWxlZ2F0aW9uK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZG5hXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZG5hXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRvY3VtZW50K2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZG9sYnkubWxwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtbHBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZG9sYnkubW9iaWxlLjFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRvbGJ5Lm1vYmlsZS4yXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kb3JlbWlyLnNjb3JlY2xvdWQtYmluYXJ5LWRvY3VtZW50XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kcGdyYXBoXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZHBnXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmRyZWFtZmFjdG9yeVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRmYWNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHMta2V5cG9pbnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImtweHhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHRnLmxvY2FsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kdGcubG9jYWwuZmxhc2hcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmR0Zy5sb2NhbC5odG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kdmIuYWl0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYWl0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmR2Yi5kdmJqXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kdmIuZXNnY29udGFpbmVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kdmIuaXBkY2RmdG5vdGlmYWNjZXNzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kdmIuaXBkY2VzZ2FjY2Vzc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLmlwZGNlc2dhY2Nlc3MyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kdmIuaXBkY2VzZ3BkZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLmlwZGNyb2FtaW5nXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kdmIuaXB0di5hbGZlYy1iYXNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kdmIuaXB0di5hbGZlYy1lbmhhbmNlbWVudFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLm5vdGlmLWFnZ3JlZ2F0ZS1yb290K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLm5vdGlmLWNvbnRhaW5lcit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmR2Yi5ub3RpZi1nZW5lcmljK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLm5vdGlmLWlhLW1zZ2xpc3QreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kdmIubm90aWYtaWEtcmVnaXN0cmF0aW9uLXJlcXVlc3QreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kdmIubm90aWYtaWEtcmVnaXN0cmF0aW9uLXJlc3BvbnNlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHZiLm5vdGlmLWluaXQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kdmIucGZyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5kdmIuc2VydmljZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN2Y1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5keHJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmR5bmFnZW9cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnZW9cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZHpyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lYXN5a2FyYW9rZS5jZGdkb3dubG9hZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZWNkaXMtdXBkYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lY293aW4uY2hhcnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtYWdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZWNvd2luLmZpbGVyZXF1ZXN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lY293aW4uZmlsZXVwZGF0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZWNvd2luLnNlcmllc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZWNvd2luLnNlcmllc3JlcXVlc3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmVjb3dpbi5zZXJpZXN1cGRhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmVtY2xpZW50LmFjY2Vzc3JlcXVlc3QreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lbmxpdmVuXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibm1sXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmVucGhhc2UuZW52b3lcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmVwcmludHMuZGF0YSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmVwc29uLmVzZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImVzZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lcHNvbi5tc2ZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtc2ZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZXBzb24ucXVpY2thbmltZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInFhbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lcHNvbi5zYWx0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2x0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmVwc29uLnNzZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNzZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5lcmljc3Nvbi5xdWlja2NhbGxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmVzemlnbm8zK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImVzM1wiLFwiZXQzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kuYW9jK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZXRzaS5hc2ljLWUremlwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLmFzaWMtcyt6aXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kuY3VnK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZXRzaS5pcHR2Y29tbWFuZCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kuaXB0dmRpc2NvdmVyeSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kuaXB0dnByb2ZpbGUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLmlwdHZzYWQtYmMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLmlwdHZzYWQtY29kK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZXRzaS5pcHR2c2FkLW5wdnIreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLmlwdHZzZXJ2aWNlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZXRzaS5pcHR2c3luYyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kuaXB0dnVlcHJvZmlsZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kubWNpZCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kubWhlZzVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kub3ZlcmxvYWQtY29udHJvbC1wb2xpY3ktZGF0YXNldCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kucHN0bit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kuc2NpK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZXRzaS5zaW1zZXJ2cyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kudGltZXN0YW1wLXRva2VuXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ldHNpLnRzbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV0c2kudHNsLmRlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZXVkb3JhLmRhdGFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV6cGl4LWFsYnVtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZXoyXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmV6cGl4LXBhY2thZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJlejNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZi1zZWN1cmUubW9iaWxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mYXN0Y29weS1kaXNrLWltYWdlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mZGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmZGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZmRzbi5tc2VlZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1zZWVkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZkc24uc2VlZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNlZWRcIixcImRhdGFsZXNzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZmc25zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5maW50c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZmxvZ3JhcGhpdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImdwaFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mbHV4dGltZS5jbGlwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZnRjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZvbnQtZm9udGZvcmdlLXNmZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZnJhbWVtYWtlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImZtXCIsXCJmcmFtZVwiLFwibWFrZXJcIixcImJvb2tcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZnJvZ2Fucy5mbmNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmbmNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZnJvZ2Fucy5sdGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJsdGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZnNjLndlYmxhdW5jaFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImZzY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mdWppdHN1Lm9hc3lzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib2FzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZ1aml0c3Uub2FzeXMyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib2EyXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZ1aml0c3Uub2FzeXMzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib2EzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZ1aml0c3Uub2FzeXNncFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImZnNVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mdWppdHN1Lm9hc3lzcHJzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYmgyXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZ1aml4ZXJveC5hcnQtZXhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZ1aml4ZXJveC5hcnQ0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mdWppeGVyb3guZGRkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZGRkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZ1aml4ZXJveC5kb2N1d29ya3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4ZHdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZnVqaXhlcm94LmRvY3V3b3Jrcy5iaW5kZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4YmRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZnVqaXhlcm94LmRvY3V3b3Jrcy5jb250YWluZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmZ1aml4ZXJveC5oYnBsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mdXQtbWlzbmV0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5mdXp6eXNoZWV0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZnpzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdlbm9tYXRpeC50dXhlZG9cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0eGRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ2VvK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ2VvY3ViZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdlb2dlYnJhLmZpbGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnZ2JcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ2VvZ2VicmEudG9vbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImdndFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5nZW9tZXRyeS1leHBsb3JlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImdleFwiLFwiZ3JlXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdlb25leHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJneHRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ2VvcGxhblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImcyd1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5nZW9zcGFjZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImczd1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5nZXJiZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdsb2JhbHBsYXRmb3JtLmNhcmQtY29udGVudC1tZ3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdsb2JhbHBsYXRmb3JtLmNhcmQtY29udGVudC1tZ3QtcmVzcG9uc2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdteFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImdteFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5nb29nbGUtZWFydGgua21sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wia21sXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdvb2dsZS1lYXJ0aC5rbXpcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJrbXpcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ292LnNrLmUtZm9ybSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdvdi5zay5lLWZvcm0remlwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5nb3Yuc2sueG1sZGF0YWNvbnRhaW5lcit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdyYWZlcVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImdxZlwiLFwiZ3FzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdyaWRtcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ3Jvb3ZlLWFjY291bnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnYWNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ3Jvb3ZlLWhlbHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnaGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ3Jvb3ZlLWlkZW50aXR5LW1lc3NhZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJnaW1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ3Jvb3ZlLWluamVjdG9yXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZ3J2XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmdyb292ZS10b29sLW1lc3NhZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJndG1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ3Jvb3ZlLXRvb2wtdGVtcGxhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0cGxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuZ3Jvb3ZlLXZjYXJkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widmNnXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmhhbCtqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmhhbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJoYWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaGFuZGhlbGQtZW50ZXJ0YWlubWVudCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ6bW1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaGJjaVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImhiY2lcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaGNsLWJpcmVwb3J0c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaGVyb2t1K2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaGhlLmxlc3Nvbi1wbGF5ZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJsZXNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaHAtaHBnbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImhwZ2xcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaHAtaHBpZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImhwaWRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaHAtaHBzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaHBzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmhwLWpseXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJqbHRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaHAtcGNsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicGNsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmhwLXBjbHhsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicGNseGxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaHR0cGhvbmVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmh5ZHJvc3RhdGl4LnNvZi1kYXRhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2ZkLWhkc3R4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmh5cGVyZHJpdmUranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5oem4tM2QtY3Jvc3N3b3JkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pYm0uYWZwbGluZWRhdGFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmlibS5lbGVjdHJvbmljLW1lZGlhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pYm0ubWluaXBheVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1weVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pYm0ubW9kY2FwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYWZwXCIsXCJsaXN0YWZwXCIsXCJsaXN0MzgyMFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pYm0ucmlnaHRzLW1hbmFnZW1lbnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJpcm1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaWJtLnNlY3VyZS1jb250YWluZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pY2Nwcm9maWxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaWNjXCIsXCJpY21cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaWVlZS4xOTA1XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pZ2xvYWRlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImlnbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pbW1lcnZpc2lvbi1pdnBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJpdnBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaW1tZXJ2aXNpb24taXZ1XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaXZ1XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmltcy5pbXNjY3YxcDFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmltcy5pbXNjY3YxcDJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmltcy5pbXNjY3YxcDNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmltcy5saXMudjIucmVzdWx0K2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaW1zLmx0aS52Mi50b29sY29uc3VtZXJwcm9maWxlK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaW1zLmx0aS52Mi50b29scHJveHkranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pbXMubHRpLnYyLnRvb2xwcm94eS5pZCtqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmltcy5sdGkudjIudG9vbHNldHRpbmdzK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaW1zLmx0aS52Mi50b29sc2V0dGluZ3Muc2ltcGxlK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaW5mb3JtZWRjb250cm9sLnJtcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmluZm9ybWl4LXZpc2lvbmFyeVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaW5mb3RlY2gucHJvamVjdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaW5mb3RlY2gucHJvamVjdCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmlubm9wYXRoLndhbXAubm90aWZpY2F0aW9uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pbnNvcnMuaWdtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaWdtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmludGVyY29uLmZvcm1uZXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4cHdcIixcInhweFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pbnRlcmdlb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImkyZ1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pbnRlcnRydXN0LmRpZ2lib3hcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmludGVydHJ1c3Qubm5jcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaW50dS5xYm9cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJxYm9cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaW50dS5xZnhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJxZnhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaXB0Yy5nMi5jYXRhbG9naXRlbSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmlwdGMuZzIuY29uY2VwdGl0ZW0reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pcHRjLmcyLmtub3dsZWRnZWl0ZW0reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pcHRjLmcyLm5ld3NpdGVtK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaXB0Yy5nMi5uZXdzbWVzc2FnZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmlwdGMuZzIucGFja2FnZWl0ZW0reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pcHRjLmcyLnBsYW5uaW5naXRlbSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmlwdW5wbHVnZ2VkLnJjcHJvZmlsZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJjcHJvZmlsZVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pcmVwb3NpdG9yeS5wYWNrYWdlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImlycFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5pcy14cHJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4cHJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuaXNhYy5mY3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmY3NcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuamFtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiamFtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmphcGFubmV0LWRpcmVjdG9yeS1zZXJ2aWNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5qYXBhbm5ldC1qcG5zdG9yZS13YWtldXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmphcGFubmV0LXBheW1lbnQtd2FrZXVwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5qYXBhbm5ldC1yZWdpc3RyYXRpb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmphcGFubmV0LXJlZ2lzdHJhdGlvbi13YWtldXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmphcGFubmV0LXNldHN0b3JlLXdha2V1cFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuamFwYW5uZXQtdmVyaWZpY2F0aW9uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5qYXBhbm5ldC12ZXJpZmljYXRpb24td2FrZXVwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5qY3AuamF2YW1lLm1pZGxldC1ybXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJybXNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuamlzcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImppc3BcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuam9vc3Quam9kYS1hcmNoaXZlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiam9kYVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5qc2suaXNkbi1uZ25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmthaG9vdHpcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJrdHpcIixcImt0clwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5rZGUua2FyYm9uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wia2FyYm9uXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmtkZS5rY2hhcnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjaHJ0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmtkZS5rZm9ybXVsYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImtmb1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5rZGUua2l2aW9cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmbHdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQua2RlLmtvbnRvdXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJrb25cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQua2RlLmtwcmVzZW50ZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJrcHJcIixcImtwdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5rZGUua3NwcmVhZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImtzcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5rZGUua3dvcmRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJrd2RcIixcImt3dFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5rZW5hbWVhYXBwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaHRrZVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5raWRzcGlyYXRpb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJraWFcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQua2luYXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJrbmVcIixcImtucFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5rb2FuXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2twXCIsXCJza2RcIixcInNrdFwiLFwic2ttXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmtvZGFrLWRlc2NyaXB0b3JcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzc2VcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubGFzLmxhcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJsYXN4bWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubGliZXJ0eS1yZXF1ZXN0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubGxhbWFncmFwaGljcy5saWZlLWJhbGFuY2UuZGVza3RvcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImxiZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5sbGFtYWdyYXBoaWNzLmxpZmUtYmFsYW5jZS5leGNoYW5nZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJsYmVcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubG90dXMtMS0yLTNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCIxMjNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubG90dXMtYXBwcm9hY2hcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhcHJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubG90dXMtZnJlZWxhbmNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHJlXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmxvdHVzLW5vdGVzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibnNmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLmxvdHVzLW9yZ2FuaXplclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9yZ1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5sb3R1cy1zY3JlZW5jYW1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzY21cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubG90dXMtd29yZHByb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImx3cFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tYWNwb3J0cy5wb3J0cGtnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicG9ydHBrZ1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tYXJsaW4uZHJtLmFjdGlvbnRva2VuK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWFybGluLmRybS5jb25mdG9rZW4reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tYXJsaW4uZHJtLmxpY2Vuc2UreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tYXJsaW4uZHJtLm1kY2ZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1hc29uK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWF4bWluZC5tYXhtaW5kLWRiXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tY2RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtY2RcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWVkY2FsY2RhdGFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtYzFcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWVkaWFzdGF0aW9uLmNka2V5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2RrZXlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWVyaWRpYW4tc2xpbmdzaG90XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tZmVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXdmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1mbXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtZm1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWljcm8ranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5taWNyb2dyYWZ4LmZsb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImZsb1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5taWNyb2dyYWZ4LmlneFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImlneFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5taWNyb3NvZnQucG9ydGFibGUtZXhlY3V0YWJsZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWllbGUranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5taWZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtaWZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubWluaXNvZnQtaHAzMDAwLXNhdmVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1pdHN1YmlzaGkubWlzdHktZ3VhcmQudHJ1c3R3ZWJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1vYml1cy5kYWZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkYWZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubW9iaXVzLmRpc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRpc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tb2JpdXMubWJrXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWJrXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1vYml1cy5tcXlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtcXlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubW9iaXVzLm1zbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1zbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tb2JpdXMucGxjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicGxjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1vYml1cy50eGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0eGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubW9waHVuLmFwcGxpY2F0aW9uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXBuXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1vcGh1bi5jZXJ0aWZpY2F0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1wY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tb3Rvcm9sYS5mbGV4c3VpdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1vdG9yb2xhLmZsZXhzdWl0ZS5hZHNpXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tb3Rvcm9sYS5mbGV4c3VpdGUuZmlzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tb3Rvcm9sYS5mbGV4c3VpdGUuZ290YXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1vdG9yb2xhLmZsZXhzdWl0ZS5rbXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1vdG9yb2xhLmZsZXhzdWl0ZS50dGNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1vdG9yb2xhLmZsZXhzdWl0ZS53ZW1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1vdG9yb2xhLmlwcm1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1vemlsbGEueHVsK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieHVsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLTNtZmRvY3VtZW50XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1hcnRnYWxyeVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNpbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1hc2ZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLWNhYi1jb21wcmVzc2VkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2FiXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLWNvbG9yLmljY3Byb2ZpbGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtZXhjZWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4bHNcIixcInhsbVwiLFwieGxhXCIsXCJ4bGNcIixcInhsdFwiLFwieGx3XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLWV4Y2VsLmFkZGluLm1hY3JvZW5hYmxlZC4xMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhsYW1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtZXhjZWwuc2hlZXQuYmluYXJ5Lm1hY3JvZW5hYmxlZC4xMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhsc2JcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtZXhjZWwuc2hlZXQubWFjcm9lbmFibGVkLjEyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieGxzbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1leGNlbC50ZW1wbGF0ZS5tYWNyb2VuYWJsZWQuMTJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4bHRtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLWZvbnRvYmplY3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImVvdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1odG1saGVscFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNobVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1pbXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJpbXNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtbHJtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibHJtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLW9mZmljZS5hY3RpdmV4K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtb2ZmaWNldGhlbWVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0aG14XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLW9wZW50eXBlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtcGFja2FnZS5vYmZ1c2NhdGVkLW9wZW50eXBlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXBraS5zZWNjYXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNhdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1wa2kuc3RsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzdGxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtcGxheXJlYWR5LmluaXRpYXRvcit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXBvd2VycG9pbnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwcHRcIixcInBwc1wiLFwicG90XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXBvd2VycG9pbnQuYWRkaW4ubWFjcm9lbmFibGVkLjEyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHBhbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1wb3dlcnBvaW50LnByZXNlbnRhdGlvbi5tYWNyb2VuYWJsZWQuMTJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwcHRtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXBvd2VycG9pbnQuc2xpZGUubWFjcm9lbmFibGVkLjEyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2xkbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1wb3dlcnBvaW50LnNsaWRlc2hvdy5tYWNyb2VuYWJsZWQuMTJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwcHNtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXBvd2VycG9pbnQudGVtcGxhdGUubWFjcm9lbmFibGVkLjEyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicG90bVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy1wcmludGluZy5wcmludHRpY2tldCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtcHJvamVjdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1wcFwiLFwibXB0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXRuZWZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXdpbmRvd3MucHJpbnRlcnBhaXJpbmdcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXdtZHJtLmxpYy1jaGxnLXJlcVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtd21kcm0ubGljLXJlc3BcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXdtZHJtLm1ldGVyLWNobGctcmVxXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy13bWRybS5tZXRlci1yZXNwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy13b3JkLmRvY3VtZW50Lm1hY3JvZW5hYmxlZC4xMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRvY21cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXMtd29yZC50ZW1wbGF0ZS5tYWNyb2VuYWJsZWQuMTJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkb3RtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXdvcmtzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid3BzXCIsXCJ3a3NcIixcIndjbVwiLFwid2RiXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm1zLXdwbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndwbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tcy14cHNkb2N1bWVudFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhwc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5tc2EtZGlzay1pbWFnZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXNlcVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1zZXFcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXNpZ25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm11bHRpYWQuY3JlYXRvclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXVsdGlhZC5jcmVhdG9yLmNpZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXVzaWMtbmlmZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXVzaWNpYW5cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtdXNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubXV2ZWUuc3R5bGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtc3R5XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm15bmZjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widGFnbGV0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5jZC5jb250cm9sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5uY2QucmVmZXJlbmNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5uZXJ2YW5hXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5uZXRmcHhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5ldXJvbGFuZ3VhZ2Uubmx1XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibmx1XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5pbnRlbmRvLm5pdHJvLnJvbVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubmludGVuZG8uc25lcy5yb21cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5pdGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJudGZcIixcIm5pdGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubm9ibGVuZXQtZGlyZWN0b3J5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibm5kXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5vYmxlbmV0LXNlYWxlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm5uc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ub2JsZW5ldC13ZWJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJubndcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubm9raWEuY2F0YWxvZ3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5va2lhLmNvbm1sK3dieG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ub2tpYS5jb25tbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5va2lhLmlwdHYuY29uZmlnK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubm9raWEuaXNkcy1yYWRpby1wcmVzZXRzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ub2tpYS5sYW5kbWFyayt3YnhtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubm9raWEubGFuZG1hcmsreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ub2tpYS5sYW5kbWFya2NvbGxlY3Rpb24reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ub2tpYS5uLWdhZ2UuYWMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ub2tpYS5uLWdhZ2UuZGF0YVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm5nZGF0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5va2lhLm4tZ2FnZS5zeW1iaWFuLmluc3RhbGxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJuLWdhZ2VcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubm9raWEubmNkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ub2tpYS5wY2Qrd2J4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5va2lhLnBjZCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5va2lhLnJhZGlvLXByZXNldFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJwc3RcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubm9raWEucmFkaW8tcHJlc2V0c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJwc3NcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubm92YWRpZ20uZWRtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZWRtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm5vdmFkaWdtLmVkeFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImVkeFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ub3ZhZGlnbS5leHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJleHRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQubnR0LWxvY2FsLmNvbnRlbnQtc2hhcmVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm50dC1sb2NhbC5maWxlLXRyYW5zZmVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5udHQtbG9jYWwub2d3X3JlbW90ZS1hY2Nlc3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm50dC1sb2NhbC5zaXAtdGFfcmVtb3RlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5udHQtbG9jYWwuc2lwLXRhX3RjcF9zdHJlYW1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC5jaGFydFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9kY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQuY2hhcnQtdGVtcGxhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvdGNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2FzaXMub3BlbmRvY3VtZW50LmRhdGFiYXNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib2RiXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC5mb3JtdWxhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib2RmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC5mb3JtdWxhLXRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib2RmdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQuZ3JhcGhpY3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvZGdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2FzaXMub3BlbmRvY3VtZW50LmdyYXBoaWNzLXRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib3RnXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC5pbWFnZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9kaVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQuaW1hZ2UtdGVtcGxhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvdGlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2FzaXMub3BlbmRvY3VtZW50LnByZXNlbnRhdGlvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9kcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQucHJlc2VudGF0aW9uLXRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib3RwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC5zcHJlYWRzaGVldFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9kc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQuc3ByZWFkc2hlZXQtdGVtcGxhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvdHNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2FzaXMub3BlbmRvY3VtZW50LnRleHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvZHRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2FzaXMub3BlbmRvY3VtZW50LnRleHQtbWFzdGVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib2RtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC50ZXh0LXRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib3R0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC50ZXh0LXdlYlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm90aFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vYm5cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9mdG4ubDEwbitqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9pcGYuY29udGVudGFjY2Vzc2Rvd25sb2FkK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2lwZi5jb250ZW50YWNjZXNzc3RyZWFtaW5nK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2lwZi5jc3BnLWhleGJpbmFyeVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2lwZi5kYWUuc3ZnK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub2lwZi5kYWUueGh0bWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vaXBmLm1pcHB2Y29udHJvbG1lc3NhZ2UreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vaXBmLnBhZS5nZW1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9pcGYuc3BkaXNjb3ZlcnkreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vaXBmLnNwZGxpc3QreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vaXBmLnVlcHJvZmlsZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9pcGYudXNlcnByb2ZpbGUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbHBjLXN1Z2FyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieG9cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLXNjd3MtY29uZmlnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEtc2N3cy1odHRwLXJlcXVlc3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS1zY3dzLWh0dHAtcmVzcG9uc2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5iY2FzdC5hc3NvY2lhdGVkLXByb2NlZHVyZS1wYXJhbWV0ZXIreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuYmNhc3QuZHJtLXRyaWdnZXIreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuYmNhc3QuaW1kK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmJjYXN0Lmx0a21cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5iY2FzdC5ub3RpZmljYXRpb24reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuYmNhc3QucHJvdmlzaW9uaW5ndHJpZ2dlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmJjYXN0LnNnYm9vdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmJjYXN0LnNnZGQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuYmNhc3Quc2dkdVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmJjYXN0LnNpbXBsZS1zeW1ib2wtY29udGFpbmVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuYmNhc3Quc21hcnRjYXJkLXRyaWdnZXIreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuYmNhc3Quc3Byb3YreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuYmNhc3Quc3RrbVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmNhYi1hZGRyZXNzLWJvb2sreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuY2FiLWZlYXR1cmUtaGFuZGxlcit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5jYWItcGNjK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLmNhYi1zdWJzLWludml0ZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5jYWItdXNlci1wcmVmcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5kY2RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5kY2RjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuZGQyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRkMlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuZHJtLnJpc2QreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuZ3JvdXAtdXNhZ2UtbGlzdCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5wYWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEucG9jLmRldGFpbGVkLXByb2dyZXNzLXJlcG9ydCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5wb2MuZmluYWwtcmVwb3J0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub21hLnBvYy5ncm91cHMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEucG9jLmludm9jYXRpb24tZGVzY3JpcHRvcit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5wb2Mub3B0aW1pemVkLXByb2dyZXNzLXJlcG9ydCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYS5wdXNoXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEuc2NpZG0ubWVzc2FnZXMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWEueGNhcC1kaXJlY3RvcnkreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWFkcy1lbWFpbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9tYWRzLWZpbGUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWFkcy1mb2xkZXIreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vbWFsb2Mtc3VwbC1pbml0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVuZXllLm9lYlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3Blbm9mZmljZW9yZy5leHRlbnNpb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm94dFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5jdXN0b20tcHJvcGVydGllcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LmN1c3RvbXhtbHByb3BlcnRpZXMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5kcmF3aW5nK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuZHJhd2luZ21sLmNoYXJ0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuZHJhd2luZ21sLmNoYXJ0c2hhcGVzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuZHJhd2luZ21sLmRpYWdyYW1jb2xvcnMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5kcmF3aW5nbWwuZGlhZ3JhbWRhdGEreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5kcmF3aW5nbWwuZGlhZ3JhbWxheW91dCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LmRyYXdpbmdtbC5kaWFncmFtc3R5bGUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5leHRlbmRlZC1wcm9wZXJ0aWVzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwtdGVtcGxhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLmNvbW1lbnRhdXRob3JzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwuY29tbWVudHMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5wcmVzZW50YXRpb25tbC5oYW5kb3V0bWFzdGVyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwubm90ZXNtYXN0ZXIreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5wcmVzZW50YXRpb25tbC5ub3Rlc3NsaWRlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwucHJlc2VudGF0aW9uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHB0eFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5wcmVzZW50YXRpb25tbC5wcmVzZW50YXRpb24ubWFpbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLnByZXNwcm9wcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLnNsaWRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2xkeFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5wcmVzZW50YXRpb25tbC5zbGlkZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLnNsaWRlbGF5b3V0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwuc2xpZGVtYXN0ZXIreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5wcmVzZW50YXRpb25tbC5zbGlkZXNob3dcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwcHN4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLnNsaWRlc2hvdy5tYWluK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwuc2xpZGV1cGRhdGVpbmZvK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwudGFibGVzdHlsZXMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5wcmVzZW50YXRpb25tbC50YWdzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwudGVtcGxhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBvdHhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwudGVtcGxhdGUubWFpbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLnZpZXdwcm9wcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwtdGVtcGxhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuY2FsY2NoYWluK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC5jaGFydHNoZWV0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC5jb21tZW50cyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuY29ubmVjdGlvbnMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLmRpYWxvZ3NoZWV0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC5leHRlcm5hbGxpbmsreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnBpdm90Y2FjaGVkZWZpbml0aW9uK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC5waXZvdGNhY2hlcmVjb3Jkcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwucGl2b3R0YWJsZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwucXVlcnl0YWJsZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwucmV2aXNpb25oZWFkZXJzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC5yZXZpc2lvbmxvZyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuc2hhcmVkc3RyaW5ncyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuc2hlZXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4bHN4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuc2hlZXQubWFpbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuc2hlZXRtZXRhZGF0YSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuc3R5bGVzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC50YWJsZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwudGFibGVzaW5nbGVjZWxscyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwudGVtcGxhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhsdHhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC50ZW1wbGF0ZS5tYWluK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC51c2VybmFtZXMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnZvbGF0aWxlZGVwZW5kZW5jaWVzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC53b3Jrc2hlZXQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC50aGVtZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnRoZW1lb3ZlcnJpZGUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC52bWxkcmF3aW5nXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC53b3JkcHJvY2Vzc2luZ21sLXRlbXBsYXRlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC53b3JkcHJvY2Vzc2luZ21sLmNvbW1lbnRzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQud29yZHByb2Nlc3NpbmdtbC5kb2N1bWVudFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRvY3hcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQud29yZHByb2Nlc3NpbmdtbC5kb2N1bWVudC5nbG9zc2FyeSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LndvcmRwcm9jZXNzaW5nbWwuZG9jdW1lbnQubWFpbit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LndvcmRwcm9jZXNzaW5nbWwuZW5kbm90ZXMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC53b3JkcHJvY2Vzc2luZ21sLmZvbnR0YWJsZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LndvcmRwcm9jZXNzaW5nbWwuZm9vdGVyK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQud29yZHByb2Nlc3NpbmdtbC5mb290bm90ZXMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC53b3JkcHJvY2Vzc2luZ21sLm51bWJlcmluZyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LndvcmRwcm9jZXNzaW5nbWwuc2V0dGluZ3MreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC53b3JkcHJvY2Vzc2luZ21sLnN0eWxlcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LndvcmRwcm9jZXNzaW5nbWwudGVtcGxhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRvdHhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQud29yZHByb2Nlc3NpbmdtbC50ZW1wbGF0ZS5tYWluK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQud29yZHByb2Nlc3NpbmdtbC53ZWJzZXR0aW5ncyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLXBhY2thZ2UuY29yZS1wcm9wZXJ0aWVzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtcGFja2FnZS5kaWdpdGFsLXNpZ25hdHVyZS14bWxzaWduYXR1cmUreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1wYWNrYWdlLnJlbGF0aW9uc2hpcHMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcmFjbGUucmVzb3VyY2UranNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vcmFuZ2UuaW5kYXRhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vc2EubmV0ZGVwbG95XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vc2dlby5tYXBndWlkZS5wYWNrYWdlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWdwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLm9zZ2kuYnVuZGxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5vc2dpLmRwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZHBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3NnaS5zdWJzeXN0ZW1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJlc2FcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQub3Rwcy5jdC1raXAreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5wYWxtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicGRiXCIsXCJwcWFcIixcIm9wcmNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucGFub3BseVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucGFvcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnBhb3MueG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnBhd2FhZmlsZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBhd1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5wY29zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5wZy5mb3JtYXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzdHJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucGcub3Nhc2xpXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZWk2XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnBpYWNjZXNzLmFwcGxpY2F0aW9uLWxpY2VuY2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnBpY3NlbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImVmaWZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucG1pLndpZGdldFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndnXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnBvYy5ncm91cC1hZHZlcnRpc2VtZW50K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucG9ja2V0bGVhcm5cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwbGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucG93ZXJidWlsZGVyNlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBiZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5wb3dlcmJ1aWxkZXI2LXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnBvd2VyYnVpbGRlcjdcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnBvd2VyYnVpbGRlcjctc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucG93ZXJidWlsZGVyNzVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnBvd2VyYnVpbGRlcjc1LXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnByZW1pbmV0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5wcmV2aWV3c3lzdGVtcy5ib3hcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJib3hcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucHJvdGV1cy5tYWdhemluZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1nelwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5wdWJsaXNoYXJlLWRlbHRhLXRyZWVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJxcHNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucHZpLnB0aWQxXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHRpZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5wd2ctbXVsdGlwbGV4ZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnB3Zy14aHRtbC1wcmludCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnF1YWxjb21tLmJyZXctYXBwLXJlc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucXVhcmsucXVhcmt4cHJlc3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJxeGRcIixcInF4dFwiLFwicXdkXCIsXCJxd3RcIixcInF4bFwiLFwicXhiXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnF1b2JqZWN0LXF1b3hkb2N1bWVudFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmFkaXN5cy5tb21sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmFkaXN5cy5tc21sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmFkaXN5cy5tc21sLWF1ZGl0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmFkaXN5cy5tc21sLWF1ZGl0LWNvbmYreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5yYWRpc3lzLm1zbWwtYXVkaXQtY29ubit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJhZGlzeXMubXNtbC1hdWRpdC1kaWFsb2creG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5yYWRpc3lzLm1zbWwtYXVkaXQtc3RyZWFtK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmFkaXN5cy5tc21sLWNvbmYreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5yYWRpc3lzLm1zbWwtZGlhbG9nK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmFkaXN5cy5tc21sLWRpYWxvZy1iYXNlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmFkaXN5cy5tc21sLWRpYWxvZy1mYXgtZGV0ZWN0K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmFkaXN5cy5tc21sLWRpYWxvZy1mYXgtc2VuZHJlY3YreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5yYWRpc3lzLm1zbWwtZGlhbG9nLWdyb3VwK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmFkaXN5cy5tc21sLWRpYWxvZy1zcGVlY2greG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5yYWRpc3lzLm1zbWwtZGlhbG9nLXRyYW5zZm9ybSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJhaW5zdG9yLmRhdGFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJhcGlkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5yZWFsdm5jLmJlZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImJlZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5yZWNvcmRhcmUubXVzaWN4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJteGxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucmVjb3JkYXJlLm11c2ljeG1sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm11c2ljeG1sXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJlbmxlYXJuLnJscHJpbnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJpZy5jcnlwdG9ub3RlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY3J5cHRvbm90ZVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5yaW0uY29kXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjb2RcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQucm4tcmVhbG1lZGlhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJybVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ybi1yZWFsbWVkaWEtdmJyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJybXZiXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnJvdXRlNjYubGluazY2K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImxpbms2NlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ycy0yNzR4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5ydWNrdXMuZG93bmxvYWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnMzc21zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zYWlsaW5ndHJhY2tlci50cmFja1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNibS5jaWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNibS5taWQyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zY3JpYnVzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zZWFsZWQuM2RmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zZWFsZWQuY3NmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zZWFsZWQuZG9jXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zZWFsZWQuZW1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zZWFsZWQubWh0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zZWFsZWQubmV0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zZWFsZWQucHB0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zZWFsZWQudGlmZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2VhbGVkLnhsc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2VhbGVkbWVkaWEuc29mdHNlYWwuaHRtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc2VhbGVkbWVkaWEuc29mdHNlYWwucGRmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zZWVtYWlsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2VlXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNlbWFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzZW1hXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNlbWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzZW1kXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNlbWZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzZW1mXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNoYW5hLmluZm9ybWVkLmZvcm1kYXRhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaWZtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNoYW5hLmluZm9ybWVkLmZvcm10ZW1wbGF0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIml0cFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zaGFuYS5pbmZvcm1lZC5pbnRlcmNoYW5nZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImlpZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zaGFuYS5pbmZvcm1lZC5wYWNrYWdlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaXBrXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNpbXRlY2gtbWluZG1hcHBlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInR3ZFwiLFwidHdkc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zaXJlbitqc29uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNtYWZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtbWZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc21hcnQubm90ZWJvb2tcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNtYXJ0LnRlYWNoZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0ZWFjaGVyXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNvZnR3YXJlNjAyLmZpbGxlci5mb3JtK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc29mdHdhcmU2MDIuZmlsbGVyLmZvcm0teG1sLXppcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc29sZW50LnNka20reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2RrbVwiLFwic2RrZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zcG90ZmlyZS5keHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkeHBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3BvdGZpcmUuc2ZzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2ZzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNzcy1jb2RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNzcy1kdGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnNzcy1udGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN0YXJkaXZpc2lvbi5jYWxjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzZGNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3RhcmRpdmlzaW9uLmRyYXdcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNkYVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdGFyZGl2aXNpb24uaW1wcmVzc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2RkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN0YXJkaXZpc2lvbi5tYXRoXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzbWZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3RhcmRpdmlzaW9uLndyaXRlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2R3XCIsXCJ2b3JcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3RhcmRpdmlzaW9uLndyaXRlci1nbG9iYWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNnbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdGVwbWFuaWEucGFja2FnZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNtemlwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN0ZXBtYW5pYS5zdGVwY2hhcnRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdHJlZXQtc3RyZWFtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdW4ud2FkbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN1bi54bWwuY2FsY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3hjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN1bi54bWwuY2FsYy50ZW1wbGF0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3RjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN1bi54bWwuZHJhd1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3hkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN1bi54bWwuZHJhdy50ZW1wbGF0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3RkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN1bi54bWwuaW1wcmVzc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3hpXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN1bi54bWwuaW1wcmVzcy50ZW1wbGF0ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3RpXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN1bi54bWwubWF0aFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3htXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN1bi54bWwud3JpdGVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzeHdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3VuLnhtbC53cml0ZXIuZ2xvYmFsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzeGdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3VuLnhtbC53cml0ZXIudGVtcGxhdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN0d1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zdXMtY2FsZW5kYXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzdXNcIixcInN1c3BcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3ZkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3ZkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN3aWZ0dmlldy1pY3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN5bWJpYW4uaW5zdGFsbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2lzXCIsXCJzaXN4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN5bmNtbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4c21cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3luY21sLmRtK3dieG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYmRtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnN5bmNtbC5kbSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4ZG1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3luY21sLmRtLm5vdGlmaWNhdGlvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3luY21sLmRtZGRmK3dieG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zeW5jbWwuZG1kZGYreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zeW5jbWwuZG10bmRzK3dieG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC5zeW5jbWwuZG10bmRzK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuc3luY21sLmRzLm5vdGlmaWNhdGlvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudGFvLmludGVudC1tb2R1bGUtYXJjaGl2ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRhb1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC50Y3BkdW1wLnBjYXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwY2FwXCIsXCJjYXBcIixcImRtcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC50bWQubWVkaWFmbGV4LmFwaSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnRtb2JpbGUtbGl2ZXR2XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widG1vXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnRyaWQudHB0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widHB0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnRyaXNjYXBlLm14c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm14c1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC50cnVlYXBwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widHJhXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnRydWVkb2NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnViaXNvZnQud2VicGxheWVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC51ZmRsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widWZkXCIsXCJ1ZmRsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnVpcS50aGVtZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInV0elwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC51bWFqaW5cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ1bWpcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudW5pdHlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ1bml0eXdlYlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC51b21sK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInVvbWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudXBsYW5ldC5hbGVydFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudXBsYW5ldC5hbGVydC13YnhtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudXBsYW5ldC5iZWFyZXItY2hvaWNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC51cGxhbmV0LmJlYXJlci1jaG9pY2Utd2J4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnVwbGFuZXQuY2FjaGVvcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudXBsYW5ldC5jYWNoZW9wLXdieG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC51cGxhbmV0LmNoYW5uZWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnVwbGFuZXQuY2hhbm5lbC13YnhtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudXBsYW5ldC5saXN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC51cGxhbmV0Lmxpc3Qtd2J4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnVwbGFuZXQubGlzdGNtZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudXBsYW5ldC5saXN0Y21kLXdieG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC51cGxhbmV0LnNpZ25hbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudmFsdmUuc291cmNlLm1hdGVyaWFsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC52Y3hcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ2Y3hcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudmQtc3R1ZHlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnZlY3RvcndvcmtzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC52ZXJpbWF0cml4LnZjYXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnZpZHNvZnQudmlkY29uZmVyZW5jZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudmlzaW9cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ2c2RcIixcInZzdFwiLFwidnNzXCIsXCJ2c3dcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQudmlzaW9uYXJ5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widmlzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnZpdmlkZW5jZS5zY3JpcHRmaWxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC52c2ZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ2c2ZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQud2FwLnNpY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQud2FwLnNsY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQud2FwLndieG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid2J4bWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQud2FwLndtbGNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3bWxjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndhcC53bWxzY3JpcHRjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid21sc2NcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQud2VidHVyYm9cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3dGJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQud2ZhLnAycFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQud2ZhLndzY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQud2luZG93cy5kZXZpY2VwYWlyaW5nXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC53bWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndtZi5ib290c3RyYXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndvbGZyYW0ubWF0aGVtYXRpY2FcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndvbGZyYW0ubWF0aGVtYXRpY2EucGFja2FnZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQud29sZnJhbS5wbGF5ZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJuYnBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQud29yZHBlcmZlY3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3cGRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQud3FkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid3FkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLndycS1ocDMwMDAtbGFiZWxsZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnd0LnN0ZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN0ZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC53di5jc3Ard2J4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnd2LmNzcCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnd2LnNzcCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnhhY21sK2pzb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQueGFyYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhhclwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC54ZmRsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieGZkbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC54ZmRsLndlYmZvcm1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnhtaSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnhtcGllLmNwa2dcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnhtcGllLmRwa2dcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnhtcGllLnBsYW5cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnhtcGllLnBwa2dcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnhtcGllLnhsaW1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnlhbWFoYS5odi1kaWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJodmRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQueWFtYWhhLmh2LXNjcmlwdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImh2c1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC55YW1haGEuaHYtdm9pY2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJodnBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQueWFtYWhhLm9wZW5zY29yZWZvcm1hdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9zZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZuZC55YW1haGEub3BlbnNjb3JlZm9ybWF0Lm9zZnB2Zyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvc2ZwdmdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQueWFtYWhhLnJlbW90ZS1zZXR1cFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQueWFtYWhhLnNtYWYtYXVkaW9cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzYWZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQueWFtYWhhLnNtYWYtcGhyYXNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3BmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnlhbWFoYS50aHJvdWdoLW5nblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQueWFtYWhhLnR1bm5lbC11ZHBlbmNhcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQueWFvd2VtZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQueWVsbG93cml2ZXItY3VzdG9tLW1lbnVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjbXBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi92bmQuenVsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiemlyXCIsXCJ6aXJ6XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm5kLnp6YXp6LmRlY2sreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiemF6XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vdm9pY2V4bWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widnhtbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3ZxLXJ0Y3B4clwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi93YXRjaGVyaW5mbyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vd2hvaXNwcC1xdWVyeVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi93aG9pc3BwLXJlc3BvbnNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3dpZGdldFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndndFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3dpbmhscFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaGxwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vd2l0YVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi93b3JkcGVyZmVjdDUuMVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi93c2RsK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndzZGxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi93c3BvbGljeSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3c3BvbGljeVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtN3otY29tcHJlc3NlZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiN3pcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWFiaXdvcmRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFid1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtYWNlLWNvbXByZXNzZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFjZVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtYW1mXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1hcHBsZS1kaXNraW1hZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRtZ1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtYXV0aG9yd2FyZS1iaW5cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFhYlwiLFwieDMyXCIsXCJ1MzJcIixcInZveFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtYXV0aG9yd2FyZS1tYXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFhbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtYXV0aG9yd2FyZS1zZWdcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFhc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtYmNwaW9cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImJjcGlvXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1iZG9jXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYmRvY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtYml0dG9ycmVudFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widG9ycmVudFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtYmxvcmJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImJsYlwiLFwiYmxvcmJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWJ6aXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImJ6XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1iemlwMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYnoyXCIsXCJib3pcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWNiclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2JyXCIsXCJjYmFcIixcImNidFwiLFwiY2J6XCIsXCJjYjdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWNkbGlua1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widmNkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1jZnMtY29tcHJlc3NlZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2ZzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1jaGF0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjaGF0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1jaGVzcy1wZ25cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBnblwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtY2hyb21lLWV4dGVuc2lvblwiOiB7XG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNyeFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtY29jb2FcIjoge1xuICAgIFwic291cmNlXCI6IFwibmdpbnhcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2NvXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1jb21wcmVzc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtY29uZmVyZW5jZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibnNjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1jcGlvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjcGlvXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1jc2hcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNzaFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZGViXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZGViaWFuLXBhY2thZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRlYlwiLFwidWRlYlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZGdjLWNvbXByZXNzZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRnY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZGlyZWN0b3JcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRpclwiLFwiZGNyXCIsXCJkeHJcIixcImNzdFwiLFwiY2N0XCIsXCJjeHRcIixcInczZFwiLFwiZmdkXCIsXCJzd2FcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWRvb21cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndhZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZHRibmN4K3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibmN4XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1kdGJvb2sreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkdGJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWR0YnJlc291cmNlK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicmVzXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1kdmlcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImR2aVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZW52b3lcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImV2eVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZXZhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJldmFcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWZvbnQtYmRmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJiZGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWZvbnQtZG9zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1mb250LWZyYW1lbWFrZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWZvbnQtZ2hvc3RzY3JpcHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImdzZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZm9udC1saWJncnhcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWZvbnQtbGludXgtcHNmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwc2ZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWZvbnQtb3RmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm90ZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZm9udC1wY2ZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBjZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZm9udC1zbmZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNuZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZm9udC1zcGVlZG9cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWZvbnQtc3Vub3MtbmV3c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZm9udC10dGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1widHRmXCIsXCJ0dGNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWZvbnQtdHlwZTFcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBmYVwiLFwicGZiXCIsXCJwZm1cIixcImFmbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZm9udC12Zm9udFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZnJlZWFyY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXJjXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1mdXR1cmVzcGxhc2hcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNwbFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZ2NhLWNvbXByZXNzZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImdjYVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZ2x1bHhcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInVseFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtZ251bWVyaWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImdudW1lcmljXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1ncmFtcHMteG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJncmFtcHNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWd0YXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImd0YXJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWd6aXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWhkZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaGRmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1odHRwZC1waHBcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBocFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtaW5zdGFsbC1pbnN0cnVjdGlvbnNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImluc3RhbGxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWlzbzk2NjAtaW1hZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImlzb1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtamF2YS1hcmNoaXZlLWRpZmZcIjoge1xuICAgIFwic291cmNlXCI6IFwibmdpbnhcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiamFyZGlmZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtamF2YS1qbmxwLWZpbGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImpubHBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWphdmFzY3JpcHRcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LWxhdGV4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJsYXRleFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbHVhLWJ5dGVjb2RlXCI6IHtcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibHVhY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbHpoLWNvbXByZXNzZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImx6aFwiLFwibGhhXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1tYWtlc2VsZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJuZ2lueFwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJydW5cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW1pZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWllXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1tb2JpcG9ja2V0LWVib29rXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwcmNcIixcIm1vYmlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW1wZWd1cmxcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1tcy1hcHBsaWNhdGlvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYXBwbGljYXRpb25cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW1zLXNob3J0Y3V0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJsbmtcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW1zLXdtZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid21kXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1tcy13bXpcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndtelwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbXMteGJhcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieGJhcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbXNhY2Nlc3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1kYlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbXNiaW5kZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9iZFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbXNjYXJkZmlsZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY3JkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1tc2NsaXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNscFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbXNkb3dubG9hZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZXhlXCIsXCJkbGxcIixcImNvbVwiLFwiYmF0XCIsXCJtc2lcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW1zbWVkaWF2aWV3XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtdmJcIixcIm0xM1wiLFwibTE0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1tc21ldGFmaWxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3bWZcIixcIndtelwiLFwiZW1mXCIsXCJlbXpcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW1zbW9uZXlcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1ueVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbXNwdWJsaXNoZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInB1YlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbXNzY2hlZHVsZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2NkXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1tc3Rlcm1pbmFsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0cm1cIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW1zd3JpdGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndyaVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtbmV0Y2RmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJuY1wiLFwiY2RmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1ucy1wcm94eS1hdXRvY29uZmlnXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwYWNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LW56YlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibnpiXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1wZXJsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcIm5naW54XCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBsXCIsXCJwbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtcGlsb3RcIjoge1xuICAgIFwic291cmNlXCI6IFwibmdpbnhcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicHJjXCIsXCJwZGJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXBrY3MxMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicDEyXCIsXCJwZnhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXBrY3M3LWNlcnRpZmljYXRlc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicDdiXCIsXCJzcGNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXBrY3M3LWNlcnRyZXFyZXNwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwN3JcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXJhci1jb21wcmVzc2VkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJyYXJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXJlZGhhdC1wYWNrYWdlLW1hbmFnZXJcIjoge1xuICAgIFwic291cmNlXCI6IFwibmdpbnhcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicnBtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1yZXNlYXJjaC1pbmZvLXN5c3RlbXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJpc1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtc2VhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcIm5naW54XCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNlYVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtc2hcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2hcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXNoYXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNoYXJcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXNob2Nrd2F2ZS1mbGFzaFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3dmXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1zaWx2ZXJsaWdodC1hcHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhhcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtc3FsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzcWxcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXN0dWZmaXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNpdFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtc3R1ZmZpdHhcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNpdHhcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXN1YnJpcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3J0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1zdjRjcGlvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzdjRjcGlvXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC1zdjRjcmNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN2NGNyY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtdDN2bS1pbWFnZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widDNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXRhZHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImdhbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtdGFyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRhclwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtdGNsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0Y2xcIixcInRrXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC10ZXhcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRleFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtdGV4LXRmbVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widGZtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC10ZXhpbmZvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0ZXhpbmZvXCIsXCJ0ZXhpXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC10Z2lmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvYmpcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXVzdGFyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ1c3RhclwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtd2Fpcy1zb3VyY2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNyY1wiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtd2ViLWFwcC1tYW5pZmVzdCtqc29uXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3ZWJhcHBcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXg1MDktY2EtY2VydFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZGVyXCIsXCJjcnRcIixcInBlbVwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gteGZpZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZmlnXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veC14bGlmZit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhsZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gteHBpbnN0YWxsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4cGlcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94LXh6XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4elwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3gtem1hY2hpbmVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInoxXCIsXCJ6MlwiLFwiejNcIixcIno0XCIsXCJ6NVwiLFwiejZcIixcIno3XCIsXCJ6OFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3g0MDAtYnBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veGFjbWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3hhbWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4YW1sXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veGNhcC1hdHQreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3hjYXAtY2Fwcyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veGNhcC1kaWZmK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhkZlwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3hjYXAtZWwreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3hjYXAtZXJyb3IreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3hjYXAtbnMreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3hjb24tY29uZmVyZW5jZS1pbmZvK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94Y29uLWNvbmZlcmVuY2UtaW5mby1kaWZmK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94ZW5jK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhlbmNcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94aHRtbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhodG1sXCIsXCJ4aHRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94aHRtbC12b2ljZSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhtbFwiLFwieHNsXCIsXCJ4c2RcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94bWwtZHRkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkdGRcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94bWwtZXh0ZXJuYWwtcGFyc2VkLWVudGl0eVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94bWwtcGF0Y2greG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3htcHAreG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImFwcGxpY2F0aW9uL3hvcCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhvcFwiXVxuICB9LFxuICBcImFwcGxpY2F0aW9uL3hwcm9jK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieHBsXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veHNsdCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4c2x0XCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veHNwZit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhzcGZcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi94dit4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJteG1sXCIsXCJ4aHZtbFwiLFwieHZtbFwiLFwieHZtXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24veWFuZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInlhbmdcIl1cbiAgfSxcbiAgXCJhcHBsaWNhdGlvbi95aW4reG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieWluXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vemlwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiemlwXCJdXG4gIH0sXG4gIFwiYXBwbGljYXRpb24vemxpYlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby8xZC1pbnRlcmxlYXZlZC1wYXJpdHlmZWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vMzJrYWRwY21cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vM2dwcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby8zZ3BwMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9hYzNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vYWRwY21cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFkcFwiXVxuICB9LFxuICBcImF1ZGlvL2FtclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9hbXItd2JcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vYW1yLXdiK1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9hcHR4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2FzY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9hdHJhYy1hZHZhbmNlZC1sb3NzbGVzc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9hdHJhYy14XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2F0cmFjM1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9iYXNpY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImF1XCIsXCJzbmRcIl1cbiAgfSxcbiAgXCJhdWRpby9idjE2XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2J2MzJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vY2xlYXJtb2RlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2NuXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2RhdDEyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2Rsc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9kc3ItZXMyMDExMDhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZHNyLWVzMjAyMDUwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2Rzci1lczIwMjIxMVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9kc3ItZXMyMDIyMTJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZHZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZHZpNFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9lYWMzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2VuY2FwcnRwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2V2cmNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZXZyYy1xY3BcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZXZyYzBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZXZyYzFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZXZyY2JcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZXZyY2IwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2V2cmNiMVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9ldnJjbndcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZXZyY253MFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9ldnJjbncxXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2V2cmN3YlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9ldnJjd2IwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2V2cmN3YjFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZndkcmVkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2c3MTlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZzcyMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9nNzIyMVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9nNzIzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2c3MjYtMTZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZzcyNi0yNFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9nNzI2LTMyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2c3MjYtNDBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vZzcyOFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9nNzI5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2c3MjkxXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2c3MjlkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2c3MjllXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2dzbVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9nc20tZWZyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2dzbS1oci0wOFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9pbGJjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2lwLW1yX3YyLjVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vaXNhY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcImF1ZGlvL2wxNlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9sMjBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vbDI0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZVxuICB9LFxuICBcImF1ZGlvL2w4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL2xwY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9taWRpXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtaWRcIixcIm1pZGlcIixcImthclwiLFwicm1pXCJdXG4gIH0sXG4gIFwiYXVkaW8vbW9iaWxlLXhtZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9tcDRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtcDRhXCIsXCJtNGFcIl1cbiAgfSxcbiAgXCJhdWRpby9tcDRhLWxhdG1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vbXBhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL21wYS1yb2J1c3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vbXBlZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1wZ2FcIixcIm1wMlwiLFwibXAyYVwiLFwibXAzXCIsXCJtMmFcIixcIm0zYVwiXVxuICB9LFxuICBcImF1ZGlvL21wZWc0LWdlbmVyaWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vbXVzZXBhY2tcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJhdWRpby9vZ2dcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvZ2FcIixcIm9nZ1wiLFwic3B4XCJdXG4gIH0sXG4gIFwiYXVkaW8vb3B1c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9wYXJpdHlmZWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vcGNtYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9wY21hLXdiXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3BjbXVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vcGNtdS13YlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9wcnMuc2lkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3FjZWxwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3JhcHRvcmZlY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9yZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vcnRwLWVuYy1hZXNjbTEyOFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9ydHAtbWlkaVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9ydHBsb29wYmFja1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9ydHhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vczNtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzM21cIl1cbiAgfSxcbiAgXCJhdWRpby9zaWxrXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzaWxcIl1cbiAgfSxcbiAgXCJhdWRpby9zbXZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vc212LXFjcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby9zbXYwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3NwLW1pZGlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vc3BlZXhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdDE0MGNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdDM4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3RlbGVwaG9uZS1ldmVudFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby90b25lXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3VlbWNsaXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdWxwZmVjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZkdmlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm1yLXdiXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC4zZ3BwLml1ZnBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLjRzYlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby92bmQuYXVkaW9rb3pcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmNlbHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmNpc2NvLm5zZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby92bmQuY21sZXMucmFkaW8tZXZlbnRzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5jbnMuYW5wMVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby92bmQuY25zLmluZjFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmRlY2UuYXVkaW9cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ1dmFcIixcInV2dmFcIl1cbiAgfSxcbiAgXCJhdWRpby92bmQuZGlnaXRhbC13aW5kc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImVvbFwiXVxuICB9LFxuICBcImF1ZGlvL3ZuZC5kbG5hLmFkdHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmRvbGJ5LmhlYWFjLjFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmRvbGJ5LmhlYWFjLjJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmRvbGJ5Lm1scFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby92bmQuZG9sYnkubXBzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5kb2xieS5wbDJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmRvbGJ5LnBsMnhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmRvbGJ5LnBsMnpcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmRvbGJ5LnB1bHNlLjFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmRyYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImRyYVwiXVxuICB9LFxuICBcImF1ZGlvL3ZuZC5kdHNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkdHNcIl1cbiAgfSxcbiAgXCJhdWRpby92bmQuZHRzLmhkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZHRzaGRcIl1cbiAgfSxcbiAgXCJhdWRpby92bmQuZHZiLmZpbGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmV2ZXJhZC5wbGpcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLmhucy5hdWRpb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby92bmQubHVjZW50LnZvaWNlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibHZwXCJdXG4gIH0sXG4gIFwiYXVkaW8vdm5kLm1zLXBsYXlyZWFkeS5tZWRpYS5weWFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJweWFcIl1cbiAgfSxcbiAgXCJhdWRpby92bmQubm9raWEubW9iaWxlLXhtZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby92bmQubm9ydGVsLnZia1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby92bmQubnVlcmEuZWNlbHA0ODAwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZWNlbHA0ODAwXCJdXG4gIH0sXG4gIFwiYXVkaW8vdm5kLm51ZXJhLmVjZWxwNzQ3MFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImVjZWxwNzQ3MFwiXVxuICB9LFxuICBcImF1ZGlvL3ZuZC5udWVyYS5lY2VscDk2MDBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJlY2VscDk2MDBcIl1cbiAgfSxcbiAgXCJhdWRpby92bmQub2N0ZWwuc2JjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC5xY2VscFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJhdWRpby92bmQucmhldG9yZXguMzJrYWRwY21cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLnJpcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJpcFwiXVxuICB9LFxuICBcImF1ZGlvL3ZuZC5ybi1yZWFsYXVkaW9cIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlXG4gIH0sXG4gIFwiYXVkaW8vdm5kLnNlYWxlZG1lZGlhLnNvZnRzZWFsLm1wZWdcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiYXVkaW8vdm5kLnZteC5jdnNkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3ZuZC53YXZlXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZVxuICB9LFxuICBcImF1ZGlvL3ZvcmJpc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2VcbiAgfSxcbiAgXCJhdWRpby92b3JiaXMtY29uZmlnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImF1ZGlvL3dhdlwiOiB7XG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndhdlwiXVxuICB9LFxuICBcImF1ZGlvL3dhdmVcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3YXZcIl1cbiAgfSxcbiAgXCJhdWRpby93ZWJtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3ZWJhXCJdXG4gIH0sXG4gIFwiYXVkaW8veC1hYWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFhY1wiXVxuICB9LFxuICBcImF1ZGlvL3gtYWlmZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYWlmXCIsXCJhaWZmXCIsXCJhaWZjXCJdXG4gIH0sXG4gIFwiYXVkaW8veC1jYWZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNhZlwiXVxuICB9LFxuICBcImF1ZGlvL3gtZmxhY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZmxhY1wiXVxuICB9LFxuICBcImF1ZGlvL3gtbTRhXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcIm5naW54XCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm00YVwiXVxuICB9LFxuICBcImF1ZGlvL3gtbWF0cm9za2FcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1rYVwiXVxuICB9LFxuICBcImF1ZGlvL3gtbXBlZ3VybFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibTN1XCJdXG4gIH0sXG4gIFwiYXVkaW8veC1tcy13YXhcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndheFwiXVxuICB9LFxuICBcImF1ZGlvL3gtbXMtd21hXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3bWFcIl1cbiAgfSxcbiAgXCJhdWRpby94LXBuLXJlYWxhdWRpb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicmFtXCIsXCJyYVwiXVxuICB9LFxuICBcImF1ZGlvL3gtcG4tcmVhbGF1ZGlvLXBsdWdpblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicm1wXCJdXG4gIH0sXG4gIFwiYXVkaW8veC1yZWFsYXVkaW9cIjoge1xuICAgIFwic291cmNlXCI6IFwibmdpbnhcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicmFcIl1cbiAgfSxcbiAgXCJhdWRpby94LXR0YVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcImF1ZGlvL3gtd2F2XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3YXZcIl1cbiAgfSxcbiAgXCJhdWRpby94bVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieG1cIl1cbiAgfSxcbiAgXCJjaGVtaWNhbC94LWNkeFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2R4XCJdXG4gIH0sXG4gIFwiY2hlbWljYWwveC1jaWZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNpZlwiXVxuICB9LFxuICBcImNoZW1pY2FsL3gtY21kZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY21kZlwiXVxuICB9LFxuICBcImNoZW1pY2FsL3gtY21sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjbWxcIl1cbiAgfSxcbiAgXCJjaGVtaWNhbC94LWNzbWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNzbWxcIl1cbiAgfSxcbiAgXCJjaGVtaWNhbC94LXBkYlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcImNoZW1pY2FsL3gteHl6XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4eXpcIl1cbiAgfSxcbiAgXCJmb250L29wZW50eXBlXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJvdGZcIl1cbiAgfSxcbiAgXCJpbWFnZS9ibXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYm1wXCJdXG4gIH0sXG4gIFwiaW1hZ2UvY2dtXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY2dtXCJdXG4gIH0sXG4gIFwiaW1hZ2UvZml0c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS9nM2ZheFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImczXCJdXG4gIH0sXG4gIFwiaW1hZ2UvZ2lmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZ2lmXCJdXG4gIH0sXG4gIFwiaW1hZ2UvaWVmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaWVmXCJdXG4gIH0sXG4gIFwiaW1hZ2UvanAyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImltYWdlL2pwZWdcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJqcGVnXCIsXCJqcGdcIixcImpwZVwiXVxuICB9LFxuICBcImltYWdlL2pwbVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS9qcHhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiaW1hZ2Uva3R4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wia3R4XCJdXG4gIH0sXG4gIFwiaW1hZ2UvbmFwbHBzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImltYWdlL3BqcGVnXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZVxuICB9LFxuICBcImltYWdlL3BuZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBuZ1wiXVxuICB9LFxuICBcImltYWdlL3Bycy5idGlmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiYnRpZlwiXVxuICB9LFxuICBcImltYWdlL3Bycy5wdGlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiaW1hZ2UvcHdnLXJhc3RlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS9zZ2lcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNnaVwiXVxuICB9LFxuICBcImltYWdlL3N2Zyt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN2Z1wiLFwic3ZnelwiXVxuICB9LFxuICBcImltYWdlL3QzOFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS90aWZmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1widGlmZlwiLFwidGlmXCJdXG4gIH0sXG4gIFwiaW1hZ2UvdGlmZi1meFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS92bmQuYWRvYmUucGhvdG9zaG9wXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwc2RcIl1cbiAgfSxcbiAgXCJpbWFnZS92bmQuYWlyemlwLmFjY2VsZXJhdG9yLmF6dlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS92bmQuY25zLmluZjJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLmRlY2UuZ3JhcGhpY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInV2aVwiLFwidXZ2aVwiLFwidXZnXCIsXCJ1dnZnXCJdXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLmRqdnVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkanZ1XCIsXCJkanZcIl1cbiAgfSxcbiAgXCJpbWFnZS92bmQuZHZiLnN1YnRpdGxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3ViXCJdXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLmR3Z1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImR3Z1wiXVxuICB9LFxuICBcImltYWdlL3ZuZC5keGZcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkeGZcIl1cbiAgfSxcbiAgXCJpbWFnZS92bmQuZmFzdGJpZHNoZWV0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZmJzXCJdXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLmZweFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImZweFwiXVxuICB9LFxuICBcImltYWdlL3ZuZC5mc3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmc3RcIl1cbiAgfSxcbiAgXCJpbWFnZS92bmQuZnVqaXhlcm94LmVkbWljcy1tbXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtbXJcIl1cbiAgfSxcbiAgXCJpbWFnZS92bmQuZnVqaXhlcm94LmVkbWljcy1ybGNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJybGNcIl1cbiAgfSxcbiAgXCJpbWFnZS92bmQuZ2xvYmFsZ3JhcGhpY3MucGdiXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImltYWdlL3ZuZC5taWNyb3NvZnQuaWNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS92bmQubWl4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImltYWdlL3ZuZC5tcy1tb2RpXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWRpXCJdXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLm1zLXBob3RvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3ZHBcIl1cbiAgfSxcbiAgXCJpbWFnZS92bmQubmV0LWZweFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm5weFwiXVxuICB9LFxuICBcImltYWdlL3ZuZC5yYWRpYW5jZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS92bmQuc2VhbGVkLnBuZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS92bmQuc2VhbGVkbWVkaWEuc29mdHNlYWwuZ2lmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImltYWdlL3ZuZC5zZWFsZWRtZWRpYS5zb2Z0c2VhbC5qcGdcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLnN2ZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJpbWFnZS92bmQudGVuY2VudC50YXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwiaW1hZ2Uvdm5kLnZhbHZlLnNvdXJjZS50ZXh0dXJlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImltYWdlL3ZuZC53YXAud2JtcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndibXBcIl1cbiAgfSxcbiAgXCJpbWFnZS92bmQueGlmZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhpZlwiXVxuICB9LFxuICBcImltYWdlL3ZuZC56YnJ1c2gucGN4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcImltYWdlL3dlYnBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndlYnBcIl1cbiAgfSxcbiAgXCJpbWFnZS94LTNkc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiM2RzXCJdXG4gIH0sXG4gIFwiaW1hZ2UveC1jbXUtcmFzdGVyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJyYXNcIl1cbiAgfSxcbiAgXCJpbWFnZS94LWNteFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiY214XCJdXG4gIH0sXG4gIFwiaW1hZ2UveC1mcmVlaGFuZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZmhcIixcImZoY1wiLFwiZmg0XCIsXCJmaDVcIixcImZoN1wiXVxuICB9LFxuICBcImltYWdlL3gtaWNvblwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJpY29cIl1cbiAgfSxcbiAgXCJpbWFnZS94LWpuZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJuZ2lueFwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJqbmdcIl1cbiAgfSxcbiAgXCJpbWFnZS94LW1yc2lkLWltYWdlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzaWRcIl1cbiAgfSxcbiAgXCJpbWFnZS94LW1zLWJtcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJuZ2lueFwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImJtcFwiXVxuICB9LFxuICBcImltYWdlL3gtcGN4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwY3hcIl1cbiAgfSxcbiAgXCJpbWFnZS94LXBpY3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBpY1wiLFwicGN0XCJdXG4gIH0sXG4gIFwiaW1hZ2UveC1wb3J0YWJsZS1hbnltYXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBubVwiXVxuICB9LFxuICBcImltYWdlL3gtcG9ydGFibGUtYml0bWFwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwYm1cIl1cbiAgfSxcbiAgXCJpbWFnZS94LXBvcnRhYmxlLWdyYXltYXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInBnbVwiXVxuICB9LFxuICBcImltYWdlL3gtcG9ydGFibGUtcGl4bWFwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwcG1cIl1cbiAgfSxcbiAgXCJpbWFnZS94LXJnYlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicmdiXCJdXG4gIH0sXG4gIFwiaW1hZ2UveC10Z2FcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInRnYVwiXVxuICB9LFxuICBcImltYWdlL3gteGJpdG1hcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieGJtXCJdXG4gIH0sXG4gIFwiaW1hZ2UveC14Y2ZcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlXG4gIH0sXG4gIFwiaW1hZ2UveC14cGl4bWFwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4cG1cIl1cbiAgfSxcbiAgXCJpbWFnZS94LXh3aW5kb3dkdW1wXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4d2RcIl1cbiAgfSxcbiAgXCJtZXNzYWdlL2NwaW1cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibWVzc2FnZS9kZWxpdmVyeS1zdGF0dXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibWVzc2FnZS9kaXNwb3NpdGlvbi1ub3RpZmljYXRpb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibWVzc2FnZS9leHRlcm5hbC1ib2R5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1lc3NhZ2UvZmVlZGJhY2stcmVwb3J0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1lc3NhZ2UvZ2xvYmFsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1lc3NhZ2UvZ2xvYmFsLWRlbGl2ZXJ5LXN0YXR1c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtZXNzYWdlL2dsb2JhbC1kaXNwb3NpdGlvbi1ub3RpZmljYXRpb25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibWVzc2FnZS9nbG9iYWwtaGVhZGVyc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtZXNzYWdlL2h0dHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlXG4gIH0sXG4gIFwibWVzc2FnZS9pbWRuK3htbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcIm1lc3NhZ2UvbmV3c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtZXNzYWdlL3BhcnRpYWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlXG4gIH0sXG4gIFwibWVzc2FnZS9yZmM4MjJcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImVtbFwiLFwibWltZVwiXVxuICB9LFxuICBcIm1lc3NhZ2Uvcy1odHRwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1lc3NhZ2Uvc2lwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1lc3NhZ2Uvc2lwZnJhZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtZXNzYWdlL3RyYWNraW5nLXN0YXR1c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtZXNzYWdlL3ZuZC5zaS5zaW1wXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1lc3NhZ2Uvdm5kLndmYS53c2NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibW9kZWwvaWdlc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImlnc1wiLFwiaWdlc1wiXVxuICB9LFxuICBcIm1vZGVsL21lc2hcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtc2hcIixcIm1lc2hcIixcInNpbG9cIl1cbiAgfSxcbiAgXCJtb2RlbC92bmQuY29sbGFkYSt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkYWVcIl1cbiAgfSxcbiAgXCJtb2RlbC92bmQuZHdmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZHdmXCJdXG4gIH0sXG4gIFwibW9kZWwvdm5kLmZsYXRsYW5kLjNkbWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibW9kZWwvdm5kLmdkbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImdkbFwiXVxuICB9LFxuICBcIm1vZGVsL3ZuZC5ncy1nZGxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJtb2RlbC92bmQuZ3MuZ2RsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1vZGVsL3ZuZC5ndHdcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJndHdcIl1cbiAgfSxcbiAgXCJtb2RlbC92bmQubW9tbCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibW9kZWwvdm5kLm10c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm10c1wiXVxuICB9LFxuICBcIm1vZGVsL3ZuZC5vcGVuZ2V4XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1vZGVsL3ZuZC5wYXJhc29saWQudHJhbnNtaXQuYmluYXJ5XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1vZGVsL3ZuZC5wYXJhc29saWQudHJhbnNtaXQudGV4dFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtb2RlbC92bmQudmFsdmUuc291cmNlLmNvbXBpbGVkLW1hcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtb2RlbC92bmQudnR1XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widnR1XCJdXG4gIH0sXG4gIFwibW9kZWwvdnJtbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndybFwiLFwidnJtbFwiXVxuICB9LFxuICBcIm1vZGVsL3gzZCtiaW5hcnlcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIngzZGJcIixcIngzZGJ6XCJdXG4gIH0sXG4gIFwibW9kZWwveDNkK2Zhc3RpbmZvc2V0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm1vZGVsL3gzZCt2cm1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ4M2R2XCIsXCJ4M2R2elwiXVxuICB9LFxuICBcIm1vZGVsL3gzZCt4bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIngzZFwiLFwieDNkelwiXVxuICB9LFxuICBcIm1vZGVsL3gzZC12cm1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm11bHRpcGFydC9hbHRlcm5hdGl2ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2VcbiAgfSxcbiAgXCJtdWx0aXBhcnQvYXBwbGVkb3VibGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibXVsdGlwYXJ0L2J5dGVyYW5nZXNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibXVsdGlwYXJ0L2RpZ2VzdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtdWx0aXBhcnQvZW5jcnlwdGVkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZVxuICB9LFxuICBcIm11bHRpcGFydC9mb3JtLWRhdGFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlXG4gIH0sXG4gIFwibXVsdGlwYXJ0L2hlYWRlci1zZXRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibXVsdGlwYXJ0L21peGVkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZVxuICB9LFxuICBcIm11bHRpcGFydC9wYXJhbGxlbFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJtdWx0aXBhcnQvcmVsYXRlZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2VcbiAgfSxcbiAgXCJtdWx0aXBhcnQvcmVwb3J0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcIm11bHRpcGFydC9zaWduZWRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlXG4gIH0sXG4gIFwibXVsdGlwYXJ0L3ZvaWNlLW1lc3NhZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwibXVsdGlwYXJ0L3gtbWl4ZWQtcmVwbGFjZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0LzFkLWludGVybGVhdmVkLXBhcml0eWZlY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L2NhY2hlLW1hbmlmZXN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhcHBjYWNoZVwiLFwibWFuaWZlc3RcIl1cbiAgfSxcbiAgXCJ0ZXh0L2NhbGVuZGFyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaWNzXCIsXCJpZmJcIl1cbiAgfSxcbiAgXCJ0ZXh0L2NhbGVuZGVyXCI6IHtcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlXG4gIH0sXG4gIFwidGV4dC9jbWRcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJ0ZXh0L2NvZmZlZXNjcmlwdFwiOiB7XG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNvZmZlZVwiLFwibGl0Y29mZmVlXCJdXG4gIH0sXG4gIFwidGV4dC9jc3NcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImNzc1wiXVxuICB9LFxuICBcInRleHQvY3N2XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjc3ZcIl1cbiAgfSxcbiAgXCJ0ZXh0L2Nzdi1zY2hlbWFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9kaXJlY3RvcnlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9kbnNcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9lY21hc2NyaXB0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvZW5jYXBydHBcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9lbnJpY2hlZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L2Z3ZHJlZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L2dyYW1tYXItcmVmLWxpc3RcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9oanNvblwiOiB7XG4gICAgXCJleHRlbnNpb25zXCI6IFtcImhqc29uXCJdXG4gIH0sXG4gIFwidGV4dC9odG1sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJodG1sXCIsXCJodG1cIixcInNodG1sXCJdXG4gIH0sXG4gIFwidGV4dC9qYWRlXCI6IHtcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiamFkZVwiXVxuICB9LFxuICBcInRleHQvamF2YXNjcmlwdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcInRleHQvamNyLWNuZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L2pzeFwiOiB7XG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wianN4XCJdXG4gIH0sXG4gIFwidGV4dC9sZXNzXCI6IHtcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibGVzc1wiXVxuICB9LFxuICBcInRleHQvbWFya2Rvd25cIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9tYXRobWxcIjoge1xuICAgIFwic291cmNlXCI6IFwibmdpbnhcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibW1sXCJdXG4gIH0sXG4gIFwidGV4dC9taXphclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L24zXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJuM1wiXVxuICB9LFxuICBcInRleHQvcGFyYW1ldGVyc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3Bhcml0eWZlY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3BsYWluXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0eHRcIixcInRleHRcIixcImNvbmZcIixcImRlZlwiLFwibGlzdFwiLFwibG9nXCIsXCJpblwiLFwiaW5pXCJdXG4gIH0sXG4gIFwidGV4dC9wcm92ZW5hbmNlLW5vdGF0aW9uXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvcHJzLmZhbGxlbnN0ZWluLnJzdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3Bycy5saW5lcy50YWdcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkc2NcIl1cbiAgfSxcbiAgXCJ0ZXh0L3JhcHRvcmZlY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3JlZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3JmYzgyMi1oZWFkZXJzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvcmljaHRleHRcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInJ0eFwiXVxuICB9LFxuICBcInRleHQvcnRmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJydGZcIl1cbiAgfSxcbiAgXCJ0ZXh0L3J0cC1lbmMtYWVzY20xMjhcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC9ydHBsb29wYmFja1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3J0eFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3NnbWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzZ21sXCIsXCJzZ21cIl1cbiAgfSxcbiAgXCJ0ZXh0L3N0eWx1c1wiOiB7XG4gICAgXCJleHRlbnNpb25zXCI6IFtcInN0eWx1c1wiLFwic3R5bFwiXVxuICB9LFxuICBcInRleHQvdDE0MFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3RhYi1zZXBhcmF0ZWQtdmFsdWVzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0c3ZcIl1cbiAgfSxcbiAgXCJ0ZXh0L3Ryb2ZmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widFwiLFwidHJcIixcInJvZmZcIixcIm1hblwiLFwibWVcIixcIm1zXCJdXG4gIH0sXG4gIFwidGV4dC90dXJ0bGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0dGxcIl1cbiAgfSxcbiAgXCJ0ZXh0L3VscGZlY1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3VyaS1saXN0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ1cmlcIixcInVyaXNcIixcInVybHNcIl1cbiAgfSxcbiAgXCJ0ZXh0L3ZjYXJkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiB0cnVlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ2Y2FyZFwiXVxuICB9LFxuICBcInRleHQvdm5kLmFcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC92bmQuYWJjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvdm5kLmN1cmxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjdXJsXCJdXG4gIH0sXG4gIFwidGV4dC92bmQuY3VybC5kY3VybFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZGN1cmxcIl1cbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5jdXJsLm1jdXJsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJtY3VybFwiXVxuICB9LFxuICBcInRleHQvdm5kLmN1cmwuc2N1cmxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNjdXJsXCJdXG4gIH0sXG4gIFwidGV4dC92bmQuZGViaWFuLmNvcHlyaWdodFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5kbWNsaWVudHNjcmlwdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5kdmIuc3VidGl0bGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzdWJcIl1cbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5lc21lcnRlYy50aGVtZS1kZXNjcmlwdG9yXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvdm5kLmZseVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImZseVwiXVxuICB9LFxuICBcInRleHQvdm5kLmZtaS5mbGV4c3RvclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImZseFwiXVxuICB9LFxuICBcInRleHQvdm5kLmdyYXBodml6XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZ3ZcIl1cbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5pbjNkLjNkbWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCIzZG1sXCJdXG4gIH0sXG4gIFwidGV4dC92bmQuaW4zZC5zcG90XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic3BvdFwiXVxuICB9LFxuICBcInRleHQvdm5kLmlwdGMubmV3c21sXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvdm5kLmlwdGMubml0ZlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5sYXRleC16XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvdm5kLm1vdG9yb2xhLnJlZmxleFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5tcy1tZWRpYXBhY2thZ2VcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC92bmQubmV0MnBob25lLmNvbW1jZW50ZXIuY29tbWFuZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5yYWRpc3lzLm1zbWwtYmFzaWMtbGF5b3V0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvdm5kLnNpLnVyaWNhdGFsb2d1ZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3ZuZC5zdW4uajJtZS5hcHAtZGVzY3JpcHRvclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImphZFwiXVxuICB9LFxuICBcInRleHQvdm5kLnRyb2xsdGVjaC5saW5ndWlzdFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJpYW5hXCJcbiAgfSxcbiAgXCJ0ZXh0L3ZuZC53YXAuc2lcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC92bmQud2FwLnNsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIlxuICB9LFxuICBcInRleHQvdm5kLndhcC53bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3bWxcIl1cbiAgfSxcbiAgXCJ0ZXh0L3ZuZC53YXAud21sc2NyaXB0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImlhbmFcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid21sc1wiXVxuICB9LFxuICBcInRleHQvdnR0XCI6IHtcbiAgICBcImNoYXJzZXRcIjogXCJVVEYtOFwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInZ0dFwiXVxuICB9LFxuICBcInRleHQveC1hc21cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInNcIixcImFzbVwiXVxuICB9LFxuICBcInRleHQveC1jXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJjXCIsXCJjY1wiLFwiY3h4XCIsXCJjcHBcIixcImhcIixcImhoXCIsXCJkaWNcIl1cbiAgfSxcbiAgXCJ0ZXh0L3gtY29tcG9uZW50XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcIm5naW54XCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImh0Y1wiXVxuICB9LFxuICBcInRleHQveC1mb3J0cmFuXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmXCIsXCJmb3JcIixcImY3N1wiLFwiZjkwXCJdXG4gIH0sXG4gIFwidGV4dC94LWd3dC1ycGNcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJ0ZXh0L3gtaGFuZGxlYmFycy10ZW1wbGF0ZVwiOiB7XG4gICAgXCJleHRlbnNpb25zXCI6IFtcImhic1wiXVxuICB9LFxuICBcInRleHQveC1qYXZhLXNvdXJjZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiamF2YVwiXVxuICB9LFxuICBcInRleHQveC1qcXVlcnktdG1wbFwiOiB7XG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9LFxuICBcInRleHQveC1sdWFcIjoge1xuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJsdWFcIl1cbiAgfSxcbiAgXCJ0ZXh0L3gtbWFya2Rvd25cIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1hcmtkb3duXCIsXCJtZFwiLFwibWtkXCJdXG4gIH0sXG4gIFwidGV4dC94LW5mb1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibmZvXCJdXG4gIH0sXG4gIFwidGV4dC94LW9wbWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm9wbWxcIl1cbiAgfSxcbiAgXCJ0ZXh0L3gtcGFzY2FsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJwXCIsXCJwYXNcIl1cbiAgfSxcbiAgXCJ0ZXh0L3gtcHJvY2Vzc2luZ1wiOiB7XG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicGRlXCJdXG4gIH0sXG4gIFwidGV4dC94LXNhc3NcIjoge1xuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzYXNzXCJdXG4gIH0sXG4gIFwidGV4dC94LXNjc3NcIjoge1xuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJzY3NzXCJdXG4gIH0sXG4gIFwidGV4dC94LXNldGV4dFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZXR4XCJdXG4gIH0sXG4gIFwidGV4dC94LXNmdlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic2Z2XCJdXG4gIH0sXG4gIFwidGV4dC94LXV1ZW5jb2RlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ1dVwiXVxuICB9LFxuICBcInRleHQveC12Y2FsZW5kYXJcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInZjc1wiXVxuICB9LFxuICBcInRleHQveC12Y2FyZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widmNmXCJdXG4gIH0sXG4gIFwidGV4dC94bWxcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWUsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInhtbFwiXVxuICB9LFxuICBcInRleHQveG1sLWV4dGVybmFsLXBhcnNlZC1lbnRpdHlcIjoge1xuICAgIFwic291cmNlXCI6IFwiaWFuYVwiXG4gIH0sXG4gIFwidGV4dC95YW1sXCI6IHtcbiAgICBcImV4dGVuc2lvbnNcIjogW1wieWFtbFwiLFwieW1sXCJdXG4gIH0sXG4gIFwidmlkZW8vMWQtaW50ZXJsZWF2ZWQtcGFyaXR5ZmVjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vM2dwcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiM2dwXCIsXCIzZ3BwXCJdXG4gIH0sXG4gIFwidmlkZW8vM2dwcC10dFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvLzNncHAyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCIzZzJcIl1cbiAgfSxcbiAgXCJ2aWRlby9ibXBlZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL2J0NjU2XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vY2VsYlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL2R2XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vaDI2MVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiaDI2MVwiXVxuICB9LFxuICBcInZpZGVvL2gyNjNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImgyNjNcIl1cbiAgfSxcbiAgXCJ2aWRlby9oMjYzLTE5OThcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9oMjYzLTIwMDBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9oMjY0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJoMjY0XCJdXG4gIH0sXG4gIFwidmlkZW8vaDI2NC1yY2RvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vaDI2NC1zdmNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9qcGVnXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJqcGd2XCJdXG4gIH0sXG4gIFwidmlkZW8vanBlZzIwMDBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9qcG1cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImpwbVwiLFwianBnbVwiXVxuICB9LFxuICBcInZpZGVvL21qMlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWoyXCIsXCJtanAyXCJdXG4gIH0sXG4gIFwidmlkZW8vbXAxc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL21wMnBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9tcDJ0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ0c1wiXVxuICB9LFxuICBcInZpZGVvL21wNFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibXA0XCIsXCJtcDR2XCIsXCJtcGc0XCJdXG4gIH0sXG4gIFwidmlkZW8vbXA0di1lc1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL21wZWdcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIm1wZWdcIixcIm1wZ1wiLFwibXBlXCIsXCJtMXZcIixcIm0ydlwiXVxuICB9LFxuICBcInZpZGVvL21wZWc0LWdlbmVyaWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9tcHZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9udlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL29nZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wib2d2XCJdXG4gIH0sXG4gIFwidmlkZW8vcGFyaXR5ZmVjXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vcG9pbnRlclwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3F1aWNrdGltZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wicXRcIixcIm1vdlwiXVxuICB9LFxuICBcInZpZGVvL3Jhd1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3J0cC1lbmMtYWVzY20xMjhcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9ydHhcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby9zbXB0ZTI5Mm1cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby91bHBmZWNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby92YzFcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby92bmQuY2N0dlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5kZWNlLmhkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ1dmhcIixcInV2dmhcIl1cbiAgfSxcbiAgXCJ2aWRlby92bmQuZGVjZS5tb2JpbGVcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInV2bVwiLFwidXZ2bVwiXVxuICB9LFxuICBcInZpZGVvL3ZuZC5kZWNlLm1wNFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5kZWNlLnBkXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ1dnBcIixcInV2dnBcIl1cbiAgfSxcbiAgXCJ2aWRlby92bmQuZGVjZS5zZFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widXZzXCIsXCJ1dnZzXCJdXG4gIH0sXG4gIFwidmlkZW8vdm5kLmRlY2UudmlkZW9cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInV2dlwiLFwidXZ2dlwiXVxuICB9LFxuICBcInZpZGVvL3ZuZC5kaXJlY3R2Lm1wZWdcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby92bmQuZGlyZWN0di5tcGVnLXR0c1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5kbG5hLm1wZWctdHRzXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdm5kLmR2Yi5maWxlXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJkdmJcIl1cbiAgfSxcbiAgXCJ2aWRlby92bmQuZnZ0XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmdnRcIl1cbiAgfSxcbiAgXCJ2aWRlby92bmQuaG5zLnZpZGVvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdm5kLmlwdHZmb3J1bS4xZHBhcml0eWZlYy0xMDEwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdm5kLmlwdHZmb3J1bS4xZHBhcml0eWZlYy0yMDA1XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdm5kLmlwdHZmb3J1bS4yZHBhcml0eWZlYy0xMDEwXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdm5kLmlwdHZmb3J1bS4yZHBhcml0eWZlYy0yMDA1XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdm5kLmlwdHZmb3J1bS50dHNhdmNcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby92bmQuaXB0dmZvcnVtLnR0c21wZWcyXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdm5kLm1vdG9yb2xhLnZpZGVvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdm5kLm1vdG9yb2xhLnZpZGVvcFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5tcGVndXJsXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJteHVcIixcIm00dVwiXVxuICB9LFxuICBcInZpZGVvL3ZuZC5tcy1wbGF5cmVhZHkubWVkaWEucHl2XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJweXZcIl1cbiAgfSxcbiAgXCJ2aWRlby92bmQubm9raWEuaW50ZXJsZWF2ZWQtbXVsdGltZWRpYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5ub2tpYS52aWRlb3ZvaXBcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby92bmQub2JqZWN0dmlkZW9cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCJcbiAgfSxcbiAgXCJ2aWRlby92bmQuc2VhbGVkLm1wZWcxXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdm5kLnNlYWxlZC5tcGVnNFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC5zZWFsZWQuc3dmXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiXG4gIH0sXG4gIFwidmlkZW8vdm5kLnNlYWxlZG1lZGlhLnNvZnRzZWFsLm1vdlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIlxuICB9LFxuICBcInZpZGVvL3ZuZC51dnZ1Lm1wNFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1widXZ1XCIsXCJ1dnZ1XCJdXG4gIH0sXG4gIFwidmlkZW8vdm5kLnZpdm9cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInZpdlwiXVxuICB9LFxuICBcInZpZGVvL3dlYm1cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndlYm1cIl1cbiAgfSxcbiAgXCJ2aWRlby94LWY0dlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wiZjR2XCJdXG4gIH0sXG4gIFwidmlkZW8veC1mbGlcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImZsaVwiXVxuICB9LFxuICBcInZpZGVvL3gtZmx2XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiY29tcHJlc3NpYmxlXCI6IGZhbHNlLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJmbHZcIl1cbiAgfSxcbiAgXCJ2aWRlby94LW00dlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibTR2XCJdXG4gIH0sXG4gIFwidmlkZW8veC1tYXRyb3NrYVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImNvbXByZXNzaWJsZVwiOiBmYWxzZSxcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibWt2XCIsXCJtazNkXCIsXCJta3NcIl1cbiAgfSxcbiAgXCJ2aWRlby94LW1uZ1wiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibW5nXCJdXG4gIH0sXG4gIFwidmlkZW8veC1tcy1hc2ZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImFzZlwiLFwiYXN4XCJdXG4gIH0sXG4gIFwidmlkZW8veC1tcy12b2JcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcInZvYlwiXVxuICB9LFxuICBcInZpZGVvL3gtbXMtd21cIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndtXCJdXG4gIH0sXG4gIFwidmlkZW8veC1tcy13bXZcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJjb21wcmVzc2libGVcIjogZmFsc2UsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcIndtdlwiXVxuICB9LFxuICBcInZpZGVvL3gtbXMtd214XCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJ3bXhcIl1cbiAgfSxcbiAgXCJ2aWRlby94LW1zLXd2eFwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wid3Z4XCJdXG4gIH0sXG4gIFwidmlkZW8veC1tc3ZpZGVvXCI6IHtcbiAgICBcInNvdXJjZVwiOiBcImFwYWNoZVwiLFxuICAgIFwiZXh0ZW5zaW9uc1wiOiBbXCJhdmlcIl1cbiAgfSxcbiAgXCJ2aWRlby94LXNnaS1tb3ZpZVwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wibW92aWVcIl1cbiAgfSxcbiAgXCJ2aWRlby94LXNtdlwiOiB7XG4gICAgXCJzb3VyY2VcIjogXCJhcGFjaGVcIixcbiAgICBcImV4dGVuc2lvbnNcIjogW1wic212XCJdXG4gIH0sXG4gIFwieC1jb25mZXJlbmNlL3gtY29vbHRhbGtcIjoge1xuICAgIFwic291cmNlXCI6IFwiYXBhY2hlXCIsXG4gICAgXCJleHRlbnNpb25zXCI6IFtcImljZVwiXVxuICB9LFxuICBcIngtc2hhZGVyL3gtZnJhZ21lbnRcIjoge1xuICAgIFwiY29tcHJlc3NpYmxlXCI6IHRydWVcbiAgfSxcbiAgXCJ4LXNoYWRlci94LXZlcnRleFwiOiB7XG4gICAgXCJjb21wcmVzc2libGVcIjogdHJ1ZVxuICB9XG59XG4iLCIvKiFcbiAqIG1pbWUtZGJcbiAqIENvcHlyaWdodChjKSAyMDE0IEpvbmF0aGFuIE9uZ1xuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuLyoqXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGIuanNvbicpXG4iLCIndXNlIHN0cmljdCc7XG5pbXBvcnQgUmVwb3J0IGZyb20gJy4vcmVwb3J0JztcblxuLyoqXG4gKiBBZ2VudCByZXBvcnQgY2xhc3MgcHJvdmlkZXMgYXV0b21hdGljIGluZm9ybWF0aW9uIGdldGhlcmluZyBhbmQgcmVwb3J0XG4gKiBnZW5lcmF0aW9uIGZvciBicm93c2VyIGFuZCB1c2VyIHBsYXRmb3JtIHJlbGF0ZWQgZGF0YS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQWdlbnRSZXBvcnQgZXh0ZW5kcyBSZXBvcnQge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiB1c2VyIGFnZW50IHJlcG9ydCBvYmplY3QgYW5kIGdhdGhlcnMgYWxsIHJlbGF0ZWQgaW5mb3JtYXRpb25cbiAgICAgKiBhdCB0aGUgc2FtZSB0aW1lLiBUaGlzIHJlcG9yc3Qgd2lsbCBiZSByZWFkeSBmb3IgZGlzcGF0Y2hpbmcganVzdCBhZnRlclxuICAgICAqIGJlaW5nIGNyZWF0ZWQuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCd1c2VyLWFnZW50Jyk7XG5cbiAgICAgICAgbGV0IGRhdGEgPSB7fTtcblxuICAgICAgICBsZXQgZW50cmllcyA9IFsnYXBwQ29kZU5hbWUnLCAnYXBwTmFtZScsICdhcHBWZXJzaW9uJywgJ3VzZXJBZ2VudCcsXG4gICAgICAgICAgICAgICAgICAgICAgICdjb29raWVFbmFibGVkJywgJ2xhbmd1YWdlJywgJ3BsYXRmb3JtJywgJ3Byb2R1Y3QnXTtcblxuICAgICAgICBmb3IgKGxldCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICAgICAgICBkYXRhW2VudHJ5XSA9IHdpbmRvdy5uYXZpZ2F0b3JbZW50cnldO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fZGF0YSA9IGRhdGE7XG5cbiAgICAgICAgaWYgKHdpbmRvdy5uYXZpZ2F0b3IuZ2VvbG9jYXRpb24pIHtcbiAgICAgICAgICAgIGxldCBwb3NpdGlvbiA9IHRoaXMuX3VwZGF0ZUxvY2F0aW9uLmJpbmQodGhpcyk7XG5cbiAgICAgICAgICAgIHdpbmRvdy5uYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKHBvc2l0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2RhdGFbJ2Nvb3JkcyddID0gJ24vYSc7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBfdXBkYXRlTG9jYXRpb24obG9jYXRpb24pIHtcbiAgICAgICAgdGhpcy5fZGF0YVsnY29vcmRzJ10gPSBsb2NhdGlvbi5jb29yZHM7XG4gICAgfVxuXG59XG4iLCIndXNlIHN0cmljdCc7XG5pbXBvcnQgUmVwb3J0IGZyb20gJy4vcmVwb3J0JztcblxuLyoqXG4gKiBQYWdlIHJlcG9ydCBjbGFzcyBwcm92aWRlcyBhdXRvbWF0aWMgaW5mb3JtYXRpb24gZ2F0aGVyaW5nIGFuZCByZXBvcnRcbiAqIGdlbmVyYXRpb24gZm9yIGNvbW1vbiBwYWdlIHBlcmZvcm1hbmNlIHRpbWluZyBtZWFzdXJlcy5cbiAqIEluIG9yZGVyIHRvIGdldCB0aGlzIHJlcG9ydCBpbmZvcm1hdGlvbiBmdWxseSBhdmFpbGFibGUgaXQgaXMgcmVxdWlyZWRcbiAqIHRvIGNyZWF0ZSBpdCBhZnRlciB0aGUgcGFnZSBoYXMgYmVlbiB0b3RhbGx5IGxvYWRlZC5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFnZVJlcG9ydCBleHRlbmRzIFJlcG9ydCB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgUGFnZSB0aW1pbmcgUmVwb3J0IG9iamVjdCBhbmQgZ2F0aGVycyBhbGwgcmVsYXRlZCBpbmZvcm1hdGlvblxuICAgICAqIGF0IHRoZSBzYW1lIHRpbWUuIFRoaXMgcmVwb3JzdCB3aWxsIGJlIHJlYWR5IGZvciBkaXNwYXRjaGluZyBhZnRlciBiZWluZ1xuICAgICAqIGNyZWF0ZWQuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCdwYWdlLXRpbWluZycpO1xuXG4gICAgICAgIGxldCBzb3VyY2VJbmZvID0ge307XG4gICAgICAgIGxldCB0aW1pbmdJbmZvID0ge307XG4gICAgICAgIGxldCB0aW1pbmcgPSBwZXJmb3JtYW5jZS50aW1pbmc7XG5cbiAgICAgICAgbGV0IHRpbWluZ0VudHJpZXMgPSBbJ2Nvbm5lY3QnLCAnZG9tYWluTG9va3VwJywgJ2RvbUNvbnRlbnRMb2FkZWRFdmVudCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2xvYWRFdmVudCcsICdyZWRpcmVjdCcsICdyZXNwb25zZScsICd1bmxvYWRFdmVudCddO1xuXG4gICAgICAgIGxldCBsb2NhdGlvbkVudHJpZXMgPSBbJ29yaWdpbicsICdwcm90b2NvbCcsJ3BhdGhuYW1lJ107XG5cbiAgICAgICAgZm9yIChsZXQgZW50cnkgb2YgdGltaW5nRW50cmllcykge1xuICAgICAgICAgICAgbGV0IHN0YXJ0ID0gdGltaW5nW2VudHJ5ICsgJ1N0YXJ0J107XG4gICAgICAgICAgICBsZXQgZW5kID0gdGltaW5nW2VudHJ5ICsgJ0VuZCddO1xuXG4gICAgICAgICAgICB0aW1pbmdJbmZvW2VudHJ5XSA9IGVuZCAtIHN0YXJ0O1xuICAgICAgICB9XG5cbiAgICAgICAgc291cmNlSW5mb1sndGl0bGUnXSA9IHdpbmRvdy5kb2N1bWVudC50aXRsZTtcblxuICAgICAgICBmb3IgKGxldCBlbnRyeSBvZiBsb2NhdGlvbkVudHJpZXMpIHtcbiAgICAgICAgICAgIHNvdXJjZUluZm9bZW50cnldID0gd2luZG93LmRvY3VtZW50LmxvY2F0aW9uW2VudHJ5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2RhdGEgPSB7XG4gICAgICAgICAgICAnc291cmNlJyA6IHNvdXJjZUluZm8sXG4gICAgICAgICAgICAndGltaW5nJyA6IHRpbWluZ0luZm9cbiAgICAgICAgfTtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5pbXBvcnQgUmVwb3J0IGZyb20gJy4vcmVwb3J0JztcbmltcG9ydCBVdGlsIGZyb20gJy4uL3V0aWwnO1xuXG4vKipcbiAqIFByb2ZpbGUgcmVwb3J0IGNsYXNzIHByb3ZpZGVzIHRoZSBtZWFucyB0byBjb2xsZWN0IGluZm9ybWF0aW9uIGZvciBhIHNpbmdsZVxuICogbmFtZWQgb3BlcmF0aW9uIGJ5IHNhdmluZyB0aGUgdGltZSBzaW5jZSBpdCBoYXMgYmVlbiBjcmVhdGVkIHVudGlsIGl0IGlzXG4gKiBjb21wbGV0ZWQgdXNpbmcgdGhlIFByb2ZpbGVSZXBvcnQ6OmNvbXBsZXRlIG1ldGhvZC4gQWZ0ZXIgY29tcGxlYXRpbmcgYSByZXBvcnRcbiAqIGl0IHdpbGwgYmUgYXV0b21hdGljYWxseSBkaXNwYXRjaGVkIHRvIHRoZSBzZXJ2ZXIgcm91dGluZyBxdWV1ZS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUHJvZmlsZVJlcG9ydCBleHRlbmRzIFJlcG9ydCB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IHByb2ZpbGUgcmVwb3J0IGluc3RhbmNlLlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gbmFtZSBBbiBpZGVudGlmaWVyIHRoYXQgd2lsbCBiZSB1c2VkIHdoZW4gZGF0YSBpcyBwb3N0ZWRcbiAgICAgKiAgICAgICAgICAgICAgICAgIHRocm91Z2ggdGhlIFJlb3V0ZXIgaW50byB0aGUgcmVtb3RlIHNlcnZlci5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihuYW1lKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX25hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLl9mcm9tID0gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgICB0aGlzLl90byA9IG51bGw7XG4gICAgICAgIHRoaXMuX3J1bm5pbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLl9mcm9tVVRDID0gKG5ldyBEYXRlKCkpLnRvVVRDU3RyaW5nKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgdG90YWwgbnVtYmVyIGlmIG1pbGxpc2Vjb25kcyBwYXNzZWQgc2luY2UgdGhpcyByZXBvcnQgaGFzXG4gICAgICogYmVlbiBjcmVhdGVkIGFuZCB1bnRpbCB0aGUgdGltZSBpdCBoYXMgYmVlbiBjb21wbGV0ZWQsIG9yIGN1cnJlbnQgdGltZVxuICAgICAqIGlmIHRoZSBwcm9maWxlIHJlcG9ydCBpcyBzdGlsbCB1bmRlciBwcm9ncmVzcy5cbiAgICAgKiBAcmV0dXJuIHtOdW5iZXJ9XG4gICAgICovXG4gICAgZ2V0IGVsYXBzZWQoKSB7XG4gICAgICAgIGlmICghdGhpcy5pc1J1bm5pbmcpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9mcm9tIC0gdGhpcy5fdG87XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5fZnJvbSAtIHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgY3VycmVudCBwcm9maWxpbmcgcmVwb3J0IGhhcyBiZWVuIHlldCBjb21wbGV0ZWQuXG4gICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBnZXQgaXNSdW5uaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcnVubmluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb21wbGVhdGVzIGN1cnJlbnQgcHJvZmlsaW5nIHJlcG9ydCBhbmQgZGlzcGF0Y2hlcyB0aGUgcmVzdWx0aW5nXG4gICAgICogaW5mb3JtYXRpb24gaW50byB0aGUgc2VydmVyIHJvdXRpbmcgcXVldWUuXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBkaXNwYXRjaCBTZW5kIGZhbHNlIGlmIHlvdSBkb24ndCB3YW50IHRvIHNlbmQgdGhpc1xuICAgICAqICAgICAgICAgICAgICAgICAgcHJvZmlsaW5nIHJlcG9ydCBpbnRvIHRoZSBkaXNwYXRjaGluZyBxdWV1ZS5cbiAgICAgKi9cbiAgICBjb21wbGV0ZShkaXNwYXRjaCkge1xuICAgICAgICBpZiAoIXRoaXMuX3J1bm5pbmcpIHJldHVybjtcblxuICAgICAgICB0aGlzLl9ydW5uaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMudG8gPSB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICAgIHRoaXMuX3RvVVRDID0gKG5ldyBEYXRlKCkpLnRvVVRDU3RyaW5nKCk7XG5cbiAgICAgICAgLy8gQnVpbGQgcmVwb3J0IGRhdGFcbiAgICAgICAgdGhpcy5fZGF0YSA9IHtcbiAgICAgICAgICAgICduYW1lJzogdGhpcy5fbmFtZSxcbiAgICAgICAgICAgICdkdXJhdGlvbic6IHRoaXMuZWxhcHNlZCxcbiAgICAgICAgICAgICdzdGFydGVkJzogdGhpcy5fZnJvbVVUQ1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChkaXNwYXRjaCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2goKTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG59XG5cbi8qKlxuICogUHJvZmlsZSBkaWdlc3QgY2xhc3MgcHJvdmlkZXMgdGhlIG1lYW5zIHRvIGdhdGhlciBhIHNldCBvZiBwcm9maWxpbmdcbiAqIGluZGl2aWR1YWwgcmVzdWx0cyBhbmQgcm91dGUgc3RhdGljcyByZWxhdGVkIHRvIHRoZSBwZXJmb3JtYW5jZSBvZiB0aGVcbiAqIHdob2xlIHNldCBvZiBlbnRyaWVzIGluIGEgc2luZ2xlIHJlcG9ydC4gVGhpcyByZXBvcnN0IGlzIHVzZWZ1bCBmb3IgdGhvc2VcbiAqIGZ1bmN0aW9ucyB0aGF0IGFyZSBjYWxsZWQgYSBsb3Qgb2YgdGltZXMgYW5kIHRpbWUgc3BlbnQgdmFyaWVzIGZyb20gZXhlY3V0aW9uXG4gKiB0byBleGVjdXRpb24gZ3JlYXRseS5cbiAqL1xuZXhwb3J0IGNsYXNzIFByb2ZpbGVEaWdlc3QgZXh0ZW5kcyBSZXBvcnQge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBwcm9maWxlIHJlcG9ydCBpbnN0YW5jZS5cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IG5hbWUgQW4gaWRlbnRpZmllciB0aGF0IHdpbGwgYmUgdXNlZCB3aGVuIGRhdGEgaXMgcG9zdGVkXG4gICAgICogICAgICAgICAgICAgICAgICB0aHJvdWdoIHRoZSBSZW91dGVyIGludG8gdGhlIHJlbW90ZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IobmFtZSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5fcHJvZmlsZXMgPSBbXTtcbiAgICAgICAgdGhpcy5fcnVubmluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuX2Zyb21VVEMgPSAobmV3IERhdGUoKSkudG9VVENTdHJpbmcoKTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgcHJvZmlsZSBtZWFzdXJlIG9wZXJhdGlvbiBhbmQgY2xvc2VzIGFueSBvdGhlciBtZWFzdXJpbmdcbiAgICAgKiBwcm9jZXNzIHRoYXQgY291bGQgYmUgcnVubmluZyxcbiAgICAgKi9cbiAgICBzdGFydE1lYXN1cmUoKSB7XG4gICAgICAgIHRoaXMuY29tcGxldGVNZWFzdXJlKCk7XG5cbiAgICAgICAgbGV0IG5hbWUgPSB0aGlzLl9uYW1lICsgJy0nICsgdGhpcy5fcHJvZmlsZXMubGVuZ3RoO1xuICAgICAgICB0aGlzLl9wcm9maWxlcy5wdXNoKG5ldyBQcm9maWxlKG5hbWUpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb21wbGV0ZXMgYSBwcm9maWxpbmcgbWVhc3VyZSBvcGVyYXRpb24gYmVpbmcgZXhlY3V0ZWQgYXMgcGFydCBvZiB0aGVcbiAgICAgKiBzZXQuXG4gICAgICovXG4gICAgY29tcGxldGVNZWFzdXJlKCkge1xuXG4gICAgICAgIGlmKHRoaXMuX3Byb2ZpbGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gICAgICAgIGxldCBjdXJyZW50ID0gdGhpcy5fcHJvZmlsZXNbdGhpcy5fcHJvZmlsZXMubGVuZ3RoIC0gMV07XG4gICAgICAgIGN1cnJlbnQuY29tcGxldGUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb21wbGVhdGVzIGN1cnJlbnQgcHJvZmlsaW5nIGRpZ2VzdCByZXBvcnQgYW5kIGRpc3BhdGNoZXMgdGhlIHJlc3VsdGluZ1xuICAgICAqIGluZm9ybWF0aW9uIGludG8gdGhlIHNlcnZlciByb3V0aW5nIHF1ZXVlLlxuICAgICAqL1xuICAgIGNvbXBsZXRlKCkge1xuXG4gICAgICAgIGlmICghdGhpcy5fcnVubmluZykgcmV0dXJuO1xuICAgICAgICB0aGlzLl9ydW5uaW5nID0gZmFsc2U7XG5cbiAgICAgICAgLy8gZ2V0IHN1cmUgYWxsIG1lYXN1cmVzIGFyZSBjb21wbGV0ZWRcbiAgICAgICAgdGhpcy5jb21wbGV0ZU1lYXN1cmUoKTtcblxuICAgICAgICBsZXQgdmFsdWVzID0gW107XG5cbiAgICAgICAgZm9yIChwcm9maWxlIG9mIHRoaXMuX3Byb2ZpbGVzKSB7XG4gICAgICAgICAgICB2YWx1ZXMucHVzaChwcm9maWxlLmVsYXBzZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgcmVwb3J0IGRhdGFcbiAgICAgICAgdGhpcy5fZGF0YSA9IHtcbiAgICAgICAgICAgICduYW1lJzogdGhpcy5fbmFtZSxcbiAgICAgICAgICAgICdlbnRyaWVzJzogdGhpcy5fcHJvZmlsZXMubGVuZ3RoLFxuICAgICAgICAgICAgJ21lZGlhbic6IFV0aWwubWVkaWFuKHZhbHVlcyksXG4gICAgICAgICAgICAnbWF4JzogdmFsdWVzWzBdLFxuICAgICAgICAgICAgJ21pbic6IHZhbHVlW3ZhbHVlcy5sZW5ndGggLSAxXVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2goKTtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBSb3V0ZXIgZnJvbSAnLi4vcm91dGVyJztcbmltcG9ydCBVdGlsIGZyb20gJy4uL3V0aWwnO1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIHJlcG9ydCBnZW5lcmF0aW9uLCB0aGlzIGNsYXNzIGNvdGFpbnMgYSBtaW5pbWFsIHNldCBvZiBkYXRhXG4gKiBzdHJ1Y3R1cmVzIGFuZCBmdW5jdGlvbmFsaXR5IHVzZWQgdG8gZ2F0aGVyIGFuZCBwb3N0IGluZm9ybWF0aW9uIHRocm91Z2ggdGhlXG4gKiByb3V0aW5nIHNlcnZpY2UgdXNlZCB0byBmbHVzaCBnYXRoZXJlZCBpbmZvcm1hdGlvbiB0byByZW1vdGUgc2VydmVyLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZXBvcnQge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyByZXBvcnQgaW5zdGFuY2UuXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBuYW1lIEFuIGlkZW50aWZpZXIgdGhhdCB3aWxsIGJlIHVzZWQgd2hlbiBkYXRhIGlzIHBvc3RlZFxuICAgICAqICAgICAgICAgICAgICAgICAgdGhyb3VnaCB0aGUgUmVvdXRlciBpbnRvIHRoZSByZW1vdGUgc2VydmVyLlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG5hbWUpIHtcbiAgICAgICAgdGhpcy5fZGF0YSA9IHt9O1xuICAgICAgICB0aGlzLl9uYW1lID0gbmFtZSB8fCBVdGlsLmdlbmVyYXRlR1VJRCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSByZXByZXNlbnRhdGlvbiBvZiByZXBvcnQgZGF0YSBhbG9uZyB3aXRoIGl0cyBwcm92aWRlZCBuYW1lXG4gICAgICogdG8gYmUgdXNlZCBvbiB0aGUgcmVwb3J0IGRpc3BhdGhpbmcgY3ljbGUuXG4gICAgICogQHJldHVybiB7T2JqZWN0fVxuICAgICAqL1xuICAgIGdldCBkYXRhKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgJ25hbWUnOiB0aGlzLm5hbWUsXG4gICAgICAgICAgICAnZGF0YSc6IHRoaXMuX2RhdGFcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgdGV4dHVhbCBpZGVudGlmaWVyIHNldCBmb3IgdGhpc1xuICAgICAqIHNwZWNpZmljIHJlcG9ydCB3aGVuIGNyZWF0ZWQsXG4gICAgICogQHJldHVybiB7U3RyaW5nfVxuICAgICAqL1xuICAgIGdldCBuYW1lKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbmFtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZW5kcyB0aGUgcmVwb3J0IGRhdGEgdGhyb3VnaCB0aGUgUm91dGVyIGRpc3BhdGNoaW5nIHF1ZXVlLlxuICAgICAqL1xuICAgIGRpc3BhdGNoKCkge1xuICAgICAgICBSb3V0ZXIuZW5xdWV1ZSh0aGlzLmRhdGEpO1xuICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcbmltcG9ydCBtaW1lIGZyb20gJ21pbWUtdHlwZXMnO1xuaW1wb3J0IFV0aWwgZnJvbSAnLi4vdXRpbCc7XG5pbXBvcnQgUmVwb3J0IGZyb20gJy4vcmVwb3J0JztcblxuLyoqXG4gKiBSZXNvdXJjZSBkaXNnZXQgcmVwb3J0IGNsYXNzIHByb3ZpZGVzIGEgc2V0IG9mIHBhZ2UgcmVzb3VyY2UgbG9hZGluZyBzdGF0aWNzXG4gKiB0b29rIGZyb20gdGhlIHBlcmZvcm1hbmNlIGVudHJpZXMgYXZhaWxhYmxlIG9uIHRoZSBicm93c2VyIGF0IHRoZSBtb21lbnQgb2ZcbiAqIGl0cyBjcmVhdGlvbi4gVGhpcyBjbGFzcyB3aWxsIGdlbmVyYXRlIGEgcmVwb3J0IHdpdGggdGhlIGxvbmdlc3QgYW5kIHNob3J0ZXNcbiAqIHRpbWVzIGNvbnN1bWVkIGJ5IHRoZSBsb2FkZWQgcmVzb3VyY2VzIGF0IHRoZSBtb21lbnQgb2YgaXRzIGNyZWF0aW9uIGFsb25nXG4gKiB3aXRoIHRoZSBkZXRhaWxlZCBpbmZvcm1hdGlvbiBvZiB0aGUgcmVzb3VyY2UgcmVxdWVzdHMgdGhhdCBnZW5lcmF0ZWQgdGhvc2VcbiAqIHZhbHVlcy4gRm9yIGFsbCBvdGhlciByZXF1ZXN0cyBkaWdlc3QgcmVwb3J0IHdpbGwgZ2VuZXJhdGUgYSBjb3VudCBvZlxuICogaW5kaXZpZHVhbCByZXNvdXJjZSBwbHVzIHRoZSB0b3RhbCB0aW1lIHNwZW50IGJ5IHRoZW0gc3BsaXQgaW4gc2V2ZXJhbFxuICogY2F0ZWdvcmllcy5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVzb3VyY2VzRGlnZXN0IGV4dGVuZHMgUmVwb3J0IHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBSZXNvdXJjZSBkaWdlc3QgUmVwb3J0IG9iamVjdCBhbmQgZ2F0aGVycyBhbGwgcmVsYXRlZCBpbmZvcm1hdGlvblxuICAgICAqIGF0IHRoZSBzYW1lIHRpbWUuIFRoaXMgcmVwb3JzdCB3aWxsIGJlIHJlYWR5IGZvciBkaXNwYXRjaGluZyBhZnRlciBiZWluZ1xuICAgICAqIGNyZWF0ZWQuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCdyZXNvdXJjZXMtdGltaW5nLWRpZ2VzdCcpO1xuXG4gICAgICAgIGxldCByZXNvdXJjZXMgPSBwZXJmb3JtYW5jZS5nZXRFbnRyaWVzKCk7XG4gICAgICAgIGxldCBpbml0aWF0b3JzID0ge307XG4gICAgICAgIGxldCBtaW1lVHlwZXMgPSB7fTtcbiAgICAgICAgbGV0IHRpbWluZyA9IHtcbiAgICAgICAgICAgICdsb25nZXN0Jzoge1xuICAgICAgICAgICAgICAgICdkdXJhdGlvbic6IDBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnc2hvcnRlc3QnOiB7XG4gICAgICAgICAgICAgICAgJ2R1cmF0aW9uJzogMFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBmb3IgKGxldCByZXNvdXJjZSBvZiByZXNvdXJjZXMpIHtcblxuICAgICAgICAgICAgLy8gS2VlcCBmdWxsIHJlY29yZCBvZiB0aGUgc2hvcnRlc3QgYW5kIGxvbmdlc3QgcmVzb3VyY2VcbiAgICAgICAgICAgIC8vIHJlcXVlc3QgdGltZVxuICAgICAgICAgICAgaWYgKHJlc291cmNlLmR1cmF0aW9uID4gdGltaW5nLmxvbmdlc3QuZHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aW1pbmcubG9uZ2VzdC5kdXJhdGlvbiA9IE1hdGgucm91bmQocmVzb3VyY2UuZHVyYXRpb24pO1xuICAgICAgICAgICAgICAgIHRpbWluZy5sb25nZXN0LnJlc291cmNlID0gcmVzb3VyY2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChyZXNvdXJjZS5kdXJhdGlvbiA8IHRpbWluZy5zaG9ydGVzdC5kdXJhdGlvbiB8fFxuICAgICAgICAgICAgICAgIHRpbWluZy5zaG9ydGVzdC5kdXJhdGlvbiA9PSAwKSB7XG4gICAgICAgICAgICAgICAgdGltaW5nLnNob3J0ZXN0LmR1cmF0aW9uID0gTWF0aC5yb3VuZChyZXNvdXJjZS5kdXJhdGlvbik7XG4gICAgICAgICAgICAgICAgdGltaW5nLnNob3J0ZXN0LnJlc291cmNlID0gcmVzb3VyY2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN1bSB0aGUgdGltZSBmb3IgcmVzb3VyY2UgcmVxdWVzdCBpbml0aWF0b3JzXG4gICAgICAgICAgICBsZXQgaW5pdGlhdG9yVHlwZSA9IHJlc291cmNlLmluaXRpYXRvclR5cGU7XG5cbiAgICAgICAgICAgIGlmICghaW5pdGlhdG9yc1tpbml0aWF0b3JUeXBlXSkge1xuICAgICAgICAgICAgICAgIGluaXRpYXRvcnNbaW5pdGlhdG9yVHlwZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICdjb3VudCc6IDAsXG4gICAgICAgICAgICAgICAgICAgICd0b3RhbCc6IDBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpbml0aWF0b3JzW2luaXRpYXRvclR5cGVdLmNvdW50ICs9IDE7XG4gICAgICAgICAgICBpbml0aWF0b3JzW2luaXRpYXRvclR5cGVdLnRvdGFsICs9IE1hdGgucm91bmQocmVzb3VyY2UuZHVyYXRpb24pO1xuXG4gICAgICAgICAgICAvL1N1bSB0aGUgdGltZSBmb3IgZGlmZmVyZW50IG1pbWUgdHlwZXMgd2hlbiBhdmFpbGFibGVcbiAgICAgICAgICAgIGxldCBtaW1lVHlwZSA9IG1pbWUubG9va3VwKHJlc291cmNlLm5hbWUpO1xuXG4gICAgICAgICAgICBpZiAoIW1pbWVUeXBlKSBjb250aW51ZTtcblxuICAgICAgICAgICAgaWYgKCFtaW1lVHlwZXNbbWltZVR5cGVdKSB7XG4gICAgICAgICAgICAgICAgbWltZVR5cGVzW21pbWVUeXBlXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgJ2NvdW50JzogMCxcbiAgICAgICAgICAgICAgICAgICAgJ3RvdGFsJzogMFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1pbWVUeXBlc1ttaW1lVHlwZV0uY291bnQgKz0gMTtcbiAgICAgICAgICAgIG1pbWVUeXBlc1ttaW1lVHlwZV0udG90YWwgKz0gTWF0aC5yb3VuZChyZXNvdXJjZS5kdXJhdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZnRlciBrZWVwaW5nIHRoZSBsb25nZXN0IGFuZCBzaG9ydGVzdCBsb2FkaW5nIHRpbWUgcmVsYXRlZCByZXNvdXJjZXNcbiAgICAgICAgLy8gZ2V0IHN1cmUgb25seSB0byBrZWVwIGl0J3Mgb3duIHByb3BlcnRpZXMgYW5kIGdldCByaWQgb2YgdGhlIHJlYXN0IG9mXG4gICAgICAgIC8vIHRoZSBvYmplY3QgaW4gb3JkZXIgdG8gcGFzcyBpdCB0cm91Z2ggdGhlIGRpc3BhdGNoZXIgd29ya2VyIHNhZmVseVxuICAgICAgICB0aW1pbmcubG9uZ2VzdC5yZXNvdXJjZSA9IFV0aWwuY29weU9iamVjdCh0aW1pbmcubG9uZ2VzdC5yZXNvdXJjZSk7XG4gICAgICAgIHRpbWluZy5zaG9ydGVzdC5yZXNvdXJjZSA9IFV0aWwuY29weU9iamVjdCh0aW1pbmcuc2hvcnRlc3QucmVzb3VyY2UpO1xuXG4gICAgICAgIHRoaXMuX2RhdGEgPSB7XG4gICAgICAgICAgICAndGltaW5nJzogdGltaW5nLFxuICAgICAgICAgICAgJ2luaXRpYXRvcnMnOiBpbml0aWF0b3JzLFxuICAgICAgICAgICAgJ21pbWVUeXBlcyc6IG1pbWVUeXBlc1xuICAgICAgICB9O1xuICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFV0aWwgZnJvbSAnLi91dGlsJztcbmltcG9ydCBQYWdlUmVwb3J0IGZyb20gJy4vZGF0YS9wYWdlJztcbmltcG9ydCBBZ2VudFJlcG9ydCBmcm9tICcuL2RhdGEvYWdlbnQnO1xuaW1wb3J0IFByb2ZpbGVSZXBvcnQgZnJvbSAnLi9kYXRhL3Byb2ZpbGUnO1xuaW1wb3J0IFJlc291cmNlRGlnZXN0IGZyb20gJy4vZGF0YS9yZXNvdXJjZSc7XG5cbmxldCBzaW5nbGV0b24gPSBTeW1ib2woKTtcbmxldCBzaW5nbGV0b25FbmZvcmNlciA9IFN5bWJvbCgpO1xuXG4vKipcbiAqIE1vbml0b3IgY2xhc3MgcHJvdmlkZXMgYSBzaW5nbGUgYWNjZXNpYmxlIHBvaW50IGZvciBmZXRjaGluZyBpbmZvcm1hdGlvbiBhbmRcbiAqIGdlbmVyYXRpbmcgUmVhbCBVc2VyIE1vbml0b3JpbmcgcmVwb3J0cyB0byBhIHJlbW90ZSBzZXJ2ZXIuIE1vbml0b3Igd2lsbFxuICogbGlzdGVuIHNldmVyYWwgZXZlbnRzIG9uIHdlYnBhZ2UgYW5kIHNlbmQgcmVzdWx0cyB0aHJvdWdoIHRoZSBuZXR3b3JrXG4gKiBkaXNwYXRjaGVyIGluIG9yZGVyIHRvIGJlIGRlbGl2ZXJkIHRvIHJlbW92ZSBzZXJ2ZXIuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1vbml0b3Ige1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHNpbmdsZSBpbnN0YW5jZSBmb3IgdGhpcyBjbGFzZSwgdGhpcyBtZXRob2Qgc2hvdWxkbid0IGJlXG4gICAgICogY2FsbGVkIGRpcmVjdGx5IGZyb20gb3V0c2lkZSwgaW5zdGVhZCB1c2UgaW5zdGFuY2UgZ2V0dGVyIHRvIGdldFxuICAgICAqIGFjY2VzcyB0byB0aGUgc2luZ2xlIGluc3RhY2UuXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0gIHtTeW1ib2x9IGVuZm9yY2VyXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoZW5mb3JjZXIpIHtcbiAgICAgICAgaWYgKGVuZm9yY2VyICE9IHNpbmdsZXRvbkVuZm9yY2VyKSB0aHJvdyBcIkNhbm5vdCBjb25zdHJ1Y3Qgc2luZ2xldG9uXCI7XG4gICAgICAgIHRoaXMuX2lkbGVJbnRlcnZhbCA9IDIwMDAwO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIHNpbmdsZXRvbiByZWZlcmVuY2UgZm9yIHRoaXMgY2xhc3MgdG8gYmUgdXNlZCBhcHBsaWNhdGlvbiB3aWRlLlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJuIHtSb3V0ZXJ9IEEgcmVmZXJuY2UgdG8gdGhlIHVuaXF1ZSAgaW5zdGFuY2UuXG4gICAgICovXG4gICAgc3RhdGljIGdldCBpbnN0YW5jZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzW3NpbmdsZXRvbl0pIHtcbiAgICAgICAgICAgIHRoaXNbc2luZ2xldG9uXSA9IG5ldyB0aGlzKHNpbmdsZXRvbkVuZm9yY2VyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpc1tzaW5nbGV0b25dO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBNb25pdG9yaW5nIHByb2Nlc3MgYnkgYXR0YWNoaW5nIGEgc2V0IG9mIGxpc3RlbmVycyB0aGF0XG4gICAgICogd2lsbCBiZSB1c2VkIHRvIGNvbGxlY3QgaW5mb3JtYXRpb24gYW5kIGdlbmVyYXRlIHBhc2l2ZSByZXBvcnRzLlxuICAgICAqL1xuICAgIHN0YXRpYyBpbml0KCkge1xuICAgICAgICB0aGlzLmluc3RhbmNlLl9pbml0KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaW5pdCgpIHtcbiAgICAgICAgbGV0IGxvYWRIYW5kbGVyID0gdGhpcy5fb25QYWdlTG9hZC5iaW5kKHRoaXMpO1xuICAgICAgICBsZXQgcmVhZHlIYW5kbGVyID0gdGhpcy5fb25SZWFkeVN0YXRlQ2hhbmdlLmJpbmQodGhpcyk7XG4gICAgICAgIGxldCBhY3RpdmVIYW5kbGVyID0gVXRpbC5kZWJvdW5jZSh0aGlzLl9jbGVhcklkbGUsIDEwMDAsIGZhbHNlLCB0aGlzKTtcbiAgICAgICAgbGV0IGlkbGVIYW5kbGVyID0gdGhpcy5fc2V0SWRsZS5iaW5kKHRoaXMpO1xuICAgICAgICBsZXQgdmlzaWJsZUhhbmRsZXIgPSB0aGlzLl9vblZpc2liaWxpdHlDaGFuZ2UuYmluZCh0aGlzKTtcblxuICAgICAgICBVdGlsLmFkZEV2ZW50TGlzdGVuZXIod2luZG93LCAnbG9hZCcsIGxvYWRIYW5kbGVyKTtcbiAgICAgICAgVXRpbC5hZGRFdmVudExpc3RlbmVyKGRvY3VtZW50LCAncmVhZHlzdGF0ZWNoYW5nZScsIHJlYWR5SGFuZGxlcik7XG4gICAgICAgIFV0aWwuYWRkRXZlbnRMaXN0ZW5lcihkb2N1bWVudCwgJ21vdXNlbW92ZScsIGFjdGl2ZUhhbmRsZXIpO1xuICAgICAgICBVdGlsLmFkZEV2ZW50TGlzdGVuZXIoZG9jdW1lbnQsICdrZXlkb3duJywgYWN0aXZlSGFuZGxlcik7XG4gICAgICAgIFV0aWwuYWRkRXZlbnRMaXN0ZW5lcihkb2N1bWVudCwgVXRpbC5WSVNJQklMSVRZX0NIQU5HRSwgdmlzaWJsZUhhbmRsZXIpO1xuXG4gICAgICAgIHRoaXMuX2lkbGVJbnRlcnZhbCA9IHNldEludGVydmFsKGlkbGVIYW5kbGVyLCB0aGlzLl9pZGxlSW50ZXJ2YWwpO1xuICAgICAgICB0aGlzLl9pZGxlSGFuZGxlciA9IGlkbGVIYW5kbGVyO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfb25QYWdlTG9hZCgpIHtcbiAgICAgICAgLy8gTm90aGluZyB0byBkbyBhdCB0aGUgbW9tZW50XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyBkb2N1bWVudCByZWFkeSBzdGF0ZSBjaGFuZ2UgZXZlbnQuIE1vbml0b3Igd2lsbCBhdXRvIGdlbmVyYXRlXG4gICAgICogcmVwb3J0cyBvbiBjZXJ0YWluIGV2ZW50cy5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9vblJlYWR5U3RhdGVDaGFuZ2UoKSB7XG5cbiAgICAgICAgc3dpdGNoICh3aW5kb3cuZG9jdW1lbnQucmVhZHlTdGF0ZSkge1xuICAgICAgICBjYXNlICdpbnRlcmFjdGl2ZSc6XG4gICAgICAgICAgICBpZiAoVXRpbC5pc0RvY3VtZW50SGlkZGVuKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRJZGxlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NsZWFySWRsZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnY29tcGxldGUnOlxuICAgICAgICAgICAgbGV0IHBhZ2UgPSBuZXcgUGFnZVJlcG9ydCgpO1xuICAgICAgICAgICAgbGV0IGFnZW50ID0gbmV3IEFnZW50UmVwb3J0KCk7XG4gICAgICAgICAgICBsZXQgcmVzb3VyY2VzID0gbmV3IFJlc291cmNlRGlnZXN0KCk7XG5cbiAgICAgICAgICAgIHBhZ2UuZGlzcGF0Y2goKTtcbiAgICAgICAgICAgIGFnZW50LmRpc3BhdGNoKCk7XG4gICAgICAgICAgICByZXNvdXJjZXMuZGlzcGF0Y2goKTtcblxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHBhZ2UgdmlzaWJpbGl0eSBzdGF0ZSBjaGFuZ2UgZXZlbnQuIE1vbml0b3Igd2lsbCBhdXRvIGdlbmVyYXRlXG4gICAgICogcmVwb3J0cyB3aGVuZXZlciBwYWdlIGdvZXMgb3V0IG9mIHNjb3BlIG9yIHVzZXIgZm9jdXMgaXQgYmFjay5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9vblZpc2liaWxpdHlDaGFuZ2UoKSB7XG4gICAgICAgIGlmIChVdGlsLmlzRG9jdW1lbnRIaWRkZW4oKSkge1xuICAgICAgICAgICAgdGhpcy5fc2V0SWRsZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fY2xlYXJJZGxlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9jbGVhcklkbGUoKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5faWRsZUludGVydmFsKTtcblxuICAgICAgICAvLyBDbGVhciBwcmV2aW91cyBpZGxlIHByb2ZpbGVyIGlmIGFueVxuICAgICAgICBpZiAodGhpcy5faWRsZSkge1xuICAgICAgICAgICAgdGhpcy5faWRsZS5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgdGhpcy5faWRsZSA9IG51bGw7XG4gICAgICAgIH1cblxuXG4gICAgICAgIHRoaXMuX2FjdGl2aXR5ID0gbmV3IFByb2ZpbGVSZXBvcnQoJ3VzZXIgYWN0aXZlIHBlcmlvZCcpO1xuICAgICAgICB0aGlzLl9pZGxlSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCh0aGlzLl9pZGxlSGFuZGxlciwgdGhpcy5faWRsZUludGVydmFsKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9zZXRJZGxlKCkge1xuXG4gICAgICAgIC8vIENsZWFyIHByZXZpb3VzIGFjdGl2aXR5IHByb2ZpbGVyIGlmIGFueVxuICAgICAgICBpZiAodGhpcy5fYWN0aXZpdHkpIHtcbiAgICAgICAgICAgIHRoaXMuX2FjdGl2aXR5LmNvbXBsZXRlKCk7XG4gICAgICAgICAgICB0aGlzLl9hY3Rpdml0eSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9pZGxlID0gbmV3IFByb2ZpbGVSZXBvcnQoJ3VzZXIgaWRsZSBwZXJpb2QnKTtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCdcblxuaW1wb3J0IFByb2ZpbGUgZnJvbSAnLi9kYXRhL3Byb2ZpbGUnO1xuXG5sZXQgc2luZ2xldG9uID0gU3ltYm9sKCk7XG5sZXQgc2luZ2xldG9uRW5mb3JjZXIgPSBTeW1ib2woKTtcblxuXG4vKipcbiAqIEBjbGFzcyBQcm9maWxlclxuICogQGRlc2NyaXB0aW9uIFByb2ZpbGVyIGNsYXNzIHByb3ZpZGVzIHRoZSBtZWFucyBmb3IgZHluYW1pYyBwcm9ncmFtIGFuYWx5c2lzXG4gKiAgICAgICAgICAgICAgdGhhdCBtZWFzdXJlcyB0aW1lIGNvbXBsZXhpdHkgb2YgYSBqYXZhc2NyaXB0IGNvZGUsIHRoZSB1c2FnZVxuICogICAgICAgICAgICAgIG9mIHBhcnRpY3VsYXIgaW5zdHJ1Y3Rpb25zLCBvciB0aGUgZnJlcXVlbmN5IGFuZCBkdXJhdGlvbiBvZlxuICogICAgICAgICAgICAgIGZ1bmN0aW9uIGNhbGxzLiBQcm9maWxpbmcgaW5mb3JtYXRpb24gc2VydmVzIHRvIGFpZCBwcm9ncmFtXG4gKiAgICAgICAgICAgICAgb3B0aW1pemF0aW9uLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQcm9maWxlciB7XG5cbiAgICBjb25zdHJ1Y3RvcihlbmZvcmNlcikge1xuICAgICAgICBpZiAoZW5mb3JjZXIgIT0gc2luZ2xldG9uRW5mb3JjZXIpIHRocm93IFwiQ2Fubm90IGNvbnN0cnVjdCBzaW5nbGV0b25cIjtcbiAgICAgICAgdGhpcy5fcHJvZmlsZXMgPSBuZXcgTWFwKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgKiBSZXR1cm5zIGEgc2luZ2xldG9uIHJlZmVyZW5jZSBmb3IgdGhpcyBjbGFzcyB0byBiZSB1c2VkIGFwcGxpY2F0aW9uIHdpZGUuXG4gICAgKiBAc3RhdGljXG4gICAgKiBAcmV0dXJuIHtQcm9maWxlcn0gQSByZWZlcm5jZSB0byB0aGUgdW5pcXVlICBpbnN0YW5jZS5cbiAgICAqL1xuICAgIHN0YXRpYyBnZXQgaW5zdGFuY2UoKSB7XG4gICAgICAgIGlmICghdGhpc1tzaW5nbGV0b25dKSB7XG4gICAgICAgICAgICB0aGlzW3NpbmdsZXRvbl0gPSBuZXcgdGhpcyhzaW5nbGV0b25FbmZvcmNlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXNbc2luZ2xldG9uXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdG9wcyBhIHByb2ZpbGUgZXhlY3V0aW9uIHVuZGVyXG4gICAgICogQHBhcmFtICB7U3RyaW5nfE9iamVjdHxGdW5jdGlvbn0gaWRlbnRpZmllciBBIHJlZmVyZW5jZSB0byBhIHVuaXF1ZVxuICAgICAqICAgICAgICAgaWRlbnRpZmllciB1c2VkIHRvIHN0b3JlIGEgcHJvZmlsZSwgdGhlIGlkZW50aWZpZXIgY291bGQgYmUgYVxuICAgICAqICAgICAgICAgU3RyaW5nIGFuIG9iamVjdCBvciBldmVuIGEgZnVuY3Rpb24sIHRoaXMgd2F5IGluZGl2dWFsIG9iamVjdHNcbiAgICAgKiAgICAgICAgIG9yIGV2ZW4gZnVuY3Rpb25zIGNhbiBiZSB0cmFja2VkIG1vcmUgcmVsaWFiaWx5LlxuICAgICAqXG4gICAgICogQHJldHVybiB7Qm9vbH0gICAgICAgICAgICBSZXR1cm5ucyB0cnVlIGlmIHRoZSBwcm9maWxlIGhhcyBiZWVuIHN0YXJ0ZWRcbiAgICAgKiAgICAgICAgIHN1Y2Nlc3NmdWxseSwgaWYgaXQgd2FzIGFscmVhZHkgcnVubmluZyBvciB0aGVyZSBpcyBhIGFub3RoZXJcbiAgICAgKiAgICAgICAgIHByb2ZpbGUgdXNpbmcgdGhlIHNhbWUgaWRlbnRpZmllciB3aWxsIHJldHVybiBmYWxzZSxcbiAgICAgKiBAc3RhdGljXG4gICAgICovXG4gICAgc3RhdGljIHN0b3AoaWRlbnRpZmllcikge1xuICAgICAgICBsZXQgc3VjY2VzcyA9IHRoaXMuaW5zdGFuY2UuX3N0b3AoaWRlbnRpZmllcik7XG4gICAgICAgIHJldHVybiBzdWNjZXNzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogU3RvcHMgYSBwcm9maWxlIGV4ZWN1dGlvbiB1bmRlclxuICAgICAqIEBwYXJhbSAge1N0cmluZ3xPYmplY3R8RnVuY3Rpb259IGlkZW50aWZpZXIgQSByZWZlcmVuY2UgdG8gYSB1bmlxdWVcbiAgICAgKiAgICAgICAgIGlkZW50aWZpZXIgdXNlZCB0byBzdG9yZSBhIHByb2ZpbGUsIHRoZSBpZGVudGlmaWVyIGNvdWxkIGJlIGFcbiAgICAgKiAgICAgICAgIFN0cmluZyBhbiBvYmplY3Qgb3IgZXZlbiBhIGZ1bmN0aW9uLCB0aGlzIHdheSBpbmRpdnVhbCBvYmplY3RzXG4gICAgICogICAgICAgICBvciBldmVuIGZ1bmN0aW9ucyBjYW4gYmUgdHJhY2tlZCBtb3JlIHJlbGlhYmlseS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge0Jvb2x9ICAgICAgICAgICAgUmV0dXJubnMgdHJ1ZSBpZiB0aGUgcHJvZmlsZSBoYXMgYmVlbiBzdGFydGVkXG4gICAgICogICAgICAgICBzdWNjZXNzZnVsbHksIGlmIGl0IHdhcyBhbHJlYWR5IHJ1bm5pbmcgb3IgdGhlcmUgaXMgYSBhbm90aGVyXG4gICAgICogICAgICAgICBwcm9maWxlIHVzaW5nIHRoZSBzYW1lIGlkZW50aWZpZXIgd2lsbCByZXR1cm4gZmFsc2UsXG4gICAgICogQHN0YXRpY1xuICAgICAqL1xuICAgIHN0YXRpYyBzdGFydChpZGVudGlmaWVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmluc3RhbmNlLl9zdGFydChpZGVudGlmaWVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9zdGFydCAoaWRlbnRpZmllcikge1xuICAgICAgICBpZighdGhpcy5fcHJvZmlsZXMuaGFzKGlkZW50aWZpZXIpKSB7XG4gICAgICAgICAgICBsZXQgcHJvZmlsZSA9IG5ldyBQcm9maWxlKGlkZW50aWZpZXIpO1xuICAgICAgICAgICAgdGhpcy5fcHJvZmlsZXMuc2V0KGlkZW50aWZpZXIsIHByb2ZpbGUpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfc3RvcCAoaWRlbnRpZmllcikge1xuICAgICAgICBpZih0aGlzLl9wcm9maWxlcy5oYXMoaWRlbnRpZmllcikpIHtcbiAgICAgICAgICAgIGxldCBwcm9maWxlID0gdGhpcy5fcHJvZmlsZXMuZ2V0KGlkZW50aWZpZXIpO1xuICAgICAgICAgICAgcHJvZmlsZS5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmxldCBzaW5nbGV0b24gPSBTeW1ib2woKTtcbmxldCBzaW5nbGV0b25FbmZvcmNlciA9IFN5bWJvbCgpO1xuXG4vKipcbiAqIFdvcmtlciBkaXNwYXRjaGVyIGZ1bmN0aW9uYWxpdHkgZGVjbGFyYXRpb24uXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgYXMgYSBzY3JpcHQgdGVtcGxhdGUgZm9yIHRoZSBjb2RlIGV4ZWN1dGVkIGJ5IHRoZVxuICogTWVzc2FnZSBEaXNwYXRjaGVyIFdvcmtlci5cbiAqL1xubGV0IGRpc3BhdGNoZXIgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXQgY2FjaGUgPSBbXTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdHJ1ZSB3aGVuZXZlciBhIG5ldHdvcmsgY29ubmVjdGlvbiBpcyBhdmFpbGFibGVcbiAgICAgKiBOb3RlOiB0aGlzIG1ldGhvZCBpcyBhIG1vY2t1cCB0ZXN0aW5nIG1ldGhvZCBhbiByZXR1cm4gYSByYW5kb20gdmFsdWVcbiAgICAgKiBpbnN0ZWFkIG1ha2luZyB0aGUgcHJvcGVyIGNoZWNraW5nXG4gICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBsZXQgY2hlY2tOZXR3b3JrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gTWF0aC5yYW5kb20oKSA8IC41O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNlbmRzIGNhY2hlIGNvbnRlbnQgdHJvdWdodCB0aGUgbmV0d29yayBhbmQgY2xlYW5zIGl0cyBjb250ZW50cy5cbiAgICAgKiBOb3RlOiB0aGlzIG1ldGhvZCBpcyBhIG1vY2t1cCB0ZXN0aW5nIG1ldGhvZCBhbmQgb25seSBvdXRwdXRzIHRoZVxuICAgICAqIFx0XHQgaW5mb3JtYXRpb24gdGhyb3VnaCB0aGUgY29uc29sZS5cbiAgICAgKiBAZmlyZXMgQ0FDSEVfRkxVU0hFRFxuICAgICAqIEBmaXJlcyBDQUNIRV9GTFVTSF9FUlJPUlxuICAgICAqL1xuICAgIGxldCBmbHVzaENhY2hlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoY2hlY2tOZXR3b3JrKCkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoSlNPTi5zdHJpbmdpZnkoY2FjaGUpKTtcbiAgICAgICAgICAgIGNhY2hlID0gW107XG4gICAgICAgICAgICBzZWxmLnBvc3RNZXNzYWdlKCdDQUNIRV9GTFVTSEVEJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZWxmLnBvc3RNZXNzYWdlKCdDQUNIRV9GTFVTSF9FUlJPUicpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyBhIG1lc3NhZ2Ugc2VudCB0byB0aGUgd2ViIHdvcmtlciBmcm9tIGl0J3Mgb3duZXIuXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBlIE1lc3NhZ2UgRXZlbnQgb2JqZWN0XG4gICAgICovXG4gICAgbGV0IG9uTWVzc2FnZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHZhciBkYXRhID0gZS5kYXRhO1xuXG4gICAgICAgIHN3aXRjaCAoZGF0YS5jbWQpIHtcbiAgICAgICAgY2FzZSAnc3RhcnQnOlxuICAgICAgICAgICAgc2VsZi5wb3N0TWVzc2FnZSgnRElTUEFUQ0hFUiBXT1JLRVIgU1RBUlRFRCcpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3N0b3AnOlxuICAgICAgICAgICAgc2VsZi5wb3N0TWVzc2FnZSgnRElTUEFUQ0hFUiBXT1JLRVIgU1RPUFBFRCcpO1xuICAgICAgICAgICAgZmx1c2hDYWNoZSgpO1xuICAgICAgICAgICAgc2VsZi5jbG9zZSgpOyAvLyBUZXJtaW5hdGVzIHRoZSB3b3JrZXIuXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncXVldWUnOlxuICAgICAgICAgICAgY2FjaGUucHVzaChlLmRhdGEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2ZsdXNoJzpcbiAgICAgICAgICAgIGZsdXNoQ2FjaGUoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9O1xuXG4gICAgfTtcblxuICAgIHNlbGYuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uTWVzc2FnZSwgZmFsc2UpO1xufS50b1N0cmluZygpO1xuXG5cbi8qKlxuICogUm91dGVyIGNsYXNzIHByb3ZpZGVzIGEgc2luZ2xlIGFjY2VzcyBwb2ludCBmb3Igc2VuZGluZyByZXBvcnQgY29udGVudFxuICogdG8gdGhlIHNlcnZlciBieSB1c2luZyBhIGRlZGljYXRlZCB3ZWIgd29ya2VyIGRpc3BhdGNoZXIuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJvdXRlciB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgc2luZ2xlIGluc3RhbmNlIGZvciB0aGlzIGNsYXNlLCB0aGlzIG1ldGhvZCBzaG91bGRuJ3QgYmVcbiAgICAgKiBjYWxsZWQgZGlyZWN0bHkgZnJvbSBvdXRzaWRlLCBpbnN0ZWFkIHVzZSBpbnN0YW5jZSBnZXR0ZXIgdG8gZ2V0XG4gICAgICogYWNjZXNzIHRvIHRoZSBzaW5nbGUgaW5zdGFjZS5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSAge1N5bWJvbH0gZW5mb3JjZXJcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihlbmZvcmNlcikge1xuXG4gICAgICAgIGlmIChlbmZvcmNlciAhPSBzaW5nbGV0b25FbmZvcmNlcikgdGhyb3cgXCJDYW5ub3QgY29uc3RydWN0IHNpbmdsZXRvblwiO1xuXG4gICAgICAgIHRoaXMuX2ZsdXNoSW50ZXJ2YWwgPSAyMDAwMDsgLy8gMjAgc2Vjb25kc1xuICAgICAgICB0aGlzLl9mbHVzaEhhbmRsZXIgPSB0aGlzLl9mbHVzaC5iaW5kKHRoaXMpO1xuXG4gICAgICAgIHRoaXMuX2ZsdXNoSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCh0aGlzLl9mbHVzaEhhbmRsZXIsIHRoaXMuX2ZsdXNoSW50ZXJ2YWwpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBhIHN0cmluZyBkZWZpbmluZyBhIGNsb3N1cmUgYW5kIGV4ZWN1dGUgaXQuXG4gICAgICAgIGRpc3BhdGNoZXIgPSAnKCcgKyBkaXNwYXRjaGVyICsgJykoKSc7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGEgZmFrZSBmaWxlIHVzaW5nIHNjcmlwdCBzdHJpbmcgaW4gb3JkZXIgdG8gcHJvdmlkZSB3b3JrZXJcbiAgICAgICAgLy8gd2l0aCB0aGUgY29kZSByZXF1aXJlZCB0byBydW4uXG4gICAgICAgIGxldCBibG9iID0gbmV3IEJsb2IoW2Rpc3BhdGNoZXJdLCB7XG4gICAgICAgICAgICB0eXBlOiAnYXBwbGljYXRpb24vamF2YXNjcmlwdCdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGEgd29ya2VyIHVzaW5nIGNvZGUgc3RvcmVkIGluIHRoZSBibG9iIGZpbGVcbiAgICAgICAgdGhpcy5fd29ya2VyID0gbmV3IFdvcmtlcihVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpKTtcblxuICAgICAgICAvLyBMaXN0ZW4gdG8gd29ya2VyIG5vdGlmaWNhdGlvbnNcbiAgICAgICAgdGhpcy5fd29ya2VyLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmRlYnVnKG1lc3NhZ2UuZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU2VuZCBpbml0IGNvbW1hbmQgdG8gd29ya2VyXG4gICAgICAgIHRoaXMuX3dvcmtlci5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAnY21kJzogJ3N0YXJ0J1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgc2luZ2xldG9uIHJlZmVyZW5jZSBmb3IgdGhpcyBjbGFzcyB0byBiZSB1c2VkIGFwcGxpY2F0aW9uIHdpZGUuXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm4ge1JvdXRlcn0gQSByZWZlcm5jZSB0byB0aGUgdW5pcXVlICBpbnN0YW5jZS5cbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0IGluc3RhbmNlKCkge1xuICAgICAgICBpZiAoIXRoaXNbc2luZ2xldG9uXSkge1xuICAgICAgICAgICAgdGhpc1tzaW5nbGV0b25dID0gbmV3IHRoaXMoc2luZ2xldG9uRW5mb3JjZXIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzW3NpbmdsZXRvbl07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VuZHMgaW5mb3JtYXRpb24gdG8gdGhlIHJlcG9ydCBwb3N0IHF1ZXVlXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBkYXRhIEEgc2ltcGxlIGphdmFzY3JpcHQgb2JqZWN0IGNvbnRhaW5pbmcgYSBzZXQgb2ZcbiAgICAgKiAgICAgICAgICAgICAgICAgIGtleXMgYW5kIHZhbHVlcyB0aGF0IHdpbGwgYmUgdHJhbnNtaXRlZCB0byB0aGVcbiAgICAgKiAgICAgICAgICAgICAgICAgIHNlcnZlciBvbiBmbHVzaCBvcGVyYXRpb25zLlxuICAgICAqL1xuICAgIHN0YXRpYyBlbnF1ZXVlKGRhdGEpIHtcbiAgICAgICAgdGhpcy5pbnN0YW5jZS5fd29ya2VyLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgICdjbWQnOiAncXVldWUnLFxuICAgICAgICAgICAgJ3BhcmFtcyc6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoJ01FU1NBR0UgU0VOVCBUTyBRVUVVRScsIGRhdGEpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZsdXNoZXMgY2FjaGVkIGluZm9ybWF0aW9uIG9uIHRocmVhZGVkIGRpc3BhdGNoZXIgaW50byB0aGUgc2VydmVyIHdoZW5ldmVyXG4gICAgICogYSB2YWxpZCBuZXR3b3JrIGNvbm5lY3Rpb24gaXMgYXZhaWxhYmxlLlxuICAgICAqL1xuICAgIHN0YXRpYyBmbHVzaCgpIHtcbiAgICAgICAgY29uc29sZS5kZWJ1ZygnTUVTU0FHRSBDQUNIRSBXSUxMIEZMVVNIJyk7XG4gICAgICAgIHRoaXMuaW5zdGFuY2UuX2ZsdXNoKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyBhdXRvIGZsdXNoIGludGVydmFsIGluIG1pbGxpc2Vjb25kcywgYWZ0ZXIgdGhlIHRpbWUgc2V0IHJvdXRlciB3aWxsXG4gICAgICogYXR0ZW1wdCB0byBkaXNwYXRjaCBhbGwgcGVuZGluZyBtZXNzYWdlcyB0byByZW1vdGUgc2VydmVyIHdoZW5ldmVyIHRoZXJlXG4gICAgICogaXMgY29ubmVjdGlvbiBhdmFpbGFibGUuIFNldCBpbnRlcnZhbCB0byBmYWxzZSBpbiBvcmRlciB0byBzdG9wIGF1dG9cbiAgICAgKiBkaXNwYXRjaCBvcGVyYXRpb25zLlxuICAgICAqIEBwYXJhbSAge051bWJlcnxCb29sZWFufSBpbnRlcnZhbCBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IHJvdXRlclxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICB3aWxsIHdhaXQgdW50aWwgc2VuZGluZyBjYWNoZWQgaW5mb3JtYXRpb24gdG9cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3RlIHNlcnZlci5cbiAgICAgKi9cbiAgICBzdGF0aWMgc2V0IGZsdXNoSW50ZXJ2YWwoaW50ZXJ2YWwpIHtcbiAgICAgICAgdGhpcy5pbnN0YW5jZS5fZmx1c2hJbnRlcnZhbCA9IGludGVydmFsO1xuXG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5fZmx1c2hJbnRlcnZhbCk7XG5cbiAgICAgICAgLy8gSWYgZmFsc2Ugc2VudCBubyBhdXRvIGZsdXNoIG9wZXJhdGlvbiB3aWxsIGJlIGNyZWF0ZWRcbiAgICAgICAgaWYoaW50ZXJ2YWwgPT09IGZhbHNlKSByZXR1cm47XG5cbiAgICAgICAgLy8gc2V0IG5ldyBhdXRvIGZsdXNoIG9wZXJhdGlvbiBpbnRlcnZhbFxuICAgICAgICB0aGlzLl9mbHVzaEludGVydmFsID0gc2V0SW50ZXJ2YWwodGhpcy5fZmx1c2hIYW5kbGVyLCB0aGlzLl9mbHVzaEludGVydmFsKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGRlZmF1bHQgYXV0byBmbHVzaCBpbnRlcnZhbCB2YWx1ZSBpbiBtaWxsaXNlY29uZHMuIFRoZSBpbnRlcnZhbFxuICAgICAqIHdpbGwgYmUgdXNlZCB0byBlbnJvdXRlIHBlbmRpbmcgbWVzc2FnZSB0byByZW1vdGUgc2VydmVyLlxuICAgICAqIEByZXR1cm4ge051bWJlcnxCb29sZWFufSBUaGUgbnVtYmVyIG9mIG1pbGxpc2VuY29uZHMgY29uZmlndXJlZCBmb3IgdGhlXG4gICAgICogZmx1c2ggaW50ZXJ2YWwgb3IgZmFsc2Ugd2hlbmV2ZXIgdGhlIGF1dG8gZmx1c2ggZmVhdHVyZSBoYXMgYmVlbiBkaXNhYmxlZC5cbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0IGZsdXNoSW50ZXJ2YWwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmluc3RhbmNlLl9mbHVzaEludGVydmFsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2ZsdXNoKCkge1xuICAgICAgICB0aGlzLmluc3RhbmNlLl93b3JrZXIucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgJ2NtZCc6ICdmbHVzaCdcbiAgICAgICAgfSk7XG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgTW9uaXRvciBmcm9tICcuL21vbml0b3InO1xuaW1wb3J0IFByb2ZpbGVyIGZyb20gJy4vcHJvZmlsZXInO1xuXG53aW5kb3cuUnVtID0ge307XG53aW5kb3cuUnVtLk1vbml0b3IgPSBNb25pdG9yO1xud2luZG93LlJ1bS5Qcm9maWxlciA9IFByb2ZpbGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFV0aWwgY2xhc3MgZXhwb3NlcyBhIHNldCBvZiBjb21tb24gdXRpbGl0eSBmdW5jdGlvbmFsaXRpZXMgdXNlZCB0aHJvdWdoIHRoZVxuICogYXBwbGljYXRpb24uXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFV0aWwge1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIG5ldyBmdW5jdGlvbiB3aXRoIGEgbGltaXQgb24gdGhlIHJhdGUgaXQgY2FuIGJlIGZpcmVkLiBUaGlzXG4gICAgICogaXMgdXNlZnVsIGZvciB0aG9zZSBmdW5jdGlvbnMgdGhhdCBhcmUgY2FsbGVkIHRvbyBvZnRlbiBhcyBhIHJlc3VsdFxuICAgICAqIG9mIHVzZXIgZXZlbnRzLlxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmdW5jICAgIFRoZSByZWZlcmVuY2UgdG8gdGhlIG9yaWdpbmFsIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtICB7TnVtYmVyfSB3YWl0ICAgICAgVGhlIG1pbmltdW0gYW1vdW50IG9mIHRpbWUgdGhhdCBzaG91bGRcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXNzIHdpdGhvdXQgY2FsbGluZyB0aGUgZnVuY3Rpb24gaW4gb3JkZXJcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0byB0cmlnZ2VyIHRoZSByZWFsIGNhbGwuXG4gICAgICogQHBhcmFtICB7Qm9vbGVhbn0gaW1tZWRpYXRlXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBzY29wZVxuICAgICAqL1xuICAgIHN0YXRpYyBkZWJvdW5jZShmdW5jLCB3YWl0LCBpbW1lZGlhdGUsIHNjb3BlKSB7XG4gICAgICAgIHZhciB0aW1lb3V0O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLFxuICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICAgICAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKCFpbW1lZGlhdGUpIGZ1bmMuYXBwbHkoc2NvcGUsIGFyZ3MpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBjYWxsTm93ID0gaW1tZWRpYXRlICYmICF0aW1lb3V0O1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgICAgICAgICAgaWYgKGNhbGxOb3cpIGZ1bmMuYXBwbHkoc2NvcGUsIGFyZ3MpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBuZXcgZXZlbnQgbGlzdGVuZXIgdG8gdGhlIHByb3ZpZGVkIG9iamVjdCBhbmQgYmluZHMgaXQgdG8gYVxuICAgICAqIHN1cHBsaWVkIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9ICAgdGFyZ2V0XG4gICAgICogQHBhcmFtIHtTdHJpbmd9ICAgbmFtZVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtCb29sZWFufSAgIGNhcHR1cmVcbiAgICAgKi9cbiAgICBzdGF0aWMgYWRkRXZlbnRMaXN0ZW5lcih0YXJnZXQsIG5hbWUsIGNhbGxiYWNrLCBjYXB0dXJlKSB7XG4gICAgICAgIGNhcHR1cmUgPSBjYXB0dXJlIHx8IGZhbHNlO1xuICAgICAgICBpZiAoXCJ1bmRlZmluZWRcIiAhPSB0eXBlb2YgKHRhcmdldC5hdHRhY2hFdmVudCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXQuYXR0YWNoRXZlbnQoXCJvblwiICsgbmFtZSwgY2FsbGJhY2spO1xuICAgICAgICB9IGVsc2UgaWYgKHRhcmdldC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgY2FsbGJhY2ssIGNhcHR1cmUpO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgbmFtZSBvZiB2aXNpYmlsaXR5IGNoYW5nZSBwcm9wZXJ0eSBvbiBjdXJyZW50IHVzZXIgYWdlbnQuXG4gICAgICovXG4gICAgc3RhdGljIGdldCBWSVNJQklMSVRZX0NIQU5HRSgpIHtcbiAgICAgICAgbGV0IGhpZGRlbiA9IFwiaGlkZGVuXCI7XG5cbiAgICAgICAgLy8gU3RhbmRhcmRzOlxuICAgICAgICBpZiAoaGlkZGVuIGluIGRvY3VtZW50KVxuICAgICAgICAgICAgcmV0dXJuIFwidmlzaWJpbGl0eWNoYW5nZVwiO1xuICAgICAgICBlbHNlIGlmICgoaGlkZGVuID0gXCJtb3pIaWRkZW5cIikgaW4gZG9jdW1lbnQpXG4gICAgICAgICAgICByZXR1cm4gXCJtb3p2aXNpYmlsaXR5Y2hhbmdlXCI7XG4gICAgICAgIGVsc2UgaWYgKChoaWRkZW4gPSBcIndlYmtpdEhpZGRlblwiKSBpbiBkb2N1bWVudClcbiAgICAgICAgICAgIHJldHVybiBcIndlYmtpdHZpc2liaWxpdHljaGFuZ2VcIjtcbiAgICAgICAgZWxzZSBpZiAoKGhpZGRlbiA9IFwibXNIaWRkZW5cIikgaW4gZG9jdW1lbnQpXG4gICAgICAgICAgICByZXR1cm4gXCJtc3Zpc2liaWxpdHljaGFuZ2VcIjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBuYW1lIG9mIGRvY3VtZW50IGhpZGRlbiBwcm9wZXJ0eSBvbiBjdXJyZW50IHVzZXIgYWdlbnQuXG4gICAgICovXG4gICAgc3RhdGljIGdldCBISURERU5fUFJPUEVSVFkoKSB7XG4gICAgICAgIGlmICgnaGlkZGVuJyBpbiBkb2N1bWVudCkgcmV0dXJuICdoaWRkZW4nO1xuICAgICAgICBpZiAoJ21vekhpZGRlbicgaW4gZG9jdW1lbnQpIHJldHVybiAnbW96SGlkZGVuJztcbiAgICAgICAgaWYgKCd3ZWJraXRIaWRkZW4nIGluIGRvY3VtZW50KSByZXR1cm4gJ3dlYmtpdEhpZGRlbic7XG4gICAgICAgIGlmICgnbXNIaWRkZW4nIGluIGRvY3VtZW50KSByZXR1cm4gJ21zSGlkZGVuJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayB3aGVuZXZlciBkb2N1bWVudCBoYXMgYmVlbiBoaWRlbiBieSB1c2VyIHN3aXRjaGluZyB0byBvdGhlclxuICAgICAqIHRhYnMgb3Igd2luZG93cy5cbiAgICAgKiBAcmV0dXJuIHtCb29sZWFufVxuICAgICAqL1xuICAgIHN0YXRpYyBpc0RvY3VtZW50SGlkZGVuKCkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnRbdGhpcy5ISURERU5fUFJPUEVSVFldO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlcyBhIEdsb2JhbGx5IFVuaXF1ZSBJZGVudGlmaWVyXG4gICAgICogQHBhcmFtIFtoeXBoZW5zID0gdHJ1ZV0gU2V0IHRvIGZhbHNlIHRvIHJlbW92ZSBoeXBlbiBzZXBhcmF0b3IgYmV0d2VlblxuICAgICAqIG51bWJlciBncm91cHMuXG4gICAgICogQHJldHVybiB7U3RyaW5nfVxuICAgICAqL1xuICAgIHN0YXRpYyBnZW5lcmF0ZUdVSUQoaHlwaGVucykge1xuICAgICAgICBmdW5jdGlvbiBzNCgpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKCgxICsgTWF0aC5yYW5kb20oKSkgKiAweDEwMDAwKVxuICAgICAgICAgICAgICAgIC50b1N0cmluZygxNilcbiAgICAgICAgICAgICAgICAuc3Vic3RyaW5nKDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHNlcCA9ICctJztcblxuICAgICAgICBpZiAoaHlwaGVucyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHNlcCA9ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHM0KCkgKyBzNCgpICsgc2VwICsgczQoKSArIHNlcCArIHM0KCkgKyBzZXAgKyBzNCgpICsgc2VwICtcbiAgICAgICAgICAgIHM0KCkgKyBzNCgpICsgczQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb3BpZXMgYWxsIG9iamVjdCBwcm9wZXJ0aWVzIGludG8gYSBuZXcgb2JqZWN0XG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBvYmogdGhlIHNvdXJjZSBvYmplY3Qgd2hpY2ggcHJvcGVydGllcyB3aWxsIGJlIGNvcGllZFxuICAgICAqIEByZXR1cm4ge09iamVjdH0gICAgIEEgbmV3IG9iamVjdCB3aXRoIHRoZSBwcm9wZXJ0aWVzIGNvcGllZFxuICAgICAqL1xuICAgIHN0YXRpYyBjb3B5T2JqZWN0KG9iaikge1xuICAgICAgICB2YXIgbmV3T2JqID0ge307XG5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICAgICAgbmV3T2JqW2tleV0gPSBvYmpba2V5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXdPYmo7XG4gICAgfVxuXG4gICAgc3RhdGljIG1lZGlhbih2YWx1ZXMpIHtcblxuICAgICAgICB2YWx1ZXMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIGEgLSBiO1xuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgaGFsZiA9IE1hdGguZmxvb3IodmFsdWVzLmxlbmd0aCAvIDIpO1xuXG4gICAgICAgIGlmICh2YWx1ZXMubGVuZ3RoICUgMilcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXNbaGFsZl07XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiAodmFsdWVzW2hhbGYgLSAxXSArIHZhbHVlc1toYWxmXSkgLyAyLjA7XG4gICAgfVxuXG59XG4iXX0=
