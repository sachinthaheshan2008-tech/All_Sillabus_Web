<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import katex from 'katex';

// Import custom utilities and state
import CustomMindMapNode from '../components/CustomMindMapNode.vue';
import { useLayout } from '../composables/useLayout';
import { useMindMapStore } from '../stores/useMindMapStore';

// Initialize Quasar and Vue Flow utilities
const $q = useQuasar();
const store = useMindMapStore();
const { layout } = useLayout();
const { fitView, zoomIn, zoomOut } = useVueFlow();

// Register the custom mind map node
const nodeTypes = {
  customMindmap: CustomMindMapNode,
};

// UI Reactive State
const drawerOpen = ref(true);
const showNodeDialog = ref(false);
const showTitleDialog = ref(false);

// Dialog Form Fields
const activeDialogAction = ref('add'); // 'add' or 'edit'
const nodeLabelInput = ref('');
const activeEditingNodeId = ref(null);
const parentNodeIdForAdd = ref(null);
const mapTitleInput = ref('');

// Dynamic Live KaTeX rendering parser inside the editing dialog
const dialogParsedHtml = computed(() => {
  const label = nodeLabelInput.value || '';
  const parts = label.split(/(\$\$[\s\S]*?\$\$|\$.*?\$)/g);
  
  return parts.map(part => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const formula = part.slice(2, -2);
      try {
        return katex.renderToString(formula, { displayMode: true, throwOnError: false });
      } catch {
        return `<span class="text-negative font-mono">${part}</span>`;
      }
    } else if (part.startsWith('$') && part.endsWith('$')) {
      const formula = part.slice(1, -1);
      try {
        return katex.renderToString(formula, { displayMode: false, throwOnError: false });
      } catch {
        return `<span class="text-negative font-mono">${part}</span>`;
      }
    } else {
      // Escape HTML entities to prevent XSS
      return part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }).join('');
});

/**
 * Initializes a new blank mind map with a default Level 0 root node.
 */
const initializeEmptyMap = () => {
  store.createNewMap();
  const rootId = `root_${Date.now()}`;
  
  const rootNode = {
    id: rootId,
    type: 'customMindmap',
    label: 'Central Theme $E = mc^2$',
    position: { x: 250, y: 150 },
    data: {
      level: 0,
      label: 'Central Theme $E = mc^2$',
      onAddChild: initiateAddChild,
      onDeleteNode: initiateDeleteNode,
      onEditNode: initiateEditNode,
    },
  };

  store.updateCurrentMap({
    nodes: [rootNode],
    edges: [],
    title: 'New Physics Map',
  });

  // Calculate layout and center view
  nextTick(() => {
    recalculateLayout();
    resetView();
  });
};

/**
 * Recalculates node positions using the Dagre layout composable.
 */
const recalculateLayout = () => {
  store.currentMap.nodes = layout(store.currentMap.nodes, store.currentMap.edges);
};

/**
 * Centers and smooth-fits the viewport around all existing nodes.
 */
const resetView = () => {
  nextTick(() => {
    fitView({ padding: 0.2, duration: 800 });
  });
};

/**
 * Triggers the custom Add Child dialog for a specific parent node.
 */
const initiateAddChild = (parentId) => {
  parentNodeIdForAdd.value = parentId;
  activeDialogAction.value = 'add';
  nodeLabelInput.value = 'New Subtopic $x^2$';
  showNodeDialog.value = true;
};

/**
 * Triggers editing of a node when double-clicked.
 */
const onNodeDoubleClick = ({ node }) => {
  activeEditingNodeId.value = node.id;
  activeDialogAction.value = 'edit';
  nodeLabelInput.value = node.data?.label || node.label || '';
  showNodeDialog.value = true;
};

/**
 * Triggers editing of a node when edit button is clicked.
 */
const initiateEditNode = (nodeId) => {
  const node = store.currentMap.nodes.find(n => n.id === nodeId);
  if (!node) return;
  activeEditingNodeId.value = nodeId;
  activeDialogAction.value = 'edit';
  nodeLabelInput.value = node.data?.label || node.label || '';
  showNodeDialog.value = true;
};

/**
 * Confirms and processes recursive branch/subtree deletion.
 */
