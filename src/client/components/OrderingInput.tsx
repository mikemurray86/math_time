import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Expr } from '../../shared/expr.ts';
import { MathExpr } from './MathText.tsx';
import { sounds } from '../sounds.ts';

interface Item {
  id: string;
  expr: Expr;
}

function Row({ item, index, count, locked, mark, move }: {
  item: Item; index: number; count: number; locked: boolean; mark?: 'right' | 'wrong'; move: (from: number, to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: locked });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`order-row ${isDragging ? 'dragging' : ''} ${mark ?? ''}`}
    >
      <span className="order-pos">{index + 1}</span>
      <span className="order-handle" {...attributes} {...listeners} aria-label={`Drag to reorder, position ${index + 1}`}>
        <MathExpr e={item.expr} />
      </span>
      {!locked && (
        <span className="order-arrows">
          <button type="button" className="icon-btn small" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label="Move up">▲</button>
          <button type="button" className="icon-btn small" disabled={index === count - 1} onClick={() => move(index, index + 1)} aria-label="Move down">▼</button>
        </span>
      )}
    </li>
  );
}

export function OrderingInput({ items, order, onChange, locked = false, direction, correctIds }: {
  items: Item[];
  order: string[];
  onChange: (ids: string[]) => void;
  locked?: boolean;
  direction: 'asc' | 'desc';
  correctIds?: string[];
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = new Map(items.map((i) => [i.id, i]));
  const move = (from: number, to: number) => {
    onChange(arrayMove(order, from, to));
    sounds.tap();
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) move(order.indexOf(String(active.id)), order.indexOf(String(over.id)));
  };
  return (
    <div className="ordering">
      <div className="order-end">{direction === 'asc' ? '⬆ least' : '⬆ greatest'}</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol className="order-list">
            {order.map((id, i) => (
              <Row
                key={id}
                item={byId.get(id)!}
                index={i}
                count={order.length}
                locked={locked}
                move={move}
                mark={correctIds ? (correctIds[i] === id ? 'right' : 'wrong') : undefined}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <div className="order-end">{direction === 'asc' ? '⬇ greatest' : '⬇ least'}</div>
    </div>
  );
}
