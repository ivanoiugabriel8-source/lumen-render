import React from "react";
import { Composition } from "remotion";
import { Video } from "./Video";
import { FRAME_SIZE, type RenderProps } from "./types";

const defaultProps: RenderProps = {
  format: "9:16",
  fps: 30,
  colors: { background: "#0f1412", text: "#f2efe8", primary: "#c0392b", secondary: "#c9a24b", accent: "#c0392b" },
  fonts: { heading: "Barlow Condensed", body: "Barlow" },
  scenes: [
    { template: "big_title", content: { kicker: "Lumen Studio", title: "Previzualizare", subtitle: "Randare pe server", voiceover: "" }, durationFrames: 90, audioFile: null, imageFile: null },
  ],
  musicFile: null,
  musicVolume: 15,
  subtitles: { enabled: false, position: "bottom", size: "M" },
  tailFrames: 45,
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Video"
    component={Video}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={defaultProps}
    calculateMetadata={({ props }) => {
      const scenes = props.scenes.reduce((a, s) => a + s.durationFrames, 0);
      const total = scenes + (props.musicFile ? props.tailFrames : 0);
      return { durationInFrames: Math.max(1, total), fps: props.fps, ...FRAME_SIZE[props.format] };
    }}
  />
);