const initiateDeleteNode = (nodeId) => {
  const nodeToDelete = store.currentMap.nodes.find(n => n.id === nodeId);
  if (!nodeToDelete) return;

  // Warning when deleting the primary root node
  if (nodeToDelete.data?.level === 0) {
    $q.dialog({
      title: 'Reset Canvas?',
      message: 'Deleting the root node will clear your entire mind map workspace. Would you like to clear the canvas?',
      cancel: true,
      persistent: true,
      ok: {
        color: 'negative',
        label: 'Clear Workspace',
      },
    }).onOk(() => {
      initializeEmptyMap();
    });
    return;
  }

  // Recursive search to delete children down the branch
  const getChildrenIds = (id) => {
    const childEdges = store.currentMap.edges.filter(e => e.source === id);
    let childIds = childEdges.map(e => e.target);
    for (const childId of childIds) {
      childIds = [...childIds, ...getChildrenIds(childId)];
    }
    return childIds;
  };

  const toDelete = [nodeId, ...getChildrenIds(nodeId)];

  store.currentMap.nodes = store.currentMap.nodes.filter(n => !toDelete.includes(n.id));
  store.currentMap.edges = store.currentMap.edges.filter(e => !toDelete.includes(e.source) && !toDelete.includes(e.target));

  // Recalculate layout layout automatically
  nextTick(() => {
    recalculateLayout();
  });
};

/**
 * Processes node creation or editing submitted from the dialog.
 */
const handleSaveNode = () => {
  if (activeDialogAction.value === 'add') {
    const parentId = parentNodeIdForAdd.value;
    const parentNode = store.currentMap.nodes.find(n => n.id === parentId);
    const newLevel = (parentNode?.data?.level ?? 0) + 1;
    const newId = `node_${Date.now()}`;

    const newNode = {
      id: newId,
      type: 'customMindmap',
      label: nodeLabelInput.value,
      position: { x: 0, y: 0 },
      data: {
        level: newLevel,
        label: nodeLabelInput.value,
        onAddChild: initiateAddChild,
        onDeleteNode: initiateDeleteNode,
        onEditNode: initiateEditNode,
      },
    };

    const newEdge = {
      id: `edge_${parentId}_${newId}`,
      source: parentId,
      target: newId,
    };

    store.currentMap.nodes.push(newNode);
    store.currentMap.edges.push(newEdge);
  } else if (activeDialogAction.value === 'edit') {
    const nodeId = activeEditingNodeId.value;
    const node = store.currentMap.nodes.find(n => n.id === nodeId);
    if (node) {
      node.label = nodeLabelInput.value;
      if (!node.data) node.data = {};
      node.data.label = nodeLabelInput.value;
    }
  }

  showNodeDialog.value = false;

  // Auto-expand waterfall layouter
  nextTick(() => {
    recalculateLayout();
  });
};

/**
 * Open title editing dialog.
 */
const openEditTitleDialog = () => {
  mapTitleInput.value = store.currentMap.title;
  showTitleDialog.value = true;
};

/**
 * Save renamed map title.
 */
const handleSaveTitle = () => {
  if (mapTitleInput.value.trim()) {
    store.updateCurrentMap({ title: mapTitleInput.value.trim() });
  }
  showTitleDialog.value = false;
};

/**
 * Save current canvas structure to localHistory and sync to localStorage.
 */
const saveMap = () => {
  store.saveCurrentMap();
  $q.notify({
    type: 'positive',
    message: `Mind Map "${store.currentMap.title}" saved successfully!`,
    position: 'top',
    timeout: 2000,
  });
};

/**
 * Load a saved map and safely re-attach structural callback handles.
 */
const loadSavedMap = (id) => {
  const success = store.loadMap(id);
  if (success) {
    // Re-attach JavaScript action functions to loaded data
    store.currentMap.nodes = store.currentMap.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onAddChild: initiateAddChild,
        onDeleteNode: initiateDeleteNode,
        onEditNode: initiateEditNode,
      },
    }));

    $q.notify({
      type: 'info',
      message: `Loaded "${store.currentMap.title}"`,
      position: 'top',
      timeout: 1500,
    });

    nextTick(() => {
      recalculateLayout();
      resetView();
    });
  }
};

