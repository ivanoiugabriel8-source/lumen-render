import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { RenderProps } from "../src/types";

export type RenderOptions = {
  props: RenderProps;
  publicDir: string;
  outFile: string;
  scale?: number; // 1 = 1080p, 0.5 = draft
  crf?: number;
  browserExecutable?: string | null;
  onProgress?: (fraction: number) => void;
};

export async function renderVideo(o: RenderOptions) {
  const serveUrl = await bundle({
    entryPoint: path.resolve("src/index.ts"),
    publicDir: o.publicDir,
  });

  const browserExecutable = o.browserExecutable || null;
  const composition = await selectComposition({
    serveUrl,
    id: "Video",
    inputProps: o.props,
    browserExecutable,
    timeoutInMilliseconds: 120000,
  });

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    audioCodec: "aac",
    pixelFormat: "yuv420p",
    crf: o.crf ?? 20,
    x264Preset: "medium",
    outputLocation: o.outFile,
    inputProps: o.props,
    scale: o.scale ?? 1,
    concurrency: Math.max(1, Math.min(4, os.cpus().length)),
    browserExecutable,
    timeoutInMilliseconds: 120000,
    onProgress: ({ progress }) => o.onProgress?.(progress),
  });

  return { durationInFrames: composition.durationInFrames, width: composition.width, height: composition.height };
}
