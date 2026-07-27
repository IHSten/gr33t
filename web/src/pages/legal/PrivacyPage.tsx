import { Link } from "react-router-dom";
import "./legal.css";

// Plain-language privacy policy. Describes exactly what the app actually does:
// Google sign-in, user-created card content stored in D1/R2, a session cookie
// in KV, and coarse view analytics (Workers Analytics Engine, ~90-day
// retention). No third-party ad trackers, no data sales.
export const PrivacyPage = () => (
  <div className="legal">
    <Link className="legal-back" to="/">
      ← Back to gr33t
    </Link>
    <h1>Privacy Policy</h1>
    <p className="legal-updated">Last updated: July 26, 2026</p>

    <p className="legal-lede">
      gr33t is a free service, and we try to collect as little about you as
      possible. This page explains what we store, why, and how to remove it. We
      don't sell your data and we don't use third-party advertising trackers.
    </p>

    <h2>What we collect</h2>
    <ul>
      <li>
        <strong>Sign-in details.</strong> When you sign in with Google, we
        receive your email address, name, and profile picture. We use these to
        create and identify your account.
      </li>
      <li>
        <strong>Your content.</strong> Whatever you add or upload to the
        platform — display name, links, and any images you upload — is stored so
        we can show your page. This content is public by design.
      </li>
      <li>
        <strong>Basic usage analytics.</strong> We record coarse, aggregate
        events such as card views so we can understand how gr33t is used. These
        are not tied to your identity and are kept for roughly 90 days.
      </li>
    </ul>

    <h2>Cookies</h2>
    <p>
      We use a single cookie to keep you signed in after you log in with Google.
      It's essential for the service to work — we don't use cookies for
      advertising or cross-site tracking.
    </p>

    <h2>How we use your information</h2>
    <p>
      We use the information above only to run gr33t: to sign you in, to display
      your public card, and to understand overall usage. We don't sell it, sell
      access, or share it with advertisers.
    </p>

    <h2>Who can see your data</h2>
    <p>
      Card content is public to anyone with your link — that's the point of the
      service. Your account details (like your email) are not shown on your
      card. We rely on Google for sign-in and Cloudflare to host and serve
      gr33t; your data is processed and stored on that infrastructure.
    </p>
    <p>
      To keep gr33t running and improve it, we may add or change vendors and
      subprocessors over time — the providers that help us host, store, and
      operate the service. Any such provider only handles your data to deliver
      gr33t on our behalf. We will never sell your data or hand it to third
      parties for any purpose beyond running the service, and we'll update this
      page when our providers change.
    </p>

    <h2>Keeping and deleting your data</h2>
    <p>
      We keep your account and card content until you delete it or ask us to.
      You can remove connections or delete a card at any time from your
      dashboard. To delete your whole account and everything tied to it, email{" "}
      <a href="mailto:privacy@gr33t.me">privacy@gr33t.me</a> and we'll take care
      of it.
    </p>

    <h2>Changes</h2>
    <p>
      As gr33t grows, we may change how we use the data described above — for
      example, to add features or improve the service. We reserve the right to
      do so, with one firm limit: we will never sell your data or share it with
      third parties outside of running gr33t. If our use of your data or our
      list of providers changes in a meaningful way, we'll update this page and
      change the date at the top.
    </p>

    <h2>Contact</h2>
    <p>
      Privacy questions? Email{" "}
      <a href="mailto:privacy@gr33t.me">privacy@gr33t.me</a>. To report a
      security issue, see{" "}
      <a href="/.well-known/security.txt">our security.txt</a>. See also our{" "}
      <Link to="/legal/tos">Terms of Service</Link>.
    </p>
  </div>
);
