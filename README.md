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
$ sudo npm install -g raft-logger-redis
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

Mark a time. Finish timer, record output.
```javascript
workerLog.time('my-timmer');
setTimeout(function() {
	workerLog.timeEnd('my-timmer');
}, 1000);
```

Print to stderr `Trace :`, followed by the formatted message and stack trace to the current position.
```javascript
workerLog.trace();
```

Uses `util.inspect` on obj and prints resulting string to log server. This function bypasses any custom `inspect()` function on `obj`. 
```javascript
workerLog.dir(obj);
```

The logging instance is designed to be used as a stream so you can pipe to it. This is useful for logging stdin, stdout and reading from a file.
```javascript
fs.createReadStream('./sample_traffic.log').pipe(workerLog);
```


Pipe the output of a program to the log server.
```
ps | logster-redis log
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

Subscribe for the ```data``` event
```javascript
view.on('data', function(data) {
	console.log(data);  
	//{ ts: 1423363927109,
	// channel: 'worker.1',
	// source: 'app',
	// msg: '...' }
});
```
Start listening for log data.
```javascript
view.start();
```

### CLI
We have a cli program that can be used to setup and use the logging service

#### Help
```
$ logster-redis -h

  Usage: logster-redis [options] [command]


  Commands:

    view [options]       View logs in teal-time.
    log [options]        Send logs to the server.
    register [options]   Register a log session with the server.
    server [options]     Run the log server.

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

```

#### Server
Starting the server is the first thing you want to do.
The servers are setup to scale. You can run it as a cluster or run each part on different servers.
```
$ logster-redis server -h

  Usage: server [options]

  run setup commands for all envs

  Options:

    -h, --help                   output usage information
    -a, --addr [HOST]            Bind to HOST address (default: 127.0.0.1)
    -p, --port [PORT]            Use PORT (default: 5000)
    -A, --redis-addr [HOST]      Connect to redis HOST address (default: 127.0.0.1)
    -P, --redis-port [PORT]      Connect to redis PORT (default: 6379)
    -o, --redis-auth [PASSWORD]  Use redis auth
    -w, --web                    Start Web-Server
    -u, --udp                    Start UDP-Server
    -c, --cluster                Start server as cluster

```
#####Example
```
$ logster-redis server -w -u -c
```
#### View
Using `-f` to wire the logs to file for persistan storage.
```
$ logster-redis view -h

  Usage: view [options]

  run setup commands for all envs

  Options:

    -h, --help               output usage information
    -a, --addr [HOST]        Bind to HOST address (default: 127.0.0.1)
    -p, --port [PORT]        Use PORT (default: 5000)
    -S, --source [SOURCE]    Source to use (database)
    -c, --channel [CHANNEL]  Channel to use (redis.1)
    -e, --session [SESSION]  Session to use (default: SESSION)
    -b, --backlog            Retrieve all logs from the server (default: false)
    -f, --file [FILE]        File to write to

````
#####Example
```
$ logster-redis view -b -e my-session-token -f /path/to/file.log
```

#### Log
```
$ logster-redis log -h

  Usage: log [options]

  run setup commands for all envs

  Options:

    -h, --help                  output usage information
    -a, --addr [HOST]           Bind to HOST address (default: 127.0.0.1)
    -p, --port [PORT]           Use PORT (default: 5000)
    -S, --source [SOURCE]       Source to use (default: stdin)
    -c, --channel [CHANNEL]     Channel to use (default: process.1)
    -e, --session [SESSION]     session to use (default: SESSION)
    -b, --bufferSize [SIZE]     bufferSize to use (default: 100)
    -f, --flushInterval [SIZE]  Interval to flush the buffer (default: 5000ms)
```
#####Example
```
$ ps | logster-redis log -e my-session-token
```
```
$ cat /path/to/file.log | logster-redis log -e my-session-token -s my-custom-source -c dev-server.1
```
```
$ tail /path/to/file.log | logster-redis log -e my-session-token -s my-custom-source -c dev-server.1
```

#### Register
If you want to register a session token but dont want to use it yet.
```
$ logster-redis register -h

  Usage: register [options]

  run setup commands for all envs

  Options:

    -h, --help               output usage information
    -a, --addr [HOST]        Bind to HOST address (default: 127.0.0.1)
    -p, --port [PORT]        Use PORT (default: 5000)
    -e, --session [SESSION]  session to use (default: SESSION)
```
#####Example
```
$ logster-redis register -e my-custom-session
```
