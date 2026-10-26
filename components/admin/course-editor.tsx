"use client";

import { useState } from "react";
import type { AdminCourse, AdminEpisode, AdminModule } from "@/lib/course-content";

/**
 * Editing the course: rename, reorder, repoint a video.
 *
 * Everything is edited locally and saved on a button, rather than each
 * keystroke going to the server. Reordering a dozen episodes is a dozen
 * moves, and sending a write per move means a half-finished order is live
 * while someone is still thinking.
 *
 * Reordering is up/down rather than drag. A drag list needs a library, and on
 * a twelve-row list the arrows are faster, work on a trackpad and a phone
 * alike, and are reachable from the keyboard without any of the work drag
 * would need to match that.
 *
 * Saving sends the whole order, not the moves that produced it — see the
 * reorder endpoint. The API refuses a list that doesn't account for every
 * episode it holds, so a save from a page left open since before someone else
 * edited is rejected rather than silently dropping what it never saw.
 */

type Draft = {
  modules: AdminModule[];
  /** Ids of whatever has been edited, so saving only sends what changed. */
  renamedModules: Set<string>;
  renamedEpisodes: Set<string>;
  retargetedEpisodes: Set<string>;
  reorderedModules: boolean;
  reorderedIn: Set<string>;
};

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

const FIELD =
  "h-9 w-full rounded-lg border border-neutral-90/15 bg-white px-3 font-noi-grotesk text-[14px] text-neutral-90 outline-none transition-colors duration-150 focus:border-neutral-90";
const SMALL_BUTTON =
  "flex size-7 shrink-0 items-center justify-center rounded-md border border-neutral-90/15 font-noi-grotesk text-[13px] text-neutral-70 transition-colors duration-150 hover:border-neutral-90/40 disabled:cursor-not-allowed disabled:opacity-30";

