Welcome to logster!	{#welcome}
=====================

Logster is a distributed logging system. have you ever wanted to collect logs  from multiple sources and view them in one place? Well Logster is the answer.

----------
> **NOTE:**
> 
> - Logster is still in alpha state
> - Logster is not scalable (Will be soon thanks to redis)


Install
---------
To install Logster you can use `npm` or `git clone`
#### <i class="icon-file"></i> NPM
```
$ sudo npm install -g raft-logger
```

#### <i class="icon-file"></i> GIT
```
$ git clone https://github.com/MangoRaft/Logger.git
$ cd Logger
$ sudo npm install -g
```

Architecture
---------
Logsters architecture is similar to **logplex** from **heroku**. The difference logster uses UDP to receive the messages. There are 4 parts to logster, the Logger, UDP-Server, Web-server and the viewer.

The **logger** send message over UDP to the **UDP-Server**. The UDP-server send the log messages to the **Web-server**. From the Web-server `drains` can receive logs over HTTP.

Usage
---------
You can use logster through the command line or include it in your program.
#### In your program
To use logster in your program just `require` it. Most of the time you will only use the `Logger` or the `Viewer`
```javascript
var logster = require('raft-logger');
```
### Logger
To use the logger you need to create a logger
You need to pass in the web and udp port and host
#### Options
- **web.host** Required. Host for the web server.
- **web.port** Required. Port for the web server.
- **udp.host** Required. Host for the udp server.
- **udp.port** Required. Port for the udp server.
```javascript
var logger = logster.Logger.createLogger({
	web : {
		host : '127.0.0.1',
		port : 5000
	},
	udp : {
		host : '127.0.0.1',
		port : 5000
	}
});
```
Once you have a logging instance you can create the per process logger.
#### Options
- **source** Used to group logs.
- **channel** Used to to identify logs to a specific task.
- **session** Optional. Used for a pre-defined log session.
- **bufferSize** Optional. Defaults to 100 line. Used to buffer log line before sending in bulk. Set to `0` for real-time logging
- **flushInterval** Optional. Defaults to 5000ms. Time intival to send logs in bulk

```javascript
var workerLog = logger.create({
	source : 'app',
	channel : 'worker.1',
	session : 'my-session-id', //Optional 
	bufferSize : 1, //Optional defaults to 100
	flushInterval : 10000 //Optional defaults to 5000ms
});
```
To start the `flushInterval` you must call `start()` 
```javascript
workerLog.start();
```
To stop the `flushInterval` you must call `stop()` 
```javascript
workerLog.stop();
```
To log a line just call `log()`
```javascript
workerLog.log("my great text I need logged");
```
The logging instance is designed to be used as a stream so you can pipe to it. This is useful for logging stdin, stdout and reading from a file.
```javascript
fs.createReadStream('./sample_traffic.log').pipe(workerLog);
```
### View
The viewer is used to retrive logs from the server.
Create a view call `View.createView({options})`
#### Options
- **host** Required. Host of the web server.
- **port** Required. Port of the web server.
- **session** Optional. Used for a pre-defined log session.
- **backlog** Optional. Defaults to false. Used pull all the logs from the server. If false only new logs will be pulled.
```javascript
var view = logging.View.createView({
	host : 'localhost',
	port : 3000,
	session : 'my-session-id', //Optional 
	backlog : true  //Optional defaults to false
});
```
