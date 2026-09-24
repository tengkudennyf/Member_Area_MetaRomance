export default function Loading() {
  return (
    <div className="space-y-3 p-1">
      <div className="skeleton h-9 w-56 rounded-xl" />
      <div className="skeleton h-4 w-80 rounded-lg" />
      <div className="grid md:grid-cols-3 gap-3 mt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
