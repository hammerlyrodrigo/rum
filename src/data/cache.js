'use strict';

let singleton = Symbol();
let singletonEnforcer = Symbol();

 export default class Cache {
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

        this._cache = new Set();
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

    static add(item) {
        this.instance.add(item);
    }

    static flush(url) {

    }

    /**
     * @private
     */
    _add(item) {
        this._cache.add(item);
    }
}
