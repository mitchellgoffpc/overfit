import { API_VERSION } from "@app/shared";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";

interface HealthResponse {
  status: string;
  version: string;
}

export function App(): ReactElement {
  const [status, setStatus] = useState<string>("unknown");
  const [version, setVersion] = useState<string>(API_VERSION);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_URL ?? "http://localhost:4000", []);

  useEffect(() => {
    const fetchHealth = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/api/health`);

        if (!response.ok) {
          throw new Error(`Request failed (${String(response.status)})`);
        }

        const data = (await response.json()) as HealthResponse;
        setStatus(data.status);
        setVersion(data.version);
      } catch (caught) {
        const messageText = caught instanceof Error ? caught.message : "Unexpected error";
        setError(messageText);
        setStatus("offline");
        setVersion(API_VERSION);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchHealth();
  }, [apiBaseUrl]);

  return (
    <div className="app">
      <header className="app__header">
        <p className="app__kicker">Overfit Starter</p>
        <h1 className="app__title">Tracking Runs</h1>
        <p className="app__subtitle">Backend models + API scaffolding for an open-source W&B.</p>
      </header>

      <section className="app__panel">
        <div className="app__output">
          <p className="app__message">
            API status: {isLoading ? "checking..." : status}
          </p>
          <p className="app__message">API version: {version}</p>
          {error ? <p className="app__error">{error}</p> : null}
        </div>
      </section>
    </div>
  );
}
