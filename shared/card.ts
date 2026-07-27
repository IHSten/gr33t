import type { Connection } from "./connection";

export type Card = {
  id: string;
  title: string | null;
  description: string | null;
  connections: Connection[];
};
