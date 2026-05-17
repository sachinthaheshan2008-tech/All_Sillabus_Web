import { computed, unref } from 'vue';
import dagre from 'dagre';

/**
 * Composable for calculating and applying an auto-layout to nodes and edges.
 * Uses Dagre engine in a Top-to-Bottom (TB) direction with highly expandable layout spacing.
 *
 * @param {Array|Ref} [nodes] - Vue Flow nodes (optional for instant reactivity)
 * @param {Array|Ref} [edges] - Vue Flow edges (optional for instant reactivity)
 * @param {Object} [options] - Dagre graph customization options
 * @returns {Object} { layout, layoutedNodes }
 */
export function useLayout(nodes = null, edges = null, options = {}) {
  // Create a reusable dagre graph instance
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  /**
   * Layout function to dynamically compute new positions
   * @param {Array} inputNodes - List of nodes to layout
   * @param {Array} inputEdges - List of edges to layout
   * @param {Object} [overrideOptions] - Dynamic overrides for layout configurations
   * @returns {Array} - Nodes with updated layout positions
   */
  const layout = (inputNodes, inputEdges, overrideOptions = {}) => {
    const rawNodes = unref(inputNodes) || [];
    const rawEdges = unref(inputEdges) || [];

    // Define configuration with generous default spacing suitable for complex mind maps
    const config = {
      direction: 'TB',     // Top-to-Bottom
      nodeWidth: 200,      // Generous fallback node width
      nodeHeight: 80,      // Generous fallback node height
      nodeSep: 120,        // Horizontal spacing between sibling nodes (allow node cards to auto-expand)
      rankSep: 150,        // Vertical spacing between layers/ranks to allow for large subtrees
      ...options,
      ...overrideOptions,
    };

    const isHorizontal = config.direction === 'LR';

    // Configure the dagre graph structure
    dagreGraph.setGraph({
      rankdir: config.direction,
      nodesep: config.nodeSep,
      ranksep: config.rankSep,
    });

    // 1. Register nodes with their dimensions
    rawNodes.forEach((node) => {
      const width = node.width || config.nodeWidth;
      const height = node.height || config.nodeHeight;
      dagreGraph.setNode(node.id, { width, height });
    });

    // 2. Register edges
    rawEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // 3. Compute layout coordinates
    dagre.layout(dagreGraph);

    // 4. Map the positioned nodes back to Vue Flow format
    return rawNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const width = node.width || config.nodeWidth;
      const height = node.height || config.nodeHeight;

      // Adjust coordinate system: Dagre positions nodes by their center point (x, y),
      // while Vue Flow positions nodes by their top-left corner.
      return {
        ...node,
        targetPosition: isHorizontal ? 'left' : 'top',
        sourcePosition: isHorizontal ? 'right' : 'bottom',
        position: {
          x: nodeWithPosition.x - width / 2,
          y: nodeWithPosition.y - height / 2,
        },
      };
    });
  };

  // Compute a reactive list of nodes if initial arguments were provided
  const layoutedNodes = computed(() => {
    if (!nodes) return [];
    return layout(nodes, edges);
  });

  return {
    layout,
    layoutedNodes,
  };
}
