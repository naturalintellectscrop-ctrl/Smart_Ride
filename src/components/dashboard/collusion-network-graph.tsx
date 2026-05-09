'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Network,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Filter,
  Users,
  AlertTriangle,
  Clock,
  Maximize2,
  Minimize2,
  Info,
  X,
  RefreshCw,
  User,
  Bike,
  Link2,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types and Interfaces
// ============================================

export type NodeType = 'rider' | 'client';
export type RiskLevel = 'high' | 'medium' | 'low';

export interface NetworkNode {
  id: string;
  name: string;
  type: NodeType;
  riskScore: number;
  interactionCount: number;
  phoneNumber?: string;
  email?: string;
  lastActive: string;
  totalRides: number;
  totalEarnings?: number;
  location?: string;
  flaggedReasons?: string[];
}

export interface NetworkEdge {
  id: string;
  sourceId: string;
  targetId: string;
  rideCount: number;
  totalAmount: number;
  lastRide: string;
  avgRating: number;
  suspiciousScore: number; // 0-100, higher = more suspicious
  isFlagged: boolean;
  flagReason?: string;
}

export interface CollusionNetwork {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  stats: NetworkStats;
}

export interface NetworkStats {
  totalNodes: number;
  totalEdges: number;
  highRiskNodes: number;
  suspiciousConnections: number;
  avgRiskScore: number;
  flaggedEdges: number;
}

export interface TimeFilter {
  value: string;
  label: string;
  hours: number;
}

// ============================================
// Configuration
// ============================================

const TIME_FILTERS: TimeFilter[] = [
  { value: '24h', label: 'Last 24 Hours', hours: 24 },
  { value: '7d', label: 'Last 7 Days', hours: 168 },
  { value: '30d', label: 'Last 30 Days', hours: 720 },
  { value: 'all', label: 'All Time', hours: 0 },
];

