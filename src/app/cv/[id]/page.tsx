import { prisma } from "@/lib/prisma";
import { marked } from "marked";
import Link from "next/link";
import { notFound } from "next/navigation";
import CvClientToolbar from "./CvClientToolbar";

export default async function CvPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const autoPrint = resolvedSearchParams.print === "true";

  const target = await prisma.targets.findUnique({
    where: { id },
    include: {
      deliverables: true,
      users: true,
    },
  });

  if (!target) {
    notFound();
  }

  const cvDeliverable = target.deliverables.find(
    (d: any) => d.type === "cv_markdown"
  );

  const cvMarkdown =
    cvDeliverable?.content ||
    `# CV de Candidature\n\n**Poste visé :** ${target.title}\n**Entreprise :** ${target.company_name}\n\n## Profil\n${target.users?.base_profile_text || ""}`;

  const parsedHtml = await marked.parse(cvMarkdown);

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-900 py-8 px-4 print:p-0 print:bg-white print:text-black">
      {/* Barre d'outils flottante (masquée à l'impression) */}
      <div className="max-w-4xl mx-auto mb-6 print:hidden">
        <CvClientToolbar
          targetTitle={target.title || "Opportunité"}
          companyName={target.company_name || ""}
          autoPrint={autoPrint}
        />
      </div>

      {/* Feuille A4 du CV */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-8 md:p-14 border border-gray-200 print:border-none print:shadow-none print:p-0 print:max-w-none print:rounded-none">
        
        {/* En-tête executive */}
        <header className="border-b-2 border-blue-600 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-950 tracking-tight">
              {target.users?.full_name || "Candidat"}
            </h1>
            <p className="text-base font-semibold text-blue-600 mt-1">
              Candidature pour : {target.title || "Poste visé"}
            </p>
            {target.company_name && (
              <p className="text-xs text-gray-500 mt-0.5">
                À l'attention de l'équipe recrutement • {target.company_name} ({target.location || "France"})
              </p>
            )}
          </div>

          {target.ai_match_score && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 print:border-gray-300">
              Score d'adéquation : {target.ai_match_score}%
            </div>
          )}
        </header>

        {/* Contenu du CV formaté en Markdown */}
        <div
          className="prose prose-sm md:prose-base max-w-none text-gray-800 space-y-4
            prose-headings:text-gray-950 prose-headings:font-bold
            prose-h1:text-xl prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-2 prose-h1:mt-6
            prose-h2:text-base prose-h2:text-blue-800 prose-h2:border-b prose-h2:border-gray-100 prose-h2:pb-1 prose-h2:mt-5
            prose-h3:text-sm prose-h3:text-gray-700 prose-h3:mt-3
            prose-p:leading-relaxed prose-p:my-2
            prose-ul:my-2 prose-li:my-1
            prose-strong:text-gray-950 prose-strong:font-semibold"
          dangerouslySetInnerHTML={{ __html: parsedHtml }}
        />

        {/* Pied de page discret */}
        <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400 print:text-gray-500">
          Candidature sur-mesure • Générée pour l'offre {target.title} ({target.source || "Web"})
        </footer>
      </div>
    </div>
  );
}
