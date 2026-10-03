import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black text-white">
      <div className="grid-bg absolute inset-0 opacity-40" />
      <div className="scanlines absolute inset-0" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(245,138,7,0.25) 0%, rgba(245,138,7,0.05) 45%, transparent 70%)',
        }}
      />
      <div className="relative text-center">
        <div className="text-[11px] font-bold tracking-[0.5em] text-cod-400">
          {'ERROR // SIGNAL LOST'}
        </div>
        <div className="mt-2 font-display text-[120px] leading-none tracking-wider glow-text">
          404
        </div>
        <div className="mt-2 font-display text-3xl tracking-widest emboss-text">AREA NOT FOUND</div>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-steel-300">
          指定された座標に作戦エリアは存在しません。
          リンクが間違っているか、このページはまだ配備されていません。
        </p>
        <Link
          href="/"
          className="metal-orange clip-tac mt-8 inline-flex h-12 items-center px-8 font-display text-2xl tracking-wider text-black transition hover:brightness-110"
        >
          基地に帰還する
        </Link>
      </div>
    </div>
  )
}
