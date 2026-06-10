"use client";

import { useState, useCallback } from "react";

export interface UploadedImage {
  id: string;
  name: string;
  url: string;
  size: string;
  type: string;
}

export interface ImageLot {
  id: string;
  name: string;
  images: UploadedImage[];
  rawFiles: File[];
}

const getFileKey = (file: File) =>
  `${file.name}-${file.lastModified}-${file.size}`;

export function useMockGrouping() {
  const [files, setFiles] = useState<File[]>([]);
  const [imageMap, setImageMap] = useState<Record<string, UploadedImage>>({});
  const [lots, setLots] = useState<ImageLot[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpload = useCallback((newFiles: File[]) => {
    setIsProcessing(true);
    
    // We defer the synchronous state mapping to a small timeout
    // to give the browser time to paint the loading spinner state.
    setTimeout(() => {
      setFiles((prevFiles) => {
        const updatedFiles = [...prevFiles, ...newFiles];
        
        setImageMap((prevMap) => {
          const nextMap = { ...prevMap };
          newFiles.forEach((file) => {
            const key = getFileKey(file);
            if (!nextMap[key]) {
              const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
              nextMap[key] = {
                id: key,
                name: file.name,
                url: URL.createObjectURL(file),
                size: `${sizeInMB} MB`,
                type: file.type,
              };
            }
          });

          // Sync images flat list
          const newImages = updatedFiles
            .map((file) => nextMap[getFileKey(file)])
            .filter((img): img is UploadedImage => !!img);
          setImages(newImages);

          return nextMap;
        });

        return updatedFiles;
      });
      setIsProcessing(false);
    }, 50);
  }, []);

  const clearAll = useCallback(() => {
    // Revoke all created Object URLs to release memory
    Object.values(imageMap).forEach((img) => {
      if (img.url.startsWith("blob:")) {
        URL.revokeObjectURL(img.url);
      }
    });

    setFiles([]);
    setLots([]);
    setImages([]);
    setImageMap({});
    setIsProcessing(false);
  }, [imageMap]);

  // Merge lot at index with the one preceding it
  const mergeLot = useCallback((lotId: string) => {
    setLots((prevLots) => {
      const idx = prevLots.findIndex((l) => l.id === lotId);
      if (idx <= 0) return prevLots;

      const mergedLots = [...prevLots];
      const prevLot = mergedLots[idx - 1];
      const currentLot = mergedLots[idx];

      mergedLots[idx - 1] = {
        ...prevLot,
        images: [...prevLot.images, ...currentLot.images],
        rawFiles: [...prevLot.rawFiles, ...currentLot.rawFiles],
      };

      mergedLots.splice(idx, 1);

      return mergedLots.map((lot, i) => ({
        ...lot,
        id: `lot-${i + 1}`,
        name: `Lot ${String(i + 1).padStart(2, "0")}`,
      }));
    });
  }, []);

  // Split lot right after the image with imageId
  const splitLot = useCallback((lotId: string, imageId: string) => {
    setLots((prevLots) => {
      const idx = prevLots.findIndex((l) => l.id === lotId);
      if (idx === -1) return prevLots;

      const lotToSplit = prevLots[idx];
      const imgIdx = lotToSplit.images.findIndex((img) => img.id === imageId);

      if (imgIdx === -1 || imgIdx === lotToSplit.images.length - 1)
        return prevLots;

      const splitLots = [...prevLots];
      const firstPartImages = lotToSplit.images.slice(0, imgIdx + 1);
      const secondPartImages = lotToSplit.images.slice(imgIdx + 1);

      const firstPartFiles = lotToSplit.rawFiles.slice(0, imgIdx + 1);
      const secondPartFiles = lotToSplit.rawFiles.slice(imgIdx + 1);

      splitLots[idx] = {
        ...lotToSplit,
        images: firstPartImages,
        rawFiles: firstPartFiles,
      };

      const newLot: ImageLot = {
        id: `lot-split-temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: "Split Lot",
        images: secondPartImages,
        rawFiles: secondPartFiles,
      };

      splitLots.splice(idx + 1, 0, newLot);

      return splitLots.map((lot, i) => ({
        ...lot,
        id: `lot-${i + 1}`,
        name: `Lot ${String(i + 1).padStart(2, "0")}`,
      }));
    });
  }, []);

  return {
    files,
    imageMap,
    setLots,
    images,
    lots,
    isProcessing,
    handleUpload,
    clearAll,
    mergeLot,
    splitLot,
  };
}
