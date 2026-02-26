import { useMemo, useState } from "react";

import { makeHelloMessage, type HelloRequest, type HelloResponse } from "@app/shared";

const defaultName = "Ada";

export function App() {
  const [name, setName] = useState(defaultName);
  const [message, setMessage] = useState(() => makeHelloMessage(defaultName));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = useMemo(() => {
    return import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload: HelloRequest = { name };

    try {
      const response = await fetch(`${apiBaseUrl}/api/hello`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const data = (await response.json()) as HelloResponse;
      setMessage(data.message);
    } catch (caught) {
      const messageText = caught instanceof Error ? caught.message : "Unexpected error";
      setError(messageText);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app__header">
        <p className="app__kicker">Overfit Starter</p>
        <h1 className="app__title">React + TypeScript + Vite</h1>
        <p className="app__subtitle">Shared API types and a tiny backend to get you moving.</p>
      </header>

      <section className="app__panel">
        <form onSubmit={handleSubmit} className="app__form">
          <label className="app__label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            className="app__input"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button className="app__button" type="submit" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send"}
          </button>
        </form>

        <div className="app__output">
          <p className="app__message">{message}</p>
          {error ? <p className="app__error">{error}</p> : null}
        </div>
      </section>
    </div>
  );
}