export function CourseEditor({ course }: { course: AdminCourse }) {
  const [draft, setDraft] = useState<Draft>({
    modules: course.modules,
    renamedModules: new Set(),
    renamedEpisodes: new Set(),
    retargetedEpisodes: new Set(),
    reorderedModules: false,
    reorderedIn: new Set(),
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const changeCount =
    draft.renamedModules.size +
    draft.renamedEpisodes.size +
    draft.retargetedEpisodes.size +
    (draft.reorderedModules ? 1 : 0) +
    draft.reorderedIn.size;

  function update(fn: (d: Draft) => Draft) {
    setStatus("idle");
    setError(null);
    setDraft(fn);
  }

  function renameModule(id: string, lang: "en" | "ml", value: string) {
    update((d) => ({
      ...d,
      renamedModules: new Set(d.renamedModules).add(id),
      modules: d.modules.map((m) =>
        m.id === id ? { ...m, title: { ...m.title, [lang]: value } } : m,
      ),
    }));
  }

  function renameEpisode(moduleId: string, id: string, lang: "en" | "ml", value: string) {
    update((d) => ({
      ...d,
      renamedEpisodes: new Set(d.renamedEpisodes).add(id),
      modules: d.modules.map((m) =>
        m.id !== moduleId
          ? m
          : {
              ...m,
              episodes: m.episodes.map((e) =>
                e.id === id ? { ...e, title: { ...e.title, [lang]: value } } : e,
              ),
            },
      ),
    }));
  }

  function retarget(moduleId: string, id: string, lang: "en" | "ml", url: string) {
    update((d) => ({
      ...d,
      retargetedEpisodes: new Set(d.retargetedEpisodes).add(id),
      modules: d.modules.map((m) =>
        m.id !== moduleId
          ? m
          : {
              ...m,
              episodes: m.episodes.map((e) =>
                e.id !== id
                  ? e
                  : {
                      ...e,
                      media: {
                        ...e.media,
                        [lang]: { url, durationSec: 0, streamUid: null },
                      },
                    },
              ),
            },
      ),
    }));
  }

  function moveModule(index: number, by: number) {
    update((d) => ({
      ...d,
      reorderedModules: true,
      modules: move(d.modules, index, index + by),
    }));
  }

  function moveEpisode(moduleId: string, index: number, by: number) {
    update((d) => ({
      ...d,
      reorderedIn: new Set(d.reorderedIn).add(moduleId),
      modules: d.modules.map((m) =>
        m.id === moduleId ? { ...m, episodes: move(m.episodes, index, index + by) } : m,
      ),
    }));
  }

  async function send(url: string, method: string, body: unknown): Promise<void> {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `${method} ${url} failed (${res.status})`);
    }
  }

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      // Renames and retargets first: if an order write is the thing that
      // fails, the text edits are already safe rather than lost with it.
      for (const section of draft.modules) {
        if (draft.renamedModules.has(section.id)) {
          await send(`/api/admin/course/modules/${section.id}`, "PATCH", {
            title: section.title,
          });
        }
        for (const episode of section.episodes) {
          const body: Record<string, unknown> = {};
          if (draft.renamedEpisodes.has(episode.id)) body.title = episode.title;
          if (draft.retargetedEpisodes.has(episode.id)) {
            body.media = Object.fromEntries(
              (["en", "ml"] as const).map((lang) => [lang, episode.media[lang]?.url ?? null]),
            );
          }
          if (Object.keys(body).length > 0) {
            await send(`/api/admin/course/episodes/${episode.id}`, "PATCH", body);
          }
        }
      }

      if (draft.reorderedModules) {
        await send("/api/admin/course/reorder", "POST", {
          moduleIds: draft.modules.map((m) => m.id),
        });
      }
      for (const moduleId of draft.reorderedIn) {
        const section = draft.modules.find((m) => m.id === moduleId);
        if (!section) continue;
        await send(`/api/admin/course/modules/${moduleId}/reorder`, "POST", {
          episodeIds: section.episodes.map((e) => e.id),
        });
      }

      setDraft((d) => ({
        ...d,
        renamedModules: new Set(),
        renamedEpisodes: new Set(),
        retargetedEpisodes: new Set(),
        reorderedModules: false,
        reorderedIn: new Set(),
      }));
      setStatus("saved");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Something went wrong saving.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4">
        <p className="font-noi-grotesk text-[14px] text-neutral-50">
          {changeCount === 0
            ? "No unsaved changes."
            : `${changeCount} unsaved change${changeCount === 1 ? "" : "s"}.`}
        </p>
        {error && (
          <p role="alert" className="font-noi-grotesk text-[13px] text-red-600">
            {error}
          </p>
        )}
        {status === "saved" && !error && (
          <p className="font-noi-grotesk text-[13px] text-[#5d7a00]">Saved.</p>
        )}
        <button
          type="button"
          id="course-save"
          onClick={save}
          disabled={changeCount === 0 || status === "saving"}
          className="ml-auto inline-flex h-10 items-center rounded-full bg-neutral-90 px-5 font-noi-grotesk text-[14px] font-medium text-white transition-colors duration-150 hover:bg-neutral-70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>

      {draft.modules.map((section, moduleIndex) => (
        <section key={section.id} className="flex flex-col gap-3 rounded-2xl bg-white p-5">
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-1 pt-1">
              <button
                type="button"
                className={SMALL_BUTTON}
                onClick={() => moveModule(moduleIndex, -1)}
                disabled={moduleIndex === 0}
                aria-label={`Move ${section.title.en} up`}
              >
                ↑
              </button>
              <button
                type="button"
                className={SMALL_BUTTON}
                onClick={() => moveModule(moduleIndex, 1)}
                disabled={moduleIndex === draft.modules.length - 1}
                aria-label={`Move ${section.title.en} down`}
              >
                ↓
              </button>
            </div>

            <div className="grid flex-1 gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="font-noi-grotesk text-[12px] text-neutral-50">
                  Module {moduleIndex + 1} — English
                </span>
                <input
                  className={FIELD}
                  value={section.title.en}
                  onChange={(e) => renameModule(section.id, "en", e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-noi-grotesk text-[12px] text-neutral-50">Malayalam</span>
                <input
                  className={FIELD}
                  value={section.title.ml ?? ""}
                  placeholder="No Malayalam title"
                  onChange={(e) => renameModule(section.id, "ml", e.target.value)}
                />
              </label>
            </div>
          </div>

          <ul className="flex flex-col gap-2 border-t border-neutral-90/8 pt-3">
            {section.episodes.map((episode, episodeIndex) => (
              <EpisodeRow
                key={episode.id}
                episode={episode}
                position={episodeIndex}
                last={episodeIndex === section.episodes.length - 1}
                onMove={(by) => moveEpisode(section.id, episodeIndex, by)}
                onRename={(lang, value) => renameEpisode(section.id, episode.id, lang, value)}
                onRetarget={(lang, url) => retarget(section.id, episode.id, lang, url)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EpisodeRow({
  episode,
  position,
  last,
  onMove,
  onRename,
  onRetarget,
}: {
  episode: AdminEpisode;
  position: number;
  last: boolean;
  onMove: (by: number) => void;
  onRename: (lang: "en" | "ml", value: string) => void;
  onRetarget: (lang: "en" | "ml", url: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-xl border border-neutral-90/8 p-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className={SMALL_BUTTON}
            onClick={() => onMove(-1)}
            disabled={position === 0}
            aria-label={`Move ${episode.title.en} up`}
          >
            ↑
          </button>
          <button
            type="button"
            className={SMALL_BUTTON}
            onClick={() => onMove(1)}
            disabled={last}
            aria-label={`Move ${episode.title.en} down`}
          >
            ↓
          </button>
        </div>

        <span className="w-6 shrink-0 text-center font-noi-grotesk text-[13px] text-neutral-50 tabular-nums">
          {position + 1}
        </span>

        <input
          className={FIELD}
          value={episode.title.en}
          onChange={(e) => onRename("en", e.target.value)}
          aria-label="Episode title, English"
        />

        <span className="shrink-0 font-noi-grotesk text-[12px] text-neutral-50">
          {(["en", "ml"] as const)
            .map((lang) => `${lang.toUpperCase()} ${episode.media[lang] ? "✓" : "—"}`)
            .join("  ")}
        </span>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={SMALL_BUTTON}
          aria-expanded={open}
          aria-label={open ? "Hide videos" : "Show videos"}
        >
          {open ? "×" : "…"}
        </button>
      </div>

      {open && (
        <div className="mt-3 grid gap-3 border-t border-neutral-90/8 pt-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="font-noi-grotesk text-[12px] text-neutral-50">
              Malayalam title
            </span>
            <input
              className={FIELD}
              value={episode.title.ml ?? ""}
              placeholder="No Malayalam title"
              onChange={(e) => onRename("ml", e.target.value)}
            />
          </label>
          <p className="flex flex-col gap-1">
            <span className="font-noi-grotesk text-[12px] text-neutral-50">Key</span>
            <span className="flex h-9 items-center font-noi-grotesk text-[14px] text-neutral-50">
              {episode.key}
            </span>
          </p>

          {(["en", "ml"] as const).map((lang) => (
            <label key={lang} className="flex flex-col gap-1">
              <span className="font-noi-grotesk text-[12px] text-neutral-50">
                {lang === "en" ? "English" : "Malayalam"} video
                {episode.media[lang]?.durationSec
                  ? ` · ${Math.round(episode.media[lang]!.durationSec / 60)}m`
                  : ""}
              </span>
              <input
                className={FIELD}
                value={episode.media[lang]?.url ?? ""}
                placeholder="No video — paste a URL to add one"
                onChange={(e) => onRetarget(lang, e.target.value)}
              />
            </label>
          ))}

          <p className="font-noi-grotesk text-[12px] leading-[1.5] text-neutral-50 sm:col-span-2">
            Changing a URL clears that video&rsquo;s stored duration, because the
            old one described the old file. The real figure is measured from the
            file itself by the LMS sync.
          </p>
        </div>
      )}
    </li>
  );
}
