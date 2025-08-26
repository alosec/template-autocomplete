import { useMemo, useRef } from 'react';
import { AutocompleteItem } from '../types/GlobalBrainTypes';
import { Point2D, IdeaNode, SemanticCluster, IDEA_COLORS, CLUSTER_COLORS } from '../types/CanvasTypes';
import { calculateSemanticSimilarity, findConnectedComponents, getNodeInfluence } from '../utils/semanticConnections';

interface UseSemanticLayoutProps {
  items: AutocompleteItem[];
  canvasSize: { width: number; height: number };
  connections: any[];
}

export const useSemanticLayout = ({ items, canvasSize, connections }: UseSemanticLayoutProps) => {
  const layoutCache = useRef<Map<string, Point2D>>(new Map());

  const nodes = useMemo(() => {
    if (!items.length || !canvasSize.width || !canvasSize.height) return [];

    // Generate unique IDs for items
    const itemsWithIds = items.map((item, index) => ({
      id: `node-${index}-${item.text.slice(0, 10).replace(/\s/g, '')}`,
      item,
      originalIndex: index
    }));

    // Create preliminary nodes
    const preliminaryNodes: IdeaNode[] = itemsWithIds.map(({ id, item }) => ({
      id,
      item,
      position: { x: 0, y: 0 }, // Will be calculated
      color: IDEA_COLORS[item.type] || IDEA_COLORS.item,
      size: calculateNodeSize(item),
      connections: [],
      semanticWeight: calculateSemanticWeight(item)
    }));

    // Find semantic clusters using content types and domains
    const clusters = createSemanticClusters(preliminaryNodes, canvasSize);
    
    // Position nodes using force-directed layout
    const positionedNodes = positionNodesWithForceLayout(preliminaryNodes, clusters, canvasSize);

    return positionedNodes;
  }, [items, canvasSize.width, canvasSize.height]);

  return { nodes };
};

const calculateNodeSize = (item: AutocompleteItem): number => {
  let baseSize = 120; // Much larger base size
  
  // Size based on priority
  switch (item.priority) {
    case 'high': baseSize *= 1.3; break;
    case 'low': baseSize *= 0.9; break;
  }
  
  // Size based on type
  switch (item.type) {
    case 'category': baseSize *= 1.4; break;
    case 'investigation': baseSize *= 1.2; break;
    case 'challenge': baseSize *= 1.2; break;
    default: break;
  }
  
  // Size based on item count (for categories)
  if (item.itemCount) {
    const countFactor = Math.min(2, 1 + (item.itemCount / 1000));
    baseSize *= countFactor;
  }
  
  return Math.max(100, Math.min(250, baseSize)); // Larger min/max range
};

const calculateSemanticWeight = (item: AutocompleteItem): number => {
  let weight = 0.5;
  
  // High priority items get more weight
  if (item.priority === 'high') weight += 0.2;
  
  // Categories and investigations get more weight
  if (['category', 'investigation', 'challenge'].includes(item.type)) {
    weight += 0.15;
  }
  
  // Items with many tags get more weight
  weight += Math.min(0.2, item.tags.length * 0.03);
  
  return Math.max(0.1, Math.min(1, weight));
};

const createSemanticClusters = (nodes: IdeaNode[], canvasSize: { width: number; height: number }): SemanticCluster[] => {
  const clusters: SemanticCluster[] = [];
  
  // Use actual viewport bounds instead of expanded area
  const canvasWidth = canvasSize.width || 800;
  const canvasHeight = canvasSize.height || 600;
  
  // Group by content type first
  const typeGroups = new Map<string, IdeaNode[]>();
  nodes.forEach(node => {
    const type = node.item.type;
    if (!typeGroups.has(type)) {
      typeGroups.set(type, []);
    }
    typeGroups.get(type)!.push(node);
  });

  // Create clusters spread across the expanded canvas area
  let clusterIndex = 0;
  const gridSize = Math.ceil(Math.sqrt(typeGroups.size));
  const cellWidth = canvasWidth / gridSize;
  const cellHeight = canvasHeight / gridSize;
  
  typeGroups.forEach((groupNodes, type) => {
    const gridX = clusterIndex % gridSize;
    const gridY = Math.floor(clusterIndex / gridSize);
    
    // Add randomization to avoid perfect grid alignment
    const randomX = (Math.random() - 0.5) * cellWidth * 0.4;
    const randomY = (Math.random() - 0.5) * cellHeight * 0.4;
    
    const clusterCenter = {
      x: gridX * cellWidth + cellWidth / 2 + randomX,
      y: gridY * cellHeight + cellHeight / 2 + randomY
    };

    const clusterRadius = Math.max(100, Math.sqrt(groupNodes.length) * 40);
    const colorIndex = clusterIndex % CLUSTER_COLORS.length;

    clusters.push({
      centroid: clusterCenter,
      nodes: groupNodes.map(n => n.id),
      color: CLUSTER_COLORS[colorIndex],
      radius: clusterRadius
    });

    clusterIndex++;
  });

  return clusters;
};

