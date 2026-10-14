"use client";

import React, { useEffect, useRef, useState } from "react";

export interface TemplateItem {
  id: string;
  name?: string;
  title: string;
  idBadge?: string;
  description: string;
}

export const AVAILABLE_TEMPLATES: TemplateItem[] = [
  {
    id: "TPL-1001",
    name: "festive_offer_blast",
    title: "Festive offer blast",
    idBadge: "TPL-1001",
    description: "Promo/Utility mismatch",
  },
  {
    id: "TPL-1002",
    name: "order_update_v3",
    title: "Order update v3",
    idBadge: "TPL-1002",
    description: "Variable format issue",
  },
  {
    id: "TPL-1003",
    name: "payment_reminder_aug",
    title: "Payment reminder",
    idBadge: "TPL-1003",
    description: "Provider rejection",
  },
];

export const AUTO_OPTION: TemplateItem = {
  id: "auto",
  title: "Auto-detect from message",
  description: "Identify the relevant template using the request and available context.",
};

interface TargetTemplateSelectorProps {
  value: string;
  onChange: (templateId: string) => void;
  disabled?: boolean;
}

export function TargetTemplateSelector({
  value,
  onChange,
  disabled = false,
}: TargetTemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  // All navigable options: auto-detect first, then templates
  const allOptions: TemplateItem[] = [AUTO_OPTION, ...AVAILABLE_TEMPLATES];

  // Find currently selected option object
  const selectedOption =
    allOptions.find((opt) => opt.id === value) || AUTO_OPTION;

  // Sync highlighted index when opened
  useEffect(() => {
    if (isOpen) {
      const idx = allOptions.findIndex((opt) => opt.id === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % allOptions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev <= 0 ? allOptions.length - 1 : prev - 1
        );
        break;
      case "Home":
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setHighlightedIndex(allOptions.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (allOptions[highlightedIndex]) {
          onChange(allOptions[highlightedIndex].id);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  const selectOption = (opt: TemplateItem) => {
    onChange(opt.id);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onKeyDown={handleKeyDown}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <label
          id="target-template-label"
          className="text-xs font-medium text-zinc-500"
        >
          Target template
        </label>
        {value !== "auto" && (
          <button
            type="button"
            onClick={() => onChange("auto")}
            className="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Reset to auto-detect
          </button>
        )}
      </div>

      {/* Closed State Button Control */}
      <button
        ref={triggerRef}
        type="button"
        id="target-template-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby="target-template-label target-template-trigger"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-left text-sm shadow-xs transition-colors hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-zinc-50 disabled:text-zinc-400"
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 truncate">
          <span className="font-medium text-zinc-900 truncate">
            {selectedOption.id === "auto"
              ? "Automatic detection"
              : selectedOption.title}
          </span>
          <span className="text-xs text-zinc-500 truncate">
            {selectedOption.id === "auto"
              ? "Identify the template from your message"
              : `${selectedOption.idBadge} · ${selectedOption.description}`}
          </span>
        </div>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-150 ml-2 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Expanded State Dropdown Popover */}
      {isOpen && (
        <div
          ref={listboxRef}
          role="listbox"
          aria-labelledby="target-template-label"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-zinc-200 bg-white py-1.5 shadow-lg max-h-80 overflow-y-auto"
        >
          {/* Section: AUTOMATIC */}
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Automatic
          </div>

          <div
            role="option"
            aria-selected={value === "auto"}
            onClick={() => selectOption(AUTO_OPTION)}
            className={`flex items-start justify-between px-3.5 py-2.5 text-left cursor-pointer transition-colors ${
              highlightedIndex === 0 ? "bg-zinc-100/80" : "hover:bg-zinc-50"
            } ${value === "auto" ? "bg-blue-50/60" : ""}`}
          >
            <div className="space-y-0.5 pr-2">
              <div className="text-sm font-medium text-zinc-900">
                Auto-detect from message
              </div>
              <div className="text-xs text-zinc-500 leading-normal">
                Identify the relevant template using the request and available context.
              </div>
            </div>
            {value === "auto" && (
              <svg
                className="h-4 w-4 text-blue-600 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>

          {/* Divider */}
          <div className="my-1.5 h-px bg-zinc-100" />

          {/* Section: AVAILABLE TEMPLATES */}
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Available Templates
          </div>

          <div className="space-y-0.5">
            {AVAILABLE_TEMPLATES.map((tmpl, index) => {
              const optionIndex = index + 1; // offset by auto option
              const isSelected = value === tmpl.id;
              const isHighlighted = highlightedIndex === optionIndex;

              return (
                <div
                  key={tmpl.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectOption(tmpl)}
                  className={`flex items-start justify-between px-3.5 py-2.5 text-left cursor-pointer transition-colors ${
                    isHighlighted ? "bg-zinc-100/80" : "hover:bg-zinc-50"
                  } ${isSelected ? "bg-blue-50/60" : ""}`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="text-sm font-medium text-zinc-900">
                      {tmpl.title}
                    </div>
                    <div className="text-xs text-zinc-500 leading-normal">
                      <span className="font-mono text-zinc-600 mr-1.5">
                        {tmpl.idBadge}
                      </span>
                      <span>· {tmpl.description}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <svg
                      className="h-4 w-4 text-blue-600 shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
