"use client";

import React, { useEffect } from "react";
import Link from "next/link";

interface Props {
  targetTitle: string;
  companyName: string;
  autoPrint?: boolean;
}

export default function CvClientToolbar({
  targetTitle,
  companyName,
  autoPrint = false,
}: Props) {
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-[#161b22] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-white shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-gray-200 transition-all flex items-center gap-2"
        >
          ← Retour au Dashboard
        </Link>
        <span className="text-xs text-gray-400 hidden md:inline">
          {targetTitle} {companyName ? `• ${companyName}` : ""}
        </span>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <button
          onClick={handlePrint}
          className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
        >
          <span>📥 Télécharger / Enregistrer en PDF</span>
        </button>
      </div>
    </div>
  );
}
