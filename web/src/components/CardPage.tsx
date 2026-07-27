import { useState, useEffect } from "react";
import type { Card } from "@shared/card";
import { Block } from "./Block";
import "./CardPage.css";
import { fetchCard, CardNotFoundError } from "../api/card";
import { NotFound } from "./NotFound";

interface CardPageProps {
  cardId: string;
}

export const CardPage = ({ cardId }: CardPageProps) => {
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCard = async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      setCard(null);

      try {
        const cardData = await fetchCard(cardId);
        if (!cancelled) setCard(cardData);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof CardNotFoundError) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load card");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCard();

    return () => {
      cancelled = true;
    };
  }, [cardId]);

  if (loading) {
    return (
      <div className="card-page">
        <div className="loading">Loading card&hellip;</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <NotFound
        title="Card not found"
        message={`We couldn't find a card with id "${cardId}".`}
      />
    );
  }

  if (error) {
    return (
      <div className="card-page">
        <div className="error">Something went wrong: {error}</div>
      </div>
    );
  }

  if (!card) {
    return (
      <NotFound
        title="Card not found"
        message={`We couldn't find a card with id "${cardId}".`}
      />
    );
  }

  return (
    <div className="card-page">
      <div className="card-header">
        <h1>{card.title || "Connect with me on:"}</h1>
        {card.description && <p>{card.description}</p>}
      </div>
      {card.connections.length === 0 ? (
        <p className="card-empty">
          This user hasn&apos;t added any connections to their card.
        </p>
      ) : (
        <div className="connections-list">
          {card.connections.map((connection, index) => (
            <Block key={index} connection={connection} />
          ))}
        </div>
      )}
    </div>
  );
};
