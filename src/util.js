'use strict';

/**
 * Util class exposes a set of common utility functionalities used through the
 * application.
 */
export default class Util {

    /**
     * Returns a new function with a limit on the rate it can be fired. This
     * is useful for those functions that are called too often as a result
     * of user events.
     * @param  {Function} func    The reference to the original function
     * @param  {Number} wait      The minimum amount of time that should
     *                            pass without calling the function in order
     *                            to trigger the real call.
     * @param  {Boolean} immediate
     * @param  {Object} scope
     */
    static debounce(func, wait, immediate, scope) {
        var timeout;
        return function () {
            var context = this,
                args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(scope, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(scope, args);
        };
    }

    /**
     * Adds a new event listener to the provided object and binds it to a
     * supplied callback function
     * @param {Object}   target
     * @param {String}   name
     * @param {Function} callback
     * @param {Boolean}   capture
     */
    static addEventListener(target, name, callback, capture) {
        capture = capture || false;
        if ("undefined" != typeof (target.attachEvent)) {
            return target.attachEvent("on" + name, callback);
        } else if (target.addEventListener) {
            return target.addEventListener(name, callback, capture);
        }
    };


    /**
     * Returns the name of visibility change property on current user agent.
     */
    static get VISIBILITY_CHANGE() {
        let hidden = "hidden";

        // Standards:
        if (hidden in document)
            return "visibilitychange";
        else if ((hidden = "mozHidden") in document)
            return "mozvisibilitychange";
        else if ((hidden = "webkitHidden") in document)
            return "webkitvisibilitychange";
        else if ((hidden = "msHidden") in document)
            return "msvisibilitychange";
    }

    /**
     * Returns the name of document hidden property on current user agent.
     */
    static get HIDDEN_PROPERTY() {
        if ('hidden' in document) return 'hidden';
        if ('mozHidden' in document) return 'mozHidden';
        if ('webkitHidden' in document) return 'webkitHidden';
        if ('msHidden' in document) return 'msHidden';
    }

    /**
     * Check whenever document has been hiden by user switching to other
     * tabs or windows.
     * @return {Boolean}
     */
    static isDocumentHidden() {
        return document[this.HIDDEN_PROPERTY];
    }

    /**
     * Generates a Globally Unique Identifier
     * @param [hyphens = true] Set to false to remove hypen separator between
     * number groups.
     * @return {String}
     */
    static generateGUID(hyphens) {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        var sep = '-';

        if (hyphens === false) {
            sep = '';
        }

        return s4() + s4() + sep + s4() + sep + s4() + sep + s4() + sep +
            s4() + s4() + s4();
    }

    /**
     * Copies all object properties into a new object
     * @param  {Object} obj the source object which properties will be copied
     * @return {Object}     A new object with the properties copied
     */
    static copyObject(obj) {
        var newObj = {};

        for (var key in obj) {
            newObj[key] = obj[key];
        }

        return newObj;
    }

    static median(values) {

        values.sort(function (a, b) {
            return a - b;
        });

        var half = Math.floor(values.length / 2);

        if (values.length % 2)
            return values[half];
        else
            return (values[half - 1] + values[half]) / 2.0;
    }

}
