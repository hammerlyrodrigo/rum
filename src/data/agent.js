'use strict';
import Report from './report';

/**
 * Agent report class provides automatic information gethering and report
 * generation for browser and user platform related data.
 */
export default class AgentReport extends Report {

    /**
     * Creates an user agent report object and gathers all related information
     * at the same time. This reporst will be ready for dispatching just after
     * being created.
     */
    constructor() {
        super('user-agent');

        let data = {};

        let entries = ['appCodeName', 'appName', 'appVersion', 'userAgent',
                       'cookieEnabled', 'language', 'platform', 'product'];

        for (let entry of entries) {
            data[entry] = window.navigator[entry];
        }

        this._data = data;

        if (window.navigator.geolocation) {
            let position = this._updateLocation.bind(this);

            window.navigator.geolocation.getCurrentPosition(position);
        } else {
            this._data['coords'] = 'n/a';
        }
    }

    _updateLocation(location) {
        this._data['coords'] = location.coords;
    }

}
