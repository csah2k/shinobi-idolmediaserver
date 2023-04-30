console.log('############################################')
console.log('Test Object Detector on IDOL MediaServer API')

// Base Init >>
var fs = require('fs');
const config = require('./conf.json')
const fetch = require('node-fetch');
// Base Init />>

const mediaServerHost = config.mediaServerHost || 'localhost'
const mediaServerPort = config.mediaServerPort || 14000

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

const baseUrl = `http://${mediaServerHost}:${mediaServerPort}/a=GetStatus&ResponseFormat=simpleJson`

function mediaServerProcessUrl(){
    console.time("GET time");
    try{
        console.log("QUERY: ", baseUrl)
        fetch(baseUrl, { method: 'GET'}).then(res => res.json())
        .then((json) => {
            try{
                if (json.autnresponse.response == 'ERROR'){
                    console.error("ERROR:", json.autnresponse.responsedata.error)
                }else{
                    console.log("RESPONSE: ", json.autnresponse)
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
    await mediaServerProcessUrl()
}
allTests()
