"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Image as ImageIcon } from "lucide-react";

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  disabled?: boolean;
}

export function UploadZone({ onUpload, disabled = false }: UploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0 && !disabled) {
        onUpload(acceptedFiles);
      }
    },
    [onUpload, disabled],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    accept: {
      "image/*": [".jpeg", ".png", ".jpg", ".webp"],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`relative flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center transition-all duration-200 outline-none
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${
          isDragActive
            ? "border-primary bg-primary/5 text-primary"
            : "border-border/60 bg-card/10 hover:border-border hover:bg-card/30"
        }
      `}
    >
      <input {...getInputProps()} />
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card/60 mb-4 text-muted-foreground transition-colors group-hover:text-foreground">
        {isDragActive ? (
          <Upload className="h-5 w-5 animate-pulse" />
        ) : (
          <ImageIcon className="h-5 w-5" />
        )}
      </div>
      <div className="space-y-1.5 max-w-xs">
        <p className="text-xs font-medium text-foreground">
          {isDragActive
            ? "Drop the files here"
            : "Drag & drop images, or click to browse"}
        </p>
        <p className="text-xxs text-muted-foreground font-mono uppercase tracking-wider">
          JPEG, PNG, WebP • Up to 10MB
        </p>
      </div>
    </div>
  );
}
