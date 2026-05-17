<script setup>
import { computed, inject } from 'vue';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@vue-flow/core';
import { useMindMapStore } from '../stores/useMindMapStore';
import { useQuasar } from 'quasar';

const props = defineProps({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  sourceX: { type: Number, required: true },
  sourceY: { type: Number, required: true },
  targetX: { type: Number, required: true },
  targetY: { type: Number, required: true },
  sourcePosition: { type: String, required: true },
  targetPosition: { type: String, required: true },
  data: { type: Object, required: false },
  markerEnd: { type: String, required: false },
  style: { type: Object, required: false },
});

const mode = inject('mindmapMode', computed(() => 'edit'));
const store = useMindMapStore();
const $q = useQuasar();

const path = computed(() => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  });
  return { edgePath, labelX, labelY };
});

const customStyle = computed(() => {
  return {
    ...props.style,
    strokeWidth: 3,
    stroke: $q.dark.isActive ? '#64748b' : '#94a3b8',
    transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
  };
});

const onDeleteClick = (e) => {
  e.stopPropagation();
  store.currentMap.edges = store.currentMap.edges.filter(edge => edge.id !== props.id);
  $q.notify({
    type: 'warning',
    message: 'Connection removed successfully',
    position: 'top',
    timeout: 1200,
  });
};
</script>

<template>
  <BaseEdge
    :id="id"
    :path="path.edgePath"
    :style="customStyle"
    :marker-end="markerEnd"
    class="mindmap-base-edge"
  />

  <EdgeLabelRenderer v-if="mode === 'edit'">
    <div
      class="n8n-edge-button nodrag nopan"
      :style="{
        transform: `translate(-50%, -50%) translate(${path.labelX}px,${path.labelY}px)`,
        pointerEvents: 'all',
      }"
    >
      <q-btn
        round
        dense
        color="negative"
        icon="close"
        size="xs"
        class="delete-edge-btn shadow-4"
        @click="onDeleteClick"
      >
        <q-tooltip anchor="top middle" self="bottom middle" :offset="[8, 8]">
          Delete connection (n8n style)
        </q-tooltip>
      </q-btn>
    </div>
  </EdgeLabelRenderer>
</template>

<style scoped>
.n8n-edge-button {
  position: absolute;
  z-index: 1000;
}

.delete-edge-btn {
  width: 22px !important;
  height: 22px !important;
  min-height: 22px !important;
  padding: 0 !important;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease, background-color 0.2s ease;
  border: 2px solid #ffffff;
}

.delete-edge-btn:hover {
  transform: scale(1.25);
  background-color: #dc2626 !important;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.8);
}

.mindmap-base-edge {
  transition: stroke 0.3s ease, stroke-width 0.3s ease;
}

.mindmap-base-edge:hover {
  stroke-width: 5px !important;
  stroke: #38bdf8 !important;
}
</style>
