"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useMockGrouping, ImageLot } from "@/hooks/use-mock-grouping";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { SettingsDialog } from "@/components/SettingsDialog";
import { UploadZone } from "@/components/UploadZone";
import { LotGrid } from "@/components/LotGrid";
import { Button } from "@/components/ui/button";
import { getApiKey, getModel, getCurrency, getPricingStrategy, getLanguage, getExampleOutput } from "@/lib/api-key";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Trash2,
  Plus,
  Loader2,
  Layers,
  ClipboardList,
  Sparkles,
  AlertCircle,
  Undo2,
} from "lucide-react";

interface Listing {
  title: string;
  brand?: string;
  size?: string;
  condition: string;
  measurements: Record<string, string>;
  price?: number;
  description: string;
  tags: string[];
}

interface ResponseBatchItem {
  title: string;
  brand?: string;
  size?: string;
  condition: string;
  measurements: Record<string, string>;
  price?: number;
  description: string;
  tags: string[];
  filenames: string[];
}

export default function Home() {
  const {
    files,
    imageMap,
    setLots,
    lots,
    images,
    isProcessing,
    handleUpload,
    clearAll,
    mergeLot,
    splitLot,
  } = useMockGrouping();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // API Key & Model Configuration States (Synced with LocalStorage)
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState("gemini-2.5-flash");
  const [currency, setCurrency] = useState("USD");
  const [pricingStrategy, setPricingStrategy] = useState("vinted_frugal");
  const [language, setLanguage] = useState("English");
  const [exampleOutput, setExampleOutput] = useState("");

  // Centralized Listing States
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [loadingLots, setLoadingLots] = useState<Record<string, boolean>>({});
  const [errorLots, setErrorLots] = useState<Record<string, string | null>>({});

  // Board State History for Undo
  const [history, setHistory] = useState<{ lots: ImageLot[]; listings: Record<string, Listing> }[]>([]);

  // Batch Processing States
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fetch verified models list on mount and whenever settings is closed to pick up key changes.
  // Automatically aligns the selected model to a supported option if a mismatch occurs.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedKey = getApiKey() || "";
    const savedModel = getModel() || "";
    const savedCurrency = getCurrency();
    const savedStrategy = getPricingStrategy();
    const savedLanguage = getLanguage();
    const savedExampleOutput = getExampleOutput();

    setTimeout(() => {
      setApiKey(savedKey || null);
      setCurrency(savedCurrency);
      setPricingStrategy(savedStrategy);
      setLanguage(savedLanguage);
      setExampleOutput(savedExampleOutput);
      if (!savedKey) {
        setActiveModel(savedModel || "gemini-2.5-flash");
      }
    }, 0);

    const initializeModels = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const url = `${baseUrl}/list-models?api_key=${encodeURIComponent(savedKey)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const fetchedModels: { name: string }[] = data.models || [];
          
          if (fetchedModels.length > 0) {
            const modelNames = fetchedModels.map((m) => m.name);
            let finalModel = savedModel;

            // If the saved model is not in the supported list (or is missing), align to a supported default
            if (!savedModel || !modelNames.includes(savedModel)) {
              if (modelNames.includes("gemini-2.5-flash")) {
                finalModel = "gemini-2.5-flash";
              } else if (modelNames.includes("gemini-1.5-flash")) {
                finalModel = "gemini-1.5-flash";
              } else {
                finalModel = modelNames[0];
              }
              localStorage.setItem("ridder_gemini_model", finalModel);
            }
            setActiveModel(finalModel);
          } else {
            setActiveModel(savedModel || "gemini-2.5-flash");
          }
        } else {
          setActiveModel(savedModel || "gemini-2.5-flash");
        }
      } catch (err) {
        console.error("Failed to list models on mount:", err);
        setActiveModel(savedModel || "gemini-2.5-flash");
      }
    };

    if (savedKey) {
      initializeModels();
    }
  }, [isSettingsOpen]);

  // Generate listing for a single Lot
  const generateLotListing = useCallback(async (lotId: string) => {
    const lot = lots.find((l) => l.id === lotId);
    if (!lot) return;

    if (!apiKey) {
      const errorMsg =
        "API KEY NOT FOUND. PLEASE CONFIGURE IN SYSTEM SETTINGS (TOP RIGHT).";
      setErrorLots((prev) => ({ ...prev, [lotId]: errorMsg }));
      throw new Error(errorMsg);
    }

    if (!lot.rawFiles || lot.rawFiles.length === 0) {
      const errorMsg = "NO FILES AVAILABLE FOR LISTING GENERATION.";
      setErrorLots((prev) => ({ ...prev, [lotId]: errorMsg }));
      return;
    }

    setLoadingLots((prev) => ({ ...prev, [lotId]: true }));
    setErrorLots((prev) => ({ ...prev, [lotId]: null }));

    const formData = new FormData();
    lot.rawFiles.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("api_key", apiKey);
    formData.append("model", activeModel);
    formData.append("currency", currency);
    formData.append("pricing_strategy", pricingStrategy);
    formData.append("language", language);
    if (exampleOutput && exampleOutput.trim()) {
      formData.append("example_output", exampleOutput.trim());
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const response = await fetch(`${baseUrl}/generate-listing`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Server returned status ${response.status}`,
        );
      }

      const data = await response.json();
      setListings((prev) => ({ ...prev, [lotId]: data }));
    } catch (err: unknown) {
      const errorObj = err as Error;
      const msg =
        errorObj.name === "TypeError" && errorObj.message.includes("fetch")
          ? `NETWORK ERROR: FAILED TO CONNECT TO FASTAPI BACKEND AT ${baseUrl}.`
          : errorObj.message || "AN UNEXPECTED ERROR OCCURRED.";
      setErrorLots((prev) => ({ ...prev, [lotId]: msg }));
      throw err;
    } finally {
      setLoadingLots((prev) => ({ ...prev, [lotId]: false }));
    }
  }, [lots, apiKey, activeModel, currency, pricingStrategy, language, exampleOutput]);

  // Joint visual clustering & listing generation in a single pass (Advanced AI Batch)
  const generateBatchListings = useCallback(async () => {
    if (files.length === 0) return;

    if (!apiKey) {
      setAiError(
        "API KEY NOT FOUND. CONFIGURE IN SYSTEM SETTINGS (TOP RIGHT).",
      );
      return;
    }

    setIsBatchProcessing(true);
    setAiError(null);
    setListings({});
    setLoadingLots({});
    setErrorLots({});

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("api_key", apiKey);
    formData.append("model", activeModel);
    formData.append("currency", currency);
    formData.append("pricing_strategy", pricingStrategy);
    formData.append("language", language);
    if (exampleOutput && exampleOutput.trim()) {
      formData.append("example_output", exampleOutput.trim());
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const response = await fetch(
        `${baseUrl}/generate-batch-listings`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Server returned status ${response.status}`,
        );
      }

      const data = await response.json(); // Schema: { items: BatchItem[] }

      const newListings: Record<string, Listing> = {};
      const newLots: ImageLot[] = data.items.map((item: ResponseBatchItem, index: number) => {
        const lotId = `lot-${index + 1}`;

        const matchedFiles = item.filenames
          .map((name: string) => files.find((f) => f.name === name))
          .filter((f: File | undefined): f is File => !!f);

        newListings[lotId] = {
          title: item.title,
          brand: item.brand,
          size: item.size,
          condition: item.condition,
          measurements: item.measurements,
          price: item.price,
          description: item.description,
          tags: item.tags,
        };

        return {
          id: lotId,
          name: `Lot ${String(index + 1).padStart(2, "0")}`,
          images: matchedFiles
            .map((file: File) => {
              const key = `${file.name}-${file.lastModified}-${file.size}`;
              return imageMap[key];
            })
            .filter(Boolean),
          rawFiles: matchedFiles,
        };
      });

      setLots(newLots);
      setListings(newListings);
    } catch (err: unknown) {
      const errorObj = err as Error;
      const msg =
        errorObj.name === "TypeError" && errorObj.message.includes("fetch")
          ? `NETWORK ERROR: CANNOT CONNECT TO BACKEND AT ${baseUrl}.`
          : errorObj.message || "AI BATCH PROCESS FAILED.";
      setAiError(msg);
    } finally {
      setIsBatchProcessing(false);
    }
  }, [files, apiKey, activeModel, currency, pricingStrategy, language, exampleOutput, imageMap, setLots]);

  // Board State History for Undo
  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const nextHistory = [...prev];
      const prevState = nextHistory.pop();
      if (prevState) {
        setLots(prevState.lots);
        setListings(prevState.listings);
        setLoadingLots({});
        setErrorLots({});
      }
      return nextHistory;
    });
  }, [setLots]);

  // State-clearing handlers for Lot modifications
  const handleMerge = useCallback((lotId: string) => {
    // 1. Save history before state change
    setHistory((prev) => [...prev, { lots, listings }]);

    // 2. Shift listings indices for unaffected lots
    const idx = lots.findIndex((l) => l.id === lotId);
    if (idx <= 0) return;

    const newListings: Record<string, Listing> = {};
    for (let i = 0; i < idx - 1; i++) {
      const oldId = `lot-${i + 1}`;
      if (listings[oldId]) {
        newListings[oldId] = listings[oldId];
      }
    }
    for (let i = idx + 1; i < lots.length; i++) {
      const oldId = `lot-${i + 1}`;
      const newId = `lot-${i}`;
      if (listings[oldId]) {
        newListings[newId] = listings[oldId];
      }
    }

    mergeLot(lotId);
    setListings(newListings);
    setLoadingLots({});
    setErrorLots({});
  }, [lots, listings, mergeLot]);

  const handleSplit = useCallback((lotId: string, imageId: string) => {
    // 1. Save history before state change
    setHistory((prev) => [...prev, { lots, listings }]);

    // 2. Shift listings indices for unaffected lots
    const idx = lots.findIndex((l) => l.id === lotId);
    if (idx === -1) return;

    const newListings: Record<string, Listing> = {};
    for (let i = 0; i < idx; i++) {
      const oldId = `lot-${i + 1}`;
      if (listings[oldId]) {
        newListings[oldId] = listings[oldId];
      }
    }
    for (let i = idx + 1; i < lots.length; i++) {
      const oldId = `lot-${i + 1}`;
      const newId = `lot-${i + 2}`;
      if (listings[oldId]) {
        newListings[newId] = listings[oldId];
      }
    }

    splitLot(lotId, imageId);
    setListings(newListings);
    setLoadingLots({});
    setErrorLots({});
  }, [lots, listings, splitLot]);

  const handleClearAll = useCallback(() => {
    setHistory((prev) => [...prev, { lots, listings }]);
    clearAll();
    setListings({});
    setLoadingLots({});
    setErrorLots({});
    setAiError(null);
  }, [lots, listings, clearAll]);

  const isActionBlocked = !apiKey;
  const isAnyProcessing = isProcessing || isBatchProcessing;

  // Memoize flat assets grid to prevent lag during parent state updates (e.g. settings changes)
  const unallocatedImagesGrid = useMemo(() => {
    if (images.length === 0) return null;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            INGESTED FLAT ASSETS (UNALLOCATED)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative flex flex-col overflow-hidden rounded border border-border/40 bg-card/10 hover:bg-card/20 transition-all duration-200"
            >
              <div className="aspect-square w-full overflow-hidden bg-black/5 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                />
              </div>
              <div className="p-2 border-t border-border/30 bg-card/40 flex flex-col justify-between flex-1 min-h-[50px]">
                <div className="truncate text-xxs font-mono text-foreground font-semibold" title={image.name}>
                  {image.name}
                </div>
                <div className="text-[9px] font-mono text-muted-foreground mt-0.5 uppercase">
                  {image.size}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [images]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/15">
      {/* Top Header */}
      <WorkspaceHeader onOpenSettings={() => setIsSettingsOpen(true)} />

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      {/* Main Workspace Container */}
      <main className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-6 py-8 md:py-12">
        {images.length === 0 ? (
          /* Empty State / Welcome Screen */
          <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full my-auto space-y-6">
            <div className="space-y-2 text-center">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card/60 mb-2">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
              </div>
              <h1 className="text-sm font-semibold font-mono tracking-wider text-foreground uppercase">
                LOT REVIEW BOARD
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                A minimal workspace for batch asset organization and lot
                allocation.
              </p>
            </div>

            <div className="w-full">
              <UploadZone onUpload={handleUpload} disabled={isAnyProcessing} />
            </div>

            {isProcessing && (
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Ingesting and classifying assets...
              </div>
            )}
          </div>
        ) : lots.length === 0 ? (
          /* Ingestion/Flat Assets State */
          <div className="space-y-6 animate-in fade-in duration-300 w-full">
            {/* Top Bar for Ingestion */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-border bg-card/10 rounded-lg">
              <div className="flex flex-col gap-1 text-[11px] font-mono">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${isActionBlocked ? "bg-red-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
                  <span className="text-muted-foreground uppercase">
                    REVIEW STATE:
                  </span>
                  <span className="font-semibold text-foreground">
                    {isActionBlocked ? "LOCKED (API KEY REQUIRED)" : "ASSET INGESTION"}
                  </span>
                </div>
                <div className="text-muted-foreground uppercase tracking-wider text-[10px]">
                  {images.length} flat assets ingested. Ready for lot grouping.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* AI Batch auto-listing button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateBatchListings}
                  disabled={isAnyProcessing || isActionBlocked}
                  className="h-8 text-xs font-mono border-primary/45 bg-primary/10 hover:bg-primary/20 text-foreground disabled:opacity-50"
                >
                  {isBatchProcessing ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      AUTO-LISTING...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary animate-pulse" />
                      AI AUTO-LIST
                    </>
                  )}
                </Button>

                {/* Modal Trigger for Upload Zone */}
                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                  <DialogTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isAnyProcessing}
                        className="h-8 text-xs font-mono border-border bg-card/40 hover:bg-card text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        ADD IMAGES
                      </Button>
                    }
                  />
                  <DialogContent className="max-w-md border-border bg-card">
                    <DialogHeader>
                      <DialogTitle className="text-xs font-semibold font-mono uppercase tracking-wider">
                        Ingest Assets
                      </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <UploadZone
                        onUpload={(files) => {
                          handleUpload(files);
                          setIsUploadOpen(false);
                        }}
                        disabled={isProcessing}
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                {history.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    disabled={isAnyProcessing}
                    className="h-8 text-xs font-mono border-border bg-card/45 hover:bg-card text-foreground"
                  >
                    <Undo2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    UNDO
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={isAnyProcessing}
                  className="h-8 text-xs font-mono border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  CLEAR
                </Button>
              </div>
            </div>

            {/* API Key configuration block banner */}
            {isActionBlocked && (
              <div className="flex items-start gap-2.5 p-3 rounded border border-red-500/25 bg-red-500/5 text-xxs font-mono text-red-500 uppercase tracking-wider leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  API KEY NOT CONFIGURED. SYSTEM ACTIONS ARE LOCKED. PLEASE ENTER A GEMINI API KEY IN SYSTEM SETTINGS (TOP RIGHT ICON) TO UNLOCK.
                </div>
              </div>
            )}

            {/* AI Clustering/Processing Error alert */}
            {aiError && (
              <div className="flex items-start gap-2 p-3 rounded border border-destructive/20 bg-destructive/5 text-xxs font-mono text-destructive uppercase tracking-wider leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  AI Operation failed: {aiError}
                </div>
              </div>
            )}

            {/* Loading / Ingestion progress feedback overlay */}
            {(isProcessing || isBatchProcessing) && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-border bg-card/30 text-xs font-mono text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground animate-pulse" />
                {isBatchProcessing
                  ? "AI is visually grouping images and generating listings in a single pass..."
                  : "Processing uploaded assets..."}
              </div>
            )}

            {/* Flat Assets Grid */}
            {unallocatedImagesGrid}
          </div>
        ) : (
          /* Workspace Review Board */
          <div className="space-y-6 animate-in fade-in duration-300 w-full">
            {/* Top Stats & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-border bg-card/10 rounded-lg">
              <div className="flex flex-col gap-1 text-[11px] font-mono">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${isActionBlocked ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
                  <span className="text-muted-foreground uppercase">
                    REVIEW STATE:
                  </span>
                  <span className="font-semibold text-foreground">
                    {isActionBlocked ? "LOCKED (API KEY REQUIRED)" : "ACTIVE AUDIT"}
                  </span>
                </div>
                <div className="text-muted-foreground uppercase tracking-wider text-[10px]">
                  {images.length} assets grouped into {lots.length} active lots.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* AI Batch auto-listing button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateBatchListings}
                  disabled={isAnyProcessing || isActionBlocked}
                  className="h-8 text-xs font-mono border-primary/45 bg-primary/10 hover:bg-primary/20 text-foreground disabled:opacity-50"
                >
                  {isBatchProcessing ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      AUTO-LISTING...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary animate-pulse" />
                      AI AUTO-LIST
                    </>
                  )}
                </Button>

                {/* Modal Trigger for Upload Zone */}
                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                  <DialogTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isAnyProcessing}
                        className="h-8 text-xs font-mono border-border bg-card/40 hover:bg-card text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        ADD IMAGES
                      </Button>
                    }
                  />
                  <DialogContent className="max-w-md border-border bg-card">
                    <DialogHeader>
                      <DialogTitle className="text-xs font-semibold font-mono uppercase tracking-wider">
                        Ingest Assets
                      </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <UploadZone
                        onUpload={(files) => {
                          handleUpload(files);
                          setIsUploadOpen(false);
                        }}
                        disabled={isProcessing}
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                {history.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    disabled={isAnyProcessing}
                    className="h-8 text-xs font-mono border-border bg-card/45 hover:bg-card text-foreground"
                  >
                    <Undo2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    UNDO
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={isAnyProcessing}
                  className="h-8 text-xs font-mono border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  CLEAR
                </Button>
              </div>
            </div>

            {/* API Key configuration block banner */}
            {isActionBlocked && (
              <div className="flex items-start gap-2.5 p-3 rounded border border-red-500/25 bg-red-500/5 text-xxs font-mono text-red-500 uppercase tracking-wider leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  API KEY NOT CONFIGURED. SYSTEM ACTIONS ARE LOCKED. PLEASE ENTER A GEMINI API KEY IN SYSTEM SETTINGS (TOP RIGHT ICON) TO UNLOCK.
                </div>
              </div>
            )}

            {/* AI Clustering/Processing Error alert */}
            {aiError && (
              <div className="flex items-start gap-2 p-3 rounded border border-destructive/20 bg-destructive/5 text-xxs font-mono text-destructive uppercase tracking-wider leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  AI Operation failed: {aiError}
                </div>
              </div>
            )}

            {/* Ingestion/progress feedback overlay */}
            {isAnyProcessing && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-border bg-card/30 text-xs font-mono text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />
                Processing clustering matrix...
              </div>
            )}

            {/* Vertical Review Board */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                  LOT CLUSTER BOARD (MUTABLE STATE)
                </span>
              </div>

              <LotGrid
                lots={lots}
                listings={listings}
                loadingLots={loadingLots}
                errorLots={errorLots}
                onMerge={handleMerge}
                onSplit={handleSplit}
                onGenerate={generateLotListing}
                onRegenerate={() => {}}
                currency={currency}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
