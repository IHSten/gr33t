import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { googleLogin } from "../api/auth";
import { Button, ButtonLink } from "../components/Button";
import "./LandingPage.css";

const STEPS = [
  {
    title: "Sign in",
    body: "Sign in with your Google account — no passwords, no setup.",
  },
  {
    title: "Create a card",
    body: "A card is your public page, addressed by its own link that you control.",
  },
  {
    title: "Add your connections",
    body: "X, LinkedIn, Instagram, YouTube, email, phone, website — add as many as you like and order them however you want.",
  },
  {
    title: "Share your link",
    body: "Send your gr33t.me/card link. Anyone can open it — no account needed to view.",
  },
];

export const LandingPage = () => {
  const { user, loading } = useAuth();

  return (
    <div className="landing">
      <header className="landing-hero">
        <h1>gr33t</h1>
        <p className="landing-tagline">One link for every way to reach you.</p>
        <p className="landing-lede">
          gr33t is your digital greeting card — a single public page that
          bundles all your connections (social profiles, email, phone, website)
          behind one shareable link. Hand out one gr33t instead of a pile of
          handles.
        </p>

        <div className="landing-actions">
          {!loading && user && (
            <ButtonLink size="lg" to="/dashboard">
              Go to your dashboard
            </ButtonLink>
          )}
          {!loading && !user && (
            <Button size="lg" onClick={googleLogin}>
              Sign in with Google to get started
            </Button>
          )}
        </div>
      </header>

      <section className="landing-guide" aria-labelledby="how-it-works">
        <h2 id="how-it-works">How it works</h2>
        <ol className="landing-steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="landing-step">
              <span className="landing-step-num" aria-hidden="true">
                {i + 1}
              </span>
              <div className="landing-step-text">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="landing-footer">
        <nav aria-label="Legal">
          <Link to="/legal/tos">Terms of Service</Link>
          <span aria-hidden="true">·</span>
          <Link to="/legal/privacy-policy">Privacy Policy</Link>
        </nav>
      </footer>
    </div>
  );
};
