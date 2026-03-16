import type { ReactElement } from "react";
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

import Navbar from "components/Navbar";

const GRID_SIZE = 15;
const TICK_MS = 120;

interface Point { x: number; y: number }
type Direction = "up" | "down" | "left" | "right";

const OPPOSITES: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };

function randomPoint(exclude: Point[]): Point {
  let p: Point;
  do {
    p = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
  } while (exclude.some((e) => e.x === p.x && e.y === p.y));
  return p;
}

function move(head: Point, dir: Direction): Point {
  if (dir === "up") { return { x: head.x, y: (head.y - 1 + GRID_SIZE) % GRID_SIZE }; }
  if (dir === "down") { return { x: head.x, y: (head.y + 1) % GRID_SIZE }; }
  if (dir === "left") { return { x: (head.x - 1 + GRID_SIZE) % GRID_SIZE, y: head.y }; }
  return { x: (head.x + 1) % GRID_SIZE, y: head.y };
}

function SnakeGame(): ReactElement {
  const [snake, setSnake] = useState<Point[]>([{ x: 7, y: 7 }]);
  const [food, setFood] = useState<Point>(() => randomPoint([{ x: 7, y: 7 }]));
  const [dir, setDir] = useState<Direction>("right");
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);

  const reset = useCallback(() => {
    const start = [{ x: 7, y: 7 }];
    setSnake(start);
    setFood(randomPoint(start));
    setDir("right");
    setGameOver(false);
    setScore(0);
    setStarted(false);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      const newDir = keyMap[e.key];
      if (newDir) {
        e.preventDefault();
        setDir((prev) => (newDir === OPPOSITES[prev] ? prev : newDir));
        setStarted(true);
      }
      if (e.key === "r") { reset(); }
    };
    window.addEventListener("keydown", handler);
    return () => { window.removeEventListener("keydown", handler); };
  }, [reset]);

  useEffect(() => {
    if (gameOver || !started) { return; }
    const interval = setInterval(() => {
      setSnake((prev) => {
        const head = move(prev[0]!, dir);
        if (prev.some((s) => s.x === head.x && s.y === head.y)) { setGameOver(true); return prev; }
        const ate = head.x === food.x && head.y === food.y;
        const next = [head, ...prev];
        if (ate) {
          setScore((s) => s + 1);
          setFood(randomPoint(next));
        } else {
          next.pop();
        }
        return next;
      });
    }, TICK_MS);
    return () => { clearInterval(interval); };
  }, [dir, food, gameOver, started]);

  const cells: ReactElement[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const isHead = snake[0]!.x === x && snake[0]!.y === y;
      const isSnake = snake.some((s) => s.x === x && s.y === y);
      const isFood = food.x === x && food.y === y;
      let bg = "bg-brand-surface-2";
      if (isHead) { bg = "bg-brand-accent"; }
      else if (isSnake) { bg = "bg-brand-accent/60"; }
      else if (isFood) { bg = "bg-red-500"; }
      cells.push(<div key={`${String(x)}-${String(y)}`} className={`${bg} rounded-sm`} />);
    }
  }

  const cols = `repeat(${String(GRID_SIZE)}, 1.25rem)`;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid gap-px" style={{ gridTemplateColumns: cols, gridTemplateRows: cols }}>
        {cells}
      </div>
      <div className="text-brand-text-secondary text-sm">
        {gameOver ? (
          <span>Game over! Score: <strong>{score}</strong>. Press <kbd className="px-1 py-0.5 bg-brand-surface-2 rounded text-xs">R</kbd> to restart.</span>
        ) : !started ? (
          <span>Arrow keys or WASD to start</span>
        ) : (
          <span>Score: <strong>{score}</strong></span>
        )}
      </div>
    </div>
  );
}

export default function NotFoundPage(): ReactElement {
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col h-screen bg-brand-bg">
      <Navbar locationLabel="Not Found" />
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-brand-text mb-2">404</h1>
          <p className="text-xl text-brand-text-secondary mb-1">
            This page has gone missing, like your best model weights after a corrupted checkpoint.
          </p>
          <p className="text-brand-text-secondary">While you{"'"}re here, have a game of snake.</p>
        </div>
        <SnakeGame />
        <button onClick={() => { navigate("/"); }} className="px-4 py-2 bg-brand-accent text-white rounded-lg hover:bg-brand-accent/90 transition-colors">
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
