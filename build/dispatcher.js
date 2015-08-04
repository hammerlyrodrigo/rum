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
        value: function start() {
            this._worker.postMessage('DISPATCHER WORKER STARTED');
            // Initialize the auto flush by setting default flush interval
            this.flushInterval = this._config.flushInterval;
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
                    this.start();
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
            var me = this;

            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState === XMLHttpRequest.DONE) {
                    if (xmlhttp.status === 200) {
                        me._cache.clear();
                        me._worker.postMessage('CACHE FLUSHED');
                    } else {
                        me._worker.postMessage('REMOTE SERVER ERROR.');
                        // if there was an error retry after a small time
                        me._flushTimeout = setTimeout(me._flushHandler, me._config.retryTimeout);
                    }
                }
            };

            xmlhttp.open(this.method, this.url, true);
            xmlhttp.send();
        }
    }, {
        key: 'flushInterval',
        set: function set(value) {
            this._config.flushInterval = parseInt(value);
            clearInterval(this._flushInterval);

            if (this._config.flushInterval >= 0) {
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9yb2RyaWdvL1dvcmtzcGFjZXMvcnVtL3NyYy93b3JrZXIvZGlzcGF0Y2hlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7O0lBT1AsVUFBVTtBQUVELGFBRlQsVUFBVSxDQUVBLE1BQU0sRUFBRTs4QkFGbEIsVUFBVTs7QUFHUixZQUFJLENBQUMsTUFBTSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7QUFDeEIsWUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7QUFDdEIsWUFBSSxDQUFDLE9BQU8sR0FBRztBQUNYLHdCQUFZLEVBQUUsS0FBSztBQUNuQix5QkFBYSxFQUFFLEtBQUs7QUFDcEIsZUFBRyxFQUFFLGtCQUFrQjtBQUN2QixrQkFBTSxFQUFFLE1BQU07U0FDakIsQ0FBQztLQUNMOztpQkFYQyxVQUFVOztlQWFSLGdCQUFHO0FBQ0gsZ0JBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzVDLGdCQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDNUQsZ0JBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRTNDLGdCQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztBQUMxQixnQkFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7U0FDOUI7OztlQUVJLGlCQUFHOzs7O0FBSUosZ0JBQUksU0FBUyxDQUFDLE1BQU0sRUFBRTtBQUNsQixvQkFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQ2pCLE1BQU07QUFDSCxvQkFBSSxDQUFDLGFBQWEsR0FBRyxVQUFV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YUFySGdCLGFBQUMsS0FBSyxFQUFFO0FBQ3JCLGdCQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDN0MseUJBQWEsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7O0FBRW5DLGdCQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxJQUFJLENBQUMsRUFBRTtBQUNqQyxvQkFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7YUFDOUIsTUFBTTtBQUNILG9CQUFJLENBQUMsY0FBYyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQzthQUM5RTtTQUNKOzs7Ozs7OzthQVFnQixlQUFHO0FBQ2hCLG1CQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO1NBQ3JDOzs7Ozs7Ozs7YUFPTSxhQUFDLEdBQUcsRUFBRTtBQUNULGdCQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7U0FDMUI7Ozs7Ozs7YUFPTSxlQUFHO0FBQ04sbUJBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7U0FDM0I7Ozs7Ozs7OzthQU9TLGFBQUMsTUFBTSxFQUFFO0FBQ2YsZ0JBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztTQUNoQzs7Ozs7O2FBTVMsZUFBRztBQUNULG1CQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1NBQzlCOzs7V0EzSEMsVUFBVTs7O0FBNkxoQixJQUFJLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN0QyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIERpc3BhdGNoZXIgY2xhc3MgcHJvdmlkZXMgc3VwcG9ydCBmb3IgdGhlIG1lc3NhZ2UgZGVsaXZlcnkgd29ya2VyIHVzZWQgdG9cbiAqIGNhY2hlIGFuZCBkZWxpdmVyIHJlcG9ydHMgdG8gcmVtb3RlIHNlcnZlci4gSXQgYWxzbyB0YWtlcyBjYXJlIG9mIGNoZWNraW5nIHRoZVxuICogY29ubmVjdGlvbiBzdGF0dXMgYmVmb3JlIHRyeWluZyB0byBzZW5kIHRoZSBjYWNoZWQgcmVwb3J0cy5cbiAqL1xuY2xhc3MgRGlzcGF0Y2hlciB7XG5cbiAgICBjb25zdHJ1Y3Rvcih3b3JrZXIpIHtcbiAgICAgICAgdGhpcy5fY2FjaGUgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuX3dvcmtlciA9IHdvcmtlcjtcbiAgICAgICAgdGhpcy5fY29uZmlnID0ge1xuICAgICAgICAgICAgcmV0cnlUaW1lb3V0OiAyMDAwMCwgLy8gcmV0cnkgZmx1c2hpbmcgY2FjaGUgYWZ0ZXIgMjAgc2Vjb25kc1xuICAgICAgICAgICAgZmx1c2hJbnRlcnZhbDogMzAwMDAsIC8vIGF1dG8gZmx1c2ggaW50ZXJ2YWwsXG4gICAgICAgICAgICB1cmw6ICdodHRwOi8vbG9jYWxob3N0JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaW5pdCgpIHtcbiAgICAgICAgbGV0IG1zZ0hhbmRsZXIgPSB0aGlzLl9vbk1lc3NhZ2UuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5fd29ya2VyLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBtc2dIYW5kbGVyLCBmYWxzZSk7XG4gICAgICAgIHRoaXMuX2ZsdXNoSGFuZGxlciA9IHRoaXMuZmx1c2guYmluZCh0aGlzKTtcblxuICAgICAgICB0aGlzLl9yZXRyeVRpbWVvdXQgPSBudWxsO1xuICAgICAgICB0aGlzLl9mbHVzaEludGVydmFsID0gbnVsbDtcbiAgICB9XG5cbiAgICBmbHVzaCgpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgYnJvd3NlciBpcyBvbmxpbmVcbiAgICAgICAgLy8gVE9ETzogZW5oYW5jZSB0aGlzIGNoZWNrIHRvIG1ha2UgaXQgbW9yZSBjb21wYXRpYmxlIHdpdGggZGlmZmVyZW50XG4gICAgICAgIC8vICAgICAgIGJyb3dzZXIgdmVuZG9yc1xuICAgICAgICBpZiAobmF2aWdhdG9yLm9uTGluZSkge1xuICAgICAgICAgICAgdGhpcy5fZmx1c2goKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2ZsdXNoVGltZW91dCA9IHNldFRpbWVvdXQodGhpcy5fZmx1c2hIYW5kbGVyLCB0aGlzLl9yZXRyeVRpbWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgZGlzcGF0Y2hlciBieSBzZXR0aW5nIHRoZSBhdXRvIGZsdXNoaW5nIG9wZXJhdGlvbiB1c2luZ1xuICAgICAqIGN1cnJlbnQgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIHN0YXJ0KCkge1xuICAgICAgICB0aGlzLl93b3JrZXIucG9zdE1lc3NhZ2UoJ0RJU1BBVENIRVIgV09SS0VSIFNUQVJURUQnKTtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgYXV0byBmbHVzaCBieSBzZXR0aW5nIGRlZmF1bHQgZmx1c2ggaW50ZXJ2YWxcbiAgICAgICAgdGhpcy5mbHVzaEludGVydmFsID0gdGhpcy5fY29uZmlnLmZsdXNoSW50ZXJ2YWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3RvcHMgZGlzcGF0Y2hlciBhbmQgY2xvc2VzIGl0cyB3b3JrZXIgdGhyZWFkZWRcbiAgICAgKi9cbiAgICBzdG9wKCkge1xuICAgICAgICB0aGlzLl93b3JrZXIucG9zdE1lc3NhZ2UoJ0RJU1BBVENIRVIgV09SS0VSIFNUT1BQRUQnKTtcbiAgICAgICAgdGhpcy5fd29ya2VyLmNsb3NlKCk7IC8vIFRlcm1pbmF0ZXMgdGhlIHdvcmtlci5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZW5kcyBhIEpTT04gbWVzc2FnZSB0byB0aGUgZGVsaXZlciBxdWV1ZSB0aGF0IHdpbGwgYmUgc2VudCB0b1xuICAgICAqIHJlbW90ZSBzZXJ2ZXIgb24gZmx1c2ggb3BlcmF0aW9uc1xuICAgICAqIEBwYXJhbSAge1N0cmluZ30gbXNnIEEgdmFsaWQgSlNPTiBmb3JtYXR0ZWQgc3RyaW5nXG4gICAgICovXG4gICAgZW5xdWV1ZShtc2cpIHtcbiAgICAgICAgdGhpcy5fY2FjaGUuYWRkKG1zZyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyBhdXRvIGZsdXNoIGludGVydmFsIGluIG1pbGxpc2Vjb25kcywgYWZ0ZXIgdGhlIHRpbWUgc2V0IHJvdXRlciB3aWxsXG4gICAgICogYXR0ZW1wdCB0byBkaXNwYXRjaCBhbGwgcGVuZGluZyBtZXNzYWdlcyB0byByZW1vdGUgc2VydmVyIHdoZW5ldmVyIHRoZXJlXG4gICAgICogaXMgY29ubmVjdGlvbiBhdmFpbGFibGUuIFNldCBpbnRlcnZhbCB0byBmYWxzZSBpbiBvcmRlciB0byBzdG9wIGF1dG9cbiAgICAgKiBkaXNwYXRjaCBvcGVyYXRpb25zLlxuICAgICAqIEBwYXJhbSAge051bWJlcnxCb29sZWFufSBpbnRlcnZhbCBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IHJvdXRlclxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICB3aWxsIHdhaXQgdW50aWwgc2VuZGluZyBjYWNoZWQgaW5mb3JtYXRpb24gdG9cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3RlIHNlcnZlci5cbiAgICAgKi9cbiAgICBzZXQgZmx1c2hJbnRlcnZhbCh2YWx1ZSkge1xuICAgICAgICB0aGlzLl9jb25maWcuZmx1c2hJbnRlcnZhbCA9IHBhcnNlSW50KHZhbHVlKTtcbiAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9mbHVzaEludGVydmFsKTtcblxuICAgICAgICBpZiAodGhpcy5fY29uZmlnLmZsdXNoSW50ZXJ2YWwgPj0gMCkge1xuICAgICAgICAgICAgdGhpcy5fZmx1c2hJbnRlcnZhbCA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9mbHVzaEludGVydmFsID0gc2V0SW50ZXJ2YWwodGhpcy5fZmx1c2hIYW5kbGVyLCB0aGlzLl9mbHVzaEludGVydmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgZGVmYXVsdCBhdXRvIGZsdXNoIGludGVydmFsIHZhbHVlIGluIG1pbGxpc2Vjb25kcy4gVGhlIGludGVydmFsXG4gICAgICogd2lsbCBiZSB1c2VkIHRvIGVucm91dGUgcGVuZGluZyBtZXNzYWdlIHRvIHJlbW90ZSBzZXJ2ZXIuXG4gICAgICogQHJldHVybiB7TnVtYmVyfEJvb2xlYW59IFRoZSBudW1iZXIgb2YgbWlsbGlzZW5jb25kcyBjb25maWd1cmVkIGZvciB0aGVcbiAgICAgKiBmbHVzaCBpbnRlcnZhbCBvciBmYWxzZSB3aGVuZXZlciB0aGUgYXV0byBmbHVzaCBmZWF0dXJlIGhhcyBiZWVuIGRpc2FibGVkLlxuICAgICAqL1xuICAgIGdldCBmbHVzaEludGVydmFsKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmZsdXNoSW50ZXJ2YWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgcmVtb3RlIHNlcnZlciBVUkwgd2hlcmUgdGhlIHJlcG9ydHMgd2lsbCBiZSBkZWxpdmVyZWQgd2hlbiBmbHVzaFxuICAgICAqIG1ldGhvZCBpcyBjYWxsZWRcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHVybCBhIHZhbGlkIHNlcnZlciBVUkxcbiAgICAgKi9cbiAgICBzZXQgdXJsKHVybCkge1xuICAgICAgICB0aGlzLl9jb25maWcudXJsID0gdXJsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIFVSTCBmb3IgY3VycmVudCB0YXJnZXQgcmVtb3RlIHNlcnZlciB3aGVyZSB0aGUgcmVwb3J0cyBhcmVcbiAgICAgKiBkZWxpdmVyZWQgd2hlbiBmbHVzaCBvcGVyYXRpb24gaXMgcmVxdWVzdGVkXG4gICAgICogQHJldHVybiB7U3RyaW5nfVxuICAgICAqL1xuICAgIGdldCB1cmwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcudXJsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIFJlcXVlc3QgbWV0aG9kIHVzZWQgdG8gZGVsaXZlciB0aGUgcmVwb3J0cyB0byByZW1vdGUgc2VydmVyIGJ5XG4gICAgICogZGVmYXVsdCB1c2VkIG1ldGhvZCBpcyBQT1NUXG4gICAgICogQHJldHVybiB7U3RyaW5nfVxuICAgICAqL1xuICAgIHNldCBtZXRob2QobWV0aG9kKSB7XG4gICAgICAgIHRoaXMuX2NvbmZpZy5tZXRob2QgPSBtZXRob2Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgUmVxdWVzdCBtZXRob2QgdXNlZCB0byBkZWxpdmVyIHRoZSByZXBvcnRzIHRvIHJlbW90ZSBzZXJ2ZXJcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAgICovXG4gICAgZ2V0IG1ldGhvZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5tZXRob2Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyBhIG1lc3NhZ2UgYmVpbmcgc2VudCBieSB0aGlzIHRocmVhZCBvd25lclxuICAgICAqIEBwYXJhbSAge09iamVjdH0gZSBNZXNzYWdlIGV2ZW50IG9iamVjdFxuICAgICAqL1xuICAgIF9vbk1lc3NhZ2UoZSkge1xuICAgICAgICBsZXQgZGF0YSA9IGUuZGF0YTtcbiAgICAgICAgY29uc29sZS5kZWJ1ZygnRElTUEFUQ0hFUiBDT01NQU5EIFJFQ0lFVkVEID4+JywgZGF0YS5jbWQpO1xuXG4gICAgICAgIHN3aXRjaCAoZGF0YS5jbWQpIHtcbiAgICAgICAgY2FzZSAnc3RhcnQnOlxuICAgICAgICAgICAgdGhpcy5zdGFydCgpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3N0b3AnOlxuICAgICAgICAgICAgdGhpcy5zdG9wKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZW5xdWV1ZSc6XG4gICAgICAgICAgICB0aGlzLmVucXVldWUoZGF0YS5wYXJhbXMpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3NldC1mbHVzaC1pbnRlcnZhbCc6XG4gICAgICAgICAgICB0aGlzLmZsdXNoSW50ZXJ2YWwgPSBkYXRhLnBhcmFtcy5mbHVzaEludGVydmFsO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3NldC11cmwnOlxuICAgICAgICAgICAgdGhpcy51cmwgPSBkYXRhLnBhcmFtcy51cmw7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnc2V0LW1ldGhvZCc6XG4gICAgICAgICAgICAgICAgdGhpcy51cmwgPSBkYXRhLnBhcmFtcy5tZXRob2Q7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZmx1c2gnOlxuICAgICAgICAgICAgdGhpcy5mbHVzaCgpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRlbXB0cyB0byBzZW5kIGNhY2hlZCBtZXNzYWdlcyB0byByZW1vdGUgc2VydmVyIHVzaW5nIGFuIGFqYXggcmVxdWVzdC5cbiAgICAgKiBJZiB0aGUgcmVxdWVzdCBmYWlscyB0aGlzIG1ldGhvZCB3aWxsIHJldHJ5IHRoZSBvcGVyYXRpb24gYWZ0ZXIgYSBmZXdcbiAgICAgKiBzZWNvbmRzIGJhc2VkIG9uIHRoZSBjb25maWd1cmF0aW9uIG9mIHJldHJ5IHRpbWVvdXQgZmllbGRcbiAgICAgKi9cbiAgICBfZmx1c2goKSB7XG4gICAgICAgIHRoaXMuX3dvcmtlci5wb3N0TWVzc2FnZSgnRkxVU0hJTkcgQ0FDSEUnKTtcblxuICAgICAgICBsZXQgeG1saHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICBsZXQgbWUgPSB0aGlzO1xuXG5cbiAgICAgICAgeG1saHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoeG1saHR0cC5yZWFkeVN0YXRlID09PSBYTUxIdHRwUmVxdWVzdC5ET05FKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhtbGh0dHAuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgbWUuX2NhY2hlLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgICAgIG1lLl93b3JrZXIucG9zdE1lc3NhZ2UoJ0NBQ0hFIEZMVVNIRUQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtZS5fd29ya2VyLnBvc3RNZXNzYWdlKCdSRU1PVEUgU0VSVkVSIEVSUk9SLicpO1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiB0aGVyZSB3YXMgYW4gZXJyb3IgcmV0cnkgYWZ0ZXIgYSBzbWFsbCB0aW1lXG4gICAgICAgICAgICAgICAgICAgIG1lLl9mbHVzaFRpbWVvdXQgPSBzZXRUaW1lb3V0KG1lLl9mbHVzaEhhbmRsZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZS5fY29uZmlnLnJldHJ5VGltZW91dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHhtbGh0dHAub3Blbih0aGlzLm1ldGhvZCwgdGhpcy51cmwsIHRydWUpO1xuICAgICAgICB4bWxodHRwLnNlbmQoKTtcbiAgICB9XG59XG5cbmxldCBkaXNwYXRjaGVyID0gbmV3IERpc3BhdGNoZXIoc2VsZik7XG5kaXNwYXRjaGVyLmluaXQoKTtcbiJdfQ==
