// Test local, fără Supabase: generează fișiere de probă și randează un video.
//   npm run render:demo
// Variabile opționale: FORMAT=16:9, SCALE=0.5, BROWSER_EXECUTABLE=/cale/catre/chrome
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { renderVideo } from "./lib";
import type { Format, RenderProps } from "../src/types";

const format = (process.env["FORMAT"] === "16:9" ? "16:9" : "9:16") as Format;
const scale = Number(process.env["SCALE"] || 0.5);
const fps = 30;
const root = path.resolve("work/demo");
const assets = path.join(root, "public", "assets");
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(assets, { recursive: true });
fs.mkdirSync("out", { recursive: true });

const ff = (...args: string[]) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args]);
const tone = (name: string, freq: number, secs: number) =>
  ff("-f", "lavfi", "-i", `sine=frequency=${freq}:duration=${secs}`, "-ar", "24000", "-ac", "1", path.join(assets, name));
ff("-f", "lavfi", "-i", "color=c=0x6b6b6b:s=900x1100", "-vf", "drawbox=x=300:y=220:w=300:h=300:color=0xd0d0d0:t=fill,drawbox=x=180:y=540:w=540:h=560:color=0x9a9a9a:t=fill", "-frames:v", "1", path.join(assets, "photo.png"));
tone("v1.wav", 200, 4.2);
tone("v2.wav", 220, 5);
tone("v3.wav", 240, 4.6);
tone("v4.wav", 260, 4);
tone("v5.wav", 280, 5.4);
tone("v6.wav", 300, 5);
tone("v7.wav", 320, 4.4);
ff("-f", "lavfi", "-i", "sine=frequency=110:duration=12", "-ar", "44100", "-ac", "2", path.join(assets, "music.wav"));

const sec = (s: number) => Math.round(s * fps);
const props: RenderProps = {
  format,
  fps,
  colors: { background: "#0f1412", text: "#f2efe8", primary: "#c0392b", secondary: "#c9a24b", accent: "#c0392b" },
  fonts: { heading: "Barlow Condensed", body: "Barlow" },
  subtitles: { enabled: true, position: "bottom", size: "M" },
  musicFile: "assets/music.wav",
  musicVolume: 15,
  tailFrames: sec(1.5),
  scenes: [
    { template: "big_title", content: { kicker: "Istoria României", title: "Marea Unire", subtitle: "1 decembrie 1918", voiceover: "În 1918, românii din Transilvania au votat unirea cu România." }, durationFrames: sec(4.2), audioFile: "assets/v1.wav", imageFile: null },
    { template: "strike_replace", content: { kicker: "De fapt", old_word: "Pace", new_word: "Război", note: "Unirea s-a realizat în contextul Primului Război Mondial." }, durationFrames: sec(5), audioFile: "assets/v2.wav", imageFile: null },
    { template: "photo_bigtext", content: { bg_text: "1918", headline: "Alba Iulia", caption: "Adunarea Națională a votat unirea", voiceover: "La Alba Iulia s-au adunat mii de oameni din toate colțurile Transilvaniei." }, durationFrames: sec(4.6), audioFile: "assets/v3.wav", imageFile: "assets/photo.png" },
    { template: "quote_sidebar", content: { quote: "Istoria este martorul timpurilor.", author: "Cicero", source: "De Oratore", voiceover: "O frază veche spune că istoria este martorul timpurilor." }, durationFrames: sec(4), audioFile: "assets/v4.wav", imageFile: null },
    { template: "big_number", content: { number: "1918", label: "Marea Unire", caption: "Un an decisiv", voiceover: "Anul 1918 rămâne un moment decisiv pentru România." }, durationFrames: sec(5.4), audioFile: "assets/v5.wav", imageFile: null },
    { template: "reveal_list", content: { title: "3 lucruri de știut", items: ["Primul", "Al doilea", "Al treilea"], voiceover: "Trei lucruri merită știute despre acest moment din istorie." }, durationFrames: sec(5), audioFile: "assets/v6.wav", imageFile: null },
    { template: "closing_question", content: { kicker: "Tu ce crezi?", question: "Care a fost momentul decisiv?", options: ["A", "B", "C"], voiceover: "Și acum întrebarea pentru tine: care a fost momentul decisiv?" }, durationFrames: sec(4.4), audioFile: "assets/v7.wav", imageFile: null },
  ],
};

const out = path.resolve(`out/demo-${format.replace(":", "x")}.mp4`);
const t0 = Date.now();
const info = await renderVideo({
  props,
  publicDir: path.join(root, "public"),
  outFile: out,
  scale,
  browserExecutable: process.env["BROWSER_EXECUTABLE"] || null,
  onProgress: (p) => { if (Math.round(p * 100) % 10 === 0) process.stdout.write(`\r${Math.round(p * 100)}%`); },
});
console.log(`\nGata în ${((Date.now() - t0) / 1000).toFixed(0)} s: ${out} (${info.width}x${info.height}, ${info.durationInFrames} cadre)`);
