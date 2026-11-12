// Rulează în GitHub Actions. Citește proiectul din Supabase, randează videoul și îl urcă în bucket-ul "renders".
// Variabile necesare: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PROJECT_ID, JOB_ID
// Opționale: QUALITY=draft (540p), BROWSER_EXECUTABLE
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { renderVideo } from "./lib";
import { musicVolume, subtitleSettings, type Format, type RenderProps, type RenderScene, type TemplateId } from "../src/types";

const need = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Lipsește variabila de mediu ${name}`);
  return v;
};

const sb = createClient(need("SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const PROJECT_ID = need("PROJECT_ID");
const JOB_ID = need("JOB_ID");
const FPS = 30;
const MAX_UPLOAD_BYTES = 48 * 1024 * 1024; // limita de 50 MB a planului gratuit Supabase, cu marjă
const quality = process.env["QUALITY"] === "draft" ? "draft" : "hd";

async function setJob(patch: Record<string, unknown>) {
  const { error } = await sb.from("render_jobs").update(patch).eq("id", JOB_ID);
  if (error) console.warn("Nu am putut actualiza jobul:", error.message);
}
async function setProject(status: string) {
  const { error } = await sb.from("projects").update({ status }).eq("id", PROJECT_ID);
  if (error) console.warn("Nu am putut actualiza proiectul:", error.message);
}

const extOf = (p: string, fallback: string) => /\.([a-z0-9]{2,5})(?:\?|$)/i.exec(p.split("/").pop() || "")?.[1]?.toLowerCase() ?? fallback;

async function fetchAsset(p: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(p)) {
    const r = await fetch(p);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  const { data, error } = await sb.storage.from("project-assets").download(p);
  if (error || !data) throw new Error(error?.message || "fișier lipsă");
  return Buffer.from(await data.arrayBuffer());
}

function audioSeconds(file: string): number | null {
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim();
    const n = Number(out);
    if (Number.isFinite(n) && n > 0) return n;
  } catch { /* trecem la varianta WAV */ }
  try {
    const b = fs.readFileSync(file);
    if (b.toString("ascii", 0, 4) === "RIFF") return (b.length - 44) / b.readUInt32LE(28);
  } catch { /* fără durată */ }
  return null;
}

async function main() {
  const { data: job, error: jobErr } = await sb.from("render_jobs").select("*").eq("id", JOB_ID).single();
  if (jobErr || !job) throw new Error("Jobul de randare nu există.");
  if (job.project_id !== PROJECT_ID) throw new Error("Jobul nu aparține acestui proiect.");

  await setJob({ status: "running", progress: 1, started_at: new Date().toISOString(), error: null });
  await setProject("rendering");

  const { data: project, error: pErr } = await sb.from("projects").select("*, styles(*)").eq("id", PROJECT_ID).single();
  if (pErr || !project) throw new Error("Proiectul nu a fost găsit.");
  const { data: rows, error: sErr } = await sb.from("scenes").select("*").eq("project_id", PROJECT_ID).order("position");
  if (sErr) throw new Error(sErr.message);
  if (!rows?.length) throw new Error("Proiectul nu are scene.");

  const work = path.resolve("work/job");
  const assets = path.join(work, "public", "assets");
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(assets, { recursive: true });
  fs.mkdirSync("out", { recursive: true });

  const settings = (project.settings ?? {}) as Record<string, unknown>;
  const scenes: RenderScene[] = [];
  const warnings: string[] = [];

  for (const [i, row] of rows.entries()) {
    const n = String(i + 1).padStart(2, "0");
    let audioFile: string | null = null;
    let imageFile: string | null = null;
    let seconds = (Number(row.duration_ms) || 4000) / 1000;

    if (row.audio_url) {
      const name = `assets/voice-${n}.${extOf(row.audio_url, "wav")}`;
      try {
        fs.writeFileSync(path.join(work, "public", name), await fetchAsset(row.audio_url));
        audioFile = name;
        // ca în aplicație: scena durează cât vocea, dacă există voce
        const d = audioSeconds(path.join(work, "public", name));
        if (d) seconds = d;
      } catch (e) {
        throw new Error(`Nu am putut descărca vocea scenei ${i + 1}: ${(e as Error).message}`);
      }
    }
    if (row.image_url) {
      const name = `assets/image-${n}.${extOf(row.image_url, "png")}`;
      try {
        fs.writeFileSync(path.join(work, "public", name), await fetchAsset(row.image_url));
        imageFile = name;
      } catch (e) {
        warnings.push(`Imaginea scenei ${i + 1} nu a putut fi descărcată (${(e as Error).message}); scena e randată fără ea.`);
      }
    }
    scenes.push({
      template: row.template as TemplateId,
      content: row.content ?? {},
      durationFrames: Math.max(1, Math.round(seconds * FPS)),
      audioFile,
      imageFile,
    });
  }

  let musicFile: string | null = null;
  const musicPath = typeof settings["music_path"] === "string" ? (settings["music_path"] as string) : "";
  if (musicPath) {
    const name = `assets/music.${extOf(musicPath, "mp3")}`;
    try {
      fs.writeFileSync(path.join(work, "public", name), await fetchAsset(musicPath));
      musicFile = name;
    } catch (e) {
      warnings.push(`Muzica nu a putut fi descărcată (${(e as Error).message}); videoul e randat fără muzică.`);
    }
  }
  warnings.forEach((w) => console.warn("AVERTISMENT:", w));

  const style = project.styles as { colors?: any; fonts?: any } | null;
  const props: RenderProps = {
    format: (project.format === "16:9" ? "16:9" : "9:16") as Format,
    fps: FPS,
    colors: style?.colors ?? null,
    fonts: style?.fonts ?? null,
    scenes,
    musicFile,
    musicVolume: musicVolume(settings),
    subtitles: subtitleSettings(settings),
    tailFrames: Math.round(1.5 * FPS),
  };

  await setJob({ progress: 5 });
  console.log(`Randez ${scenes.length} scene, format ${props.format}, calitate ${quality}.`);

  const out = path.resolve("out/video.mp4");
  let last = 0;
  await renderVideo({
    props,
    publicDir: path.join(work, "public"),
    outFile: out,
    scale: quality === "draft" ? 0.5 : 1,
    crf: quality === "draft" ? 24 : 20,
    browserExecutable: process.env["BROWSER_EXECUTABLE"] || null,
    onProgress: (p) => {
      const pct = 5 + Math.round(p * 88); // 5 -> 93
      if (pct >= last + 3) { last = pct; void setJob({ progress: pct }); }
    },
  });

  let file = out;
  if (fs.statSync(file).size > MAX_UPLOAD_BYTES) {
    console.log("Fișierul e prea mare pentru încărcare; îl comprim mai mult.");
    const small = path.resolve("out/video-small.mp4");
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", out, "-c:v", "libx264", "-crf", "28", "-preset", "medium", "-c:a", "copy", "-movflags", "+faststart", small]);
    file = small;
  }
  const size = fs.statSync(file).size;
  if (size > MAX_UPLOAD_BYTES + 1.5 * 1024 * 1024) {
    throw new Error(`Videoul are ${(size / 1048576).toFixed(0)} MB și depășește limita de încărcare a planului gratuit Supabase (50 MB).`);
  }

  await setJob({ progress: 95 });
  const objectPath = `${project.user_id}/${PROJECT_ID}/${JOB_ID}.mp4`;
  const { error: upErr } = await sb.storage.from("renders").upload(objectPath, fs.readFileSync(file), { contentType: "video/mp4", upsert: true });
  if (upErr) throw new Error(`Încărcarea videoului a eșuat: ${upErr.message}`);

  await setJob({ status: "done", progress: 100, output_path: objectPath, finished_at: new Date().toISOString(), error: warnings.join(" ") || null });
  await setProject("done");
  console.log(`Gata: ${objectPath} (${(size / 1048576).toFixed(1)} MB)`);
}

main().catch(async (e) => {
  const message = e instanceof Error ? e.message : String(e);
  console.error("EROARE:", message);
  await setJob({ status: "failed", error: message.slice(0, 500), finished_at: new Date().toISOString() });
  await setProject("ready");
  process.exit(1);
});
