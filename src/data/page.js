'use strict';
import Report from './report';

/**
 * Page report class provides automatic information gathering and report
 * generation for common page performance timing measures.
 * In order to get this report information fully available it is required
 * to create it after the page has been totally loaded.
 */
export default class PageReport extends Report {

    /**
     * Creates a Page timing Report object and gathers all related information
     * at the same time. This reporst will be ready for dispatching after being
     * created.
     */
    constructor() {
        super('page-timing');

        let sourceInfo = {};
        let timingInfo = {};
        let timing = performance.timing;

        let timingEntries = ['connect', 'domainLookup', 'domContentLoadedEvent',
                            'loadEvent', 'redirect', 'response', 'unloadEvent'];

        let locationEntries = ['origin', 'protocol','pathname'];

        for (let entry of timingEntries) {
            let start = timing[entry + 'Start'];
            let end = timing[entry + 'End'];

            timingInfo[entry] = end - start;
        }

        sourceInfo['title'] = window.document.title;

        for (let entry of locationEntries) {
            sourceInfo[entry] = window.document.location[entry];
        }

        this._data = {
            'source' : sourceInfo,
            'timing' : timingInfo
        };
    }
}