const positionNodesWithForceLayout = (
  nodes: IdeaNode[], 
  clusters: SemanticCluster[], 
  canvasSize: { width: number; height: number }
): IdeaNode[] => {
  const positioned = nodes.map(node => ({ ...node }));
  
  // Use actual viewport bounds that match cluster creation
  const canvasWidth = canvasSize.width || 800;
  const canvasHeight = canvasSize.height || 600;
  
  // Initial positioning within clusters
  clusters.forEach(cluster => {
    const clusterNodes = positioned.filter(n => cluster.nodes.includes(n.id));
    positionNodesInCluster(clusterNodes, cluster);
  });

  // Apply force-directed layout for fine-tuning
  const iterations = 80;
  const dampening = 0.85;
  
  for (let i = 0; i < iterations; i++) {
    const forces = new Map<string, Point2D>();
    
    positioned.forEach(node => {
      forces.set(node.id, { x: 0, y: 0 });
    });

    // Repulsion between all nodes - stronger to spread them out
    for (let j = 0; j < positioned.length; j++) {
      for (let k = j + 1; k < positioned.length; k++) {
        const node1 = positioned[j];
        const node2 = positioned[k];
        
        const dx = node2.position.x - node1.position.x;
        const dy = node2.position.y - node1.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (node1.size + node2.size) * 1.5 + 40;
        
        if (distance < minDistance) {
          const repulsion = 800 / Math.max(distance, 1);
          const forceX = (dx / distance) * repulsion;
          const forceY = (dy / distance) * repulsion;
          
          const force1 = forces.get(node1.id)!;
          const force2 = forces.get(node2.id)!;
          
          force1.x -= forceX;
          force1.y -= forceY;
          force2.x += forceX;
          force2.y += forceY;
        }
      }
    }

    // Weaker attraction to cluster centers to allow spreading
    clusters.forEach(cluster => {
      const clusterNodes = positioned.filter(n => cluster.nodes.includes(n.id));
      
      clusterNodes.forEach(node => {
        const dx = cluster.centroid.x - node.position.x;
        const dy = cluster.centroid.y - node.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > cluster.radius) {
          const attraction = 0.05; // Weaker attraction
          const force = forces.get(node.id)!;
          force.x += dx * attraction;
          force.y += dy * attraction;
        }
      });
    });

    // Apply forces with dampening
    positioned.forEach(node => {
      const force = forces.get(node.id)!;
      node.position.x += force.x * dampening;
      node.position.y += force.y * dampening;
      
      // Keep nodes within expanded canvas bounds with more margin
      const margin = node.size * 2;
      node.position.x = Math.max(margin, Math.min(canvasWidth - margin, node.position.x));
      node.position.y = Math.max(margin, Math.min(canvasHeight - margin, node.position.y));
    });
  }

  return positioned;
};

const positionNodesInCluster = (nodes: IdeaNode[], cluster: SemanticCluster) => {
  if (nodes.length === 1) {
    // Add some randomization even for single nodes
    const randomOffset = 50;
    nodes[0].position = {
      x: cluster.centroid.x + (Math.random() - 0.5) * randomOffset,
      y: cluster.centroid.y + (Math.random() - 0.5) * randomOffset
    };
    return;
  }

  // Use varied positioning strategies for better spread
  const strategies = ['spiral', 'grid', 'random'];
  const strategy = strategies[Math.floor(Math.random() * strategies.length)];
  
  if (strategy === 'spiral') {
    const angleStep = (2 * Math.PI) / nodes.length;
    const baseRadius = cluster.radius * 0.4;
    
    nodes.forEach((node, index) => {
      const angle = index * angleStep + (Math.random() - 0.5) * 0.8;
      const radiusVariation = Math.random() * 0.6 + 0.7; // 0.7 to 1.3
      const radius = baseRadius * radiusVariation;
      
      node.position = {
        x: cluster.centroid.x + Math.cos(angle) * radius,
        y: cluster.centroid.y + Math.sin(angle) * radius
      };
    });
  } else if (strategy === 'grid') {
    const gridSize = Math.ceil(Math.sqrt(nodes.length));
    const spacing = cluster.radius / gridSize;
    
    nodes.forEach((node, index) => {
      const gridX = index % gridSize;
      const gridY = Math.floor(index / gridSize);
      const offsetX = (gridX - gridSize / 2) * spacing + (Math.random() - 0.5) * spacing * 0.4;
      const offsetY = (gridY - gridSize / 2) * spacing + (Math.random() - 0.5) * spacing * 0.4;
      
      node.position = {
        x: cluster.centroid.x + offsetX,
        y: cluster.centroid.y + offsetY
      };
    });
  } else {
    // Random positioning within cluster
    nodes.forEach((node) => {
      const angle = Math.random() * 2 * Math.PI;
      const radius = Math.random() * cluster.radius * 0.8;
      
      node.position = {
        x: cluster.centroid.x + Math.cos(angle) * radius,
        y: cluster.centroid.y + Math.sin(angle) * radius
      };
    });
  }
};