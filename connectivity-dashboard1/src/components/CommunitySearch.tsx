import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { CommunityFeature } from "../types";
import { getWbiTierStyle } from "../utils/wbi";

interface Props {
  /** Communities to search, ideally WBI-enriched so results can show a score. */
  communities: CommunityFeature[];
  /** Called when a result is picked by click or Enter. */
  onSelect: (community: CommunityFeature) => void;
}

const MAX_RESULTS = 8;

/** Lower is a better match; -1 means "no match". */
function matchRank(name: string, aliases: string, query: string): number {
  if (name.startsWith(query)) return 0;
  if (name.includes(query)) return 1;
  if (aliases.includes(query)) return 2;
  return -1;
}

/**
 * Map overlay that finds a community by name (or alias) and hands the pick to
 * the map. Keyboard: Up/Down move the highlight, Enter selects, Esc dismisses.
 */
export default function CommunitySearch({ communities, onSelect }: Props) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<{ term: string; index: number }>({
    term: "",
    index: 0,
  });
  const boxRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (!query) return [];

    const scored: { community: CommunityFeature; rank: number }[] = [];
    for (const community of communities) {
      const p = community.properties;
      const rank = matchRank(
        (p.community_name ?? "").toLowerCase(),
        (p.community_aliases ?? "").toLowerCase(),
        query
      );
      if (rank >= 0) scored.push({ community, rank });
    }

    scored.sort(
      (a, b) =>
        a.rank - b.rank ||
        (a.community.properties.community_name ?? "").localeCompare(
          b.community.properties.community_name ?? ""
        )
    );

    return scored.slice(0, MAX_RESULTS).map((entry) => entry.community);
  }, [communities, term]);

  const showList = open && term.trim().length > 0;

  // The highlight snaps back to the best match whenever the query changes, with
  // no effect: an index stored against an older query is simply ignored.
  const activeIndex =
    highlight.term === term ? Math.min(highlight.index, Math.max(results.length - 1, 0)) : 0;

  // Dismiss the list when the click lands outside the widget.
  useEffect(() => {
    if (!showList) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showList]);

  const select = (community: CommunityFeature) => {
    onSelect(community);
    setTerm(community.properties.community_name ?? "");
    setOpen(false);
  };

  const clear = () => {
    setTerm("");
    setOpen(false);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!showList) {
        setOpen(true);
        return;
      }
      if (results.length === 0) return;
      setHighlight((prev) => {
        const current = prev.term === term ? prev.index : 0;
        const next = event.key === "ArrowDown" ? current + 1 : current - 1;
        return { term, index: Math.min(Math.max(next, 0), results.length - 1) };
      });
      return;
    }

    if (event.key === "Enter") {
      if (!showList) {
        setOpen(true);
        return;
      }
      const active = results[activeIndex];
      if (active) {
        event.preventDefault();
        select(active);
        input.blur();
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      input.blur();
    }
  };

  return (
    <div
      ref={boxRef}
      className="absolute z-[1000] top-4 left-16 w-80 max-w-[calc(100vw_-_5rem)]"
    >
      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (term.trim()) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search communities..."
          aria-label="Search communities by name"
          role="combobox"
          aria-expanded={showList}
          aria-controls="community-search-results"
          aria-autocomplete="list"
          aria-activedescendant={
            showList && results[activeIndex]
              ? `community-option-${results[activeIndex].properties.community_id}`
              : undefined
          }
          className="w-full pl-9 pr-8 py-2 bg-white/95 border border-slate-200 shadow-lg rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
        />
        {term && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {showList && (
        <ul
          id="community-search-results"
          role="listbox"
          aria-label="Community search results"
          className="mt-2 max-h-72 overflow-y-auto bg-white/95 border border-slate-200 shadow-xl rounded-lg py-1 backdrop-blur"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500">
              No communities match "{term.trim()}".
            </li>
          ) : (
            results.map((community, index) => {
              const p = community.properties;
              const style = getWbiTierStyle(p.wbi_tier);
              return (
                <li
                  key={p.community_id}
                  id={`community-option-${p.community_id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight({ term, index })}
                    onClick={() => select(community)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition ${
                      index === activeIndex ? "bg-indigo-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full border"
                      style={{ background: style.fill, borderColor: style.stroke }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {p.community_name || "Unnamed community"}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {[p.community_type, p.ntg_region].filter(Boolean).join(" • ")}
                      </span>
                    </span>
                    {typeof p.wbi_score === "number" && (
                      <span
                        className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${style.badge}`}
                      >
                        {p.wbi_score}
                      </span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
