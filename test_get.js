console.log('############################################')
console.log('Test Object Detector on IDOL MediaServer API')

// Base Init >>
var fs = require('fs');
const config = require('./conf.json')
const fetch = require('node-fetch');
// Base Init />>

const mediaServerHost = config.mediaServerHost || 'localhost'
const mediaServerPort = config.mediaServerPort || 14000
const mediaServerCnfg = config.mediaServerCnfg || 'surveillance'

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
const baseUrl = `http://${mediaServerHost}:${mediaServerPort}`
const testImage1 = `/idol/mediaserver/configurations/sample.jpg`

function mediaServerProcessUrl(fileUrl){
    console.time("GET time");
    try{
        console.log('WARNING: Source file must exists on media server machine')
        console.log("SOURCE: ", fileUrl)
        let url = `${baseUrl}/a=Process&ConfigName=${mediaServerCnfg}&Source=${fileUrl}&ResponseFormat=simplejson&Synchronous=True&Persist=False&Timeout=5s`
        console.log("QUERY: ", url)
        fetch(url, { method: 'GET'}).then(res => res.json())
        .then((json) => {
            try{
                if (json.autnresponse.response == 'ERROR'){
                    console.error("ERROR:", json.autnresponse.responsedata.error)
                }else{
                    const output = json.autnresponse.responsedata.output
                    const records = output.record.map(r => r.ObjectClassRecognitionResult)
                    console.log("RECORDS: ", records)
                    const mats = records.map(v => ({
                        x: parseInt(v.region.left),
                        y: parseInt(v.region.top),
                        width: parseInt(v.region.width),
                        height: parseInt(v.region.height),
                        tag: v.classification.identifier,
                        confidence: parseFloat(v.classification.confidence),
                      }));
                    console.log("MATS: ", mats)
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
            console.timeEnd("GET time");
        });
    }catch(err){
        console.log(err)
    }
}

const allTests = async () => {
    await mediaServerProcessUrl(testImage1)
}
allTests()
