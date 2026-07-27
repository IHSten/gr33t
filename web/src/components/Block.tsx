import React, { lazy, Suspense, useState } from "react";
import type { Connection } from "@shared/connection";
import { isSafeExternalLink, isSafeImageUrl } from "../lib/safeUrl";
import { Button } from "./Button";
import "./Block.css";

// qr-code-styling is the single heaviest dependency in the bundle. It is only
// needed once a visitor opens the QR modal, so load it on demand rather than in
// the initial public-card payload.
const ConnectionQR = lazy(() =>
  import("./ConnectionQR").then(m => ({ default: m.ConnectionQR }))
);

interface BlockProps {
  connection: Connection;
}

export const Block = ({ connection }: BlockProps) => {
  const [showQr, setShowQr] = useState(false);
  const safeLink = isSafeExternalLink(connection.details.link);

  const handleClick = () => {
    const { link } = connection.details;
    if (!isSafeExternalLink(link)) return;
    window.open(link, "_blank", "noopener,noreferrer");
  };

  // Slug strips spaces/punctuation so multi-word types ("Stack Overflow",
  // "Dev.to") map to clean asset names and brand classes.
  const slug = connection.type.toLowerCase().replace(/[^a-z0-9]+/g, "");

  const localLogoPath = `/logos/${slug}.svg`;

  const brandClass = `block-${slug}`;

  const showLetterFallback = (img: HTMLImageElement) => {
    img.style.display = "none";
    const iconContainer = img.parentElement!;
    iconContainer.textContent = connection.type.charAt(0).toUpperCase();
    iconContainer.style.fontSize = "18px";
    iconContainer.style.fontWeight = "bold";
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;

    // Attempt the owner-supplied image at most once. Tracking a flag instead of
    // re-testing img.src keeps the handler idempotent, so an imageUrl that also
    // fails (or itself contains "/logos/") degrades to the letter avatar rather
    // than looping onError -> reassign -> onError forever.
    if (img.dataset.fellBack) {
      showLetterFallback(img);
      return;
    }
    img.dataset.fellBack = "1";

    const { imageUrl } = connection.details;
    if (imageUrl && isSafeImageUrl(imageUrl)) {
      img.src = imageUrl;
    } else {
      showLetterFallback(img);
    }
  };

  return (
    <>
      <div className={`block ${brandClass}`} onClick={handleClick}>
        <div className="block-icon">
          <img
            src={localLogoPath}
            alt={`${connection.type} icon`}
            width={32}
            height={32}
            onError={handleImageError}
          />
        </div>
        <div className="block-content">
          <div className="block-type">{connection.type}</div>
          <div className="block-handle">{connection.details.handle}</div>
        </div>
        {safeLink && (
          <button
            type="button"
            className="block-qr-btn"
            aria-label={`Show QR code for ${connection.type}`}
            onClick={e => {
              e.stopPropagation();
              setShowQr(true);
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="currentColor"
                d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm11-2h2v2h-2v-2zm3 0h2v2h-2v-2zm-3 3h2v2h-2v-2zm3 0h2v5h-5v-2h3v-3zm-3 3h2v2h-2v-2z"
              />
            </svg>
          </button>
        )}
      </div>

      {showQr && (
        <div
          className="qr-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`QR code for ${connection.type}`}
          onClick={() => setShowQr(false)}
        >
          <div className="qr-modal-card" onClick={e => e.stopPropagation()}>
            <div className="qr-modal-title">{connection.type}</div>
            <div className="qr-modal-handle">{connection.details.handle}</div>
            <Suspense fallback={<div className="qr-modal-loading" />}>
              <ConnectionQR data={connection.details.link} size={220} />
            </Suspense>
            <p className="qr-modal-hint">Scan to open</p>
            <Button onClick={() => setShowQr(false)}>Close</Button>
          </div>
        </div>
      )}
    </>
  );
};
