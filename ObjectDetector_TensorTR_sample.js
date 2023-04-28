const fs = require('fs');
const tensorrt = require('tensorrt');

module.exports = function(config) {
  const engine = new tensorrt.ICudaEngine(fs.readFileSync(config.enginePath));
  const context = engine.createExecutionContext();

  function getTensor3dObject(numOfChannels, imageArray) {
    const tensor3d = tensorrt.createInferTensor(engine, imageArray, numOfChannels);
    return tensor3d;
  }

  return class ObjectDetectors {
    constructor(image, type) {
      this.startTime = new Date();
      this.inputImage = image;
      this.type = type;
    }

    async process() {
      const tensor3D = getTensor3dObject(3, this.inputImage);
      const output = tensorrt.createInferTensor(engine);
      context.execute(tensor3D, output);

      const predictions = output.data;
      tensor3D.destroy();
      output.destroy();

      return {
        data: predictions,
        type: this.type,
        time: new Date() - this.startTime,
      };
    }
  };
};