import "./Spinner.css";

type Props = {
  label?: string;
};

export function Spinner({ label = "Loading…" }: Props) {
  return (
    <div className="spinner-center" role="status" aria-label={label}>
      <span className="spinner" />
    </div>
  );
}
