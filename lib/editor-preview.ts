import { DRAFT_KEY, isProduction, type Production } from './productions';

type EditorPreview = {
  production: Production;
  fields: Record<string, string>;
  version?: number;
};

export function editorPreviewKey(id?: string) {
  return id ? `${DRAFT_KEY}:preview:record:${id}` : `${DRAFT_KEY}:preview:new`;
}

export function editorUrl(id?: string) {
  return id ? `/new-play/?id=${encodeURIComponent(id)}` : '/new-play/';
}

export function readEditorPreview(id?: string): EditorPreview | null {
  try {
    const draft = JSON.parse(sessionStorage.getItem(editorPreviewKey(id)) || 'null');
    if (!isProduction(draft?.production) || (id && draft.production.id !== id)) return null;
    return draft;
  } catch {
    return null;
  }
}
