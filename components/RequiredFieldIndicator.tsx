export function RequiredFieldIndicator({ show, hint }: { show: boolean; hint: string }) {
  if (!show) return null;
  return (
    <span className="font-normal text-red-600" aria-hidden="true">
      {" "}
      * <span className="text-xs">{hint}</span>
    </span>
  );
}
