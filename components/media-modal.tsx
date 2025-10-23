"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialogTitle } from "@radix-ui/react-dialog";

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: "image" | "video";
  alt?: string;
}

export function MediaModal({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  alt = "Media content",
}: MediaModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="bg-[#00000010] backdrop-blur-lg" />
        <DialogContent
          className={cn(
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
            "w-[95vw] max-h-[85vh] p-0 border-none bg-transparent shadow-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "duration-300 flex items-center justify-center"
          )}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className={cn(
              "absolute -right-2 -top-2 z-10",
              "rounded-full p-2 bg-white/90 backdrop-blur-sm",
              "shadow-lg hover:bg-white transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50",
              "group"
            )}
            aria-label="Close media"
          >
            <X className="h-5 w-5 text-gray-700 group-hover:text-gray-900 transition-colors" />
          </button>

          <DialogTitle className="hidden" />

          {/* Media Content */}
          <div className="relative w-full h-full flex items-center justify-center">
            {mediaType === "image" ? (
              <img
                src={mediaUrl}
                alt={alt}
                className={cn(
                  "max-w-full max-h-[85vh] w-auto h-auto object-contain",
                  "rounded-lg shadow-2xl"
                )}
              />
            ) : (
              <iframe
                src={mediaUrl}
                className={cn(
                  "max-w-full max-h-[85vh] w-auto h-[95dvh] object-contain",
                  "rounded-lg shadow-2xl"
                )}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video content"
              />
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
