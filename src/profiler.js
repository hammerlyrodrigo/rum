'use strict'

import Profile from './data/profile';

let singleton = Symbol();
let singletonEnforcer = Symbol();


/**
 * @class Profiler
 * @description Profiler class provides the means for dynamic program analysis
 *              that measures time complexity of a javascript code, the usage
 *              of particular instructions, or the frequency and duration of
 *              function calls. Profiling information serves to aid program
 *              optimization.
 */
export default class Profiler {

    constructor(enforcer) {
        if (enforcer != singletonEnforcer) throw "Cannot construct singleton";
        this._profiles = new Map();
    }

    /**
    * Returns a singleton reference for this class to be used application wide.
    * @static
    * @return {Profiler} A refernce to the unique  instance.
    */
    static get instance() {
        if (!this[singleton]) {
            this[singleton] = new this(singletonEnforcer);
        }
        return this[singleton];
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
    static stop(identifier) {
        let success = this.instance._stop(identifier);
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
    static start(identifier) {
        return this.instance._start(identifier);
    }

    /**
     * @private
     */
    _start (identifier) {
        if(!this._profiles.has(identifier)) {
            let profile = new Profile(identifier);
            this._profiles.set(identifier, profile);
            return true;
        }

        return false;
    }

    /**
     * @private
     */
    _stop (identifier) {
        if(this._profiles.has(identifier)) {
            let profile = this._profiles.get(identifier);
            profile.complete();
            return true;
        }

        return false;
    }

}
