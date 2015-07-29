'use strict';

import Util from './util';
import PageReport from './data/page';
import AgentReport from './data/agent';
import ProfileReport from './data/profile';
import ResourceDigest from './data/resource';

let singleton = Symbol();
let singletonEnforcer = Symbol();

/**
 * Monitor class provides a single accesible point for fetching information and
 * generating Real User Monitoring reports to a remote server. Monitor will
 * listen several events on webpage and send results through the network
 * dispatcher in order to be deliverd to remove server.
 */
export default class Monitor {

    /**
     * Creates a single instance for this clase, this method shouldn't be
     * called directly from outside, instead use instance getter to get
     * access to the single instace.
     * @private
     * @param  {Symbol} enforcer
     */
    constructor(enforcer) {
        if (enforcer != singletonEnforcer) throw "Cannot construct singleton";
        this._idleInterval = 20000;

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
     * Initializes the Monitoring process by attaching a set of listeners that
     * will be used to collect information and generate pasive reports.
     */
    static init() {
        this.instance._init();
    }

    /**
     * @private
     */
    _init() {
        let loadHandler = this._onPageLoad.bind(this);
        let readyHandler = this._onReadyStateChange.bind(this);
        let activeHandler = Util.debounce(this._clearIdle, 1000, false, this);
        let idleHandler = this._setIdle.bind(this);
        let visibleHandler = this._onVisibilityChange.bind(this);

        Util.addEventListener(window, 'load', loadHandler);
        Util.addEventListener(document, 'readystatechange', readyHandler);
        Util.addEventListener(document, 'mousemove', activeHandler);
        Util.addEventListener(document, 'keydown', activeHandler);
        Util.addEventListener(document, Util.VISIBILITY_CHANGE, visibleHandler);

        this._idleInterval = setInterval(idleHandler, this._idleInterval);
        this._idleHandler = idleHandler;

        if (document.readyState === "complete")  {
            this._crateLoadReport();
        }

    }

    /**
     * @private
     */
    _onPageLoad() {
        // Nothing to do at the moment
    }

    /**
     * Handles document ready state change event. Monitor will auto generate
     * reports on certain events.
     * @private
     */
    _onReadyStateChange() {

        switch (window.document.readyState) {
        case 'interactive':
            if (Util.isDocumentHidden()) {
                this._setIdle();
            } else {
                this._clearIdle();
            }

            break;
        case 'complete':
                this._crateLoadReport();
            break;
        }
    }

    /**
     * Creates a set of reports after page load process has been completed.
     * @private
     */
    _crateLoadReport () {
        let page = new PageReport();
        let agent = new AgentReport();
        let resources = new ResourceDigest();

        page.dispatch();
        agent.dispatch();
        resources.dispatch();
    }

    /**
     * Handles page visibility state change event. Monitor will auto generate
     * reports whenever page goes out of scope or user focus it back.
     * @private
     */
    _onVisibilityChange() {
        if (Util.isDocumentHidden()) {
            this._setIdle();
        } else {
            this._clearIdle();
        }
    }

    /**
     * @private
     */
    _clearIdle() {
        clearInterval(this._idleInterval);

        // Clear previous idle profiler if any
        if (this._idle) {
            this._idle.complete();
            this._idle = null;
        }


        this._activity = new ProfileReport('user active period');
        this._idleInterval = setInterval(this._idleHandler, this._idleInterval);
    }

    /**
     * @private
     */
    _setIdle() {

        // Clear previous activity profiler if any
        if (this._activity) {
            this._activity.complete();
            this._activity = null;
        }

        this._idle = new ProfileReport('user idle period');
    }
}
