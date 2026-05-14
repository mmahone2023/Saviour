import Image from "next/image"
import Link from "next/link"

export default function LandGamePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Forest-themed background */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-900 via-emerald-800 to-green-950" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-green-500/20 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden border-4 border-emerald-400/50 shadow-2xl shadow-emerald-500/30 mb-6">
          <Image
            src="/images/savior-land.jpg"
            alt="Savior of the Land"
            width={160}
            height={160}
            className="object-cover w-full h-full"
          />
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-emerald-300 mb-4">
          Savior of the Land
        </h1>

        <p className="text-emerald-100/80 max-w-md mb-8 text-lg">
          Trek through vast wilderness and defend the natural world from destructive forces.
        </p>

        <div className="flex gap-4">
          <Link
            href="/games/land/game"
            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-lg hover:from-emerald-400 hover:to-green-500 transition-all shadow-lg"
          >
            Play Now
          </Link>
                   
          <Link
            href="/landing"            className="px-8 py-3 border-2 border-emerald-400/50 text-emerald-300 font-semibold rounded-lg hover:bg-emerald-400/10 transition-all"
          >
            Back Home
          </Link>
        </div>
      </div>
    </main>
  )
}
