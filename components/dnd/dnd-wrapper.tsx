"use client";

import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDropStore } from "@/lib/store/drop-store";

interface DndWrapperProps {
  children: React.ReactNode;
}

export function DndWrapper({ children }: DndWrapperProps) {
  const editorDropHandler = useDropStore((s) => s.editorDropHandler);
  const sidebarDropHandler = useDropStore((s) => s.sidebarDropHandler);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Dropping onto editor gap (block reorder or page drop)
    if (overId.startsWith("gap-")) {
      const targetPos = over.data?.current?.targetPos as number | undefined;
      if (
        targetPos !== undefined &&
        targetPos !== null &&
        editorDropHandler
      ) {
        editorDropHandler({
          activeId,
          overId,
          targetPos,
        });
      }
      return;
    }

    // Dropping within sidebar (page reorder) - only when dragging a page, not a block
    if (sidebarDropHandler && !activeId.startsWith("block-")) {
      sidebarDropHandler(event);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
  );
}
