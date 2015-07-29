'use strict';
import mime from 'mime-types';
import Util from '../util';
import Report from './report';

/**
 * Resource disget report class provides a set of page resource loading statics
 * took from the performance entries available on the browser at the moment of
 * its creation. This class will generate a report with the longest and shortes
 * times consumed by the loaded resources at the moment of its creation along
 * with the detailed information of the resource requests that generated those
 * values. For all other requests digest report will generate a count of
 * individual resource plus the total time spent by them split in several
 * categories.
 */
export default class ResourcesDigest extends Report {

    /**
     * Creates a Resource digest Report object and gathers all related information
     * at the same time. This reporst will be ready for dispatching after being
     * created.
     */
    constructor() {
        super('resources-timing-digest');

        let resources = performance.getEntries();
        let initiators = {};
        let mimeTypes = {};
        let timing = {
            'longest': {
                'duration': 0
            },
            'shortest': {
                'duration': 0
            }
        }
        
        for (let resource of resources) {

            // Keep full record of the shortest and longest resource
            // request time
            if (resource.duration > timing.longest.duration) {
                timing.longest.duration = Math.round(resource.duration);
                timing.longest.resource = resource;
            }

            if (resource.duration < timing.shortest.duration ||
                timing.shortest.duration == 0) {
                timing.shortest.duration = Math.round(resource.duration);
                timing.shortest.resource = resource;
            }

            // Sum the time for resource request initiators
            let initiatorType = resource.initiatorType;

            if (!initiators[initiatorType]) {
                initiators[initiatorType] = {
                    'count': 0,
                    'total': 0
                };
            }

            initiators[initiatorType].count += 1;
            initiators[initiatorType].total += Math.round(resource.duration);

            //Sum the time for different mime types when available
            let mimeType = mime.lookup(resource.name);

            if (!mimeType) continue;

            if (!mimeTypes[mimeType]) {
                mimeTypes[mimeType] = {
                    'count': 0,
                    'total': 0
                };
            }

            mimeTypes[mimeType].count += 1;
            mimeTypes[mimeType].total += Math.round(resource.duration);
        }

        // After keeping the longest and shortest loading time related resources
        // get sure only to keep it's own properties and get rid of the reast of
        // the object in order to pass it trough the dispatcher worker safely
        timing.longest.resource = Util.copyObject(timing.longest.resource);
        timing.shortest.resource = Util.copyObject(timing.shortest.resource);

        this._data = {
            'timing': timing,
            'initiators': initiators,
            'mimeTypes': mimeTypes
        };
    }
}
