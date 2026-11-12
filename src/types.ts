// Tipuri și funcții copiate din aplicația Lumen Studio (src/lib/types.ts și src/lib/editor-media.ts),
// ca randarea să folosească exact aceleași reguli de culori, fonturi și subtitrări.

export type Format = "9:16" | "16:9";

export type TemplateId =
  | "big_title"
  | "strike_replace"
  | "photo_bigtext"
  | "quote_sidebar"
  | "big_number"
  | "reveal_list"
  | "closing_question";

export interface StyleColors {
  background?: string;
  text?: string;
  primary?: string;
  secondary?: string;
  accent?: string;
  [k: string]: string | undefined;
}
export interface StyleFonts {
  heading?: string;
  body?: string;
  [k: string]: string | undefined;
}

export function resolveColors(c?: StyleColors | null) {
  return {
    background: c?.background ?? c?.["bg"] ?? "#111111",
    text: c?.text ?? c?.["foreground"] ?? "#f5f1e8",
    primary: c?.primary ?? "#d4af37",
    secondary: c?.secondary ?? c?.["muted"] ?? "#8a8475",
    accent: c?.accent ?? c?.primary ?? "#d4af37",
  };
}
export function resolveFonts(f?: StyleFonts | null) {
  return {
    heading: f?.heading ?? f?.["title"] ?? "Playfair Display",
    body: f?.body ?? f?.["text"] ?? "Inter Tight",
  };
}

export type SubtitleSettings = { enabled: boolean; position: "bottom" | "center" | "top"; size: "S" | "M" | "L" };
export type SubtitleChunk = { text: string; start_ms: number; end_ms: number };

export function subtitleSettings(settings: Record<string, unknown> = {}): SubtitleSettings {
  const value = settings["subtitles"];
  const s = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    enabled: s["enabled"] === true,
    position: s["position"] === "top" || s["position"] === "center" ? s["position"] : "bottom",
    size: s["size"] === "S" || s["size"] === "L" ? s["size"] : "M",
  };
}

export function musicVolume(settings: Record<string, unknown> = {}): number {
  const v = settings["music_volume"];
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 15;
}

/** Identic cu aplicația: bucăți echilibrate de 4–6 cuvinte, cu timpul proporțional cu numărul de cuvinte. */
export function chunkSubtitles(text: string, duration: number): SubtitleChunk[] {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  if (!words.length || !Number.isFinite(duration) || duration <= 0) return [];
  const count = Math.ceil(words.length / 6);
  const base = Math.floor(words.length / count);
  const extra = words.length % count;
  let offset = 0;
  return Array.from({ length: count }, (_, index) => {
    const length = base + (index < extra ? 1 : 0);
    const start = offset;
    offset += length;
    return {
      text: words.slice(start, offset).join(" "),
      start_ms: (duration * start) / words.length,
      end_ms: (duration * offset) / words.length,
    };
  });
}

/** Ce primește compoziția Remotion. Fișierele sunt căi relative în folderul public/ al bundle-ului. */
export type RenderScene = {
  template: TemplateId;
  content: Record<string, any>;
  durationFrames: number;
  audioFile: string | null;
  imageFile: string | null;
};
export type RenderProps = {
  format: Format;
  fps: number;
  colors: StyleColors | null;
  fonts: StyleFonts | null;
  scenes: RenderScene[];
  musicFile: string | null;
  musicVolume: number; // 0-100
  subtitles: SubtitleSettings;
  tailFrames: number; // coada de după ultima scenă, în care muzica se stinge
};

export const FRAME_SIZE: Record<Format, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
};

export const MUSIC_FADE_IN_S = 1;
export const MUSIC_FADE_OUT_S = 1.5;
