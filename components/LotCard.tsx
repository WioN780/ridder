"use client";

import React, { useState, useEffect } from "react";
import { ImageLot, UploadedImage } from "@/hooks/use-mock-grouping";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Merge,
  Clock,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  Loader2,
  Scissors,
  Image as ImageIcon,
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

interface LotCardProps {
  lot: ImageLot;
  index: number;
  listing: Listing | null;
  isLoading: boolean;
  error: string | null;
  onMerge: (lotId: string) => void;
  onSplit: (lotId: string, imageId: string) => void;
  onGenerate: (lotId: string) => void;
  onSelectImage: (image: UploadedImage) => void;
  currency?: string;
  generatedImage?: string | null;
  isImageLoading?: boolean;
  imageError?: string | null;
  onGenerateImage?: (lotId: string) => void;
  imageModel?: string;
}

export const LotCard = React.memo(function LotCard({
  lot,
  index,
  listing,
  isLoading,
  error,
  onMerge,
  onSplit,
  onGenerate,
  onSelectImage,
  currency = "USD",
  generatedImage = null,
  isImageLoading = false,
  imageError = null,
  onGenerateImage = () => {},
  imageModel = "",
}: LotCardProps) {
  const isImagenModel = imageModel.toLowerCase().startsWith("imagen");
  const [descCopied, setDescCopied] = useState(false);


  const handleCopyDescription = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(editedDescription).then(() => {
      setDescCopied(true);
      setTimeout(() => setDescCopied(false), 1500);
    });
  };

  // Synchronously decodes a data URL into a File (dataTransfer must be populated
  // before the dragstart handler returns, so this can't be done via fetch/await).
  const dataUrlToFile = (dataUrl: string, baseName: string): File | null => {
    const match = dataUrl.match(/^data:(.+?);base64,(.*)$/);
    if (!match) return null;
    const [, mime, base64] = match;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const ext = mime.split("/")[1]?.split("+")[0] || "jpg";
    return new File([bytes], `${baseName}.${ext}`, { type: mime });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.clearData();

    if (activeTab === "ai_cover" && generatedImage) {
      const file = dataUrlToFile(generatedImage, `${lot.name}-ai-cover`);
      if (file) {
        try {
          e.dataTransfer.items.add(file);
        } catch (err) {
          console.error("Failed to add AI cover image to dataTransfer:", err);
        }
      }
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("text/plain", `${lot.name}: AI cover image`);
      return;
    }

    if (lot.rawFiles && lot.rawFiles.length > 0) {
      lot.rawFiles.forEach((file) => {
        try {
          e.dataTransfer.items.add(file);
        } catch (err) {
          console.error(
            "Failed to add file to dataTransfer items during dragstart:",
            err,
          );
        }
      });

      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData(
        "text/plain",
        `${lot.name}: ${lot.rawFiles.length} photos`,
      );
    }
  };

  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case "EUR":
        return "€";
      case "HRN":
        return "₴";
      case "PLN":
        return "zł";
      default:
        return "$";
    }
  };

  const symbol = getCurrencySymbol(currency);

  // Carousel State
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<"original" | "ai_cover">("original");

  // Editable Form Fields
  const [editedTitle, setEditedTitle] = useState("");
  const [editedPrice, setEditedPrice] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  // Sync edit state when listing is received
  useEffect(() => {
    if (listing) {
      setEditedTitle(listing.title);
      setEditedPrice(
        listing.price !== undefined && listing.price !== null
          ? String(listing.price)
          : "",
      );
      setEditedDescription(listing.description);
    } else {
      setEditedTitle("");
      setEditedPrice("");
      setEditedDescription("");
    }
  }, [listing]);

  // Reset carousel index if images list changes
  useEffect(() => {
    setCarouselIdx(0);
  }, [lot.images]);

  const handleGenerate = () => {
    onGenerate(lot.id);
  };

  // Carousel controls
  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCarouselIdx((prev) => (prev === 0 ? lot.images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCarouselIdx((prev) => (prev === lot.images.length - 1 ? 0 : prev + 1));
  };

  // Timeline mock helper
  const getMockTimeline = () => {
    const startHour = 12;
    const startMinute = index * 8;
    const endMinute = startMinute + Math.min(lot.images.length * 2, 7);
    return `TIMELINE: ${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}:00 - ${String(startHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}:15`;
  };

  return (
    <Card className="border-border bg-card/25 backdrop-blur-xs transition-all duration-200 hover:scale-[1.002] hover:border-border/80 rounded-lg overflow-hidden shadow-none">
      {/* Header */}
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border/40 bg-card/10">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <CardTitle className="text-xs font-mono font-bold tracking-wider text-foreground">
            {lot.name.toUpperCase()}
          </CardTitle>
          <span className="h-1.5 w-1.5 rounded-full bg-border/60" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            {lot.images.length} {lot.images.length === 1 ? "asset" : "assets"}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-border/60" />
          <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/80">
            <Clock className="h-3 w-3" />
            {getMockTimeline()}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {index > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMerge(lot.id)}
              disabled={isLoading}
              className="h-7 px-2.5 text-[10px] font-mono border-border bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
            >
              <Merge className="mr-1 h-3 w-3" />
              MERGE UP
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isLoading}
            className={`h-7 px-2.5 text-[10px] font-mono border-border transition-all disabled:opacity-50
              ${
                listing
                  ? "bg-primary/5 hover:bg-primary/10 border-primary/20 text-foreground"
                  : "bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground"
              }
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                GENERATING...
              </>
            ) : (
              <>
                <Sparkles className="mr-1 h-3 w-3 text-muted-foreground" />
                {listing ? "RE-GENERATE" : "GENERATE"}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Error message */}
        {error && (
          <div className="m-4 flex items-start gap-2 rounded border border-destructive/20 bg-destructive/5 p-3 text-xxs font-mono text-destructive uppercase tracking-wider leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {listing ? (
          /* Split View Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 border-t border-border/40 divide-y md:divide-y-0 md:divide-x divide-border/40">
            {/* LEFT: Tabbed Image Preview (Original Photos vs. AI Cover Image) */}
            <div className="flex flex-col border-r border-border/40 bg-black/5 aspect-square md:aspect-auto md:h-auto min-h-[300px]">
              {/* Tab Header */}
              <div className="flex border-b border-border/40 text-[10px] font-mono uppercase bg-card/25 tracking-wider">
                <button
                  type="button"
                  onClick={() => setActiveTab("original")}
                  className={`flex-1 py-2 text-center transition-colors cursor-pointer border-b ${
                    activeTab === "original"
                      ? "border-primary text-foreground bg-primary/5 font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Original Photos ({lot.images.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ai_cover")}
                  className={`flex-1 py-2 text-center transition-colors cursor-pointer border-b ${
                    activeTab === "ai_cover"
                      ? "border-primary text-foreground bg-primary/5 font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  AI Cover Image
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 flex flex-col items-center justify-center p-6 relative group/carousel">
                {activeTab === "original" ? (
                  lot.images.length > 0 && (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={lot.images[carouselIdx].url}
                        alt={lot.images[carouselIdx].name}
                        className="max-h-[350px] max-w-full object-contain rounded border border-border/30 bg-background"
                      />

                      {/* Prev/Next Controls */}
                      {lot.images.length > 1 && (
                        <>
                          <button
                            onClick={handlePrevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/80 hover:bg-card text-foreground transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleNextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/80 hover:bg-card text-foreground transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>

                          {/* Dot indicators */}
                          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                            {lot.images.map((_, i) => (
                              <span
                                key={i}
                                className={`h-1.5 w-1.5 rounded-full transition-all ${
                                  i === carouselIdx
                                    ? "bg-foreground w-3"
                                    : "bg-muted-foreground/35"
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                ) : (
                  /* AI Cover Image Tab */
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                    {isImageLoading ? (
                      <div className="flex flex-col items-center justify-center space-y-2 font-mono text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin text-foreground" />
                        <span className="text-[10px] uppercase animate-pulse">GENERATING COVER...</span>
                      </div>
                    ) : generatedImage ? (
                      <div className="relative w-full h-full flex items-center justify-center group/ai-image">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={generatedImage}
                          alt="AI Generated Cover representation"
                          className="max-h-[350px] max-w-full object-contain rounded border border-border/30 bg-background"
                        />
                        {/* Regenerate overlay button */}
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/ai-image:opacity-100 transition-opacity flex items-center justify-center rounded">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onGenerateImage(lot.id)}
                            className="h-8 font-mono text-xs"
                          >
                            <Sparkles className="mr-1 h-3 w-3" />
                            REGENERATE COVER
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Placeholder empty state for AI Image */
                      <div className="text-center p-6 space-y-3 font-mono">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-border bg-card/60 text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                            No AI cover generated
                          </h4>
                          <p className="text-[9px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
                            Generate a clean, styled studio presentation cover image using your configured prompt template.
                          </p>
                          {isImagenModel && (
                            <p className="text-[9px] text-amber-500/90 max-w-xs mx-auto leading-relaxed">
                              Imagen models don&apos;t look at your photos — pick a Gemini image model in Settings for a cover grounded on the real item.
                            </p>
                          )}
                        </div>
                        {imageError && (
                          <div className="text-xxs text-destructive uppercase tracking-wide border border-destructive/20 bg-destructive/5 p-2 rounded max-w-xs mx-auto leading-normal">
                            {imageError}
                          </div>
                        )}
                        <Button
                          size="sm"
                          onClick={() => onGenerateImage(lot.id)}
                          className="h-7 text-[10px] font-mono uppercase bg-primary text-primary-foreground hover:opacity-90"
                        >
                          <Sparkles className="mr-1 h-3 w-3" />
                          Generate Cover
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Editable Form Fields */}
            <div className="p-6 space-y-4 text-xs font-mono flex flex-col justify-between">
              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xxs uppercase tracking-wider text-muted-foreground">
                    Listing Title
                  </label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full rounded border border-border bg-background/50 p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans text-xs font-medium"
                  />
                </div>

                {/* Price */}
                <div className="space-y-1.5">
                  <label className="text-xxs uppercase tracking-wider text-muted-foreground">
                    Listing Price ({currency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-muted-foreground">
                      {symbol}
                    </span>
                    <input
                      type="number"
                      value={editedPrice}
                      onChange={(e) => setEditedPrice(e.target.value)}
                      className="w-full rounded border border-border bg-background/50 py-2 pl-6 pr-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xxs uppercase tracking-wider text-muted-foreground">
                      Description
                    </label>
                    <button
                      onClick={handleCopyDescription}
                      className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-transparent hover:border-border/30 rounded px-1.5 py-0.5 bg-card/45"
                      title="Copy description text"
                    >
                      {descCopied ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span className="text-emerald-500 font-semibold uppercase">
                            Copied
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span className="uppercase">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full rounded border border-border bg-background/50 p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans text-xs leading-normal resize-none"
                  />
                </div>

                {/* Read-only AI Metadata Summary */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40 text-[10px] text-muted-foreground">
                  <div>
                    <span className="block uppercase text-xxs tracking-wider text-muted-foreground/60">
                      Brand
                    </span>
                    <span className="text-foreground">
                      {listing.brand || "Not found"}
                    </span>
                  </div>
                  <div>
                    <span className="block uppercase text-xxs tracking-wider text-muted-foreground/60">
                      Size
                    </span>
                    <span className="text-foreground">
                      {listing.size || "Not found"}
                    </span>
                  </div>
                  <div>
                    <span className="block uppercase text-xxs tracking-wider text-muted-foreground/60">
                      Condition
                    </span>
                    <span className="text-foreground truncate block">
                      {listing.condition}
                    </span>
                  </div>
                  <div>
                    <span className="block uppercase text-xxs tracking-wider text-muted-foreground/60">
                      Measurements
                    </span>
                    <span className="text-foreground block truncate">
                      {Object.keys(listing.measurements).length > 0
                        ? Object.entries(listing.measurements)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")
                        : "None"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Drag Photos Handle (Replacing Copy Listing Button) */}
              <div className="pt-4 border-t border-border/40">
                {activeTab === "ai_cover" && !generatedImage ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/30 bg-card/20 p-4 text-center select-none">
                    <span className="text-[9px] font-sans text-muted-foreground leading-relaxed">
                      Generate an AI cover image to drag it out.
                    </span>
                  </div>
                ) : (
                  <div
                    draggable
                    onDragStart={handleDragStart}
                    className="group relative flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-primary/5 hover:border-primary/40 hover:bg-primary/10 p-4 text-center cursor-grab active:cursor-grabbing transition-all duration-250 select-none"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary mb-2 transition-transform duration-300 group-hover:scale-105">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-wider text-foreground uppercase">
                      {activeTab === "ai_cover" ? "DRAG AI COVER" : "DRAG PHOTOS"}
                    </span>
                    <span className="text-[9px] font-sans text-muted-foreground mt-0.5 leading-relaxed">
                      {activeTab === "ai_cover"
                        ? "Click & drag this box to upload the AI cover image"
                        : `Click & drag this box to upload all ${lot.rawFiles?.length || lot.images.length} original photos`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Default Thumbnail List */
          <div className="p-4 overflow-hidden border-t border-border/40">
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/60 hover:scrollbar-thumb-border">
              {lot.images.map((image, imgIdx) => {
                const isLastImage = imgIdx === lot.images.length - 1;

                return (
                  <div key={image.id} className="flex items-center shrink-0">
                    <div
                      onClick={() => onSelectImage(image)}
                      className="group relative h-24 w-24 overflow-hidden rounded border border-border/50 bg-card/40 cursor-pointer transition-all duration-200 hover:border-border hover:ring-1 hover:ring-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={image.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 truncate text-[9px] font-mono text-foreground border-t border-border/20">
                        {image.name}
                      </div>
                    </div>

                    {!isLastImage && (
                      <div className="flex items-center justify-center pl-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSplit(lot.id, image.id);
                          }}
                          className="group/split flex h-8 w-6 items-center justify-center rounded border border-dashed border-border/40 hover:border-border/80 hover:bg-card/80 transition-all duration-150 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Scissors className="h-3 w-3 transform rotate-90" />
                        </button>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/30 ml-1" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
