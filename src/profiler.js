'use strict';

import Profile from './data/profile';
import ProfileDigest from './data/digest';

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
        if (enforcer !== singletonEnforcer) {
            throw "Cannot construct singleton";
        }
        this._profiles = new Map();
        this._digests = new Map();
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
     * Stops a profile execution  under provided identifier when available
     * @param  {String|Object|Function} identifier A reference to a unique
     *         identifier used to store a profile, the identifier could be a
     *         String an object or even a function, this way indivual objects
     *         or even functions can be tracked more reliabily.
     *
     * @return {Bool}  Returnns true if the profile has been successfully stoped,
     *         if it was already running or there is a another
     *         profile using the same identifier will return false,
     * @static
     */
    static stop(identifier) {
        let success = this.instance._stop(identifier);
        return success;
    }


    /**
     * Starts a profile execution and stores it under provided identifier
     * @param  {String|Object|Function} identifier A reference to a unique
     *         identifier used to store a profile, the identifier could be a
     *         String an object or even a function, this way indivual objects
     *         or even functions can be tracked more reliabily.
     *
     * @return {Bool}   Returnns true if the profile has been started
     *         successfully, if it was already running or there is another
     *         profile using the same identifier will return false,
     * @static
     */
    static start(identifier) {
        return this.instance._start(identifier);
    }

    /**
     * Creates a multi profiling digest and stores it under provided identifier
     * @param  {String|Object|Function} identifier A reference to a unique
     *         identifier used to store a profile, the identifier could be a
     *         String an object or even a function, this way indivual objects
     *         or even functions can be tracked more reliabily.
     *
     * @return {Bool}   Returnns true if the digest has been successfully
     *         created if it was already running or there is another
     *         digest using the same identifier will return false,
     * @static
     */
    static createtMulti(identifier) {
        return this.instance._createMulti(identifier);
    }

    /**
     * Completes a multi profiling digest gathering stored under provided
     * identifier when available.
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
    static completeMulti(identifier) {
        return this.instance._completeMulti(identifier);
    }


    /**
     * Starts a profile execution for a multi profile digest collection
     * @param  {String|Object|Function} identifier A reference to a unique
     *         identifier used to store a profile, the identifier could be a
     *         String an object or even a function, this way indivual objects
     *         or even functions can be tracked more reliabily.
     *
     * @return {Bool}   Returnns true if the profile has been started
     *         successfully, if it was already running or there is another
     *         profile using the same identifier will return false,
     * @static
     */
    static startMeasure(identifier) {
        return this.instance._startMeasure(identifier);
    }

    /**
     * Stops a profile execution   for a multi profile digest collectio when
     * available
     * @param  {String|Object|Function} identifier A reference to a unique
     *         identifier used to store the multi profile, the identifier
     *         could be a String an object or even a function, this way indivual
     *         objects  or even functions can be tracked more reliabily.
     *
     * @return {Bool}  Returnns true if the profile has been successfully stoped,
     *         if it was already running or there is a another
     *         profile using the same identifier will return false,
     * @static
     */
    static stopMeasure(identifier) {
        return this.instance._stopMeasure(identifier);
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
    _startMeasure(identifier) {
        if(!this._digests.has(identifier)) {
             return false;
        }
        let digest = this._digests.get(identifier);
        digest.startMeasure();

        return true;
   }

   /**
    * @private
    */
   _stopMeasure(identifier) {
       if(!this._digests.has(identifier)) {
           return false;
       }
       let digest = this._digests.get(identifier);
       digest.completeMeasure();
       return true;
   }

    /**
     * @private
     */
    _createMulti (identifier) {
        if(!this._digests.has(identifier)) {
            let digest = new ProfileDigest(identifier);
            this._digests.set(identifier, digest);
            return true;
        }

        return false;
    }

    /**
     * @private
     */
    _completeMulti (identifier) {
        if(this._digests.has(identifier)) {
            let digest = this._digests.get(identifier);
            digest.complete();
            this._digests.delete(identifier);
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
            this._profiles.delete(identifier);
            return true;
        }

        return false;
    }

}
