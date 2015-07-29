'use strict';
import Report from './report';
import Util from '../util';

/**
 * Profile report class provides the means to collect information for a single
 * named operation by saving the time since it has been created until it is
 * completed using the ProfileReport::complete method. After compleating a report
 * it will be automatically dispatched to the server routing queue.
 */
export default class ProfileReport extends Report {

    /**
     * Creates a new profile report instance.
     * @param  {String} name An identifier that will be used when data is posted
     *                  through the Reouter into the remote server.
     */
    constructor(name) {
        super();
        this._name = name;
        this._from = window.performance.now();
        this._to = null;
        this._running = true;
        this._fromUTC = (new Date()).toUTCString();
    }

    /**
     * Returns the total number if milliseconds passed since this report has
     * been created and until the time it has been completed, or current time
     * if the profile report is still under progress.
     * @return {Nunber}
     */
    get elapsed() {
        if (!this.isRunning) {
            return this._from - this._to;
        }

        return this._from - window.performance.now();
    }

    /**
     * Returns true if current profiling report has been yet completed.
     * @return {Boolean}
     */
    get isRunning() {
        return this._running;
    }

    /**
     * Compleates current profiling report and dispatches the resulting
     * information into the server routing queue.
     * @param {Boolean} dispatch Send false if you don't want to send this
     *                  profiling report into the dispatching queue.
     */
    complete(dispatch) {
        if (!this._running) return;

        this._running = false;
        this.to = window.performance.now();
        this._toUTC = (new Date()).toUTCString();

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

}
