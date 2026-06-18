'use client';

/**
 * Store global de NutriWorld. Es un store EXTERNO a nivel módulo (no React
 * Context) leído con `useSyncExternalStore`: clave para R3F, porque el árbol de
 * `<Canvas>` corre en otro reconciler y el Context del padre NO cruza esa
 * frontera. Un store de módulo lo leen igual la escena 3D y los overlays 2D.
 *
 * (Es básicamente un mini-zustand a mano para no sumar dependencia.)
 */
import { useSyncExternalStore } from 'react';
import { PRODUCTS } from '../data/products';
import type { ZoneId } from '../data/zones';
import { parseQuery } from '../logic/parseQuery';
import { resolveIntent } from '../logic/resolveIntent';
import type { AgentResponse } from '../logic/types';
import { cancelSpeech, speak } from '../speak';

export type NpcState = 'idle' | 'thinking' | 'guiding' | 'arrived';

interface State {
  query: string;
  assistantMessage: string | null;
  npcState: NpcState;
  npcTargetZone: ZoneId | null;
  highlightedProductIds: string[];
  selectedProductId: string | null;
  /** Producto resaltado más cercano al jugador (habilita "E para ver ficha"). */
  nearProductId: string | null;
  loading: boolean;
  source: 'ai' | 'rules' | null;
  /** Voz (Web Speech API): silenciado por el usuario / hablando ahora. */
  muted: boolean;
  speaking: boolean;
  /** Posición del jugador en el plano (para el minimapa). */
  playerPos: { x: number; z: number };
  /** El loader inicial terminó y el mundo es visible (dispara la animación de
   * entrada del NPC, que si no corría tapada por el loader). */
  worldReady: boolean;
}

const initialState: State = {
  query: '',
  assistantMessage: null,
  npcState: 'idle',
  npcTargetZone: null,
  highlightedProductIds: [],
  selectedProductId: null,
  nearProductId: null,
  loading: false,
  source: null,
  muted: false,
  speaking: false,
  playerPos: { x: 0, z: 6 },
  worldReady: false,
};

let state: State = initialState;
const listeners = new Set<() => void>();

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Hook con selector. El re-render se dispara solo si el slice elegido cambió. */
export function useNutriWorld<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

// ── Acciones ─────────────────────────────────────────────────────────────

/** Resuelve la consulta del lado del cliente (fallback si el endpoint falla). */
function resolveLocally(query: string): AgentResponse {
  const r = resolveIntent(parseQuery(query), PRODUCTS);
  return {
    message: r.message,
    status: r.status,
    targetZone: r.targetZone,
    highlightProductIds: r.highlightProductIds,
    source: 'rules',
  };
}

function applyResponse(res: AgentResponse) {
  const npcState: NpcState =
    res.status === 'guiding' ? 'guiding' : res.status === 'thinking' ? 'thinking' : 'idle';
  setState({
    assistantMessage: res.message,
    npcState,
    npcTargetZone: res.status === 'guiding' ? res.targetZone : null,
    highlightedProductIds: res.highlightProductIds,
    nearProductId: null,
    loading: false,
    source: res.source,
  });
  // NutriLens "habla" la respuesta (Web Speech API), salvo silenciado.
  if (!state.muted && res.message) {
    speak(res.message, {
      onStart: () => setState({ speaking: true }),
      onEnd: () => setState({ speaking: false }),
    });
  }
}

export async function submitQuery(query: string): Promise<void> {
  const q = query.trim();
  if (!q || state.loading) return;
  setState({
    query: q,
    assistantMessage: null,
    npcState: 'thinking',
    npcTargetZone: null,
    selectedProductId: null,
    loading: true,
  });
  try {
    const res = await fetch('/api/nutriworld/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q }),
    });
    if (!res.ok) throw new Error(`agent ${res.status}`);
    const data = (await res.json()) as AgentResponse;
    applyResponse(data);
  } catch {
    // Resiliencia: si el endpoint no responde, resolvemos con reglas en el cliente.
    applyResponse(resolveLocally(q));
  }
}

/** El NPC llegó a la góndola objetivo. */
export function npcArrived(): void {
  if (state.npcState === 'guiding') setState({ npcState: 'arrived' });
}

export function setNearProduct(id: string | null): void {
  if (state.nearProductId !== id) setState({ nearProductId: id });
}

/** Actualiza la posición del jugador (throttleada por el caller) para el minimapa. */
export function setPlayerPos(x: number, z: number): void {
  setState({ playerPos: { x, z } });
}

/** El loader inicial terminó → el mundo es visible (dispara la entrada del NPC). */
export function setWorldReady(): void {
  if (!state.worldReady) setState({ worldReady: true });
}

// Lecturas no-reactivas para `useFrame` / handlers de teclado (evitan suscribir
// el loop de animación al store).
export function getHighlightedIds(): string[] {
  return state.highlightedProductIds;
}
export function getNearProductId(): string | null {
  return state.nearProductId;
}

export function selectProduct(id: string | null): void {
  setState({ selectedProductId: id });
}

export function setQuery(query: string): void {
  setState({ query });
}

export function setMuted(muted: boolean): void {
  setState({ muted });
  if (muted) {
    cancelSpeech();
    setState({ speaking: false });
  }
}

export function resetWorld(): void {
  setState({
    assistantMessage: null,
    npcState: 'idle',
    npcTargetZone: null,
    highlightedProductIds: [],
    selectedProductId: null,
    nearProductId: null,
    loading: false,
    source: null,
  });
}
