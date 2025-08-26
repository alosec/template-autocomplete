import { AutocompleteItem } from '../types/GlobalBrainTypes';
import { Connection, ConnectionType, IdeaNode, Point2D } from '../types/CanvasTypes';

export const calculateSemanticSimilarity = (item1: AutocompleteItem, item2: AutocompleteItem): number => {
  let similarity = 0;
  let factors = 0;

  // Tag overlap (strongest signal)
  if (item1.tags.length > 0 && item2.tags.length > 0) {
    const sharedTags = item1.tags.filter(tag => item2.tags.includes(tag));
    const tagSimilarity = (sharedTags.length * 2) / (item1.tags.length + item2.tags.length);
    similarity += tagSimilarity * 0.4;
    factors += 0.4;
  }

  // Domain/category matching
  if (item1.domain && item2.domain) {
    if (item1.domain === item2.domain) {
      similarity += 0.25;
    }
    factors += 0.25;
  }

  // Type matching
  if (item1.type === item2.type) {
    similarity += 0.15;
    factors += 0.15;
  }

  // Source matching (weaker signal)
  if (item1.source === item2.source) {
    similarity += 0.1;
    factors += 0.1;
  }

  // Priority correlation
  if (item1.priority === item2.priority && item1.priority === 'high') {
    similarity += 0.05;
    factors += 0.05;
  }

  // Text semantic similarity (basic keyword matching)
  const textSim = calculateTextSimilarity(item1.text + ' ' + item1.description, 
                                         item2.text + ' ' + item2.description);
  similarity += textSim * 0.05;
  factors += 0.05;

  return factors > 0 ? similarity / factors : 0;
};

const calculateTextSimilarity = (text1: string, text2: string): number => {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const commonWords = words1.filter(word => words2.includes(word));
  return (commonWords.length * 2) / (words1.length + words2.length);
};

export const generateConnections = (nodes: IdeaNode[]): Connection[] => {
  const connections: Connection[] = [];
  const minSimilarity = 0.15; // Threshold for creating connections

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const similarity = calculateSemanticSimilarity(nodes[i].item, nodes[j].item);
      
      if (similarity >= minSimilarity) {
        const connectionType = determineConnectionType(nodes[i].item, nodes[j].item);
        const connectionColor = getConnectionColor(connectionType, similarity);
        
        connections.push({
          fromNodeId: nodes[i].id,
          toNodeId: nodes[j].id,
          strength: similarity,
          type: connectionType,
          color: connectionColor
        });
      }
    }
  }

  return connections;
};

const determineConnectionType = (item1: AutocompleteItem, item2: AutocompleteItem): ConnectionType => {
  // Check for shared tags first
  const sharedTags = item1.tags.filter(tag => item2.tags.includes(tag));
  if (sharedTags.length > 0) return 'tag';
  
  // Check domain match
  if (item1.domain && item2.domain && item1.domain === item2.domain) return 'domain';
  
  // Check source match
  if (item1.source === item2.source) return 'source';
  
  // Check priority match
  if (item1.priority === item2.priority && item1.priority === 'high') return 'priority';
  
  return 'semantic';
};

const getConnectionColor = (type: ConnectionType, strength: number): string => {
  const alpha = Math.max(0.3, strength);
  
  switch (type) {
    case 'tag':
      return `rgba(255, 107, 107, ${alpha})`; // Red
    case 'domain':
      return `rgba(69, 183, 209, ${alpha})`; // Blue
    case 'semantic':
      return `rgba(108, 92, 231, ${alpha})`; // Purple
    case 'priority':
      return `rgba(254, 202, 87, ${alpha})`; // Orange
    case 'source':
      return `rgba(150, 206, 180, ${alpha})`; // Green
    default:
      return `rgba(150, 150, 150, ${alpha})`;
  }
};

export const calculateDistance = (p1: Point2D, p2: Point2D): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const findConnectedComponents = (nodes: IdeaNode[], connections: Connection[]): string[][] => {
  const nodeIds = nodes.map(n => n.id);
  const visited = new Set<string>();
  const components: string[][] = [];
  
  // Build adjacency list
  const adjacencyList: Map<string, string[]> = new Map();
  nodeIds.forEach(id => adjacencyList.set(id, []));
  
  connections.forEach(conn => {
    adjacencyList.get(conn.fromNodeId)?.push(conn.toNodeId);
    adjacencyList.get(conn.toNodeId)?.push(conn.fromNodeId);
  });
  
  // DFS to find connected components
  const dfs = (nodeId: string, component: string[]) => {
    visited.add(nodeId);
    component.push(nodeId);
    
    adjacencyList.get(nodeId)?.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        dfs(neighbor, component);
      }
    });
  };
  
  nodeIds.forEach(nodeId => {
    if (!visited.has(nodeId)) {
      const component: string[] = [];
      dfs(nodeId, component);
      components.push(component);
    }
  });
  
  return components;
};

export const getNodeInfluence = (nodeId: string, connections: Connection[]): number => {
  const nodeConnections = connections.filter(
    c => c.fromNodeId === nodeId || c.toNodeId === nodeId
  );
  
  if (nodeConnections.length === 0) return 0.1;
  
  const totalStrength = nodeConnections.reduce((sum, c) => sum + c.strength, 0);
  return Math.min(1, totalStrength / nodeConnections.length + (nodeConnections.length * 0.1));
};