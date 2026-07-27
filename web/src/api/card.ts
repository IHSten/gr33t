import type { Card } from "@shared/card";

export class CardNotFoundError extends Error {
  constructor(cardId: string) {
    super(`Card not found: ${cardId}`);
    this.name = "CardNotFoundError";
  }
}

export const fetchCard = async (cardId: string): Promise<Card> => {
  const response = await fetch(`/api/card/${encodeURIComponent(cardId)}`);

  if (response.status === 404) {
    throw new CardNotFoundError(cardId);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch card: ${response.status}`);
  }

  return (await response.json()) as Card;
};