/**
 * Deletes a saved map from memory and history directory.
 */
const deleteSavedMap = (id) => {
  $q.dialog({
    title: 'Delete Saved Map?',
    message: 'This will permanently remove this mind map from your history. Are you sure?',
    cancel: true,
    persistent: true,
    ok: {
      color: 'negative',
      label: 'Delete',
    },
  }).onOk(() => {
    const activeDeleted = store.currentMap.id === id;
    store.deleteMap(id);
    
    $q.notify({
      type: 'warning',
      message: 'Mind map deleted.',
      position: 'top',
      timeout: 1500,
    });

    if (activeDeleted) {
      initializeEmptyMap();
    }
  });
};

/**
 * Resets map canvas.
 */
const clearCanvas = () => {
  $q.dialog({
    title: 'Reset Workspace?',
    message: 'This will erase all active nodes on your screen. Any unsaved changes will be lost.',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    initializeEmptyMap();
  });
};

// Lifecycle: Populate active canvas on mounted
onMounted(() => {
  if (store.savedMaps.length > 0) {
    // Load most recent saved map
    loadSavedMap(store.sortedSavedMaps[0].id);
  } else {
    // Initialize fresh template
    initializeEmptyMap();
  }
});
</script>

<template>
  <div class="mindmap-embedded-wrapper full-height full-width">
    <!-- Containerized Quasar Layout to isolate drawers and headers inside the view viewport -->
    <q-layout container :class="$q.dark.isActive ? 'bg-slate-900 text-white shadow-2 viewport-layout' : 'bg-transparent text-slate-800 viewport-layout'" class="overflow-hidden">
      
      <!-- Left Drawer: Mind Map History -->
      <q-drawer
        show-if-above
        v-model="drawerOpen"
        side="left"
        bordered
        :width="280"
        :class="$q.dark.isActive ? 'mindmap-drawer-dark' : 'mindmap-drawer-light'"
      >
        <div class="q-pa-md flex flex-column justify-between full-height no-wrap">
          <!-- Sidebar Header -->
          <div>
            <div class="flex items-center q-gutter-sm q-mb-lg header-sidebar">
              <q-icon name="hub" color="primary" size="md" />
              <div class="text-h6 text-weight-bold tracking-wide" :class="$q.dark.isActive ? 'text-white' : 'text-slate-800'">MIND CANVAS</div>
            </div>

            <!-- Create New button -->
            <q-btn
              color="primary"
              icon="add"
              label="New Mind Map"
              class="full-width q-mb-md new-map-btn text-weight-medium"
              unevaluated
              @click="clearCanvas"
            />

            <q-separator :dark="$q.dark.isActive" :class="$q.dark.isActive ? 'bg-slate-800' : 'bg-slate-200'" class="q-mb-md" />

            <!-- Saved History List -->
            <div class="text-caption text-weight-bold text-slate-400 q-mb-sm tracking-wider uppercase">Saved Mind Maps</div>
            
            <q-scroll-area style="height: calc(100vh - 230px);">
              <q-list separator :dark="$q.dark.isActive" class="history-list">
                <q-item
                  v-for="map in store.sortedSavedMaps"
                  :key="map.id"
                  clickable
                  v-ripple
                  :active="store.currentMap.id === map.id"
                  active-class="active-history-item"
                  class="history-item q-py-sm q-px-md q-my-xs rounded-borders"
                  @click="loadSavedMap(map.id)"
                >
                  <q-item-section avatar class="min-width-auto q-pr-sm">
                    <q-icon name="bubble_chart" :color="store.currentMap.id === map.id ? 'primary' : 'grey-5'" />
                  </q-item-section>
                  
                  <q-item-section>
                    <q-item-label class="text-weight-bold text-ellipsis" :class="$q.dark.isActive ? 'text-white' : 'text-slate-800'">{{ map.title }}</q-item-label>
                    <q-item-label caption class="text-slate-400 text-caption-xs">
                      {{ new Date(map.timestamp).toLocaleDateString() }} at {{ new Date(map.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
                    </q-item-label>
                  </q-item-section>

                  <q-item-section side>
                    <q-btn
                      flat
                      round
                      dense
                      color="negative"
                      icon="delete"
                      size="sm"
                      class="delete-item-btn"
                      @click.stop="deleteSavedMap(map.id)"
                    >
                      <q-tooltip>Delete Map</q-tooltip>
                    </q-btn>
                  </q-item-section>
                </q-item>
              </q-list>

              <!-- Empty state inside history list -->
              <div v-if="store.savedMaps.length === 0" class="text-center q-pa-lg text-slate-500">
                <q-icon name="folder_open" size="lg" class="q-mb-sm" />
                <div class="text-caption">No saved maps found. Create and save your first physics tree!</div>
              </div>
            </q-scroll-area>
          </div>
        </div>
      </q-drawer>

      <!-- Main Canvas Container -->
      <q-page-container class="relative-position full-height full-width overflow-hidden">
        
        <!-- Toggle Sidebar Button floating in the absolute left corner -->
        <div class="absolute-left z-max flex items-center q-pl-md full-height no-pointer-events">
          <q-btn
            round
            :color="$q.dark.isActive ? 'slate-950' : 'white'"
            text-color="primary"
            :icon="drawerOpen ? 'chevron_left' : 'menu'"
            class="all-pointer-events border-slate-800 shadow-4 toggle-drawer-btn"
            @click="drawerOpen = !drawerOpen"
          >
            <q-tooltip>{{ drawerOpen ? 'Hide Sidebar' : 'Show Sidebar' }}</q-tooltip>
          </q-btn>
        </div>

        <!-- Floating Glassmorphism Header Toolbar -->
        <div class="absolute-top q-mx-md q-my-md z-max flex justify-between items-center no-pointer-events toolbar-float">
          
          <!-- Map Title & Edit Panel -->
          <div class="all-pointer-events q-py-sm q-px-md rounded-borders shadow-8 flex items-center gap-md title-card" :class="$q.dark.isActive ? 'bg-slate-950-glass border-slate-800 text-white' : 'bg-white-glass border-slate-200 text-slate-800'">
            <q-icon name="auto_graph" color="primary" size="sm" />
            <div>
              <div class="text-weight-bold text-caption tracking-wider" :class="$q.dark.isActive ? 'text-slate-400' : 'text-slate-500'">ACTIVE MIND CANVAS</div>
              <div
                class="text-subtitle2 text-weight-bold flex items-center cursor-pointer edit-title-hover" :class="$q.dark.isActive ? 'text-white' : 'text-slate-800'"
                @click="openEditTitleDialog"
              >
                {{ store.currentMap.title }}
                <q-icon name="edit" size="xs" class="q-ml-xs text-grey-5" />
              </div>
            </div>
          </div>

          <!-- Main Zoom and Layout Toolbar -->
          <div class="all-pointer-events q-py-xs q-px-sm rounded-borders shadow-8 flex items-center q-gutter-sm controls-card" :class="$q.dark.isActive ? 'bg-slate-950-glass border-slate-800' : 'bg-white-glass border-slate-200'">
            <q-btn round flat dense color="primary" icon="save" size="md" @click="saveMap">
              <q-tooltip>Save Mind Map</q-tooltip>
            </q-btn>
            
            <q-separator vertical :dark="$q.dark.isActive" :class="$q.dark.isActive ? 'bg-slate-800' : 'bg-slate-200'" class="q-my-sm" />
            
            <q-btn round flat dense :color="$q.dark.isActive ? 'grey-3' : 'grey-8'" icon="zoom_in" size="md" @click="zoomIn">
              <q-tooltip>Zoom In</q-tooltip>
            </q-btn>
            <q-btn round flat dense :color="$q.dark.isActive ? 'grey-3' : 'grey-8'" icon="zoom_out" size="md" @click="zoomOut">
              <q-tooltip>Zoom Out</q-tooltip>
            </q-btn>
            <q-btn round flat dense :color="$q.dark.isActive ? 'grey-3' : 'grey-8'" icon="center_focus_strong" size="md" @click="resetView">
              <q-tooltip>Reset View / Fit Canvas</q-tooltip>
            </q-btn>
            
            <q-separator vertical :dark="$q.dark.isActive" :class="$q.dark.isActive ? 'bg-slate-800' : 'bg-slate-200'" class="q-my-sm" />
            
            <q-btn round flat dense color="accent" icon="auto_awesome" size="md" @click="recalculateLayout">
              <q-tooltip>Auto Layout Waterfall</q-tooltip>
            </q-btn>
            <q-btn round flat dense color="negative" icon="delete_sweep" size="md" @click="clearCanvas">
              <q-tooltip>Clear Workspace</q-tooltip>
            </q-btn>
          </div>
        </div>

        <!-- Interactive VueFlow Mind Map Canvas with dot matrix styling -->
        <div class="vue-flow-container" :class="$q.dark.isActive ? 'dark-theme-canvas' : 'light-theme-canvas'">
          <VueFlow
            v-model:nodes="store.currentMap.nodes"
            v-model:edges="store.currentMap.edges"
            :node-types="nodeTypes"
            :min-zoom="0.2"
            :max-zoom="4"
            fit-view-on-init
            @node-double-click="onNodeDoubleClick"
            class="mindmap-flow"
          />
        </div>
      </q-page-container>
    </q-layout>

    <!-- Node Editor / Creation Dialog with real-time math formula parser preview -->
    <q-dialog v-model="showNodeDialog" persistent transition-show="scale" transition-hide="scale">
      <q-card :class="$q.dark.isActive ? 'bg-slate-950 text-white border-slate-800' : 'bg-white text-slate-800 border-slate-200'" class="dialog-card" style="width: 480px; max-width: 90vw; border-radius: 16px;">
        <q-card-section class="flex items-center q-pb-none">
          <q-icon
            :name="activeDialogAction === 'add' ? 'playlist_add' : 'edit_note'"
            color="primary"
            size="md"
            class="q-mr-sm"
          />
          <div class="text-h6 text-weight-bold">
            {{ activeDialogAction === 'add' ? 'Add Subtopic Node' : 'Edit Mindmap Node' }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup color="grey-5" />
        </q-card-section>

        <!-- Fields -->
        <q-card-section class="q-gutter-md q-pt-md">
          <q-input
            v-model="nodeLabelInput"
            label="Node Label / Content"
            outlined
            :dark="$q.dark.isActive"
            color="primary"
            type="textarea"
            rows="3"
            class="node-input"
            input-class="text-weight-medium font-sans"
            hint="Supports LaTeX: enclose formulas in $...$ (inline) or $$...$$ (block). E.g., $\lambda = \frac{h}{p}$."
          />

          <!-- Live rendering Math/Physics equation preview board -->
          <div class="preview-section q-mt-md rounded-borders border-dashed-slate-700 q-pa-md">
            <div class="text-caption text-slate-400 text-weight-bold uppercase tracking-wider q-mb-xs">Live Formula Preview</div>
            <q-card flat :class="$q.dark.isActive ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'" class="q-pa-sm min-height-preview">
              <div v-html="dialogParsedHtml" class="preview-content"></div>
            </q-card>
          </div>
        </q-card-section>

        <!-- Actions -->
        <q-card-actions align="right" class="q-pa-md q-pt-none">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup class="text-weight-bold" />
          <q-btn
            unevaluated
            color="primary"
            :label="activeDialogAction === 'add' ? 'Create Node' : 'Save Changes'"
            class="q-px-lg text-weight-bold rounded-borders"
            @click="handleSaveNode"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Map Title Renaming Dialog -->
    <q-dialog v-model="showTitleDialog" transition-show="scale" transition-hide="scale">
      <q-card :class="$q.dark.isActive ? 'bg-slate-950 text-white border-slate-800' : 'bg-white text-slate-800 border-slate-200'" class="dialog-card" style="width: 380px; max-width: 90vw; border-radius: 16px;">
        <q-card-section class="flex items-center q-pb-none">
          <q-icon name="edit" color="primary" size="sm" class="q-mr-xs" />
          <div class="text-subtitle1 text-weight-bold">Rename Mind Map</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup color="grey-5" />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-input
            v-model="mapTitleInput"
            label="Title"
            outlined
            :dark="$q.dark.isActive"
            dense
            autofocus
            color="primary"
            @keyup.enter="handleSaveTitle"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md q-pt-none">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn unevaluated color="primary" label="Apply" class="q-px-md" @click="handleSaveTitle" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </div>
</template>

<style scoped>
/* Main responsive container layout */
.viewport-layout {
  height: 100% !important;
  width: 100% !important;
  border-radius: 0px !important;
}

/* Dotted grid blueprint background styling */
.vue-flow-container {
  background-size: 26px 26px;
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  transition: background-color 0.3s ease;
}

.dark-theme-canvas {
  background-color: #0c1222;
  background-image: radial-gradient(rgba(255, 255, 255, 0.055) 1.5px, transparent 1.5px);
}

.light-theme-canvas {
  background-color: #f9fdfb;
  background-image: radial-gradient(rgba(26, 143, 100, 0.1) 1.5px, transparent 1.5px);
}

.mindmap-flow {
  height: 100% !important;
  width: 100% !important;
}

/* Glassmorphic UI designs - Dynamic Dark and Light Mode */
.bg-slate-950-glass {
  background: rgba(15, 23, 42, 0.82);
  backdrop-filter: blur(8px) saturate(130%);
  -webkit-backdrop-filter: blur(8px) saturate(130%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.bg-white-glass {
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(8px) saturate(130%);
  -webkit-backdrop-filter: blur(8px) saturate(130%);
  border: 1px solid rgba(26, 143, 100, 0.12);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
}

.border-slate-800 {
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.border-dashed-slate-700 {
  border: 1px dashed rgba(255, 255, 255, 0.15);
}

/* Left drawer style dynamic matching */
.mindmap-drawer-light {
  background: #f2faf5 !important;
  border-right: 1px solid rgba(26, 143, 100, 0.1) !important;
  color: #1e293b !important;
}

.mindmap-drawer-dark {
  background: #121d29 !important;
  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #e2e8f0 !important;
}

.history-item {
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.mindmap-drawer-light .history-item:hover {
  background: rgba(26, 143, 100, 0.05);
  border-color: rgba(26, 143, 100, 0.08);
}

.mindmap-drawer-dark .history-item:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.05);
}

.mindmap-drawer-light .active-history-item {
  background: rgba(142, 85, 244, 0.12) !important;
  border-color: rgba(142, 85, 244, 0.3) !important;
  color: #8e55f4 !important;
}

.mindmap-drawer-dark .active-history-item {
  background: rgba(111, 76, 241, 0.15) !important;
  border-color: rgba(115, 226, 194, 0.3) !important;
  color: #73e2c2 !important;
}

.delete-item-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.history-item:hover .delete-item-btn {
  opacity: 1;
}

/* Floating elements layouts */
.no-pointer-events {
  pointer-events: none;
}

.all-pointer-events {
  pointer-events: auto;
}

.toggle-drawer-btn {
  background: #070a16 !important;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.edit-title-hover {
  transition: color 0.2s ease;
}

.edit-title-hover:hover {
  color: #3b82f6 !important;
}

/* Preview board */
.min-height-preview {
  min-height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.preview-content {
  width: 100%;
  word-wrap: break-word;
  white-space: normal;
}

.min-width-auto {
  min-width: unset;
}

/* Helper Utilities */
.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-caption-xs {
  font-size: 10px;
}

/* Connective lines between nodes (custom colors inside Vue Flow) */
:deep(.vue-flow__edge-path) {
  stroke: #8e55f4 !important;
  stroke-width: 2.5px;
  stroke-dasharray: 2;
  animation: dash 30s linear infinite;
}

@keyframes dash {
  from {
    stroke-dashoffset: 1000;
  }
  to {
    stroke-dashoffset: 0;
  }
}

:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: #60a5fa !important;
  stroke-width: 3.5px;
  stroke-dasharray: none;
}

:deep(.katex-display) {
  margin: 4px 0 !important;
}
</style>

<!-- Load Vue Flow structural styles globally for correct canvas rendering -->
<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

/* Fix Quasar containerized layout height collapse */
.q-layout-container > div > div {
  height: 100% !important;
}
.q-layout-container .q-layout--containerized {
  height: 100% !important;
}
</style>

