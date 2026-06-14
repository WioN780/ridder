"use client";

import React, { useState } from "react";
import { UploadedImage } from "@/hooks/use-mock-grouping";
import { Info, Maximize2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ImageGridProps {
  images: UploadedImage[];
  onRemove?: (id: string) => void;
}

export function ImageGrid({ images, onRemove }: ImageGridProps) {
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);

  if (images.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Repository Items ({images.length})
        </h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {images.map((image) => (
          <div
            key={image.id}
            onClick={() => setSelectedImage(image)}
            className="group relative aspect-square overflow-hidden rounded-md border border-border bg-card/40 cursor-pointer transition-all duration-200 hover:border-border hover:ring-1 hover:ring-border"
          >
            {/* Image Preview */}
            <div className="relative h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-center justify-center">
                <Maximize2 className="h-4 w-4 text-white" />
              </div>
            </div>

            {/* Subtle name badge */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xs p-1.5 text-left border-t border-border/20">
              <p className="truncate text-xxs font-mono text-foreground">{image.name}</p>
              <p className="text-[10px] font-mono text-muted-foreground">{image.size}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Image Detail Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
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
                  <h4 className="text-xxs uppercase tracking-wider text-muted-foreground">File Name</h4>
                  <p className="truncate text-foreground font-semibold font-sans">{selectedImage.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xxs uppercase tracking-wider text-muted-foreground">Size</h4>
                    <p className="text-foreground">{selectedImage.size}</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xxs uppercase tracking-wider text-muted-foreground">Format</h4>
                    <p className="text-foreground uppercase">{selectedImage.type.split("/")[1] || "Unknown"}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xxs uppercase tracking-wider text-muted-foreground">ID Reference</h4>
                  <p className="text-xxs text-muted-foreground break-all">{selectedImage.id}</p>
                </div>

                <div className="pt-3 border-t border-border/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-xxs uppercase tracking-wider text-muted-foreground">
                    <Info className="h-3 w-3" />
                    Classification Status
                  </div>
                  <div className="inline-flex items-center rounded bg-secondary/80 border border-border px-2 py-0.5 text-xxs font-semibold text-foreground">
                    MOCK ASSIGNED
                  </div>
                </div>
              </div>

              {onRemove && (
                <button
                  onClick={() => {
                    onRemove(selectedImage.id);
                    setSelectedImage(null);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded border border-destructive/20 bg-destructive/5 py-2 text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Asset
                </button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
