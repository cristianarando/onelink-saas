"use client";

import React from "react";
import { Check } from "lucide-react";
import { isLightColor } from "@/lib/theme-contrast";

export interface ThemePreset {
  id: string;
  name: string;
  bgType: "SOLID" | "GRADIENT" | "IMAGE";
  bgValue: string;
  btnStyle: "FILLED" | "OUTLINE" | "SHADOW" | "ROUNDED" | "GLASS";
  btnColor: string;
  btnTextColor: string;
  textColor: string;
  btnRadius: number;
  fontFamily: string;
  isCustom?: boolean;
}

interface ThemePresetCardProps {
  preset: ThemePreset;
  isSelected: boolean;
  onSelect: (preset: ThemePreset) => void;
}

export function ThemePresetCard({
  preset,
  isSelected,
  onSelect,
}: ThemePresetCardProps) {
  const isLight = preset.bgType === "IMAGE" ? false : isLightColor(preset.bgValue);
  const isPillLight = isLightColor(preset.btnColor);

  const cardBackgroundStyle: React.CSSProperties =
    preset.bgType === "IMAGE"
      ? {
          backgroundImage: `linear-gradient(rgba(9,9,11,0.55), rgba(9,9,11,0.75)), url("${preset.bgValue}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : {
          background: preset.bgValue,
        };

  const getMiniPillStyle = (widthClass: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      borderRadius: `${Math.min(preset.btnRadius, 9999)}px`,
      opacity: widthClass === "full" ? 0.95 : 0.78,
    };
    if (preset.btnStyle === "OUTLINE") {
      base.backgroundColor = "transparent";
      base.border = `1.5px solid ${preset.btnColor}`;
    } else if (preset.btnStyle === "SHADOW") {
      base.backgroundColor = preset.btnColor;
      base.border = "1.5px solid #000000";
      base.boxShadow = "2px 2px 0px #000000";
    } else if (preset.btnStyle === "GLASS") {
      base.backgroundColor = "rgba(255, 255, 255, 0.22)";
      base.border = "1px solid rgba(255, 255, 255, 0.4)";
    } else {
      base.backgroundColor = preset.btnColor;
      base.border = isLight && isPillLight ? "1px solid rgba(0, 0, 0, 0.15)" : undefined;
    }
    return base;
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(preset)}
      className={`tactile-card relative p-3.5 rounded-xl flex flex-col justify-between h-36 text-left transition-all cursor-pointer select-none ${
        isSelected
          ? isLight
            ? "ring-2 ring-zinc-950 border-2 border-zinc-950 shadow-xl"
            : "ring-2 ring-white border-2 border-white shadow-xl"
          : isLight
          ? "border border-zinc-300 hover:border-zinc-500 shadow-xs"
          : "border border-zinc-800 hover:border-zinc-600 bg-zinc-900/60"
      }`}
      style={cardBackgroundStyle}
    >
      {/* Top Bar with Selection Dot */}
      <div className="flex justify-between items-start w-full">
        <div
          className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
            isSelected
              ? isLight
                ? "bg-zinc-950 text-white"
                : "bg-white text-zinc-950"
              : isLight
              ? "border border-zinc-400 bg-white/70"
              : "border border-zinc-600 bg-black/40"
          }`}
        >
          {isSelected && <Check className="w-2.5 h-2.5 stroke-3" />}
        </div>
        {isSelected && (
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
              isLight
                ? "text-zinc-950 bg-black/10 border border-black/15 font-bold"
                : "text-white bg-black/60 border border-white/20"
            }`}
          >
            Active
          </span>
        )}
      </div>

      {/* Miniature mock link pills */}
      <div className="space-y-1.5 w-full my-auto">
        <div
          className="w-full h-2.5 transition-all shadow-xs"
          style={getMiniPillStyle("full")}
        />
        <div
          className="w-3/4 h-2.5 transition-all shadow-xs"
          style={getMiniPillStyle("partial")}
        />
      </div>

      {/* Footer Title */}
      <div
        className={`flex items-center justify-between pt-2 border-t w-full ${
          isLight ? "border-black/10" : "border-white/10"
        }`}
      >
        <span
          className="text-xs font-semibold truncate"
          style={{ color: preset.textColor }}
        >
          {preset.name}
        </span>
      </div>
    </button>
  );
}
