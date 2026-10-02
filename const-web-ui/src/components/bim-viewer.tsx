'use client';

import { useEffect, useRef, useState } from 'react';
import type { BcfTopic } from '@/lib/types';

interface BimViewerProps {
  topics?: BcfTopic[];
  onSelectTopic?: (topic: BcfTopic) => void;
  selectedTopicId?: string | null;
}

export function BimViewer({ topics = [], onSelectTopic, selectedTopicId }: BimViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeLayer, setActiveLayer] = useState<'all' | 'structure' | 'mep' | 'facade'>('all');
  const [viewMode, setViewMode] = useState<'shaded' | 'wireframe'>('shaded');
  const [cameraView, setCameraView] = useState<'iso' | 'top' | 'front'>('iso');

  // Interactive 3D rotation state
  const stateRef = useRef({
    rotX: 25,
    rotY: -35,
    zoom: 1.0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const project = (x: number, y: number, z: number) => {
      const width = canvas.width || 800;
      const height = canvas.height || 480;
      const cx = width / 2;
      const cy = height / 2 + 50;
      const { rotX, rotY, zoom } = stateRef.current;
      const radX = (rotX * Math.PI) / 180;
      const radY = (rotY * Math.PI) / 180;

      // Rotate around Y
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);
      const x1 = x * cosY - z * sinY;
      const z1 = z * cosY + x * sinY;

      // Rotate around X
      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = z1 * cosX + y * sinX;

      // Scale & perspective
      const scale = zoom * 1.8;
      return {
        px: cx + x1 * scale,
        py: cy - y2 * scale,
        depth: z2,
      };
    };

    const render = () => {
      const width = canvas.width = canvas.parentElement?.clientWidth || 800;
      const height = canvas.height = 480;

      ctx.clearRect(0, 0, width, height);

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw ground grid
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (let g = -200; g <= 200; g += 40) {
        const p1 = project(g, 0, -200);
        const p2 = project(g, 0, 200);
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();

        const p3 = project(-200, 0, g);
        const p4 = project(200, 0, g);
        ctx.beginPath();
        ctx.moveTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p4.py);
        ctx.stroke();
      }

      // Building 3D Blocks (Foundation, Levels 1-3, Roof, MEP Core)
      type Block = {
        name: string;
        layer: 'structure' | 'mep' | 'facade';
        x: number; y: number; z: number;
        w: number; h: number; d: number;
        color: string;
        alpha: number;
      };

      const blocks: Block[] = [
        // Foundation Slab
        { name: 'Foundation', layer: 'structure', x: -140, y: 0, z: -100, w: 280, h: 15, d: 200, color: '#64748b', alpha: 0.9 },
        // Level 1 Columns & Slab
        { name: 'L1 Slab', layer: 'structure', x: -130, y: 55, z: -90, w: 260, h: 10, d: 180, color: '#94a3b8', alpha: 0.8 },
        // Level 2 Slab
        { name: 'L2 Slab', layer: 'structure', x: -130, y: 110, z: -90, w: 260, h: 10, d: 180, color: '#cbd5e1', alpha: 0.8 },
        // Roof Structure
        { name: 'Roof', layer: 'structure', x: -135, y: 165, z: -95, w: 270, h: 12, d: 190, color: '#475569', alpha: 0.9 },
        // MEP Core / HVAC Shaft
        { name: 'MEP Shaft', layer: 'mep', x: 40, y: 15, z: -40, w: 60, h: 160, d: 60, color: '#f59e0b', alpha: 0.85 },
        // Facade Glass Envelope
        { name: 'Glass Facade', layer: 'facade', x: -135, y: 15, z: -95, w: 270, h: 150, d: 190, color: '#38bdf8', alpha: 0.3 },
      ];

      // Draw 3D Box function
      const drawBox = (b: Block) => {
        if (activeLayer !== 'all' && b.layer !== activeLayer) return;

        const { x, y, z, w, h, d, color, alpha } = b;
        const v = [
          project(x, y, z), // 0
          project(x + w, y, z), // 1
          project(x + w, y, z + d), // 2
          project(x, y, z + d), // 3
          project(x, y + h, z), // 4
          project(x + w, y + h, z), // 5
          project(x + w, y + h, z + d), // 6
          project(x, y + h, z + d), // 7
        ];

        ctx.globalAlpha = viewMode === 'wireframe' ? 0.6 : alpha;
        ctx.lineWidth = 1.5;

        if (viewMode === 'shaded') {
          // Top face
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(v[4].px, v[4].py);
          ctx.lineTo(v[5].px, v[5].py);
          ctx.lineTo(v[6].px, v[6].py);
          ctx.lineTo(v[7].px, v[7].py);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.stroke();

          // Front face
          ctx.beginPath();
          ctx.moveTo(v[3].px, v[3].py);
          ctx.lineTo(v[2].px, v[2].py);
          ctx.lineTo(v[6].px, v[6].py);
          ctx.lineTo(v[7].px, v[7].py);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Side face
          ctx.beginPath();
          ctx.moveTo(v[1].px, v[1].py);
          ctx.lineTo(v[2].px, v[2].py);
          ctx.lineTo(v[6].px, v[6].py);
          ctx.lineTo(v[5].px, v[5].py);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Wireframe mode
          ctx.strokeStyle = color;
          const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7],
          ];
          for (const [s, e] of edges) {
            ctx.beginPath();
            ctx.moveTo(v[s].px, v[s].py);
            ctx.lineTo(v[e].px, v[e].py);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1.0;
      };

      // Draw all building elements
      blocks.forEach(drawBox);

      // Render 3D BCF Topic Pinpoints
      topics.forEach((t, i) => {
        // Map topic to fixed simulated 3D coordinates based on index/location
        const coords = [
          { x: -50, y: 70, z: 20 },
          { x: 30, y: 125, z: -30 },
          { x: -90, y: 30, z: -50 },
          { x: 70, y: 90, z: 40 },
        ][i % 4];

        const pt = project(coords.x, coords.y, coords.z);
        const isSelected = selectedTopicId === t.id;

        // Draw glowing marker pin
        ctx.save();
        ctx.fillStyle = isSelected ? '#ef4444' : '#38bdf8';
        ctx.shadowColor = isSelected ? '#ef4444' : '#38bdf8';
        ctx.shadowBlur = isSelected ? 16 : 8;

        ctx.beginPath();
        ctx.arc(pt.px, pt.py, isSelected ? 9 : 6, 0, Math.PI * 2);
        ctx.fill();

        // Pin border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label tooltip
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillText(`BCF: ${t.title.slice(0, 18)}...`, pt.px + 12, pt.py + 4);
        ctx.restore();
      });

      // Status watermark overlay
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText(`BIM Engine: WebGL/Canvas3D | Layers: ${activeLayer.toUpperCase()} | Mode: ${viewMode.toUpperCase()}`, 16, height - 16);
    };

    render();

    // Mouse drag rotation listeners
    const handleMouseDown = (e: MouseEvent) => {
      stateRef.current.isDragging = true;
      stateRef.current.lastX = e.clientX;
      stateRef.current.lastY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!stateRef.current.isDragging) return;
      const dx = e.clientX - stateRef.current.lastX;
      const dy = e.clientY - stateRef.current.lastY;
      stateRef.current.rotY += dx * 0.5;
      stateRef.current.rotX = Math.max(-80, Math.min(80, stateRef.current.rotX - dy * 0.5));
      stateRef.current.lastX = e.clientX;
      stateRef.current.lastY = e.clientY;
      render();
    };

    const handleMouseUp = () => {
      stateRef.current.isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      stateRef.current.zoom = Math.max(0.4, Math.min(2.5, stateRef.current.zoom - e.deltaY * 0.0015));
      render();
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      topics.forEach((t, i) => {
        const coords = [
          { x: -50, y: 70, z: 20 },
          { x: 30, y: 125, z: -30 },
          { x: -90, y: 30, z: -50 },
          { x: 70, y: 90, z: 40 },
        ][i % 4];
        const pt = project(coords.x, coords.y, coords.z);
        const dist = Math.hypot(pt.px - clickX, pt.py - clickY);
        if (dist < 20 && onSelectTopic) {
          onSelectTopic(t);
        }
      });
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [activeLayer, viewMode, topics, selectedTopicId, onSelectTopic]);

  const setCamera = (type: 'iso' | 'top' | 'front') => {
    setCameraView(type);
    if (type === 'iso') {
      stateRef.current.rotX = 25;
      stateRef.current.rotY = -35;
    } else if (type === 'top') {
      stateRef.current.rotX = 80;
      stateRef.current.rotY = 0;
    } else if (type === 'front') {
      stateRef.current.rotX = 0;
      stateRef.current.rotY = 0;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-[480px] cursor-grab active:cursor-grabbing block"
      />

      {/* Floating Toolbar Controls */}
      <div className="absolute top-4 left-4 flex flex-wrap gap-2 rounded-lg bg-slate-900/80 p-1.5 backdrop-blur border border-slate-700">
        <span className="px-2 py-1 text-xs font-semibold text-slate-400">View:</span>
        <button
          type="button"
          onClick={() => setCamera('iso')}
          className={`px-2.5 py-1 text-xs rounded font-medium transition ${
            cameraView === 'iso' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          Isometric
        </button>
        <button
          type="button"
          onClick={() => setCamera('top')}
          className={`px-2.5 py-1 text-xs rounded font-medium transition ${
            cameraView === 'top' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          Top Plan
        </button>
        <button
          type="button"
          onClick={() => setCamera('front')}
          className={`px-2.5 py-1 text-xs rounded font-medium transition ${
            cameraView === 'front' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          Front Elevation
        </button>
      </div>

      {/* Layer Filter Toolbar */}
      <div className="absolute top-4 right-4 flex flex-wrap gap-2 rounded-lg bg-slate-900/80 p-1.5 backdrop-blur border border-slate-700">
        <span className="px-2 py-1 text-xs font-semibold text-slate-400">Layer:</span>
        {(['all', 'structure', 'mep', 'facade'] as const).map((layer) => (
          <button
            key={layer}
            type="button"
            onClick={() => setActiveLayer(layer)}
            className={`px-2.5 py-1 text-xs rounded font-medium capitalize transition ${
              activeLayer === layer ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {layer}
          </button>
        ))}
        <div className="h-5 w-px bg-slate-700 my-auto" />
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'shaded' ? 'wireframe' : 'shaded')}
          className="px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium"
        >
          {viewMode === 'shaded' ? '🔲 Wireframe' : '🎨 Shaded'}
        </button>
      </div>

      {/* Instructions pill */}
      <div className="absolute bottom-4 right-4 rounded bg-slate-900/70 px-3 py-1 text-xs text-slate-400 border border-slate-800">
        🖱️ Click & Drag to Orbit · Scroll to Zoom
      </div>
    </div>
  );
}
