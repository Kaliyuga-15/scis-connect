'use client';

import { useRef, useState } from 'react';

// A textarea with line numbers rather than CodeMirror or Monaco. Those add
// megabytes to a page that ~100 people load at once on contest wifi, and for
// 30 lines of C the only editor affordances that matter are tab handling and
// auto-indent, both of which are handled below.
export default function CodeEditor({ value, onChange, disabled, problem = {} }) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });

  const lineCount = Math.max(value.split('\n').length, 1);
  const isFunctionMode = problem?.useFunctionMode ?? false;

  const syncScroll = (event) => {
    if (gutterRef.current) gutterRef.current.scrollTop = event.target.scrollTop;
  };

  const updateCursor = (element) => {
    const upToCaret = element.value.slice(0, element.selectionStart);
    const lines = upToCaret.split('\n');
    setCursor({ line: lines.length, column: lines[lines.length - 1].length + 1 });
  };

  const replaceSelection = (element, text, caretOffset) => {
    const { selectionStart, selectionEnd } = element;
    const next = element.value.slice(0, selectionStart) + text + element.value.slice(selectionEnd);
    onChange(next);
    requestAnimationFrame(() => {
      const position = selectionStart + caretOffset;
      element.selectionStart = position;
      element.selectionEnd = position;
      updateCursor(element);
    });
  };

  const onKeyDown = (event) => {
    const element = event.target;

    if (event.key === 'Tab') {
      event.preventDefault();
      replaceSelection(element, '    ', 4);
      return;
    }

    if (event.key === 'Enter') {
      // Carry the current line's indentation onto the next one, and add a level
      // after an opening brace.
      const upToCaret = element.value.slice(0, element.selectionStart);
      const currentLine = upToCaret.slice(upToCaret.lastIndexOf('\n') + 1);
      const indent = currentLine.match(/^[ \t]*/)?.[0] ?? '';
      const deeper = currentLine.trimEnd().endsWith('{') ? '    ' : '';
      const insertion = `\n${indent}${deeper}`;
      event.preventDefault();
      replaceSelection(element, insertion, insertion.length);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1224]">
      {/* Function mode header: show read-only signature + includes info */}
      {isFunctionMode && (
        <div className="border-b border-white/10 bg-indigo-500/5 px-4 py-2">
          <p className="text-[10px] uppercase tracking-wider text-indigo-300/50">Function Mode</p>
          <p className="mono mt-0.5 text-xs text-white/40">
            You may add <span className="text-cyan-300/60">#include</span> directives and helper functions above your function.
            A hidden <span className="text-cyan-300/60">main()</span> will read input and call your function.
          </p>
          <p className="mono mt-1 text-xs text-indigo-300/80">
            Signature: <span className="text-white/70">{problem.functionSignature || `void ${problem.functionName || 'solve'}(...)`}</span>
          </p>
        </div>
      )}

      <div className="flex h-[26rem]">
        <div
          ref={gutterRef}
          aria-hidden
          className="mono select-none overflow-hidden border-r border-white/10 bg-white/[0.03] px-3 py-3 text-right text-sm leading-6 text-white/25"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          onChange={(event) => {
            onChange(event.target.value);
            updateCursor(event.target);
          }}
          onKeyDown={onKeyDown}
          onKeyUp={(event) => updateCursor(event.target)}
          onClick={(event) => updateCursor(event.target)}
          onScroll={syncScroll}
          className="editor mono scroll-thin flex-1 bg-transparent px-4 py-3 text-sm leading-6 text-white/90 disabled:opacity-50"
        />
      </div>

      <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-white/40">
        <div className="flex items-center gap-3">
          <span>C (gcc -O2 -std=c11)</span>
          {isFunctionMode && (
            <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-indigo-300/60">
              func mode
            </span>
          )}
        </div>
        <span className="mono tabular-nums">
          Ln {cursor.line}, Col {cursor.column}
        </span>
      </div>
    </div>
  );
}
