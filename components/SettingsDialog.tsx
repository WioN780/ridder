"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sliders, Key, ShieldAlert, Loader2, Coins, Landmark, Globe, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ModelItem {
  name: string;
  display_name: string;
  description: string;
}

const defaultModels: ModelItem[] = [
  {
    name: "gemini-2.5-flash",
    display_name: "Gemini 2.5 Flash (Default)",
    description: "Newer, faster model optimized for coding and multimodal tasks.",
  },
  {
    name: "gemini-1.5-flash",
    display_name: "Gemini 1.5 Flash",
    description: "Fast and versatile multimodal model.",
  },
  {
    name: "gemini-1.5-pro",
    display_name: "Gemini 1.5 Pro",
    description: "Complex reasoning and larger context window.",
  },
  {
    name: "gemini-2.5-pro",
    display_name: "Gemini 2.5 Pro",
    description: "Newest pro model for advanced reasoning and coding.",
  },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [currency, setCurrency] = useState("USD");
  const [pricingStrategy, setPricingStrategy] = useState("vinted_frugal");
  const [language, setLanguage] = useState("English");
  const [exampleOutput, setExampleOutput] = useState("");
  const [models, setModels] = useState<ModelItem[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const fetchModels = useCallback(async (key: string) => {
    setIsLoadingModels(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const url = `${baseUrl}/list-models?api_key=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || defaultModels);
      } else {
        setModels(defaultModels);
      }
    } catch (err) {
      console.error("Failed to fetch models from server:", err);
      setModels(defaultModels);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  // Initialize values when settings open
  useEffect(() => {
    if (open && typeof window !== "undefined") {
      const storedKey = localStorage.getItem("ridder_gemini_api_key") || "";
      const storedModel = localStorage.getItem("ridder_gemini_model") || "gemini-2.5-flash";
      const storedCurrency = localStorage.getItem("ridder_currency") || "USD";
      const storedStrategy = localStorage.getItem("ridder_pricing_strategy") || "vinted_frugal";
      const storedLanguage = localStorage.getItem("ridder_language") || "English";
      const storedExampleOutput = localStorage.getItem("ridder_example_output") || "";
      
      // Update state asynchronously to avoid React render cascade warning
      setTimeout(() => {
        setApiKey(storedKey);
        setSelectedModel(storedModel);
        setCurrency(storedCurrency);
        setPricingStrategy(storedStrategy);
        setLanguage(storedLanguage);
        setExampleOutput(storedExampleOutput);
        fetchModels(storedKey);
      }, 0);
    }
  }, [open, fetchModels]);

  // Debounced model list retrieval when API key is edited
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      fetchModels(apiKey);
    }, 800);
    return () => clearTimeout(timer);
  }, [apiKey, open, fetchModels]);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ridder_gemini_api_key", apiKey.trim());
      localStorage.setItem("ridder_gemini_model", selectedModel);
      localStorage.setItem("ridder_currency", currency);
      localStorage.setItem("ridder_pricing_strategy", pricingStrategy);
      localStorage.setItem("ridder_language", language);
      localStorage.setItem("ridder_example_output", exampleOutput);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold font-mono">
            <Sliders className="h-4 w-4" /> SYSTEM SETTINGS
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure classification rules and artificial intelligence
            processing behavior.
          </DialogDescription>
        </DialogHeader>

        {/* API Key — full width above the two-column area */}
        <div className="space-y-2 py-3 text-xs font-mono border-b border-border/40">
          <div className="flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
            <Key className="h-3 w-3" />
            Gemini API Key
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API key (AIzaSy...)"
            className="w-full rounded border border-border bg-background/50 p-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring font-sans"
          />
          <div className="flex items-start gap-2 rounded border border-yellow-950/40 bg-yellow-950/5 p-2.5 text-[10px] text-yellow-500/80 leading-normal font-sans">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>API keys are stored locally in your browser only.</span>
          </div>
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-2 gap-6 py-3 text-xs font-mono">
          {/* ---- LEFT COLUMN: compact controls ---- */}
          <div className="space-y-4">
            {/* Model */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-muted-foreground uppercase tracking-wider">
                  Classification Engine (Model)
                </label>
                {isLoadingModels && (
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    UPDATING...
                  </span>
                )}
              </div>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full rounded border border-border bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans text-xs uppercase cursor-pointer"
              >
                {models.map((model) => (
                  <option
                    key={model.name}
                    value={model.name}
                    className="bg-card text-foreground text-xs font-sans"
                  >
                    {model.display_name}
                  </option>
                ))}
              </select>
              {models.find((m) => m.name === selectedModel)?.description && (
                <p className="text-[10px] text-muted-foreground leading-normal mt-1 font-sans">
                  {models.find((m) => m.name === selectedModel)?.description}
                </p>
              )}
            </div>

            {/* Currency & Pricing — sub-grid */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
              {/* Currency */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                  <Coins className="h-3 w-3" />
                  Currency
                </div>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded border border-border bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans text-xs cursor-pointer"
                >
                  <option value="USD" className="bg-card text-foreground">USD ($)</option>
                  <option value="EUR" className="bg-card text-foreground">EUR (€)</option>
                  <option value="HRN" className="bg-card text-foreground">HRN (₴)</option>
                  <option value="PLN" className="bg-card text-foreground">PLN (zł)</option>
                </select>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                  <Globe className="h-3 w-3" />
                  Language
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded border border-border bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans text-xs cursor-pointer"
                >
                  <option value="English" className="bg-card text-foreground">English</option>
                  <option value="French" className="bg-card text-foreground">Français</option>
                  <option value="German" className="bg-card text-foreground">Deutsch</option>
                  <option value="Spanish" className="bg-card text-foreground">Español</option>
                  <option value="Italian" className="bg-card text-foreground">Italiano</option>
                  <option value="Portuguese" className="bg-card text-foreground">Português</option>
                  <option value="Dutch" className="bg-card text-foreground">Nederlands</option>
                  <option value="Polish" className="bg-card text-foreground">Polski</option>
                  <option value="Lithuanian" className="bg-card text-foreground">Lietuvių</option>
                  <option value="Ukrainian" className="bg-card text-foreground">Українська</option>
                </select>
              </div>
            </div>

            {/* Pricing Strategy */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                <Landmark className="h-3 w-3" />
                Pricing Strategy Profile
              </div>
              <select
                value={pricingStrategy}
                onChange={(e) => setPricingStrategy(e.target.value)}
                className="w-full rounded border border-border bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans text-xs cursor-pointer"
              >
                <option value="vinted_frugal" className="bg-card text-foreground">
                  Vinted Frugal (Conservative)
                </option>
                <option value="standard_market" className="bg-card text-foreground">
                  Standard Secondhand (Balanced)
                </option>
                <option value="premium_resale" className="bg-card text-foreground">
                  Premium Resale (Depop-style)
                </option>
              </select>
              <p className="text-[10px] text-muted-foreground leading-normal mt-1 font-sans">
                {pricingStrategy === "vinted_frugal"
                  ? "Optimizes pricing for price-sensitive buyers ($5 – $25 range)."
                  : pricingStrategy === "standard_market"
                  ? "Competitive market value based on condition and brand."
                  : "Premium retail resale values (Depop / Grailed)."}
              </p>
            </div>

            {/* Read-only info row */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
              <div className="space-y-2">
                <label className="text-muted-foreground uppercase tracking-wider">
                  Max Retries
                </label>
                <div className="rounded border border-border bg-background p-2 text-muted-foreground">
                  2
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-muted-foreground uppercase tracking-wider">
                  Output Schema
                </label>
                <div className="rounded border border-border bg-background p-2 text-muted-foreground">
                  E-commerce Listing
                </div>
              </div>
            </div>
          </div>

          {/* ---- RIGHT COLUMN: example output style guide ---- */}
          <div className="flex flex-col space-y-2 border-l border-border/40 pl-6">
            <div className="flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
              <FileText className="h-3 w-3" />
              Example Output (Style Guide)
            </div>
            <textarea
              value={exampleOutput}
              onChange={(e) => setExampleOutput(e.target.value)}
              placeholder="Paste an example description that the AI should mimic in format and tone..."
              className="flex-1 min-h-[200px] w-full rounded border border-border bg-background/50 p-2.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring font-sans text-xs leading-relaxed resize-none"
            />
            <p className="text-[10px] text-muted-foreground leading-normal font-sans">
              Provide a reference description. Generated listings will emulate its style, structure, and detail level. Leave blank for default style.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs font-mono border-border bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground"
          >
            CANCEL
          </Button>
          <Button
            onClick={handleSave}
            className="h-8 text-xs font-mono bg-primary text-primary-foreground hover:opacity-90 border-transparent"
          >
            SAVE CHANGES
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
