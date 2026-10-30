"use client";

import React, { useState, useEffect } from 'react';

interface Deliverable {
  id: string;
  type: string;
  content: string | null;
}

interface Target {
  id: string;
  title: string | null;
  company_name: string | null;
  location: string | null;
  source: string | null;
  external_url: string | null;
  description: string | null;
  ai_match_score: number | null;
  ai_match_reasoning: string | null;
  status: string;
  deliverables?: Deliverable[];
}

type PlatformFilter = 'ALL' | 'LinkedIn' | 'Facebook' | 'Instagram' | 'Threads';

export default function Dashboard() {
  const [opportunities, setOpportunities] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformFilter>('ALL');
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/targets');
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data);
      }
    } catch (e) {
      console.error("Erreur lors de la récupération :", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
    const interval = setInterval(fetchTargets, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setOpportunities(prev => prev.map(opp => opp.id === id ? { ...opp, status } : opp));
      await fetch('/api/targets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
    } catch (e) {
      console.error("Erreur mise à jour :", e);
    }
  };

  const handleTriggerScan = async (platform: string = 'all') => {
    try {
      setScanning(true);
      setScanMessage(null);
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform })
      });
      const data = await res.json();
      if (data.success) {
        setScanMessage(data.message);
        setTimeout(() => setScanMessage(null), 6000);
        setTimeout(fetchTargets, 3000);
      }
    } catch (e) {
      console.error("Erreur lancement scan :", e);
    } finally {
      setScanning(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Statistiques par réseau
  const countLinkedIn = opportunities.filter(o => o.source?.toLowerCase() === 'linkedin').length;
  const countFacebook = opportunities.filter(o => o.source?.toLowerCase() === 'facebook').length;
  const countInstagram = opportunities.filter(o => o.source?.toLowerCase() === 'instagram').length;
  const countThreads = opportunities.filter(o => o.source?.toLowerCase() === 'threads').length;

  // Filtrage des opportunités
  const filteredOpportunities = opportunities.filter(opp => {
    if (selectedPlatform === 'ALL') return true;
    return opp.source?.toLowerCase() === selectedPlatform.toLowerCase();
  });

  return (
    <main className="min-h-screen p-6 md:p-12 relative overflow-hidden bg-[#0a0d14] text-white">
      {/* Halos d'ambiance en arrière-plan */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/15 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/15 blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        
        {/* En-tête */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">⚡</span>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
                  Hybrid AI
                </span>{" "}
                Job Hunter
              </h1>
            </div>
            <p className="text-sm md:text-base text-gray-400">
              Détection automatisée & candidatures sur-mesure sur les 4 réseaux
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleTriggerScan('all')}
              disabled={scanning}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-90 text-white shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {scanning ? (
                <>⏳ Scan en cours...</>
              ) : (
                <>🚀 Scanner maintenant</>
              )}
            </button>

            <button
              onClick={fetchTargets}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-gray-300 hover:text-white"
            >
              🔄 Actualiser
            </button>
          </div>
        </header>

        {/* Message de notification du scan */}
        {scanMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
            <span>✅ {scanMessage}</span>
            <button onClick={() => setScanMessage(null)} className="text-xs text-emerald-400 font-bold hover:underline">
              Fermer
            </button>
          </div>
        )}

        {/* --- CARTES SPÉCIALES PAR RÉSEAU SOCIAL --- */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-wider font-bold text-gray-400">
              Filtrez par réseau social
            </h2>
            {selectedPlatform !== 'ALL' && (
              <button
                onClick={() => setSelectedPlatform('ALL')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium underline"
              >
                Afficher toutes les offres ({opportunities.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Carte LinkedIn */}
            <div
              onClick={() => setSelectedPlatform('LinkedIn')}
              className={`p-5 rounded-2xl cursor-pointer transition-all border ${
                selectedPlatform === 'LinkedIn'
                  ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20 scale-[1.02]'
                  : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
                  in
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {countLinkedIn} offres
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-0.5">LinkedIn</h3>
              <p className="text-xs text-gray-400">Offres d'emploi & recruteurs B2B</p>
            </div>

            {/* Carte Facebook */}
            <div
              onClick={() => setSelectedPlatform('Facebook')}
              className={`p-5 rounded-2xl cursor-pointer transition-all border ${
                selectedPlatform === 'Facebook'
                  ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/20 scale-[1.02]'
                  : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
                  fb
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {countFacebook} offres
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-0.5">Facebook</h3>
              <p className="text-xs text-gray-400">Groupes & annonces en direct</p>
            </div>

            {/* Carte Instagram */}
            <div
              onClick={() => setSelectedPlatform('Instagram')}
              className={`p-5 rounded-2xl cursor-pointer transition-all border ${
                selectedPlatform === 'Instagram'
                  ? 'bg-pink-600/20 border-pink-500 shadow-lg shadow-pink-500/20 scale-[1.02]'
                  : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 font-bold text-lg">
                  ig
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  {countInstagram} offres
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-0.5">Instagram</h3>
              <p className="text-xs text-gray-400">Hashtags & agences créatives</p>
            </div>

            {/* Carte Threads */}
            <div
              onClick={() => setSelectedPlatform('Threads')}
              className={`p-5 rounded-2xl cursor-pointer transition-all border ${
                selectedPlatform === 'Threads'
                  ? 'bg-neutral-800/80 border-white/40 shadow-lg shadow-white/10 scale-[1.02]'
                  : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-lg">
                  @
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/10 text-gray-200 border border-white/20">
                  {countThreads} offres
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-0.5">Threads</h3>
              <p className="text-xs text-gray-400">Opportunités tech & discussions</p>
            </div>
          </div>
        </div>

        {/* --- LISTE DES OPPORTUNITÉS --- */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📋</span>
              {selectedPlatform === 'ALL'
                ? `Toutes les offres (${opportunities.length})`
                : `Offres ${selectedPlatform} (${filteredOpportunities.length})`}
            </h2>

            {selectedPlatform !== 'ALL' && (
              <span className="text-xs px-2.5 py-1 rounded-md bg-white/10 text-gray-300">
                Filtre actif : {selectedPlatform}
              </span>
            )}
          </div>

          {loading && opportunities.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              Chargement des opportunités en direct...
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10">
              <p className="text-base font-medium text-gray-300 mb-2">
                Aucune offre trouvée pour {selectedPlatform === 'ALL' ? 'le moment' : selectedPlatform}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Cliquez sur "Scanner maintenant" pour lancer une recherche instantanée sur ce réseau !
              </p>
              <button
                onClick={() => handleTriggerScan(selectedPlatform === 'ALL' ? 'all' : selectedPlatform)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                ⚡ Lancer le scan pour {selectedPlatform === 'ALL' ? 'les 4 réseaux' : selectedPlatform}
              </button>
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredOpportunities.map((opp) => {
                const cvDeliverable = opp.deliverables?.find(d => d.type === 'cv_markdown');
                const letterDeliverable = opp.deliverables?.find(d => d.type === 'cover_letter');

                return (
                  <div
                    key={opp.id}
                    className={`rounded-2xl p-6 transition-all border ${
                      opp.status === 'approved'
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : opp.status === 'rejected'
                        ? 'bg-red-950/10 border-red-500/20 opacity-60'
                        : 'bg-white/[0.03] hover:bg-white/[0.05] border-white/10 shadow-xl backdrop-blur-md'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row gap-5 items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {opp.ai_match_score && (
                            <span className="px-3 py-0.5 text-xs font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              Match IA : {opp.ai_match_score}%
                            </span>
                          )}

                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-white/10 text-gray-200 border border-white/20">
                            {opp.source || 'Réseau'}
                          </span>

                          {opp.location && (
                            <span className="text-xs text-gray-400">📍 {opp.location}</span>
                          )}

                          {opp.status === 'approved' && (
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              ✅ Candidature Prête
                            </span>
                          )}

                          {opp.status === 'rejected' && (
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                              Ignoré
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-bold text-white mb-1">
                          {opp.title || "Opportunité détectée"}
                        </h3>
                        <h4 className="text-sm font-semibold text-blue-400 mb-3">
                          {opp.company_name}
                        </h4>

                        <p className="text-sm text-gray-300 line-clamp-3 mb-4 leading-relaxed bg-black/25 p-3.5 rounded-xl border border-white/5">
                          {opp.description}
                        </p>

                        {/* Actions rapides */}
                        <div className="flex flex-wrap items-center gap-3">
                          {opp.external_url && (
                            <a
                              href={opp.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 underline flex items-center gap-1 font-medium"
                            >
                              🔗 Voir l'annonce d'origine
                            </a>
                          )}

                          {(cvDeliverable || letterDeliverable || opp.ai_match_reasoning) && (
                            <button
                              onClick={() => setSelectedTarget(opp)}
                              className="text-xs px-3.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-all font-semibold flex items-center gap-1.5"
                            >
                              👁️ Voir CV & Message d'accroche
                            </button>
                          )}

                          {/* Bouton Export PDF Direct */}
                          <a
                            href={`/api/pdf/${opp.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all font-semibold flex items-center gap-1.5"
                          >
                            📄 Télécharger CV en PDF
                          </a>
                        </div>
                      </div>

                      {/* Boutons d'approbation */}
                      {opp.status === 'pending_review' && (
                        <div className="flex md:flex-col gap-2.5 w-full md:w-40 mt-4 md:mt-0">
                          <button
                            onClick={() => {
                              handleUpdateStatus(opp.id, 'approved');
                              if (opp.external_url) window.open(opp.external_url, '_blank');
                            }}
                            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all text-center flex items-center justify-center gap-1.5"
                          >
                            ✨ Postuler
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(opp.id, 'rejected')}
                            className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-300 border border-white/10 hover:border-red-500/30 transition-all text-center"
                          >
                            Ignorer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODALE DE PRÉVISUALISATION DU CV & DE L'ACCROCHE */}
        {selectedTarget && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#10131d] border border-white/20 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 text-gray-200 shadow-2xl space-y-6">
              
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                    Candidature sur-mesure • {selectedTarget.source}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {selectedTarget.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTarget(null)}
                  className="text-gray-400 hover:text-white text-2xl font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {/* Message d'accroche */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    ✉️ Message d'accroche / Lettre de motivation
                  </h4>
                  <button
                    onClick={() => {
                      const letter = selectedTarget.deliverables?.find(d => d.type === 'cover_letter')?.content || selectedTarget.ai_match_reasoning || "";
                      handleCopyText(letter);
                    }}
                    className="text-xs px-3 py-1 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-all font-semibold"
                  >
                    {copied ? "✅ Copié !" : "📋 Copier l'accroche"}
                  </button>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-white/10 whitespace-pre-wrap font-sans text-sm text-gray-200 leading-relaxed max-h-56 overflow-y-auto">
                  {selectedTarget.deliverables?.find(d => d.type === 'cover_letter')?.content || selectedTarget.ai_match_reasoning || "Non généré"}
                </div>
              </div>

              {/* CV Adapté en Markdown */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    📄 CV Adapté au poste
                  </h4>
                  <a
                    href={`/api/pdf/${selectedTarget.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all font-semibold flex items-center gap-1"
                  >
                    📥 Télécharger le PDF officiel
                  </a>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-white/10 whitespace-pre-wrap font-mono text-xs text-gray-300 max-h-64 overflow-y-auto leading-relaxed">
                  {selectedTarget.deliverables?.find(d => d.type === 'cv_markdown')?.content || "Non généré"}
                </div>
              </div>

              {/* Pied de la modale */}
              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <a
                  href={`/api/pdf/${selectedTarget.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                >
                  📄 Ouvrir le CV PDF
                </a>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTarget(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={() => {
                      handleUpdateStatus(selectedTarget.id, 'approved');
                      if (selectedTarget.external_url) window.open(selectedTarget.external_url, '_blank');
                      setSelectedTarget(null);
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white transition-all"
                  >
                    ✨ Postuler & Marquer Validé
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}
