console.log('############################################')
console.log('Test Object Detector on IDOL MediaServer API')

// Base Init >>
var fs = require('fs');
const config = require('./conf.json')
const fetch = require('node-fetch');
const FormData = require('form-data');
// Base Init />>

const mediaServerHost = config.mediaServerHost || 'localhost'
const mediaServerPort = config.mediaServerPort || 14000
const mediaServerCnfg = config.mediaServerCnfg || 'surveillance'
const mediaServerConfigData = `
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
    `

if(!config.mediaServerHost){
	console.log('No Media Server Host configured.')
	console.log('set conf.json value for `mediaServerHost`')
	return process.exit()
}
if(!config.mediaServerPort){
	console.log('No Media Server Port configured.')
	console.log('set conf.json value for `mediaServerPort`')
	return process.exit()
}
if(!config.mediaServerCnfg){
	console.log('No Media Server Config configured.')
	console.log('set conf.json value for `mediaServerCnfg`')
	return process.exit()
}
const baseUrl = `http://${mediaServerHost}:${mediaServerPort}/a=Process`

const testImage1 = `/home/Shinobi/plugins/idol_mediaserver/sample.jpg`

function mediaServerProcessFile(filePath){
    console.time("POST time");
    try{
        console.log("SOURCE: ", filePath)
        console.log("QUERY: ", baseUrl)
        const formData = new FormData();
        //formData.append('Config', mediaServerConfigData);
        formData.append('ConfigName', mediaServerCnfg);        
        formData.append('SourceData', fs.createReadStream(filePath), { filename: `12345_${new Date().getTime()}.jpg` });
        formData.append('ResponseFormat', 'simpleJson');
        formData.append('Synchronous', 'True');
        formData.append('Persist', 'False');
        formData.append('Timeout', '10s');
        fetch(baseUrl, {
            method: 'POST',
            body: formData
        }).then(res => res.json())
        .then((json) => {
            try{
                if (json.autnresponse.response == 'ERROR'){
                    console.error("ERROR:", json.autnresponse.responsedata.error)
                }else{
                    const records = json.autnresponse.responsedata.output.record
                    var width = 0, height = 0 
                    try{
                        const stream = records.filter(r => r.ProxyData != undefined)[0].ProxyData.streams.videoStream
                        width = parseFloat(stream['@width']) 
                        height = parseFloat(stream['@height']) 
                    }catch(err){
                        console.error("Missing a 'Source.Proxy' track to the response output:", err)
                    }
                    const matrices = records.filter(r => r.ObjectClassRecognitionResult != undefined).map(r => r.ObjectClassRecognitionResult).map(v => ({
                        x: parseFloat(v.region.left),
                        y: parseFloat(v.region.top),
                        width: parseFloat(v.region.width),
                        height: parseFloat(v.region.height),
                        tag: v.classification.identifier,
                        confidence: parseFloat(v.classification.confidence),
                        }))
                    console.log("RESULT:", {
                        matrices: matrices,
                        imgHeight: height,
                        imgWidth: width
                    })
                }
            }catch(err){
                console.log(json)
                console.error(err)
            }
        })
        .catch((err) => {
            console.log(err);
        })
        .finally(() => {
            console.timeEnd("POST time");
        });
    }catch(err){
        console.log(err)
    }
}

const allTests = async () => {
    await mediaServerProcessFile(testImage1)
}
allTests()
