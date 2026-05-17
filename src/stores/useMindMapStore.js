import { defineStore, acceptHMRUpdate } from 'pinia';

// Safe helper to read from localStorage during SSR or server-side pre-rendering
const getLocalStorageSavedMaps = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem('mindmap_saved_maps');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('[MindMap Store] Failed to load saved maps from localStorage:', e);
    }
  }
  return [];
};

// Safe helper to write to localStorage during SSR or server-side pre-rendering
const saveToLocalStorage = (maps) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('mindmap_saved_maps', JSON.stringify(maps));
    } catch (e) {
      console.error('[MindMap Store] Failed to save maps to localStorage:', e);
    }
  }
};

export const useMindMapStore = defineStore('mindMap', {
  state: () => ({
    // Load previously saved maps or initialize with an empty list
    savedMaps: getLocalStorageSavedMaps(),
    
    // Active mind map state currently loaded on the canvas
    currentMap: {
      id: null,
      title: 'Untitled Mind Map',
      nodes: [],
      edges: [],
    },
  }),

  getters: {
    /**
     * Returns saved maps sorted by their timestamp (most recently saved first)
     */
    sortedSavedMaps: (state) => {
      return [...state.savedMaps].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    },

    /**
     * Checks if the current map has been saved before (has an allocated ID)
     */
    isSavedMap: (state) => {
      return state.currentMap.id !== null;
    },
  },

  actions: {
    /**
     * Resets the active mind map to a new, empty map state
     * @param {string} [title] - Optional initial title
     */
    createNewMap(title = 'Untitled Mind Map') {
      this.currentMap = {
        id: null,
        title,
        nodes: [],
        edges: [],
      };
    },

    /**
     * Updates the current map's nodes, edges, or title
     * @param {Object} payload
     * @param {Array} [payload.nodes]
     * @param {Array} [payload.edges]
     * @param {string} [payload.title]
     */
    updateCurrentMap({ nodes, edges, title }) {
      if (nodes !== undefined) this.currentMap.nodes = nodes;
      if (edges !== undefined) this.currentMap.edges = edges;
      if (title !== undefined) this.currentMap.title = title;
    },

    /**
     * Saves the current active map into the savedMaps array.
     * Updates existing map if currentMap.id is present, or creates a new entry if null.
     * Automatically syncs with browser localStorage.
     * 
     * @param {string} [customTitle] - Optional new title to save with
     * @returns {string} - The ID of the saved mind map
     */
    saveCurrentMap(customTitle = null) {
      if (customTitle) {
        this.currentMap.title = customTitle;
      }

      const timestamp = Date.now();

      // If it's a new map, generate a unique ID
      if (!this.currentMap.id) {
        this.currentMap.id = `map_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
        
        const newMap = {
          id: this.currentMap.id,
          title: this.currentMap.title,
          nodes: JSON.parse(JSON.stringify(this.currentMap.nodes)), // Deep copy to avoid proxy mutations
          edges: JSON.parse(JSON.stringify(this.currentMap.edges)), // Deep copy to avoid proxy mutations
          timestamp,
        };

        this.savedMaps.push(newMap);
      } else {
        // Updating an existing map
        const index = this.savedMaps.findIndex((m) => m.id === this.currentMap.id);
        const updatedMap = {
          id: this.currentMap.id,
          title: this.currentMap.title,
          nodes: JSON.parse(JSON.stringify(this.currentMap.nodes)),
          edges: JSON.parse(JSON.stringify(this.currentMap.edges)),
          timestamp,
        };

        if (index !== -1) {
          this.savedMaps[index] = updatedMap;
        } else {
          this.savedMaps.push(updatedMap);
        }
      }

      // Sync array to browser localStorage
      saveToLocalStorage(this.savedMaps);

      return this.currentMap.id;
    },

    /**
     * Loads a saved mind map into the current active editor state by its ID.
     * Uses deep copying to isolate active edits from the saved revision.
     * 
     * @param {string} id - The unique ID of the map to load
     * @returns {boolean} - True if successfully found and loaded, false otherwise
     */
    loadMap(id) {
      const map = this.savedMaps.find((m) => m.id === id);
      if (!map) {
        console.warn(`[MindMap Store] Mind map with ID "${id}" not found.`);
        return false;
      }

      // Deep copy to prevent active canvas edits from mutating the saved item until save is clicked
      this.currentMap = JSON.parse(JSON.stringify(map));
      return true;
    },

    /**
     * Deletes a saved mind map from the store and localStorage.
     * If the deleted map is the one currently loaded, it resets the active state.
     * 
     * @param {string} id - The unique ID of the map to delete
     * @returns {boolean} - True if successfully deleted, false otherwise
     */
    deleteMap(id) {
      const index = this.savedMaps.findIndex((m) => m.id === id);
      if (index === -1) {
        console.warn(`[MindMap Store] Mind map with ID "${id}" to delete not found.`);
        return false;
      }

      // Remove from memory
      this.savedMaps.splice(index, 1);

      // Sync array to browser localStorage
      saveToLocalStorage(this.savedMaps);

      // Reset the current editor canvas if the loaded map was deleted
      if (this.currentMap.id === id) {
        this.createNewMap();
      }

      return true;
    },
  },
});

// Enable Pinia Hot Module Replacement (HMR) for optimal developer experience in Quasar
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMindMapStore, import.meta.hot));
}
