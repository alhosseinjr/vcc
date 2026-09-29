import { create } from "zustand";
import type { Language } from "@/lib/utils";

export interface InputFile { name: string; language: Language; content: string; size: number }

interface ScanInputState {
  files: InputFile[];
  addFiles: (files: InputFile[]) => void;
  removeFile: (name: string) => void;
  clear: () => void;
}

/** Holds files staged for scanning (in memory only; nothing leaves the browser here). */
export const useScanInput = create<ScanInputState>((set) => ({
  files: [],
  addFiles: (incoming) =>
    set((s) => {
      const byName = new Map(s.files.map((f) => [f.name, f]));
      incoming.forEach((f) => byName.set(f.name, f));
      return { files: [...byName.values()] };
    }),
  removeFile: (name) => set((s) => ({ files: s.files.filter((f) => f.name !== name) })),
  clear: () => set({ files: [] }),
}));
