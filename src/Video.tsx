import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { SceneView } from "./SceneView";
import { useGoogleFonts } from "./fonts";
import { MUSIC_FADE_IN_S, MUSIC_FADE_OUT_S, resolveColors, resolveFonts, type RenderProps } from "./types";

export const Video: React.FC<RenderProps> = (p) => {
  const c = resolveColors(p.colors);
  const f = resolveFonts(p.fonts);
  useGoogleFonts([f.heading, f.body]);
  const { fps, durationInFrames } = useVideoConfig();

  const last = p.scenes.length - 1;
  let from = 0;
  const level = p.musicVolume / 100;
  const totalS = durationInFrames / fps;

  return (
    <AbsoluteFill style={{ background: c.background }}>
      {p.scenes.map((scene, i) => {
        const start = from;
        from += scene.durationFrames;
        // ultima scenă rămâne pe ecran cât se stinge muzica (ca în aplicație)
        const dur = scene.durationFrames + (i === last && p.musicFile ? p.tailFrames : 0);
        return (
          <Sequence key={i} from={start} durationInFrames={Math.max(1, dur)}>
            <SceneView scene={scene} format={p.format} colors={p.colors} fonts={p.fonts} subtitles={p.subtitles} />
            {scene.audioFile ? <Html5Audio src={staticFile(scene.audioFile)} /> : null}
          </Sequence>
        );
      })}
      {p.musicFile ? (
        <Html5Audio
          src={staticFile(p.musicFile)}
          loop
          loopVolumeCurveBehavior="extend"
          volume={(frame) => {
            const tt = frame / fps;
            const fadeIn = Math.min(1, tt / MUSIC_FADE_IN_S);
            const fadeOut = Math.min(1, Math.max(0, (totalS - tt) / MUSIC_FADE_OUT_S));
            return level * fadeIn * fadeOut;
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
