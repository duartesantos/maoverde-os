export default function Placeholder({ titulo }: { titulo: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-10 text-center">
      <div className="text-base font-semibold">{titulo}</div>
      <p className="mt-2 max-w-xs text-sm text-muted">
        Ecrã por construir. O modelo de dados e os mockups já cobrem esta parte —
        é o próximo passo da implementação.
      </p>
    </div>
  )
}
