'use strict';

let singleton = Symbol();
let singletonEnforcer = Symbol();

/**
 * Router class provides a single access point for sending report content
 * to the server by using a dedicated web worker dispatcher.
 */
export default class Router {

    /**
     * Creates a single instance for this clase, this method shouldn't be
     * called directly from outside, instead use instance getter to get
     * access to the single instace.
     * @private
     * @param  {Symbol} enforcer
     */
    constructor(enforcer) {

        if (enforcer !== singletonEnforcer) {
            throw "Cannot construct singleton";
        }

        this._flushInterval = 20000; // 20 seconds
        this._serverURL = 'http://localhost';
        this._requestMethod = 'POST';
        this._flushInterval = 20000;

        // Create a worker dispatcher
        // Note: the worker script will be inlined using workerify transform
        // in order to keep all the solution into a single file
        this._worker = new Worker('../../build/dispatcher.js');

        // Listen to worker notifications
        this._worker.onmessage = function (message) {
            console.debug(message.data);
        };

        // Send init command to worker
        this._worker.postMessage({
            'cmd': 'start',
            'params': {
                'flushInterval': this._flushInterval,
                'url': this._serverURL,
                'method': this._requestMethod,
            }
        });
    }

    /**
     * Returns a singleton reference for this class to be used application wide.
     * @static
     * @return {Router} A refernce to the unique  instance.
     */
    static get instance() {
        if (!this[singleton]) {
            this[singleton] = new this(singletonEnforcer);
        }
        return this[singleton];
    }

    /**
     * Sends information to the report post queue
     * @param  {Object} data A simple javascript object containing a set of
     *                  keys and values that will be transmited to the
     *                  server on flush operations.
     */
    static enqueue(data) {
        this.instance._worker.postMessage({
            'cmd': 'enqueue',
            'params': data
        });
        console.debug('MESSAGE SENT TO QUEUE', data);
    }

    /**
     * Flushes cached information on threaded dispatcher into the server whenever
     * a valid network connection is available.
     */
    static flush() {
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
    static set flushInterval(interval) {
        this.instance._flushInterval = interval; // get a local copy

        if (!this.instance._worker) {
            return;
        }

        this.instance._worker.postMessage({
            'cmd': 'set-flush-interval',
            'params': {
                'flushInterval': interval
            }
        });
    }

    /**
     * Returns default auto flush interval value in milliseconds. The interval
     * will be used to enroute pending message to remote server.
     * @return {Number|Boolean} The number of millisenconds configured for the
     * flush interval or false whenever the auto flush feature has been disabled.
     */
    static get flushInterval() {
        return this.instance._flushInterval;
    }

    /**
     * Sets the remote server URL where the reports will be delivered when flush
     * method is called
     * @param  {String} url a valid server URL
     */
    static set serverURL(url) {
        this.instance._serverURL = url; // get a local copy

        if (!this.instance._worker) {
            return;
        }

        this.instance._worker.postMessage({
            'cmd': 'set-url',
            'params': {
                'url': url
            }
        });
    }

    /**
     * Returns the URL for current target remote server where the reports are
     * delivered when flush operation is requested
     * @return {String}
     */
    static get serverURL() {
        return this.instance._serverURL;
    }

    /**
     * Sets the Request method used to deliver the reports to remote server by
     * default used method is POST
     * @return {String}
     */
    static set requestMethod(method) {
        this.instance._requestMethod = method; // get a local copy

        if (!this.instance._worker) {
            return;
        }

        this.instance._worker.postMessage({
            'cmd': 'set-method',
            'params': {
                'method': method
            }
        });
    }

    /**
     * Returns the Request method used to deliver the reports to remote server
     * @return {String}
     */
    static get requestMethod() {
        return this.instance._serverURL;
    }


    /**
     * @private
     */
    _flush() {
        this._worker.postMessage({
            'cmd': 'flush'
        });
    }
}
