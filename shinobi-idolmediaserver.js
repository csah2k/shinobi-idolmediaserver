//
// Shinobi - Tensorflow Plugin
// Copyright (C) 2016-2025 Elad Bar, Moe Alam
//
// Base Init >>
const fs = require('fs');
const config = require('./conf.json')
const fetch = require('node-fetch');
const FormData = require('form-data');
var s
const {
		workerData
	} = require('worker_threads');

if(workerData && workerData.ok === true){
	try{
		s = require('../pluginWorkerBase.js')(__dirname,config)
	}catch(err){
		console.log(err)
		try{
			s = require('./pluginWorkerBase.js')(__dirname,config)
		}catch(err){
			console.log(err)
			return console.log(config.plug,'WORKER : Plugin start has failed. pluginBase.js was not found.')
		}
	}
}else{
	try{
		s = require('../pluginBase.js')(__dirname,config)
	}catch(err){
		console.log(err)
		try{
			s = require('./pluginBase.js')(__dirname,config)
		}catch(err){
			console.log(err)
			return console.log(config.plug,'Plugin start has failed. pluginBase.js was not found.')
		}
	}
	try{
		s = require('../pluginBase.js')(__dirname,config)
	}catch(err){
		console.log(err)
		try{
			const {
				haltMessage,
				checkStartTime,
				setStartTime,
			} = require('../pluginCheck.js')

			if(!checkStartTime()){
				console.log(haltMessage,new Date())
				s.disconnectWebSocket()
				return
			}
			setStartTime()
		}catch(err){
			console.log(`pluginCheck failed`)
		}
	}

}
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

function mediaServerProcess(d,frameBuffer){
	return new Promise((resolve,reject) => {
		try{
			frameBufferToPath(d,frameBuffer).then((filePath) => {
				let url = `${baseUrl}/a=Process`
				const formData = new FormData();
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
							resolve(records)
						}
					}catch(err){
						console.log(json)
						console.error(err)
					}
				})
				.catch((err) => {
					console.log(err);
				});
			})
		}catch(err){
			resolve([])
			console.log(err)
		}
	})
}

function frameBufferToPath(d,buffer){
	return new Promise((resolve,reject) => {
		const tmpFile = s.gid(5)+'.jpg'
		if(!fs.existsSync(s.dir.streams)){
			fs.mkdirSync(s.dir.streams);
		}
		frameDirectory = s.dir.streams+d.ke+'/'+d.id+'/'
		fs.writeFile(frameDirectory+tmpFile,buffer,function(err){
			if(err) return s.systemLog(err);
			try{
				resolve(frameDirectory+tmpFile)
			}catch(error){
				console.error('Catch: ' + error);
			}
		})
	})
}

s.detectObject = async function(frameBuffer,d,tx,frameLocation,callback){
	const startTime = new Date()
	const records = await mediaServerProcess(d,frameBuffer)
	if(records.length > 0) {
		const mats = records.map(v => ({
			x: parseInt(v.region.left),
			y: parseInt(v.region.top),
			width: parseInt(v.region.width),
			height: parseInt(v.region.height),
			tag: v.classification.identifier,
			confidence: parseFloat(v.classification.confidence),
		  }));
		const isObjectDetectionSeparate = d.mon.detector_pam === '1' && d.mon.detector_use_detect_object === '1'
		const width = parseFloat(isObjectDetectionSeparate  && d.mon.detector_scale_y_object ? d.mon.detector_scale_y_object : d.mon.detector_scale_y)
		const height = parseFloat(isObjectDetectionSeparate  && d.mon.detector_scale_x_object ? d.mon.detector_scale_x_object : d.mon.detector_scale_x)
		tx({
			f:'trigger',
			id:d.id,
			ke:d.ke,
			details:{
				plug: config.plug,
				name: `ObjectRecognizer`,
				reason: 'object',
				matrices: mats,
				imgHeight: height,
				imgWidth: width,
				time: new Date() - startTime
			},
			frame: frameBuffer
		})
	}
	callback()
}
