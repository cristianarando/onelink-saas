"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { QrCode, Download, Copy, Check, X, Sparkles } from "lucide-react";

export interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileUrl: string;
  username: string;
}

interface QrThemePreset {
  id: string;
  label: string;
  fg: string;
  bg: string;
}

const QR_PRESETS: QrThemePreset[] = [
  { id: "light", label: "Pure Light", fg: "#09090b", bg: "#ffffff" },
  { id: "carbon", label: "Carbon Dark", fg: "#fafafa", bg: "#121215" },
  { id: "emerald", label: "Emerald Glow", fg: "#34d399", bg: "#022018" },
  { id: "violet", label: "Sunset Violet", fg: "#e9d5ff", bg: "#180d24" },
];

function injectBadgeIntoSvg(svgText: string, preset: QrThemePreset): string {
  const viewBoxMatch = svgText.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  const size = viewBoxMatch ? Number(viewBoxMatch[1]) : 45;
  const badgeSize = size * 0.22;
  const x = (size - badgeSize) / 2;
  const y = (size - badgeSize) / 2;
  const radius = badgeSize * 0.22;
  const strokeWidth = Math.max(0.6, badgeSize * 0.08);
  const fontSize = badgeSize * 0.44;
  const badgeSvg =
    `<rect x="${x}" y="${y}" width="${badgeSize}" height="${badgeSize}" rx="${radius}" fill="${preset.bg}" stroke="${preset.fg}" stroke-width="${strokeWidth}"/>` +
    `<text x="${size / 2}" y="${size / 2}" fill="${preset.fg}" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central">1L</text>`;
  return svgText.replace("</svg>", `${badgeSvg}</svg>`);
}

async function bakeBadgeIntoPng(
  baseDataUrl: string,
  preset: QrThemePreset
): Promise<string> {
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(baseDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);

      const badgeSize = 180;
      const pos = (size - badgeSize) / 2;
      const radius = 36;

      ctx.fillStyle = preset.bg;
      ctx.strokeStyle = preset.fg;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.roundRect(pos, pos, badgeSize, badgeSize, radius);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = preset.fg;
      ctx.font = "800 72px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("1L", size / 2, size / 2 + 4);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(baseDataUrl);
    img.src = baseDataUrl;
  });
}

export function QrCodeModal({
  isOpen,
  onClose,
  profileUrl,
  username,
}: QrCodeModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<QrThemePreset>(QR_PRESETS[0]);
  const [showCenterBadge, setShowCenterBadge] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrSvgMarkup, setQrSvgMarkup] = useState<string>("");
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !profileUrl) return;
    let active = true;

    const generateAssets = async () => {
      try {
        const [rawPngUrl, rawSvgText] = await Promise.all([
          QRCode.toDataURL(profileUrl, {
            width: 1024,
            margin: 2,
            errorCorrectionLevel: "H",
            color: { dark: selectedPreset.fg, light: selectedPreset.bg },
          }),
          QRCode.toString(profileUrl, {
            type: "svg",
            margin: 2,
            errorCorrectionLevel: "H",
            color: { dark: selectedPreset.fg, light: selectedPreset.bg },
          }),
        ]);

        const finalPngUrl = showCenterBadge
          ? await bakeBadgeIntoPng(rawPngUrl, selectedPreset)
          : rawPngUrl;
        const finalSvgText = showCenterBadge
          ? injectBadgeIntoSvg(rawSvgText, selectedPreset)
          : rawSvgText;

        if (active) {
          setQrDataUrl(finalPngUrl);
          setQrSvgMarkup(finalSvgText);
        }
      } catch (err) {
        console.error("Failed to generate QR assets:", err);
      }
    };

    void generateAssets();
    return () => {
      active = false;
    };
  }, [isOpen, profileUrl, selectedPreset, showCenterBadge]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(profileUrl);
      }
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleDownloadSvg = () => {
    if (!qrSvgMarkup) return;
    const blob = new Blob([qrSvgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `onelink-${username || "profile"}-qr.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-studio-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl bg-[#121215] border border-white/10 p-6 text-white shadow-2xl space-y-5 relative"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 id="qr-studio-modal-title" className="text-sm font-semibold text-white">
                QR Code Studio
              </h3>
              <p className="text-[11px] font-mono text-zinc-400 truncate max-w-52">
                @{username || "creator"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR studio modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* High-DPI QR Display Frame */}
        <div
          style={{ backgroundColor: selectedPreset.bg }}
          className="relative w-56 h-56 mx-auto rounded-2xl p-3 border border-white/15 shadow-xl flex items-center justify-center overflow-hidden transition-colors"
        >
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`QR Code for @${username}`}
              className="w-full h-full object-contain rounded-lg"
            />
          ) : (
            <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Preset Color Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>Palette Style</span>
            <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-300">
              <input
                type="checkbox"
                checked={showCenterBadge}
                onChange={(e) => setShowCenterBadge(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900"
              />
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Monogram
              </span>
            </label>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {QR_PRESETS.map((preset) => {
              const active = preset.id === selectedPreset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPreset(preset)}
                  className={`p-2 rounded-xl border text-[10px] font-mono flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    active
                      ? "border-white bg-white/10 text-white font-semibold"
                      : "border-white/10 bg-zinc-900/70 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span
                    style={{ backgroundColor: preset.bg, borderColor: preset.fg }}
                    className="w-5 h-5 rounded-full border-2 shadow-xs"
                  />
                  <span className="truncate w-full text-center">{preset.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Share URL Box */}
        <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950 border border-white/10 text-xs font-mono">
          <span className="text-zinc-400 truncate flex-1 pl-1.5">{profileUrl}</span>
          <button
            type="button"
            onClick={handleCopyUrl}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
          >
            {copiedUrl ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Download Actions (PNG 1024px & Vector SVG) */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <a
            href={qrDataUrl || "#"}
            download={`onelink-${username || "profile"}-1024px.png`}
            className="py-2.5 px-3 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PNG (HD)</span>
          </a>
          <button
            type="button"
            onClick={handleDownloadSvg}
            disabled={!qrSvgMarkup}
            className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Vector SVG</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
