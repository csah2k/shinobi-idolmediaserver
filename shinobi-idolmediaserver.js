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

const baseUrl = `http://${mediaServerHost}:${mediaServerPort}/a=Process`

function mediaServerProcess(d,frameBuffer){
	return new Promise((resolve,reject) => {
		try{
			frameBufferToPath(d,frameBuffer).then((filePath) => {
				const formData = new FormData();
				formData.append('ConfigName', mediaServerCnfg);        
				formData.append('SourceData', fs.createReadStream(filePath), { filename: `${d.id}_${new Date().getTime()}.jpg` });
				formData.append('ResponseFormat', 'simpleJson');
				formData.append('Synchronous', 'True');
				formData.append('Persist', 'False');
				formData.append('Timeout', '5s');
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
							resolve({
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
				});
			})
		}catch(err){
			console.log(err);
			resolve({
				matrices: [],
				imgHeight: 0,
				imgWidth: 0
			})
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
	mediaServerProcess(d,frameBuffer).then((result) => { 
		if(result.matrices.length > 0) {
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
					matrices: result.matrices,
					imgHeight: result.imgHeight > 0 ? result.imgHeight : height,
					imgWidth: result.imgWidth > 0 ? result.imgWidth : width,
					time: new Date() - startTime
				},
				frame: frameBuffer
			})
		}
		callback()
	})
}
