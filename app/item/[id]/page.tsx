// Route stub. UI is Phase 6.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main>item {id} — not built yet (Phase 6).</main>;
}
