import { useState, useRef } from "react";
import { Shield } from "lucide-react";
import EligibilityForm, { EligibilityProfile } from "@/components/sahayak/EligibilityForm";
import SchemeSearch from "@/components/sahayak/SchemeSearch";
import SchemeResults, { Scheme } from "@/components/sahayak/SchemeResults";
import AIChatAssistant from "@/components/sahayak/AIChatAssistant";
import { matchSchemes, searchSchemes } from "@/data/sahayakSchemes";

const SahayakAI = () => {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [userDocs, setUserDocs] = useState<string[]>([]);
  const [chatContext, setChatContext] = useState<string | undefined>();

  const eligibilityRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleEligibilitySubmit = (profile: EligibilityProfile) => {
    const matched = matchSchemes(profile);
    setSchemes(matched);
    setUserDocs(profile.documentsAvailable);
    setTimeout(() => scrollTo(resultsRef), 100);
  };

  const handleSearch = (query: string, category: string) => {
    const results = searchSchemes(query, category);
    setSchemes(results);
    setUserDocs([]);
    setTimeout(() => scrollTo(resultsRef), 100);
  };

  const handleAskAI = (scheme: Scheme) => {
    setChatContext(
      `Tell me about the "${scheme.name}" scheme. What is the eligibility, benefits, and how to apply? Source: ${scheme.source}`
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="gradient-hero text-primary-foreground py-16 px-4 md:px-8">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-1.5 text-sm mb-5">
            <Shield className="w-4 h-4" />
            SahayakAI from sahayak-fixer
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">
            Disability Scheme Navigator
          </h1>
          <p className="mt-4 text-primary-foreground/80 text-lg max-w-3xl mx-auto">
            Find, compare, and apply for disability support schemes with a guided AI assistant.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => scrollTo(eligibilityRef)}
              className="px-5 py-2.5 rounded-xl bg-primary-foreground text-primary font-semibold hover:opacity-90 transition-opacity"
            >
              Check Eligibility
            </button>
            <button
              onClick={() => scrollTo(searchRef)}
              className="px-5 py-2.5 rounded-xl border border-primary-foreground/30 text-primary-foreground font-semibold hover:bg-primary-foreground/10 transition-colors"
            >
              Search Schemes
            </button>
          </div>
        </div>
      </section>

      <div ref={eligibilityRef}>
        <EligibilityForm onSubmit={handleEligibilitySubmit} />
      </div>

      <div ref={searchRef}>
        <SchemeSearch onSearch={handleSearch} />
      </div>

      <div ref={resultsRef}>
        <SchemeResults schemes={schemes} userDocs={userDocs} onAskAI={handleAskAI} />
      </div>

      <footer className="bg-sahayak-navy py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-display font-bold text-lg text-primary-foreground">
                Sahayak<span className="text-sahayak-orange">AI</span>
              </span>
            </div>
            <p className="text-primary-foreground/50 text-sm text-center">
              SahayakAI is an AI-powered tool and does not substitute official government sources.
              Always verify with official channels.
            </p>
            <p className="text-primary-foreground/40 text-xs">
              © 2026 Pragyantra.
            </p>
          </div>
        </div>
      </footer>

      <AIChatAssistant initialContext={chatContext} />
    </div>
  );
};

export default SahayakAI;
