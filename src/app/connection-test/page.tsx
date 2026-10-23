"use client";

import { useEffect, useState } from "react";

export default function ConnectionTestPage() {
  const [result, setResult] = useState("Connecting...");

  useEffect(() => {
    fetch("/api/v1/health", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
      })
      .then((data) => {
        setResult(JSON.stringify(data, null, 2));
      })
      .catch((error) => {
        setResult(`Connection failed: ${error.message}`);
      });
  }, []);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Next.js ↔ Express Connection Test</h1>
      <pre>{result}</pre>
    </main>
  );
}
