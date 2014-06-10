#Raft

	__________    _____  ______________________
	\______   \  /  _  \ \_   _____/\__    ___/
	 |       _/ /  /_\  \ |    __)    |    |   
	 |    |   \/    |    \|     \     |    |   
	 |____|_  /\____|__  /\___  /     |____|   
	        \/         \/     \/               
	


The idea behind raft is to give the node community a fully-featured application hosting platform. 
Raft gives you a provision of CPU, memory, disk space and bandwidth. From this the sky's the limit in what can be build. 
Sites and services ranging from the weekend projects to large scale production sites are able to take advantage of raft. 

Now with that been said.
The project has been through a few iterations. Each version is a exploration on how to build the best system for the task.
Everything has come together for the starting of version 4. This version will incorporate all the good parts from previous release.
Version 4 is the first version to fulling embrace a distributed message system. NAAAATS.
nats is used for sending messages between different processes. 

Thank you nats and thanks vcap for the turning point in my thinkings of how to build the project.

## Setup
A few things are need to get core modules running.

To give you an idea of how the system work take a look at this image
<a href="http://imgur.com/RfPq4ph"><img src="http://i.imgur.com/RfPq4ph.png" title="Hosted by imgur.com"/></a>


NOTE: I have tested the install on Fedora 18/19 and Ubuntu 13x running node v0.8.19 and npm v1.2.10

Create a folder in your home folder called raft

```
$ mkdir ~/raft
```
This will be the folder you keep all your stuff in.


Inside this folder you will want to create your config.json file.
This file will be used by most module to set up their config. 

Take note that the dea does not look into the runtimes.
At the moment the dea supports node but it won't be hard switch the node executable to any other executable. 
I like the ideas of formen as where you can have a set of scripts for different job that the application might have.
Corn jobs, websockets?, general worker processes of the main application.

The limits of each spawn are not enforced but does warn that the limits have been breached. 
The single is there that the spawn hit its limit but the code to react to the single is not.




```
$ nano ~/raft/config.json
```

Paste this file and edit as needed


```json
{
	"router": {
		"http": {
			"port": 8000/*this might want to be port 80*/
		}
	},
	"nats": {
		"user": "3005",
		"pass": "3005",
		"url": "nats://localhost:4222/"
	},
	"logs": {
		"log": {
			"port": 3000,//Connect to this port to push logs to the log server
			"host": "localhost"
		},
		"view": {
			"port": 3001,//Connect to this port to view the logs live from all process
			"host": "localhost"
		}
	},
	"dea": {
		"base_dir": "/home/my-username-plz/raft",
		"local_route": "127.0.0.1",
		"filer_port": 12345,
		"intervals": {
			"heartbeat": 10,
			"advertise": 5
		},
		"logging": {
			"level": "debug"
		},
		"multi_tenant": true,
		"max_memory": 4096,
		"secure": false,
		"enforce_ulimit": false,
		"prod": false,
		"force_http_sharing": true,
		"runtimes": {
			"node08": {
				"executable": "node",
				"version": "0.8.2",
				"version_flag": "-v",
				"environment": {
					"debug_env": {
						"run": {
							"NODE_ARGS": "--debug=$VCAP_DEBUG_PORT",
							"suspend": {
								"NODE_ARGS": "--debug-brk=$VCAP_DEBUG_PORT"
							}
						}
					}
				}
			}
		}
	}
}
```





###Step 1. 
  Install nats through ruby gem
```
$ gem install nats
```
###Step 2. 
  Start the nats server
```
$ nats-server --port 4222 --user nats_name --pass nats_pass
```
###Step 3. 
  Install the log server
```
$ sudo npm install raft-logger@0.0.4 -g
```
###Step 3. 
  Run the log server
```
$ cd /my/log/folder
$ log-server
```
###Step 3. 
  At this point you want to open the log client
```
$ log-cli localhost 3001
```
###Step 3. 
  Install the Dea
```
$ sudo npm install dea@0.0.1 -g
```
###Step 3. 
  Run the dea
```
$ dea /path/to/config/file.json
```
###Step 4. 
  Install the router
```
$ sudo npm install route-machine@0.0.2 -g
```
###Step 5. 
  Run the router. to listen on port 80 run with sudo
```
$ sudo routem /path/to/config/file.json
```


If everything install and ran correctly you should have a running nodejs application hosting system. Now running system vs usable system are two things at todays date (July/27/2013) some parts are still missing. Note that the Stager and API/Client have no code yet.



## Core

| Feature  | Status | Comment |
| ------------- | ------------- | ------------- |
| [NATS](https://github.com/MangoRaft/Nats)   | complete    | Using Ruby gem nats thanks!    |
| [Router](https://github.com/MangoRaft/Router)    | broken    | This is an older version of the rotuer. Uses bouncy.    |
| [route-machine](https://github.com/MangoRaft/route-machine)    | working    | This is some what like the router from vcap. Uses http-proxy.    |
| [Spawn](https://github.com/MangoRaft/Spawn)    | working    | Working copy of the `spawn@0.0.2`. Most feature are in place    |
| [Logger](https://github.com/MangoRaft/Logger)    | working    | Full package logging in real-time with server, client and logger.    |
| [Stats](https://github.com/MangoRaft/Spawn-Stats)    | working    | Load and memory usage for each spawn.    |
| [SnapShot](https://github.com/MangoRaft/SnapShot)    | working    | Untar's a tar fine and installs all npm stuff.    |
| Stage    | incomplete    | Deploy server creating each package snapshot.    |
| API Server    | incomplete    | REST api server for managing user packages    |



##LICENSE
	Copyright (c) 2011-2013 MangoRaft.
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
