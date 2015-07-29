
# RUM
> **Yet another Real User Monitoring Library**

Real user monitoring (RUM) is a passive monitoring technology that records all user interaction with a website or client interacting with a server or cloud-based application.

Rum is a Javascript library that provides a set of tools for monitoring performance and user activity in modern browsers through JavaScript [Performance Interface](https://developer.mozilla.org/en-US/docs/Web/API/Performance), it also allows to collect and send information to a remote server using a background process that can be configured to deliver the captured metrics on specific time intervals or manually.

> Although this library is in an early stage of development it will also allow to save the metrics information between session using [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) storage to provide a more comprehensive and powerful way of keeping information even after unexpected application crashes or failures.

## Getting Started
### Installation

    npm install https://github.com/hammerlyrodrigo/rum

###Including RUM in your project

#### Importing the Library
```javascript
   import {Monitor, Profiler} from 'rum';

	Monitor.init();
```
#### Including the library inside your HTML  page

You can include a link to rum.js on your index and initialize the library after that to start the pasive monitoring features.

```html
    <head>
	    <script src="<path>/rum.js" type="text/javascript"></script>
    </head>
    <body>
	    <script type="text/javascript">
		    Rum.Monitor.init();
		 </script>
    </body>
```

For specific profiling you will need to call Rum.Profiler methods from your scripts.

```javascript
        var somelongFunction = function() {
		    Rum.Profiler.start('my-function-profiling');
		    //
		    // a long code execution................
		    //
		    Rum.Profiler.stop('my-function-profiling');
	    }
```
