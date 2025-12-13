import { useEffect, useRef } from 'react';
import { useCustomScriptsSettings } from '@/hooks/useSiteSettings';

interface BodyScriptsProps {
  position: 'start' | 'end';
}

export function BodyScripts({ position }: BodyScriptsProps) {
  const { data: scriptsSettings } = useCustomScriptsSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasExecutedRef = useRef(false);

  const scriptContent = position === 'start' 
    ? scriptsSettings?.bodyStart 
    : scriptsSettings?.bodyEnd;

  useEffect(() => {
    if (!scriptContent || !containerRef.current || hasExecutedRef.current) return;

    // Clear previous content
    containerRef.current.innerHTML = '';

    // Parse and execute scripts
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = scriptContent;

    // Process all elements including scripts
    const elements = tempDiv.childNodes;
    elements.forEach((node) => {
      if (node.nodeName === 'SCRIPT') {
        const script = document.createElement('script');
        const originalScript = node as HTMLScriptElement;
        
        // Copy attributes
        Array.from(originalScript.attributes).forEach((attr) => {
          script.setAttribute(attr.name, attr.value);
        });
        
        // Copy inline script content
        if (originalScript.textContent) {
          script.textContent = originalScript.textContent;
        }
        
        containerRef.current?.appendChild(script);
      } else {
        containerRef.current?.appendChild(node.cloneNode(true));
      }
    });

    hasExecutedRef.current = true;
  }, [scriptContent]);

  // Reset when script content changes
  useEffect(() => {
    hasExecutedRef.current = false;
  }, [scriptsSettings?.bodyStart, scriptsSettings?.bodyEnd]);

  if (!scriptContent) return null;

  return <div ref={containerRef} data-scripts={`body-${position}`} />;
}
