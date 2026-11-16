import React, { createElement } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  chunkSubtitles,
  normalizeContent,
  resolveColors,
  resolveFonts,
  type Format,
  type RenderScene,
  type StyleColors,
  type StyleFonts,
  type SubtitleSettings,
} from "./types";

// Portare 1:1 a lui src/components/SceneRenderer.tsx din aplicație (framer-motion -> cadre Remotion).
// Aceleași dimensiuni (unități cqw), aceleași întârzieri, durate și curbe de mișcare.
const EASE = Easing.bezier(0.22, 1, 0.36, 1); // ease-ul explicit din aplicație
const EASE_DEFAULT = Easing.bezier(0, 0, 0.58, 1); // "easeOut", implicit în framer-motion când nu e dat un ease

// Valorile în pixeli din aplicație (y: 30, x: -40, y: 60, blur 12) sunt raportate la o previzualizare
// de aproximativ această lățime, ca să rămână proporționale la 1080 px.
const REF_WIDTH = { "9:16": 390, "16:9": 640 } as const;

type Props = {
  scene: RenderScene;
  format: Format;
  colors: StyleColors | null;
  fonts: StyleFonts | null;
  subtitles: SubtitleSettings;
};

export const SceneView: React.FC<Props> = ({ scene, format, colors, fonts, subtitles }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const v = format === "9:16";
  const c = resolveColors(colors);
  const f = resolveFonts(fonts);
  const k: any = normalizeContent(scene.content);
  const template = scene.template;

  const sec = frame / fps;
  const t = (delay: number, duration: number, easing: (n: number) => number = EASE_DEFAULT) =>
    interpolate(sec, [delay, delay + duration], [0, 1], { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const px = (n: number) => (n / REF_WIDTH[format]) * width;

  const S = (n: number) => `${n}cqw`;
  const H: CSSProperties = { fontFamily: `'${f.heading}', serif`, lineHeight: 1.02 };
  const pad = v ? "8cqw" : "6cqw";
  const list = (x: any): string[] => (Array.isArray(x) ? x : typeof x === "string" ? x.split("\n") : []).filter(Boolean);
  const text = (n: number): CSSProperties => ({ margin: 0, fontSize: S(n) });
  const kickerStyle: CSSProperties = { color: c.primary, fontSize: S(v ? 4.5 : 2.2), letterSpacing: "0.25em", textTransform: "uppercase" };

  // echivalentul lui up(d) din aplicație: opacity 0->1, y 30->0, 0.8 s
  const up = (d: number, tag: string, style: CSSProperties, children: ReactNode, key?: string | number) => {
    const p = t(d, 0.8, EASE);
    return createElement(
      tag,
      { key, style: { margin: 0, opacity: p, transform: `translateY(${(1 - p) * px(30)}px)`, ...style } },
      children,
    );
  };

  const col = (extra: CSSProperties): CSSProperties => ({ display: "flex", height: "100%", flexDirection: "column", ...extra });

  let body: ReactNode = null;
  switch (template) {
    case "big_title":
      body = (
        <div style={col({ justifyContent: "center", padding: pad })}>
          {up(0, "div", kickerStyle, k.kicker)}
          {up(0.15, "h1", { ...H, fontSize: S(v ? 13 : 7.5), fontWeight: 900, margin: `${S(2)} 0` }, k.title)}
          <div style={{ transformOrigin: "left center", transform: `scaleX(${t(0.4, 0.8, EASE)})`, height: S(0.5), width: "30%", background: c.primary }} />
          {up(0.55, "p", { fontSize: S(v ? 5 : 2.6), color: c.secondary, marginTop: S(2) }, k.subtitle)}
        </div>
      );
      break;

    case "strike_replace": {
      const pw = t(1.3, 0.6, EASE);
      body = (
        <div style={col({ alignItems: "center", justifyContent: "center", textAlign: "center", padding: pad })}>
          {up(0, "div", kickerStyle, k.kicker)}
          <div style={{ position: "relative", marginTop: S(3) }}>
            {up(0.1, "span", { ...H, fontSize: S(v ? 14 : 8), color: c.secondary, display: "inline-block" }, k.old_word)}
            <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transformOrigin: "left center", transform: `scaleX(${t(0.8, 0.5)})`, height: S(1), background: c.accent }} />
          </div>
          <span style={{ ...H, fontSize: S(v ? 16 : 9), fontWeight: 900, color: c.primary, opacity: pw, transform: `scale(${0.7 + 0.3 * pw})` }}>{k.new_word}</span>
          {up(1.7, "p", { fontSize: S(v ? 4.5 : 2.4), marginTop: S(3), maxWidth: "85%" }, k.note)}
        </div>
      );
      break;
    }

    case "photo_bigtext": {
      const pb = t(0, 1.6, EASE);
      const pi = t(0.3, 1, EASE);
      body = (
        <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap", ...H, fontWeight: 900, fontSize: S(v ? 48 : 32), color: c.primary, opacity: 0.12 * pb, transform: `scale(${1.2 - 0.2 * pb})` }}>{k.bg_text}</div>
          {scene.imageFile ? (
            <Img src={staticFile(scene.imageFile)} style={{ position: "absolute", bottom: 0, left: "50%", height: v ? "70%" : "90%", maxWidth: "90%", objectFit: "contain", opacity: pi, transform: `translateX(-50%) translateY(${(1 - pi) * px(60)}px)` }} />
          ) : null}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: pad, background: `linear-gradient(transparent, ${c.background})` }}>
            {up(0.7, "h2", { ...H, fontSize: S(v ? 10 : 5.5), fontWeight: 900 }, k.headline)}
            {up(0.9, "p", { fontSize: S(v ? 4.5 : 2.2), color: c.secondary }, k.caption)}
          </div>
        </div>
      );
      break;
    }

    case "quote_sidebar":
      body = (
        <div style={{ display: "flex", height: "100%", alignItems: "center", padding: pad }}>
          <div style={{ transformOrigin: "center top", transform: `scaleY(${t(0, 0.8, EASE)})`, width: S(v ? 2 : 1), alignSelf: "stretch", background: c.primary, marginRight: S(v ? 6 : 4) }} />
          <div>
            {up(0.2, "div", { ...H, fontSize: S(v ? 20 : 10), color: c.primary, height: S(v ? 10 : 5) }, "“")}
            {up(0.35, "blockquote", { ...H, fontSize: S(v ? 8 : 4.5), fontStyle: "italic" }, k.quote)}
            {up(0.8, "div", { marginTop: S(4), fontSize: S(v ? 4.5 : 2.2), fontWeight: 700, color: c.primary }, `— ${k.author ?? ""}`)}
            {up(0.95, "div", { fontSize: S(v ? 3.8 : 1.8), color: c.secondary }, k.source)}
          </div>
        </div>
      );
      break;

    case "big_number": {
      const pn = t(0, 1.1, EASE);
      body = (
        <div style={col({ alignItems: "center", justifyContent: "center", textAlign: "center", padding: pad })}>
          <div style={{ ...H, fontWeight: 900, fontSize: S(v ? 34 : 20), color: c.primary, lineHeight: 0.9, opacity: pn, transform: `scale(${1.6 - 0.6 * pn})`, filter: `blur(${(1 - pn) * px(12)}px)` }}>{k.number}</div>
          {up(0.6, "div", { fontSize: S(v ? 6 : 3.2), letterSpacing: "0.15em", textTransform: "uppercase", marginTop: S(3) }, k.label)}
          {up(0.8, "p", { fontSize: S(v ? 4.5 : 2.2), color: c.secondary, marginTop: S(1.5) }, k.caption)}
        </div>
      );
      break;
    }

    case "reveal_list": {
      const items = list(k.items);
      body = (
        <div style={col({ justifyContent: "center", padding: pad })}>
          {up(0, "h2", { ...H, fontSize: S(v ? 9 : 5), fontWeight: 900, marginBottom: S(4) }, k.title)}
          {items.map((it, i) => {
            const p = t(0.5 + i * 0.6, 0.6, EASE);
            return (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: S(3), fontSize: S(v ? 5.5 : 3), marginBottom: S(2.5), opacity: p, transform: `translateX(${(1 - p) * -px(40)}px)` }}>
                <span style={{ ...H, color: c.primary, fontWeight: 900 }}>{String(i + 1).padStart(2, "0")}</span>
                <span>{it}</span>
              </div>
            );
          })}
        </div>
      );
      break;
    }

    case "closing_question": {
      const opts = list(k.options);
      body = (
        <div style={col({ alignItems: "center", justifyContent: "center", textAlign: "center", padding: pad })}>
          {up(0, "div", kickerStyle, k.kicker)}
          {up(0.2, "h2", { ...H, fontSize: S(v ? 10 : 5.5), fontWeight: 900, margin: `${S(3)} 0 ${S(5)}` }, k.question)}
          <div style={v ? { display: "flex", width: "100%", flexDirection: "column", gap: S(2.5) } : { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: S(2.5) }}>
            {opts.map((o, i) => {
              const p = t(0.7 + i * 0.25, 0.5);
              return (
                <div key={i} style={{ border: `${S(0.3)} solid ${c.primary}`, padding: `${S(2)} ${S(4)}`, borderRadius: S(1), fontSize: S(v ? 4.5 : 2.4), opacity: p, transform: `scale(${0.8 + 0.2 * p})` }}>
                  <b style={{ color: c.primary }}>{String.fromCharCode(65 + i)}.</b> {o}
                </div>
              );
            })}
          </div>
        </div>
      );
      break;
    }

    default:
      body = <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", opacity: 0.6 }}>Șablon necunoscut: {template}</div>;
  }

  // Imaginea discretă din spatele scenelor care nu sunt "foto" (doar dacă există imagine).
  const showBackdrop = template !== "photo_bigtext" && k.image_hint && scene.imageFile;

  return (
    <AbsoluteFill style={{ background: c.background, color: c.text, fontFamily: `'${f.body}', sans-serif`, containerType: "inline-size", overflow: "hidden" }}>
      {showBackdrop ? (
        <div style={{ position: "absolute", inset: 0, opacity: 0.2 }}>
          <Img src={staticFile(scene.imageFile as string)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ) : null}
      <div style={{ position: "absolute", inset: 0 }}>{body}</div>
      <Subtitles text={k.voiceover || ""} durationMs={(scene.durationFrames / fps) * 1000} elapsedMs={sec * 1000} settings={subtitles} format={format} />
    </AbsoluteFill>
  );
};

