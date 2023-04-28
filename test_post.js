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
const baseUrl = `http://${mediaServerHost}:${mediaServerPort}`

const testImage1 = `/home/Shinobi/plugins/idol_mediaserver/sample.jpg`

function mediaServerProcessFile(filePath){
    try{
        console.log("SOURCE: ", filePath)
        let url = `${baseUrl}/a=Process`
        console.log("QUERY: ", url)
        const formData = new FormData();
        //formData.append('Config', mediaServerConfigData);
        formData.append('ConfigName', mediaServerCnfg);        
        formData.append('SourceData', fs.createReadStream(filePath), { filename: 'sample.jpg' });
        formData.append('ResponseFormat', 'simpleJson');
        formData.append('Synchronous', 'True');
        formData.append('Persist', 'False');
        formData.append('Timeout', '5s');
        fetch(url, {
            method: 'POST',
            body: formData
        }).then(res => res.json())
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
        });
    }catch(err){
        console.log(err)
    }
}

const allTests = async () => {
    await mediaServerProcessFile(testImage1)
}
allTests()
