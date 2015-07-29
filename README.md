
# ![rum](https://raw.githubusercontent.com/hammerlyrodrigo/rum/master/static/moonshine.png) **RUM**
### Yet another **Real User Monitoring Library**
----------
> ![flask](https://raw.githubusercontent.com/hammerlyrodrigo/rum/master/static/flask.png) **RUM STILL UNDER DESTILLATION NOTICE:** this library is still **work in progress**, the report routing feature to external server is still under development, thus it
> will not be possible to post the metrics to an external server on
> current version.
<br>

## Table of contents
-------------------------

 - **An introduction to RUM**
 -  **Getting Started**
	 - ***Installation***
	 - ***Including RUM classes in your project***
 - **Using RUM Monitoring Classes**
	 - ***Starting Passive Monitoring***
	 - ***Using Active Monitoring***
		 - *Single shot profiling*
		 - *Multi shot profiling*


<br>

Real user monitoring (RUM) is a passive monitoring technology that records all user interaction with a website or client interacting with a server or cloud-based application.

Rum is a Javascript library that provides a set of tools for monitoring performance and user activity in modern browsers through JavaScript [Performance Interface](https://developer.mozilla.org/en-US/docs/Web/API/Performance), it also allows to collect and send information to a remote server using a background process that can be configured to deliver the captured metrics on specific time intervals or manually. 

<br>

> *Although this library is in an early stage of development it will also allow to save the metrics information between session using [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) storage to provide a more comprehensive and powerful way of keeping information even after unexpected application crashes or failures.*

----------
## **Getting Started**


### **Installation**

    npm install https://github.com/hammerlyrodrigo/rum


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

You can include a link to rum.js on your index and initialize the library after that to start the pasive monitoring features. Get sure to include the script at the very beginning of your page.

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

## **Using RUM Classes**

### **Starting Passive Monitoring**
RUM **Monitor** allows to watch over several page loading and resource monitoring events without needing to worry about event handling or posting the results to the remote server. Get sure to run `init()` method at the beginning of your application execution in order to start monitoring. 

```javascript
	Monitor.init(); 
```		

####*Sample server report output*
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


----------


### **Using Active Monitoring**		    

#### Single shot profiling
In order to measure the performance of a specific execution path you will require to start a profiling session using the **Profiler**. A profiling report starts by calling `Profiler.start(<identifier>)` method, making sure that the identifier is unique for the current profiling session. After the operation being measured finishes you will need to call manually `Profiler.stop(<identifier>)`. Once a profiling operation is stopped it will be routed through the report queue for further delivery to remote server. 

```javascript
        var somelongFunction = function() {
		    Profiler.start('my-function-profile');
		    //
		    // a long code execution................
		    //
		    Profiler.stop('my-function-profile');
	    }	
```		
<br>
#### Multi shot profiling
In certain situations it will be required to have more than a single execution profile report in order to get a better statistic results, you can use








