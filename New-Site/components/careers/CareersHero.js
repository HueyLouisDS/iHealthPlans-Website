// Careers hero. Autoplaying muted background video with a dark scrim and the
// recruiting pitch on top.
// The video is self hosted rather than pulled from the client's S3 bucket, so
// the page does not break when that bucket's permissions change. They already
// have, see the note on the poster below.

// Renders the hero.
// The container is painted brand blue because there is no poster frame. The
// live site points at a poster on S3 that returns AccessDenied, so it shows
// nothing at all until the video's first frame decodes.
// TODO generate a real poster frame from the video, it needs ffmpeg which is
// not installed on this machine.

export default function CareersHero() {
  return (
    <div className="w-full flex flex-col">
      <div className="w-full min-h-[clamp(412px,57.4vw,620px)] px-4 flex items-center justify-center relative bg-ihealthBlue">
        <div className="w-full max-w-7xl mx-auto flex flex-col items-start relative z-20">
          <div className="max-w-[754px] w-full flex flex-col items-start text-white">
            <h6 className="border-l sm:border-l-2 pl-2 sm:pl-3 text-white uppercase tracking-[5px] sm:tracking-[7.5px] text-xs sm:text-sm font-extralight mb-1">
              <span className="text-ihealthGreen font-bold normal-case">iHEALTH</span> Medicare Plans
            </h6>

            <h1 className="text-[clamp(24px,6.25vw,48px)] font-bold mb-1">
              Join Our Team at iHealth Plans:
              <br />
              <span className="text-ihealthGreen font-bold normal-case">
                Earn as High as $300,000/Year
              </span>
            </h1>

            <p className="text-[clamp(14px,2.22vw,21px)]">
              We are looking for highly motivated individuals to join our team. We offer a
              competitive compensation package and a great work environment. Most licensed agents
              exceed $100,000 in their first year, and our top licensed agents earn as high as
              $300,000/year. Remote work is available once you are fully trained.
            </p>
          </div>
        </div>

        {/* Scrim between the video and the copy, same role as the homepage hero */}
        <div className="w-full h-full absolute z-10 inset-0 bg-[linear-gradient(83deg,rgba(0,0,0,0.6)_33.71%,rgba(0,0,0,0.3)_74.88%)]" />

        <video
          className="absolute inset-0 z-0 object-cover object-[50%_20%] w-full h-full"
          src="/video/ihealth-plans-call-center.mp4"
          autoPlay
          playsInline
          muted
          loop
          // Nothing is read out of this video, it is decoration behind text
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
