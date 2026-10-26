"use client";

import { useState } from "react";
import type { AdminCourse, AdminEpisode, AdminModule } from "@/lib/course-content";

/**
 * Editing the course: rename, reorder, repoint a video, and watch one.
 *
 * Everything is edited locally and saved on a button, rather than each
 * keystroke going to the server. Reordering a dozen episodes is a dozen
 * moves, and a write per move means a half-finished order is live while
 * someone is still thinking.
 *
 * Modules collapse. Thirty-four episodes open at once is a page nobody can
 * find anything in, and the work is almost always inside one module — so they
 * start closed, and a module holding unsaved edits says so on its header
 * rather than hiding them.
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
  "h-9 w-full rounded-lg border border-neutral-90/15 bg-white px-3 font-noi-grotesk text-[14px] text-neutral-90 outline-none transition-colors duration-150 placeholder:text-neutral-50/70 focus:border-neutral-90";
const URL_FIELD =
  "h-9 w-full rounded-lg border border-neutral-90/15 bg-neutral-10/60 px-3 font-mono text-[12px] text-neutral-70 outline-none transition-colors duration-150 placeholder:font-noi-grotesk placeholder:text-[13px] placeholder:text-neutral-50/70 focus:border-neutral-90 focus:bg-white";
const ARROW =
  "flex size-6 items-center justify-center rounded-md text-[12px] leading-none text-neutral-50 transition-colors duration-150 hover:bg-neutral-90/8 hover:text-neutral-90 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent";
const GHOST_BUTTON =
  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-neutral-90/15 px-2.5 font-noi-grotesk text-[12px] leading-none text-neutral-70 transition-colors duration-150 hover:border-neutral-90/40 hover:text-neutral-90";

export function CourseEditor({ course }: { course: AdminCourse }) {
  const [draft, setDraft] = useState<Draft>({
    modules: course.modules,
    renamedModules: new Set(),
    renamedEpisodes: new Set(),
    retargetedEpisodes: new Set(),
    reorderedModules: false,
    reorderedIn: new Set(),
  });
  /** Closed to begin with — see the note at the top. */
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
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

  function toggleModule(id: string) {
    setOpenModules((open) => {
      const next = new Set(open);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** How many unsaved edits sit inside a module, so a closed one can say so. */
  function pendingIn(section: AdminModule): number {
    let n = draft.renamedModules.has(section.id) ? 1 : 0;
    if (draft.reorderedIn.has(section.id)) n += 1;
    for (const episode of section.episodes) {
      if (draft.renamedEpisodes.has(episode.id)) n += 1;
      if (draft.retargetedEpisodes.has(episode.id)) n += 1;
    }
    return n;
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
                      media: { ...e.media, [lang]: { url, durationSec: 0, streamUid: null } },
                    },
              ),
            },
      ),
    }));
  }

  function moveModule(index: number, by: number) {
    update((d) => ({ ...d, reorderedModules: true, modules: move(d.modules, index, index + by) }));
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

  const allOpen = openModules.size === draft.modules.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-neutral-90/8 bg-white/95 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          id="course-toggle-all"
          onClick={() =>
            setOpenModules(allOpen ? new Set() : new Set(draft.modules.map((m) => m.id)))
          }
          className={GHOST_BUTTON}
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>

        <p className="font-noi-grotesk text-[13px] text-neutral-50">
          {changeCount === 0
            ? "No unsaved changes"
            : `${changeCount} unsaved change${changeCount === 1 ? "" : "s"}`}
        </p>
        {error && (
          <p role="alert" className="font-noi-grotesk text-[13px] text-red-600">
            {error}
          </p>
        )}
        {status === "saved" && !error && (
          <p className="font-noi-grotesk text-[13px] text-[#5d7a00]">Saved</p>
        )}

        <button
          type="button"
          id="course-save"
          onClick={save}
          disabled={changeCount === 0 || status === "saving"}
          className="ml-auto inline-flex h-9 items-center rounded-full bg-neutral-90 px-5 font-noi-grotesk text-[14px] font-medium text-white transition-colors duration-150 hover:bg-neutral-70 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>

      {draft.modules.map((section, moduleIndex) => {
        const open = openModules.has(section.id);
        const pending = pendingIn(section);
        return (
          <section
            key={section.id}
            className="overflow-hidden rounded-2xl border border-neutral-90/8 bg-white"
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  className={ARROW}
                  onClick={() => moveModule(moduleIndex, -1)}
                  disabled={moduleIndex === 0}
                  aria-label={`Move ${section.title.en} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={ARROW}
                  onClick={() => moveModule(moduleIndex, 1)}
                  disabled={moduleIndex === draft.modules.length - 1}
                  aria-label={`Move ${section.title.en} down`}
                >
                  ↓
                </button>
              </div>

              <button
                type="button"
                onClick={() => toggleModule(section.id)}
                aria-expanded={open}
                aria-label={open ? `Collapse ${section.title.en}` : `Expand ${section.title.en}`}
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-neutral-50 transition-colors duration-150 hover:bg-neutral-90/8 hover:text-neutral-90"
              >
                <svg
                  viewBox="0 0 16 16"
                  className={`size-3.5 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="m6 3 5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <span className="w-[72px] shrink-0 font-noi-grotesk text-[12px] text-neutral-50">
                Module {moduleIndex + 1}
              </span>

              <input
                className={FIELD + " flex-1"}
                value={section.title.en}
                onChange={(e) => renameModule(section.id, "en", e.target.value)}
                aria-label={`Module ${moduleIndex + 1} title, English`}
              />

              <span className="shrink-0 font-noi-grotesk text-[12px] whitespace-nowrap text-neutral-50 tabular-nums">
                {section.episodes.length} ep
              </span>
              {pending > 0 && (
                <span className="shrink-0 rounded-full bg-lime-30 px-2 py-0.5 font-noi-grotesk text-[11px] leading-[1.6] font-medium text-neutral-90 tabular-nums">
                  {pending}
                </span>
              )}
            </div>

            {open && (
              <div className="border-t border-neutral-90/8 px-3 pt-3 pb-3">
                <label className="mb-3 flex items-center gap-3">
                  <span className="w-[72px] shrink-0 font-noi-grotesk text-[12px] text-neutral-50">
                    Malayalam
                  </span>
                  <input
                    className={FIELD + " flex-1"}
                    value={section.title.ml ?? ""}
                    placeholder="No Malayalam title"
                    onChange={(e) => renameModule(section.id, "ml", e.target.value)}
                  />
                </label>

                <ul className="flex flex-col gap-1.5">
                  {section.episodes.map((episode, episodeIndex) => (
                    <EpisodeRow
                      key={episode.id}
                      episode={episode}
                      position={episodeIndex}
                      last={episodeIndex === section.episodes.length - 1}
                      edited={
                        draft.renamedEpisodes.has(episode.id) ||
                        draft.retargetedEpisodes.has(episode.id)
                      }
                      onMove={(by) => moveEpisode(section.id, episodeIndex, by)}
                      onRename={(lang, value) => renameEpisode(section.id, episode.id, lang, value)}
                      onRetarget={(lang, url) => retarget(section.id, episode.id, lang, url)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function EpisodeRow({
  episode,
  position,
  last,
  edited,
  onMove,
  onRename,
  onRetarget,
}: {
  episode: AdminEpisode;
  position: number;
  last: boolean;
  edited: boolean;
  onMove: (by: number) => void;
  onRename: (lang: "en" | "ml", value: string) => void;
  onRetarget: (lang: "en" | "ml", url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  /** Which language is being watched, if any. One at a time — two videos
   *  playing over each other in an admin panel helps nobody. */
  const [playing, setPlaying] = useState<"en" | "ml" | null>(null);
  /** The signed URL to actually play, and whatever went wrong getting it. */
  const [signed, setSigned] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  /**
   * The bucket is private, so the stored URL cannot be handed to a <video>:
   * it answers 401 with an HTML error page, which the element reports as a
   * format error. Every preview asks the API to sign it first.
   */
  async function preview(lang: "en" | "ml", url: string) {
    if (playing === lang) {
      setPlaying(null);
      setSigned(null);
      setPreviewError(null);
      return;
    }
    setPlaying(lang);
    setSigned(null);
    setPreviewError(null);
    try {
      const res = await fetch("/api/admin/course/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not sign that URL.");
      setSigned(data.url);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Could not load that video.");
    }
  }

  return (
    <li
      className={`rounded-xl border px-2.5 py-2 transition-colors duration-150 ${
        edited ? "border-lime-30 bg-lime-30/8" : "border-neutral-90/8"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 flex-col">
          <button
            type="button"
            className={ARROW}
            onClick={() => onMove(-1)}
            disabled={position === 0}
            aria-label={`Move ${episode.title.en} up`}
          >
            ↑
          </button>
          <button
            type="button"
            className={ARROW}
            onClick={() => onMove(1)}
            disabled={last}
            aria-label={`Move ${episode.title.en} down`}
          >
            ↓
          </button>
        </div>

        <span className="w-5 shrink-0 text-center font-noi-grotesk text-[12px] text-neutral-50 tabular-nums">
          {position + 1}
        </span>

        <input
          className={FIELD + " flex-1"}
          value={episode.title.en}
          onChange={(e) => onRename("en", e.target.value)}
          aria-label="Episode title, English"
        />

        <span className="flex shrink-0 gap-1">
          {(["en", "ml"] as const).map((lang) => (
            <span
              key={lang}
              title={
                episode.media[lang]
                  ? `${lang.toUpperCase()} video present`
                  : `No ${lang.toUpperCase()} video`
              }
              className={`rounded px-1.5 py-0.5 font-noi-grotesk text-[11px] leading-[1.5] font-medium ${
                episode.media[lang]
                  ? "bg-neutral-90/8 text-neutral-70"
                  : "bg-neutral-90/4 text-neutral-50/60 line-through"
              }`}
            >
              {lang.toUpperCase()}
            </span>
          ))}
        </span>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={ARROW + " size-7"}
          aria-expanded={open}
          aria-label={open ? "Hide details" : "Show details"}
        >
          <svg
            viewBox="0 0 16 16"
            className={`size-3.5 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m6 3 5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {open && (
        <div className="mt-2.5 flex flex-col gap-3 border-t border-neutral-90/8 pt-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="flex items-center gap-3">
              <span className="w-[86px] shrink-0 font-noi-grotesk text-[12px] text-neutral-50">
                Malayalam
              </span>
              <input
                className={FIELD + " flex-1"}
                value={episode.title.ml ?? ""}
                placeholder="No Malayalam title"
                onChange={(e) => onRename("ml", e.target.value)}
              />
            </label>
            <span className="flex items-center font-noi-grotesk text-[12px] text-neutral-50">
              key&nbsp;<code className="font-mono text-neutral-70">{episode.key}</code>
            </span>
          </div>

          {(["en", "ml"] as const).map((lang) => {
            const media = episode.media[lang];
            const url = media?.url ?? "";
            return (
              <div key={lang} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-[86px] shrink-0 font-noi-grotesk text-[12px] text-neutral-50">
                    {lang === "en" ? "English" : "Malayalam"}
                    {media?.durationSec ? ` · ${Math.round(media.durationSec / 60)}m` : ""}
                  </span>
                  <input
                    className={URL_FIELD + " flex-1"}
                    value={url}
                    placeholder="No video — paste a URL to add one"
                    onChange={(e) => onRetarget(lang, e.target.value)}
                    aria-label={`${lang === "en" ? "English" : "Malayalam"} video URL`}
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    disabled={!url}
                    onClick={() => preview(lang, url)}
                    className={GHOST_BUTTON + " disabled:cursor-not-allowed disabled:opacity-30"}
                    aria-label={
                      playing === lang
                        ? `Stop the ${lang === "en" ? "English" : "Malayalam"} preview`
                        : `Preview the ${lang === "en" ? "English" : "Malayalam"} video`
                    }
                  >
                    {playing === lang ? "Close" : "Preview"}
                  </button>
                </div>

                {playing === lang && url && (
                  <div className="overflow-hidden rounded-xl bg-neutral-90">
                    {previewError ? (
                      <p
                        role="alert"
                        className="p-4 font-noi-grotesk text-[13px] leading-[1.5] text-white/80"
                      >
                        {previewError}
                      </p>
                    ) : signed ? (
                      /* Keyed on the signed URL so pressing Preview again
                         after editing the box loads the new file rather than
                         keeping the one the element was created with — which
                         is the whole point of previewing before saving. */
                      <video
                        key={signed}
                        src={signed}
                        controls
                        autoPlay
                        preload="metadata"
                        className="block aspect-video w-full"
                      />
                    ) : (
                      <p className="flex aspect-video items-center justify-center font-noi-grotesk text-[13px] text-white/60">
                        Loading…
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <p className="font-noi-grotesk text-[12px] leading-[1.5] text-neutral-50">
            Preview plays whatever is in the box, saved or not, so a pasted URL
            can be checked before it is committed. The bucket is private, so
            each preview is signed for a few minutes rather than played from
            the stored address. Changing a URL clears that video&rsquo;s stored
            duration, because the old one described the old file; the real
            figure is measured from the file by the LMS sync.
          </p>
        </div>
      )}
    </li>
  );
}
