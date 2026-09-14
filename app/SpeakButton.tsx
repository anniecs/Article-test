"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Square, Volume2 } from "lucide-react";

function audioHash(text: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export default function SpeakButton({
  text,
  label = "播放這一句",
  sample = false,
  apiKey = "",
}: {
  text: string;
  label?: string;
  sample?: boolean;
  apiKey?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">(
    "idle",
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generatedUrlRef = useRef("");

  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (generatedUrlRef.current) URL.revokeObjectURL(generatedUrlRef.current);
    },
    [],
  );

  function stop() {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setState("idle");
  }

  async function play() {
    if (state === "playing" || state === "loading") {
      stop();
      return;
    }

    setState("loading");
    try {
      let source = sample ? `/audio/${audioHash(text)}.wav` : generatedUrlRef.current;
      if (!source) {
        const response = await fetch("/api/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { "X-AI-Key": apiKey } : {}),
          },
          body: JSON.stringify({ text }),
        });
        if (!response.ok) {
          const result = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(result.error || "語音暫時無法播放。");
        }
        source = URL.createObjectURL(await response.blob());
        generatedUrlRef.current = source;
      }

      const audio = new Audio(source);
      audioRef.current = audio;
      audio.onplay = () => setState("playing");
      audio.onended = () => setState("idle");
      audio.onerror = () => setState("error");
      await audio.play();
    } catch {
      setState("error");
    }
  }

  const statusLabel =
    state === "playing"
      ? "停止朗讀"
      : state === "loading"
        ? "正在準備朗讀"
        : state === "error"
          ? "朗讀暫時無法播放，請確認 AI 連線設定後重試"
          : `${label}：${text}`;

  return (
    <span className="speak-control">
      <button
        type="button"
        className={`speak-button ${state}`}
        onClick={play}
        aria-label={statusLabel}
        title={statusLabel}
      >
        {state === "playing" ? (
          <Square size={14} fill="currentColor" />
        ) : state === "loading" ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <Volume2 size={17} />
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {state === "error" ? statusLabel : ""}
      </span>
    </span>
  );
}
