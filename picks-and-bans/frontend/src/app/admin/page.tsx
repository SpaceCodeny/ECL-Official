"use client";

import { useState } from "react";
import { Plus, Users, Copy, Check, ExternalLink, ArrowLeft } from "lucide-react";
import { createSession } from "@/lib/api";

export default function AdminPage() {
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreateSession = async () => {
    const nameA = teamAName.trim();
    const nameB = teamBName.trim();

    if (!nameA || !nameB) {
      alert("Digite o nome de ambos os times!");
      return;
    }

    if (nameA.toLowerCase() === nameB.toLowerCase()) {
      alert("Os times devem ter nomes diferentes!");
      return;
    }

    setLoading(true);

    try {
      const response = await createSession(nameA, nameB);
      const link = `${window.location.origin}/session/${response.sessionId}`;
      setGeneratedLink(link);
      setSessionId(response.sessionId);
    } catch (error) {
      alert("Erro ao criar sessão. Verifique se o servidor está rodando.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Erro ao copiar link!");
    }
  };

  const openSession = () => {
    window.open(generatedLink, "_blank");
  };

  const createNewSession = () => {
    setGeneratedLink("");
    setSessionId("");
    setTeamAName("");
    setTeamBName("");
    setCopied(false);
  };

  // Tela de link gerado
  if (generatedLink) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ink via-navy to-ink p-8">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-8 w-8 text-green-400" />
            </div>
            <h1 className="mb-2 font-display text-4xl font-bold uppercase tracking-tight text-paper">
              Sessão Criada com Sucesso!
            </h1>
            <p className="text-muted">Compartilhe o link abaixo com os líderes dos times</p>
          </div>

          {/* Times */}
          <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-6">
            <div className="text-center">
              <p className="mb-1 text-sm text-muted">Time A</p>
              <p className="font-display text-2xl font-bold text-gold">{teamAName}</p>
              <p className="text-xs text-muted">{teamAName.substring(0, 4).toUpperCase()}</p>
            </div>
            <div className="text-center">
              <p className="mb-1 text-sm text-muted">Time B</p>
              <p className="font-display text-2xl font-bold text-gold">{teamBName}</p>
              <p className="text-xs text-muted">{teamBName.substring(0, 4).toUpperCase()}</p>
            </div>
          </div>

          {/* Link */}
          <div className="mb-6 space-y-3 rounded-lg border border-border bg-surface p-6">
            <label className="block text-sm font-medium text-paper">🔗 Link da Sessão</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={generatedLink}
                readOnly
                className="flex-1 rounded-lg border border-border bg-ink px-4 py-3 font-mono text-sm text-paper focus:outline-none"
              />
              <button
                onClick={copyLink}
                className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-bold text-ink transition-all hover:bg-gold-light"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Instruções */}
          <div className="mb-6 space-y-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-6">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-blue-300">
              📋 Instruções para os Times
            </h3>
            <ul className="space-y-2 text-sm text-blue-200">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-gold">•</span>
                <span>Compartilhe este link com os líderes de ambos os times</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-gold">•</span>
                <span>Ambos devem acessar o <strong>mesmo link</strong> para participar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-gold">•</span>
                <span>Cada time realiza suas ações quando for sua vez</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-gold">•</span>
                <span>As escolhas são salvas automaticamente no navegador</span>
              </li>
            </ul>
          </div>

          {/* Ordem do Pick & Ban */}
          <div className="mb-6 rounded-lg border border-gold/20 bg-gold/5 p-6">
            <p className="mb-3 text-sm font-medium text-gold">Ordem do Pick & Ban:</p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded bg-red-900/50 px-3 py-1.5 text-sm font-bold text-red-200">A BAN</span>
              <span className="rounded bg-red-900/50 px-3 py-1.5 text-sm font-bold text-red-200">B BAN</span>
              <span className="rounded bg-green-900/50 px-3 py-1.5 text-sm font-bold text-green-200">A PICK</span>
              <span className="rounded bg-green-900/50 px-3 py-1.5 text-sm font-bold text-green-200">B PICK</span>
              <span className="rounded bg-red-900/50 px-3 py-1.5 text-sm font-bold text-red-200">B BAN</span>
              <span className="rounded bg-red-900/50 px-3 py-1.5 text-sm font-bold text-red-200">A BAN</span>
              <span className="rounded bg-gold/50 px-3 py-1.5 text-sm font-bold text-gold">DECIDER</span>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3">
            <button
              onClick={openSession}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gold px-6 py-4 font-display text-lg font-bold uppercase tracking-wide text-ink transition-all hover:bg-gold-light"
            >
              <ExternalLink className="h-5 w-5" />
              Abrir Sessão
            </button>
            <button
              onClick={createNewSession}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-6 py-4 font-display text-lg font-bold uppercase tracking-wide text-paper transition-all hover:bg-surface/80"
            >
              <ArrowLeft className="h-5 w-5" />
              Nova Sessão
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tela de criação
  return (
    <div className="min-h-screen bg-gradient-to-b from-ink via-navy to-ink p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="mb-2 font-display text-4xl font-bold uppercase tracking-tight text-paper">
            Criar Sessão de Pick & Ban
          </h1>
          <p className="text-muted">Digite o nome dos times para iniciar uma sessão de treino</p>
        </div>

        <div className="space-y-6 rounded-lg border border-border bg-surface p-6">
          {/* Time A */}
          <div>
            <label className="mb-2 block text-sm font-medium text-paper">
              <Users className="mb-1 inline h-4 w-4" /> Nome do Time A
            </label>
            <input
              type="text"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              placeholder="Ex: Phantom Squad"
              className="w-full rounded-lg border border-border bg-ink px-4 py-3 text-paper placeholder:text-muted/50 focus:border-gold focus:outline-none"
            />
          </div>

          {/* Time B */}
          <div>
            <label className="mb-2 block text-sm font-medium text-paper">
              <Users className="mb-1 inline h-4 w-4" /> Nome do Time B
            </label>
            <input
              type="text"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              placeholder="Ex: Crimson Wolves"
              className="w-full rounded-lg border border-border bg-ink px-4 py-3 text-paper placeholder:text-muted/50 focus:border-gold focus:outline-none"
            />
          </div>

          <button
            onClick={handleCreateSession}
            disabled={loading || !teamAName.trim() || !teamBName.trim()}
            className="w-full rounded-lg bg-gold px-6 py-4 font-display text-lg font-bold uppercase tracking-wide text-ink transition-all hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              "Criando..."
            ) : (
              <>
                <Plus className="mr-2 inline h-5 w-5" />
                Gerar Link da Sessão
              </>
            )}
          </button>
        </div>

        {/* Informações */}
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-gold/20 bg-gold/5 p-4">
            <p className="text-sm text-gold">
              <strong>💡 Como funciona:</strong> Após criar a sessão, você receberá um link para compartilhar com ambos os times.
              O Pick & Ban acontecerá em tempo real seguindo a ordem:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded bg-red-900/50 px-2 py-1 text-xs font-bold text-red-200">A BAN</span>
              <span className="rounded bg-red-900/50 px-2 py-1 text-xs font-bold text-red-200">B BAN</span>
              <span className="rounded bg-green-900/50 px-2 py-1 text-xs font-bold text-green-200">A PICK</span>
              <span className="rounded bg-green-900/50 px-2 py-1 text-xs font-bold text-green-200">B PICK</span>
              <span className="rounded bg-red-900/50 px-2 py-1 text-xs font-bold text-red-200">B BAN</span>
              <span className="rounded bg-red-900/50 px-2 py-1 text-xs font-bold text-red-200">A BAN</span>
              <span className="rounded bg-gold/50 px-2 py-1 text-xs font-bold text-gold">DECIDER</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="mb-2 text-sm font-medium text-paper">📋 Dica:</p>
            <p className="text-sm text-muted">
              Cada time deve entrar no mesmo link para fazer suas escolhas de ban e pick.
              O sistema funciona localmente, sem necessidade de login.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
