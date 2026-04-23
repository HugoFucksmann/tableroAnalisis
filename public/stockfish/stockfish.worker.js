self.onmessage = function (e) {
  if (e.data.cmd === "load") {
    // Stockfish worker boilerplate
    Module = {
      wasmModule: e.data.wasmModule,
      wasmMemory: e.data.wasmMemory,
      buffer: e.data.wasmMemory.buffer,
      ENVIRONMENT_IS_PTHREAD: true
    };
    if (e.data.workerID) Module['workerID'] = e.data.workerID;
    
    // Import the main engine script
    importScripts(e.data.urlOrBlob);
  }
};
