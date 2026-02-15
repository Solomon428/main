'use client';

import React, { useState } from 'react';
import { GripVertical, Settings, RefreshCw, Maximize2, X } from 'lucide-react';

interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  isVisible: boolean;
}

interface WidgetGridProps {
  widgets: WidgetConfig[];
  onLayoutChange: (widgets: WidgetConfig[]) => void;
  onRefresh: (widgetId: string) => void;
  onRemove: (widgetId: string) => void;
  children: React.ReactNode;
}

export function WidgetGrid({
  widgets,
  onLayoutChange,
  onRefresh,
  onRemove,
  children,
}: WidgetGridProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-4">
      {/* Grid controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            isEditing ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          <Settings className="h-4 w-4" />
          {isEditing ? 'Done Editing' : 'Customize'}
        </button>
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {children}
      </div>
    </div>
  );
}

interface WidgetWrapperProps {
  id: string;
  title: string;
  onRefresh?: () => void;
  onRemove?: () => void;
  isEditing?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function WidgetWrapper({
  id,
  title,
  onRefresh,
  onRemove,
  isEditing = false,
  className = '',
  children,
}: WidgetWrapperProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div
      className={`relative bg-background border rounded-lg overflow-hidden group ${
        isEditing ? 'ring-2 ring-primary ring-offset-2' : ''
      } ${className}`}
    >
      {/* Drag handle (visible in edit mode) */}
      {isEditing && (
        <div className="absolute top-2 left-2 p-1 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Widget header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <h3 className="font-medium text-sm">{title}</h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          )}
          <button
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Expand"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          {isEditing && onRemove && (
            <button
              onClick={onRemove}
              className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
              title="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Widget content */}
      <div className="p-4">{children}</div>
    </div>
  );
}

interface AddWidgetButtonProps {
  availableWidgets: Array<{ type: string; title: string; description: string }>;
  onAdd: (type: string) => void;
}

export function AddWidgetButton({
  availableWidgets,
  onAdd,
}: AddWidgetButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <span className="text-2xl mr-2">+</span>
        Add Widget
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-background border rounded-lg shadow-lg z-10 p-2">
          {availableWidgets.map((widget) => (
            <button
              key={widget.type}
              onClick={() => {
                onAdd(widget.type);
                setIsOpen(false);
              }}
              className="w-full p-2 text-left hover:bg-muted rounded transition-colors"
            >
              <p className="font-medium text-sm">{widget.title}</p>
              <p className="text-xs text-muted-foreground">
                {widget.description}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
