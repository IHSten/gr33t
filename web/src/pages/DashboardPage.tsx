import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listCards,
  createCard,
  deleteCard,
  type OwnerCard,
} from "../api/owner";
import { Button, ButtonLink } from "../components/Button";
import { Spinner } from "../components/Spinner";
import "./DashboardPage.css";

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<OwnerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCards(await listCards());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const card = await createCard({ title: "Untitled card" });
      navigate(`/dashboard/cards/${card.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create card");
      setCreating(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this card? This cannot be undone.")) return;
    try {
      await deleteCard(id);
      setCards(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete card");
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-head">
        <h1>Your cards</h1>
        <Button onClick={onCreate} disabled={creating}>
          {creating ? "Creating…" : "New card"}
        </Button>
      </header>

      {error && <div className="dash-error">{error}</div>}

      {loading ? (
        <Spinner label="Loading your cards…" />
      ) : cards.length === 0 ? (
        <p className="muted">No cards yet. Create your first one.</p>
      ) : (
        <ul className="card-grid card-grid-in">
          {cards.map(card => (
            <li key={card.id} className="card-tile">
              <div className="card-tile-body">
                <h3>{card.title || "Untitled card"}</h3>
                {card.description && <p>{card.description}</p>}
                <code className="card-id">/card/{card.id}</code>
              </div>
              <div className="card-tile-actions">
                <ButtonLink to={`/dashboard/cards/${card.id}`}>Edit</ButtonLink>
                <ButtonLink
                  to={`/card/${card.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View
                </ButtonLink>
                <Button variant="danger" onClick={() => onDelete(card.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
