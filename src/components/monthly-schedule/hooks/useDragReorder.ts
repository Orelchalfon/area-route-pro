import {
  type Dispatch,
  type DragEvent,
  type SetStateAction,
  useCallback,
  useState,
} from "react";

/**
 * Drag-and-drop reordering for a list held in component state.
 *
 * Owns the transient drag indices and the 4 DnD handlers; the caller owns the
 * list itself and passes its setter. Behavior matches the original inline
 * handlers in the schedule dialogs: drop moves the dragged item to the target
 * index, no-ops when dropping onto itself.
 */
export function useDragReorder<T>(setItems: Dispatch<SetStateAction<T[]>>) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((idx: number) => setDragIdx(idx), []);

  const handleDragOver = useCallback((e: DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setOverIdx(null);
  }, []);

  const handleDrop = useCallback(
    (idx: number) => {
      if (dragIdx === null || dragIdx === idx) {
        setDragIdx(null);
        setOverIdx(null);
        return;
      }
      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(idx, 0, moved);
        return next;
      });
      setDragIdx(null);
      setOverIdx(null);
    },
    [dragIdx, setItems],
  );

  return {
    dragIdx,
    overIdx,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  };
}
