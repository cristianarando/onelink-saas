"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info, ShieldAlert, X } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string | null;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "warning",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen || typeof document === "undefined") return null;

  const iconWrapperClass =
    variant === "danger"
      ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
      : variant === "warning"
        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
        : "bg-zinc-800 border-white/10 text-zinc-200";

  const confirmButtonClass =
    variant === "danger"
      ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
      : variant === "warning"
        ? "bg-amber-400 hover:bg-amber-300 text-black"
        : "bg-white hover:bg-zinc-200 text-black";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={() => {
        if (!loading) onCancel();
      }}
      className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl bg-[#121215] border border-white/10 p-6 shadow-2xl text-white space-y-5"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start space-x-3.5 pr-6">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconWrapperClass}`}
          >
            {variant === "danger" ? (
              <ShieldAlert className="w-5 h-5" />
            ) : variant === "warning" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>
          <div className="space-y-1.5">
            <h3
              id="confirm-dialog-title"
              className="text-base font-semibold tracking-tight text-white"
            >
              {title}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-white/5">
          {cancelLabel !== null && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 ${confirmButtonClass}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
