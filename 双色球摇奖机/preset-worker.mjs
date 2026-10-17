import { createPresetPools } from './presets.mjs';

self.onmessage = ({ data }) => {
  try {
    self.postMessage(createPresetPools(data.geometry, data.preset, data.reducedMotion, data.seed));
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
