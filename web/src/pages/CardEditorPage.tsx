import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  CONNECTION_TYPES,
  CONNECTION_EXAMPLES,
  type ConnectionType,
} from "@shared/connection";
import { Block } from "../components/Block";
import { Button } from "../components/Button";
import { SearchSelect } from "../components/SearchSelect";
import { Spinner } from "../components/Spinner";
import {
  getCardDetail,
  updateCard,
  createConnection,
  updateConnection,
  deleteConnection,
  setCardConnections,
  type OwnerCard,
  type OwnerConnection,
} from "../api/owner";
import "../components/CardPage.css";
import "./CardEditorPage.css";

// Shares the on-demand qr-code-styling chunk with Block; loaded only when a QR
// panel is opened in the editor.
const ConnectionQR = lazy(() =>
  import("../components/ConnectionQR").then(m => ({ default: m.ConnectionQR }))
);

// The preview renders the public page at a fixed phone-width viewport and
// scales it down to fit the sidebar, so long content zooms out instead of
// overflowing and clipping.
const PREVIEW_WIDTH = 390;

export const CardEditorPage = () => {
  const { id = "" } = useParams<{ id: string }>();

  const [card, setCard] = useState<OwnerCard | null>(null);
  const [connections, setConnections] = useState<OwnerConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaSaved, setMetaSaved] = useState(false);
  const [qrOpenId, setQrOpenId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const previewFrameRef = useRef<HTMLDivElement>(null);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewHeight, setPreviewHeight] = useState(0);

  useEffect(() => {
    const frame = previewFrameRef.current;
    const viewport = previewViewportRef.current;
    if (!frame || !viewport) return;

    const update = () => {
      const scale = Math.min(1, frame.clientWidth / PREVIEW_WIDTH);
      setPreviewScale(scale);
      setPreviewHeight(viewport.offsetHeight * scale);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(viewport);
    return () => observer.disconnect();
    // Re-attach once the preview mounts (it isn't rendered while loading).
  }, [loading, card]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getCardDetail(id);
      setCard(detail.card);
      setConnections(detail.connections);
      setTitle(detail.card.title ?? "");
      setDescription(detail.card.description ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load card");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const persistOrder = useCallback(
    async (ordered: OwnerConnection[]) => {
      try {
        await setCardConnections(
          id,
          ordered.map(c => c.id)
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save order");
      }
    },
    [id]
  );

  const onSaveMeta = async () => {
    setSavingMeta(true);
    setError(null);
    setMetaSaved(false);
    try {
      const updated = await updateCard(id, {
        title: title.trim() ? title : null,
        description: description.trim() ? description : null,
      });
      setCard(updated);
      setMetaSaved(true);
      window.setTimeout(() => setMetaSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save card");
    } finally {
      setSavingMeta(false);
    }
  };

  const onAddBlock = async () => {
    setError(null);
    try {
      const example = CONNECTION_EXAMPLES.Website;
      const created = await createConnection({
        type: "Website",
        handle: example.handle,
        link: example.link,
      });
      const next = [...connections, created];
      setConnections(next);
      await persistOrder(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add block");
    }
  };

  const onPatchBlock = (
    index: number,
    patch: Partial<
      Pick<OwnerConnection, "type" | "handle" | "link" | "imageUrl">
    >
  ) => {
    setConnections(prev =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  };

  const onChangeType = (index: number, newType: ConnectionType) => {
    setConnections(prev =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const oldEx = CONNECTION_EXAMPLES[c.type];
        const newEx = CONNECTION_EXAMPLES[newType];
        return {
          ...c,
          type: newType,
          handle: c.handle === oldEx.handle ? newEx.handle : c.handle,
          link: c.link === oldEx.link ? newEx.link : c.link,
        };
      })
    );
  };

  const onSaveBlock = async (index: number) => {
    const c = connections[index];
    setError(null);
    try {
      const saved = await updateConnection(c.id, {
        type: c.type,
        handle: c.handle,
        link: c.link,
        imageUrl: c.imageUrl?.trim() ? c.imageUrl : null,
      });
      setConnections(prev => prev.map((x, i) => (i === index ? saved : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save block");
    }
  };

  const onRemoveBlock = async (index: number) => {
    const c = connections[index];
    setError(null);
    try {
      await deleteConnection(c.id);
      setConnections(prev => prev.filter((_, i) => i !== index));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove block");
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= connections.length) return;
    const next = [...connections];
    [next[index], next[target]] = [next[target], next[index]];
    setConnections(next);
    await persistOrder(next);
  };

  if (loading) {
    return (
      <div className="editor">
        <Spinner />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="editor">
        <p className="dash-error">{error ?? "Card not found"}</p>
        <Link to="/dashboard">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="editor">
      <div className="editor-bar">
        <Link to="/dashboard" className="back-link">
          ← Dashboard
        </Link>
        <Link
          to={`/card/${card.id}`}
          target="_blank"
          rel="noreferrer"
          className="back-link"
        >
          View public page ↗
        </Link>
      </div>

      {error && <div className="dash-error">{error}</div>}

      <div className="editor-grid">
        <div className="editor-main">
          <section className="panel">
            <h2>Card details</h2>
            <label>
              Title
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Untitled card"
              />
            </label>
            <label>
              Description
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
              />
            </label>
            <div className="row-end">
              {metaSaved && <span className="saved-note">Saved</span>}
              <Button onClick={onSaveMeta} disabled={savingMeta}>
                {savingMeta ? "Saving…" : "Save details"}
              </Button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Connections</h2>
              <Button onClick={onAddBlock}>Add block</Button>
            </div>

            {connections.length === 0 ? (
              <p className="muted">
                No connection blocks yet. Add one to get started.
              </p>
            ) : (
              <ul className="block-list">
                {connections.map((conn, i) => (
                  <li key={conn.id} className="block-row">
                    <div className="block-reorder">
                      <button
                        aria-label="Move up"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                      >
                        ↑
                      </button>
                      <button
                        aria-label="Move down"
                        onClick={() => move(i, 1)}
                        disabled={i === connections.length - 1}
                      >
                        ↓
                      </button>
                    </div>
                    <div className="block-fields">
                      <label>
                        Type
                        <SearchSelect
                          value={conn.type}
                          options={CONNECTION_TYPES}
                          ariaLabel="Connection type"
                          onChange={t => onChangeType(i, t as ConnectionType)}
                        />
                      </label>
                      <label>
                        Handle
                        <input
                          value={conn.handle}
                          onChange={e =>
                            onPatchBlock(i, { handle: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Link
                        <input
                          value={conn.link}
                          onChange={e =>
                            onPatchBlock(i, { link: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Image URL (optional)
                        <input
                          value={conn.imageUrl ?? ""}
                          onChange={e =>
                            onPatchBlock(i, { imageUrl: e.target.value })
                          }
                          placeholder="https://…"
                        />
                      </label>
                      <div className="row-end">
                        <Button
                          onClick={() =>
                            setQrOpenId(qrOpenId === conn.id ? null : conn.id)
                          }
                        >
                          {qrOpenId === conn.id ? "Hide QR" : "QR code"}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => onRemoveBlock(i)}
                        >
                          Remove
                        </Button>
                        <Button onClick={() => onSaveBlock(i)}>
                          Save block
                        </Button>
                      </div>
                      {qrOpenId === conn.id && (
                        <div className="block-qr-panel">
                          <Suspense
                            fallback={<div className="block-qr-loading" />}
                          >
                            <ConnectionQR
                              data={conn.link}
                              size={160}
                              downloadable
                              fileName={`gr33t-${conn.type.toLowerCase()}`}
                            />
                          </Suspense>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="editor-preview">
          <h2>Preview</h2>
          <div
            className="preview-frame"
            ref={previewFrameRef}
            style={{ height: previewHeight }}
          >
            <div
              className="preview-viewport"
              ref={previewViewportRef}
              style={{
                width: PREVIEW_WIDTH,
                transform: `scale(${previewScale})`,
              }}
            >
              <div className="card-page">
                <div className="card-header">
                  <h1>{title || "Connect with me on:"}</h1>
                  {description && <p>{description}</p>}
                </div>
                {connections.length === 0 ? (
                  <p className="card-empty">
                    This user hasn&apos;t added any connections to their card.
                  </p>
                ) : (
                  <div className="connections-list">
                    {connections.map(conn => (
                      <Block
                        key={conn.id}
                        connection={{
                          type: conn.type,
                          details: {
                            handle: conn.handle,
                            link: conn.link,
                            imageUrl: conn.imageUrl ?? "",
                          },
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
