"use client";

import { useCallback } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

/**
 * The post body editor.
 *
 * Produces HTML, which lib/blog.ts sanitises before it is stored — the
 * allowlist there is the real boundary, not this toolbar. What the toolbar
 * offers and what the sanitiser permits are deliberately the same short list,
 * so nothing a writer inserts here is silently thrown away on save.
 */

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
};

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep the selection while clicking
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={
        "flex h-8 min-w-8 items-center justify-center rounded-md px-2 font-noi-grotesk text-[13px] leading-none transition disabled:opacity-40 " +
        (active
          ? "bg-neutral-90 text-white"
          : "text-neutral-70 hover:bg-neutral-90/8")
      }
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onUploadImage }: { editor: Editor; onUploadImage: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-neutral-90/10 px-2 py-2">
      <ToolbarButton title="Bold" active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}>
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}>
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton title="Underline" active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <span className="underline">U</span>
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-neutral-90/10" />

      <ToolbarButton title="Heading" active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        H2
      </ToolbarButton>
      <ToolbarButton title="Subheading" active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        H3
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-neutral-90/10" />

      <ToolbarButton title="Bulleted list" active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}>
        •
      </ToolbarButton>
      <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1.
      </ToolbarButton>
      <ToolbarButton title="Quote" active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        &ldquo;
      </ToolbarButton>
      <ToolbarButton title="Code" active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        &lt;/&gt;
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-neutral-90/10" />

      <ToolbarButton title="Link" active={editor.isActive("link")}
        onClick={() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const url = window.prompt("Link URL");
          if (!url) return;
          editor.chain().focus().setLink({ href: url }).run();
        }}>
        🔗
      </ToolbarButton>
      <ToolbarButton title="Insert image" onClick={onUploadImage}>
        🖼
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-neutral-90/10" />

      <ToolbarButton title="Undo" disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}>
        ↺
      </ToolbarButton>
      <ToolbarButton title="Redo" disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}>
        ↻
      </ToolbarButton>
    </div>
  );
}

export function BlogEditor({
  value,
  onChange,
  onUploadImage,
}: {
  value: string;
  onChange: (html: string) => void;
  /** Uploads a file and resolves to its served URL, or null if it failed. */
  onUploadImage: () => Promise<string | null>;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        // Opened in a new tab and given rel=noopener by the sanitiser, which
        // is the copy of this rule that actually reaches the reader.
        link: { openOnClick: false, autolink: true },
      }),
      Image.configure({ inline: false }),
    ],
    content: value,
    // Required under SSR: rendering immediately would produce markup on the
    // server that disagrees with the client's first pass.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose-admin min-h-[320px] px-4 py-3 font-noi-grotesk text-[15px] leading-[1.6] focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const insertImage = useCallback(async () => {
    if (!editor) return;
    const url = await onUploadImage();
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor, onUploadImage]);

  if (!editor) {
    return (
      <div className="min-h-[380px] rounded-xl border border-neutral-90/12 bg-white px-4 py-3 font-noi-grotesk text-[14px] text-neutral-50">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-90/12 bg-white">
      <Toolbar editor={editor} onUploadImage={insertImage} />
      <EditorContent editor={editor} />
    </div>
  );
}
