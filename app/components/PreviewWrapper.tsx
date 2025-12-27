"use client";

import { Sandpack } from "@codesandbox/sandpack-react";
import { useMemo } from "react";

interface PreviewWrapperProps {
  code: string;
}

export default function PreviewWrapper({ code }: PreviewWrapperProps) {
  // Get the current origin (our Next.js app) - only available on client
  const apiBaseUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  }, []);

  // Inject the API base URL into the generated code
  const processCode = (rawCode: string): string => {
    if (!apiBaseUrl || !rawCode) return rawCode;

    // Replace any placeholder or direct webhook URLs with our proxy
    let processedCode = rawCode;

    // Replace direct webhook URLs
    processedCode = processedCode.replace(
      /https:\/\/connorjoejoseph\.app\.n8n\.cloud\/webhook-test\/[^\s"']+/g,
      `${apiBaseUrl}/api/webhook-proxy`
    );

    // If code uses window.location.origin pattern, replace it with the actual URL
    processedCode = processedCode.replace(
      /const apiUrl = typeof window !== 'undefined' \? `\$\{window\.location\.origin\}\/api\/webhook-proxy` : '\/api\/webhook-proxy';/g,
      `const apiUrl = '${apiBaseUrl}/api/webhook-proxy';`
    );

    // Also handle simpler patterns
    if (
      processedCode.includes("/api/webhook-proxy") &&
      !processedCode.includes(apiBaseUrl)
    ) {
      processedCode = processedCode.replace(
        /(['"])(\/api\/webhook-proxy)(['"])/g,
        `$1${apiBaseUrl}$2$3`
      );
    }

    return processedCode;
  };

  // Extract the component code and create a minimal app structure
  const appCode =
    processCode(code || "") ||
    `export default function App() {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-pink-500 to-purple-600">
      <div className="text-white text-2xl">Loading your experience...</div>
    </div>
  );
}`;

  const files = {
    "/App.tsx": appCode,
  };

  // Don't render until we have the API base URL
  if (!apiBaseUrl) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-zinc-900">
        <div className="text-zinc-400">Loading preview...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .sp-preview-container,
        .sp-preview-iframe {
          height: 100% !important;
          min-height: 100% !important;
        }
        .sp-wrapper {
          height: 100% !important;
        }
        .sp-layout {
          height: 100% !important;
        }
        .sp-preview {
          height: 100% !important;
          flex: 1 !important;
        }
      `,
        }}
      />
      <Sandpack
        template="react-ts"
        theme="dark"
        files={files}
        customSetup={{
          dependencies: {
            react: "^19.0.0",
            "react-dom": "^19.0.0",
            "framer-motion": "^12.0.0",
            "lucide-react": "latest",
          },
        }}
        options={{
          // CORRECT WAY to inject Tailwind Play CDN
          externalResources: ["https://cdn.tailwindcss.com"],
          showNavigator: false,
          showTabs: false,
          showLineNumbers: false,
          showInlineErrors: true,
          wrapContent: true,
          editorHeight: "100%",
          editorWidthPercentage: 0,
          showConsole: false,
          showConsoleButton: false,
        }}
      />
    </div>
  );
}
