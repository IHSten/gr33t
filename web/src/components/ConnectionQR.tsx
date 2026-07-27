import { useEffect, useRef } from "react";
import QRCodeStyling, { type Options } from "qr-code-styling";
import { Button } from "./Button";
import "./ConnectionQR.css";

// Monochrome so the code matches the black-and-white gr33t mark in the center
// and stays reliably scannable on its white tile in either theme.
const QR_FG = "#111111";
const QR_BG = "#ffffff";

function options(data: string, size: number): Options {
  return {
    width: size,
    height: size,
    type: "svg",
    data,
    image: "/gr33t.svg",
    qrOptions: { errorCorrectionLevel: "H" },
    dotsOptions: { color: QR_FG, type: "rounded" },
    cornersSquareOptions: { color: QR_FG, type: "extra-rounded" },
    cornersDotOptions: { color: QR_FG },
    backgroundOptions: { color: QR_BG },
    imageOptions: { crossOrigin: "anonymous", margin: 4, imageSize: 0.35 },
  };
}

type Props = {
  data: string;
  size?: number;
  downloadable?: boolean;
  fileName?: string;
};

export function ConnectionQR({
  data,
  size = 176,
  downloadable = false,
  fileName = "gr33t-qr",
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling(options(data, size));
      if (hostRef.current) {
        hostRef.current.replaceChildren();
        qrRef.current.append(hostRef.current);
      }
    } else {
      qrRef.current.update(options(data, size));
    }
  }, [data, size]);

  const download = (extension: "png" | "svg") =>
    qrRef.current?.download({ name: fileName, extension });

  return (
    <div className="conn-qr">
      <div className="conn-qr-canvas" ref={hostRef} aria-hidden="true" />
      {downloadable && (
        <div className="conn-qr-actions">
          <Button onClick={() => download("png")}>Download PNG</Button>
          <Button onClick={() => download("svg")}>Download SVG</Button>
        </div>
      )}
    </div>
  );
}
