"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchCurrentUser, CurrentUserSession } from "@/lib/api-client";
import { SlidersHorizontal, ArrowRight, QrCode } from "lucide-react";
import { QrCodeModal } from "@/components/studio/QrCodeModal";

interface ProfileHeaderActionsProps {
  username: string;
}

export function ProfileHeaderActions({ username }: ProfileHeaderActionsProps) {
  const [session, setSession] = useState<CurrentUserSession | null>(null);
  const [isQrOpen, setIsQrOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const token = typeof window !== "undefined" ? localStorage.getItem("onelink_token") : null;
    if (!token) {
      return;
    }

    fetchCurrentUser()
      .then((user) => {
        if (active) {
          setSession(user);
        }
      })
      .catch(() => {
        // Ignore unauthenticated errors
      });

    return () => {
      active = false;
    };
  }, []);

  const cleanTargetUsername = username.replace(/^@/, "").toLowerCase();
  const isOwner =
    Boolean(session?.profile?.username) &&
    session?.profile?.username.toLowerCase() === cleanTargetUsername;

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${cleanTargetUsername}`
      : `https://onelink-saas.vercel.app/${cleanTargetUsername}`;

  const qrButton = (
    <button
      type="button"
      onClick={() => setIsQrOpen(true)}
      aria-label="Show Profile QR Code"
      title="Open QR Code Studio"
      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer active:scale-95"
    >
      <QrCode className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <div className="flex items-center gap-1.5">
      {qrButton}
      {isOwner ? (
        <Link
          href="/studio/links"
          className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
          title="Edit your bio page in Studio"
        >
          <SlidersHorizontal className="w-3 h-3 text-zinc-950" />
          <span>Edit in Studio</span>
        </Link>
      ) : session ? (
        <Link
          href="/studio/links"
          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all flex items-center gap-1 active:scale-95 shadow-xs"
          title="Go to your Creator Studio"
        >
          <span>My Studio</span>
          <ArrowRight className="w-3 h-3 opacity-75" />
        </Link>
      ) : (
        <Link
          href="/register"
          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all flex items-center gap-1 active:scale-95 shadow-xs"
          title="Create your own OneLink page"
        >
          <span>Create your OneLink</span>
          <span className="text-[10px] opacity-75">→</span>
        </Link>
      )}

      <QrCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        profileUrl={publicUrl}
        username={cleanTargetUsername}
      />
    </div>
  );
}
