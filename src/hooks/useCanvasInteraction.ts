import { useState, useRef, useCallback, useEffect } from 'react';
import { Point2D, CanvasState, CanvasInteractionState } from '../types/CanvasTypes';

interface UseCanvasInteractionProps {
  containerRef: React.RefObject<HTMLDivElement>;
  onViewportChange?: (offset: Point2D, zoom: number) => void;
  isInputFocused?: boolean;
}

export const useCanvasInteraction = ({ containerRef, onViewportChange, isInputFocused }: UseCanvasInteractionProps) => {
  const [canvasState, setCanvasState] = useState<CanvasState>({
    offset: { x: 0, y: 0 },
    zoom: 1,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    canvasSize: { width: 0, height: 0 }
  });

  const [interactionState, setInteractionState] = useState<CanvasInteractionState>({
    isPanning: false,
    isZooming: false,
    lastTouchDistance: 0,
    touchCenter: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    inertia: false
  });

  const animationFrame = useRef<number>();
  const lastPanTime = useRef<number>(0);
  const lastPanPosition = useRef<Point2D>({ x: 0, y: 0 });

  // Helper function to constrain offset within viewport bounds
  const constrainOffset = useCallback((newOffset: Point2D, zoom: number, canvasSize: { width: number; height: number }) => {
    // Content area size matches actual viewport (no expansion)
    const contentWidth = canvasSize.width || 800;
    const contentHeight = canvasSize.height || 600;
    
    // When zoomed out, ensure content stays within viewport
    const scaledContentWidth = contentWidth * zoom;
    const scaledContentHeight = contentHeight * zoom;
    
    // Simple bounds - keep content from going completely outside viewport
    const margin = 50; // Small fixed margin
    
    return {
      x: Math.max(
        Math.min(newOffset.x, margin), 
        canvasSize.width - scaledContentWidth - margin
      ),
      y: Math.max(
        Math.min(newOffset.y, margin), 
        canvasSize.height - scaledContentHeight - margin
      )
    };
  }, []);

  // Update canvas size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasState(prev => ({
          ...prev,
          canvasSize: { width: rect.width, height: rect.height }
        }));
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [containerRef]);

  // Inertia animation
  useEffect(() => {
    if (!interactionState.inertia) return;

    const animate = () => {
      setInteractionState(prev => {
        const dampening = 0.95;
        const newVelocity = {
          x: prev.velocity.x * dampening,
          y: prev.velocity.y * dampening
        };

        // Stop when velocity is very low
        if (Math.abs(newVelocity.x) < 0.5 && Math.abs(newVelocity.y) < 0.5) {
          return { ...prev, inertia: false, velocity: { x: 0, y: 0 } };
        }

        setCanvasState(canvas => {
          const newOffset = {
            x: canvas.offset.x + newVelocity.x,
            y: canvas.offset.y + newVelocity.y
          };
          const constrainedOffset = constrainOffset(newOffset, canvas.zoom, canvas.canvasSize);
          onViewportChange?.(constrainedOffset, canvas.zoom);
          return { ...canvas, offset: constrainedOffset };
        });

        return { ...prev, velocity: newVelocity };
      });

      animationFrame.current = requestAnimationFrame(animate);
    };

    animationFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [interactionState.inertia, onViewportChange]);

  const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getTouchCenter = (touch1: Touch, touch2: Touch): Point2D => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    setCanvasState(prev => ({
      ...prev,
      isDragging: true,
      dragStart: point
    }));

    setInteractionState(prev => ({
      ...prev,
      isPanning: true,
      inertia: false,
      velocity: { x: 0, y: 0 }
    }));

    lastPanTime.current = Date.now();
    lastPanPosition.current = point;
  }, [containerRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasState.isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const deltaX = point.x - canvasState.dragStart.x;
    const deltaY = point.y - canvasState.dragStart.y;

    const newOffset = {
      x: canvasState.offset.x + deltaX,
      y: canvasState.offset.y + deltaY
    };

    // Calculate velocity for inertia
    const now = Date.now();
    const timeDelta = now - lastPanTime.current;
    if (timeDelta > 0) {
      const velocity = {
        x: (point.x - lastPanPosition.current.x) / timeDelta * 16,
        y: (point.y - lastPanPosition.current.y) / timeDelta * 16
      };

      setInteractionState(prev => ({ ...prev, velocity }));
    }

    const constrainedOffset = constrainOffset(newOffset, canvasState.zoom, canvasState.canvasSize);
    
    setCanvasState(prev => ({
      ...prev,
      offset: constrainedOffset,
      dragStart: point
    }));

    onViewportChange?.(constrainedOffset, canvasState.zoom);
    lastPanTime.current = now;
    lastPanPosition.current = point;
  }, [canvasState.isDragging, canvasState.dragStart, canvasState.offset, canvasState.zoom, canvasState.canvasSize, containerRef, onViewportChange, constrainOffset]);

  const handleMouseUp = useCallback(() => {
    setCanvasState(prev => ({ ...prev, isDragging: false }));
    setInteractionState(prev => ({
      ...prev,
      isPanning: false,
      inertia: Math.abs(prev.velocity.x) > 2 || Math.abs(prev.velocity.y) > 2
    }));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touches = e.touches;

    if (touches.length === 1) {
      // Single touch - panning
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const point = {
        x: touches[0].clientX - rect.left,
        y: touches[0].clientY - rect.top
      };

      setCanvasState(prev => ({
        ...prev,
        isDragging: true,
        dragStart: point
      }));

      setInteractionState(prev => ({
        ...prev,
        isPanning: true,
        inertia: false
      }));
    } else if (touches.length === 2) {
      // Two finger - zooming
      const distance = getTouchDistance(touches[0], touches[1]);
      const center = getTouchCenter(touches[0], touches[1]);

      setInteractionState(prev => ({
        ...prev,
        isZooming: true,
        lastTouchDistance: distance,
        touchCenter: center,
        isPanning: false
      }));

      setCanvasState(prev => ({ ...prev, isDragging: false }));
    }
  }, [containerRef]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touches = e.touches;

    if (touches.length === 1 && interactionState.isPanning) {
      // Single touch panning
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const point = {
        x: touches[0].clientX - rect.left,
        y: touches[0].clientY - rect.top
      };

      const deltaX = point.x - canvasState.dragStart.x;
      const deltaY = point.y - canvasState.dragStart.y;

      const newOffset = {
        x: canvasState.offset.x + deltaX,
        y: canvasState.offset.y + deltaY
      };

      const constrainedOffset = constrainOffset(newOffset, canvasState.zoom, canvasState.canvasSize);
      
      setCanvasState(prev => ({
        ...prev,
        offset: constrainedOffset,
        dragStart: point
      }));

      onViewportChange?.(constrainedOffset, canvasState.zoom);
    } else if (touches.length === 2 && interactionState.isZooming) {
      // Two finger zoom
      const distance = getTouchDistance(touches[0], touches[1]);
      const center = getTouchCenter(touches[0], touches[1]);
      
      const zoomDelta = distance / interactionState.lastTouchDistance;
      const newZoom = Math.max(0.5, Math.min(3, canvasState.zoom * zoomDelta));

      // Zoom towards touch center
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const zoomPoint = {
          x: center.x - rect.left,
          y: center.y - rect.top
        };

        const zoomFactor = newZoom / canvasState.zoom;
        const newOffset = {
          x: canvasState.offset.x - (zoomPoint.x - canvasState.offset.x) * (zoomFactor - 1),
          y: canvasState.offset.y - (zoomPoint.y - canvasState.offset.y) * (zoomFactor - 1)
        };

        setCanvasState(prev => ({
          ...prev,
          zoom: newZoom,
          offset: newOffset
        }));

        onViewportChange?.(newOffset, newZoom);
      }

      setInteractionState(prev => ({
        ...prev,
        lastTouchDistance: distance,
        touchCenter: center
      }));
    }
  }, [canvasState, interactionState, containerRef, onViewportChange]);

  const handleTouchEnd = useCallback(() => {
    setCanvasState(prev => ({ ...prev, isDragging: false }));
    setInteractionState(prev => ({
      ...prev,
      isPanning: false,
      isZooming: false,
      inertia: Math.abs(prev.velocity.x) > 2 || Math.abs(prev.velocity.y) > 2
    }));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, canvasState.zoom * zoomDelta));

    const mousePoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const zoomFactor = newZoom / canvasState.zoom;
    const newOffset = {
      x: canvasState.offset.x - (mousePoint.x - canvasState.offset.x) * (zoomFactor - 1),
      y: canvasState.offset.y - (mousePoint.y - canvasState.offset.y) * (zoomFactor - 1)
    };

    setCanvasState(prev => ({
      ...prev,
      zoom: newZoom,
      offset: newOffset
    }));

    onViewportChange?.(newOffset, newZoom);
  }, [canvasState.zoom, canvasState.offset, containerRef, onViewportChange]);

  return {
    canvasState,
    interactionState,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onWheel: handleWheel
    }
  };
};