import { Link } from "react-router-dom";
import "./NotFound.css";

interface NotFoundProps {
  title?: string;
  message?: string;
}

export const NotFound = ({
  title = "Page not found",
  message = "The page you're looking for doesn't exist.",
}: NotFoundProps) => {
  return (
    <div className="notfound">
      <div className="notfound-card">
        <div className="notfound-emoji" aria-hidden="true">
          🤷
        </div>
        <h1>{title}</h1>
        <p>{message}</p>
        <Link className="notfound-home-link" to="/">
          Back to gr33t
        </Link>
      </div>
    </div>
  );
};
