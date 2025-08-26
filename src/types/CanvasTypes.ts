import { AutocompleteItem, ContentType } from './GlobalBrainTypes';

export interface Point2D {
  x: number;
  y: number;
}

export interface IdeaColor {
  primary: string;
  secondary: string;
  accent: string;
}

export interface IdeaNode {
  id: string;
  item: AutocompleteItem;
  position: Point2D;
  color: IdeaColor;
  size: number;
  connections: string[]; // IDs of connected nodes
  semanticWeight: number; // 0-1, influences positioning
}

export interface Connection {
  fromNodeId: string;
  toNodeId: string;
  strength: number; // 0-1, influences line thickness and opacity
  type: ConnectionType;
  color: string;
}

export type ConnectionType = 'tag' | 'domain' | 'semantic' | 'priority' | 'source';

export interface CanvasState {
  offset: Point2D;
  zoom: number;
  isDragging: boolean;
  dragStart: Point2D;
  canvasSize: { width: number; height: number };
}

export interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface SemanticCluster {
  centroid: Point2D;
  nodes: string[];
  color: IdeaColor;
  radius: number;
}

// Color palette for different content types and domains - darker and more subdued
export const IDEA_COLORS: Record<ContentType, IdeaColor> = {
  category: {
    primary: '#C14242',    // Darker Red
    secondary: '#E8CCCC',
    accent: '#A03333'
  },
  investigation: {
    primary: '#2E8B7A',    // Darker Teal
    secondary: '#CCE8E4',
    accent: '#1E6B5A'
  },
  research: {
    primary: '#2E6B94',    // Darker Blue
    secondary: '#CDD9E8',
    accent: '#1E4B6B'
  },
  protocol: {
    primary: '#5A8A6B',    // Darker Green
    secondary: '#D6E8DB',
    accent: '#3E5A47'
  },
  insight: {
    primary: '#B8913E',    // Darker Yellow
    secondary: '#E8DCC6',
    accent: '#8A6B2E'
  },
  problem: {
    primary: '#C14545',    // Darker Light Red
    secondary: '#E8CCCC',
    accent: '#8A3030'
  },
  challenge: {
    primary: '#B85A78',    // Darker Pink
    secondary: '#E8D1DB',
    accent: '#8A4259'
  },
  question: {
    primary: '#C29452',    // Darker Orange
    secondary: '#E8DAC9',
    accent: '#8A693A'
  },
  item: {
    primary: '#4A3BA8',    // Darker Purple
    secondary: '#D1CBE8',
    accent: '#352A7A'
  },
  list: {
    primary: '#6B63B8',    // Darker Light Purple
    secondary: '#D6D1E8',
    accent: '#4A3B8A'
  },
  reference: {
    primary: '#006B52',    // Darker Green
    secondary: '#CCE8DB',
    accent: '#004A38'
  },
  discussion: {
    primary: '#00948A',    // Darker Cyan
    secondary: '#CCE8E4',
    accent: '#006B63'
  },
  resource: {
    primary: '#3E6BB8',    // Darker Blue
    secondary: '#CDD6E8',
    accent: '#2E4A8A'
  },
  guide: {
    primary: '#1A8A94',    // Darker Cyan
    secondary: '#C6E0E2',
    accent: '#126B73'
  }
};

// Additional color variations for semantic clustering - darker and more subdued
export const CLUSTER_COLORS: IdeaColor[] = [
  { primary: '#B84D73', secondary: '#E8D1DB', accent: '#8A3854' },
  { primary: '#2E7A33', secondary: '#CCE8CE', accent: '#1E5224' },
  { primary: '#1A6BB8', secondary: '#C6D6E8', accent: '#124A8A' },
  { primary: '#B86B00', secondary: '#E8D9C6', accent: '#8A4F00' },
  { primary: '#6B1A7A', secondary: '#D6C6DB', accent: '#4A1252' },
  { primary: '#00848A', secondary: '#C6E0E2', accent: '#005F63' },
  { primary: '#5A8A33', secondary: '#D1E8C6', accent: '#3E5F24' },
  { primary: '#B88A05', secondary: '#E8DFC6', accent: '#8A6B04' }
];

export interface CanvasInteractionState {
  isPanning: boolean;
  isZooming: boolean;
  lastTouchDistance: number;
  touchCenter: Point2D;
  velocity: Point2D;
  inertia: boolean;
}