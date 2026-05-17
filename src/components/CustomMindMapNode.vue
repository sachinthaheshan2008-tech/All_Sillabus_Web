<script setup>
import { computed } from 'vue';
import { Handle } from '@vue-flow/core';
import { useQuasar } from 'quasar';
import katex from 'katex';

// Vue Flow Node Props
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    default: () => ({}),
  },
  selected: {
    type: Boolean,
    default: false,
  },
  targetPosition: {
    type: String,
    default: 'top',
  },
  sourcePosition: {
    type: String,
    default: 'bottom',
  },
});

const emit = defineEmits(['add-child', 'delete-node', 'edit-node']);

const $q = useQuasar();

// Deep KaTeX and inline markdown parser
const parsedLabelHtml = computed(() => {
  const label = props.data?.label || 'New Node';
  
  // Split the label into parts based on LaTeX delimiters:
  // $$formula$$ (block math) and $formula$ (inline math)
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
      // Escape HTML special characters for security
      return part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }).join('');
});

// Vibrant gradient dynamic background generator based on tree hierarchy depth (data.level)
const depthStyles = computed(() => {
  const level = props.data?.level ?? 0;
  
  // Determine gradient colors and border accent colors depending on the depth level
  const palettes = {
    0: { // Root: Cosmic Indigo
      bg: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      border: '#cbd5e1', 
      textColor: '#ffffff'
    },
    1: { // Level 1 Branch: Emerald Teal
      bg: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
      border: '#34d399',
      textColor: '#ffffff'
    },
    2: { // Level 2 Branch: Amber Orange
      bg: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
      border: '#fbbf24',
      textColor: '#ffffff'
    },
    3: { // Level 3 Branch: Electric Pink
      bg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      border: '#f472b6',
      textColor: '#ffffff'
    }
  };

  // Fallback styling for deep sub-branches (Dynamic based on theme)
  const defaultPalette = $q.dark.isActive
    ? {
        bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '#475569',
        textColor: '#ffffff'
      }
    : {
        bg: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '#cbd5e1',
        textColor: '#1e293b'
      };

  const isLevelDefined = level in palettes;
  const current = palettes[level] || defaultPalette;
  const borderCol = isLevelDefined ? (level === 0 ? ($q.dark.isActive ? '#a78bfa' : '#8b5cf6') : current.border) : current.border;

  return {
    background: current.bg,
    border: `1.5px solid ${borderCol}`,
    color: current.textColor,
    boxShadow: props.selected 
      ? `0 0 14px 2px ${borderCol}, 0 4px 12px rgba(0, 0, 0, 0.2)`
      : $q.dark.isActive 
        ? '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
        : '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
  };
});

const onAddChildClick = (e) => {
  e.stopPropagation();
  emit('add-child', props.id);
  if (props.data?.onAddChild) {
    props.data.onAddChild(props.id);
  }
};

const onDeleteClick = (e) => {
  e.stopPropagation();
  emit('delete-node', props.id);
  if (props.data?.onDeleteNode) {
    props.data.onDeleteNode(props.id);
  }
};

const onEditClick = (e) => {
  e.stopPropagation();
  emit('edit-node', props.id);
  if (props.data?.onEditNode) {
    props.data.onEditNode(props.id);
  }
};
</script>

<template>
  <div class="mindmap-node-wrapper">
    <!-- Connective Handles dynamically mapping directions computed by layouter -->
    <Handle
      type="target"
      :position="targetPosition"
      class="mindmap-handle target-handle"
    />

    <!-- Sleek Quasar card with depth-based gradient colors -->
    <q-card
      class="mindmap-node-card text-center q-pa-sm"
      :style="depthStyles"
    >
      <!-- Premium floating toolbar appearing on hover -->
      <div class="mindmap-node-actions q-gutter-xs q-pa-xs">
        <q-btn
          round
          dense
          size="xs"
          color="amber-8"
          icon="edit"
          @click="onEditClick"
        >
          <q-tooltip anchor="top middle" self="bottom middle" :offset="[10, 10]">
            Edit node content
          </q-tooltip>
        </q-btn>
        
        <q-btn
          round
          dense
          size="xs"
          color="positive"
          icon="add"
          @click="onAddChildClick"
        >
          <q-tooltip anchor="top middle" self="bottom middle" :offset="[10, 10]">
            Add child node
          </q-tooltip>
        </q-btn>
        <q-btn
          round
          dense
          size="xs"
          color="negative"
          icon="remove"
          @click="onDeleteClick"
        >
          <q-tooltip anchor="top middle" self="bottom middle" :offset="[10, 10]">
            Delete branch
          </q-tooltip>
        </q-btn>
      </div>

      <!-- Card Content: Safe HTML to render equations and text together -->
      <q-card-section class="q-pa-xs node-content-section">
        <div class="node-label text-weight-medium" v-html="parsedLabelHtml"></div>
      </q-card-section>
    </q-card>

    <Handle
      type="source"
      :position="sourcePosition"
      class="mindmap-handle source-handle"
    />
  </div>
</template>

<style scoped>
.mindmap-node-wrapper {
  position: relative;
  display: inline-block;
}

.mindmap-node-card {
  min-width: 160px;
  max-width: 320px;
  border-radius: 12px;
  cursor: grab;
  user-select: none;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.25s ease;
  overflow: visible !important; /* Allow actions menu to overflow card boundary */
}

.mindmap-node-card:active {
  cursor: grabbing;
  transform: scale(0.97);
}

.node-content-section {
  word-wrap: break-word;
  white-space: normal;
}

.node-label {
  font-size: 13.5px;
  line-height: 1.45;
  letter-spacing: 0.15px;
}

/* Float toolbar styles */
.mindmap-node-actions {
  position: absolute;
  top: -24px;
  right: 50%;
  transform: translateX(50%) translateY(6px);
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(6px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  z-index: 100;
  display: flex;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.mindmap-node-wrapper:hover .mindmap-node-actions {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(50%) translateY(0);
}

/* Custom handles for Vue Flow */
.mindmap-handle {
  width: 10px !important;
  height: 10px !important;
  background-color: #38bdf8 !important;
  border: 2px solid #0f172a !important;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.mindmap-handle:hover {
  transform: scale(1.3);
  background-color: #0ea5e9 !important;
}

/* Styling formulas rendered inside Vue Flow */
:deep(.katex-display) {
  margin: 6px 0 !important;
}
:deep(.katex) {
  font-size: 1.1em;
}
</style>
