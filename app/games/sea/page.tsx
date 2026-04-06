import Image from "next/image"
import Link from "next/link"

export default function SeaGamePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Ocean-themed background */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900 via-cyan-800 to-blue-950" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-blue-500/20 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-cyan-400/50 shadow-2xl shadow-cyan-500/30 mb-6">
          <Image
            src="/images/savior-sea.jpg"
            alt="Savior of the Sea"
            width={160}
            height={160}
            className="object-cover w-full h-full"
          />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-cyan-300 mb-4 drop-shadwo-lg">  
             Savior of the Sea
        </h1>
        <p className="text-cyan-100/80 max-w-md mb-8 text-lg">
          Dive into the depths and protect the ocean realm from ancient underwater threats.
        </p>

        <div className="flex gap-4">
          <Link
            href="/games/sea/game"
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg"
          >
            Play Now
          </Link>

          <Link
            href="/"
            className="px-8 py-3 border-2 border-cyan-400/50 text-cyan-300 font-semibold rounded-lg hover:bg-cyan-400/10 transition-all"
          >
            Back Home
          </Link>
        </div>
      </div>
    </main>
  )
}
