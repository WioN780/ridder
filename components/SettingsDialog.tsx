"use client";

import React, { useState, useEffect } from "react";
import { Sliders, Key, ShieldAlert, Loader2, Coins, Landmark } from "lucide-react";
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

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [currency, setCurrency] = useState("USD");
  const [pricingStrategy, setPricingStrategy] = useState("vinted_frugal");
  const [models, setModels] = useState<ModelItem[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

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

  // Initialize values when settings open
  useEffect(() => {
    if (open && typeof window !== "undefined") {
      const storedKey = localStorage.getItem("ridder_gemini_api_key") || "";
      const storedModel = localStorage.getItem("ridder_gemini_model") || "gemini-2.5-flash";
      const storedCurrency = localStorage.getItem("ridder_currency") || "USD";
      const storedStrategy = localStorage.getItem("ridder_pricing_strategy") || "vinted_frugal";
      
      setApiKey(storedKey);
      setSelectedModel(storedModel);
      setCurrency(storedCurrency);
      setPricingStrategy(storedStrategy);
      fetchModels(storedKey);
    }
  }, [open]);

  // Debounced model list retrieval when API key is edited
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      fetchModels(apiKey);
    }, 800);
    return () => clearTimeout(timer);
  }, [apiKey, open]);

  const fetchModels = async (key: string) => {
    setIsLoadingModels(true);
    try {
      const url = `http://localhost:8000/list-models?api_key=${encodeURIComponent(key)}`;
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
  };

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ridder_gemini_api_key", apiKey.trim());
      localStorage.setItem("ridder_gemini_model", selectedModel);
      localStorage.setItem("ridder_currency", currency);
      localStorage.setItem("ridder_pricing_strategy", pricingStrategy);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold font-mono">
            <Sliders className="h-4 w-4" /> SYSTEM SETTINGS
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure classification rules and artificial intelligence
            processing behavior.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 text-xs font-mono">
          <div className="space-y-2">
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

          <div className="space-y-2 pt-2 border-t border-border/40">
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
            <div className="relative">
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
            </div>
            {models.find((m) => m.name === selectedModel)?.description && (
              <p className="text-[10px] text-muted-foreground leading-normal mt-1 font-sans">
                {models.find((m) => m.name === selectedModel)?.description}
              </p>
            )}
          </div>

          {/* Currency configuration */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
              <Coins className="h-3 w-3" />
              E-commerce Currency
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded border border-border bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans text-xs cursor-pointer"
            >
              <option value="USD" className="bg-card text-foreground">USD ($) - US Dollar</option>
              <option value="EUR" className="bg-card text-foreground">EUR (€) - Euro</option>
              <option value="HRN" className="bg-card text-foreground">HRN (₴) - Ukrainian Hryvnia</option>
              <option value="PLN" className="bg-card text-foreground">PLN (zł) - Polish Zloty</option>
            </select>
          </div>

          {/* Pricing Strategy Profile */}
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
                Vinted Frugal (Cheap / Conservative Pricing)
              </option>
              <option value="standard_market" className="bg-card text-foreground">
                Standard Secondhand (Balanced / Fair Value)
              </option>
              <option value="premium_resale" className="bg-card text-foreground">
                Premium Resale (Optimistic / Depop-style)
              </option>
            </select>
            <p className="text-[10px] text-muted-foreground leading-normal mt-1 font-sans">
              {pricingStrategy === "vinted_frugal"
                ? "Optimizes pricing for highly price-sensitive Vinted buyers (prices generally average $5 - $25)."
                : pricingStrategy === "standard_market"
                ? "Estimates competitive market value based on item condition and branding."
                : "Aims for higher, premium retail resale values commonly found on Depop or Grailed."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
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
