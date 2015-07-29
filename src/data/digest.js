'use strict';
import Report from './report';
import Profile from './profile';
import Util from '../util';

/**
 * Profile digest class provides the means to gather a set of profiling
 * individual results and route statics related to the performance of the
 * whole set of entries in a single report. This reporst is useful for those
 * functions that are called a lot of times and time spent varies from execution
 * to execution greatly.
 */
export default class ProfileDigest extends Report {

    /**
     * Creates a new profile report instance.
     * @param  {String} name An identifier that will be used when data is posted
     *                  through the Reouter into the remote server.
     */
    constructor(name) {
        super();
        this._name = name;
        this._profiles = [];
        this._running = false;
        this._fromUTC = (new Date()).toUTCString();

    }

    /**
     * Creates a new profile measure operation and closes any other measuring
     * process that could be running,
     */
    startMeasure() {
        this.completeMeasure();
        this._running = true;
        let name = this._name + '-' + this._profiles.length;
        this._profiles.push(new Profile(name));
    }

    /**
     * Completes a profiling measure operation being executed as part of the
     * set.
     */
    completeMeasure() {

        if (this._profiles.length === 0) return;

        let current = this._profiles[this._profiles.length - 1];
        current.complete(false);
    }

    /**
     * Compleates current profiling digest report and dispatches the resulting
     * information into the server routing queue.
     */
    complete() {

        if (!this._running) return;
        this._running = false;

        // get sure all measures are completed
        this.completeMeasure();

        let values = [];

        for (let profile of this._profiles) {
            values.push(profile.elapsed);
        }

        // Build report data
        this._data = {
            'name': this._name,
            'entries': this._profiles.length,
            'median': Util.median(values),
            'max': values[0],
            'min': values[values.length - 1]
        };

        this.dispatch();
    }
}
