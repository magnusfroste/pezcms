import { useState, useCallback, useMemo } from 'react';
import { useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';

interface UseBlockEditorOptions<T> {
  initialData: T;
  onChange: (data: T) => void;
}

interface UseBlockEditorReturn<T> {
  data: T;
  updateField: <K extends keyof T>(key: K, value: T[K]) => void;
  updateFields: (updates: Partial<T>) => void;
  reset: () => void;
  // Array helpers for blocks with lists (accordion items, gallery images, etc.)
  addArrayItem: <K extends keyof T>(arrayKey: K, item: T[K] extends Array<infer U> ? U : never) => void;
  removeArrayItem: <K extends keyof T>(arrayKey: K, index: number) => void;
  updateArrayItem: <K extends keyof T>(
    arrayKey: K,
    index: number,
    updates: Partial<T[K] extends Array<infer U> ? U : never>
  ) => void;
  reorderArrayItems: <K extends keyof T>(arrayKey: K, oldIndex: number, newIndex: number) => void;
  // Pre-configured DnD sensors
  dndSensors: ReturnType<typeof useSensors>;
}

export function useBlockEditor<T extends object>({
  initialData,
  onChange,
}: UseBlockEditorOptions<T>): UseBlockEditorReturn<T> {
  const [data, setData] = useState<T>(initialData);

  // Pre-configured DnD sensors used by many block editors
  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setData((prev) => {
      const newData = { ...prev, [key]: value };
      onChange(newData);
      return newData;
    });
  }, [onChange]);

  const updateFields = useCallback((updates: Partial<T>) => {
    setData((prev) => {
      const newData = { ...prev, ...updates };
      onChange(newData);
      return newData;
    });
  }, [onChange]);

  const reset = useCallback(() => {
    setData(initialData);
    onChange(initialData);
  }, [initialData, onChange]);

  const addArrayItem = useCallback(<K extends keyof T>(
    arrayKey: K,
    item: T[K] extends Array<infer U> ? U : never
  ) => {
    setData((prev) => {
      const currentArray = prev[arrayKey];
      if (!Array.isArray(currentArray)) return prev;
      const newData = { ...prev, [arrayKey]: [...currentArray, item] };
      onChange(newData);
      return newData;
    });
  }, [onChange]);

  const removeArrayItem = useCallback(<K extends keyof T>(arrayKey: K, index: number) => {
    setData((prev) => {
      const currentArray = prev[arrayKey];
      if (!Array.isArray(currentArray)) return prev;
      const newArray = currentArray.filter((_, i) => i !== index);
      const newData = { ...prev, [arrayKey]: newArray };
      onChange(newData);
      return newData;
    });
  }, [onChange]);

  const updateArrayItem = useCallback(<K extends keyof T>(
    arrayKey: K,
    index: number,
    updates: Partial<T[K] extends Array<infer U> ? U : never>
  ) => {
    setData((prev) => {
      const currentArray = prev[arrayKey];
      if (!Array.isArray(currentArray)) return prev;
      const newArray = currentArray.map((item, i) =>
        i === index ? { ...item, ...updates } : item
      );
      const newData = { ...prev, [arrayKey]: newArray };
      onChange(newData);
      return newData;
    });
  }, [onChange]);

  const reorderArrayItems = useCallback(<K extends keyof T>(
    arrayKey: K,
    oldIndex: number,
    newIndex: number
  ) => {
    setData((prev) => {
      const currentArray = prev[arrayKey];
      if (!Array.isArray(currentArray)) return prev;
      const newArray = arrayMove(currentArray, oldIndex, newIndex);
      const newData = { ...prev, [arrayKey]: newArray };
      onChange(newData);
      return newData;
    });
  }, [onChange]);

  return {
    data,
    updateField,
    updateFields,
    reset,
    addArrayItem,
    removeArrayItem,
    updateArrayItem,
    reorderArrayItems,
    dndSensors,
  };
}
