import srtParser2 from "srt-parser-2";

import { useStopwatch } from "react-timer-hook";
import DOMPurify from "dompurify";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Expand,
  Pause,
  Play,
  Shrink,
  Upload,
} from "lucide-react";
import { Chrome, type ColorResult } from "@uiw/react-color";

type SRT = {
  startSeconds: number;
  startTime: string;
  endSeconds: number;
  endTime: string;
  text: string;
};

function Subtitle({ srtText, shadow }: { srtText: string; shadow?: boolean }) {
  const html = DOMPurify.sanitize(srtText.replace(/\n/g, "<br />"), {
    ALLOWED_TAGS: ["i", "b", "u", "br"],
    ALLOWED_ATTR: [],
  });

  return (
    <div
      className={`font-[Arial] text-center text-white font-semibold text-[clamp(1rem,5vw,2.5rem)] leading-snug ${
        shadow ? "scale-30 opacity-20" : ""
      }`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function SubtitleBar({
  srts,
  onClick,
  currentSrtIndex,
}: {
  srts: SRT[];
  currentSrtIndex: number;
  onClick?: (srt: SRT, index: number) => void;
}) {
  const amountOfSrts = srts.length;

  const lastSrt = srts[amountOfSrts - 1];
  const startTime = 0;
  const lastSrtEndTime = lastSrt.endSeconds;

  return (
    <div className="w-[calc(100vw_-_24px)] h-6 relative mb-10 ml-[12px]">
      {srts.map((srt, index) => {
        const percent =
          ((srt.startSeconds - startTime) / (lastSrtEndTime - startTime)) * 100;

        return (
          <div
            key={index}
            onClick={() => onClick?.(srts[index], index)}
            className={`w-[1px] h-full bg-[var(--color-theme)]/30 absolute top-0 hover:scale-y-150 hover:scale-x-200 opacity-50 hover:opacity-100 ${
              index === currentSrtIndex
                ? "bg-white scale-y-150 scale-x-200 opacity-100"
                : ""
            }`}
            style={{ left: `${percent}%` }}
          />
        );
      })}
    </div>
  );
}

function ColorPicker({ defaultColor = "#ffffff" }: { defaultColor?: string }) {
  const [hex, setHex] = useState(defaultColor);
  const [isOpen, setIsOpen] = useState(false);
  const lastUpdateRef = useRef(0);
  const throttleMs = 100;

  const handleChange = (color: ColorResult) => {
    setHex(color.hexa);

    const now = Date.now();
    if (now - lastUpdateRef.current > throttleMs) {
      document.documentElement.style.setProperty("--color-theme", color.hexa);
      lastUpdateRef.current = now;
      localStorage.setItem("theme_color", color.hexa);
    }
  };

  return (
    <div>
      <span
        className="fixed top-4 left-4 text-xs text-gray-400 hover:text-white z-30"
        onClick={() => setIsOpen(!isOpen)}
      >
        Change Theme Color
      </span>
      {isOpen && (
        <Chrome
          className="fixed top-10 left-4 z-30"
          color={hex}
          onChange={handleChange}
        />
      )}
      {isOpen && (
        <div
          className="w-[100vw] h-[100vh] fixed inset-0 z-20"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

const Player = ({
  subtitles,
  startIndex,
  themeColor,
}: {
  subtitles: SRT[];
  startIndex?: number;
  themeColor?: string;
}) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleToggleFullscreen = () => {
    toggleFullscreen(mainRef.current);
    setIsFullscreen(!isFullscreen);
  };

  const { totalMilliseconds, start, pause, isRunning, reset } = useStopwatch({
    autoStart: false,
    offsetTimestamp:
      startIndex !== undefined
        ? getOffsetByIndex(subtitles, startIndex)
        : undefined,
    interval: 20,
  });

  const [currentSrtIndex, setCurrentSrtIndex] = useState<number | null>(null);

  const displayedSrt = getCurrentSrt(totalMilliseconds, subtitles);

  useEffect(() => {
    if (displayedSrt) {
      const currentIndex = subtitles.indexOf(displayedSrt);
      setCurrentSrtIndex(currentIndex);
      localStorage.setItem("srt_position", currentIndex.toString());
    }
  }, [displayedSrt, subtitles]);

  return (
    <main className="h-svh w-svw flex flex-col relative" ref={mainRef}>
      <ColorPicker defaultColor={themeColor} />
      {document.fullscreenEnabled && (
        <div
          className=" fixed top-0 right-0 p-4 z-30"
          onClick={() => handleToggleFullscreen()}
        >
          {isFullscreen ? (
            <Shrink className="text-[var(--color-theme)] hover:text-white transition-colors" />
          ) : (
            <Expand className="text-[var(--color-theme)] hover:text-white transition-colors" />
          )}
        </div>
      )}
      <button
        onClick={() => {
          localStorage.removeItem("srt_raw");
          localStorage.removeItem("srt_position");
          window.location.reload();
        }}
        className="fixed bottom-4 right-4 text-xs text-gray-400 hover:text-white z-30"
      >
        Reset
      </button>
      {displayedSrt && (
        <div className="fixed inset-0 z-0 items-center justify-center flex">
          <div>
            <div className="flex items-center justify-center w-full">
              <div className="text-center">
                <Subtitle srtText={displayedSrt.text} />
                <p className="text-sm text-gray-500">
                  {displayedSrt.startTime} - {displayedSrt.endTime}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mt-auto z-10">
        <div>
          <div className="flex justify-between items-center p-4 text-white">
            <button
              type="button"
              onClick={() => {
                const currentIndex = currentSrtIndex ?? 0;
                if (currentIndex === 0) {
                  reset(new Date(), isRunning);
                } else {
                  const srt = subtitles[Math.max(currentIndex - 1, 0)];

                  reset(getOffsetTimeFromSrt(srt), isRunning);
                }
              }}
            >
              <ArrowLeft className="text-[var(--color-theme)] hover:text-white transition-colors" />
            </button>
            {isRunning ? (
              <button onClick={() => pause()}>
                <Pause className="text-[var(--color-theme)] hover:text-white transition-colors" />
              </button>
            ) : (
              <button onClick={() => start()}>
                <Play className="text-[var(--color-theme)] hover:text-white transition-colors" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const currentIndex = currentSrtIndex ?? 0;
                setCurrentSrtIndex(
                  Math.min(currentIndex + 1, subtitles.length - 1)
                );

                const srt =
                  subtitles[Math.min(currentIndex + 1, subtitles.length - 1)];

                reset(getOffsetTimeFromSrt(srt), isRunning);
              }}
            >
              <ArrowRight className="text-[var(--color-theme)] hover:text-white transition-colors" />
            </button>
          </div>
          <div className="w-full">
            <div className="flex justify-center items-center p-2 text-white">
              <span className="text-sm text-gray-500">
                {formatSrtTimestamp(totalMilliseconds)}
              </span>
            </div>
            <SubtitleBar
              srts={subtitles}
              currentSrtIndex={currentSrtIndex ?? 0}
              onClick={(srt, index) => {
                setCurrentSrtIndex(index);

                reset(getOffsetTimeFromSrt(srt), isRunning);
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

function SubtitleUploader({ onParsed }: { onParsed: (parsed: SRT[]) => void }) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parser = new srtParser2();
        const parsed = parser.fromSrt(text);
        localStorage.setItem("srt_raw", JSON.stringify(parsed));
        localStorage.removeItem("srt_position");
        onParsed(parsed);
      } catch (err) {
        alert("Invalid SRT file.");
        console.error(err);
      }
    };

    reader.readAsText(file);
  };

  return (
    <label className="group cursor-pointer flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/30 bg-white/5 px-6 py-10 text-white transition hover:bg-white/10">
      <Upload className="size-10 text-[var(--color-theme)] group-hover:scale-110 transition-transform" />
      <span className="text-lg font-medium">Upload SRT File</span>
      <input
        type="file"
        accept=".srt"
        onChange={handleFileUpload}
        className="hidden"
      />
    </label>
  );
}

function App() {
  const [state, setState] = useState<{
    subs: SRT[];
    startIndex?: number;
    themeColor: string;
  }>({
    subs: [],
    startIndex: undefined,
    themeColor: "#8936FF", // Default theme color
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedRaw = localStorage.getItem("srt_raw");
    let subs: SRT[] = [];
    if (storedRaw) {
      try {
        subs = JSON.parse(storedRaw);
      } catch {
        /* empty */
      }
    }

    const storedPosition = localStorage.getItem("srt_position");
    let startIndex: number | undefined = undefined;
    if (storedPosition) {
      const position = parseInt(storedPosition, 10);
      if (!isNaN(position) && position >= 0) {
        startIndex = position;
      }
    }

    const storedThemeColor = localStorage.getItem("theme_color");
    let themeColor: string = "#8936FF"; // Default theme color

    if (storedThemeColor) {
      themeColor = storedThemeColor;
      document.documentElement.style.setProperty("--color-theme", themeColor);
    }

    setState({ subs, startIndex, themeColor: themeColor });
    setLoading(false);
  }, []);

  if (loading) return null;

  if (state.subs.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <SubtitleUploader
          onParsed={(parsed) => {
            setState({
              subs: parsed,
              startIndex: undefined,
              themeColor: state.themeColor,
            });
          }}
        />
      </div>
    );
  }

  return (
    <Player
      subtitles={state.subs}
      startIndex={state.startIndex}
      themeColor={state.themeColor}
    />
  );
}

function getOffsetTimeFromSrt(srt: SRT) {
  const now = new Date();

  const baseSeconds = Math.floor(srt.startSeconds);
  const extraMilliseconds = srt.startTime.includes(",")
    ? parseInt(srt.startTime.split(",")[1], 10)
    : 0;

  const offsetTime = new Date(now.getTime());
  offsetTime.setSeconds(offsetTime.getSeconds() + baseSeconds);
  offsetTime.setMilliseconds(offsetTime.getMilliseconds() + extraMilliseconds);

  return offsetTime;
}

export default App;

function formatSrtTimestamp(ms: number) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor(ms % 1000);

  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(
    milliseconds,
    3
  )}`;
}

function parseSrtTimeToMilliseconds(timeStr: string): number {
  const [timePart, msStr] = timeStr.split(",");
  const [hh, mm, ss] = timePart.split(":").map(Number);
  const ms = parseInt(msStr, 10);

  return (hh * 3600 + mm * 60 + ss) * 1000 + ms;
}

function getCurrentSrt(totalMilliseconds: number, srts: SRT[]): SRT | null {
  return (
    srts.find((srt) => {
      const start = parseSrtTimeToMilliseconds(srt.startTime);
      const end = parseSrtTimeToMilliseconds(srt.endTime);
      return totalMilliseconds >= start && totalMilliseconds < end;
    }) ?? null
  );
}

function toggleFullscreen(el: HTMLElement | null) {
  if (!el) return;

  if (!document.fullscreenElement) {
    el.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function getOffsetByIndex(subtitles: SRT[], index: number): Date | undefined {
  if (index < 0 || index >= subtitles.length) {
    return undefined;
  }

  const srt = subtitles[index];
  const baseSeconds = Math.floor(srt.startSeconds);
  const extraMilliseconds = srt.startTime.includes(",")
    ? parseInt(srt.startTime.split(",")[1], 10)
    : 0;

  const offsetTime = new Date();
  offsetTime.setSeconds(offsetTime.getSeconds() + baseSeconds);
  offsetTime.setMilliseconds(offsetTime.getMilliseconds() + extraMilliseconds);

  return offsetTime;
}
