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

  // États d'édition pour la candidature sélectionnée
  const [editedCoverLetter, setEditedCoverLetter] = useState('');
  const [editedCvMarkdown, setEditedCvMarkdown] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetSavedSuccess, setTargetSavedSuccess] = useState(false);

  // États pour le profil / CV de base de l'utilisateur
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [baseProfileText, setBaseProfileText] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [uploadingCv, setUploadingCv] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

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

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const user = await res.json();
        setBaseProfileText(user.base_profile_text || '');
        setFullName(user.full_name || '');
        setEmail(user.email || '');
      }
    } catch (e) {
      console.error("Erreur chargement profil :", e);
    }
  };

  useEffect(() => {
    fetchTargets();
    fetchProfile();
    const interval = setInterval(fetchTargets, 15000);
    return () => clearInterval(interval);
  }, []);

  // Synchronisation lors de l'ouverture d'une offre pour édition
  const handleOpenTargetModal = (opp: Target) => {
    setSelectedTarget(opp);
    const letter = opp.deliverables?.find(d => d.type === 'cover_letter')?.content || opp.ai_match_reasoning || '';
    const cv = opp.deliverables?.find(d => d.type === 'cv_markdown')?.content || '';
    setEditedCoverLetter(letter);
    setEditedCvMarkdown(cv);
    setTargetSavedSuccess(false);
  };

  const handleSaveTargetEdits = async () => {
    if (!selectedTarget) return;
    try {
      setSavingTarget(true);
      const res = await fetch('/api/targets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTarget.id,
          coverLetter: editedCoverLetter,
          markdownCv: editedCvMarkdown,
        }),
      });

      if (res.ok) {
        setTargetSavedSuccess(true);
        setTimeout(() => setTargetSavedSuccess(false), 3000);
        // Mise à jour locale
        setOpportunities(prev =>
          prev.map(item => {
            if (item.id === selectedTarget.id) {
              const updatedDeliverables = (item.deliverables || []).map(d => {
                if (d.type === 'cover_letter') return { ...d, content: editedCoverLetter };
                if (d.type === 'cv_markdown') return { ...d, content: editedCvMarkdown };
                return d;
              });
              return {
                ...item,
                ai_match_reasoning: editedCoverLetter,
                deliverables: updatedDeliverables,
              };
            }
            return item;
          })
        );
      }
    } catch (e) {
      console.error("Erreur sauvegarde :", e);
    } finally {
      setSavingTarget(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setOpportunities(prev => prev.map(opp => opp.id === id ? { ...opp, status } : opp));
      await fetch('/api/targets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
    } catch (e) {
      console.error("Erreur mise à jour statut :", e);
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
        setTimeout(fetchTargets, 4000);
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

  // Upload d'un fichier CV (PDF ou Word)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCv(true);
      setProfileSuccessMsg(null);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/profile/extract-cv', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.extractedText) {
        setBaseProfileText(data.extractedText);
        setProfileSuccessMsg(`✅ CV extrait avec succès depuis "${file.name}" ! Vous pouvez le retoucher ci-dessous.`);
      } else {
        alert(data.error || "Impossible d'extraire le CV.");
      }
    } catch (err) {
      console.error("Erreur upload CV :", err);
      alert("Erreur lors de l'analyse du document.");
    } finally {
      setUploadingCv(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseProfileText,
          fullName,
          email,
        }),
      });
      if (res.ok) {
        setProfileSuccessMsg("✅ Profil et CV de référence enregistrés avec succès !");
        setTimeout(() => setProfileSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error("Erreur enregistrement profil :", err);
    } finally {
      setSavingProfile(false);
    }
  };

  // Statistiques par réseau
  const countLinkedIn = opportunities.filter(o => o.source?.toLowerCase() === 'linkedin').length;
  const countFacebook = opportunities.filter(o => o.source?.toLowerCase() === 'facebook').length;
  const countInstagram = opportunities.filter(o => o.source?.toLowerCase() === 'instagram').length;
  const countThreads = opportunities.filter(o => o.source?.toLowerCase() === 'threads').length;

  const filteredOpportunities = opportunities.filter(opp => {
    if (selectedPlatform === 'ALL') return true;
    return opp.source?.toLowerCase() === selectedPlatform.toLowerCase();
  });

  return (
    <main className="min-h-screen p-6 md:p-12 relative overflow-hidden bg-[#0a0d14] text-white font-sans">
      {/* Halos d'ambiance en arrière-plan */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/15 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/15 blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        
        {/* EN-TÊTE DU DASHBOARD */}
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
            {/* Bouton pour ouvrir le gestionnaire de CV de base */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/15 border border-white/20 text-white shadow-lg transition-all flex items-center gap-2"
            >
              <span>👤 Mon CV de Base (IA)</span>
            </button>

            <button
              onClick={() => handleTriggerScan('all')}
              disabled={scanning}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-90 text-white shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {scanning ? <>⏳ Scan en cours...</> : <>🚀 Scanner maintenant</>}
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
              {filteredOpportunities.map((opp) => (
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

                        {/* Bouton pour ouvrir et retoucher le CV et l'accroche */}
                        <button
                          onClick={() => handleOpenTargetModal(opp)}
                          className="text-xs px-3.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-all font-semibold flex items-center gap-1.5"
                        >
                          👁️ Voir / Retoucher CV & Accroche
                        </button>

                        {/* Bouton Télécharger CV en PDF direct */}
                        <a
                          href={`/cv/${opp.id}?print=true`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all font-semibold flex items-center gap-1.5"
                        >
                          📥 Télécharger CV en PDF
                        </a>
                      </div>
                    </div>

                    {/* Boutons d'action rapides */}
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
              ))}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* MODALE 1 : RETOUCHE DU CV & ACCROCHE DE L'OPPORTUNITÉ         */}
        {/* ============================================================ */}
        {selectedTarget && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#10131d] border border-white/20 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 text-gray-200 shadow-2xl space-y-6">
              
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                      Candidature personnalisée • {selectedTarget.source}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                      ✏️ Retouche en direct possible
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white mt-1">
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

              {targetSavedSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <span>✅ Modifications enregistrées dans la base de données ! Le CV PDF est mis à jour.</span>
                </div>
              )}

              {/* Retouche de l'accroche */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    ✉️ Message d'accroche / Lettre de motivation (Modifiable)
                  </label>
                  <button
                    onClick={() => handleCopyText(editedCoverLetter)}
                    className="text-xs px-3 py-1 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-all font-semibold"
                  >
                    {copied ? "✅ Copié !" : "📋 Copier le texte"}
                  </button>
                </div>
                <textarea
                  value={editedCoverLetter}
                  onChange={(e) => setEditedCoverLetter(e.target.value)}
                  rows={6}
                  placeholder="Écrivez ou ajustez le message d'accroche..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-all leading-relaxed"
                />
              </div>

              {/* Retouche du CV */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    📄 CV Adapté à l'offre (Format Markdown - Modifiable)
                  </label>
                  <span className="text-[11px] text-gray-400">
                    Vous pouvez ajouter, supprimer ou modifier vos compétences & expériences
                  </span>
                </div>
                <textarea
                  value={editedCvMarkdown}
                  onChange={(e) => setEditedCvMarkdown(e.target.value)}
                  rows={10}
                  placeholder="Contenu du CV en Markdown..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-mono text-gray-200 focus:outline-none focus:border-purple-500 transition-all leading-relaxed"
                />
              </div>

              {/* Actions de la modale */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-5">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleSaveTargetEdits}
                    disabled={savingTarget}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all disabled:opacity-50"
                  >
                    {savingTarget ? "Enregistrement..." : "💾 Enregistrer les retouches"}
                  </button>

                  <a
                    href={`/cv/${selectedTarget.id}?print=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    📥 Télécharger le CV en PDF
                  </a>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setSelectedTarget(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={() => {
                      handleSaveTargetEdits();
                      handleUpdateStatus(selectedTarget.id, 'approved');
                      if (selectedTarget.external_url) window.open(selectedTarget.external_url, '_blank');
                      setSelectedTarget(null);
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    ✨ Postuler & Valider
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODALE 2 : MON CV DE BASE (SOURCE D'INSPIRATION POUR L'IA)    */}
        {/* ============================================================ */}
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#10131d] border border-white/20 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 text-gray-200 shadow-2xl space-y-6">
              
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>👤</span> Mon CV de Base (Inspiration pour l'IA)
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    L'IA Gemini s'inspire de ce profil pour concevoir vos CV sur-mesure et vos accroches.
                  </p>
                </div>
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="text-gray-400 hover:text-white text-2xl font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {profileSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                  {profileSuccessMsg}
                </div>
              )}

              {/* Zone d'import de fichier (PDF ou Word) */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border-2 border-dashed border-white/15 text-center space-y-3">
                <div className="text-3xl">📄</div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Importer un CV existant (PDF, Word .docx, ou Texte)
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    L'IA extrait automatiquement vos expériences, compétences et formations.
                  </p>
                </div>

                <div className="flex justify-center">
                  <label className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white shadow-lg transition-all inline-flex items-center gap-2">
                    {uploadingCv ? (
                      <>⏳ Analyse par l'IA en cours...</>
                    ) : (
                      <>📁 Choisir un fichier (PDF / Word)</>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      disabled={uploadingCv}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Champs Nom et Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Nom complet (affiché sur le CV)
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Email de contact
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: contact@email.com"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Zone de texte éditable du CV de base */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Contenu détaillé de votre profil (Compétences, Expériences, Missions)
                  </label>
                  <span className="text-[11px] text-gray-400">
                    Modifiable librement
                  </span>
                </div>
                <textarea
                  value={baseProfileText}
                  onChange={(e) => setBaseProfileText(e.target.value)}
                  rows={10}
                  placeholder="Décrivez vos compétences, vos expériences majeures, vos technologies..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-mono text-gray-200 focus:outline-none focus:border-blue-500 transition-all leading-relaxed"
                />
              </div>

              {/* Actions du profil */}
              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-5">
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all"
                >
                  Fermer
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white shadow-lg transition-all disabled:opacity-50"
                >
                  {savingProfile ? "Enregistrement..." : "💾 Enregistrer mon CV de référence"}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}
