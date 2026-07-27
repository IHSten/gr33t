import { useEffect, useMemo, useRef, useState } from "react";
import "./SearchSelect.css";

type Props = {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  ariaLabel?: string;
};

export function SearchSelect({ value, options, onChange, ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  };

  const select = (option: string) => {
    onChange(option);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = filtered[activeIndex];
      if (option) select(option);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  return (
    <div className="search-select" ref={rootRef}>
      <button
        type="button"
        className="search-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen(o => !o)}
      >
        <span>{value}</span>
        <span className="search-select-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="search-select-panel">
          <input
            ref={inputRef}
            className="search-select-input"
            type="text"
            placeholder="Search…"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
          />
          <ul className="search-select-list" role="listbox">
            {filtered.length === 0 ? (
              <li className="search-select-empty">No matches</li>
            ) : (
              filtered.map((option, i) => (
                <li
                  key={option}
                  role="option"
                  aria-selected={option === value}
                  className={[
                    "search-select-option",
                    i === activeIndex && "is-active",
                    option === value && "is-selected",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => select(option)}
                >
                  {option}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
