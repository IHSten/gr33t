import { useParams } from "react-router-dom";
import { CardPage } from "../components/CardPage";

export const PublicCardPage = () => {
  const { id } = useParams<{ id: string }>();
  return <CardPage cardId={id ?? ""} />;
};
