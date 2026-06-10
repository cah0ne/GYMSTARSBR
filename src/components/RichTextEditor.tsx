import React, { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const toolbarOptions = [
  [{ 'header': [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ 'color': [] }, { 'background': [] }],
  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
  ['clean']
];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const editorNode = document.createElement("div");
    containerRef.current.appendChild(editorNode);

    // Ensure colors use inline styles instead of CSS classes
    const ColorClass = Quill.import('attributors/style/color');
    const BackgroundClass = Quill.import('attributors/style/background');
    Quill.register(ColorClass as any, true);
    Quill.register(BackgroundClass as any, true);

    const quill = new Quill(editorNode, {
      theme: 'snow',
      placeholder,
      modules: {
        toolbar: toolbarOptions,
      }
    });
    
    quillRef.current = quill;

    if (value) {
      const delta = quill.clipboard.convert({ html: value });
      quill.setContents(delta, 'silent');
    }

    quill.on('text-change', () => {
      const html = quill.root.innerHTML;
      if (html === '<p><br></p>') {
        onChange('');
      } else {
        onChange(html);
      }
    });

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      quillRef.current = null;
    };
  }, []); // Only run once on mount

  useEffect(() => {
    if (quillRef.current) {
      const currentHtml = quillRef.current.root.innerHTML;
      if (value !== currentHtml && value !== '<p><br></p>') {
        // Keep the cursor position if possible
        const delta = quillRef.current.clipboard.convert({ html: value });
        quillRef.current.setContents(delta, 'silent');
      }
    }
  }, [value]);

  return <div ref={containerRef} className="w-full h-full min-h-[120px]" />;
}
