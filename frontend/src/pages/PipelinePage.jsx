import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  Calendar, MapPin, Tag, RefreshCw, AlertCircle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Skeleton } from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';

const COLUMNS = [
  { id: 'NEW', label: 'New', count: 0 },
  { id: 'CONTACTED', label: 'Contacted', count: 0 },
  { id: 'REPLIED', label: 'Replied', count: 0 },
  { id: 'MEETING', label: 'Meeting', count: 0 },
  { id: 'PROPOSAL', label: 'Proposal', count: 0 },
  { id: 'WON_LOST', label: 'Won / Lost', count: 0 }
];

// Draggable Lead Card Component
function KanbanCard({ lead, isOverlay = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(lead.id),
    data: { lead }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    transition: isDragging ? 'none' : 'transform 280ms cubic-bezier(0.2, 0, 0, 1)'
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3.5 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] select-none space-y-2 cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging
          ? 'opacity-30'
          : isOverlay
          ? 'scale-[1.02] shadow-2xl border-[var(--primary)] ring-2 ring-[var(--primary)]/30'
          : 'hover:border-[var(--primary)]/60 hover:shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-[13px] font-semibold text-[var(--text)] truncate">
          {lead.name}
        </h4>
        <span className="text-[10px] font-mono text-[var(--muted)] shrink-0">
          #{lead.id}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
        <MapPin className="w-3 h-3 shrink-0 text-[var(--muted)]" />
        <span className="truncate">{lead.area || 'Chennai'}</span>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/60 text-[11px]">
        {/* Sector Chip */}
        <span className="px-2 py-0.5 rounded-[999px] text-[10px] font-medium bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] truncate max-w-[130px]">
          {lead.sector || 'Manufacturing'}
        </span>

        {/* Next Step Date */}
        <span className="text-[10px] text-[var(--muted)] tabular-nums flex items-center gap-1 shrink-0">
          <Calendar className="w-3 h-3 text-[var(--primary)]" />
          <span>{lead.next_step_date || 'Oct 16'}</span>
        </span>
      </div>
    </div>
  );
}

// Droppable Column Component
function KanbanColumn({ column, leads = [], isOver }) {
  const { setNodeRef } = useDroppable({
    id: column.id
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-[300px] shrink-0 rounded-[12px] bg-[var(--surface-2)]/40 border flex flex-col max-h-[760px] transition-colors ${
        isOver
          ? 'border-[var(--primary)] bg-[var(--surface-2)] ring-1 ring-[var(--primary)]/40'
          : 'border-[var(--border)]'
      }`}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-[var(--border)] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--text)]">
            {column.label}
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-[999px] bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] tabular-nums">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Cards Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-[200px]">
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} />
        ))}
        {leads.length === 0 && (
          <div className="h-24 rounded-[8px] border border-dashed border-[var(--border)] flex items-center justify-center text-[12px] text-[var(--muted)] select-none">
            Drop leads here
          </div>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [pipelineLeads, setPipelineLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeLead, setActiveLead] = useState(null);
  const { success, error: toastError } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    })
  );

  const fetchLeadsForPipeline = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chennai-leads?limit=60');
      if (!res.ok) throw new Error('Failed to load leads for pipeline');
      const data = await res.json();
      const items = (data.items || []).map((it, idx) => {
        // Distribute leads into realistic stages
        let stage = 'NEW';
        if (it.intel_status === 'APPROVED') stage = 'PROPOSAL';
        else if (idx % 6 === 1) stage = 'CONTACTED';
        else if (idx % 6 === 2) stage = 'REPLIED';
        else if (idx % 6 === 3) stage = 'MEETING';
        else if (idx % 6 === 4) stage = 'WON_LOST';

        return {
          ...it,
          pipeline_stage: stage,
          next_step_date: `Oct ${15 + (idx % 10)}`
        };
      });
      setPipelineLeads(items);
    } catch (err) {
      console.error(err);
      toastError('Could not load pipeline data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadsForPipeline();
  }, []);

  const handleDragStart = (event) => {
    const { active } = event;
    const found = pipelineLeads.find((l) => String(l.id) === String(active.id));
    setActiveLead(found || null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = String(active.id);
    const targetStage = String(over.id);

    const prevLeads = [...pipelineLeads];
    const targetLead = pipelineLeads.find((l) => String(l.id) === leadId);

    if (!targetLead || targetLead.pipeline_stage === targetStage) return;

    // Optimistic Update
    setPipelineLeads((prev) =>
      prev.map((l) => (String(l.id) === leadId ? { ...l, pipeline_stage: targetStage } : l))
    );

    success(`Moved ${targetLead.name} to ${targetStage}`);

    // If server rejects, rollback
    // In our mock/live backend, we can persist or rollback on failure
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="w-[300px] shrink-0 p-3 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] space-y-3 h-[600px]">
            <Skeleton className="w-24 h-5" />
            <Skeleton className="w-full h-24" rounded="rounded-[10px]" />
            <Skeleton className="w-full h-24" rounded="rounded-[10px]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pipeline Header */}
      <div className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--text)] tracking-tight">
            Opportunity & Outreach Pipeline
          </h2>
          <div className="text-[12px] text-[var(--muted)]">
            Drag leads across deal stages with optimistic updates
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLeadsForPipeline}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] text-[12px] font-medium border border-[var(--border)] cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Pipeline</span>
        </button>
      </div>

      {/* DndContext Board: horizontal scroll inside board only, 300px column width */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="w-full overflow-x-auto pb-4 pt-1">
          <div className="flex items-start gap-4 min-w-[1850px]">
            {COLUMNS.map((column) => {
              const leadsInCol = pipelineLeads.filter(
                (l) => l.pipeline_stage === column.id
              );
              return (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  leads={leadsInCol}
                />
              );
            })}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeLead ? <KanbanCard lead={activeLead} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
