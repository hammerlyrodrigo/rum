
# ![rum](https://raw.githubusercontent.com/hammerlyrodrigo/rum/master/static/moonshine.png) **RUM**

##### Yet another **Real User Monitoring Library**
<br>
* Build Status: <a href="https://travis-ci.org/hammerlyrodrigo/rum"><img title="Build Status Images" src="https://travis-ci.org/hammerlyrodrigo/rum.svg"/></a>
<a href="https://www.bithound.io/github/hammerlyrodrigo/rum/master"><img src="https://www.bithound.io/github/hammerlyrodrigo/rum/badges/score.svg" alt="bitHound Score"></a>
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/hammerlyrodrigo/rum?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
<br>
<br>
[![NPM](https://nodei.co/npm/rum-library.png)](https://nodei.co/npm/rum-library/)
## Table of contents

 - [TODO LIST](#todo-list)
 - [An introduction to RUM](#an-introduction-to-rum)
 - [Getting Started](#getting-started)
	 - [Installation](#installation)
	 - [Including RUM classes in your project](#importing-objects)
 - [Using RUM Monitoring Classes](#using-rum-classes)
	 - [Starting Passive Monitoring](#starting-passive-monitoring)
	 - [Using Active Monitoring](#using-active-monitoring)
		 - [Single shot profiling](#single-shot-profiling)
		 - [Multi shot profiling](#multi-shot-profiling)
 - [Using Routing functionality](#using-routing-functionality)
 	- [Manual report delivery](#manual-report-delivery)
    - [Configure server options](#configure-server-options)
 	- [Configure automatic delivery options](#configure-automatic-delivery-options)
 - [Version Changes](#version-changes)

## TODO LIST

- ~~Create a release minified version~~ &nbsp; &nbsp; **((done)**
- ~~Complete Router remote server post functionality~~ &nbsp; &nbsp;**(done)**
- ~~Improve Router configuration options~~ &nbsp; &nbsp; **(done)**
- Add IndexedDB Support &nbsp; &nbsp;**(Now Brewing!)**
- Add Error Reporting for passive Monitor
- Add JSDoc generated documentation
- Include example site using RUM library
- Allow to configure automatic report fields
- Auto send Multi Profile reports after a number certain number of measures or
after a specific time.


## **An introduction to RUM**
Real user monitoring (RUM) is a passive monitoring technology that records all user interaction with a website or client interacting with a server or cloud-based application.

Rum is a JavaScript library that provides a set of tools for monitoring performance and user activity in modern browsers through JavaScript [Performance Interface](https://developer.mozilla.org/en-US/docs/Web/API/Performance), it also allows to collect and send information to a remote server using a background process that can be configured to deliver the captured metrics on
specific time intervals or manually.

<br>
<br>

> <img src="https://raw.githubusercontent.com/hammerlyrodrigo/rum/master/static/flask.png"/> &nbsp;&nbsp;**NOTICE: RUM IS UNDER BREWING!** this library is still **work in progress**, ~~the report routing feature to external server is still under development, thus it will not be possible to post the metrics to an external server on current version~~ **(now working)**. Although this library is in an early stage of development it will also allow to save the metrics information between session using [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) storage to provide a more comprehensive and powerful way of keeping information even after unexpected application crashes or failures.*

<br>

## **Getting Started**


### **Installation**

```shell
	npm install rum-library
```

### **Including RUM classes in your project**

There are only tree objects that will be required to access in order to get to all RUM features, these three
objects expose a subset of static methods to perform all the available functions

 - **Monitor** : this object provides a set of functionality for passive monitoring, usually you will init it at the start of the application life cycle in order to start tracking page and resource loading operations and creating reports for you.
 - **Profiler** : this object provides a set of tools to measure performance by creating one or more benchmarks  that will require to be manually started and completed. Profiler allows to create a single profile report or a digest of a set of individual runs with statistical information about the maximum, minimum and mean execution times for the whole set.
 - **Router** : this object allows to manually perform the metrics post operations to remote server and setup the configuration related to statics caching mechanism and automatic report dispatching.

#### ***Importing objects***
```javascript
   import {Monitor, Profiler} from 'rum';

	Monitor.init();
```
#### ***Using require style***
```javascript
   var {Monitor, Profiler} = require('rum');

	Monitor.init();
```

#### ***Using old approach***

You can include a link to rum.js on your index and initialize the library after that to start the passive monitoring features. Get sure to include the script at the very beginning of your page.

```html
<head>
    <script src="<path-to-rum>/rum.js" type="text/javascript"></script>
    <script type="text/javascript">
        window.onload = function() {
            Rum.Monitor.init();
        }
    </script>
</head>
```

For specific profiling you will need to call Rum.Profiler methods from your scripts.

# **Using RUM Classes**
<br>

## **Starting Passive Monitoring**
RUM **Monitor** allows to watch over several page loading and resource monitoring events without needing to worry about event handling or posting the results to the remote server. Get sure to run `init()` method at the beginning of your application execution in order to start monitoring.

```javascript
	Monitor.init();
```

#### Auto Generated Reports
Pasive Monitor will generate the following reports

- User Agent Report
- Page Load Timing Report
- Resources Load Timing Digest Report
- User Activity Report


#### *Sample server report output*
```json
{  
	"name":"page-timing",
	"data":{  
	    "source":{  
	        "title":"Tester",
	        "origin":"http://localhost:7000",
	        "protocol":"http:",
	        "pathname":"/"
	    },
	    "timing":{  
	        "connect":0,
	        "domainLookup":0,
	        "domContentLoadedEvent":49,
	        "loadEvent":81,
	        "redirect":0,
	        "response":1,
	        "unloadEvent":0
	    }
	}
}
```


---


## **Using Active Monitoring**

### Single shot profiling
In order to measure the performance of a specific execution path you will require to start a profiling session using the **Profiler**. A profiling report starts by calling `Profiler.start(<identifier>)` method, making sure that the identifier is unique for the current profiling session. After the operation being measured finishes you will need to call manually `Profiler.stop(<identifier>)`. Once a profiling operation is stopped it will be routed through the report queue for further delivery to remote server.

```javascript
var someLongRunningFunction = function() {
    Profiler.start('my-function-profile');
    //
    // a long code execution................
    //
    Profiler.stop('my-function-profile');
}
```
<br>
### Multi shot profiling
In certain situations it will be required to have more than a single execution profile report in order to get a better statistic results, you can use


```javascript
Profiler.createMulti('test');
    var someLongRunningFunction = function() {
    Profiler.startMeasure('test');
    //
    // a long code execution with variable execution time
    //
    Profiler.stopMeasure('test');
}

for(let i=0; i < 100; i++) {
	someLongRunningFunction();
}

Profiler.complteMulti('test');
```

#### *Sample server report output*
```json
{
    "name":"testDigest",
    "data":{
        "name":"testDigest",
        "entries":100,
        "median":13901.39349999663,
        "max":11733.0779999902,
        "min":16069.709000003058
    }
}
```


### **Using Routing functionality**
Rum **Router** class provides a single access point for sending report content to the server by using a dedicated web worker dispatcher, it also provides a set of configuration options used by automatic routing feature.

#### Manual report delivery
In order to manually send to remote server the pending queue of reports call `Router.flush()` method.

#### Configure Server options
It is requiered to set the following Router properties in order to customize the
remote server address and request method

```javascript
Router.serverURL = 'http://myserver.com';  //set server URL and port if required

Router.requestMethod = 'GET';  // default value is POST
```

#### Configure automatic delivery options
It is possible to change the default report delivery  flush interval using the `Router.flushInterval` property. It is also possible to disable the automatic flush by setting flush interval value to false.

```javascript
Router.flushInterval = 60000;  //set flush interval to 1 minute

Router.flushInterval = false;  //disable auto report delivery;

Router.flush(); //force cached reports to be delivery
                // to remote server immediately;
```



## Version changes

#### 0.0.4
    + Bug fixes
        - Fixed dispatcher configuration bug that prevented Router
          configuration  to work.
        - Fixed several JSLint code style issues

    + Documentation update

#### 0.0.3  
    + New Features
        - Remote server report delivery functionality included
        - New Router Configuration options

    + Several code enhancements on dispatcher behavior
