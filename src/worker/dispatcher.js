'use strict';

/**
 * Dispatcher class provides support for the message delivery worker used to
 * cache and deliver reports to remote server. It also takes care of checking the
 * connection status before trying to send the cached reports.
 */
class Dispatcher {

    constructor(worker) {
        this._cache = new Set();
        this._worker = worker;
        this._config = {
            retryTimeout: 20000, // retry flushing cache after 20 seconds
            flushInterval: 30000, // auto flush interval,
            url: 'http://localhost',
            method: 'POST'
        };
    }

    init() {
        let msgHandler = this._onMessage.bind(this);
        this._worker.addEventListener('message', msgHandler, false);
        this._flushHandler = this.flush.bind(this);

        this._retryTimeout = null;
        this._flushInterval = null;
    }

    flush() {
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
    start(config) {
        this._worker.postMessage('DISPATCHER WORKER STARTED');
        // Initialize the auto flush by setting default flush interval
        let cfg = this._config;

        cfg.retryTimeout = config.retryTimeout || cfg.retryTimeout;
        cfg.flushInterval = config.flushInterval || cfg.flushInterval;
        cfg.url = config.url || cfg.url;
        cfg.method = config.method || cfg.method;

        this.flushInterval = cfg.flushInterval;
    }

    /**
     * Stops dispatcher and closes its worker threaded
     */
    stop() {
        this._worker.postMessage('DISPATCHER WORKER STOPPED');
        this._worker.close(); // Terminates the worker.
    }

    /**
     * Sends a JSON message to the deliver queue that will be sent to
     * remote server on flush operations
     * @param  {String} msg A valid JSON formatted string
     */
    enqueue(msg) {
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
    set flushInterval(value) {
        this._config.flushInterval = parseInt(value);
        clearInterval(this._flushInterval);

        if (this._config.flushInterval <= 0) {
            this._flushInterval = null;
        } else {
            this._flushInterval = setInterval(this._flushHandler, this._flushInterval);
        }
    }

    /**
     * Returns default auto flush interval value in milliseconds. The interval
     * will be used to enroute pending message to remote server.
     * @return {Number|Boolean} The number of millisenconds configured for the
     * flush interval or false whenever the auto flush feature has been disabled.
     */
    get flushInterval() {
        return this._config.flushInterval;
    }

    /**
     * Sets the remote server URL where the reports will be delivered when flush
     * method is called
     * @param  {String} url a valid server URL
     */
    set url(url) {
        this._config.url = url;
    }

    /**
     * Returns the URL for current target remote server where the reports are
     * delivered when flush operation is requested
     * @return {String}
     */
    get url() {
        return this._config.url;
    }

    /**
     * Sets the Request method used to deliver the reports to remote server by
     * default used method is POST
     * @return {String}
     */
    set method(method) {
        this._config.method = method;
    }

    /**
     * Returns the Request method used to deliver the reports to remote server
     * @return {String}
     */
    get method() {
        return this._config.method;
    }

    /**
     * Handles a message being sent by this thread owner
     * @param  {Object} e Message event object
     */
    _onMessage(e) {
        let data = e.data;
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
    _flush() {
        this._worker.postMessage('FLUSHING CACHE');

        let xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = this._onReadyStateChange.bind(this,
            xmlhttp);

        xmlhttp.open(this.method, this.url, true);
        xmlhttp.send();
    }

    /**
     * Handles remote server deliver request statte change event
     * @param  {XMLHttpRequest} xmlhttp A refernce to the relate request object
     * @private
     */
    _onReadyStateChange(xmlhttp) {
        if (xmlhttp.readyState === XMLHttpRequest.DONE) {
            if (xmlhttp.status === 200) {
                this._cache.clear();
                this._worker.postMessage('CACHE FLUSHED');
            } else {
                this._worker.postMessage('REMOTE SERVER ERROR.');
                // if there was an error retry after a small time
                this._flushTimeout = setTimeout(this._flushHandler,
                    this._config.retryTimeout);
            }
        }
    }
}

let dispatcher = new Dispatcher(self);
dispatcher.init();
