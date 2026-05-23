/**
 * SaveManager.js
 * 
 * Serialización / deserialización del mundo.
 * En Unity: JsonUtility o Newtonsoft.Json para guardar en Application.persistentDataPath.
 */

import { WorldData } from '../core/WorldData.js';

export class SaveManager {
  constructor(storageKey = 'bonepile.save.v1') {
    this.key = storageKey;
  }

  save(worldData) {
    const json = worldData.toJSON();
    try {
      localStorage.setItem(this.key, json);
      return true;
    } catch (e) {
      console.error('Save failed', e);
      return false;
    }
  }

  load() {
    try {
      const json = localStorage.getItem(this.key);
      if (!json) return null;
      return WorldData.fromJSON(json);
    } catch (e) {
      console.error('Load failed', e);
      return null;
    }
  }

  exportToFile(worldData, filename = 'bonepile-world.json') {
    const blob = new Blob([worldData.toJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importFromFile(file) {
    const text = await file.text();
    return WorldData.fromJSON(text);
  }
}
