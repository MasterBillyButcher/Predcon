import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-display text-5xl font-extrabold text-accent">404</p>
      <h1 className="font-display text-xl font-bold text-text-primary">Page not found</h1>
      <p className="max-w-sm font-body text-sm text-text-secondary">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link to="/">
        <Button className="mt-2">Back to dashboard</Button>
      </Link>
    </div>
  );
}
