# Object Class Recognizer

> Object Recognizer using OpenText IDOL MediaServer API

1. Go to the Shinobi directory. **/home/Shinobi** is the default directory.

```
cd /home/Shinobi/plugins/idol_mediaserver
```

2. Install

```
sh INSTALL.sh
```

3. Start the plugin.

```
pm2 start shinobi-idolmediaserver.js
```

4. Save to startup list. **OPTIONAL**

```
pm2 save
```

Doing this will reveal options in the monitor configuration. Shinobi does not need to be restarted when a plugin is initiated or stopped.

## Run the plugin as a Host
> The main app (Shinobi) will be the client and the plugin will be the host. The purpose of allowing this method is so that you can use one plugin for multiple Shinobi instances. Allowing you to easily manage connections without starting multiple processes.

Edit your plugins configuration file. Set the `hostPort` **to be different** than the `listening port for camera.js`.

```
nano conf.json
```

Here is a sample of a Host configuration for the plugin.
 - `mediaServerHost` Idol MediaServer ip or hostname, ex: `192.168.2.30`.
 - `mediaServerPort` Idol MediaServer port, Default is `14000`.
 - `mediaServerCnfg` Idol MediaServer configuration filename, Default is `surveillance`.
 - `plug` is the name of the plugin corresponding in the main configuration file.
 - `https` choose if you want to use SSL or not. Default is `false`.
 - `hostPort` can be any available port number. **Don't make this the same port number as Shinobi.** Default is `8082`.
 - `type` tells the main application (Shinobi) what kind of plugin it is. In this case it is a detector.

```
{
    "plug": "IdolMediaServer",
    "hostPort": 8082,
    "mediaServerHost": "192.168.2.30",
    "mediaServerPort": 14000,
    "mediaServerCnfg": "surveillance",
    "key": "1234567890",
    "mode": "client",
    "type": "detector"
}
```

Now modify the **main configuration file** located in the main directory of Shinobi.

```
nano conf.json
```

Add the `plugins` array if you don't already have it. Add the following *object inside the array*.

```
  "plugins":[
      {
          "id" : "IdolMediaServer",
          "https" : false,
          "host" : "localhost",
          "port" : 8082,
          "key" : "1234567890",
          "mode" : "host",
          "type" : "detector"
      }
  ],
```

Sample Media Server configuration file:

```
    [Session]
    Engine=Source, PersonDetect, ResponseOutput

    [Source]
    Type=image
    
    [PersonDetect]
    Type = objectclassrecognition
    SurveillanceRecognizer = Gen4_Surveillance
    DetectionThreshold = 80

    [ResponseOutput]
    Type = Response
    Input = PersonDetect.Result
```