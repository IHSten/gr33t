import { Link } from "react-router-dom";
import "./legal.css";

// Plain-language terms. gr33t is free, takes no payments, and has no premium
// tier — so there's nothing here about billing, refunds, or subscriptions.
export const TermsPage = () => (
  <div className="legal">
    <Link className="legal-back" to="/">
      ← Back to gr33t
    </Link>
    <h1>Terms of Service</h1>
    <p className="legal-updated">Last updated: July 26, 2026</p>

    <p className="legal-lede">
      gr33t is a free service that lets you bundle your contact and social links
      behind one shareable page. By using gr33t, you agree to these terms. We've
      kept them short and plain.
    </p>

    <h2>The service is free</h2>
    <p>
      gr33t costs nothing to use. There are no paid plans, no payments, and no
      features locked behind a fee. It is provided "as is" and there is no
      promise it will always be available, error-free, or remain free.
    </p>

    <h2>Your account</h2>
    <p>
      You sign in with your Google account. You're responsible for what happens
      under your account, so keep your Google sign-in secure. You must be old
      enough to consent to these terms in your country.
    </p>

    <h2>Your content is public</h2>
    <p>
      The whole point of a gr33t card is to be shared. Anything you put on a
      card — your name, links, images — is publicly visible to anyone with the
      link. Don't add anything you wouldn't want to be public.
    </p>

    <h2>What you can and can't do</h2>
    <p>When using gr33t, you agree not to:</p>
    <ul>
      <li>Post content that's illegal, hateful, harassing, or infringing.</li>
      <li>Impersonate someone else or misrepresent who you are.</li>
      <li>Use gr33t to distribute malware, spam, or phishing links.</li>
      <li>Attempt to break, overload, or abuse the service or its users.</li>
    </ul>
    <p>
      You keep ownership of the content you add, but using it on the platform,
      you confirm you have the right to share it. We may remove content or
      suspend accounts that break these rules.
    </p>

    <h2>No warranty and limits</h2>
    <p>
      gr33t is provided without warranties of any kind. To the fullest extent
      allowed by law, we aren't liable for any loss or damage arising from your
      use of the service.
    </p>

    <h2>Changes</h2>
    <p>
      We may update these terms as gr33t evolves. This includes changing how we
      use the data you give us and adding or changing the vendors and
      subprocessors that help us run the service. We will never sell your data
      or share it with third parties outside of operating gr33t. How we handle
      your data is described in our{" "}
      <Link to="/legal/privacy-policy">Privacy Policy</Link>, which we'll keep
      up to date alongside these terms.
    </p>
    <p>
      If we make a meaningful change, we'll update the date at the top of this
      page. Continuing to use gr33t after a change means you accept the new
      terms.
    </p>

    <h2>Contact</h2>
    <p>
      Questions about these terms? Email{" "}
      <a href="mailto:privacy@gr33t.me">privacy@gr33t.me</a>. See also our{" "}
      <Link to="/legal/privacy-policy">Privacy Policy</Link>.
    </p>
  </div>
);
