import { ButtonLink } from "../components/Button";

export const NotFoundPage = () => (
  <div className="landing">
    <h1>404</h1>
    <p>That page doesn’t exist.</p>
    <ButtonLink size="lg" to="/">
      Back home
    </ButtonLink>
  </div>
);
