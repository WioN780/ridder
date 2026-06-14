"use client";

import React, { useState } from "react";
import { ImageLot, UploadedImage } from "@/hooks/use-mock-grouping";
import { LotCard } from "@/components/LotCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FolderKanban, Layers, Info } from "lucide-react";

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

interface LotGridProps {
  lots: ImageLot[];
  listings: Record<string, Listing>;
  loadingLots: Record<string, boolean>;
  errorLots: Record<string, string | null>;
  onMerge: (lotId: string) => void;
  onSplit: (lotId: string, imageId: string) => void;
  onGenerate: (lotId: string) => void;
  onRegenerate: () => void;
  currency?: string;
  generatedImages?: Record<string, string>;
  loadingImages?: Record<string, boolean>;
  errorImages?: Record<string, string | null>;
  onGenerateImage?: (lotId: string) => void;
}

export const LotGrid = React.memo(function LotGrid({
  lots,
  listings,
  loadingLots,
  errorLots,
  onMerge,
  onSplit,
  onGenerate,
  currency = "USD",
  generatedImages = {},
  loadingImages = {},
  errorImages = {},
  onGenerateImage = () => {},
}: LotGridProps) {
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(
    null,
  );

  if (lots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border border-border/60 rounded-lg p-12 text-center bg-card/10">
        <FolderKanban className="h-8 w-8 text-muted-foreground mb-4" />
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          No clusters generated yet. Ingest files to initialize the board.
        </p>
      </div>
    );
  }

  // Find which lot contains the selected image
  const getSelectedImageLotName = (image: UploadedImage) => {
    const lot = lots.find((l) => l.images.some((img) => img.id === image.id));
    return lot ? lot.name.toUpperCase() : "UNKNOWN";
  };

  return (
    <div className="space-y-6">
      {lots.map((lot, index) => (
        <LotCard
          key={lot.id}
          lot={lot}
          index={index}
          listing={listings[lot.id] || null}
          isLoading={loadingLots[lot.id] || false}
          error={errorLots[lot.id] || null}
          onMerge={onMerge}
          onSplit={onSplit}
          onGenerate={onGenerate}
          onSelectImage={setSelectedImage}
          currency={currency}
          generatedImage={generatedImages[lot.id] || null}
          isImageLoading={loadingImages[lot.id] || false}
          imageError={errorImages[lot.id] || null}
          onGenerateImage={onGenerateImage}
        />
      ))}

      {/* High-Fidelity Asset Details Dialog */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
      >
        {selectedImage && (
          <DialogContent className="max-w-3xl border-border bg-card p-0 overflow-hidden flex flex-col md:flex-row h-[500px]">
            {/* Left: Image display */}
            <div className="flex-1 bg-black flex items-center justify-center relative p-6 h-1/2 md:h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="max-h-full max-w-full object-contain rounded"
              />
            </div>

            {/* Right: Metadata sidebar */}
            <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-border p-5 flex flex-col justify-between bg-card text-xs font-mono h-1/2 md:h-full">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xxs uppercase tracking-wider text-muted-foreground">
                    Asset Name
                  </h4>
                  <p className="truncate text-foreground font-semibold font-sans">
                    {selectedImage.name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40 text-[10px] text-muted-foreground">
                  <div>
                    <span className="block uppercase text-[9px] tracking-wider text-muted-foreground/60">
                      Size
                    </span>
                    <span className="text-foreground">
                      {selectedImage.size}
                    </span>
                  </div>
                  <div>
                    <span className="block uppercase text-[9px] tracking-wider text-muted-foreground/60">
                      Format
                    </span>
                    <span className="text-foreground uppercase">
                      {selectedImage.type.split("/")[1] || "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xxs uppercase tracking-wider text-muted-foreground">
                    UUID Identifier
                  </h4>
                  <p className="text-[10px] text-muted-foreground break-all">
                    {selectedImage.id}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xxs uppercase tracking-wider text-muted-foreground">
                    Assigned Unit
                  </h4>
                  <p className="text-foreground flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    {getSelectedImageLotName(selectedImage)}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-xxs uppercase tracking-wider text-muted-foreground">
                    <Info className="h-3 w-3" />
                    Auditing Status
                  </div>
                  <div className="inline-flex items-center rounded bg-secondary/80 border border-border px-2 py-0.5 text-xxs font-semibold text-foreground">
                    VERIFIED CLUSTER
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground/60 border-t border-border/40 pt-3 text-center uppercase tracking-wider font-sans">
                Audited via Ridder Engine
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
});
