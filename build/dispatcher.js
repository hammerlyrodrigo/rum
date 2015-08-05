(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/**
 * Dispatcher class provides support for the message delivery worker used to
 * cache and deliver reports to remote server. It also takes care of checking the
 * connection status before trying to send the cached reports.
 */

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var Dispatcher = (function () {
    function Dispatcher(worker) {
        _classCallCheck(this, Dispatcher);

        this._cache = new Set();
        this._worker = worker;
        this._config = {
            retryTimeout: 20000, // retry flushing cache after 20 seconds
            flushInterval: 30000, // auto flush interval,
            url: 'http://localhost',
            method: 'POST'
        };
    }

    _createClass(Dispatcher, [{
        key: 'init',
        value: function init() {
            var msgHandler = this._onMessage.bind(this);
            this._worker.addEventListener('message', msgHandler, false);
            this._flushHandler = this.flush.bind(this);

            this._retryTimeout = null;
            this._flushInterval = null;
        }
    }, {
        key: 'flush',
        value: function flush() {
            // Check if browser is online
            // TODO: enhance this check to make it more compatible with different
            //       browser vendors
            if (navigator.onLine) {
                this._flush();
            } else {
                this._flushTimeout = setTimeout(this._flushHandler, this._retryTime);
            }
        }

        /**
         * Initializes dispatcher by setting the auto flushing operation using
         * current configuration
         */
    }, {
        key: 'start',
        value: function start(config) {
            this._worker.postMessage('DISPATCHER WORKER STARTED');
            // Initialize the auto flush by setting default flush interval
            var cfg = this._config;

            cfg.retryTimeout = config.retryTimeout || cfg.retryTimeout;
            cfg.flushInterval = config.flushInterval || cfg.flushInterval;
            cfg.url = config.url || cfg.url;
            cfg.method = config.method || cfg.method;

            this.flushInterval = cfg.flushInterval;
        }

        /**
         * Stops dispatcher and closes its worker threaded
         */
    }, {
        key: 'stop',
        value: function stop() {
            this._worker.postMessage('DISPATCHER WORKER STOPPED');
            this._worker.close(); // Terminates the worker.
        }

        /**
         * Sends a JSON message to the deliver queue that will be sent to
         * remote server on flush operations
         * @param  {String} msg A valid JSON formatted string
         */
    }, {
        key: 'enqueue',
        value: function enqueue(msg) {
            this._cache.add(msg);
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
        key: '_onMessage',

        /**
         * Handles a message being sent by this thread owner
         * @param  {Object} e Message event object
         */
        value: function _onMessage(e) {
            var data = e.data;
            console.debug('DISPATCHER COMMAND RECIEVED >>', data.cmd);

            switch (data.cmd) {
                case 'start':
                    this.start(data.params);
                    break;
                case 'stop':
                    this.stop();
                    break;
                case 'enqueue':
                    this.enqueue(data.params);
                    break;
                case 'set-flush-interval':
                    this.flushInterval = data.params.flushInterval;
                    break;
                case 'set-url':
                    this.url = data.params.url;
                    break;
                case 'set-method':
                    this.url = data.params.method;
                    break;
                case 'flush':
                    this.flush();
                    break;
            }
        }

        /**
         * Attempts to send cached messages to remote server using an ajax request.
         * If the request fails this method will retry the operation after a few
         * seconds based on the configuration of retry timeout field
         */
    }, {
        key: '_flush',
        value: function _flush() {
            this._worker.postMessage('FLUSHING CACHE');

            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = this._onReadyStateChange.bind(this, xmlhttp);

            xmlhttp.open(this.method, this.url, true);
            xmlhttp.send();
        }

        /**
         * Handles remote server deliver request statte change event
         * @param  {XMLHttpRequest} xmlhttp A refernce to the relate request object
         * @private
         */
    }, {
        key: '_onReadyStateChange',
        value: function _onReadyStateChange(xmlhttp) {
            if (xmlhttp.readyState === XMLHttpRequest.DONE) {
                if (xmlhttp.status === 200) {
                    this._cache.clear();
                    this._worker.postMessage('CACHE FLUSHED');
                } else {
                    this._worker.postMessage('REMOTE SERVER ERROR.');
                    // if there was an error retry after a small time
                    this._flushTimeout = setTimeout(this._flushHandler, this._config.retryTimeout);
                }
            }
        }
    }, {
        key: 'flushInterval',
        set: function set(value) {
            this._config.flushInterval = parseInt(value);
            clearInterval(this._flushInterval);

            if (this._config.flushInterval <= 0) {
                this._flushInterval = null;
            } else {
                this._flushInterval = setInterval(this._flushHandler, this._flushInterval);
            }
        },

        /**
         * Returns default auto flush interval value in milliseconds. The interval
         * will be used to enroute pending message to remote server.
         * @return {Number|Boolean} The number of millisenconds configured for the
         * flush interval or false whenever the auto flush feature has been disabled.
         */
        get: function get() {
            return this._config.flushInterval;
        }

        /**
         * Sets the remote server URL where the reports will be delivered when flush
         * method is called
         * @param  {String} url a valid server URL
         */
    }, {
        key: 'url',
        set: function set(url) {
            this._config.url = url;
        },

        /**
         * Returns the URL for current target remote server where the reports are
         * delivered when flush operation is requested
         * @return {String}
         */
        get: function get() {
            return this._config.url;
        }

        /**
         * Sets the Request method used to deliver the reports to remote server by
         * default used method is POST
         * @return {String}
         */
    }, {
        key: 'method',
        set: function set(method) {
            this._config.method = method;
        },

        /**
         * Returns the Request method used to deliver the reports to remote server
         * @return {String}
         */
        get: function get() {
            return this._config.method;
        }
    }]);

    return Dispatcher;
})();

var dispatcher = new Dispatcher(self);
dispatcher.init();

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9yb2RyaWdvL1dvcmtzcGFjZXMvcnVtL3NyYy93b3JrZXIvZGlzcGF0Y2hlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7O0lBT1AsVUFBVTtBQUVELGFBRlQsVUFBVSxDQUVBLE1BQU0sRUFBRTs4QkFGbEIsVUFBVTs7QUFHUixZQUFJLENBQUMsTUFBTSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7QUFDeEIsWUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7QUFDdEIsWUFBSSxDQUFDLE9BQU8sR0FBRztBQUNYLHdCQUFZLEVBQUUsS0FBSztBQUNuQix5QkFBYSxFQUFFLEtBQUs7QUFDcEIsZUFBRyxFQUFFLGtCQUFrQjtBQUN2QixrQkFBTSxFQUFFLE1BQU07U0FDakIsQ0FBQztLQUNMOztpQkFYQyxVQUFVOztlQWFSLGdCQUFHO0FBQ0gsZ0JBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzVDLGdCQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDNUQsZ0JBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRTNDLGdCQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztBQUMxQixnQkFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7U0FDOUI7OztlQUVJLGlCQUFHOzs7O0FBSUosZ0JBQUksU0FBUyxDQUFDLE1BQU0sRUFBRTtBQUNsQixvQkFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQ2pCLE1BQU07QUFDSCxvQkFBSSxDQUFDLGFBQWEsR0FBRyxVQUFV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Ozs7Ozs7Ozs7YUFPUyxhQUFDLE1BQU0sRUFBRTtBQUNmLGdCQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7U0FDaEM7Ozs7OzthQU1TLGVBQUc7QUFDVCxtQkFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztTQUM5Qjs7O1dBbElDLFVBQVU7OztBQXlNaEIsSUFBSSxVQUFVLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdEMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBEaXNwYXRjaGVyIGNsYXNzIHByb3ZpZGVzIHN1cHBvcnQgZm9yIHRoZSBtZXNzYWdlIGRlbGl2ZXJ5IHdvcmtlciB1c2VkIHRvXG4gKiBjYWNoZSBhbmQgZGVsaXZlciByZXBvcnRzIHRvIHJlbW90ZSBzZXJ2ZXIuIEl0IGFsc28gdGFrZXMgY2FyZSBvZiBjaGVja2luZyB0aGVcbiAqIGNvbm5lY3Rpb24gc3RhdHVzIGJlZm9yZSB0cnlpbmcgdG8gc2VuZCB0aGUgY2FjaGVkIHJlcG9ydHMuXG4gKi9cbmNsYXNzIERpc3BhdGNoZXIge1xuXG4gICAgY29uc3RydWN0b3Iod29ya2VyKSB7XG4gICAgICAgIHRoaXMuX2NhY2hlID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLl93b3JrZXIgPSB3b3JrZXI7XG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IHtcbiAgICAgICAgICAgIHJldHJ5VGltZW91dDogMjAwMDAsIC8vIHJldHJ5IGZsdXNoaW5nIGNhY2hlIGFmdGVyIDIwIHNlY29uZHNcbiAgICAgICAgICAgIGZsdXNoSW50ZXJ2YWw6IDMwMDAwLCAvLyBhdXRvIGZsdXNoIGludGVydmFsLFxuICAgICAgICAgICAgdXJsOiAnaHR0cDovL2xvY2FsaG9zdCcsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJ1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGluaXQoKSB7XG4gICAgICAgIGxldCBtc2dIYW5kbGVyID0gdGhpcy5fb25NZXNzYWdlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX3dvcmtlci5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgbXNnSGFuZGxlciwgZmFsc2UpO1xuICAgICAgICB0aGlzLl9mbHVzaEhhbmRsZXIgPSB0aGlzLmZsdXNoLmJpbmQodGhpcyk7XG5cbiAgICAgICAgdGhpcy5fcmV0cnlUaW1lb3V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fZmx1c2hJbnRlcnZhbCA9IG51bGw7XG4gICAgfVxuXG4gICAgZmx1c2goKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGJyb3dzZXIgaXMgb25saW5lXG4gICAgICAgIC8vIFRPRE86IGVuaGFuY2UgdGhpcyBjaGVjayB0byBtYWtlIGl0IG1vcmUgY29tcGF0aWJsZSB3aXRoIGRpZmZlcmVudFxuICAgICAgICAvLyAgICAgICBicm93c2VyIHZlbmRvcnNcbiAgICAgICAgaWYgKG5hdmlnYXRvci5vbkxpbmUpIHtcbiAgICAgICAgICAgIHRoaXMuX2ZsdXNoKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9mbHVzaFRpbWVvdXQgPSBzZXRUaW1lb3V0KHRoaXMuX2ZsdXNoSGFuZGxlciwgdGhpcy5fcmV0cnlUaW1lKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIGRpc3BhdGNoZXIgYnkgc2V0dGluZyB0aGUgYXV0byBmbHVzaGluZyBvcGVyYXRpb24gdXNpbmdcbiAgICAgKiBjdXJyZW50IGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBzdGFydChjb25maWcpIHtcbiAgICAgICAgdGhpcy5fd29ya2VyLnBvc3RNZXNzYWdlKCdESVNQQVRDSEVSIFdPUktFUiBTVEFSVEVEJyk7XG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGF1dG8gZmx1c2ggYnkgc2V0dGluZyBkZWZhdWx0IGZsdXNoIGludGVydmFsXG4gICAgICAgIGxldCBjZmcgPSB0aGlzLl9jb25maWc7XG5cbiAgICAgICAgY2ZnLnJldHJ5VGltZW91dCA9IGNvbmZpZy5yZXRyeVRpbWVvdXQgfHwgY2ZnLnJldHJ5VGltZW91dDtcbiAgICAgICAgY2ZnLmZsdXNoSW50ZXJ2YWwgPSBjb25maWcuZmx1c2hJbnRlcnZhbCB8fCBjZmcuZmx1c2hJbnRlcnZhbDtcbiAgICAgICAgY2ZnLnVybCA9IGNvbmZpZy51cmwgfHwgY2ZnLnVybDtcbiAgICAgICAgY2ZnLm1ldGhvZCA9IGNvbmZpZy5tZXRob2QgfHwgY2ZnLm1ldGhvZDtcblxuICAgICAgICB0aGlzLmZsdXNoSW50ZXJ2YWwgPSBjZmcuZmx1c2hJbnRlcnZhbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdG9wcyBkaXNwYXRjaGVyIGFuZCBjbG9zZXMgaXRzIHdvcmtlciB0aHJlYWRlZFxuICAgICAqL1xuICAgIHN0b3AoKSB7XG4gICAgICAgIHRoaXMuX3dvcmtlci5wb3N0TWVzc2FnZSgnRElTUEFUQ0hFUiBXT1JLRVIgU1RPUFBFRCcpO1xuICAgICAgICB0aGlzLl93b3JrZXIuY2xvc2UoKTsgLy8gVGVybWluYXRlcyB0aGUgd29ya2VyLlxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNlbmRzIGEgSlNPTiBtZXNzYWdlIHRvIHRoZSBkZWxpdmVyIHF1ZXVlIHRoYXQgd2lsbCBiZSBzZW50IHRvXG4gICAgICogcmVtb3RlIHNlcnZlciBvbiBmbHVzaCBvcGVyYXRpb25zXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBtc2cgQSB2YWxpZCBKU09OIGZvcm1hdHRlZCBzdHJpbmdcbiAgICAgKi9cbiAgICBlbnF1ZXVlKG1zZykge1xuICAgICAgICB0aGlzLl9jYWNoZS5hZGQobXNnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIGF1dG8gZmx1c2ggaW50ZXJ2YWwgaW4gbWlsbGlzZWNvbmRzLCBhZnRlciB0aGUgdGltZSBzZXQgcm91dGVyIHdpbGxcbiAgICAgKiBhdHRlbXB0IHRvIGRpc3BhdGNoIGFsbCBwZW5kaW5nIG1lc3NhZ2VzIHRvIHJlbW90ZSBzZXJ2ZXIgd2hlbmV2ZXIgdGhlcmVcbiAgICAgKiBpcyBjb25uZWN0aW9uIGF2YWlsYWJsZS4gU2V0IGludGVydmFsIHRvIGZhbHNlIGluIG9yZGVyIHRvIHN0b3AgYXV0b1xuICAgICAqIGRpc3BhdGNoIG9wZXJhdGlvbnMuXG4gICAgICogQHBhcmFtICB7TnVtYmVyfEJvb2xlYW59IGludGVydmFsIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRoYXQgcm91dGVyXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgIHdpbGwgd2FpdCB1bnRpbCBzZW5kaW5nIGNhY2hlZCBpbmZvcm1hdGlvbiB0b1xuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICByZW1vdGUgc2VydmVyLlxuICAgICAqL1xuICAgIHNldCBmbHVzaEludGVydmFsKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2NvbmZpZy5mbHVzaEludGVydmFsID0gcGFyc2VJbnQodmFsdWUpO1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMuX2ZsdXNoSW50ZXJ2YWwpO1xuXG4gICAgICAgIGlmICh0aGlzLl9jb25maWcuZmx1c2hJbnRlcnZhbCA8PSAwKSB7XG4gICAgICAgICAgICB0aGlzLl9mbHVzaEludGVydmFsID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2ZsdXNoSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCh0aGlzLl9mbHVzaEhhbmRsZXIsIHRoaXMuX2ZsdXNoSW50ZXJ2YWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBkZWZhdWx0IGF1dG8gZmx1c2ggaW50ZXJ2YWwgdmFsdWUgaW4gbWlsbGlzZWNvbmRzLiBUaGUgaW50ZXJ2YWxcbiAgICAgKiB3aWxsIGJlIHVzZWQgdG8gZW5yb3V0ZSBwZW5kaW5nIG1lc3NhZ2UgdG8gcmVtb3RlIHNlcnZlci5cbiAgICAgKiBAcmV0dXJuIHtOdW1iZXJ8Qm9vbGVhbn0gVGhlIG51bWJlciBvZiBtaWxsaXNlbmNvbmRzIGNvbmZpZ3VyZWQgZm9yIHRoZVxuICAgICAqIGZsdXNoIGludGVydmFsIG9yIGZhbHNlIHdoZW5ldmVyIHRoZSBhdXRvIGZsdXNoIGZlYXR1cmUgaGFzIGJlZW4gZGlzYWJsZWQuXG4gICAgICovXG4gICAgZ2V0IGZsdXNoSW50ZXJ2YWwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcuZmx1c2hJbnRlcnZhbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSByZW1vdGUgc2VydmVyIFVSTCB3aGVyZSB0aGUgcmVwb3J0cyB3aWxsIGJlIGRlbGl2ZXJlZCB3aGVuIGZsdXNoXG4gICAgICogbWV0aG9kIGlzIGNhbGxlZFxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gdXJsIGEgdmFsaWQgc2VydmVyIFVSTFxuICAgICAqL1xuICAgIHNldCB1cmwodXJsKSB7XG4gICAgICAgIHRoaXMuX2NvbmZpZy51cmwgPSB1cmw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgVVJMIGZvciBjdXJyZW50IHRhcmdldCByZW1vdGUgc2VydmVyIHdoZXJlIHRoZSByZXBvcnRzIGFyZVxuICAgICAqIGRlbGl2ZXJlZCB3aGVuIGZsdXNoIG9wZXJhdGlvbiBpcyByZXF1ZXN0ZWRcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAgICovXG4gICAgZ2V0IHVybCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy51cmw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgUmVxdWVzdCBtZXRob2QgdXNlZCB0byBkZWxpdmVyIHRoZSByZXBvcnRzIHRvIHJlbW90ZSBzZXJ2ZXIgYnlcbiAgICAgKiBkZWZhdWx0IHVzZWQgbWV0aG9kIGlzIFBPU1RcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAgICovXG4gICAgc2V0IG1ldGhvZChtZXRob2QpIHtcbiAgICAgICAgdGhpcy5fY29uZmlnLm1ldGhvZCA9IG1ldGhvZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBSZXF1ZXN0IG1ldGhvZCB1c2VkIHRvIGRlbGl2ZXIgdGhlIHJlcG9ydHMgdG8gcmVtb3RlIHNlcnZlclxuICAgICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICAgKi9cbiAgICBnZXQgbWV0aG9kKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLm1ldGhvZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIGEgbWVzc2FnZSBiZWluZyBzZW50IGJ5IHRoaXMgdGhyZWFkIG93bmVyXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBlIE1lc3NhZ2UgZXZlbnQgb2JqZWN0XG4gICAgICovXG4gICAgX29uTWVzc2FnZShlKSB7XG4gICAgICAgIGxldCBkYXRhID0gZS5kYXRhO1xuICAgICAgICBjb25zb2xlLmRlYnVnKCdESVNQQVRDSEVSIENPTU1BTkQgUkVDSUVWRUQgPj4nLCBkYXRhLmNtZCk7XG5cbiAgICAgICAgc3dpdGNoIChkYXRhLmNtZCkge1xuICAgICAgICBjYXNlICdzdGFydCc6XG4gICAgICAgICAgICB0aGlzLnN0YXJ0KGRhdGEucGFyYW1zKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdzdG9wJzpcbiAgICAgICAgICAgIHRoaXMuc3RvcCgpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2VucXVldWUnOlxuICAgICAgICAgICAgdGhpcy5lbnF1ZXVlKGRhdGEucGFyYW1zKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdzZXQtZmx1c2gtaW50ZXJ2YWwnOlxuICAgICAgICAgICAgdGhpcy5mbHVzaEludGVydmFsID0gZGF0YS5wYXJhbXMuZmx1c2hJbnRlcnZhbDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdzZXQtdXJsJzpcbiAgICAgICAgICAgIHRoaXMudXJsID0gZGF0YS5wYXJhbXMudXJsO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3NldC1tZXRob2QnOlxuICAgICAgICAgICAgdGhpcy51cmwgPSBkYXRhLnBhcmFtcy5tZXRob2Q7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZmx1c2gnOlxuICAgICAgICAgICAgdGhpcy5mbHVzaCgpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRlbXB0cyB0byBzZW5kIGNhY2hlZCBtZXNzYWdlcyB0byByZW1vdGUgc2VydmVyIHVzaW5nIGFuIGFqYXggcmVxdWVzdC5cbiAgICAgKiBJZiB0aGUgcmVxdWVzdCBmYWlscyB0aGlzIG1ldGhvZCB3aWxsIHJldHJ5IHRoZSBvcGVyYXRpb24gYWZ0ZXIgYSBmZXdcbiAgICAgKiBzZWNvbmRzIGJhc2VkIG9uIHRoZSBjb25maWd1cmF0aW9uIG9mIHJldHJ5IHRpbWVvdXQgZmllbGRcbiAgICAgKi9cbiAgICBfZmx1c2goKSB7XG4gICAgICAgIHRoaXMuX3dvcmtlci5wb3N0TWVzc2FnZSgnRkxVU0hJTkcgQ0FDSEUnKTtcblxuICAgICAgICBsZXQgeG1saHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4bWxodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IHRoaXMuX29uUmVhZHlTdGF0ZUNoYW5nZS5iaW5kKHRoaXMsXG4gICAgICAgICAgICB4bWxodHRwKTtcblxuICAgICAgICB4bWxodHRwLm9wZW4odGhpcy5tZXRob2QsIHRoaXMudXJsLCB0cnVlKTtcbiAgICAgICAgeG1saHR0cC5zZW5kKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyByZW1vdGUgc2VydmVyIGRlbGl2ZXIgcmVxdWVzdCBzdGF0dGUgY2hhbmdlIGV2ZW50XG4gICAgICogQHBhcmFtICB7WE1MSHR0cFJlcXVlc3R9IHhtbGh0dHAgQSByZWZlcm5jZSB0byB0aGUgcmVsYXRlIHJlcXVlc3Qgb2JqZWN0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfb25SZWFkeVN0YXRlQ2hhbmdlKHhtbGh0dHApIHtcbiAgICAgICAgaWYgKHhtbGh0dHAucmVhZHlTdGF0ZSA9PT0gWE1MSHR0cFJlcXVlc3QuRE9ORSkge1xuICAgICAgICAgICAgaWYgKHhtbGh0dHAuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jYWNoZS5jbGVhcigpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3dvcmtlci5wb3N0TWVzc2FnZSgnQ0FDSEUgRkxVU0hFRCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl93b3JrZXIucG9zdE1lc3NhZ2UoJ1JFTU9URSBTRVJWRVIgRVJST1IuJyk7XG4gICAgICAgICAgICAgICAgLy8gaWYgdGhlcmUgd2FzIGFuIGVycm9yIHJldHJ5IGFmdGVyIGEgc21hbGwgdGltZVxuICAgICAgICAgICAgICAgIHRoaXMuX2ZsdXNoVGltZW91dCA9IHNldFRpbWVvdXQodGhpcy5fZmx1c2hIYW5kbGVyLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb25maWcucmV0cnlUaW1lb3V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxubGV0IGRpc3BhdGNoZXIgPSBuZXcgRGlzcGF0Y2hlcihzZWxmKTtcbmRpc3BhdGNoZXIuaW5pdCgpO1xuIl19