const RISK_COLORS = {
  high: {
    fill: '#ef4444',
    stroke: '#dc2626',
    glow: 'rgba(239, 68, 68, 0.6)',
  },
  medium: {
    fill: '#f97316',
    stroke: '#ea580c',
    glow: 'rgba(249, 115, 22, 0.5)',
  },
  low: {
    fill: '#22c55e',
    stroke: '#16a34a',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
};

const NODE_TYPE_COLORS = {
  rider: {
    fill: '#a855f7', // Purple
    stroke: '#9333ea',
    glow: 'rgba(168, 85, 247, 0.5)',
  },
  client: {
    fill: '#3b82f6', // Blue
    stroke: '#2563eb',
    glow: 'rgba(59, 130, 246, 0.5)',
  },
};

// ============================================
// Mock Data Generator
// ============================================

function generateMockData(): CollusionNetwork {
  const riders: NetworkNode[] = [
    { id: 'r1', name: 'John Mwangi', type: 'rider', riskScore: 78, interactionCount: 145, phoneNumber: '+254712345678', lastActive: new Date().toISOString(), totalRides: 1234, totalEarnings: 156780, location: 'Nairobi CBD', flaggedReasons: ['Multiple device logins', 'GPS spoofing detected'] },
    { id: 'r2', name: 'Peter Kamau', type: 'rider', riskScore: 45, interactionCount: 89, phoneNumber: '+254723456789', lastActive: new Date().toISOString(), totalRides: 567, totalEarnings: 78900, location: 'Westlands' },
    { id: 'r3', name: 'James Ochieng', type: 'rider', riskScore: 85, interactionCount: 234, phoneNumber: '+254734567890', lastActive: new Date().toISOString(), totalRides: 2345, totalEarnings: 289000, location: 'Kilimani', flaggedReasons: ['Unusual ride patterns', 'Same client repeatedly', 'Off-platform payments'] },
    { id: 'r4', name: 'David Kimani', type: 'rider', riskScore: 22, interactionCount: 56, phoneNumber: '+254745678901', lastActive: new Date().toISOString(), totalRides: 234, totalEarnings: 34500, location: 'Karen' },
    { id: 'r5', name: 'Michael Njoroge', type: 'rider', riskScore: 67, interactionCount: 178, phoneNumber: '+254756789012', lastActive: new Date().toISOString(), totalRides: 1890, totalEarnings: 234500, location: 'Lavington', flaggedReasons: ['High cancellation rate', 'Short trip patterns'] },
    { id: 'r6', name: 'Samuel Wainaina', type: 'rider', riskScore: 34, interactionCount: 67, phoneNumber: '+254767890123', lastActive: new Date().toISOString(), totalRides: 456, totalEarnings: 56700, location: 'Kileleshwa' },
    { id: 'r7', name: 'Joseph Mutua', type: 'rider', riskScore: 91, interactionCount: 312, phoneNumber: '+254778901234', lastActive: new Date().toISOString(), totalRides: 3456, totalEarnings: 456000, location: 'Upper Hill', flaggedReasons: ['Collusion suspected', 'Multiple fake accounts', 'GPS manipulation'] },
    { id: 'r8', name: 'Daniel Omondi', type: 'rider', riskScore: 15, interactionCount: 23, phoneNumber: '+254789012345', lastActive: new Date().toISOString(), totalRides: 89, totalEarnings: 12300, location: 'South B' },
  ];

  const clients: NetworkNode[] = [
    { id: 'c1', name: 'Alice Wanjiku', type: 'client', riskScore: 72, interactionCount: 89, phoneNumber: '+254700111222', lastActive: new Date().toISOString(), totalRides: 456, location: 'Nairobi', flaggedReasons: ['Frequent complaints', 'Multiple accounts'] },
    { id: 'c2', name: 'Grace Nyambura', type: 'client', riskScore: 28, interactionCount: 34, phoneNumber: '+254700222333', lastActive: new Date().toISOString(), totalRides: 123, location: 'Westlands' },
    { id: 'c3', name: 'Mary Akinyi', type: 'client', riskScore: 88, interactionCount: 156, phoneNumber: '+254700333444', lastActive: new Date().toISOString(), totalRides: 789, location: 'Kilimani', flaggedReasons: ['Promo abuse', 'Fake delivery addresses', 'Collusion with rider'] },
    { id: 'c4', name: 'Jane Wambui', type: 'client', riskScore: 19, interactionCount: 12, phoneNumber: '+254700444555', lastActive: new Date().toISOString(), totalRides: 45, location: 'Karen' },
    { id: 'c5', name: 'Sarah Muthoni', type: 'client', riskScore: 56, interactionCount: 78, phoneNumber: '+254700555666', lastActive: new Date().toISOString(), totalRides: 234, location: 'Lavington', flaggedReasons: ['Multiple refund requests'] },
    { id: 'c6', name: 'Elizabeth Atieno', type: 'client', riskScore: 42, interactionCount: 45, phoneNumber: '+254700666777', lastActive: new Date().toISOString(), totalRides: 167, location: 'Kileleshwa' },
    { id: 'c7', name: 'Faith Wairimu', type: 'client', riskScore: 94, interactionCount: 234, phoneNumber: '+254700777888', lastActive: new Date().toISOString(), totalRides: 1234, location: 'Upper Hill', flaggedReasons: ['Organized fraud ring', 'Multiple fake identities', 'Money laundering pattern'] },
    { id: 'c8', name: 'Ruth Njeri', type: 'client', riskScore: 31, interactionCount: 23, phoneNumber: '+254700888999', lastActive: new Date().toISOString(), totalRides: 78, location: 'South B' },
  ];

  const edges: NetworkEdge[] = [
    { id: 'e1', sourceId: 'r1', targetId: 'c1', rideCount: 45, totalAmount: 23400, lastRide: new Date().toISOString(), avgRating: 4.2, suspiciousScore: 78, isFlagged: true, flagReason: 'High frequency rides with same client' },
    { id: 'e2', sourceId: 'r1', targetId: 'c3', rideCount: 67, totalAmount: 45600, lastRide: new Date().toISOString(), avgRating: 4.8, suspiciousScore: 85, isFlagged: true, flagReason: 'Both parties high risk, unusual patterns' },
    { id: 'e3', sourceId: 'r3', targetId: 'c3', rideCount: 123, totalAmount: 89000, lastRide: new Date().toISOString(), avgRating: 5.0, suspiciousScore: 95, isFlagged: true, flagReason: 'Suspected collusion ring' },
    { id: 'e4', sourceId: 'r3', targetId: 'c7', rideCount: 89, totalAmount: 67000, lastRide: new Date().toISOString(), avgRating: 4.9, suspiciousScore: 92, isFlagged: true, flagReason: 'Organized fraud pattern detected' },
    { id: 'e5', sourceId: 'r7', targetId: 'c7', rideCount: 156, totalAmount: 123000, lastRide: new Date().toISOString(), avgRating: 5.0, suspiciousScore: 98, isFlagged: true, flagReason: 'Primary collusion ring members' },
    { id: 'e6', sourceId: 'r7', targetId: 'c3', rideCount: 78, totalAmount: 56000, lastRide: new Date().toISOString(), avgRating: 4.7, suspiciousScore: 88, isFlagged: true, flagReason: 'Connected to fraud network' },
    { id: 'e7', sourceId: 'r5', targetId: 'c5', rideCount: 34, totalAmount: 18000, lastRide: new Date().toISOString(), avgRating: 4.3, suspiciousScore: 45, isFlagged: false },
    { id: 'e8', sourceId: 'r2', targetId: 'c2', rideCount: 23, totalAmount: 8900, lastRide: new Date().toISOString(), avgRating: 4.5, suspiciousScore: 22, isFlagged: false },
    { id: 'e9', sourceId: 'r4', targetId: 'c4', rideCount: 12, totalAmount: 4500, lastRide: new Date().toISOString(), avgRating: 4.8, suspiciousScore: 15, isFlagged: false },
    { id: 'e10', sourceId: 'r6', targetId: 'c6', rideCount: 18, totalAmount: 7800, lastRide: new Date().toISOString(), avgRating: 4.6, suspiciousScore: 28, isFlagged: false },
    { id: 'e11', sourceId: 'r5', targetId: 'c7', rideCount: 45, totalAmount: 28000, lastRide: new Date().toISOString(), avgRating: 4.4, suspiciousScore: 67, isFlagged: true, flagReason: 'Connected to high-risk client' },
    { id: 'e12', sourceId: 'r1', targetId: 'c5', rideCount: 28, totalAmount: 14500, lastRide: new Date().toISOString(), avgRating: 4.1, suspiciousScore: 52, isFlagged: false },
    { id: 'e13', sourceId: 'r8', targetId: 'c8', rideCount: 8, totalAmount: 3200, lastRide: new Date().toISOString(), avgRating: 4.9, suspiciousScore: 8, isFlagged: false },
    { id: 'e14', sourceId: 'r7', targetId: 'c1', rideCount: 67, totalAmount: 45000, lastRide: new Date().toISOString(), avgRating: 4.6, suspiciousScore: 75, isFlagged: true, flagReason: 'High-risk rider with elevated client' },
  ];

  const stats: NetworkStats = {
    totalNodes: riders.length + clients.length,
    totalEdges: edges.length,
    highRiskNodes: [...riders, ...clients].filter(n => n.riskScore >= 60).length,
    suspiciousConnections: edges.filter(e => e.suspiciousScore >= 60).length,
    avgRiskScore: Math.round([...riders, ...clients].reduce((sum, n) => sum + n.riskScore, 0) / (riders.length + clients.length)),
    flaggedEdges: edges.filter(e => e.isFlagged).length,
  };

  return { nodes: [...riders, ...clients], edges, stats };
}

// ============================================
// Helper Functions
// ============================================

function getRiskLevel(score: number): RiskLevel {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function getNodeColor(node: NetworkNode): { fill: string; stroke: string; glow: string } {
  const riskLevel = getRiskLevel(node.riskScore);
  
  // For high risk, show risk color; otherwise show type color
  if (riskLevel === 'high') {
    return RISK_COLORS.high;
  }
  
  return node.type === 'rider' ? NODE_TYPE_COLORS.rider : NODE_TYPE_COLORS.client;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatTimeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ============================================
// Canvas Rendering Functions
// ============================================

interface NodePosition extends NetworkNode {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
}

interface EdgeRender extends NetworkEdge {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  thickness: number;
}

function calculateNodePositions(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  width: number,
  height: number,
  zoom: number,
  pan: { x: number; y: number }
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const centerX = width / 2;
  const centerY = height / 2;

  // Separate riders and clients
  const riders = nodes.filter(n => n.type === 'rider');
  const clients = nodes.filter(n => n.type === 'client');

  // Arrange riders on left side, clients on right side
  const riderRadius = Math.min(width, height) * 0.35;
  const clientRadius = Math.min(width, height) * 0.35;

  riders.forEach((node, i) => {
    const angle = (Math.PI * 2 * i) / riders.length - Math.PI / 2;
    const baseRadius = Math.max(10, 15 + node.interactionCount / 10);
    positions.set(node.id, {
      ...node,
      x: centerX - width * 0.25 + Math.cos(angle) * riderRadius,
      y: centerY + Math.sin(angle) * riderRadius,
      radius: baseRadius,
      vx: 0,
      vy: 0,
    });
  });

  clients.forEach((node, i) => {
    const angle = (Math.PI * 2 * i) / clients.length + Math.PI / 2;
    const baseRadius = Math.max(10, 15 + node.interactionCount / 10);
    positions.set(node.id, {
      ...node,
      x: centerX + width * 0.25 + Math.cos(angle) * clientRadius,
      y: centerY + Math.sin(angle) * clientRadius,
      radius: baseRadius,
      vx: 0,
      vy: 0,
    });
  });

  return positions;
}

// ============================================
// Main Component
// ============================================

export function CollusionNetworkGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // Data state
  const [networkData, setNetworkData] = useState<CollusionNetwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter state
  const [timeFilter, setTimeFilter] = useState('7d');
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Interaction state
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<NetworkEdge | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<NetworkEdge | null>(null);

  // Node positions
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map());

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      // In a real app, this would be an API call
      // const response = await fetch('/api/fraud/collusion-network');
      // const data = await response.json();
      
      // Using mock data for now
      const data = generateMockData();
      setNetworkData(data);
    } catch (error) {
      console.error('Error fetching collusion network data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate positions when data changes
  useEffect(() => {
    if (!networkData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const positions = calculateNodePositions(
      networkData.nodes,
      networkData.edges,
      canvas.width,
      canvas.height,
      zoom,
      pan
    );
    setNodePositions(positions);
  }, [networkData, zoom, pan]);

  // Canvas rendering
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !networkData) return;

    // Clear canvas with dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw grid pattern
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw edges first (behind nodes)
    networkData.edges.forEach(edge => {
      const source = nodePositions.get(edge.sourceId);
      const target = nodePositions.get(edge.targetId);
      if (!source || !target) return;

      // Apply filters
      if (showFlaggedOnly && !edge.isFlagged) return;
      if (riskFilter !== 'all') {
        const sourceRisk = getRiskLevel(source.riskScore);
        const targetRisk = getRiskLevel(target.riskScore);
        if (sourceRisk !== riskFilter && targetRisk !== riskFilter) return;
      }

      // Calculate edge thickness based on ride count
      const thickness = Math.max(1, Math.min(8, edge.rideCount / 20));

      // Edge color based on suspicious score
      let edgeColor = 'rgba(148, 163, 184, 0.3)';
      if (edge.isFlagged) {
        const intensity = edge.suspiciousScore / 100;
        edgeColor = `rgba(239, 68, 68, ${0.3 + intensity * 0.5})`;
      }

      // Draw edge
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = thickness;
      ctx.stroke();

      // Draw glow for flagged edges
      if (edge.isFlagged && edge.suspiciousScore >= 70) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.2})`;
        ctx.lineWidth = thickness + 6;
        ctx.stroke();

        // Animated glow effect (pulsing)
        const glowIntensity = (Math.sin(Date.now() / 500) + 1) / 2 * 0.3;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = `rgba(239, 68, 68, ${glowIntensity})`;
        ctx.lineWidth = thickness + 12;
        ctx.stroke();
      }

      // Check if this edge is hovered
      if (hoveredEdge?.id === edge.id) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.lineWidth = thickness + 2;
        ctx.stroke();
      }
    });

    // Draw nodes
    nodePositions.forEach((node, id) => {
      // Apply filters
      if (riskFilter !== 'all' && getRiskLevel(node.riskScore) !== riskFilter) return;
      if (showFlaggedOnly && !node.flaggedReasons?.length) {
        // Check if node is connected to any flagged edge
        const hasFlaggedEdge = networkData.edges.some(
          e => (e.sourceId === id || e.targetId === id) && e.isFlagged
        );
        if (!hasFlaggedEdge) return;
      }

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!node.name.toLowerCase().includes(query) && !node.id.toLowerCase().includes(query)) {
          return;
        }
      }

      const colors = getNodeColor(node);
      const isHovered = hoveredNode?.id === id;
      const isSelected = selectedNode?.id === id;

      // Draw glow for high-risk or hovered nodes
      if (node.riskScore >= 60 || isHovered || isSelected) {
        const glowRadius = node.radius + 10;
        const gradient = ctx.createRadialGradient(
          node.x, node.y, node.radius,
          node.x, node.y, glowRadius
        );
        gradient.addColorStop(0, colors.glow);
        gradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw node
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = colors.fill;
      ctx.fill();
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = isHovered || isSelected ? 3 : 2;
      ctx.stroke();

      // Draw node icon/label
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.max(8, node.radius * 0.6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (node.type === 'rider') {
        ctx.fillText('R', node.x, node.y);
      } else {
        ctx.fillText('C', node.x, node.y);
      }

      // Draw risk score badge for high-risk nodes
      if (node.riskScore >= 60) {
        const badgeX = node.x + node.radius * 0.7;
        const badgeY = node.y - node.radius * 0.7;
        const badgeRadius = 10;
        
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText(node.riskScore.toString(), badgeX, badgeY);
      }
    });

    ctx.restore();

    // Animation loop for glow effects
    animationRef.current = requestAnimationFrame(renderCanvas);
  }, [networkData, nodePositions, zoom, pan, hoveredNode, hoveredEdge, selectedNode, riskFilter, showFlaggedOnly, searchQuery]);

  // Start rendering
  useEffect(() => {
    if (networkData) {
      animationRef.current = requestAnimationFrame(renderCanvas);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [networkData, renderCanvas]);

  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width;
        canvasRef.current.height = rect.height;
        
        // Recalculate positions
        if (networkData) {
          const positions = calculateNodePositions(
            networkData.nodes,
            networkData.edges,
            rect.width,
            rect.height,
            zoom,
            pan
          );
          setNodePositions(positions);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [networkData, zoom, pan]);

  // Mouse interactions
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !networkData) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - canvas.width / 2 - pan.x) / zoom + canvas.width / 2;
    const y = (e.clientY - rect.top - canvas.height / 2 - pan.y) / zoom + canvas.height / 2;

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    // Check for node hover
    let foundNode: NetworkNode | null = null;
    let foundEdge: NetworkEdge | null = null;

    nodePositions.forEach((node) => {
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= node.radius) {
        foundNode = node;
      }
    });

    // Check for edge hover if no node found
    if (!foundNode) {
      for (const edge of networkData.edges) {
        const source = nodePositions.get(edge.sourceId);
        const target = nodePositions.get(edge.targetId);
        if (!source || !target) continue;

        // Distance from point to line segment
        const lineLength = Math.sqrt(
          (target.x - source.x) ** 2 + (target.y - source.y) ** 2
        );
        const t = Math.max(0, Math.min(1, 
          ((x - source.x) * (target.x - source.x) + (y - source.y) * (target.y - source.y)) / (lineLength ** 2)
        ));
        const closestX = source.x + t * (target.x - source.x);
        const closestY = source.y + t * (target.y - source.y);
        const distance = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);

        if (distance <= 10) {
          foundEdge = edge;
          break;
        }
      }
    }

    setHoveredNode(foundNode);
    setHoveredEdge(foundEdge);
    canvas.style.cursor = foundNode || foundEdge ? 'pointer' : 'grab';
  }, [isDragging, dragStart, zoom, pan, networkData, nodePositions]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNode || hoveredEdge) return;
    
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grabbing';
    }
  }, [hoveredNode, hoveredEdge, pan]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = hoveredNode || hoveredEdge ? 'pointer' : 'grab';
    }
  }, [hoveredNode, hoveredEdge]);

  const handleClick = useCallback(() => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode);
      setSelectedEdge(null);
    } else if (hoveredEdge) {
      setSelectedEdge(hoveredEdge);
      setSelectedNode(null);
    }
  }, [hoveredNode, hoveredEdge]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(3, Math.max(0.3, prev * delta)));
  }, []);

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(3, prev * 1.2));
  const handleZoomOut = () => setZoom(prev => Math.max(0.3, prev / 1.2));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Filtered stats
  const filteredStats = useMemo(() => {
    if (!networkData) return null;
    
    let filteredNodes = networkData.nodes;
    let filteredEdges = networkData.edges;

    if (riskFilter !== 'all') {
      filteredNodes = filteredNodes.filter(n => getRiskLevel(n.riskScore) === riskFilter);
      filteredEdges = filteredEdges.filter(e => {
        const source = networkData.nodes.find(n => n.id === e.sourceId);
        const target = networkData.nodes.find(n => n.id === e.targetId);
        return source && target && (getRiskLevel(source.riskScore) === riskFilter || getRiskLevel(target.riskScore) === riskFilter);
      });
    }

    if (showFlaggedOnly) {
      filteredEdges = filteredEdges.filter(e => e.isFlagged);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(n => 
        n.name.toLowerCase().includes(query) || n.id.toLowerCase().includes(query)
      );
    }

    return {
      nodes: filteredNodes.length,
      edges: filteredEdges.length,
      highRisk: filteredNodes.filter(n => n.riskScore >= 60).length,
      flagged: filteredEdges.filter(e => e.isFlagged).length,
    };
  }, [networkData, riskFilter, showFlaggedOnly, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px] bg-slate-900 rounded-xl">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className={cn(
      "space-y-4",
      isFullscreen && "fixed inset-0 z-50 bg-slate-900 p-4"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Network className="h-7 w-7 text-emerald-500" />
            Collusion Network Graph
          </h1>
          <p className="text-slate-400 mt-1">Visualize rider-client connections and detect fraud patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatBadge
          icon={Users}
          label="Total Nodes"
          value={filteredStats?.nodes || 0}
          color="blue"
        />
        <StatBadge
          icon={Link2}
          label="Connections"
          value={filteredStats?.edges || 0}
          color="purple"
        />
        <StatBadge
          icon={AlertTriangle}
          label="High Risk"
          value={filteredStats?.highRisk || 0}
          color="red"
        />
        <StatBadge
          icon={Shield}
          label="Flagged"
          value={filteredStats?.flagged || 0}
          color="orange"
        />
        <StatBadge
          icon={TrendingUp}
          label="Avg Risk Score"
          value={networkData?.stats.avgRiskScore || 0}
          color="emerald"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
        <Search className="h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
        />
        
        <div className="flex items-center gap-2 ml-4">
          <Clock className="h-4 w-4 text-slate-400" />
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              {TIME_FILTERS.map(filter => (
                <SelectItem key={filter.value} value={filter.value} className="text-white hover:bg-slate-800">
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as typeof riskFilter)}>
            <SelectTrigger className="w-32 bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white hover:bg-slate-800">All Risk</SelectItem>
              <SelectItem value="high" className="text-red-400 hover:bg-slate-800">High (≥60)</SelectItem>
              <SelectItem value="medium" className="text-orange-400 hover:bg-slate-800">Medium (30-59)</SelectItem>
              <SelectItem value="low" className="text-green-400 hover:bg-slate-800">Low (&lt;30)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant={showFlaggedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
          className={cn(
            "ml-4",
            showFlaggedOnly 
              ? "bg-red-600 hover:bg-red-700 text-white" 
              : "border-slate-700 text-slate-300 hover:bg-slate-700"
          )}
        >
          <AlertTriangle className="h-4 w-4 mr-1" />
          Flagged Only
        </Button>
      </div>

      {/* Main Canvas Area */}
      <div className="flex gap-4">
        {/* Canvas */}
        <div 
          ref={containerRef}
          className="flex-1 relative rounded-xl overflow-hidden border border-slate-700"
          style={{ height: isFullscreen ? 'calc(100vh - 200px)' : '600px' }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleClick}
            onWheel={handleWheel}
          />

          {/* Zoom Controls */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-800/90 backdrop-blur rounded-lg p-1 border border-slate-700">
            <Button variant="ghost" size="icon" onClick={handleZoomOut} className="text-slate-300 hover:bg-slate-700">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={handleZoomIn} className="text-slate-300 hover:bg-slate-700">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-slate-700" />
            <Button variant="ghost" size="icon" onClick={handleResetView} className="text-slate-300 hover:bg-slate-700">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Legend */}
          <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur rounded-lg p-3 border border-slate-700">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Legend</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-xs text-slate-300">Riders</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs text-slate-300">Clients</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-slate-300">High Risk (≥60)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-xs text-slate-300">Medium Risk (30-59)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-slate-300">Low Risk (&lt;30)</span>
              </div>
              <div className="border-t border-slate-700 pt-2 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-red-500/50" />
                  <span className="text-xs text-slate-300">Flagged Connection</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hover Tooltip */}
          {hoveredNode && (
            <div className="absolute bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl pointer-events-none" style={{
              left: Math.min(containerRef.current?.clientWidth || 400, 200),
              top: 20,
            }}>
              <div className="flex items-center gap-2 mb-2">
                {hoveredNode.type === 'rider' ? (
                  <Bike className="h-4 w-4 text-purple-400" />
                ) : (
                  <User className="h-4 w-4 text-blue-400" />
                )}
                <span className="font-medium text-white">{hoveredNode.name}</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Risk Score:</span>
                  <span className={cn(
                    "font-medium",
                    hoveredNode.riskScore >= 60 ? "text-red-400" :
                    hoveredNode.riskScore >= 30 ? "text-orange-400" : "text-green-400"
                  )}>{hoveredNode.riskScore}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Interactions:</span>
                  <span className="text-white">{hoveredNode.interactionCount}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Total Rides:</span>
                  <span className="text-white">{hoveredNode.totalRides}</span>
                </div>
              </div>
              {hoveredNode.flaggedReasons && hoveredNode.flaggedReasons.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <p className="text-xs text-red-400">⚠ {hoveredNode.flaggedReasons[0]}</p>
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2">Click for details</p>
            </div>
          )}

          {/* Edge Hover Tooltip */}
          {hoveredEdge && !hoveredNode && (
            <div className="absolute bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl pointer-events-none" style={{
              left: 20,
              top: 20,
            }}>
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-white">Connection Details</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Rides:</span>
                  <span className="text-white">{hoveredEdge.rideCount}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Total Amount:</span>
                  <span className="text-white">{formatCurrency(hoveredEdge.totalAmount)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Suspicious Score:</span>
                  <span className={cn(
                    "font-medium",
                    hoveredEdge.suspiciousScore >= 70 ? "text-red-400" :
                    hoveredEdge.suspiciousScore >= 40 ? "text-orange-400" : "text-green-400"
                  )}>{hoveredEdge.suspiciousScore}</span>
                </div>
              </div>
              {hoveredEdge.isFlagged && (
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <p className="text-xs text-red-400">⚠ {hoveredEdge.flagReason}</p>
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2">Click for details</p>
            </div>
          )}
        </div>
      </div>

      {/* Node Detail Dialog */}
      <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNode?.type === 'rider' ? (
                <Bike className="h-5 w-5 text-purple-400" />
              ) : (
                <User className="h-5 w-5 text-blue-400" />
              )}
              {selectedNode?.name}
              <Badge className={cn(
                "ml-2",
                selectedNode && selectedNode.riskScore >= 60 ? "bg-red-600" :
                selectedNode && selectedNode.riskScore >= 30 ? "bg-orange-600" : "bg-green-600"
              )}>
                Risk: {selectedNode?.riskScore}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedNode && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">ID</p>
                  <p className="font-mono text-sm">{selectedNode.id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Type</p>
                  <Badge variant="outline" className={cn(
                    selectedNode.type === 'rider' ? "border-purple-500 text-purple-400" : "border-blue-500 text-blue-400"
                  )}>
                    {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Phone</p>
                  <p className="text-sm">{selectedNode.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Location</p>
                  <p className="text-sm">{selectedNode.location || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Rides</p>
                  <p className="text-sm font-medium">{selectedNode.totalRides}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Interaction Count</p>
                  <p className="text-sm font-medium">{selectedNode.interactionCount}</p>
                </div>
                {selectedNode.type === 'rider' && selectedNode.totalEarnings && (
                  <div className="col-span-2">
                    <p className="text-sm text-slate-400">Total Earnings</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(selectedNode.totalEarnings)}</p>
                  </div>
                )}
              </div>

              {/* Risk Score Bar */}
              <div>
                <p className="text-sm text-slate-400 mb-2">Risk Score</p>
                <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      selectedNode.riskScore >= 60 ? "bg-red-500" :
                      selectedNode.riskScore >= 30 ? "bg-orange-500" : "bg-green-500"
                    )}
                    style={{ width: `${selectedNode.riskScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0</span>
                  <span>30</span>
                  <span>60</span>
                  <span>100</span>
                </div>
              </div>

              {/* Flagged Reasons */}
              {selectedNode.flaggedReasons && selectedNode.flaggedReasons.length > 0 && (
                <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg">
                  <p className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Flagged Reasons
                  </p>
                  <ul className="space-y-1">
                    {selectedNode.flaggedReasons.map((reason, i) => (
                      <li key={i} className="text-sm text-red-300">• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Connected Edges */}
              <div>
                <p className="text-sm text-slate-400 mb-2">Connections ({networkData?.edges.filter(e => 
                  e.sourceId === selectedNode.id || e.targetId === selectedNode.id
                ).length || 0})</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {networkData?.edges
                    .filter(e => e.sourceId === selectedNode.id || e.targetId === selectedNode.id)
                    .map(edge => {
                      const otherId = edge.sourceId === selectedNode.id ? edge.targetId : edge.sourceId;
                      const otherNode = networkData.nodes.find(n => n.id === otherId);
                      return (
                        <div key={edge.id} className="flex items-center justify-between p-2 bg-slate-800 rounded text-sm">
                          <span className="text-slate-300">{otherNode?.name || otherId}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{edge.rideCount} rides</span>
                            {edge.isFlagged && (
                              <Badge variant="outline" className="border-red-500 text-red-400 text-xs">
                                Flagged
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedNode(null)} className="border-slate-700 text-slate-300">
              Close
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              View Full Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edge Detail Dialog */}
      <Dialog open={!!selectedEdge} onOpenChange={() => setSelectedEdge(null)}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-slate-400" />
              Connection Details
              {selectedEdge?.isFlagged && (
                <Badge className="bg-red-600 ml-2">Flagged</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedEdge && networkData && (
            <div className="space-y-4">
              {(() => {
                const source = networkData.nodes.find(n => n.id === selectedEdge.sourceId);
                const target = networkData.nodes.find(n => n.id === selectedEdge.targetId);
                return (
                  <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div className="text-center">
                      {source?.type === 'rider' ? (
                        <Bike className="h-6 w-6 text-purple-400 mx-auto" />
                      ) : (
                        <User className="h-6 w-6 text-blue-400 mx-auto" />
                      )}
                      <p className="text-sm font-medium mt-1">{source?.name}</p>
                      <p className="text-xs text-slate-400">{source?.id}</p>
                    </div>
                    <div className="flex flex-col items-center px-4">
                      <ArrowIcon />
                      <p className="text-xs text-slate-400 mt-1">{selectedEdge.rideCount} rides</p>
                    </div>
                    <div className="text-center">
                      {target?.type === 'rider' ? (
                        <Bike className="h-6 w-6 text-purple-400 mx-auto" />
                      ) : (
                        <User className="h-6 w-6 text-blue-400 mx-auto" />
                      )}
                      <p className="text-sm font-medium mt-1">{target?.name}</p>
                      <p className="text-xs text-slate-400">{target?.id}</p>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-400">Total Rides</p>
                  <p className="text-2xl font-bold text-white">{selectedEdge.rideCount}</p>
                </div>
                <div className="p-3 bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-400">Total Amount</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatCurrency(selectedEdge.totalAmount)}</p>
                </div>
                <div className="p-3 bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-400">Average Rating</p>
                  <p className="text-2xl font-bold text-yellow-400">{selectedEdge.avgRating}</p>
                </div>
                <div className="p-3 bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-400">Suspicious Score</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    selectedEdge.suspiciousScore >= 70 ? "text-red-400" :
                    selectedEdge.suspiciousScore >= 40 ? "text-orange-400" : "text-green-400"
                  )}>{selectedEdge.suspiciousScore}</p>
                </div>
              </div>

              {/* Suspicious Score Bar */}
              <div>
                <p className="text-sm text-slate-400 mb-2">Suspicious Score</p>
                <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      selectedEdge.suspiciousScore >= 70 ? "bg-red-500" :
                      selectedEdge.suspiciousScore >= 40 ? "bg-orange-500" : "bg-green-500"
                    )}
                    style={{ width: `${selectedEdge.suspiciousScore}%` }}
                  />
                </div>
              </div>

              {/* Flag Reason */}
              {selectedEdge.isFlagged && selectedEdge.flagReason && (
                <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg">
                  <p className="text-sm font-medium text-red-400 mb-1 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Flag Reason
                  </p>
                  <p className="text-sm text-red-300">{selectedEdge.flagReason}</p>
                </div>
              )}

              <div className="text-sm text-slate-400">
                Last ride: {formatTimeAgo(selectedEdge.lastRide)}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEdge(null)} className="border-slate-700 text-slate-300">
              Close
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Investigate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// Sub Components
// ============================================

function StatBadge({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border",
      colorClasses[color]
    )}>
      <Icon className="h-4 w-4" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
      <path 
        d="M0 8H36M36 8L28 2M36 8L28 14" 
        stroke="currentColor" 
        strokeWidth="2" 
        className="text-slate-500"
      />
    </svg>
  );
}

export default CollusionNetworkGraph;
