'use strict';

import Router from '../router';
import Util from '../util';

/**
 * Base class for report generation, this class cotains a minimal set of data
 * structures and functionality used to gather and post information through the
 * routing service used to flush gathered information to remote server.
 */
export default class Report {

    /**
     * Creates a new report instance.
     * @param  {String} name An identifier that will be used when data is posted
     *                  through the Reouter into the remote server.
     */
    constructor(name) {
        this._data = {};
        this._name = name || Util.generateGUID();
    }

    /**
     * Returns a representation of report data along with its provided name
     * to be used on the report dispathing cycle.
     * @return {Object}
     */
    get data() {
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
    get name() {
        return this._name;
    }

    /**
     * Sends the report data through the Router dispatching queue.
     */
    dispatch() {
        Router.enqueue(this.data);
    }
}
