"use client";

import { useEffect, useState } from "react";

export default function ConnectionTestPage() {
  const [result, setResult] = useState("Connecting...");

  useEffect(() => {
    fetch("http://localhost:5000/api/v1/health")
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