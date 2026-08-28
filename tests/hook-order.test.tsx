// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import MoveItemModal from '../components/MoveItemModal';

/**
 * A component must call the same hooks on every render.
 *
 * MoveItemModal returned null before reaching its useMemo, so the first render
 * called no hooks and the render where it opened called one. React counts
 * hooks per instance and throws "Rendered more hooks than during the previous
 * render" when the count grows — meaning opening the Move dialog took the whole
 * app down rather than showing a dialog.
 *
 * The modal is always mounted by BoardPage with isOpen toggling, so this is on
 * the live path, not a theoretical one.
 */
// Stub the shared dialog: it needs the app provider, and this test is about
// MoveItemModal's own hook order, not about mounting the whole context.
vi.mock('../components/Dialog.tsx', () => ({
  default: ({ children }: any) => React.createElement('div', null, children),
}));

const card = {
  id: 'c1', profileId: 'p1', boardId: 'b1', label: 'juice',
  imageUrl: '/pictograms/1.png', category: 'root', createdAt: 1, slot: 0,
};

const props = (isOpen: boolean) => ({
  isOpen,
  onClose: () => {},
  itemToMove: { item: card, type: 'card' as const },
  categories: [
    { id: 'f1', profileId: 'p1', boardId: 'b1', label: 'Food', colorTheme: 'orange', parentId: 'root', slot: 0 },
  ],
  onMove: () => {},
  t: (k: string) => k,
});

describe('MoveItemModal hook order', () => {
  it('survives being opened after rendering closed', () => {
    const { rerender } = render(React.createElement(MoveItemModal as any, props(false)));
    // The render that matters: closed (no hooks) then open (hooks).
    expect(() => rerender(React.createElement(MoveItemModal as any, props(true)))).not.toThrow();
  });

  it('survives being closed again', () => {
    const { rerender } = render(React.createElement(MoveItemModal as any, props(true)));
    expect(() => rerender(React.createElement(MoveItemModal as any, props(false)))).not.toThrow();
    expect(() => rerender(React.createElement(MoveItemModal as any, props(true)))).not.toThrow();
  });
});
