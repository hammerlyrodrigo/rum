'use strict';

let singleton = Symbol();
let singletonEnforcer = Symbol();

/**
 * Worker dispatcher functionality declaration.
 * This function is used as a script template for the code executed by the
 * Message Dispatcher Worker.
 */
let dispatcher = function () {

    let cache = [];

    /**
     * Returns true whenever a network connection is available
     * Note: this method is a mockup testing method an return a random value
     * instead making the proper checking
     * @return {Boolean}
     */
    let checkNetwork = function () {
        return Math.random() < .2;
    }

    /**
     * Sends cache content trought the network and cleans its contents.
     * Note: this method is a mockup testing method and only outputs the
     * 		 information through the console.
     * @fires CACHE_FLUSHED
     * @fires CACHE_FLUSH_ERROR
     */
    let flushCache = function () {
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
    }

    /**
     * Handles a message sent to the web worker from it's owner.
     * @param  {Object} e Message Event object
     */
    let onMessage = function (e) {
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
}.toString();


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

        if (enforcer != singletonEnforcer) throw "Cannot construct singleton";

        this._flushInterval = 20000; // 20 seconds
        this._flushHandler = this._flush.bind(this);

        this._flushInterval = setInterval(this._flushHandler, this._flushInterval);

        // Create a string defining a closure and execute it.
        dispatcher = '(' + dispatcher + ')()';

        // Create a fake file using script string in order to provide worker
        // with the code required to run.
        let blob = new Blob([dispatcher], {
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
            'cmd': 'queue',
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
        this.instance._flushInterval = interval;

        clearInterval(this._flushInterval);

        // If false sent no auto flush operation will be created
        if(interval === false) return;

        // set new auto flush operation interval
        this._flushInterval = setInterval(this._flushHandler, this._flushInterval);
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
     * @private
     */
    _flush() {
        this._worker.postMessage({
            'cmd': 'flush'
        });
    }
}