const SIZE = { S: 3, M: 4, L: 5 } as const;
const SIZE_VERTICAL = { S: 4, M: 5, L: 6 } as const;

const Subtitles: React.FC<{ text: string; durationMs: number; elapsedMs: number; settings: SubtitleSettings; format: Format }> = ({ text, durationMs, elapsedMs, settings, format }) => {
  if (!settings.enabled) return null;
  const chunk = chunkSubtitles(text, durationMs).find((ch) => elapsedMs >= ch.start_ms && elapsedMs < ch.end_ms);
  if (!chunk) return null;
  const vertical = format === "9:16";
  const place: CSSProperties =
    settings.position === "center"
      ? { top: "50%", transform: "translate(-50%, -50%)" }
      : settings.position === "top"
        ? { top: vertical ? "12%" : "6%", transform: "translateX(-50%)" }
        : { bottom: vertical ? "22%" : "6%", transform: "translateX(-50%)" };
  return (
    <div style={{ position: "absolute", zIndex: 10, left: "50%", width: "max-content", maxWidth: "85%", textAlign: "center", fontWeight: 700, lineHeight: 1.3, overflowWrap: "anywhere", color: "#fff", fontSize: S2((vertical ? SIZE_VERTICAL : SIZE)[settings.size]), ...place }}>
      <span style={{ background: "rgba(10,10,10,0.78)", padding: "0.15em 0.35em", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", borderRadius: 3 }}>{chunk.text}</span>
    </div>
  );
};
const S2 = (n: number) => `${n}cqw`;
